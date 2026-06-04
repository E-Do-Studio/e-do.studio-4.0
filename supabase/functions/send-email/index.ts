import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import { syncContactForm, syncBooking } from "../_shared/hubspot.ts";
import {
  buildBookingIcs,
  type IcalBookingRow,
  type IcalQuoteRow,
  type IcalSessionRow,
} from "../_shared/ical.ts";
import {
  renderBookingAdmin,
  renderBookingClient,
  renderContactAdmin,
  renderContactClient,
  renderStatusChangeAdmin,
  renderStatusChangeClient,
  statusChangeAdminLabel,
  statusChangeSubject,
  type BookingData,
  type BookingSession,
  type QuoteData,
  type QuoteRow,
  type StatusChangeReason,
} from "./renderers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const STUDIO_EMAIL = "contact@e-do.studio";

interface BookingEmailPayload {
  type: "booking";
  bookingId: string;
}

interface ContactEmailPayload {
  type: "contact";
  nom: string;
  email: string;
  telephone: string;
  societe: string;
  message: string;
}

interface BookingStatusChangePayload {
  type: "booking_status_change";
  bookingId: string;
  reason: StatusChangeReason;
  newDate?: string;
  message?: string;
}

interface CalendarSyncAlertPayload {
  type: "calendar_sync_alert";
  bookingId: string;
}

type EmailPayload =
  | BookingEmailPayload
  | ContactEmailPayload
  | BookingStatusChangePayload
  | CalendarSyncAlertPayload;

interface ResendAttachment {
  filename: string;
  content: string; // base64
  contentType?: string;
}

interface SendEmailOptions {
  replyTo?: string;
  attachments?: ResendAttachment[];
}

async function sendResendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  options: SendEmailOptions = {},
): Promise<void> {
  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
  };
  if (options.replyTo) body.reply_to = options.replyTo;
  if (options.attachments && options.attachments.length > 0) {
    body.attachments = options.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      content_type: a.contentType ?? "application/octet-stream",
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend API error ${res.status}: ${errBody}`);
  }
}

function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildBookingIcsAttachment(
  booking: IcalBookingRow,
  sessions: IcalSessionRow[],
  quoteRows: IcalQuoteRow[],
  quoteTotal: number | null,
): ResendAttachment | null {
  if (!booking.preferred_date) return null;
  const ics = buildBookingIcs(booking, sessions, quoteRows, quoteTotal);
  return {
    filename: `${booking.reference}.ics`,
    content: toBase64(ics),
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  };
}

function syncToHubSpot(fn: () => Promise<void>): void {
  const token = Deno.env.get("HUBSPOT_PRIVATE_APP_TOKEN");
  if (!token) return;
  fn().catch((err) => console.error("HubSpot sync error:", err));
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

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? `E-Do Studio <${STUDIO_EMAIL}>`;

  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: EmailPayload = await req.json();

    if (payload.type === "booking") {
      await handleBookingEmail(resendKey, fromEmail, payload.bookingId);
    } else if (payload.type === "contact") {
      await handleContactEmail(resendKey, fromEmail, payload);
    } else if (payload.type === "booking_status_change") {
      await handleBookingStatusChangeEmail(resendKey, fromEmail, payload);
    } else if (payload.type === "calendar_sync_alert") {
      await handleCalendarSyncAlert(resendKey, fromEmail, payload.bookingId);
    } else {
      return new Response(JSON.stringify({ error: "Unknown email type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    console.error("send-email error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleCalendarSyncAlert(
  resendKey: string,
  fromEmail: string,
  bookingId: string,
): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("reference, client_name, client_company, preferred_date, status, calendar_sync_error, calendar_sync_attempts")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  const esc = (v: unknown) =>
    String(v ?? "—").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111">
      <p><strong>⚠️ Une réservation ne se synchronise pas avec le calendrier.</strong></p>
      <p>Après ${esc(booking.calendar_sync_attempts)} tentatives, l'événement CalDAV
      n'a pas pu être créé. L'agenda risque de ne pas montrer cette réservation.</p>
      <table cellpadding="4" style="border-collapse:collapse">
        <tr><td><strong>Référence</strong></td><td>${esc(booking.reference)}</td></tr>
        <tr><td><strong>Client</strong></td><td>${esc(booking.client_name)}${booking.client_company ? ` — ${esc(booking.client_company)}` : ""}</td></tr>
        <tr><td><strong>Date</strong></td><td>${esc(booking.preferred_date)}</td></tr>
        <tr><td><strong>Statut</strong></td><td>${esc(booking.status)}</td></tr>
        <tr><td><strong>Erreur</strong></td><td>${esc(booking.calendar_sync_error)}</td></tr>
      </table>
      <p>Le système continue de réessayer automatiquement toutes les 2 minutes.</p>
    </div>`;

  await sendResendEmail(
    resendKey,
    fromEmail,
    STUDIO_EMAIL,
    `⚠️ Échec synchro calendrier — ${booking.reference}`,
    html,
  );
}

