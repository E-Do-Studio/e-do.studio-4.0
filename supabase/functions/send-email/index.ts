import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import { z } from "https://esm.sh/zod@4.4.3";
import { syncContactForm, syncBooking } from "../_shared/hubspot.ts";
import { scoreContactSubmission } from "./spam.ts";
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

// www.e-do.studio serves the site directly — it does not redirect to the apex —
// so both hosts are legitimate origins.
const DEFAULT_ALLOWED_ORIGINS = [
  "https://e-do.studio",
  "https://www.e-do.studio",
  "http://localhost:5173",
];

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get("SEND_EMAIL_ALLOWED_ORIGIN");
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// `pnpm dev` binds 0.0.0.0, so testing on a phone reaches the site through a LAN
// address. Accepting loopback and RFC1918 origins keeps that workflow alive and
// concedes nothing: a remote attacker would simply forge an allowed Origin
// anyway — this header is a cheap first filter, not the barrier.
function isLocalOrigin(origin: string): boolean {
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
}

function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return parseAllowedOrigins().includes(origin) || isLocalOrigin(origin);
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const allowed = parseAllowedOrigins();
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
    "Vary": "Origin",
  };
}

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
  // Anti-spam control fields, never rendered in the emails.
  website?: string;
  elapsedMs?: number;
  turnstileToken?: string;
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

// Une soumission de réservation qui n'aboutit pas côté navigateur. Il n'y a
// alors AUCUNE ligne en base — donc pas de `bookingId` à joindre, et rien que
// le studio puisse retrouver après coup.
//
// C'est le seul incident du tunnel qui ne laissait aucune trace : l'erreur
// s'affichait au client, un `console.error` partait dans SA console, et
// personne au studio n'en savait rien. `create-booking` a pu rester
// indisponible sans que quiconque l'apprenne.
interface BookingFailureAlertPayload {
  type: "booking_failure_alert";
  /** Le message technique de l'exception, tel quel — c'est lui qu'on diagnostique. */
  error: string;
  /** L'étape et le mode au moment de l'échec, pour situer. */
  mode: string;
  /** De quoi rappeler le client, s'il a laissé ses coordonnées. */
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** L'URL exacte où ça a cassé. */
  pageUrl?: string;
}

type EmailPayload =
  | BookingEmailPayload
  | ContactEmailPayload
  | BookingStatusChangePayload
  | CalendarSyncAlertPayload
  | BookingFailureAlertPayload;

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

// ─── Contact form anti-spam ───────────────────────────────────────────────

const MIN_FILL_MS = 2500;
const CONTACT_SHORT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_SHORT_LIMIT = 5;
const CONTACT_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const CONTACT_DAILY_LIMIT = 15;

// Hand-rolled rather than z.email() so the schema does not depend on which
// zod major moved the string formats around.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const contactSchema = z.object({
  nom: z.string().trim().min(1).max(100),
  email: z.string().trim().max(254).regex(EMAIL_RE),
  telephone: z.string().trim().min(1).max(30),
  societe: z.string().trim().min(1).max(120),
  message: z.string().trim().min(10).max(4000),
  website: z.string().max(200).optional(),
  // Milliseconds between form mount and submit, measured entirely on the
  // client's own clock — an absolute timestamp compared against the server
  // would misjudge any visitor whose device clock is skewed.
  elapsedMs: z.number().nonnegative().optional(),
  turnstileToken: z.string().max(4096).optional(),
});

type ContactInput = z.infer<typeof contactSchema>;

async function hashIp(ip: string): Promise<string> {
  const buf = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

interface RateLimitClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

// Fails open: a Postgres hiccup must never take the contact form down.
async function checkAndIncrement(
  supabase: RateLimitClient,
  ipHash: string,
  kind: "short" | "daily",
  windowMs: number,
  limit: number,
): Promise<boolean> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();

  const { data, error } = await supabase
    .from("contact_rate_limits")
    .select("count")
    .eq("ip_hash", ipHash)
    .eq("window_kind", kind)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (error) {
    console.error("contact rate-limit select error", error);
    return true;
  }

  const current = data?.count ?? 0;
  if (current >= limit) return false;

  const { error: upsertErr } = await supabase
    .from("contact_rate_limits")
    .upsert(
      {
        ip_hash: ipHash,
        window_kind: kind,
        window_start: windowStart,
        count: current + 1,
      },
      { onConflict: "ip_hash,window_kind,window_start" },
    );

  if (upsertErr) {
    console.error("contact rate-limit upsert error", upsertErr);
  }

  return true;
}

