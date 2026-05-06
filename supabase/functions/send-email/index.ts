import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import { syncContactForm, syncBooking } from "../_shared/hubspot.ts";

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
  sujet: string;
  message: string;
}

type StatusChangeReason = "report" | "rejet" | "autre";

interface BookingStatusChangePayload {
  type: "booking_status_change";
  bookingId: string;
  reason: StatusChangeReason;
  newDate?: string;
  message?: string;
}

type EmailPayload = BookingEmailPayload | ContactEmailPayload | BookingStatusChangePayload;

async function sendResendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

interface BookingSession {
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

interface QuoteRow {
  lbl: string;
  amt: number;
  onReq?: boolean;
  estimate?: boolean;
}

interface QuoteData {
  reference: string;
  rows: QuoteRow[];
  total: number;
}

interface BookingData {
  reference: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_company: string | null;
  client_siren: string | null;
  project_type: string | null;
  urgency: string | null;
  total_estimate: number | null;
  preferred_date: string | null;
  arrival_hour: number | null;
  notes: string | null;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const BASE_FONT = `'Space Grotesk', system-ui, -apple-system, sans-serif`;
const MONO_FONT = `'IBM Plex Mono', 'Courier New', monospace`;
const COLOR_BLACK = `#111111`;
const COLOR_ORANGE = `#E2641A`;
const COLOR_GRAY = `#666666`;
const COLOR_BORDER = `#e5e5e5`;
const COLOR_BG_LIGHT = `#f8f8f8`;

function dateFmt(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function emailHeader(): string {
  return `
  <div style="border-top: 3px solid ${COLOR_ORANGE}; padding: 20px 32px 16px; background: #ffffff;">
    <span style="font-family: ${MONO_FONT}; color: ${COLOR_BLACK}; font-size: 15px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">E-Do Studio</span>
  </div>`;
}

function emailFooter(): string {
  return `
  <div style="border-top: 1px solid ${COLOR_BORDER}; padding: 16px 32px; background: ${COLOR_BG_LIGHT};">
    <p style="margin: 0; font-size: 11px; color: #999999; font-family: ${MONO_FONT}; line-height: 1.8;">
      E-Do Studio &nbsp;·&nbsp;
      <a href="https://e-do.studio" style="color: #999999; text-decoration: none;">e-do.studio</a>
      &nbsp;·&nbsp;
      <a href="mailto:contact@e-do.studio" style="color: #999999; text-decoration: none;">contact@e-do.studio</a>
    </p>
  </div>`;
}

function emailWrap(subtitle: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 24px 0; background: #f0f0f0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid ${COLOR_BORDER}; font-family: ${BASE_FONT}; color: ${COLOR_BLACK};">
    ${emailHeader()}
    <div style="padding: 12px 32px 4px; border-bottom: 1px solid ${COLOR_BORDER};">
      <p style="margin: 0; font-size: 12px; font-family: ${MONO_FONT}; color: ${COLOR_GRAY}; text-transform: uppercase; letter-spacing: 0.08em;">${subtitle}</p>
    </div>
    <div style="padding: 28px 32px 24px;">
      ${body}
    </div>
    ${emailFooter()}
  </div>
</body>
</html>`;
}

function dataRow(label: string, value: string, accent = false): string {
  const valStyle = accent
    ? `font-weight: 700; color: ${COLOR_ORANGE}; font-family: ${MONO_FONT};`
    : `font-weight: 500;`;
  return `<tr>
    <td style="padding: 7px 0; color: ${COLOR_GRAY}; font-size: 13px; width: 150px; vertical-align: top;">${label}</td>
    <td style="padding: 7px 0; font-size: 14px; ${valStyle}">${value}</td>
  </tr>`;
}

function sectionTitle(text: string): string {
  return `<p style="margin: 20px 0 8px; font-size: 11px; font-family: ${MONO_FONT}; color: ${COLOR_GRAY}; text-transform: uppercase; letter-spacing: 0.08em; border-top: 1px solid ${COLOR_BORDER}; padding-top: 16px;">${text}</p>`;
}

function signOff(): string {
  return `<p style="margin: 24px 0 0; font-size: 14px; color: ${COLOR_GRAY};">Cordialement,<br><strong style="color: ${COLOR_BLACK};">L'équipe E-Do Studio</strong></p>`;
}

// ─── Quote table ──────────────────────────────────────────────────────────────

function quoteTableHtml(quote: QuoteData | null): string {
  if (!quote || quote.rows.length === 0) return "";
  const rows = quote.rows.map((r) => {
    const label = escapeHtml(r.lbl);
    const amt = r.onReq
      ? `<span style="color: ${COLOR_GRAY};">Sur demande</span>`
      : `${r.amt.toLocaleString("fr-FR")} € HT${r.estimate ? `<span style="color: ${COLOR_GRAY}; font-size: 12px;"> (estimé)</span>` : ""}`;
    return `<tr>
      <td style="padding: 6px 0; font-size: 14px; border-bottom: 1px solid ${COLOR_BORDER};">${label}</td>
      <td style="padding: 6px 0; font-size: 14px; text-align: right; white-space: nowrap; border-bottom: 1px solid ${COLOR_BORDER};">${amt}</td>
    </tr>`;
  }).join("");
  const totalStr = `${quote.total.toLocaleString("fr-FR")} € HT`;
  return `
  ${sectionTitle(`Devis ${escapeHtml(quote.reference)}`)}
  <table style="width: 100%; border-collapse: collapse;">
    ${rows}
    <tr>
      <td style="padding: 10px 0 4px; font-weight: 700; font-size: 14px;">Total</td>
      <td style="padding: 10px 0 4px; font-weight: 700; font-size: 15px; text-align: right; color: ${COLOR_ORANGE}; font-family: ${MONO_FONT};">${totalStr}</td>
    </tr>
  </table>`;
}

// ─── Session details ──────────────────────────────────────────────────────────

function sessionDetailRows(sessions: BookingSession[]): string {
  if (sessions.length === 0) return "";
  return sessions.map((s) => {
    const details: string[] = [];
    details.push(`<strong>${s.plateau_key}</strong> &nbsp;—&nbsp; ${s.hours ?? "?"}h · ${s.slot_type}`);
    if (s.cyclo_mode) details.push(`Cyclo : ${s.cyclo_mode}`);
    if (s.product_type) details.push(`Produit : ${s.product_type}`);
    if (s.method) details.push(`Méthode : ${s.method}${s.submethod ? ` / ${s.submethod}` : ""}`);
    if (s.quantity && s.quantity > 1) details.push(`Quantité : ${s.quantity}`);
    if (s.media && s.media.length > 0) details.push(`Médias : ${s.media.join(", ")}`);
    if (s.views && s.views.length > 0) details.push(`Vues : ${s.views.join(", ")} (${s.views_count ?? s.views.length})`);
    if (s.postprod_enabled) details.push(`Post-prod : oui${s.postprod_video ? " (vidéo)" : ""}`);
    return `<div style="background: ${COLOR_BG_LIGHT}; padding: 12px 14px; border-left: 3px solid ${COLOR_ORANGE}; margin: 8px 0; font-size: 13px; line-height: 1.7;">${details.join("<br>")}</div>`;
  }).join("");
}

// ─── Booking confirmation — client ────────────────────────────────────────────

function bookingClientHtml(b: BookingData, sessions: BookingSession[], quote: QuoteData | null): string {
  const ref = escapeHtml(b.reference);
  const clientName = escapeHtml(b.client_name);
  const plateaux = sessions.map((s) => `${s.plateau_key} (${s.hours ?? "?"}h, ${s.slot_type})`).join(", ");
  const totalStr = b.total_estimate != null ? `${b.total_estimate.toLocaleString("fr-FR")} € HT` : "Sur demande";

  const body = `
    <p style="margin: 0 0 20px; font-size: 15px;">Bonjour <strong>${clientName}</strong>,</p>
    <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: ${COLOR_GRAY};">
      Votre demande de réservation a bien été enregistrée. Notre équipe vous recontactera dans les <strong style="color: ${COLOR_BLACK};">24 h ouvrées</strong> pour confirmer les disponibilités.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 4px 0;">
      ${dataRow("Référence", ref, true)}
      ${dataRow("Email", escapeHtml(b.client_email))}
      ${b.client_phone ? dataRow("Téléphone", escapeHtml(b.client_phone)) : ""}
      ${b.client_company ? dataRow("Société", escapeHtml(b.client_company)) : ""}
      ${plateaux ? dataRow("Plateau(x)", plateaux) : ""}
      ${b.preferred_date ? dataRow("Date souhaitée", dateFmt(b.preferred_date)) : ""}
      ${b.arrival_hour != null ? dataRow("Heure d'arrivée", `${b.arrival_hour} h`) : ""}
      ${b.project_type ? dataRow("Type de projet", escapeHtml(b.project_type)) : ""}
      ${dataRow("Estimation", totalStr)}
    </table>
    ${quoteTableHtml(quote)}
    <p style="margin: 24px 0 8px; font-size: 13px; color: ${COLOR_GRAY};">
      Pour toute question, répondez directement à cet e-mail ou écrivez-nous à
      <a href="mailto:contact@e-do.studio" style="color: ${COLOR_BLACK};">contact@e-do.studio</a>.
    </p>
    ${signOff()}`;

  return emailWrap("Confirmation de réservation", body);
}

// ─── Booking confirmation — admin ─────────────────────────────────────────────

function bookingAdminHtml(b: BookingData, sessions: BookingSession[], quote: QuoteData | null): string {
  const ref = escapeHtml(b.reference);
  const clientName = escapeHtml(b.client_name);
  const clientEmail = escapeHtml(b.client_email);
  const totalStr = b.total_estimate != null ? `${b.total_estimate.toLocaleString("fr-FR")} € HT` : "Sur demande";

  const body = `
    <table style="width: 100%; border-collapse: collapse;">
      ${dataRow("Client", `<strong>${clientName}</strong>`)}
      ${dataRow("Email", `<a href="mailto:${clientEmail}" style="color: ${COLOR_BLACK};">${clientEmail}</a>`)}
      ${b.client_phone ? dataRow("Téléphone", escapeHtml(b.client_phone)) : ""}
      ${b.client_company ? dataRow("Société", escapeHtml(b.client_company)) : ""}
      ${b.client_siren ? dataRow("SIREN", escapeHtml(b.client_siren)) : ""}
      ${b.preferred_date ? dataRow("Date souhaitée", dateFmt(b.preferred_date)) : ""}
      ${b.arrival_hour != null ? dataRow("Heure d'arrivée", `${b.arrival_hour} h`) : ""}
      ${b.project_type ? dataRow("Type de projet", escapeHtml(b.project_type)) : ""}
      ${b.urgency ? dataRow("Urgence", escapeHtml(b.urgency)) : ""}
      ${dataRow("Estimation", totalStr)}
      ${b.notes ? dataRow("Notes", escapeHtml(b.notes)) : ""}
    </table>
    ${sessions.length > 0 ? `${sectionTitle("Détail des sessions")}${sessionDetailRows(sessions)}` : ""}
    ${quoteTableHtml(quote)}`;

  return emailWrap(`Nouvelle réservation — ${ref}`, body);
}

// ─── Contact confirmation — client ────────────────────────────────────────────

function contactClientHtml(nom: string, sujet: string): string {
  const body = `
    <p style="margin: 0 0 20px; font-size: 15px;">Bonjour <strong>${nom}</strong>,</p>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: ${COLOR_GRAY};">
      Nous avons bien reçu votre message concernant : <strong style="color: ${COLOR_BLACK};">${sujet}</strong>.
    </p>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: ${COLOR_GRAY};">
      Notre équipe vous répondra sous <strong style="color: ${COLOR_BLACK};">48 h ouvrées</strong>.
    </p>
    ${signOff()}`;

  return emailWrap("Message reçu", body);
}

// ─── Contact notification — admin ────────────────────────────────────────────

function contactAdminHtml(
  nom: string,
  email: string,
  telephone: string,
  societe: string,
  sujet: string,
  message: string,
): string {
  const body = `
    <table style="width: 100%; border-collapse: collapse;">
      ${dataRow("Nom", `<strong>${nom}</strong>`)}
      ${dataRow("Email", `<a href="mailto:${email}" style="color: ${COLOR_BLACK};">${email}</a>`)}
      ${telephone ? dataRow("Téléphone", telephone) : ""}
      ${societe ? dataRow("Société", societe) : ""}
      ${dataRow("Sujet", sujet)}
    </table>
    ${sectionTitle("Message")}
    <div style="background: ${COLOR_BG_LIGHT}; padding: 16px; border-left: 3px solid ${COLOR_ORANGE}; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${message}</div>`;

  return emailWrap(`Contact — ${sujet}`, body);
}

// ─── Status change labels ─────────────────────────────────────────────────────

const STATUS_CHANGE_LABELS: Record<StatusChangeReason, { title: string; intro: string }> = {
  report: {
    title: "Réservation reportée",
    intro: "Votre réservation a été reportée à une nouvelle date. Retrouvez ci-dessous le récapitulatif mis à jour.",
  },
  rejet: {
    title: "Réservation non retenue",
    intro: "Nous sommes au regret de vous informer que nous ne sommes pas en mesure de donner suite à votre demande pour cette date. N'hésitez pas à nous recontacter pour trouver une alternative.",
  },
  autre: {
    title: "Mise à jour de votre réservation",
    intro: "Votre réservation a fait l'objet d'une modification. Retrouvez ci-dessous les informations actualisées.",
  },
};

// ─── Status change — client ───────────────────────────────────────────────────

function statusChangeClientHtml(
  b: BookingData,
  sessions: BookingSession[],
  quote: QuoteData | null,
  reason: StatusChangeReason,
  newDate: string | null,
  adminMessage: string | null,
): string {
  const labels = STATUS_CHANGE_LABELS[reason];
  const ref = escapeHtml(b.reference);
  const clientName = escapeHtml(b.client_name);
  const plateaux = sessions.map((s) => `${s.plateau_key} (${s.hours ?? "?"}h, ${s.slot_type})`).join(", ");
  const totalStr = b.total_estimate != null ? `${b.total_estimate.toLocaleString("fr-FR")} € HT` : "Sur demande";

  const body = `
    <p style="margin: 0 0 20px; font-size: 15px;">Bonjour <strong>${clientName}</strong>,</p>
    <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: ${COLOR_GRAY};">${labels.intro}</p>
    <table style="width: 100%; border-collapse: collapse;">
      ${dataRow("Référence", ref, true)}
      ${plateaux ? dataRow("Plateau(x)", plateaux) : ""}
      ${b.preferred_date ? dataRow("Date initiale", dateFmt(b.preferred_date)) : ""}
      ${newDate ? dataRow("Nouvelle date", `<strong style="color: ${COLOR_ORANGE};">${dateFmt(newDate)}</strong>`) : ""}
      ${b.client_company ? dataRow("Société", escapeHtml(b.client_company)) : ""}
      ${dataRow("Estimation", totalStr)}
    </table>
    ${quoteTableHtml(quote)}
    ${adminMessage ? `
    ${sectionTitle("Message de l'équipe")}
    <div style="background: ${COLOR_BG_LIGHT}; padding: 16px; border-left: 3px solid ${COLOR_ORANGE}; font-size: 14px; line-height: 1.7;">${adminMessage}</div>` : ""}
    <p style="margin: 24px 0 8px; font-size: 13px; color: ${COLOR_GRAY};">
      Pour toute question, répondez directement à cet e-mail ou contactez-nous à
      <a href="mailto:contact@e-do.studio" style="color: ${COLOR_BLACK};">contact@e-do.studio</a>.
    </p>
    ${signOff()}`;

  return emailWrap(labels.title, body);
}

// ─── Status change — admin ────────────────────────────────────────────────────

function statusChangeAdminHtml(
  b: BookingData,
  sessions: BookingSession[],
  quote: QuoteData | null,
  reason: StatusChangeReason,
  newDate: string | null,
  adminMessage: string | null,
): string {
  const labels = STATUS_CHANGE_LABELS[reason];
  const ref = escapeHtml(b.reference);
  const clientName = escapeHtml(b.client_name);
  const clientEmail = escapeHtml(b.client_email);
  const plateaux = sessions.map((s) => `${s.plateau_key} (${s.hours ?? "?"}h, ${s.slot_type})`).join(", ");
  const totalStr = b.total_estimate != null ? `${b.total_estimate.toLocaleString("fr-FR")} € HT` : "Sur demande";

  const body = `
    <table style="width: 100%; border-collapse: collapse;">
      ${dataRow("Client", `<strong>${clientName}</strong>`)}
      ${dataRow("Email", `<a href="mailto:${clientEmail}" style="color: ${COLOR_BLACK};">${clientEmail}</a>`)}
      ${b.client_phone ? dataRow("Téléphone", escapeHtml(b.client_phone)) : ""}
      ${b.client_company ? dataRow("Société", escapeHtml(b.client_company)) : ""}
      ${b.client_siren ? dataRow("SIREN", escapeHtml(b.client_siren)) : ""}
      ${plateaux ? dataRow("Plateau(x)", plateaux) : ""}
      ${dataRow("Motif", labels.title)}
      ${b.preferred_date ? dataRow("Date initiale", dateFmt(b.preferred_date)) : ""}
      ${newDate ? dataRow("Nouvelle date", `<strong style="color: ${COLOR_ORANGE};">${dateFmt(newDate)}</strong>`) : ""}
      ${b.project_type ? dataRow("Type de projet", escapeHtml(b.project_type)) : ""}
      ${dataRow("Estimation", totalStr)}
      ${adminMessage ? dataRow("Message envoyé", adminMessage) : ""}
    </table>
    ${sessions.length > 0 ? `${sectionTitle("Détail des sessions")}${sessionDetailRows(sessions)}` : ""}
    ${quoteTableHtml(quote)}`;

  return emailWrap(`${labels.title} — ${ref}`, body);
}

function syncToHubSpot(fn: () => Promise<void>): void {
  const token = Deno.env.get("HUBSPOT_PRIVATE_APP_TOKEN");
  if (!token) return;
  fn().catch((err) => console.error("HubSpot sync error:", err));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

  await Promise.all([
    sendResendEmail(
      resendKey,
      fromEmail,
      booking.client_email,
      `Votre réservation ${booking.reference} — E-Do Studio`,
      bookingClientHtml(b, sessions ?? [], quote),
    ),
    sendResendEmail(
      resendKey,
      fromEmail,
      STUDIO_EMAIL,
      `Nouvelle réservation ${booking.reference} — ${booking.client_name}`,
      bookingAdminHtml(b, sessions ?? [], quote),
      booking.client_email,
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
      plateaux: (sessions ?? []).map((s: { plateau_key: string }) => s.plateau_key),
    })
  );
}

async function handleContactEmail(
  resendKey: string,
  fromEmail: string,
  payload: ContactEmailPayload,
): Promise<void> {
  const nom = escapeHtml(payload.nom);
  const email = escapeHtml(payload.email);
  const telephone = escapeHtml(payload.telephone);
  const societe = escapeHtml(payload.societe);
  const sujet = escapeHtml(payload.sujet);
  const message = escapeHtml(payload.message);

  await Promise.all([
    sendResendEmail(
      resendKey,
      fromEmail,
      payload.email,
      `Votre message a bien été reçu — E-Do Studio`,
      contactClientHtml(nom, sujet),
    ),
    sendResendEmail(
      resendKey,
      fromEmail,
      STUDIO_EMAIL,
      `Contact : ${payload.sujet} — ${payload.nom}`,
      contactAdminHtml(nom, email, telephone, societe, sujet, message),
      payload.email,
    ),
  ]);

  syncToHubSpot(() =>
    syncContactForm(Deno.env.get("HUBSPOT_PRIVATE_APP_TOKEN")!, {
      nom: payload.nom,
      email: payload.email,
      telephone: payload.telephone,
      societe: payload.societe,
      sujet: payload.sujet,
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
  const adminMessage = payload.message ? escapeHtml(payload.message) : null;

  const subjectByReason: Record<StatusChangeReason, string> = {
    report: `Réservation ${booking.reference} reportée — E-Do Studio`,
    rejet: `Réservation ${booking.reference} non retenue — E-Do Studio`,
    autre: `Mise à jour réservation ${booking.reference} — E-Do Studio`,
  };

  await Promise.all([
    sendResendEmail(
      resendKey,
      fromEmail,
      booking.client_email,
      subjectByReason[payload.reason],
      statusChangeClientHtml(b, sessions ?? [], quote, payload.reason, newDate, adminMessage),
    ),
    sendResendEmail(
      resendKey,
      fromEmail,
      STUDIO_EMAIL,
      `${STATUS_CHANGE_LABELS[payload.reason].title} — ${booking.reference}`,
      statusChangeAdminHtml(b, sessions ?? [], quote, payload.reason, newDate, adminMessage),
      booking.client_email,
    ),
  ]);
}
