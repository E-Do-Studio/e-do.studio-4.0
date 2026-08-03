import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import {
  buildSessionVEvent,
  wrapCalendar,
  type IcalBookingRow,
  type IcalQuoteRow,
  type IcalSessionRow,
} from "../_shared/ical.ts";

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

async function caldavPut(
  calendarUrl: string,
  username: string,
  password: string,
  eventUid: string,
  icsData: string,
): Promise<{ ok: boolean; status: number; statusText: string }> {
  const eventUrl = `${calendarUrl.replace(/\/$/, "")}/${eventUid}.ics`;
  const auth = btoa(`${username}:${password}`);

  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "text/calendar; charset=utf-8",
  };

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

  const [{ data: sessions }, { data: quoteRow }] = await Promise.all([
    supabase.from("booking_sessions").select("*").eq("booking_id", bookingId),
    supabase.from("booking_quotes").select("*").eq("booking_id", bookingId).maybeSingle(),
  ]);

  const sessionList = (sessions ?? []) as IcalSessionRow[];
  const quoteRows = (quoteRow?.rows as IcalQuoteRow[]) ?? [];
  const quoteTotal: number | null = quoteRow?.total ?? null;

  const legacyUid = `${booking.reference}@e-do.studio`;
  const calName = `E-Do Studio — ${booking.reference}`;
  const sessionUid = (sessionId: string) => `${booking.reference}-${sessionId}@e-do.studio`;

  if (action === "delete") {
    const legacyResult = await caldavDelete(caldavUrl, caldavUser, caldavPass, legacyUid);
    const sessionResults = await Promise.all(
      sessionList.map((s) => caldavDelete(caldavUrl, caldavUser, caldavPass, sessionUid(s.id))),
    );
    const allOk = legacyResult.ok && sessionResults.every((r) => r.ok);
    return new Response(
      JSON.stringify({ success: allOk, legacyUid, deletedSessions: sessionResults.length }),
      { status: allOk ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  await caldavDelete(caldavUrl, caldavUser, caldavPass, legacyUid).catch(() => {});

  const isUpdate = action === "update";
  const results = await Promise.all(
    sessionList.map(async (s) => {
      const uid = sessionUid(s.id);
      const vevent = buildSessionVEvent(
        booking as IcalBookingRow,
        s,
        quoteRows,
        quoteTotal,
        { sequence: isUpdate ? 1 : 0 },
      );
      const ics = wrapCalendar([vevent], calName);
      const r = await caldavPut(caldavUrl, caldavUser, caldavPass, uid, ics);
      return { sessionId: s.id, uid, ...r };
    }),
  );

  const allOk = results.every((r) => r.ok);

  // Persist the outcome so failures are visible and the reconcile cron
  // (reconcile_calendar_sync) knows what still needs pushing. Never throw on
  // this bookkeeping — the CalDAV result is what matters to the caller.
  const syncPatch = allOk
    ? { calendar_synced_at: new Date().toISOString(), calendar_sync_error: null, calendar_sync_alerted_at: null }
    : {
        calendar_synced_at: null,
        calendar_sync_error: results
          .reduce<string[]>((acc, r) => {
            if (!r.ok) acc.push(`${r.sessionId}: ${r.status} ${r.statusText}`);
            return acc;
          }, [])
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
