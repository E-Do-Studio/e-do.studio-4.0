import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import {
  buildBookingVEvents,
  wrapCalendar,
  type IcalBookingRow,
  type IcalQuoteRow,
  type IcalSessionRow,
} from "../_shared/ical.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

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

  const [{ data: sessions }, { data: quoteRow }] = await Promise.all([
    supabase.from("booking_sessions").select("*").eq("booking_id", booking.id),
    supabase.from("booking_quotes").select("*").eq("booking_id", booking.id).maybeSingle(),
  ]);

  const quoteRows = (quoteRow?.rows as IcalQuoteRow[]) ?? [];
  const quoteTotal = quoteRow?.total ?? null;

  const vevents = buildBookingVEvents(booking as IcalBookingRow, (sessions ?? []) as IcalSessionRow[], quoteRows, quoteTotal);
  const ics = wrapCalendar(vevents, `E-Do Studio — ${bookingRef}`);

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

  const bookingIds = (bookings ?? []).map((b: IcalBookingRow) => b.id);

  let sessionsQuery = supabase
    .from("booking_sessions")
    .select("*, booking_id")
    .in("booking_id", bookingIds.length > 0 ? bookingIds : ["__none__"]);

  if (plateauFilter) {
    sessionsQuery = sessionsQuery.eq("plateau_key", plateauFilter);
  }

  const { data: allSessions } = await sessionsQuery;

  const sessionsByBooking = new Map<string, IcalSessionRow[]>();
  for (const s of (allSessions ?? []) as Array<IcalSessionRow & { booking_id: string }>) {
    const arr = sessionsByBooking.get(s.booking_id) ?? [];
    arr.push(s);
    sessionsByBooking.set(s.booking_id, arr);
  }

  const { data: allQuotes } = await supabase
    .from("booking_quotes")
    .select("*")
    .in("booking_id", bookingIds.length > 0 ? bookingIds : ["__none__"]);

  const quotesByBooking = new Map<string, { rows: IcalQuoteRow[]; total: number }>();
  for (const q of (allQuotes ?? []) as Array<{ booking_id: string; rows: IcalQuoteRow[]; total: number }>) {
    quotesByBooking.set(q.booking_id, { rows: q.rows, total: q.total });
  }

  let filteredBookings = bookings ?? [];
  if (plateauFilter) {
    const bookingIdsWithPlateau = new Set(sessionsByBooking.keys());
    filteredBookings = filteredBookings.filter((b: IcalBookingRow) =>
      bookingIdsWithPlateau.has(b.id)
    );
  }

  const events = filteredBookings.flatMap((b: IcalBookingRow) => {
    const sessions = sessionsByBooking.get(b.id) ?? [];
    const q = quotesByBooking.get(b.id);
    return buildBookingVEvents(b, sessions, q?.rows ?? [], q?.total ?? null);
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
