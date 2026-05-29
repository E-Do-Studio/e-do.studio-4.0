import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import {
  buildBookingIcs,
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

  const quoteRows = (quoteRow?.rows as IcalQuoteRow[]) ?? [];
  const quoteTotal: number | null = quoteRow?.total ?? null;

  const isUpdate = action === "update";
  const icsData = buildBookingIcs(
    booking as IcalBookingRow,
    (sessions ?? []) as IcalSessionRow[],
    quoteRows,
    quoteTotal,
    { sequence: isUpdate ? 1 : 0 },
  );
  const result = await caldavPut(caldavUrl, caldavUser, caldavPass, eventUid, icsData, isUpdate);

  return new Response(
    JSON.stringify({ success: result.ok, status: result.status, statusText: result.statusText, eventUid }),
    { status: result.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
