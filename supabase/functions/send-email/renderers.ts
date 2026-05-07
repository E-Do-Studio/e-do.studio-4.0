// HTML renderers for booking and contact emails.
// Pure functions — no I/O, no Deno globals — so they can be invoked from
// preview/test scripts.
//
// Design reference: brand "DA" lives in colors_and_type.css.
//   - Body face: ABC Favorit (brand) → Space Grotesk webfont fallback → system
//   - Mono UI face: IBM Plex Mono with Courier fallback
//   - Mono UPPERCASE labels with 0.2em tracking
//   - Single orange accent (#E2641A); brand black (#0d0d0d) for body
//   - Hairlines used as horizontal row separators only — no per-cell borders

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
const LOGO_URL = "https://xpqeechcvbyiqvqyrgvt.supabase.co/storage/v1/object/public/public-assets/email/logo-full.png";

// Brand tokens (mirror colors_and_type.css, hex-converted from oklch)
const C_BLACK = "#0d0d0d";        // brand black (body text)
const C_HAIRLINE = "#0d0d0d";     // row separators (brand black, slightly softer than pure)
const C_WHITE = "#ffffff";
const C_ORANGE = "#E2641A";
const C_GRAY = "#666666";
const C_BG = "#f4f4f4";

// Brand body face: ABC Favorit (paid, not in email) → Space Grotesk via Google
// Fonts → system fallback. Most modern email clients (Apple Mail, iCloud,
// Gmail web/iOS/Android, Outlook 365) load remote fonts; older Outlook
// desktop falls back to the system stack which still reads as a clean
// neo-grotesque.
// Single-quoted font names so the resulting inline style="..." attribute
// doesn't get terminated mid-declaration by the family's own double quotes.
const FONT_SANS = `'ABC Favorit', 'Space Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const FONT_MONO = `'IBM Plex Mono', 'Courier New', Courier, monospace`;

const LABEL_STYLE =
  `font-family:${FONT_MONO};font-size:11px;line-height:1;letter-spacing:0.18em;` +
  `text-transform:uppercase;color:${C_GRAY};font-weight:500;`;

// Horizontal separator only — no vertical lines between label/value.
const ROW_SEP = `border-bottom:1px solid ${C_HAIRLINE};`;

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

function emailWrap(subtitle: string, reference: string | null, body: string): string {
  const subRef = reference
    ? `<span style="font-family:${FONT_MONO};font-size:13px;letter-spacing:0.06em;color:${C_ORANGE};font-weight:600;">${escapeHtml(reference)}</span>`
    : "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(subtitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    body, table, td, p, span, a { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  </style>
</head>
<body style="margin:0;padding:32px 16px;background:${C_BG};font-family:${FONT_SANS};color:${C_BLACK};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:${C_WHITE};border-collapse:collapse;">
    <tr>
      <td style="padding:32px 32px 24px;background:${C_WHITE};${ROW_SEP}">
        <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;line-height:0;">
          <img src="${LOGO_URL}" alt="E-Do Studio" height="44" style="display:block;height:44px;width:auto;border:0;outline:none;text-decoration:none;" />
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 32px;background:${C_WHITE};${ROW_SEP}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <span style="${LABEL_STYLE}">${escapeHtml(subtitle)}</span>
            </td>
            <td style="vertical-align:middle;text-align:right;">${subRef}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0;background:${C_WHITE};">
        ${body}
      </td>
    </tr>
    <tr>
      <td style="padding:18px 32px;background:${C_BLACK};">
        <span style="font-family:${FONT_MONO};font-size:10px;line-height:1.6;letter-spacing:0.2em;text-transform:uppercase;color:${C_WHITE};">
          E-Do Studio &nbsp;·&nbsp;
          <a href="${SITE_URL}" style="color:${C_WHITE};text-decoration:none;">e-do.studio</a>
          &nbsp;·&nbsp;
          <a href="mailto:${STUDIO_EMAIL}" style="color:${C_WHITE};text-decoration:none;">${STUDIO_EMAIL}</a>
        </span>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function intro(html: string): string {
  return `<div style="padding:24px 32px 8px;background:${C_WHITE};font-family:${FONT_SANS};color:${C_BLACK};${ROW_SEP}">${html}</div>`;
}

function renderRow(label: string, value: string, isLast: boolean): string {
  const sep = isLast ? "" : ROW_SEP;
  return `<tr>
    <td style="padding:14px 32px 14px 32px;background:${C_WHITE};width:38%;vertical-align:top;${sep}">
      <span style="${LABEL_STYLE}">${escapeHtml(label)}</span>
    </td>
    <td style="padding:14px 32px 14px 0;background:${C_WHITE};vertical-align:top;font-family:${FONT_SANS};font-size:14px;line-height:1.45;color:${C_BLACK};${sep}">${value}</td>
  </tr>`;
}

function dataGrid(rows: Array<[string, string]>): string {
  const visible = rows.filter(([, v]) => v !== "" && v != null);
  const trs = visible
    .map(([label, value], i) => renderRow(label, value, i === visible.length - 1))
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:${C_WHITE};">${trs}</table>`;
}

