// Natural-language booking tool for the chat edge function. Mirrors availability.ts:
// pure-ish glue around the shared booking engine. It NEVER writes to the database
// — it computes the authoritative recommendation + price (same numbers as the
// configurator) and, when everything required is present, assembles a
// `bookingProposal` (= CreateBookingInput). The actual write happens client-side
// via the existing createBooking(), behind an explicit user confirmation.

import { z } from "https://esm.sh/zod@4.4.3";
import {
  type BookingSession,
  type CreateBookingInput,
  type DateSelection,
  type Lang,
  type PlanSessionInput,
  type QuoteLabels,
  BOOK_PLATEAUX,
  buildSessionsData,
  computePriceBreakdown,
  isSessionValid,
  isValidSiren,
  planFromSessions,
  recommendSession,
} from "../../../src/lib/booking-engine.ts";

// FR/EN copies of the quote labels (the engine is i18n-free; we thread them in).
// Kept in sync with src/i18n/messages.ts (booking.*).
const QUOTE_LABELS: Record<Lang, QuoteLabels> = {
  fr: {
    cyclo5h: "½ journée (5h)",
    cyclo10h: "Journée (10h)",
    cyclo10hEditorial: "10h éditorial",
    cycloPaint: "Peinture cyclo",
    electricity: "Électricité",
    studioVisit: "Visite du studio",
    halfDay: "Demi-journée",
    proRataDay: "(prorata jour/8)",
    postProduction: "Post-production",
    images: "images",
    videoEditing: "Monté vidéo",
    onRequest: "Sur demande",
  },
  en: {
    cyclo5h: "Half day (5h)",
    cyclo10h: "Full day (10h)",
    cyclo10hEditorial: "10h editorial",
    cycloPaint: "Cyclo paint",
    electricity: "Electricity",
    studioVisit: "Studio visit",
    halfDay: "Half day",
    proRataDay: "(pro-rata day/8)",
    postProduction: "Post-production",
    images: "images",
    videoEditing: "Video editing",
    onRequest: "On request",
  },
};

const PRODUCT_KEYS = ["pap", "accessoires", "eyewear", "food", "cosmetique", "bijoux", "cyclorama"] as const;

const sessionSchema = z.object({
  product: z.enum(PRODUCT_KEYS),
  method: z.enum(["packshot", "onmodel"]).optional(),
  submethod: z.string().max(40).optional(),
  views: z.array(z.string().max(20)).max(8).optional(),
  viewsCount: z.number().int().min(1).max(50).optional(),
  quantity: z.number().int().min(1).max(100000),
  media: z.array(z.string().max(20)).max(8).optional(),
  postprod: z.boolean().optional(),
  postprodVideo: z.boolean().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  arrivalHour: z.number().int().min(9).max(19).optional(),
});

const contactSchema = z.object({
  prenom: z.string().max(120).optional(),
  nom: z.string().max(120).optional(),
  email: z.string().max(200).optional(),
  tel: z.string().max(40).optional(),
  societe: z.string().max(200).optional(),
  siren: z.string().max(40).optional(),
  marque: z.string().max(200).optional(),
  adresseFacturation: z.string().max(400).optional(),
  autresInfos: z.string().max(1000).optional(),
});

const prepareArgsSchema = z.object({
  sessions: z.array(sessionSchema).min(1).max(6),
  contact: contactSchema.optional(),
});

type SessionInput = z.infer<typeof sessionSchema>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toBookingSession(si: SessionInput): BookingSession {
  const isCyclo = si.product === "cyclorama";
  return {
    projectType: isCyclo ? "cyclorama" : "ecom",
    product: isCyclo ? null : si.product,
    method: si.method ?? null,
    submethod: si.submethod ?? null,
    // On-model / accessory / object sessions require a media; default to photo
    // (the e-commerce default) when the visitor didn't specify, so the booking
    // becomes valid without an extra question. The LLM can pass ["video"] or
    // ["photo","video"] when the visitor mentions video.
    media: si.media && si.media.length ? si.media : ["photo"],
    views: si.views ?? [],
    viewsCount: si.viewsCount != null ? String(si.viewsCount) : "",
    quantity: String(si.quantity),
    postprod: !!si.postprod,
    postprodVideo: !!si.postprodVideo,
  };
}

function parseDate(iso: string | undefined): DateSelection | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

export interface PrepareBookingResult {
  text: string;
  ready: boolean;
  proposal: CreateBookingInput | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prepareBooking(rawArgs: Record<string, any>, lang: Lang): PrepareBookingResult {
  const parsed = prepareArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return {
      ready: false,
      proposal: null,
      text: lang === "fr"
        ? "Paramètres invalides : fournis au moins une session avec product et quantity."
        : "Invalid parameters: provide at least one session with product and quantity.",
    };
  }

