import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

interface BookingPayload {
  bookingId: string;
  action: "create" | "update" | "delete";
  newDate?: string;
}

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcalTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

interface QuoteRow { lbl: string; amt: number; onReq?: boolean; estimate?: boolean }

function buildIcsEvent(booking: Record<string, unknown>, sessions: Record<string, unknown>[], quoteRows: QuoteRow[], quoteTotal: number | null, isUpdate: boolean): string {
  const uid = `${booking.reference}@e-do.studio`;
  const now = formatIcalTimestamp(new Date());
  const created = formatIcalTimestamp(new Date(booking.created_at as string));

  const plateaux = sessions.map((s) => s.plateau_key).join(", ");
  const totalHours = sessions.reduce((sum, s) => sum + ((s.hours as number) ?? 0), 0);

  const summary = plateaux
    ? `${plateaux} — ${booking.client_name}`
    : `E-Do Studio — ${booking.client_name}`;
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
    const d = new Date(booking.preferred_date as string);
    descParts.push(`Date souhaitée: ${d.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
  }
  if (booking.project_type) descParts.push(`Type de projet: ${booking.project_type}`);
  if (booking.urgency) descParts.push(`Urgence: ${booking.urgency}`);
  if (booking.total_estimate) descParts.push(`Estimation: ${booking.total_estimate}€ HT`);
  if (sessions.length > 0) {
    descParts.push("");
    descParts.push("--- Détail des sessions ---");
    for (const s of sessions) {
      const parts = [`${s.plateau_key} (${s.hours ?? "?"}h, ${s.slot_type})`];
      if (s.cyclo_mode) parts.push(`  Cyclo: ${s.cyclo_mode}`);
      if (s.product_type) parts.push(`  Produit: ${s.product_type}`);
      if (s.method) parts.push(`  Méthode: ${s.method}${s.submethod ? ` / ${s.submethod}` : ""}`);
      if (s.quantity && (s.quantity as number) > 1) parts.push(`  Quantité: ${s.quantity}`);
      const mediaArr = s.media as string[] | null;
      if (mediaArr && mediaArr.length > 0) parts.push(`  Médias: ${mediaArr.join(", ")}`);
      const viewsArr = s.views as string[] | null;
      if (viewsArr && viewsArr.length > 0) parts.push(`  Vues: ${viewsArr.join(", ")} (${s.views_count ?? viewsArr.length})`);
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

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//E-Do Studio//Booking System//FR",
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
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `CREATED:${created}`,
    `LAST-MODIFIED:${now}`,
    `SUMMARY:${escapeIcalText(summary)}`,
    `DESCRIPTION:${description}`,
    "LOCATION:E-Do Studio\\, Paris",
    `STATUS:${booking.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
    `SEQUENCE:${isUpdate ? 1 : 0}`,
  ];

  if (booking.preferred_date) {
    const d = new Date(booking.preferred_date as string);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const hour = booking.arrival_hour as number | null;

    if (hour != null) {
      const h = String(hour).padStart(2, "0");
      lines.push(`DTSTART;TZID=Europe/Paris:${y}${m}${day}T${h}0000`);
      const endHour = hour + (totalHours || 4);
      const eh = String(endHour).padStart(2, "0");
      lines.push(`DTEND;TZID=Europe/Paris:${y}${m}${day}T${eh}0000`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${y}${m}${day}`);
      lines.push(`DTEND;VALUE=DATE:${y}${m}${day}`);
    }
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

async function caldavPut(
  calendarUrl: string,
  username: string,
  password: string,
  eventUid: string,
  icsData: string,
  isUpdate: boolean,
): Promise<{ ok: boolean; status: number; statusText: string }> {
  const eventUrl = `${calendarUrl.replace(/\/$/, "")}/${eventUid}.ics`;
  const auth = btoa(`${username}:${password}`);

  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "text/calendar; charset=utf-8",
  };
  if (!isUpdate) {
    headers["If-None-Match"] = "*";
  }

  const res = await fetch(eventUrl, { method: "PUT", headers, body: icsData });

  return { ok: res.ok || res.status === 201 || res.status === 204, status: res.status, statusText: res.statusText };
}

async function caldavDelete(
  calendarUrl: string,
  username: string,
  password: string,
  eventUid: string,
): Promise<{ ok: boolean; status: number }> {
  const eventUrl = `${calendarUrl.replace(/\/$/, "")}/${eventUid}.ics`;
  const auth = btoa(`${username}:${password}`);

  const res = await fetch(eventUrl, {
    method: "DELETE",
    headers: { Authorization: `Basic ${auth}` },
  });

  return { ok: res.ok || res.status === 204 || res.status === 404, status: res.status };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const caldavUrl = Deno.env.get("CALDAV_CALENDAR_URL");
  const caldavUser = Deno.env.get("CALDAV_USERNAME");
  const caldavPass = Deno.env.get("CALDAV_PASSWORD");

  if (!caldavUrl || !caldavUser || !caldavPass) {
    return new Response(
      JSON.stringify({ error: "CalDAV not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const payload: BookingPayload = await req.json();
  const { bookingId, action } = payload;

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return new Response(
      JSON.stringify({ error: "Booking not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const eventUid = `${booking.reference}@e-do.studio`;

  if (action === "delete") {
    const result = await caldavDelete(caldavUrl, caldavUser, caldavPass, eventUid);
    return new Response(
      JSON.stringify({ success: result.ok, status: result.status }),
      { status: result.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const [{ data: sessions }, { data: quoteRow }] = await Promise.all([
    supabase.from("booking_sessions").select("*").eq("booking_id", bookingId),
    supabase.from("booking_quotes").select("*").eq("booking_id", bookingId).maybeSingle(),
  ]);

  const quoteRows: QuoteRow[] = quoteRow?.rows as QuoteRow[] ?? [];
  const quoteTotal: number | null = quoteRow?.total ?? null;

  const isUpdate = action === "update";
  const icsData = buildIcsEvent(booking, sessions ?? [], quoteRows, quoteTotal, isUpdate);
  const result = await caldavPut(caldavUrl, caldavUser, caldavPass, eventUid, icsData, isUpdate);

  return new Response(
    JSON.stringify({ success: result.ok, status: result.status, statusText: result.statusText, eventUid }),
    { status: result.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
