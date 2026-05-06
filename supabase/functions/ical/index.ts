import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

interface BookingRow {
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

interface SessionRow {
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

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcalDate(dateStr: string, hour?: number | null): string {
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

function formatIcalTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildVEvent(booking: BookingRow, sessions: SessionRow[]): string {
  const uid = `${booking.reference}@e-do.studio`;
  const now = formatIcalTimestamp(new Date());
  const created = formatIcalTimestamp(new Date(booking.created_at));

  const plateaux = sessions.map((s) => s.plateau_key).join(", ");
  const totalHours = sessions.reduce((sum, s) => sum + (s.hours ?? 0), 0);

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
      if (s.cyclo_mode) parts.push(`  Cyclo: ${s.cyclo_mode}`);
      if (s.product_type) parts.push(`  Produit: ${s.product_type}`);
      if (s.method) parts.push(`  Méthode: ${s.method}${s.submethod ? ` / ${s.submethod}` : ""}`);
      if (s.quantity && s.quantity > 1) parts.push(`  Quantité: ${s.quantity}`);
      if (s.media && s.media.length > 0) parts.push(`  Médias: ${s.media.join(", ")}`);
      if (s.views && s.views.length > 0) parts.push(`  Vues: ${s.views.join(", ")} (${s.views_count ?? s.views.length})`);
      if (s.postprod_enabled) parts.push(`  Post-prod: oui${s.postprod_video ? " (vidéo)" : ""}`);
      descParts.push(parts.join("\n"));
    }
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

function wrapCalendar(events: string[], calName: string): string {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path: /ical or /ical/{booking_ref}
  const refIndex = pathParts.indexOf("ical");
  const bookingRef = refIndex >= 0 ? pathParts[refIndex + 1] : undefined;

  try {
    if (bookingRef) {
      return await handleSingleBooking(supabase, bookingRef);
    }
    return await handleGlobalFeed(supabase, url, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSingleBooking(
  supabase: ReturnType<typeof createClient>,
  bookingRef: string,
): Promise<Response> {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("reference", bookingRef)
    .single();

  if (error || !booking) {
    return new Response(JSON.stringify({ error: "Booking not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: sessions } = await supabase
    .from("booking_sessions")
    .select("*")
    .eq("booking_id", booking.id);

  const vevent = buildVEvent(booking as BookingRow, (sessions ?? []) as SessionRow[]);
  const ics = wrapCalendar([vevent], `E-Do Studio — ${bookingRef}`);

  await upsertIcalFeed(supabase, booking.id, bookingRef);

  return new Response(ics, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${bookingRef}.ics"`,
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}

async function handleGlobalFeed(
  supabase: ReturnType<typeof createClient>,
  url: URL,
  req: Request,
): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const plateauFilter = url.searchParams.get("plateau");

  let query = supabase
    .from("bookings")
    .select("*")
    .in("status", ["pending", "confirmed"]);

  const { data: bookings, error } = await query;
  if (error) throw error;

  const bookingIds = (bookings ?? []).map((b: BookingRow) => b.id);

  let sessionsQuery = supabase
    .from("booking_sessions")
    .select("*, booking_id")
    .in("booking_id", bookingIds.length > 0 ? bookingIds : ["__none__"]);

  if (plateauFilter) {
    sessionsQuery = sessionsQuery.eq("plateau_key", plateauFilter);
  }

  const { data: allSessions } = await sessionsQuery;

  const sessionsByBooking = new Map<string, SessionRow[]>();
  for (const s of (allSessions ?? []) as Array<SessionRow & { booking_id: string }>) {
    const arr = sessionsByBooking.get(s.booking_id) ?? [];
    arr.push(s);
    sessionsByBooking.set(s.booking_id, arr);
  }

  let filteredBookings = bookings ?? [];
  if (plateauFilter) {
    const bookingIdsWithPlateau = new Set(sessionsByBooking.keys());
    filteredBookings = filteredBookings.filter((b: BookingRow) =>
      bookingIdsWithPlateau.has(b.id)
    );
  }

  const events = filteredBookings.map((b: BookingRow) => {
    const sessions = sessionsByBooking.get(b.id) ?? [];
    return buildVEvent(b, sessions);
  });

  const calName = plateauFilter
    ? `E-Do Studio — ${plateauFilter}`
    : "E-Do Studio — Toutes les réservations";

  const ics = wrapCalendar(events, calName);

  return new Response(ics, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="e-do-studio-bookings.ics"`,
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}

async function upsertIcalFeed(
  supabase: ReturnType<typeof createClient>,
  bookingId: string,
  bookingRef: string,
): Promise<void> {
  const feedUrl = `/functions/v1/ical/${bookingRef}`;
  const icalUid = `${bookingRef}@e-do.studio`;

  const { data: existing } = await supabase
    .from("ical_feeds")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("ical_feeds")
      .update({ feed_url: feedUrl, ical_uid: icalUid, synced_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("ical_feeds")
      .insert({
        booking_id: bookingId,
        feed_url: feedUrl,
        ical_uid: icalUid,
        synced_at: new Date().toISOString(),
      });
  }
}