async function handleBookingEmail(
  resendKey: string,
  fromEmail: string,
  bookingId: string,
): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  const [{ data: sessions }, { data: quoteRow }] = await Promise.all([
    supabase.from("booking_sessions").select("*").eq("booking_id", bookingId),
    supabase.from("booking_quotes").select("*").eq("booking_id", bookingId).maybeSingle(),
  ]);

  const b: BookingData = {
    reference: booking.reference,
    client_name: booking.client_name,
    client_email: booking.client_email,
    client_phone: booking.client_phone,
    client_company: booking.client_company,
    client_siren: booking.client_siren,
    project_type: booking.project_type,
    urgency: booking.urgency,
    total_estimate: booking.total_estimate,
    preferred_date: booking.preferred_date,
    arrival_hour: booking.arrival_hour,
    notes: booking.notes,
  };

  const quote: QuoteData | null = quoteRow
    ? { reference: quoteRow.reference, rows: quoteRow.rows as QuoteRow[], total: quoteRow.total }
    : null;

  const bookingSessions = (sessions ?? []) as BookingSession[];
  const icsAttachment = buildBookingIcsAttachment(
    booking as IcalBookingRow,
    bookingSessions as unknown as IcalSessionRow[],
    quote?.rows ?? [],
    quote?.total ?? null,
  );

  await Promise.all([
    sendResendEmail(
      resendKey,
      fromEmail,
      booking.client_email,
      `Votre réservation ${booking.reference} — E-Do Studio`,
      renderBookingClient(b, bookingSessions, quote),
      { attachments: icsAttachment ? [icsAttachment] : undefined },
    ),
    sendResendEmail(
      resendKey,
      fromEmail,
      STUDIO_EMAIL,
      `Nouvelle réservation ${booking.reference} — ${booking.client_name}`,
      renderBookingAdmin(b, bookingSessions, quote),
      { replyTo: booking.client_email },
    ),
  ]);

  syncToHubSpot(() =>
    syncBooking(Deno.env.get("HUBSPOT_PRIVATE_APP_TOKEN")!, {
      reference: booking.reference,
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      clientPhone: booking.client_phone,
      clientCompany: booking.client_company,
      projectType: booking.project_type,
      totalEstimate: booking.total_estimate,
      preferredDate: booking.preferred_date,
      notes: booking.notes,
      plateaux: bookingSessions.map((s) => s.plateau_key),
    })
  );
}

async function handleContactEmail(
  resendKey: string,
  fromEmail: string,
  payload: ContactEmailPayload,
): Promise<void> {
  await Promise.all([
    sendResendEmail(
      resendKey,
      fromEmail,
      payload.email,
      `Votre message a bien été reçu — E-Do Studio`,
      renderContactClient(payload.nom),
    ),
    sendResendEmail(
      resendKey,
      fromEmail,
      STUDIO_EMAIL,
      `Contact — ${payload.nom}`,
      renderContactAdmin(payload.nom, payload.email, payload.telephone, payload.societe, payload.message),
      { replyTo: payload.email },
    ),
  ]);

  syncToHubSpot(() =>
    syncContactForm(Deno.env.get("HUBSPOT_PRIVATE_APP_TOKEN")!, {
      nom: payload.nom,
      email: payload.email,
      telephone: payload.telephone,
      societe: payload.societe,
      message: payload.message,
    })
  );
}

async function handleBookingStatusChangeEmail(
  resendKey: string,
  fromEmail: string,
  payload: BookingStatusChangePayload,
): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", payload.bookingId)
    .single();

  if (error || !booking) {
    throw new Error(`Booking not found: ${payload.bookingId}`);
  }

  if (payload.reason === "rejet" && booking.preferred_date) {
    const bookingDate = new Date(booking.preferred_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return;
    }
  }

  const [{ data: sessions }, { data: quoteRow }] = await Promise.all([
    supabase.from("booking_sessions").select("*").eq("booking_id", payload.bookingId),
    supabase.from("booking_quotes").select("*").eq("booking_id", payload.bookingId).maybeSingle(),
  ]);

  const b: BookingData = {
    reference: booking.reference,
    client_name: booking.client_name,
    client_email: booking.client_email,
    client_phone: booking.client_phone,
    client_company: booking.client_company,
    client_siren: booking.client_siren,
    project_type: booking.project_type,
    urgency: booking.urgency,
    total_estimate: booking.total_estimate,
    preferred_date: booking.preferred_date,
    arrival_hour: booking.arrival_hour,
    notes: booking.notes,
  };

  const quote: QuoteData | null = quoteRow
    ? { reference: quoteRow.reference, rows: quoteRow.rows as QuoteRow[], total: quoteRow.total }
    : null;

  const newDate = payload.newDate ?? null;
  const adminMessage = payload.message ?? null;
  const bookingSessions = (sessions ?? []) as BookingSession[];

  // Attach updated .ics for client when the booking still has a future date
  // (skip on rejet — the event is no longer happening).
  let clientIcsAttachment: ResendAttachment | null = null;
  if (payload.reason !== "rejet") {
    const icsBookingRow: IcalBookingRow = {
      ...(booking as IcalBookingRow),
      preferred_date: newDate ?? booking.preferred_date,
    };
    clientIcsAttachment = buildBookingIcsAttachment(
      icsBookingRow,
      bookingSessions as unknown as IcalSessionRow[],
      quote?.rows ?? [],
      quote?.total ?? null,
    );
  }

  await Promise.all([
    sendResendEmail(
      resendKey,
      fromEmail,
      booking.client_email,
      statusChangeSubject(payload.reason, booking.reference),
      renderStatusChangeClient(b, bookingSessions, quote, payload.reason, newDate, adminMessage),
      { attachments: clientIcsAttachment ? [clientIcsAttachment] : undefined },
    ),
    sendResendEmail(
      resendKey,
      fromEmail,
      STUDIO_EMAIL,
      `${statusChangeAdminLabel(payload.reason)} — ${booking.reference}`,
      renderStatusChangeAdmin(b, bookingSessions, quote, payload.reason, newDate, adminMessage),
      { replyTo: booking.client_email },
    ),
  ]);
}
