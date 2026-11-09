// E-mails : envoi Resend et travaux qui les composent.
//
// Un travail = un e-mail, envoyé avec une clé d'idempotence Resend dérivée du
// travail : une reprise après une coupure ne double jamais l'envoi.
import {
  type BookingData,
  type BookingSession,
  type QuoteData,
  renderBookingAdmin,
  renderBookingClient,
  renderContactAdmin,
  renderContactClient,
  renderStatusChangeAdmin,
  renderStatusChangeClient,
  type StatusChangeReason,
  statusChangeAdminLabel,
  statusChangeSubject,
} from '../../../supabase/functions/send-email/renderers.ts';
import type { Alert } from './alerts.ts';
import { loadBundle, registryFor, type EmailPayload } from './bookings.ts';
import type { Db } from './db.ts';
import { buildClientIcs, type IcsEntry, type IcsMethod } from './ics.ts';
import type { BookingBundle, CalendarEntry, Session } from './types.ts';

export interface Attachment {
  filename: string;
  content: string;
  contentType: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Attachment[];
  idempotencyKey?: string;
}

export interface Mailer {
  send(email: OutgoingEmail): Promise<void>;
}

export function createResendMailer(
  apiKey: string,
  from: string,
  fetchImpl: typeof fetch = fetch,
): Mailer {
  return {
    async send(email) {
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(email.idempotencyKey
            ? { 'Idempotency-Key': email.idempotencyKey }
            : {}),
        },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          reply_to: email.replyTo,
          attachments: email.attachments?.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, 'utf8').toString('base64'),
            content_type: a.contentType,
          })),
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        throw new Error(`Resend ${res.status} : ${(await res.text()).slice(0, 500)}`);
      }
    },
  };
}

const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );

function toBookingData(b: BookingBundle['booking']): BookingData {
  return {
    reference: b.reference,
    client_name: b.client_name,
    client_first_name: b.client_first_name,
    client_last_name: b.client_last_name,
    client_email: b.client_email,
    client_phone: b.client_phone,
    client_company: b.client_company,
    client_brand: b.client_brand,
    client_billing_address: b.client_billing_address,
    client_siren: b.client_siren,
    project_type: b.project_type,
    urgency: b.urgency,
    total_estimate: b.total_estimate,
    preferred_date: b.preferred_date,
    arrival_hour: b.arrival_hour,
    notes: b.notes,
  };
}

function toQuoteData(bundle: BookingBundle): QuoteData | null {
  return bundle.quote
    ? {
        reference: bundle.quote.reference,
        rows: bundle.quote.rows,
        total: bundle.quote.total,
      }
    : null;
}

const REASON: Record<Exclude<EmailPayload['template'], 'created'>, StatusChangeReason> = {
  rescheduled: 'report',
  cancelled: 'rejet',
  updated: 'autre',
};

// Les instantanés importés (lignes libérées, format etouch #1526) ne portent
// que l'horaire : le reste reprend les valeurs neutres d'une ligne.
function sessionFromSnapshot(snapshot: Partial<Session>): Session {
  return {
    slot_type: 'hour',
    hours: null,
    session_date: null,
    arrival_hour: null,
    arrival_minute: null,
    cyclo_mode: null,
    product_type: null,
    method: null,
    submethod: null,
    media: [],
    views: [],
    views_count: 0,
    quantity: 1,
    postprod_enabled: false,
    postprod_video: false,
    created_at: '',
    blocks_slot: false,
    ...snapshot,
  } as Session;
}

function icsAttachment(
  method: IcsMethod,
  bundle: BookingBundle,
  entries: CalendarEntry[],
  organizerEmail: string,
  now: Date,
): { attachment: Attachment; entries: IcsEntry[] } | null {
  const icsEntries: IcsEntry[] = [];
  for (const e of entries) {
    const session =
      bundle.sessions.find((s) => s.id === e.session_id) ??
      (e.snapshot ? sessionFromSnapshot(e.snapshot) : null);
    if (session) icsEntries.push({ uid: e.uid, sequence: e.sequence, session });
  }
  const ics = buildClientIcs({
    method,
    booking: bundle.booking,
    entries: icsEntries,
    quoteRows: bundle.quote?.rows ?? [],
    quoteTotal: bundle.quote?.total ?? null,
    organizerEmail,
    now,
  });
  if (!ics) return null;
  return {
    entries: icsEntries,
    attachment: {
      filename:
        method === 'CANCEL'
          ? `${bundle.booking.reference}-annulation.ics`
          : `${bundle.booking.reference}.ics`,
      content: ics,
      contentType: `text/calendar; charset=utf-8; method=${method}`,
    },
  };
}

