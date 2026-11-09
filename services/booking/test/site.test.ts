// Le reste de Supabase porté dans le service : contact, chat, iCal, base de
// connaissances. Les API externes (Gemini, Turnstile, PostHog) sont simulées.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelBooking, createWebsiteBooking } from '../src/bookings.ts';
import { invalidateKnowledge, rankChunks } from '../src/chat/knowledge.ts';
import type { Db } from '../src/db.ts';
import { createApp } from '../src/http.ts';
import { deps, drain, FakeCalendar, FakeMailer, futureYmd, isoOf, websiteInput } from './fakes.ts';
import { createTestDb } from './pglite.ts';

const KEY = 'admin-secret-0123456789abcdef';
let db: Db;
let app: ReturnType<typeof createApp>;
let fetchCalls: { url: string; body: string }[];
let geminiReplies: unknown[];

// biome-ignore lint/suspicious/noExplicitAny: corps JSON lus par les assertions
const read = async (res: Response): Promise<any> => res.json();

beforeEach(async () => {
  db = await createTestDb();
  invalidateKnowledge();
  app = createApp({
    db,
    apiKeys: new Map([[KEY, 'admin']]),
    allowedOrigins: ['https://e-do.studio'],
    geminiKey: 'gemini-test',
  });
  fetchCalls = [];
  geminiReplies = [];
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    fetchCalls.push({ url, body: String(init.body ?? '') });
    if (url.includes(':embedContent')) {
      return Response.json({ embedding: { values: Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)) } });
    }
    if (url.includes(':generateContent')) {
      return Response.json(geminiReplies.shift() ?? { candidates: [{ content: { parts: [{ text: 'Bonjour.' }] } }] });
    }
    throw new Error(`appel inattendu ${url}`);
  });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await db.close();
});

const post = (path: string, json: unknown, headers: Record<string, string> = {}) =>
  app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://e-do.studio', ...headers },
    body: JSON.stringify(json),
  });

const CONTACT = {
  nom: 'Camille Durand',
  email: 'camille@marque.fr',
  telephone: '06 12 34 56 78',
  societe: 'Marque',
  message: 'Bonjour, nous voulons shooter 40 sacs en packshot le mois prochain.',
  elapsedMs: 30_000,
};

