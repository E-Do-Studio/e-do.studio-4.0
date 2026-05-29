// Shared iCal (RFC 5545) builders for booking events.
// Used by both the public ical feed function and outbound booking emails.

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
  total_estimate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcalSessionRow {
  id: string;
  plateau_key: string;
  slot_type: string;
  hours: number | null;
  session_date?: string | null;
  arrival_hour?: number | null;
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

export function formatIcalDate(dateStr: string, hour?: number | null): string {
  const d = new Date(dateStr);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");

  if (hour != null) {
    const h = String(hour).padStart(2, "0");
    return `${y}${m}${day}T${h}0000`;
  }
  return `${y}${m}${day}`;
}

export function formatIcalTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildSessionVEvent(
  booking: IcalBookingRow,
  session: IcalSessionRow,
  quoteRows: IcalQuoteRow[] = [],
  quoteTotal: number | null = null,
  opts: { sequence?: number } = {},
): string {
  const uid = `${booking.reference}-${session.id}@e-do.studio`;
  const now = formatIcalTimestamp(new Date());
  const created = formatIcalTimestamp(new Date(booking.created_at));

  const sessionDate = session.session_date ?? booking.preferred_date;
  const arrivalHour = session.arrival_hour ?? booking.arrival_hour;
  const hours = session.hours ?? 0;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const titlePrefix = (booking.client_company && booking.client_company.trim())
    ? booking.client_company.trim()
    : booking.client_name;
  const summary = `${titlePrefix} — ${capitalize(session.plateau_key)}`;

  const descParts: string[] = [];
  descParts.push(`Référence: ${booking.reference}`);
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
  if (arrivalHour != null) descParts.push(`Heure d'arrivée: ${arrivalHour}h`);
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
      const amt = r.onReq ? "Sur demande" : `${r.amt}€ HT${r.estimate ? " (estimé)" : ""}`;
      descParts.push(`${r.lbl}: ${amt}`);
    }
    if (quoteTotal != null) descParts.push(`Total: ${quoteTotal}€ HT`);
  }
  if (booking.notes) descParts.push(`\nNotes: ${booking.notes}`);

  const description = escapeIcalText(descParts.join("\n"));

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `CREATED:${created}`,
    `LAST-MODIFIED:${now}`,
    `SUMMARY:${escapeIcalText(summary)}`,
    `DESCRIPTION:${description}`,
    "LOCATION:E-Do Studio\\, Paris",
    `STATUS:${booking.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
    `SEQUENCE:${opts.sequence ?? 0}`,
  ];

  if (sessionDate) {
    if (arrivalHour != null) {
      const dtStart = formatIcalDate(sessionDate, arrivalHour);
      lines.push(`DTSTART;TZID=Europe/Paris:${dtStart}`);
      const endHour = arrivalHour + (hours || 4);
      const dtEnd = formatIcalDate(sessionDate, endHour);
      lines.push(`DTEND;TZID=Europe/Paris:${dtEnd}`);
    } else {
      const dt = formatIcalDate(sessionDate);
      lines.push(`DTSTART;VALUE=DATE:${dt}`);
      lines.push(`DTEND;VALUE=DATE:${dt}`);
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