  const { sessions: sessionInputs, contact } = parsed.data;
  const bookingSessions = sessionInputs.map(toBookingSession);
  const missing: string[] = [];

  // Per-session validity + scheduling completeness.
  sessionInputs.forEach((si, i) => {
    const n = i + 1;
    if (!isSessionValid(bookingSessions[i])) {
      missing.push(lang === "fr"
        ? `session ${n} : détails produit incomplets (méthode / vues / quantité)`
        : `session ${n}: incomplete product details (method / views / quantity)`);
    }
    if (!si.date) missing.push(lang === "fr" ? `session ${n} : date` : `session ${n}: date`);
    if (si.arrivalHour == null) missing.push(lang === "fr" ? `session ${n} : heure d'arrivée` : `session ${n}: arrival hour`);
  });

  // Contact completeness (mirrors the form's required fields).
  const c = contact ?? {};
  if (!c.prenom) missing.push(lang === "fr" ? "prénom" : "first name");
  if (!c.nom) missing.push(lang === "fr" ? "nom" : "last name");
  if (!c.email || !EMAIL_RE.test(c.email)) missing.push(lang === "fr" ? "email valide" : "valid email");
  if (!c.tel) missing.push(lang === "fr" ? "téléphone" : "phone");
  // SIREN is optional (individuals may not have one), but if provided it must be
  // a valid 9-digit SIREN / 14-digit SIRET (Luhn).
  if (c.siren && !isValidSiren(c.siren)) {
    missing.push(lang === "fr"
      ? "SIREN valide (9 chiffres) ou laisse-le vide"
      : "valid SIREN (9 digits) or leave it empty");
  }

  // Price what we have so far (sessions that are valid enough to plan/price).
  const planInputs: PlanSessionInput[] = sessionInputs.map((si, i) => ({
    session: bookingSessions[i],
    date: parseDate(si.date),
    arrivalHour: si.arrivalHour ?? null,
  }));
  const global = { projectType: bookingSessions[0]?.projectType ?? "ecom", urgency: "flex", postprod: false };
  const plan = planFromSessions(planInputs, global);
  const labels = QUOTE_LABELS[lang];
  const breakdown = computePriceBreakdown({
    plateau: plan.plateau,
    slotIds: plan.slotIds,
    slots: plan.slots,
    lang,
    labels,
  });

  const lines = breakdown.rows
    .map((r) => `- ${r.lbl}: ${r.onReq ? labels.onRequest : `${r.amt} €`}`)
    .join("\n");
  const ttc = Math.round(breakdown.total * 1.2);
  const recoLines = plan.slotIds
    .map((id, i) => {
      const st = plan.slots[id];
      const px = BOOK_PLATEAUX.find((p) => p.k === st.plateauKey);
      const rec = recommendSession(bookingSessions[i], global);
      const r = rec.reasoning?.[0]?.[lang] ?? "";
      return `${lang === "fr" ? "Session" : "Session"} ${i + 1}: ${px ? px[lang] : st.plateauKey} · ${st.hours}h — ${r}`;
    })
    .join("\n");

  const quoteText = [
    lang === "fr" ? "DEVIS FAISANT FOI (utilise ces montants exacts, ne les modifie jamais) :" : "AUTHORITATIVE QUOTE (use these exact figures, never alter them):",
    recoLines,
    lines,
    `${lang === "fr" ? "TOTAL" : "TOTAL"}: ${breakdown.total} € HT (${ttc} € TTC).`,
  ].filter(Boolean).join("\n");

  if (missing.length > 0) {
    const miss = [...new Set(missing)].join(", ");
    return {
      ready: false,
      proposal: null,
      text: `${quoteText}\n\n${lang === "fr"
        ? `STATUT : PAS PRÊT. Manque avant de réserver : ${miss}.\n→ Demande ces éléments à l'utilisateur. N'affirme jamais que la réservation est faite.`
        : `STATUS: NOT READY. Missing before booking: ${miss}.\n→ Ask the user for these. Never claim the booking is made.`}`,
    };
  }

  // Everything is present — assemble the proposal (NOT a write).
  const sessionsData = buildSessionsData({
    slotIds: plan.slotIds,
    plateau: plan.plateau,
    slots: plan.slots,
    configApplied: true,
    configSessions: bookingSessions,
    fallbackQuantity: 0,
    selected: planInputs[0]?.date ?? null,
    arrivalHour: planInputs[0]?.arrivalHour ?? null,
  });

