// Création de réservation, côté serveur.
//
// Le front écrivait directement dans `bookings` avec la clé anon, en envoyant
// le total qu'il avait lui-même calculé. Deux conséquences :
//
//   - le prix était déclaratif : la contrainte d'insertion valait
//     `WITH CHECK (true)`, donc n'importe quel total passait ;
//   - `.insert().select()` de PostgREST exige une policy SELECT, d'où un
//     `FOR SELECT TO anon USING (true)` sur des lignes portant email,
//     téléphone, SIREN et adresse de facturation.
//
// Cette fonction reprend les deux : elle recalcule le devis avec le moteur
// partagé (`src/lib/booking-engine.ts`, importé aussi par la fonction chat) et
// écrit avec le rôle de service. Le front ne reçoit plus que la référence et de
// quoi afficher la confirmation — jamais la ligne complète.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import {
  computePriceBreakdown,
  type CreateBookingInput,
  type QuoteLabels,
  type SlotState,
} from "../../../src/lib/booking-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Le moteur est sans i18n : les libellés lui sont injectés. Ceux-ci ne servent
// qu'aux lignes persistées du devis, la confirmation affichée étant rendue par
// le front avec ses propres traductions.
const LABELS: QuoteLabels = {
  cyclo5h: "Cyclorama · 5h",
  cyclo10h: "Cyclorama · 10h",
  cyclo10hEditorial: "Cyclorama · 10h éditorial",
  cycloPaint: "Peinture fraîche du cyclo",
  electricity: "Électricité additionnelle",
  studioVisit: "Visite du studio",
  halfDay: "Demi-journée",
  proRataDay: "au prorata",
  postProduction: "Post-production",
  images: "images",
  videoEditing: "Montage vidéo",
  onRequest: "Sur demande",
};

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReference(mode: string): string {
  const prefix = mode === "quote" ? "EDO-Q-" : mode === "booking" ? "EDO-R-" : "EDO-";
  let code = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += REF_CHARS[b % REF_CHARS.length];
  return prefix + code;
}

const dateToIso = (d: { y: number; m: number; d: number }) =>
  `${d.y}-${String(d.m + 1).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;

// Reconstruit l'entrée du moteur à partir des sessions reçues. C'est cette
// projection — et non le total transmis — qui détermine le prix écrit en base.
function recomputeTotal(input: CreateBookingInput) {
  const slots: Record<string, SlotState> = {};
  const slotIds: string[] = [];
  input.sessions.forEach((s, i) => {
    const id = `${s.plateauKey}#${i}`;
    slotIds.push(id);
    slots[id] = {
      plateauKey: s.plateauKey,
      slotType: s.slotType,
      hours: s.hours,
      cycloMode: s.cycloMode,
      // Les extras ne transitent pas par le tunnel aujourd'hui ; les forcer à
      // leur valeur neutre évite qu'un client les injecte.
      paint: false,
      kwh: 0,
      team: {},
      postprod: { enabled: s.postprodEnabled, video: s.postprodVideo },
      date: s.date,
      arrivalHour: s.arrivalHour ?? undefined,
    };
  });
  return computePriceBreakdown({
    plateau: input.sessions[0]?.plateauKey ?? null,
    slotIds,
    slots,
    lang: "fr",
    labels: LABELS,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let input: CreateBookingInput;
  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!input?.contact?.email || !Array.isArray(input.sessions)) {
    return json({ error: "invalid_payload" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const reference = generateReference(input.mode);
  const quoteRef = input.mode === "booking" ? generateReference("quote") : reference;

  const fallbackDate = input.preferredDate ? dateToIso(input.preferredDate) : null;
  const resolved = input.sessions.map((s) => ({
    session: s,
    date: s.date ? dateToIso(s.date) : fallbackDate,
    arrivalHour: s.arrivalHour ?? input.arrivalHour,
  }));

  // Le devis fait foi côté serveur. Un écart avec le total transmis est
  // journalisé : c'est soit une dérive du front, soit une tentative.
  const breakdown = recomputeTotal(input);
  const clientTotal = Number(input.quote?.total ?? 0);
  if (Math.abs(breakdown.total - clientTotal) > 0.01) {
    console.warn(
      `[create-booking] total divergent — client=${clientTotal} serveur=${breakdown.total} ref=${reference}`,
    );
  }

  const primary = resolved[0];
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      reference,
      status: input.mode === "booking" ? "pending" : "draft",
      client_name: [input.contact.prenom, input.contact.nom].filter(Boolean).join(" "),
      client_first_name: input.contact.prenom || null,
      client_last_name: input.contact.nom || null,
      client_email: input.contact.email,
      client_company: input.contact.societe || null,
      client_brand: input.contact.marque || null,
      client_billing_address: input.contact.adresseFacturation || null,
      client_siren: input.contact.siren || null,
      client_phone: input.contact.tel || null,
      project_type: input.projectType,
      urgency: input.urgency,
      total_estimate: breakdown.total,
      notes: input.contact.autresInfos || null,
      preferred_date: primary?.date ?? fallbackDate,
      arrival_hour: primary?.arrivalHour ?? input.arrivalHour,
    })
    .select("id, reference")
    .single();

  if (bookingError || !booking) {
    // 23P01 = violation d'une contrainte d'exclusion : le créneau vient d'être
    // pris. C'est la garantie que le SELECT-puis-INSERT du front ne donnait pas.
    if (bookingError?.code === "23P01") return json({ error: "slot_taken" }, 409);
    console.error("[create-booking] insert booking", bookingError);
    return json({ error: "insert_failed" }, 500);
  }

  if (resolved.length > 0) {
    const { error } = await supabase.from("booking_sessions").insert(
      resolved.map(({ session: s, date, arrivalHour }) => ({
        booking_id: booking.id,
        plateau_key: s.plateauKey,
        slot_type: s.slotType ?? "hour",
        hours: s.hours,
        session_date: date,
        arrival_hour: arrivalHour,
        cyclo_mode: s.cycloMode,
        product_type: s.productType,
        method: s.method,
        submethod: s.submethod,
        media: s.media,
        views: s.views,
        views_count: s.viewsCount,
        quantity: s.quantity,
        postprod_enabled: s.postprodEnabled,
        postprod_video: s.postprodVideo,
      })),
    );
    if (error) {
      if (error.code === "23P01") {
        // La réservation est créée mais son créneau est pris : on la retire
        // plutôt que de laisser une ligne orpheline sans session.
        await supabase.from("bookings").delete().eq("id", booking.id);
        return json({ error: "slot_taken" }, 409);
      }
      console.error("[create-booking] insert sessions", error);
      return json({ error: "insert_failed" }, 500);
    }
  }

  const { error: quoteError } = await supabase.from("booking_quotes").insert({
    booking_id: booking.id,
    reference: quoteRef,
    rows: breakdown.rows,
    total: breakdown.total,
  });
  if (quoteError) {
    console.error("[create-booking] insert quote", quoteError);
    return json({ error: "insert_failed" }, 500);
  }

  const base = Deno.env.get("SUPABASE_URL") ?? "";
  const fire = (fn: string, body: unknown) =>
    fetch(`${base}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch((e) => console.error(`[create-booking] ${fn}`, e));

  // Best-effort, comme avant : le cron de réconciliation rattrape les échecs.
  fire("calendar-sync", { bookingId: booking.id, action: "create" });
  fire("send-email", { type: "booking", bookingId: booking.id });

  // Uniquement ce dont la page de confirmation a besoin. Aucune donnée
  // personnelle ne repart : le front les possède déjà, il vient de les saisir.
  return json({ reference, total: breakdown.total });
});