function sectionBar(title: string, subtitle = ""): string {
  const sub = subtitle
    ? `<span style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.16em;color:${C_WHITE};margin-left:10px;text-transform:uppercase;opacity:0.7;">${escapeHtml(subtitle)}</span>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <td style="padding:14px 32px;background:${C_BLACK};">
        <span style="${LABEL_STYLE}color:${C_WHITE};">${escapeHtml(title)}</span>${sub}
      </td>
    </tr>
  </table>`;
}

function quoteGrid(quote: QuoteData | null): string {
  if (!quote || quote.rows.length === 0) return "";
  const rows = quote.rows.map((r, i) => {
    const isLast = i === quote.rows.length - 1;
    const sep = isLast ? "" : ROW_SEP;
    const label = escapeHtml(r.lbl);
    const amt = r.onReq
      ? `<span style="color:${C_GRAY};font-size:14px;">Sur demande</span>`
      : `<span style="font-family:${FONT_MONO};font-size:14px;color:${C_BLACK};">${r.amt.toLocaleString("fr-FR")} € HT${r.estimate ? `<span style="color:${C_GRAY};font-size:11px;"> (estimé)</span>` : ""}</span>`;
    return `<tr>
      <td style="padding:13px 32px;background:${C_WHITE};vertical-align:top;font-family:${FONT_SANS};font-size:14px;line-height:1.45;color:${C_BLACK};${sep}">${label}</td>
      <td style="padding:13px 32px 13px 0;background:${C_WHITE};vertical-align:top;text-align:right;white-space:nowrap;${sep}">${amt}</td>
    </tr>`;
  }).join("");
  const totalStr = `${quote.total.toLocaleString("fr-FR")} € HT`;
  return `${sectionBar("Devis", quote.reference)}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
    ${rows}
    <tr>
      <td style="padding:18px 32px;background:${C_BLACK};">
        <span style="${LABEL_STYLE}color:${C_WHITE};">Total</span>
      </td>
      <td style="padding:18px 32px 18px 0;background:${C_BLACK};text-align:right;white-space:nowrap;">
        <span style="font-family:${FONT_MONO};font-size:18px;font-weight:600;color:${C_ORANGE};letter-spacing:0.02em;">${totalStr}</span>
      </td>
    </tr>
  </table>`;
}

function calloutBlock(title: string, content: string): string {
  return `${sectionBar(title)}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <td style="padding:20px 32px;background:${C_WHITE};font-family:${FONT_SANS};font-size:14px;line-height:1.7;color:${C_BLACK};white-space:pre-wrap;${ROW_SEP}">${content}</td>
    </tr>
  </table>`;
}

function bookingRows(b: BookingData, sessions: BookingSession[], opts: { admin: boolean }): string {
  const rows: Array<[string, string]> = [];
  if (opts.admin) {
    rows.push(["Client", `<strong style="font-weight:600;">${escapeHtml(b.client_name)}</strong>`]);
    rows.push(["Email", `<a href="mailto:${escapeHtml(b.client_email)}" style="color:${C_BLACK};text-decoration:underline;">${escapeHtml(b.client_email)}</a>`]);
    if (b.client_phone) rows.push(["Téléphone", escapeHtml(b.client_phone)]);
    if (b.client_company) rows.push(["Société", escapeHtml(b.client_company)]);
    if (b.client_siren) rows.push(["SIREN", escapeHtml(b.client_siren)]);
  } else {
    rows.push(["Email", escapeHtml(b.client_email)]);
    if (b.client_phone) rows.push(["Téléphone", escapeHtml(b.client_phone)]);
    if (b.client_company) rows.push(["Société", escapeHtml(b.client_company)]);
  }
  const plateaux = sessions.map((s) => `${s.plateau_key} (${s.hours ?? "?"}h, ${s.slot_type})`).join(", ");
  if (plateaux) rows.push(["Plateau(x)", escapeHtml(plateaux)]);
  if (b.preferred_date) rows.push(["Date souhaitée", escapeHtml(dateFmt(b.preferred_date))]);
  if (b.arrival_hour != null) rows.push(["Heure d'arrivée", `${b.arrival_hour} h`]);
  if (b.project_type) rows.push(["Type de projet", escapeHtml(b.project_type)]);
  if (opts.admin && b.urgency) rows.push(["Urgence", escapeHtml(b.urgency)]);
  const totalStr = b.total_estimate != null ? `${b.total_estimate.toLocaleString("fr-FR")} € HT` : "Sur demande";
  rows.push(["Estimation", `<span style="font-family:${FONT_MONO};">${totalStr}</span>`]);
  if (opts.admin && b.notes) rows.push(["Notes", escapeHtml(b.notes)]);

  return dataGrid(rows);
}

