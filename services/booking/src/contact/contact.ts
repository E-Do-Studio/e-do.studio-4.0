// Formulaire de contact du site (repris de send-email, type « contact ») :
// anti-spam heuristique, Turnstile s'il est configuré, limites de débit, trace
// de chaque soumission. Les e-mails partent par la file (reprises, alertes)
// au lieu d'un envoi direct qui échouait sans trace.
import { z } from 'zod';
import type { Db } from '../db.ts';
import { captureServer } from '../posthog.ts';
import { enqueue } from '../queue.ts';
import { hashIp, rateLimit } from '../rate-limit.ts';
import { scoreContactSubmission } from './spam.ts';

const MIN_FILL_MS = 2500;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const contactSchema = z.object({
  nom: z.string().trim().min(1).max(100),
  email: z.string().trim().max(254).regex(EMAIL_RE),
  telephone: z.string().trim().min(1).max(30),
  societe: z.string().trim().min(1).max(120),
  message: z.string().trim().min(10).max(4000),
  website: z.string().max(200).optional(),
  // Durée de saisie mesurée sur l'horloge du visiteur.
  elapsedMs: z.number().nonnegative().optional(),
  turnstileToken: z.string().max(4096).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export interface ContactMessage {
  nom: string;
  email: string;
  telephone: string;
  societe: string;
  message: string;
}

export interface ContactResult {
  status: number;
  body: Record<string, unknown>;
}

// Inerte sans TURNSTILE_SECRET_KEY ; une panne Cloudflare laisse passer.
async function verifyTurnstile(
  secret: string | undefined,
  token: string | undefined,
  ip: string,
): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await res.json()) as { success?: boolean };
    return result.success === true;
  } catch (e) {
    console.error('turnstile verify error', e);
    return true;
  }
}

export async function handleContact(
  deps: { db: Db; turnstileSecret: string | undefined },
  raw: unknown,
  ip: string,
  originAllowed: boolean,
): Promise<ContactResult> {
  const distinctId = (raw as { analytics?: { distinct_id?: string } })?.analytics?.distinct_id;
  const track = (event: string, props: Record<string, unknown>) =>
    captureServer(event, distinctId, `contact:${crypto.randomUUID()}`, props);
  // Le visiteur lit « envoyé » pour un spam : seul cet événement montre un
  // faux positif sur un vrai prospect.
  const reject = (reasons: string[]) => track('contact_rejected', { reasons });

  if (!originAllowed) {
    await reject(['forbidden_origin']);
    return { status: 403, body: { error: 'forbidden_origin' } };
  }
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    await reject(['invalid_payload']);
    return { status: 400, body: { error: 'invalid_payload' } };
  }
  const data = parsed.data;
  const ipHash = hashIp(ip);

  const record = (score: number, reasons: string[], delivered: boolean) =>
    deps.db
      .query(
        `INSERT INTO contact_submissions
           (nom, email, telephone, societe, message, ip_hash, spam_score, spam_reason, delivered)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [data.nom, data.email, data.telephone, data.societe, data.message, ipHash, score, reasons, delivered],
      )
      .catch((err) => console.error('contact_submissions insert', err));

  const reasons: string[] = [];
  if (data.website && data.website.trim() !== '') reasons.push('honeypot');
  if (typeof data.elapsedMs === 'number' && data.elapsedMs < MIN_FILL_MS) {
    reasons.push('submitted_too_fast');
  }
  const verdict = scoreContactSubmission(data);
  const spam = reasons.length > 0 || verdict.isSpam;
  reasons.push(...verdict.reasons);

  if (spam) {
    await record(verdict.score, reasons, false);
    await reject(reasons);
    // Répondre comme si c'était envoyé : un robot n'apprend rien du filtre.
    return { status: 200, body: { ok: true } };
  }

  if (!(await verifyTurnstile(deps.turnstileSecret, data.turnstileToken, ip))) {
    await record(verdict.score, [...reasons, 'turnstile_failed'], false);
    await reject([...reasons, 'turnstile_failed']);
    return { status: 200, body: { ok: true } };
  }

  const shortOk = await rateLimit(deps.db, 'contact-short', ipHash, 5, 600);
  const dailyOk = shortOk && (await rateLimit(deps.db, 'contact-daily', ipHash, 15, 86_400));
  if (!shortOk || !dailyOk) {
    await record(verdict.score, [...reasons, 'rate_limited'], false);
    await reject([...reasons, 'rate_limited']);
    return { status: 429, body: { error: 'rate_limited' } };
  }

  const message: ContactMessage = {
    nom: data.nom,
    email: data.email,
    telephone: data.telephone,
    societe: data.societe,
    message: data.message,
  };
  await deps.db.tx(async (q) => {
    await enqueue(q, 'email.contact', { ...message, recipient: 'client' });
    await enqueue(q, 'email.contact', { ...message, recipient: 'studio' });
    await enqueue(q, 'hubspot.contact', { ...message });
  });
  await record(verdict.score, reasons, true);
  await track('contact_delivered', { spam_score: verdict.score });
  return { status: 200, body: { ok: true } };
}
