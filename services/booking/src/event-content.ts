// Ce qu'un événement d'agenda dit d'une ligne de réservation : titre,
// description, horaires. Une seule source pour l'agenda Google du studio et
// pour le .ics du client, comme l'était `_shared/ical.ts` côté Supabase (même
// UID, même titre, même description).
import { createHash } from 'node:crypto';
import type { Booking, QuoteLine, Session } from './types.ts';

export const STUDIO_TZ = 'Europe/Paris';
const DEFAULT_HOURS = 4;

export function sessionUid(reference: string, sessionId: string): string {
  return `${reference}-${sessionId}@e-do.studio`;
}

/**
 * Id Google de l'événement d'une ligne : sha256 de l'UID en hexadécimal, celui
 * de la v31 de calendar-sync. L'hexadécimal tient dans l'alphabet base32hex
 * qu'exige Google ; garder le même calcul reprend les événements existants.
 */
export function googleEventId(uid: string): string {
  return createHash('sha256').update(uid).digest('hex');
}

/** Heure murale du studio : date YYYY-MM-DD, minutes depuis minuit. */
export interface WallClock {
  date: string;
  minutes: number;
}

export type EventTiming =
  | { allDay: true; date: string }
  | { allDay: false; start: WallClock; end: WallClock };

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalize(c: WallClock): WallClock {
  const days = Math.floor(c.minutes / 1440);
  return { date: addDays(c.date, days), minutes: c.minutes - days * 1440 };
}

export function sessionTiming(
  booking: Pick<Booking, 'preferred_date' | 'arrival_hour' | 'arrival_minute'>,
  session: Pick<
    Session,
    'session_date' | 'arrival_hour' | 'arrival_minute' | 'hours'
  >,
): EventTiming | null {
  const date = session.session_date ?? booking.preferred_date;
  if (!date) return null;
  const hour = session.arrival_hour ?? booking.arrival_hour;
  if (hour == null) return { allDay: true, date };
  const minute =
    session.arrival_hour != null
      ? (session.arrival_minute ?? 0)
      : (booking.arrival_minute ?? 0);
  const startMinutes = hour * 60 + minute;
  const length = Math.round((session.hours || DEFAULT_HOURS) * 60);
  return {
    allDay: false,
    start: normalize({ date, minutes: startMinutes }),
    end: normalize({ date, minutes: startMinutes + length }),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-11-06T10:30:00` — heure murale, sans fuseau (il est donné à part). */
export function wallClockIso(c: WallClock): string {
  return `${c.date}T${pad(Math.floor(c.minutes / 60))}:${pad(c.minutes % 60)}:00`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function eventSummary(booking: Booking, session: Session): string {
  const prefix = booking.client_company?.trim() || booking.client_name;
  return `${prefix} — ${capitalize(session.plateau_key)}`;
}

export function eventDescription(
  booking: Booking,
  session: Session,
  quoteRows: QuoteLine[],
  quoteTotal: number | null,
): string {
  const timing = sessionTiming(booking, session);
  const parts: string[] = [];
  parts.push(`Référence: ${booking.reference}`);
  parts.push(`Client: ${booking.client_name}`);
  if (booking.client_first_name) parts.push(`Prénom: ${booking.client_first_name}`);
  if (booking.client_last_name) parts.push(`Nom: ${booking.client_last_name}`);
  if (booking.client_email) parts.push(`Email: ${booking.client_email}`);
  if (booking.client_phone) parts.push(`Téléphone: ${booking.client_phone}`);
  if (booking.client_company) parts.push(`Société: ${booking.client_company}`);
  if (booking.client_brand) parts.push(`Marque: ${booking.client_brand}`);
  if (booking.client_siren) parts.push(`SIREN: ${booking.client_siren}`);
  if (booking.client_billing_address) {
    parts.push(`Adresse de facturation: ${booking.client_billing_address}`);
  }
  parts.push(
    `Plateau: ${session.plateau_key} (${session.hours || '?'}h, ${session.slot_type})`,
  );
  if (timing && !timing.allDay) {
    const m = timing.start.minutes;
    parts.push(`Heure d'arrivée: ${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}`);
  }
  if (timing) {
    const d = new Date(`${timing.allDay ? timing.date : timing.start.date}T12:00:00Z`);
    parts.push(
      `Date: ${d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })}`,
    );
  }
  if (session.product_type) parts.push(`Produit: ${session.product_type}`);
  if (session.method) {
    parts.push(
      `Méthode: ${session.method}${session.submethod ? ` / ${session.submethod}` : ''}`,
    );
  }
  if (session.quantity > 1) parts.push(`Quantité: ${session.quantity}`);
  if (session.media.length > 0) parts.push(`Médias: ${session.media.join(', ')}`);
  if (session.views.length > 0) {
    parts.push(
      `Vues: ${session.views.join(', ')} (${session.views_count || session.views.length})`,
    );
  }
  if (session.postprod_enabled) {
    parts.push(`Post-prod: oui${session.postprod_video ? ' (vidéo)' : ''}`);
  }
  if (booking.project_type) parts.push(`Type de projet: ${booking.project_type}`);
  if (booking.urgency) parts.push(`Urgence: ${booking.urgency}`);
  if (booking.total_estimate) {
    parts.push(`Estimation totale: ${booking.total_estimate}€ HT`);
  }
  if (quoteRows.length > 0) {
    parts.push('', '--- Devis ---');
    for (const r of quoteRows) {
      const amt = r.onReq
        ? 'Sur devis'
        : `${r.amt}€ HT${r.estimate ? ' (estimé)' : ''}`;
      const lbl = r.onReq
        ? r.lbl.replace(/\s*·\s*(Sur demande|On request)\s*$/i, '')
        : r.lbl;
      parts.push(`${lbl}: ${amt}`);
    }
    if (quoteTotal != null) parts.push(`Total: ${quoteTotal}€ HT`);
  }
  if (booking.notes) parts.push(`\nNotes: ${booking.notes}`);
  return parts.join('\n');
}

/** La référence d'un événement écrit par e-do, lue dans sa description. */
export function referenceFromDescription(
  description: string | undefined,
): string | null {
  const m = description?.match(/^Référence: (\S+)/m);
  return m ? m[1] : null;
}
