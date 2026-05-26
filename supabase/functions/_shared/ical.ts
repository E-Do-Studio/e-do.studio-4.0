// Shared iCal (RFC 5545) builders for booking events.
// Used by both the public ical feed function and outbound booking emails.

export interface IcalBookingRow {
  id: string;
  reference: string;
  status: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_company: string | null;
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

export function buildVEvent(
  booking: IcalBookingRow,
  sessions: IcalSessionRow[],
  quoteRows: IcalQuoteRow[] = [],
  quoteTotal: number | null = null,
): string {
  const uid = `${booking.reference}@e-do.studio`;
  const now = formatIcalTimestamp(new Date());
  const created = formatIcalTimestamp(new Date(booking.created_at));

  const plateaux = sessions.map((s) => s.plateau_key).join(", ");
  const totalHours = sessions.reduce((sum, s) => sum + (s.hours ?? 0), 0);

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const plateauxTitle = sessions.map((s) => capitalize(s.plateau_key)).join(" | ");
  const titlePrefix = (booking.client_company && booking.client_company.trim())
    ? booking.client_company.trim()
    : booking.client_name;
  const summary = plateauxTitle
    ? `${titlePrefix} — ${plateauxTitle}`
    : `E-Do Studio — ${titlePrefix}`;
  const descParts: string[] = [];
  descParts.push(`Référence: ${booking.reference}`);
  descParts.push(`Client: ${booking.client_name}`);
  if (booking.client_email) descParts.push(`Email: ${booking.client_email}`);
  if (booking.client_phone) descParts.push(`Téléphone: ${booking.client_phone}`);
  if (booking.client_company) descParts.push(`Société: ${booking.client_company}`);
  if (booking.client_siren) descParts.push(`SIREN: ${booking.client_siren}`);
  if (plateaux) descParts.push(`Plateau(x): ${plateaux}`);
  if (totalHours > 0) descParts.push(`Durée totale: ${totalHours}h`);
  if (booking.arrival_hour != null) descParts.push(`Heure d'arrivée: ${booking.arrival_hour}h`);
  if (booking.preferred_date) {
    const pd = new Date(booking.preferred_date);
    descParts.push(`Date souhaitée: ${pd.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
  }
  if (booking.project_type) descParts.push(`Type de projet: ${booking.project_type}`);
  if (booking.urgency) descParts.push(`Urgence: ${booking.urgency}`);
  if (booking.total_estimate) descParts.push(`Estimation: ${booking.total_estimate}€ HT`);
  if (sessions.length > 0) {
    descParts.push("");
    descParts.push("--- Détail des sessions ---");
    for (const s of sessions) {
      const parts = [`${s.plateau_key} (${s.hours ?? "?"}h, ${s.slot_type})`];
      if (s.product_type) parts.push(`  Produit: ${s.product_type}`);
      if (s.method) parts.push(`  Méthode: ${s.method}${s.submethod ? ` / ${s.submethod}` : ""}`);
      if (s.quantity && s.quantity > 1) parts.push(`  Quantité: ${s.quantity}`);
      if (s.media && s.media.length > 0) parts.push(`  Médias: ${s.media.join(", ")}`);
      if (s.views && s.views.length > 0) parts.push(`  Vues: ${s.views.join(", ")} (${s.views_count ?? s.views.length})`);
      if (s.postprod_enabled) parts.push(`  Post-prod: oui${s.postprod_video ? " (vidéo)" : ""}`);
      descParts.push(parts.join("\n"));
    }
  }
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
  ];

  if (booking.preferred_date) {
    if (booking.arrival_hour != null) {
      const dtStart = formatIcalDate(booking.preferred_date, booking.arrival_hour);
      lines.push(`DTSTART;TZID=Europe/Paris:${dtStart}`);

      const endHour = booking.arrival_hour + (totalHours || 4);
      const dtEnd = formatIcalDate(booking.preferred_date, endHour);
      lines.push(`DTEND;TZID=Europe/Paris:${dtEnd}`);
    } else {
      const dt = formatIcalDate(booking.preferred_date);
      lines.push(`DTSTART;VALUE=DATE:${dt}`);
      lines.push(`DTEND;VALUE=DATE:${dt}`);
    }
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
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
): string {
  const vevent = buildVEvent(booking, sessions, quoteRows, quoteTotal);
  return wrapCalendar([vevent], `E-Do Studio — ${booking.reference}`);
}