export function renderBookingClient(
  b: BookingData,
  sessions: BookingSession[],
  quote: QuoteData | null,
): string {
  const greeting = `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:${C_BLACK};">Bonjour <strong style="font-weight:600;">${escapeHtml(b.client_name)}</strong>,</p>
    <p style="margin:0 0 4px;font-size:14px;line-height:1.65;color:${C_GRAY};">
      Votre demande de réservation est enregistrée. L'équipe vous recontactera sous <strong style="color:${C_BLACK};font-weight:600;">24 h ouvrées</strong> pour confirmer les disponibilités. Un fichier <strong style="color:${C_BLACK};font-weight:600;">.ics</strong> est joint pour ajouter l'événement à votre agenda.
    </p>`;

  const bodyTrailer = `<div style="padding:24px 32px 28px;background:${C_WHITE};font-family:${FONT_SANS};">
    <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${C_GRAY};">
      Pour toute question, répondez directement à cet e-mail ou écrivez-nous à
      <a href="mailto:${STUDIO_EMAIL}" style="color:${C_BLACK};text-decoration:underline;">${STUDIO_EMAIL}</a>.
    </p>
    <p style="margin:0;font-size:14px;color:${C_BLACK};">
      <span style="color:${C_GRAY};">Cordialement,</span><br>
      <strong style="font-weight:600;">L'équipe E-Do Studio</strong>
    </p>
  </div>`;

  const body = `${intro(greeting)}${bookingRows(b, sessions, { admin: false })}${quoteGrid(quote)}${bodyTrailer}`;
  return emailWrap("Confirmation de réservation", b.reference, body);
}

export function renderBookingAdmin(
  b: BookingData,
  sessions: BookingSession[],
  quote: QuoteData | null,
): string {
  const body = `${bookingRows(b, sessions, { admin: true })}${quoteGrid(quote)}`;
  return emailWrap("Nouvelle réservation", b.reference, body);
}

