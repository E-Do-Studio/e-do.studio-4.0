import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import {
  addDays,
  buildSessionEventFields,
  type IcalBookingRow,
  type IcalQuoteRow,
  type IcalSessionRow,
  type SessionEventFields,
} from "../_shared/ical.ts";
import {
  deleteEvent,
  eventIdFor,
  upsertEvent,
  type CalendarResult,
  type GoogleCredentials,
  type GoogleEvent,
} from "./google.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const TIME_ZONE = "Europe/Paris";

interface BookingPayload {
  bookingId: string;
  action: "create" | "update" | "delete";
  newDate?: string;
}

function toGoogleEvent(fields: SessionEventFields): GoogleEvent {
  const event: GoogleEvent = {
    summary: fields.summary,
    description: fields.description,
    location: fields.location,
    status: fields.status,
  };

  const time = fields.time;
  if (time) {
    if (time.allDay) {
      event.start = { date: time.date };
      event.end = { date: addDays(time.date, 1) };
    } else {
      const at = (hour: number, minute: number) =>
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
      event.start = {
        dateTime: `${time.date}T${at(time.startHour, time.startMinute)}`,
        timeZone: TIME_ZONE,
      };
      event.end = {
        dateTime: `${time.endDate}T${at(time.endHour, time.endMinute)}`,
        timeZone: TIME_ZONE,
      };
    }
  }

  return event;
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

  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
  const clientEmail = Deno.env.get("GOOGLE_SA_CLIENT_EMAIL");
  // Supabase secrets store the key with literal \n sequences.
  const privateKey = Deno.env.get("GOOGLE_SA_PRIVATE_KEY")?.replace(/\\n/g, "\n");

  if (!calendarId || !clientEmail || !privateKey) {
    return new Response(
      JSON.stringify({ error: "Google Calendar not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const creds: GoogleCredentials = { calendarId, clientEmail, privateKey };

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

  const [{ data: sessions }, { data: quoteRow }] = await Promise.all([
    supabase.from("booking_sessions").select("*").eq("booking_id", bookingId),
    supabase.from("booking_quotes").select("*").eq("booking_id", bookingId).maybeSingle(),
  ]);

  const sessionList = (sessions ?? []) as IcalSessionRow[];
  const quoteRows = (quoteRow?.rows as IcalQuoteRow[]) ?? [];
  const quoteTotal: number | null = quoteRow?.total ?? null;

  const sessionUid = (sessionId: string) => `${booking.reference}-${sessionId}@e-do.studio`;

  if (action === "delete") {
    const results = await Promise.all(
      sessionList.map(async (s) => {
        const id = await eventIdFor(sessionUid(s.id));
        const r: CalendarResult = await deleteEvent(creds, id);
        return { sessionId: s.id, ...r };
      }),
    );
    const allOk = results.every((r) => r.ok);
    return new Response(
      JSON.stringify({ success: allOk, deletedSessions: results.length, sessions: results }),
      { status: allOk ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const results = await Promise.all(
    sessionList.map(async (s) => {
      const uid = sessionUid(s.id);
      const fields = buildSessionEventFields(booking as IcalBookingRow, s, quoteRows, quoteTotal);
      const id = await eventIdFor(uid);
      const r = await upsertEvent(creds, id, toGoogleEvent(fields));
      return { sessionId: s.id, uid, ...r };
    }),
  );

  // `[].every()` is true, so a booking whose sessions are not committed yet would
  // be marked synced with zero events created — and the reconcile cron, which only
  // looks at `calendar_synced_at is null`, would never come back for it. Treat it
  // as a failure so it stays in the retry set.
  const allOk = sessionList.length > 0 && results.every((r) => r.ok);

  // Persist the outcome so failures are visible and the reconcile cron
  // (reconcile_calendar_sync) knows what still needs pushing. Never throw on
  // this bookkeeping — the calendar result is what matters to the caller.
  const syncPatch = allOk
    ? { calendar_synced_at: new Date().toISOString(), calendar_sync_error: null, calendar_sync_alerted_at: null }
    : {
        calendar_synced_at: null,
        calendar_sync_error: sessionList.length === 0
          ? "aucune session à synchroniser"
          : results
              .filter((r) => !r.ok)
              .map((r) => `${r.sessionId}: ${r.status} ${r.detail}`)
              .join("; ")
              .slice(0, 1000),
      };
  await supabase
    .from("bookings")
    .update({ ...syncPatch, calendar_sync_attempts: (booking.calendar_sync_attempts ?? 0) + 1 })
    .eq("id", bookingId)
    .then(undefined, () => {});

  return new Response(
    JSON.stringify({ success: allOk, sessions: results }),
    { status: allOk ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
