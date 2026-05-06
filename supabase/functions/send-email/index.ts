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

function bookingClientHtml(
  ref: string,
  clientName: string,
  date: string | null,
  total: number | null,
  sessions: { plateau_key: string; hours: number | null }[],
): string {
  const plateaux = sessions.map((s) => s.plateau_key).join(", ");
  const totalStr = total != null ? `${total.toLocaleString("fr-FR")}€ HT` : "Sur demande";

  return `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h2 style="margin-bottom: 4px;">E-Do Studio</h2>
  <p style="color: #666; margin-top: 0;">Confirmation de réservation</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5;">
  <p>Bonjour <strong>${clientName}</strong>,</p>
  <p>Nous avons bien reçu votre demande de réservation. Voici le récapitulatif :</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 6px 0; color: #666;">Référence</td><td style="padding: 6px 0; font-weight: 600;">${ref}</td></tr>
    ${plateaux ? `<tr><td style="padding: 6px 0; color: #666;">Plateau(x)</td><td style="padding: 6px 0;">${plateaux}</td></tr>` : ""}
    ${date ? `<tr><td style="padding: 6px 0; color: #666;">Date souhaitée</td><td style="padding: 6px 0;">${new Date(date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td></tr>` : ""}
    <tr><td style="padding: 6px 0; color: #666;">Estimation</td><td style="padding: 6px 0; font-weight: 600;">${totalStr}</td></tr>
  </table>
  <p>Notre équipe reviendra vers vous très rapidement pour confirmer les détails.</p>
  <p style="color: #666; font-size: 14px;">À bientôt,<br>L'équipe E-Do Studio</p>
</div>`;
}

function bookingAdminHtml(
  ref: string,
  clientName: string,
  clientEmail: string,
  clientPhone: string | null,
  clientCompany: string | null,
  date: string | null,
  total: number | null,
  sessions: { plateau_key: string; slot_type: string; hours: number | null }[],
  notes: string | null,
): string {
  const plateaux = sessions.map((s) => `${s.plateau_key} (${s.hours ?? "?"}h, ${s.slot_type})`).join(", ");
  const totalStr = total != null ? `${total.toLocaleString("fr-FR")}€ HT` : "Sur demande";

  return `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h2 style="margin-bottom: 4px;">Nouvelle réservation</h2>
  <p style="color: #666; margin-top: 0;">${ref}</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5;">
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 6px 0; color: #666; width: 140px;">Client</td><td style="padding: 6px 0;"><strong>${clientName}</strong></td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;"><a href="mailto:${clientEmail}">${clientEmail}</a></td></tr>
    ${clientPhone ? `<tr><td style="padding: 6px 0; color: #666;">Téléphone</td><td style="padding: 6px 0;">${clientPhone}</td></tr>` : ""}
    ${clientCompany ? `<tr><td style="padding: 6px 0; color: #666;">Société</td><td style="padding: 6px 0;">${clientCompany}</td></tr>` : ""}
    ${plateaux ? `<tr><td style="padding: 6px 0; color: #666;">Plateau(x)</td><td style="padding: 6px 0;">${plateaux}</td></tr>` : ""}
    ${date ? `<tr><td style="padding: 6px 0; color: #666;">Date souhaitée</td><td style="padding: 6px 0;">${new Date(date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td></tr>` : ""}
    <tr><td style="padding: 6px 0; color: #666;">Estimation</td><td style="padding: 6px 0; font-weight: 600;">${totalStr}</td></tr>
    ${notes ? `<tr><td style="padding: 6px 0; color: #666;">Notes</td><td style="padding: 6px 0;">${notes}</td></tr>` : ""}
  </table>
</div>`;
}

function contactClientHtml(nom: string, sujet: string): string {
  return `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h2 style="margin-bottom: 4px;">E-Do Studio</h2>
  <p style="color: #666; margin-top: 0;">Accusé de réception</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5;">
  <p>Bonjour <strong>${nom}</strong>,</p>
  <p>Nous avons bien reçu votre message concernant : <strong>${sujet}</strong>.</p>
  <p>Notre équipe vous répondra dans les meilleurs délais.</p>
  <p style="color: #666; font-size: 14px;">À bientôt,<br>L'équipe E-Do Studio</p>
</div>`;
}

function contactAdminHtml(
  nom: string,
  email: string,
  telephone: string,
  societe: string,
  sujet: string,
  message: string,
): string {
  return `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h2 style="margin-bottom: 4px;">Nouveau message de contact</h2>
  <hr style="border: none; border-top: 1px solid #e5e5e5;">
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 6px 0; color: #666; width: 120px;">Nom</td><td style="padding: 6px 0;"><strong>${nom}</strong></td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;"><a href="mailto:${email}">${email}</a></td></tr>
    ${telephone ? `<tr><td style="padding: 6px 0; color: #666;">Téléphone</td><td style="padding: 6px 0;">${telephone}</td></tr>` : ""}
    ${societe ? `<tr><td style="padding: 6px 0; color: #666;">Société</td><td style="padding: 6px 0;">${societe}</td></tr>` : ""}
    <tr><td style="padding: 6px 0; color: #666;">Sujet</td><td style="padding: 6px 0;">${sujet}</td></tr>
  </table>
  <div style="background: #f5f5f5; padding: 16px; border-radius: 4px; white-space: pre-wrap;">${message}</div>
</div>`;
}

const STATUS_CHANGE_LABELS: Record<StatusChangeReason, { title: string; intro: string }> = {
  report: {
    title: "Réservation reportée",
    intro: "Votre réservation a été reportée à une nouvelle date.",
  },
  rejet: {
    title: "Réservation non retenue",
    intro: "Nous avons le regret de vous informer que votre réservation n'a pas pu être retenue.",
  },
  autre: {
    title: "Mise à jour de votre réservation",
    intro: "Votre réservation a fait l'objet d'une modification.",
  },
};

function statusChangeClientHtml(
  ref: string,
  clientName: string,
  reason: StatusChangeReason,
  originalDate: string | null,
  newDate: string | null,
  adminMessage: string | null,
): string {
  const labels = STATUS_CHANGE_LABELS[reason];
  const dateFmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h2 style="margin-bottom: 4px;">E-Do Studio</h2>
  <p style="color: #666; margin-top: 0;">${labels.title}</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5;">
  <p>Bonjour <strong>${clientName}</strong>,</p>
  <p>${labels.intro}</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 6px 0; color: #666;">Référence</td><td style="padding: 6px 0; font-weight: 600;">${ref}</td></tr>
    ${originalDate ? `<tr><td style="padding: 6px 0; color: #666;">Date initiale</td><td style="padding: 6px 0;">${dateFmt(originalDate)}</td></tr>` : ""}
    ${newDate ? `<tr><td style="padding: 6px 0; color: #666;">Nouvelle date</td><td style="padding: 6px 0; font-weight: 600;">${dateFmt(newDate)}</td></tr>` : ""}
  </table>
  ${adminMessage ? `<div style="background: #f5f5f5; padding: 16px; border-radius: 4px; margin: 16px 0;"><strong>Message :</strong><br>${adminMessage}</div>` : ""}
  <p>Pour toute question, n'hésitez pas à nous contacter par retour de mail.</p>
  <p style="color: #666; font-size: 14px;">À bientôt,<br>L'équipe E-Do Studio</p>
</div>`;
}

function statusChangeAdminHtml(
  ref: string,
  clientName: string,
  clientEmail: string,
  reason: StatusChangeReason,
  originalDate: string | null,
  newDate: string | null,
  adminMessage: string | null,
): string {
  const labels = STATUS_CHANGE_LABELS[reason];
  const dateFmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h2 style="margin-bottom: 4px;">${labels.title}</h2>
  <p style="color: #666; margin-top: 0;">${ref}</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5;">
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 6px 0; color: #666; width: 140px;">Client</td><td style="padding: 6px 0;"><strong>${clientName}</strong> (<a href="mailto:${clientEmail}">${clientEmail}</a>)</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Motif</td><td style="padding: 6px 0;">${labels.title}</td></tr>
    ${originalDate ? `<tr><td style="padding: 6px 0; color: #666;">Date initiale</td><td style="padding: 6px 0;">${dateFmt(originalDate)}</td></tr>` : ""}
    ${newDate ? `<tr><td style="padding: 6px 0; color: #666;">Nouvelle date</td><td style="padding: 6px 0;">${dateFmt(newDate)}</td></tr>` : ""}
    ${adminMessage ? `<tr><td style="padding: 6px 0; color: #666;">Message</td><td style="padding: 6px 0;">${adminMessage}</td></tr>` : ""}
  </table>
</div>`;
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

  const { data: sessions } = await supabase
    .from("booking_sessions")
    .select("plateau_key, slot_type, hours")
    .eq("booking_id", bookingId);

  const clientName = escapeHtml(booking.client_name);
  const ref = escapeHtml(booking.reference);

  await Promise.all([
    sendResendEmail(
      resendKey,
      fromEmail,
      booking.client_email,
      `Votre réservation ${booking.reference} — E-Do Studio`,
      bookingClientHtml(ref, clientName, booking.preferred_date, booking.total_estimate, sessions ?? []),
    ),
    sendResendEmail(
      resendKey,
      fromEmail,
      STUDIO_EMAIL,
      `Nouvelle réservation ${booking.reference} — ${booking.client_name}`,
      bookingAdminHtml(
        ref,
        clientName,
        escapeHtml(booking.client_email),
        booking.client_phone ? escapeHtml(booking.client_phone) : null,
        booking.client_company ? escapeHtml(booking.client_company) : null,
        booking.preferred_date,
        booking.total_estimate,
        sessions ?? [],
        booking.notes ? escapeHtml(booking.notes) : null,
      ),
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

  const clientName = escapeHtml(booking.client_name);
  const ref = escapeHtml(booking.reference);
  const originalDate = booking.preferred_date ?? null;
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
      statusChangeClientHtml(ref, clientName, payload.reason, originalDate, newDate, adminMessage),
    ),
    sendResendEmail(
      resendKey,
      fromEmail,
      STUDIO_EMAIL,
      `${STATUS_CHANGE_LABELS[payload.reason].title} — ${booking.reference}`,
      statusChangeAdminHtml(
        ref,
        clientName,
        escapeHtml(booking.client_email),
        payload.reason,
        originalDate,
        newDate,
        adminMessage,
      ),
      booking.client_email,
    ),
  ]);
}