export function renderContactClient(nom: string, sujet: string): string {
  const body = `${intro(
    `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:${C_BLACK};">Bonjour <strong style="font-weight:600;">${escapeHtml(nom)}</strong>,</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:${C_GRAY};">
      Nous avons bien reçu votre message concernant <strong style="color:${C_BLACK};font-weight:600;">${escapeHtml(sujet)}</strong>. L'équipe vous répondra sous <strong style="color:${C_BLACK};font-weight:600;">48 h ouvrées</strong>.
    </p>`,
  )}<div style="padding:24px 32px 28px;background:${C_WHITE};font-family:${FONT_SANS};">
    <p style="margin:0;font-size:14px;color:${C_BLACK};">
      <span style="color:${C_GRAY};">Cordialement,</span><br>
      <strong style="font-weight:600;">L'équipe E-Do Studio</strong>
    </p>
  </div>`;
  return emailWrap("Message reçu", null, body);
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

  const rows: Array<[string, string]> = [
    ["Nom", `<strong style="font-weight:600;">${safeNom}</strong>`],
    ["Email", `<a href="mailto:${safeEmail}" style="color:${C_BLACK};text-decoration:underline;">${safeEmail}</a>`],
  ];
  if (telephone) rows.push(["Téléphone", safeTel]);
  if (societe) rows.push(["Société", safeSociete]);
  rows.push(["Sujet", safeSujet]);

  const body = `${dataGrid(rows)}${calloutBlock("Message", safeMsg)}`;
  return emailWrap("Contact", null, body);
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

function statusChangeRows(
  b: BookingData,
  sessions: BookingSession[],
  newDate: string | null,
  admin: boolean,
): string {
  const rows: Array<[string, string]> = [];
  if (admin) {
    rows.push(["Client", `<strong style="font-weight:600;">${escapeHtml(b.client_name)}</strong>`]);
    rows.push(["Email", `<a href="mailto:${escapeHtml(b.client_email)}" style="color:${C_BLACK};text-decoration:underline;">${escapeHtml(b.client_email)}</a>`]);
    if (b.client_phone) rows.push(["Téléphone", escapeHtml(b.client_phone)]);
    if (b.client_company) rows.push(["Société", escapeHtml(b.client_company)]);
  } else {
    if (b.client_company) rows.push(["Société", escapeHtml(b.client_company)]);
  }
  const plateaux = sessions.map((s) => `${s.plateau_key} (${s.hours ?? "?"}h, ${s.slot_type})`).join(", ");
  if (plateaux) rows.push(["Plateau(x)", escapeHtml(plateaux)]);
  if (b.preferred_date) rows.push(["Date initiale", escapeHtml(dateFmt(b.preferred_date))]);
  if (newDate) rows.push(["Nouvelle date", `<strong style="font-weight:600;color:${C_ORANGE};">${escapeHtml(dateFmt(newDate))}</strong>`]);
  const totalStr = b.total_estimate != null ? `${b.total_estimate.toLocaleString("fr-FR")} € HT` : "Sur demande";
  rows.push(["Estimation", `<span style="font-family:${FONT_MONO};">${totalStr}</span>`]);

  return dataGrid(rows);
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
  const greeting = intro(
    `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:${C_BLACK};">Bonjour <strong style="font-weight:600;">${escapeHtml(b.client_name)}</strong>,</p>
    <p style="margin:0;font-size:14px;line-height:1.65;color:${C_GRAY};">${escapeHtml(labels.intro)}</p>`,
  );
  const messageBlock = adminMessage
    ? calloutBlock("Message de l'équipe", escapeHtml(adminMessage))
    : "";
  const trailer = `<div style="padding:24px 32px 28px;background:${C_WHITE};font-family:${FONT_SANS};">
    <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${C_GRAY};">
      Pour toute question, répondez directement à cet e-mail ou contactez-nous à
      <a href="mailto:${STUDIO_EMAIL}" style="color:${C_BLACK};text-decoration:underline;">${STUDIO_EMAIL}</a>.
    </p>
    <p style="margin:0;font-size:14px;color:${C_BLACK};">
      <span style="color:${C_GRAY};">Cordialement,</span><br>
      <strong style="font-weight:600;">L'équipe E-Do Studio</strong>
    </p>
  </div>`;

  const body = `${greeting}${statusChangeRows(b, sessions, newDate, false)}${quoteGrid(quote)}${messageBlock}${trailer}`;
  return emailWrap(labels.title, b.reference, body);
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

  const rows: Array<[string, string]> = [];
  rows.push(["Client", `<strong style="font-weight:600;">${escapeHtml(b.client_name)}</strong>`]);
  rows.push(["Email", `<a href="mailto:${escapeHtml(b.client_email)}" style="color:${C_BLACK};text-decoration:underline;">${escapeHtml(b.client_email)}</a>`]);
  if (b.client_phone) rows.push(["Téléphone", escapeHtml(b.client_phone)]);
  if (b.client_company) rows.push(["Société", escapeHtml(b.client_company)]);
  if (b.client_siren) rows.push(["SIREN", escapeHtml(b.client_siren)]);
  const plateaux = sessions.map((s) => `${s.plateau_key} (${s.hours ?? "?"}h, ${s.slot_type})`).join(", ");
  if (plateaux) rows.push(["Plateau(x)", escapeHtml(plateaux)]);
  rows.push(["Motif", `<strong style="font-weight:600;color:${C_ORANGE};">${escapeHtml(labels.title)}</strong>`]);
  if (b.preferred_date) rows.push(["Date initiale", escapeHtml(dateFmt(b.preferred_date))]);
  if (newDate) rows.push(["Nouvelle date", `<strong style="font-weight:600;color:${C_ORANGE};">${escapeHtml(dateFmt(newDate))}</strong>`]);
  if (b.project_type) rows.push(["Type de projet", escapeHtml(b.project_type)]);
  const totalStr = b.total_estimate != null ? `${b.total_estimate.toLocaleString("fr-FR")} € HT` : "Sur demande";
  rows.push(["Estimation", `<span style="font-family:${FONT_MONO};">${totalStr}</span>`]);
  if (adminMessage) rows.push(["Message envoyé", escapeHtml(adminMessage)]);

  const body = `${dataGrid(rows)}${quoteGrid(quote)}`;
  return emailWrap(labels.title, b.reference, body);
}