// Inert until TURNSTILE_SECRET_KEY is set, so the rest of the protection can
// ship without a Cloudflare account. Do not set that secret before the front
// actually renders the widget and sends a token: without one, every genuine
// submission would be rejected here.
async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true;
  if (!token) return false;

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  body.append("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const result = await res.json();
    return result.success === true;
  } catch (e) {
    console.error("turnstile verify error", e);
    return true;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordContactSubmission(
  supabase: { from: (table: string) => any },
  data: ContactInput,
  ipHash: string,
  score: number,
  reasons: string[],
  delivered: boolean,
): Promise<void> {
  const { error } = await supabase.from("contact_submissions").insert({
    nom: data.nom,
    email: data.email,
    telephone: data.telephone,
    societe: data.societe,
    message: data.message,
    ip_hash: ipHash,
    spam_score: score,
    spam_reason: reasons,
    delivered,
  });
  if (error) console.error("contact_submissions insert error", error);
}

async function handleContactRequest(
  req: Request,
  cors: Record<string, string>,
  resendKey: string,
  fromEmail: string,
  raw: unknown,
): Promise<Response> {
  const json = (body: Record<string, unknown>, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  // Scoped to the contact type on purpose: `calendar_sync_alert` is fired by a
  // pg_cron job through pg_net, which sends no Origin header at all
  // (20260604090000_calendar_sync_lifecycle.sql). A blanket check would have
  // silently killed that alerting.
  if (!isAllowedOrigin(req)) {
    return json({ error: "forbidden_origin" }, 403);
  }

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "invalid_payload" }, 400);
  }
  const data = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);

  // Free local checks first — nothing costly runs before the verdict.
  const reasons: string[] = [];
  if (data.website && data.website.trim() !== "") reasons.push("honeypot");
  if (typeof data.elapsedMs === "number" && data.elapsedMs < MIN_FILL_MS) {
    reasons.push("submitted_too_fast");
  }

  const verdict = scoreContactSubmission(data);
  const spam = reasons.length > 0 || verdict.isSpam;
  reasons.push(...verdict.reasons);

  if (spam) {
    await recordContactSubmission(supabase, data, ipHash, verdict.score, reasons, false);
    // Answer as if delivered: the bot learns nothing about which filter fired.
    return json({ ok: true }, 200);
  }

  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    await recordContactSubmission(supabase, data, ipHash, verdict.score, [...reasons, "turnstile_failed"], false);
    return json({ ok: true }, 200);
  }

  const shortOk = await checkAndIncrement(
    supabase,
    ipHash,
    "short",
    CONTACT_SHORT_WINDOW_MS,
    CONTACT_SHORT_LIMIT,
  );
  const dailyOk = shortOk &&
    await checkAndIncrement(supabase, ipHash, "daily", CONTACT_DAILY_WINDOW_MS, CONTACT_DAILY_LIMIT);

  if (!shortOk || !dailyOk) {
    await recordContactSubmission(supabase, data, ipHash, verdict.score, [...reasons, "rate_limited"], false);
    // Surfaced to the visitor: a human retrying deserves to know why.
    return json({ error: "rate_limited" }, 429);
  }

  await handleContactEmail(resendKey, fromEmail, {
    type: "contact",
    nom: data.nom,
    email: data.email,
    telephone: data.telephone,
    societe: data.societe,
    message: data.message,
  });
  await recordContactSubmission(supabase, data, ipHash, verdict.score, reasons, true);

  return json({ ok: true }, 200);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

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
      return await handleContactRequest(req, corsHeaders, resendKey, fromEmail, payload);
    } else if (payload.type === "booking_status_change") {
      await handleBookingStatusChangeEmail(resendKey, fromEmail, payload);
    } else if (payload.type === "calendar_sync_alert") {
      await handleCalendarSyncAlert(resendKey, fromEmail, payload.bookingId);
    } else if (payload.type === "booking_failure_alert") {
      await handleBookingFailureAlert(resendKey, fromEmail, payload);
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

// Aucun accès à la base ici : il n'y a rien à lire, la réservation n'existe
// pas. Tout ce qu'on sait vient du navigateur qui a échoué.
async function handleBookingFailureAlert(
  resendKey: string,
  fromEmail: string,
  payload: BookingFailureAlertPayload,
): Promise<void> {
  const esc = (v: unknown) =>
    String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

  const contact = [payload.contactName, payload.contactEmail, payload.contactPhone]
    .filter(Boolean)
    .map(esc)
    .join(" — ");

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111">
      <p><strong>⚠️ Une réservation n'a pas pu être enregistrée.</strong></p>
      <p>Le tunnel a rendu une erreur au client : aucune ligne n'a été créée en
      base. Si cette alerte se répète, le tunnel est probablement hors service.</p>
      <table cellpadding="4" style="border-collapse:collapse">
        <tr><td><strong>Erreur</strong></td><td>${esc(payload.error)}</td></tr>
        <tr><td><strong>Mode</strong></td><td>${esc(payload.mode)}</td></tr>
        <tr><td><strong>Page</strong></td><td>${esc(payload.pageUrl)}</td></tr>
      </table>
      ${contact ? `<p><strong>Le client à rappeler :</strong> ${contact}</p>` : "<p>Le client n'avait pas encore laissé ses coordonnées.</p>"}
    </div>`;

  await sendResendEmail(
    resendKey,
    fromEmail,
    STUDIO_EMAIL,
    "⚠️ Échec de réservation dans le tunnel",
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