/** L'e-mail au client, avec ses .ics (invitation et/ou annulation). */
export async function sendClientEmail(
  db: Db,
  mailer: Mailer,
  studioEmail: string,
  payload: EmailPayload,
  job: { id: number; created_at: string },
): Promise<void> {
  const bundle = await loadBundle(db, payload.bookingId);
  if (!bundle) throw new Error(`réservation ${payload.bookingId} introuvable`);
  const registry = await registryFor(db, payload.bookingId);
  const pick = (uids: string[]) =>
    registry.filter((e) => uids.includes(e.uid));
  const cancelledAtClient = (e: CalendarEntry) =>
    e.client_method === 'CANCEL' && (e.client_sequence ?? -1) >= e.sequence;
  // DTSTAMP figé sur le travail : une reprise renvoie exactement le même
  // contenu, ce que la clé d'idempotence de Resend exige.
  const stamp = new Date(job.created_at);

  // Une invitation en retard (reprise après une panne) ne doit pas faire
  // revivre chez le client ce qui a été annulé entre-temps.
  const toRequest =
    bundle.booking.status === 'cancelled'
      ? []
      : pick(payload.requestUids).filter(
          (e) =>
            bundle.sessions.some((s) => s.id === e.session_id) &&
            !cancelledAtClient(e),
        );
  const request = icsAttachment('REQUEST', bundle, toRequest, studioEmail, stamp);
  // Une annulation déjà envoyée pour ce SEQUENCE ne se renvoie pas.
  const toCancel = pick(payload.cancelUids).filter((e) => !cancelledAtClient(e));
  const cancel = icsAttachment('CANCEL', bundle, toCancel, studioEmail, stamp);
  const attachments = [request?.attachment, cancel?.attachment].filter(
    (a): a is Attachment => a != null,
  );

  const b = toBookingData(bundle.booking);
  const sessions = bundle.sessions as unknown as BookingSession[];
  const quote = toQuoteData(bundle);
  const subject =
    payload.template === 'created'
      ? `Votre réservation ${b.reference} — E-Do Studio`
      : statusChangeSubject(REASON[payload.template], b.reference);
  const html =
    payload.template === 'created'
      ? renderBookingClient(b, sessions, quote)
      : renderStatusChangeClient(
          b,
          sessions,
          quote,
          REASON[payload.template],
          payload.template === 'rescheduled' ? bundle.booking.preferred_date : null,
          payload.message ?? null,
        );

  await mailer.send({
    to: bundle.booking.client_email,
    subject,
    html,
    replyTo: studioEmail,
    attachments,
    idempotencyKey: `job-${job.id}`,
  });

  for (const [method, part] of [
    ['REQUEST', request],
    ['CANCEL', cancel],
  ] as const) {
    for (const e of part?.entries ?? []) {
      await db.query(
        `UPDATE calendar_events SET client_sequence = $2, client_method = $3, updated_at = now()
         WHERE uid = $1`,
        [e.uid, e.sequence, method],
      );
    }
  }
}

export async function sendStudioEmail(
  db: Db,
  mailer: Mailer,
  studioEmail: string,
  payload: EmailPayload,
  jobId: number,
): Promise<void> {
  const bundle = await loadBundle(db, payload.bookingId);
  if (!bundle) throw new Error(`réservation ${payload.bookingId} introuvable`);
  const b = toBookingData(bundle.booking);
  const sessions = bundle.sessions as unknown as BookingSession[];
  const quote = toQuoteData(bundle);
  const created = payload.template === 'created';
  await mailer.send({
    to: studioEmail,
    subject: created
      ? `Nouvelle réservation ${b.reference} — ${b.client_name}`
      : `${statusChangeAdminLabel(REASON[payload.template as Exclude<typeof payload.template, 'created'>])} — ${b.reference}`,
    html: created
      ? renderBookingAdmin(b, sessions, quote)
      : renderStatusChangeAdmin(
          b,
          sessions,
          quote,
          REASON[payload.template as Exclude<typeof payload.template, 'created'>],
          payload.template === 'rescheduled' ? bundle.booking.preferred_date : null,
          payload.message ?? null,
        ),
    replyTo: bundle.booking.client_email,
    idempotencyKey: `job-${jobId}`,
  });
}