  const proposal: CreateBookingInput = {
    mode: "booking",
    contact: {
      nom: c.nom ?? "",
      prenom: c.prenom ?? "",
      email: c.email ?? "",
      tel: c.tel ?? "",
      societe: c.societe ?? "",
      siren: c.siren ? c.siren.replace(/[\s.]/g, "") : "",
      adresseFacturation: c.adresseFacturation ?? "",
      marque: c.marque ?? "",
      autresInfos: c.autresInfos ?? "",
    },
    projectType: bookingSessions[0]?.projectType ?? "ecom",
    urgency: null,
    sessions: sessionsData,
    quote: {
      rows: breakdown.rows.map((r) => ({ lbl: r.lbl, amt: r.amt, onReq: r.onReq, estimate: r.estimate })),
      total: breakdown.total,
    },
    preferredDate: planInputs[0]?.date ?? null,
    arrivalHour: planInputs[0]?.arrivalHour ?? null,
  };

  return {
    ready: true,
    proposal,
    text: `${quoteText}\n\n${lang === "fr"
      ? "STATUT : PRÊT. Une carte récapitulative avec la case CGV et un bouton « Confirmer la réservation » est maintenant affichée à l'utilisateur. Invite-le à vérifier le récap et à cliquer pour finaliser — n'affirme jamais que c'est déjà réservé : seul son clic crée la réservation (envoi d'emails, blocage du créneau)."
      : "STATUS: READY. A recap card with the CGV checkbox and a \"Confirm booking\" button is now shown to the user. Invite them to review and click to finalize — never claim it is already booked: only their click creates the reservation (sends emails, holds the slot)."}`,
  };
}

export const PREPARE_BOOKING_TOOL = {
  name: "prepare_booking",
  description:
    "Quote a booking AND start a real reservation, entirely from natural language. Pass every product session the user described and, once known, each session's date + arrival hour and the contact details. Returns the AUTHORITATIVE price (never compute prices yourself) and what is still missing. Call it whenever the user asks for a price or wants to book, and re-call it as you collect more details. It never writes anything; when all info is present the user gets a confirmation card to finalize.",
  parameters: {
    type: "object",
    properties: {
      sessions: {
        type: "array",
        description: "One entry per shoot session (a project can have several plateaux).",
        items: {
          type: "object",
          properties: {
            product: { type: "string", enum: PRODUCT_KEYS as unknown as string[], description: "Product family. 'pap' = ready-to-wear, 'accessoires', 'eyewear', 'food', 'cosmetique', 'bijoux', or 'cyclorama' for free/cyclo production." },
            method: { type: "string", enum: ["packshot", "onmodel"], description: "For 'pap': packshot (still) or onmodel (worn)." },
            submethod: { type: "string", description: "Packshot type: 'pique' (flat-lay sharp), 'ghost' (ghost mannequin), 'flat' (lay-flat). For accessoires: 'chaussure', 'maroquinerie', 'textile'." },
            views: { type: "array", items: { type: "string" }, description: "Packshot views, any of: face, dos, detail, 3/4." },
            viewsCount: { type: "integer", description: "Views per product when not packshot (on-model, accessoires, etc.)." },
            quantity: { type: "integer", description: "Number of products/SKUs for this session." },
            media: { type: "array", items: { type: "string" }, description: "Media for on-model / accessoires sessions." },
            postprod: { type: "boolean", description: "True if the client wants E-DO post-production." },
            postprodVideo: { type: "boolean", description: "True if video editing is wanted." },
            date: { type: "string", description: "Session date, YYYY-MM-DD. Resolve relative dates before calling." },
            arrivalHour: { type: "integer", minimum: 9, maximum: 19, description: "Arrival hour, 24h (studio open 9–19)." },
          },
          required: ["product", "quantity"],
        },
      },
      contact: {
        type: "object",
        description: "Client contact. firstName/lastName/email/phone are required to finalize.",
        properties: {
          prenom: { type: "string", description: "First name." },
          nom: { type: "string", description: "Last name." },
          email: { type: "string", description: "Email." },
          tel: { type: "string", description: "Phone." },
          societe: { type: "string", description: "Company (optional)." },
          siren: { type: "string", description: "SIREN (optional)." },
          marque: { type: "string", description: "Brand (optional)." },
          adresseFacturation: { type: "string", description: "Billing address (optional)." },
          autresInfos: { type: "string", description: "Any extra note (optional)." },
        },
      },
    },
    required: ["sessions"],
  },
};

export const PREPARE_BOOKING_TOOL_OPENAI = {
  type: "function" as const,
  function: {
    name: PREPARE_BOOKING_TOOL.name,
    description: PREPARE_BOOKING_TOOL.description,
    parameters: PREPARE_BOOKING_TOOL.parameters,
  },
};
