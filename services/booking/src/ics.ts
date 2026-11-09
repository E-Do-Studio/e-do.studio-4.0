// .ics joint aux e-mails du client (RFC 5545 + iTIP, RFC 5546).
//
// Supabase envoyait un METHOD:PUBLISH en SEQUENCE:0, et rien à l'annulation :
// Google et Apple importaient l'événement une fois puis ne le touchaient plus.
// Ici, l'invitation est un REQUEST avec ORGANIZER et ATTENDEE, et chaque
// report ou annulation renvoie le MÊME UID avec un SEQUENCE plus grand —
// c'est ce qu'il faut pour que l'agenda du client applique la mise à jour.
import {
  eventDescription,
  eventSummary,
  sessionTiming,
  STUDIO_TZ,
  type WallClock,
} from './event-content.ts';
import type { Booking, QuoteLine, Session } from './types.ts';

/** PUBLISH : un flux d'abonnement (iCal), sans organisateur ni participant. */
export type IcsMethod = 'REQUEST' | 'CANCEL' | 'PUBLISH';

export interface IcsEntry {
  uid: string;
  sequence: number;
  session: Session;
}

export interface ClientIcsInput {
  method: IcsMethod;
  booking: Booking;
  entries: IcsEntry[];
  quoteRows: QuoteLine[];
  quoteTotal: number | null;
  organizerEmail: string;
  now?: Date;
  /** Nom affiché par l'agenda qui s'abonne (PUBLISH). */
  calendarName?: string;
}

export function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Lignes de 75 octets au plus, continuées par une espace (RFC 5545 §3.1).
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, 'utf8');
    if (size + n > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join('\r\n ');
}

const pad = (n: number) => String(n).padStart(2, '0');

function icsLocal(c: WallClock): string {
  return `${c.date.replaceAll('-', '')}T${pad(Math.floor(c.minutes / 60))}${pad(c.minutes % 60)}00`;
}

function icsStamp(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${STUDIO_TZ}`,
  'BEGIN:STANDARD',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
];

/** Les VEVENT d'une réservation, lignes non pliées. */
export function buildVEvents(input: ClientIcsInput): string[] {
  const { method, booking } = input;
  const stamp = icsStamp(input.now ?? new Date());
  const events: string[] = [];

  for (const entry of input.entries) {
    const timing = sessionTiming(booking, entry.session);
    if (!timing) continue;
    const lines = [
      'BEGIN:VEVENT',
      `UID:${entry.uid}`,
      `SEQUENCE:${entry.sequence}`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${stamp}`,
      `SUMMARY:${escapeText(
        method === 'CANCEL'
          ? `Annulé : ${eventSummary(booking, entry.session)}`
          : eventSummary(booking, entry.session),
      )}`,
      `DESCRIPTION:${escapeText(
        eventDescription(
          booking,
          entry.session,
          input.quoteRows,
          input.quoteTotal,
        ),
      )}`,
      'LOCATION:E-Do Studio\\, Paris',
      ...(method === 'PUBLISH'
        ? []
        : [
            `ORGANIZER;CN=E-Do Studio:mailto:${input.organizerEmail}`,
            `ATTENDEE;CN="${booking.client_name.replace(/["\r\n]/g, '')}";ROLE=REQ-PARTICIPANT;PARTSTAT=${
              method === 'CANCEL' ? 'DECLINED' : 'ACCEPTED'
            };RSVP=FALSE:mailto:${booking.client_email}`,
          ]),
      `STATUS:${method === 'CANCEL' ? 'CANCELLED' : booking.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'TRANSP:OPAQUE',
    ];
    if (timing.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${timing.date.replaceAll('-', '')}`);
      lines.push(
        `DTEND;VALUE=DATE:${addDays(timing.date, 1).replaceAll('-', '')}`,
      );
    } else {
      lines.push(`DTSTART;TZID=${STUDIO_TZ}:${icsLocal(timing.start)}`);
      lines.push(`DTEND;TZID=${STUDIO_TZ}:${icsLocal(timing.end)}`);
    }
    lines.push('END:VEVENT');
    events.push(...lines);
  }

  return events;
}

export function wrapIcs(
  method: IcsMethod,
  events: string[],
  calendarName?: string,
): string {
  const all = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//E-Do Studio//Booking System//FR',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    ...(calendarName ? [`X-WR-CALNAME:${escapeText(calendarName)}`] : []),
    ...VTIMEZONE,
    ...events,
    'END:VCALENDAR',
  ];
  return `${all.map(fold).join('\r\n')}\r\n`;
}

export function buildClientIcs(input: ClientIcsInput): string | null {
  const events = buildVEvents(input);
  if (events.length === 0) return null;
  return wrapIcs(input.method, events, input.calendarName);
}
