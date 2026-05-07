// HTML renderers for booking and contact emails.
// Pure functions — no I/O, no Deno globals — so they can also be invoked from
// preview/test scripts.

export interface BookingSession {
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

export interface QuoteRow {
  lbl: string;
  amt: number;
  onReq?: boolean;
  estimate?: boolean;
}

export interface QuoteData {
  reference: string;
  rows: QuoteRow[];
  total: number;
}

export interface BookingData {
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

export type StatusChangeReason = "report" | "rejet" | "autre";

const STUDIO_EMAIL = "contact@e-do.studio";
const SITE_URL = "https://e-do.studio";
const LOGO_URL = `${SITE_URL}/brand/logo-full.png`;

const BASE_FONT = `'Space Grotesk', system-ui, -apple-system, sans-serif`;
const MONO_FONT = `'IBM Plex Mono', 'Courier New', monospace`;
const COLOR_BLACK = `#111111`;
const COLOR_ORANGE = `#E2641A`;
const COLOR_GRAY = `#666666`;
const COLOR_BORDER = `#ececec`;
const COLOR_BG_LIGHT = `#f8f8f8`;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  <div style="padding: 28px 32px 20px; background: #ffffff;">
    <a href="${SITE_URL}" style="display: inline-block; text-decoration: none;">
      <img src="${LOGO_URL}" alt="E-Do Studio" width="140" style="display: block; height: auto; max-width: 140px; border: 0; outline: none;" />
    </a>
  </div>`;
}

function emailFooter(): string {
  return `
  <div style="border-top: 1px solid ${COLOR_BORDER}; padding: 16px 32px; background: ${COLOR_BG_LIGHT};">
    <p style="margin: 0; font-size: 11px; color: #999999; font-family: ${MONO_FONT}; line-height: 1.8;">
      E-Do Studio &nbsp;·&nbsp;
      <a href="${SITE_URL}" style="color: #999999; text-decoration: none;">e-do.studio</a>
      &nbsp;·&nbsp;
      <a href="mailto:${STUDIO_EMAIL}" style="color: #999999; text-decoration: none;">${STUDIO_EMAIL}</a>
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
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; font-family: ${BASE_FONT}; color: ${COLOR_BLACK};">
    ${emailHeader()}
    <div style="padding: 0 32px 4px;">
      <p style="margin: 0; font-size: 12px; font-family: ${MONO_FONT}; color: ${COLOR_GRAY}; text-transform: uppercase; letter-spacing: 0.08em;">${subtitle}</p>
    </div>
    <div style="padding: 16px 32px 24px;">
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
  return `<p style="margin: 24px 0 4px; font-size: 11px; font-family: ${MONO_FONT}; color: ${COLOR_GRAY}; text-transform: uppercase; letter-spacing: 0.08em;">${text}</p>`;
}

function signOff(): string {
  return `<p style="margin: 24px 0 0; font-size: 14px; color: ${COLOR_GRAY};">Cordialement,<br><strong style="color: ${COLOR_BLACK};">L'équipe E-Do Studio</strong></p>`;
}

function quoteTableHtml(quote: QuoteData | null): string {
  if (!quote || quote.rows.length === 0) return "";
  const rows = quote.rows.map((r) => {
    const label = escapeHtml(r.lbl);
    const amt = r.onReq
      ? `<span style="color: ${COLOR_GRAY};">Sur demande</span>`
      : `${r.amt.toLocaleString("fr-FR")} € HT${r.estimate ? `<span style="color: ${COLOR_GRAY}; font-size: 12px;"> (estimé)</span>` : ""}`;
    return `<tr>
      <td style="padding: 7px 0; color: ${COLOR_GRAY}; font-size: 13px; vertical-align: top;">${label}</td>
      <td style="padding: 7px 0; font-size: 14px; text-align: right; white-space: nowrap; font-weight: 500;">${amt}</td>
    </tr>`;
  }).join("");
  const totalStr = `${quote.total.toLocaleString("fr-FR")} € HT`;
  return `
  ${sectionTitle(`Devis ${escapeHtml(quote.reference)}`)}
  <table style="width: 100%; border-collapse: collapse;">
    ${rows}
    <tr>
      <td style="padding: 12px 0 4px; font-size: 13px; color: ${COLOR_BLACK}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">Total</td>
      <td style="padding: 12px 0 4px; font-size: 15px; text-align: right; font-weight: 700; color: ${COLOR_ORANGE}; font-family: ${MONO_FONT}; white-space: nowrap;">${totalStr}</td>
    </tr>
  </table>`;
}

export function renderBookingClient(
  b: BookingData,
  sessions: BookingSession[],
  quote: QuoteData | null,
): string {
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
      <a href="mailto:${STUDIO_EMAIL}" style="color: ${COLOR_BLACK};">${STUDIO_EMAIL}</a>.
    </p>
    ${signOff()}`;

  return emailWrap("Confirmation de réservation", body);
}

export function renderBookingAdmin(
  b: BookingData,
  sessions: BookingSession[],
  quote: QuoteData | null,
): string {
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
      ${b.preferred_date ? dataRow("Date souhaitée", dateFmt(b.preferred_date)) : ""}
      ${b.arrival_hour != null ? dataRow("Heure d'arrivée", `${b.arrival_hour} h`) : ""}
      ${b.project_type ? dataRow("Type de projet", escapeHtml(b.project_type)) : ""}
      ${b.urgency ? dataRow("Urgence", escapeHtml(b.urgency)) : ""}
      ${dataRow("Estimation", totalStr)}
      ${b.notes ? dataRow("Notes", escapeHtml(b.notes)) : ""}
    </table>
    ${quoteTableHtml(quote)}`;

  return emailWrap(`Nouvelle réservation — ${ref}`, body);
}

export function renderContactClient(nom: string, sujet: string): string {
  const body = `
    <p style="margin: 0 0 20px; font-size: 15px;">Bonjour <strong>${escapeHtml(nom)}</strong>,</p>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: ${COLOR_GRAY};">
      Nous avons bien reçu votre message concernant : <strong style="color: ${COLOR_BLACK};">${escapeHtml(sujet)}</strong>.
    </p>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: ${COLOR_GRAY};">
      Notre équipe vous répondra sous <strong style="color: ${COLOR_BLACK};">48 h ouvrées</strong>.
    </p>
    ${signOff()}`;

  return emailWrap("Message reçu", body);
}

export function renderContactAdmin(
  nom: string,
  email: string,
  telephone: string,
  societe: string,
  sujet: string,
  message: string,
): string {
  const safeNom = escapeHtml(nom);
  const safeEmail = escapeHtml(email);
  const safeTel = escapeHtml(telephone);
  const safeSociete = escapeHtml(societe);
  const safeSujet = escapeHtml(sujet);
  const safeMsg = escapeHtml(message);

  const body = `
    <table style="width: 100%; border-collapse: collapse;">
      ${dataRow("Nom", `<strong>${safeNom}</strong>`)}
      ${dataRow("Email", `<a href="mailto:${safeEmail}" style="color: ${COLOR_BLACK};">${safeEmail}</a>`)}
      ${safeTel ? dataRow("Téléphone", safeTel) : ""}
      ${safeSociete ? dataRow("Société", safeSociete) : ""}
      ${dataRow("Sujet", safeSujet)}
    </table>
    ${sectionTitle("Message")}
    <div style="background: ${COLOR_BG_LIGHT}; padding: 16px; border-left: 3px solid ${COLOR_ORANGE}; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${safeMsg}</div>`;

  return emailWrap(`Contact — ${safeSujet}`, body);
}

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

export function statusChangeSubject(reason: StatusChangeReason, ref: string): string {
  const subjectByReason: Record<StatusChangeReason, string> = {
    report: `Réservation ${ref} reportée — E-Do Studio`,
    rejet: `Réservation ${ref} non retenue — E-Do Studio`,
    autre: `Mise à jour réservation ${ref} — E-Do Studio`,
  };
  return subjectByReason[reason];
}

export function statusChangeAdminLabel(reason: StatusChangeReason): string {
  return STATUS_CHANGE_LABELS[reason].title;
}

export function renderStatusChangeClient(
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
    <div style="background: ${COLOR_BG_LIGHT}; padding: 16px; border-left: 3px solid ${COLOR_ORANGE}; font-size: 14px; line-height: 1.7;">${escapeHtml(adminMessage)}</div>` : ""}
    <p style="margin: 24px 0 8px; font-size: 13px; color: ${COLOR_GRAY};">
      Pour toute question, répondez directement à cet e-mail ou contactez-nous à
      <a href="mailto:${STUDIO_EMAIL}" style="color: ${COLOR_BLACK};">${STUDIO_EMAIL}</a>.
    </p>
    ${signOff()}`;

  return emailWrap(labels.title, body);
}

export function renderStatusChangeAdmin(
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
      ${adminMessage ? dataRow("Message envoyé", escapeHtml(adminMessage)) : ""}
    </table>
    ${quoteTableHtml(quote)}`;

  return emailWrap(`${labels.title} — ${ref}`, body);
}
