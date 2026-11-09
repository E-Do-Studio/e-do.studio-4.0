// Shared builders for booking calendar events.
//
// buildSessionEventFields computes the event *content* in a serialization-neutral
// shape; buildSessionVEvent renders it as iCal (RFC 5545) for the public feed and
// for email attachments, while calendar-sync maps the same fields onto the Google
// Calendar JSON resource. Keep the description single-sourced here.

export interface IcalBookingRow {
  id: string;
  reference: string;
  status: string;
  client_name: string;
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_email: string;
  client_phone: string | null;
  client_company: string | null;
  client_brand?: string | null;
  client_billing_address?: string | null;
  client_siren: string | null;
  project_type: string | null;
  urgency: string | null;
  preferred_date: string | null;
  arrival_hour: number | null;
  arrival_minute?: number | null;
  total_estimate: number | null;
  notes: string | null;
  /** "website" | "etouch" — added by the etouch integration, not by this repo. */
  source?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcalSessionRow {
  id: string;
  plateau_key: string;
  slot_type: string;
  /** double precision in prod — 1.5 means 1h30. */
  hours: number | null;
  session_date?: string | null;
  arrival_hour?: number | null;
  arrival_minute?: number | null;
  cyclo_mode?: string | null;
  product_type?: string | null;
  method?: string | null;
  submethod?: string | null;
  media?: string[] | null;
  views?: string[] | null;
  views_count?: number | null;
  quantity?: number | null;
  postprod_enabled?: boolean | null;
  postprod_video?: boolean | null;
}

export interface IcalQuoteRow {
  lbl: string;
  amt: number;
  onReq?: boolean;
  estimate?: boolean;
}

export function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function toIsoDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatIcalTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Event span, resolved to whole minutes. Durations are fractional in prod
 * (`hours` is double precision, 1.5 = 1h30) and arrivals carry minutes, so
 * hour-only arithmetic produced invalid stamps like `T10.5:00:00`.
 *
 * `endDate` may roll past `date` when arrival + duration crosses midnight —
 * Google rejects a 24+ hour-of-day outright, and iCal encodes it as an invalid
 * `T250000`. All-day spans carry the start date only; DTEND / the Google
 * `end.date` are exclusive and derived by the serializers.
 */
export type SessionEventTime =
  | { allDay: true; date: string }
  | {
      allDay: false;
      date: string;
      startHour: number;
      startMinute: number;
      endDate: string;
      endHour: number;
      endMinute: number;
    };

export interface SessionEventFields {
  uid: string;
  summary: string;
  /** Raw text — serializers apply their own escaping. */
  description: string;
  location: string;
  status: "confirmed" | "tentative";
  /** null when the booking carries no date at all. */
  time: SessionEventTime | null;
}

export function buildSessionEventFields(
  booking: IcalBookingRow,
  session: IcalSessionRow,
  quoteRows: IcalQuoteRow[] = [],
  quoteTotal: number | null = null,
): SessionEventFields {
  const uid = `${booking.reference}-${session.id}@e-do.studio`;

  const sessionDate = session.session_date ?? booking.preferred_date;
  const arrivalHour = session.arrival_hour ?? booking.arrival_hour;
  const arrivalMinute = session.arrival_minute ?? booking.arrival_minute ?? 0;
  const hours = session.hours ?? 0;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const titlePrefix = (booking.client_company && booking.client_company.trim())
    ? booking.client_company.trim()
    : booking.client_name;
  const summary = `${titlePrefix} — ${capitalize(session.plateau_key)}`;

  const descParts: string[] = [];
  descParts.push(`Référence: ${booking.reference}`);
  if (booking.source) descParts.push(`Source: ${booking.source}`);
  descParts.push(`Client: ${booking.client_name}`);
  if (booking.client_first_name) descParts.push(`Prénom: ${booking.client_first_name}`);
  if (booking.client_last_name) descParts.push(`Nom: ${booking.client_last_name}`);
  if (booking.client_email) descParts.push(`Email: ${booking.client_email}`);
  if (booking.client_phone) descParts.push(`Téléphone: ${booking.client_phone}`);
  if (booking.client_company) descParts.push(`Société: ${booking.client_company}`);
  if (booking.client_brand) descParts.push(`Marque: ${booking.client_brand}`);
  if (booking.client_siren) descParts.push(`SIREN: ${booking.client_siren}`);
  if (booking.client_billing_address) descParts.push(`Adresse de facturation: ${booking.client_billing_address}`);
  descParts.push(`Plateau: ${session.plateau_key} (${hours || "?"}h, ${session.slot_type})`);
  if (arrivalHour != null) {
    const min = arrivalMinute ? String(arrivalMinute).padStart(2, "0") : "";
    descParts.push(`Heure d'arrivée: ${arrivalHour}h${min}`);
  }
  if (sessionDate) {
    const pd = new Date(sessionDate);
    descParts.push(`Date: ${pd.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
  }
  if (session.product_type) descParts.push(`Produit: ${session.product_type}`);
  if (session.method) descParts.push(`Méthode: ${session.method}${session.submethod ? ` / ${session.submethod}` : ""}`);
  if (session.quantity && session.quantity > 1) descParts.push(`Quantité: ${session.quantity}`);
  if (session.media && session.media.length > 0) descParts.push(`Médias: ${session.media.join(", ")}`);
  if (session.views && session.views.length > 0) descParts.push(`Vues: ${session.views.join(", ")} (${session.views_count ?? session.views.length})`);
  if (session.postprod_enabled) descParts.push(`Post-prod: oui${session.postprod_video ? " (vidéo)" : ""}`);
  if (booking.project_type) descParts.push(`Type de projet: ${booking.project_type}`);
  if (booking.urgency) descParts.push(`Urgence: ${booking.urgency}`);
  if (booking.total_estimate) descParts.push(`Estimation totale: ${booking.total_estimate}€ HT`);
  if (quoteRows.length > 0) {
    descParts.push("");
    descParts.push("--- Devis ---");
    for (const r of quoteRows) {
      const amt = r.onReq ? "Sur devis" : `${r.amt}€ HT${r.estimate ? " (estimé)" : ""}`;
      const lbl = r.onReq ? r.lbl.replace(/\s*·\s*(Sur demande|On request)\s*$/i, "") : r.lbl;
      descParts.push(`${lbl}: ${amt}`);
    }
    if (quoteTotal != null) descParts.push(`Total: ${quoteTotal}€ HT`);
  }
  if (booking.notes) descParts.push(`\nNotes: ${booking.notes}`);

  let time: SessionEventTime | null = null;
  if (sessionDate) {
    const date = toIsoDate(sessionDate);
    if (arrivalHour != null) {
      const startMin = arrivalHour * 60 + arrivalMinute;
      // Round to whole minutes: `hours` is a float, so 1.5 * 60 can land on
      // 89.9999… and we never want seconds in the output.
      const endMin = startMin + Math.round((hours || 4) * 60);
      const dayShift = Math.floor(endMin / 1440);
      const endOfDay = endMin % 1440;
      time = {
        allDay: false,
        date,
        startHour: arrivalHour,
        startMinute: arrivalMinute,
        endDate: dayShift > 0 ? addDays(date, dayShift) : date,
        endHour: Math.floor(endOfDay / 60),
        endMinute: endOfDay % 60,
      };
    } else {
      time = { allDay: true, date };
    }
  }

  return {
    uid,
    summary,
    description: descParts.join("\n"),
    location: "E-Do Studio, Paris",
    status: booking.status === "confirmed" ? "confirmed" : "tentative",
    time,
  };
}

function icalStamp(isoDate: string, hour: number, minute: number): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${isoDate.replace(/-/g, "")}T${hh}${mm}00`;
}

export function buildSessionVEvent(
  booking: IcalBookingRow,
  session: IcalSessionRow,
  quoteRows: IcalQuoteRow[] = [],
  quoteTotal: number | null = null,
  opts: { sequence?: number } = {},
): string {
  const fields = buildSessionEventFields(booking, session, quoteRows, quoteTotal);
  const now = formatIcalTimestamp(new Date());
  const created = formatIcalTimestamp(new Date(booking.created_at));

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${fields.uid}`,
    `DTSTAMP:${now}`,
    `CREATED:${created}`,
    `LAST-MODIFIED:${now}`,
    `SUMMARY:${escapeIcalText(fields.summary)}`,
    `DESCRIPTION:${escapeIcalText(fields.description)}`,
    `LOCATION:${escapeIcalText(fields.location)}`,
    `STATUS:${fields.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
    `SEQUENCE:${opts.sequence ?? 0}`,
  ];

  const time = fields.time;
  if (time) {
    if (time.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${time.date.replace(/-/g, "")}`);
      lines.push(`DTEND;VALUE=DATE:${addDays(time.date, 1).replace(/-/g, "")}`);
    } else {
      lines.push(`DTSTART;TZID=Europe/Paris:${icalStamp(time.date, time.startHour, time.startMinute)}`);
      lines.push(`DTEND;TZID=Europe/Paris:${icalStamp(time.endDate, time.endHour, time.endMinute)}`);
    }
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function buildBookingVEvents(
  booking: IcalBookingRow,
  sessions: IcalSessionRow[],
  quoteRows: IcalQuoteRow[] = [],
  quoteTotal: number | null = null,
  opts: { sequence?: number } = {},
): string[] {
  if (sessions.length === 0) return [];
  return sessions.map((s) => buildSessionVEvent(booking, s, quoteRows, quoteTotal, opts));
}

export function wrapCalendar(events: string[], calName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//E-Do Studio//Booking System//FR",
    `X-WR-CALNAME:${escapeIcalText(calName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Paris",
    "BEGIN:STANDARD",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
    ...events,
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

export function buildBookingIcs(
  booking: IcalBookingRow,
  sessions: IcalSessionRow[],
  quoteRows: IcalQuoteRow[] = [],
  quoteTotal: number | null = null,
  opts: { sequence?: number } = {},
): string {
  const vevents = buildBookingVEvents(booking, sessions, quoteRows, quoteTotal, opts);
  return wrapCalendar(vevents, `E-Do Studio — ${booking.reference}`);
}