/** Un e-mail du formulaire de contact : accusé au visiteur, ou copie au studio. */
export async function sendContactEmail(
  mailer: Mailer,
  studioEmail: string,
  payload: {
    recipient: 'client' | 'studio';
    nom: string;
    email: string;
    telephone: string;
    societe: string;
    message: string;
  },
  jobId: number,
): Promise<void> {
  if (payload.recipient === 'client') {
    await mailer.send({
      to: payload.email,
      subject: 'Votre message a bien été reçu — E-Do Studio',
      html: renderContactClient(payload.nom),
      replyTo: studioEmail,
      idempotencyKey: `job-${jobId}`,
    });
    return;
  }
  await mailer.send({
    to: studioEmail,
    subject: `Contact — ${payload.nom}`,
    html: renderContactAdmin(
      payload.nom,
      payload.email,
      payload.telephone,
      payload.societe,
      payload.message,
    ),
    replyTo: payload.email,
    idempotencyKey: `job-${jobId}`,
  });
}

// ─── Alertes ───────────────────────────────────────────────────────────────

const SEVERITY_LABEL = { info: 'Info', warning: 'Attention', critical: 'Urgent' };

function alertBlock(a: Alert): string {
  return `<div style="margin:0 0 16px;padding:12px 14px;border-left:3px solid ${
    a.severity === 'critical' ? '#c0392b' : a.severity === 'warning' ? '#E2641A' : '#888'
  };background:#fafafa">
    <p style="margin:0 0 6px"><strong>${esc(SEVERITY_LABEL[a.severity])} : ${esc(a.subject)}</strong></p>
    <p style="margin:0 0 6px;white-space:pre-wrap">${esc(a.body)}</p>
    <p style="margin:0;color:#888;font-size:12px">Vu ${a.occurrences} fois depuis le ${esc(
      new Date(a.first_seen_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
    )}</p>
  </div>`;
}

const wrap = (title: string, inner: string) =>
  `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111;max-width:640px">
    <p style="margin:0 0 16px;font-size:16px"><strong>${esc(title)}</strong></p>${inner}
    <p style="margin:16px 0 0;color:#888;font-size:12px">Service de réservation e-do. État détaillé : GET /v1/admin/status.</p>
  </div>`;

export function renderAlertEmail(alerts: Alert[]): { subject: string; html: string } {
  const worst = alerts.some((a) => a.severity === 'critical') ? '🚨' : '⚠️';
  const subject =
    alerts.length === 1
      ? `${worst} ${alerts[0].subject}`
      : `${worst} ${alerts.length} alertes réservations`;
  return { subject, html: wrap(subject, alerts.map(alertBlock).join('')) };
}

export function renderDigestEmail(
  open: Alert[],
  resolved: Alert[],
): { subject: string; html: string } | null {
  if (open.length === 0 && resolved.length === 0) return null;
  const parts: string[] = [];
  if (open.length > 0) {
    parts.push(`<p style="margin:0 0 8px"><strong>Encore ouvert</strong></p>`);
    parts.push(open.map(alertBlock).join(''));
  }
  if (resolved.length > 0) {
    parts.push(`<p style="margin:16px 0 8px"><strong>Dernières 24 h</strong></p>`);
    parts.push(
      `<ul style="margin:0;padding-left:18px">${resolved
        .map((a) => `<li>${esc(a.subject)}</li>`)
        .join('')}</ul>`,
    );
  }
  const subject =
    open.length > 0
      ? `Réservations : ${open.length} problème(s) ouvert(s)`
      : 'Réservations : récapitulatif du jour';
  return { subject, html: wrap(subject, parts.join('')) };
}

/** Alerte d'un échec du tunnel côté navigateur : rien n'existe en base. */
export function renderTunnelFailure(input: {
  error: string;
  mode: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  pageUrl?: string;
}): string {
  const contact = [input.contactName, input.contactEmail, input.contactPhone]
    .filter(Boolean)
    .join(' — ');
  return `Le tunnel a rendu une erreur au client, aucune réservation n'a été créée.
Erreur : ${input.error}
Mode : ${input.mode}
Page : ${input.pageUrl ?? 'inconnue'}
${contact ? `Client à rappeler : ${contact}` : "Le client n'avait pas encore laissé ses coordonnées."}`;
}