describe('formulaire de contact', () => {
  it('met en file les deux e-mails et HubSpot, et garde la soumission', async () => {
    const res = await post('/v1/public/contact', CONTACT);
    expect(res.status).toBe(200);
    const jobs = await db.query<{ kind: string; payload: { recipient?: string } }>(
      'SELECT kind, payload FROM jobs ORDER BY id',
    );
    expect(jobs.map((j) => `${j.kind}:${j.payload.recipient ?? ''}`)).toEqual([
      'email.contact:client',
      'email.contact:studio',
      'hubspot.contact:',
    ]);
    const [row] = await db.query<{ delivered: boolean }>('SELECT delivered FROM contact_submissions');
    expect(row.delivered).toBe(true);

    const mailer = new FakeMailer();
    await drain(deps(db, new FakeCalendar(), mailer));
    expect(mailer.sent.map((m) => m.to).sort()).toEqual(['camille@marque.fr', 'contact@e-do.studio']);
    expect(mailer.sent.find((m) => m.to === 'contact@e-do.studio')?.replyTo).toBe('camille@marque.fr');
  });

  it('répond « envoyé » à un robot (pot de miel) sans rien envoyer', async () => {
    const res = await post('/v1/public/contact', { ...CONTACT, website: 'http://spam.example' });
    expect(res.status).toBe(200);
    expect(await db.query('SELECT 1 FROM jobs')).toHaveLength(0);
    const [row] = await db.query<{ delivered: boolean; spam_reason: string[] }>(
      'SELECT delivered, spam_reason FROM contact_submissions',
    );
    expect(row.delivered).toBe(false);
    expect(row.spam_reason).toContain('honeypot');
  });

  it("refuse une origine inconnue et limite le débit", async () => {
    expect((await post('/v1/public/contact', CONTACT, { Origin: 'https://ailleurs.example' })).status).toBe(403);
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await post('/v1/public/contact', CONTACT, { 'X-Forwarded-For': '198.51.100.7' })).status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe('chat', () => {
  it('répond avec la base de connaissances et sans aucune donnée client', async () => {
    await createWebsiteBooking(db, websiteInput([{ plateauKey: 'live', days: 3, hour: 10, hours: 2 }]));
    await app.request('/v1/admin/chat-knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        upsert: [
          { id: 'site:identity:fr', kind: 'site', slug: 'identity', lang: 'fr', title: 'Identité', url: null, body: 'E-DO est à Saint-Ouen.', tags: [], content_hash: 'h1', embedding: [0, 1] },
          { id: 'plateau:live:fr', kind: 'plateau', slug: 'live', lang: 'fr', title: 'Plateau Live', url: 'https://e-do.studio/fr/plateau/live', body: 'Le Live sert au porté.', tags: [], content_hash: 'h2', embedding: [1, 0] },
        ],
      }),
    });
    geminiReplies.push(
      { candidates: [{ content: { parts: [{ functionCall: { name: 'check_availability', args: { windowStart: isoOf(futureYmd(1)), windowEnd: isoOf(futureYmd(7)), plateauKey: 'live' } } }] } }] },
      { candidates: [{ content: { parts: [{ text: 'Le Live est libre mardi.\nSUGGESTIONS: Mardi 10h | Mercredi 14h' }] } }] },
    );
    const res = await post('/v1/public/chat', {
      messages: [{ role: 'user', content: 'Quand le plateau live est-il disponible ?' }],
      lang: 'fr',
      currentPage: '/fr/plateau/live',
    });
    expect(res.status).toBe(200);
    const body = await read(res);
    expect(body.reply).toBe('Le Live est libre mardi.');
    expect(body.suggestions).toEqual(['Mardi 10h', 'Mercredi 14h']);

    const prompts = fetchCalls.filter((c) => c.url.includes(':generateContent')).map((c) => c.body).join('\n');
    expect(prompts).toContain('Le Live sert au porté.');
    expect(prompts).toContain('E-DO est à Saint-Ouen.');
    // La réservation existe, mais rien d'elle ne part chez le modèle.
    expect(prompts).not.toContain('camille@marque.fr');
    expect(prompts).not.toContain('Durand');
  });

  it('rend la proposition de réservation sans rien écrire', async () => {
    geminiReplies.push({ candidates: [{ content: { parts: [{ text: 'Voici le récapitulatif.' }] } }] });
    const res = await post('/v1/public/chat', { messages: [{ role: 'user', content: 'bonjour' }] });
    const body = await read(res);
    expect(body.bookingProposal).toBeNull();
    expect(await db.query('SELECT 1 FROM bookings')).toHaveLength(0);
  });

  it('400 sur un message invalide, 500 sans clé Gemini', async () => {
    expect((await post('/v1/public/chat', { messages: [] })).status).toBe(400);
    const bare = createApp({ db, apiKeys: new Map(), allowedOrigins: [] });
    const res = await bare.request('/v1/public/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'bonjour' }] }),
    });
    expect(res.status).toBe(500);
  });
});

describe('base de connaissances', () => {
  it('classe par cosinus dans la langue demandée', () => {
    const chunk = (id: string, lang: 'fr' | 'en', embedding: number[]) => ({
      id, kind: 'k', slug: null, lang, title: id, url: null, body: id, tags: [],
      embedding, norm: Math.hypot(...embedding),
    });
    const ranked = rankChunks(
      [chunk('loin', 'fr', [0, 1]), chunk('proche', 'fr', [1, 0.1]), chunk('anglais', 'en', [1, 0])],
      [1, 0],
      'fr',
      2,
    );
    expect(ranked.map((c) => c.id)).toEqual(['proche', 'loin']);
  });
});

describe('flux iCal', () => {
  it('une réservation par sa référence, en PUBLISH ; les annulées sortent du flux global', async () => {
    const a = await createWebsiteBooking(db, websiteInput([{ plateauKey: 'live', days: 3, hour: 10, hours: 2 }]));
    const b = await createWebsiteBooking(db, websiteInput([{ plateauKey: 'vertical', days: 4, hour: 11, hours: 2 }], 'b@x.fr'));
    const one = await app.request(`/v1/public/ical/${a.reference}`);
    const text = await one.text();
    expect(one.headers.get('content-type')).toContain('text/calendar');
    expect(text).toContain('METHOD:PUBLISH');
    expect(text).not.toContain('ATTENDEE');
    expect((await app.request('/v1/public/ical/EDO-R-INCONNU')).status).toBe(404);

    await cancelBooking(db, b.id, { name: null, source: 'test' }, { notifyClient: false });
    const all = await (await app.request('/v1/ical', { headers: { Authorization: `Bearer ${KEY}` } })).text();
    expect(all).toContain(a.reference);
    expect(all).not.toContain(b.reference);
    expect((await app.request('/v1/ical')).status).toBe(401);
  });
});
