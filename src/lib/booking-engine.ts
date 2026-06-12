// Booking domain engine — the single source of truth for the configurator's
// recommendation + pricing logic. Framework-agnostic and dependency-free so it
// can be imported by both the React front (book-page.tsx) and the Deno chat
// edge function (supabase/functions/chat). Keep it PURE: no React, no Supabase
// client, no i18n import — display labels are threaded in via QuoteLabels.

export type Lang = 'fr' | 'en';
export type BilingualText = Record<Lang, string>;

export interface BookRates {
  hour?: number | null;
  half?: number;
  full?: number;
  halfH?: number;
  fullH?: number;
  editorial?: number;
  [key: string]: number | null | undefined;
}

export interface BookPlateau {
  k: string;
  fr: string;
  en: string;
  desc: BilingualText;
  rates: BookRates;
  hdUnit: string;
  fdUnit: string;
  isCyclo?: boolean;
  isVisite?: boolean;
}

export interface BookingSession {
  projectType: string | null;
  product: string | null;
  method: string | null;
  submethod: string | null;
  media: string[];
  views: string[];
  viewsCount: string;
  quantity: string;
  postprod: boolean;
  postprodVideo: boolean;
}

export interface ConfigGlobal {
  projectType: string;
  urgency: string;
  postprod: boolean;
}

export interface DateSelection {
  y: number;
  m: number;
  d: number;
}

export type TeamState = Record<string, number | boolean>;

export interface QuoteBreakdown {
  view?: string;
  qty?: number;
  imagesPerSku?: number;
  unit: number;
  subtotal: number;
  labels?: BilingualText;
}

export interface PostprodState {
  enabled?: boolean;
  video?: boolean;
  amount?: number;
  images?: number;
  breakdown?: QuoteBreakdown[];
  perView?: boolean;
}

export interface SlotState {
  plateauKey?: string;
  slotType?: string | null;
  hours?: number;
  cycloMode?: string | null;
  paint?: boolean;
  kwh?: number;
  team?: TeamState;
  postprod?: PostprodState;
  date?: DateSelection | null;
  arrivalHour?: number;
  configSessionIdx?: number;
}

export interface QuoteRow {
  lbl: string;
  amt: number;
  onReq?: boolean;
  estimate?: boolean;
  breakdown?: QuoteBreakdown[];
  perView?: boolean;
}

export interface QuoteGroup {
  plateauKey: string;
  plateauName: string;
  rows: QuoteRow[];
  subtotal: number;
}

export interface PriceBreakdown {
  rows: QuoteRow[];
  groups: QuoteGroup[];
  sharedRows: QuoteRow[];
  sharedSubtotal: number;
  total: number;
  isPreview?: boolean;
}

export interface CfgEntry {
  plateau: string;
  imageRate?: number;
  views?: string[];
  rates?: Record<string, number>;
  rate?: number;
  onRequest?: boolean;
}

export interface Recommendation {
  plateau: string;
  slotType: string | null;
  hours: number;
  cycloMode: string | null;
  reasoning: BilingualText[];
  rentalHours?: number;
  totalVisuals?: number;
  totalDays?: number;
  cadence?: number;
  estimatedHours?: number;
  onRequest?: boolean;
}

export interface TeamMember {
  k: string;
  fr: string;
  en: string;
  price: number;
  unit: 'hour' | 'day';
  forMethods?: string[];
}

// Persisted booking shapes — defined here (pure) so bookings.ts and the chat
// edge function share them without pulling in the Supabase client.
export interface BookingSessionData {
  plateauKey: string;
  slotType: string | null;
  hours: number;
  date: { y: number; m: number; d: number } | null;
  arrivalHour: number | null;
  cycloMode: string | null;
  productType: string | null;
  method: string | null;
  submethod: string | null;
  media: string[];
  views: string[];
  viewsCount: number;
  quantity: number;
  postprodEnabled: boolean;
  postprodVideo: boolean;
}

export interface BookingQuoteData {
  rows: { lbl: string; amt: number; onReq?: boolean; estimate?: boolean }[];
  total: number;
}

export interface CreateBookingInput {
  mode: 'quote' | 'booking' | 'request';
  contact: {
    nom: string;
    prenom: string;
    email: string;
    tel: string;
    societe: string;
    siren: string;
    adresseFacturation: string;
    marque: string;
    autresInfos: string;
  };
  projectType: string | null;
  urgency: string | null;
  sessions: BookingSessionData[];
  quote: BookingQuoteData;
  preferredDate: { y: number; m: number; d: number } | null;
  arrivalHour: number | null;
}

export const BOOK_PLATEAUX: BookPlateau[] = [
  {k:'live', fr:'Live', en:'Live', desc:{fr:'Shooting porté',en:'On-model shooting'},
    rates:{hour:185, half:620, full:1120}, hdUnit:'half', fdUnit:'full'},
  {k:'eclipse', fr:'Eclipse', en:'Eclipse', desc:{fr:'Chaussures & accessoires',en:'Shoes & accessories'},
    rates:{hour:160, half:560, full:990}, hdUnit:'half', fdUnit:'full'},
  {k:'horizontal', fr:'Horizontal', en:'Horizontal', desc:{fr:'Packshots à plat',en:'Flat packshots'},
    rates:{hour:120, half:410, full:740}, hdUnit:'half', fdUnit:'full'},
  {k:'vertical', fr:'Vertical', en:'Vertical', desc:{fr:'Mannequin ghost',en:'Ghost mannequin'},
    rates:{hour:120, half:410, full:740}, hdUnit:'half', fdUnit:'full'},
  {k:'cyclorama', fr:'Cyclorama', en:'Cyclorama', desc:{fr:'Cyclo blanc 30 m²',en:'White cyclo 30 m²'},
    rates:{hour:null, halfH:650, fullH:880, editorial:660}, hdUnit:'halfH', fdUnit:'fullH',
    isCyclo:true},
  {k:'visite', fr:'Visite', en:'Visit', desc:{fr:'',en:''},
    rates:{hour:0, half:0, full:0}, hdUnit:'half', fdUnit:'full', isVisite:true},
];

export const CYCLO_EXTRAS = { paint: 110, kwh: 1.4 };

export const fmtEUR = (n: unknown): string => {
  if (n == null || Number.isNaN(Number(n))) return '0';
  const num = Number(n);
  const truncated = Math.trunc(num * 100) / 100;
  const hasDecimals = truncated !== Math.trunc(truncated);
  return truncated.toLocaleString('fr-FR', {
    minimumFractionDigits: hasDecimals ? (truncated * 10 !== Math.trunc(truncated * 10) ? 2 : 1) : 0,
    maximumFractionDigits: 2,
  });
};

export const EQUIPE: TeamMember[] = [
  {k:'styliste_op', fr:'Styliste', en:'Stylist', price:67.5, unit:'hour', forMethods:['packshot']},
  {k:'operateur', fr:'Opérateur machine', en:'Machine operator', price:67.5, unit:'hour', forMethods:['onmodel','other']},
  {k:'plateau', fr:'Assistant plateau', en:'Stage assistant', price:200, unit:'day'},
  {k:'setdesign', fr:'Assistant set design',en:'Set design assistant',price:500,unit:'day'},
  {k:'styliste', fr:'Assistant styliste', en:'Styling assistant', price:250, unit:'day'},
  {k:'prod', fr:'Assistant production',en:'Production assistant',price:350,unit:'day'},
];

export const PP_UNIT: Record<string, Record<string, number>> = {
  'pap.onmodel': { all: 7.90 },
  'pap.packshot.pique': { all: 7.90 },
  'pap.packshot.ghost': { face: 7.90, '3/4': 7.90, dos: 5.40, detail: 4.40 },
  'pap.packshot.flat': { all: 5.40 },
  'access.chaussure': { all: 5.40 },
  'access.maroquinerie': { all: 5.40 },
  'access.textile': { all: 5.40 },
  'eyewear': { all: 11.50 },
  'food': { all: 5.40 },
  'cosmetique': { all: 5.40 },
  'bijoux': { all: 16.50 },
};

export const CFG_MATRIX: Record<string, CfgEntry> = {
  'pap.packshot.pique': { plateau: 'vertical', imageRate: 50, views: ['face', 'dos', 'detail'] },
  'pap.packshot.ghost': { plateau: 'vertical', rates: { face: 75, dos: 75, 'face+dos': 70, '3/4': 70, 'face+3/4': 70, 'face+dos+3/4': 70 }, views: ['face', 'dos', 'detail', '3/4'] },
  'pap.packshot.flat': { plateau: 'horizontal', rates: { face: 70, dos: 70, 'face+dos': 60 }, views: ['face', 'dos', 'detail'] },
  'pap.onmodel': { plateau: 'live', rate: 70 },
  'access.chaussure': { plateau: 'eclipse', rate: 60 },
  'access.maroquinerie': { plateau: 'eclipse', rate: 60 },
  'access.textile': { plateau: 'eclipse', rate: 80 },
  'eyewear': { plateau: 'eclipse', rate: 50 },
  'food': { plateau: 'eclipse', rate: 50 },
  'cosmetique': { plateau: 'eclipse', rate: 50 },
  'bijoux': { plateau: 'eclipse', rate: 60 },
  'cyclorama': { plateau: 'cyclorama', onRequest: true },
};

export const slotIdFor = (plateauKey: string, sessionIdx: number) => `${plateauKey}#${sessionIdx}`;

export const cfgMatrixKey = (s: BookingSession): string => {
  if (s.projectType === 'cyclorama') return 'cyclorama';
  if (s.product === 'pap') { if (s.method === 'onmodel') return 'pap.onmodel'; return `pap.packshot.${s.submethod || 'pique'}`; }
  if (s.product === 'accessoires') return `access.${s.submethod || 'chaussure'}`;
  return s.product ?? '';
};

export const packshotRate = (entry: CfgEntry, views: string[]) => {
  const packshotViews = (views || []).filter(v => v !== 'detail');
  if (entry.imageRate) { const nbViews = Math.max(1, packshotViews.length); return Math.max(1, Math.round(entry.imageRate / nbViews)); }
  const key = packshotViews.sort().join('+') || 'face';
  return entry.rates?.[key] || entry.rates?.face || 50;
};

export const computePostprodPrice = (session: BookingSession) => {
  const cfgKey = cfgMatrixKey(session);
  const table = PP_UNIT[cfgKey];
  if (!table) return null;
  const qty = Number(session.quantity) || 0;
  if (qty <= 0) return null;
  const VIEW_LABELS: Record<string, BilingualText> = { face: {fr:'Face',en:'Front'}, dos: {fr:'Dos',en:'Back'}, '3/4': {fr:'3/4',en:'3/4'}, detail: {fr:'Détail',en:'Detail'} };
  if (cfgKey === 'pap.packshot.ghost') {
    const selected = (session.views || []).filter(v => table[v] != null);
    if (!selected.length) return null;
    const breakdown = selected.map(v => ({ view: v, qty, unit: table[v], subtotal: +(qty * table[v]).toFixed(2), labels: VIEW_LABELS[v] }));
    const amount = +breakdown.reduce((s, b) => s + b.subtotal, 0).toFixed(2);
    const images = selected.length * qty;
    return { amount, images, breakdown, perView: true };
  }
  const unit = table.all ?? 0;
  let imagesPerSku = 1;
  if (session.product === 'pap' && session.method === 'packshot') { imagesPerSku = Math.max(1, (session.views || []).length); }
  else { imagesPerSku = Math.max(1, Number(session.viewsCount) || 1); }
  const images = imagesPerSku * qty;
  const amount = +(unit * images).toFixed(2);
  return { amount, images, unit, imagesPerSku, qty, breakdown: [{ qty, imagesPerSku, unit, subtotal: amount }], perView: false };
};

export const recommendSession = (session: BookingSession, global: ConfigGlobal | Record<string, unknown>): Recommendation => {
  const reasoning: BilingualText[] = [];
  const key = cfgMatrixKey(session);
  const entry = CFG_MATRIX[key];
  const qty = Number(session.quantity) || 0;
  const views = session.views || [];
  const viewsCount = Number(session.viewsCount) || 1;
  if (!entry || entry.onRequest) {
    return { plateau: 'cyclorama', slotType: null, hours: 0, cycloMode: 'halfH', rentalHours: 5, totalVisuals: qty * viewsCount, onRequest: true, reasoning: [{fr:'Cyclorama / production libre : devis sur demande.', en:'Cyclorama / free production: quote on request.'}] };
  }
  const plateau = entry.plateau;
  let cadence: number;
  if (session.product === 'pap' && session.method === 'packshot') {
    cadence = packshotRate(entry, views);
    const viewsLabel = (views || []).filter(v=>v!=='detail').join(' + ') || 'face';
    if (entry.imageRate) { reasoning.push({ fr:`Cadence : ${entry.imageRate} images / 8h → ${cadence} produits / 8h (${viewsLabel}).`, en:`Throughput: ${entry.imageRate} images / 8h → ${cadence} products / 8h (${viewsLabel}).` }); }
    else { reasoning.push({ fr:`Cadence : ${cadence} produits / 8h (${viewsLabel}).`, en:`Throughput: ${cadence} products / 8h (${viewsLabel}).` }); }
    if ((views || []).includes('detail')) { reasoning.push({fr:'"Détail" compté comme post-prod additionnelle.', en:'"Detail" counted as additional post-prod.'}); }
  } else { cadence = entry.rate || 50; reasoning.push({ fr:`Cadence : ${cadence} produits / 8h.`, en:`Throughput: ${cadence} products / 8h.` }); }
  const rawHours = qty > 0 ? (qty / cadence) * 8 : 0;
  const estimatedHours = Math.max(1, Math.round(rawHours));
  const rawDays = qty > 0 ? qty / cadence : 0;
  let slotType: string | null;
  let hours: number;
  const cycloMode = null;
  if (rawDays === 0) { slotType = 'hour'; hours = 1; }
  else if (estimatedHours <= 3) { slotType = 'hour'; hours = estimatedHours; reasoning.push({fr:`${qty} produits → ~${hours}h.`, en:`${qty} products → ~${hours}h.`}); }
  else if (estimatedHours <= 7) { slotType = 'half'; hours = estimatedHours; reasoning.push({fr:`${qty} produits → demi-journée (${hours}h).`, en:`${qty} products → half day (${hours}h).`}); }
  else { slotType = 'full'; hours = estimatedHours; const totalDays = Math.ceil(rawDays);
    if (totalDays === 1) { reasoning.push({fr:`${qty} produits → journée complète (${hours}h).`, en:`${qty} products → full day (${hours}h).`}); }
    else { reasoning.push({ fr:`${qty} produits → ${hours}h (${totalDays} journées).`, en:`${qty} products → ${hours}h (${totalDays} days).` }); }
  }
  const rentalHours = hours;
  const totalDays = Math.max(1, Math.ceil(rawDays)) || 1;
  return { plateau, slotType, hours, cycloMode, reasoning, totalVisuals: qty * Math.max(1, viewsCount || (views||[]).filter(v=>v!=='detail').length || 1), rentalHours, totalDays, cadence, estimatedHours };
};

export const recommendProjectLevel = (sessions: BookingSession[], global: ConfigGlobal | Record<string, unknown>) => {
  const reasoning: BilingualText[] = [];
  const totalSKUs = sessions.reduce((s, x) => s + (Number(x.quantity) || 0), 0);
  const anyPostprod = sessions.some(s => s.postprod);
  const anyVideo = sessions.some(s => s.postprodVideo);
  const team: TeamState = {};
  const pp: Record<string, unknown> = {};
  if (anyPostprod) { reasoning.push({fr:'Post-production : devis sur demande par plateau concerné.', en:'Post-production: quote on request per relevant stage.'}); }
  if (anyVideo) { reasoning.push({fr:'Montage vidéo inclus dans le devis post-prod.', en:'Video edit included in post-prod quote.'}); }
  return { team, pp, reasoning, totalSKUs, totalVisuals: totalSKUs };
};

export const makeBlankSession = (): BookingSession => ({
  projectType: null, product: null, method: null, submethod: null, media: [], views: [], viewsCount: '', quantity: '', postprod: false, postprodVideo: false,
});

export const isSessionValid = (s: BookingSession) => {
  if (!s.projectType) return false;
  if (s.projectType === 'cyclorama') return true;
  if (!s.product) return false;
  if (s.product === 'pap') {
    if (!s.method) return false;
    if (s.method === 'packshot') { if (!s.submethod) return false; if (!(s.views || []).some(v => v !== 'detail')) return false; if (!Number(s.quantity)) return false; return true; }
    if (s.method === 'onmodel') { if (!((s.media||[]).length)) return false; if (!Number(s.quantity)) return false; if (!Number(s.viewsCount)) return false; return true; }
    return false;
  }
  if (s.product === 'accessoires') { if (!s.submethod) return false; if (!((s.media||[]).length)) return false; if (!Number(s.quantity)) return false; if (!Number(s.viewsCount)) return false; return true; }
  if (!((s.media||[]).length)) return false;
  if (!Number(s.quantity)) return false;
  if (!Number(s.viewsCount)) return false;
  return true;
};

// Localized strings the quote builder needs. Threaded in by the caller so this
// module stays i18n-free. Front passes resolved i18n; the edge function passes
// its own FR/EN copies.
export interface QuoteLabels {
  cyclo5h: string;
  cyclo10h: string;
  cyclo10hEditorial: string;
  cycloPaint: string;
  electricity: string;
  studioVisit: string;
  halfDay: string;
  proRataDay: string;
  postProduction: string;
  images: string;
  videoEditing: string;
  onRequest: string;
}

export interface PriceBreakdownArgs {
  plateau: string | null;
  slotIds: string[];
  slots: Record<string, SlotState>;
  lang: Lang;
  labels: QuoteLabels;
}

export function computePriceBreakdown({ plateau, slotIds, slots, lang, labels }: PriceBreakdownArgs): PriceBreakdown {
  const ids = slotIds && slotIds.length > 0 ? slotIds : (plateau ? [plateau] : []);
  const groups: QuoteGroup[] = [];
  const sameKeyCount: Record<string, number> = {};
  ids.forEach(id => { const k = slots[id]?.plateauKey || id; sameKeyCount[k] = (sameKeyCount[k] || 0) + 1; });
  const seenIdx: Record<string, number> = {};
  ids.forEach(id => {
    const st: SlotState = slots[id] || { plateauKey: id, slotType:'hour', hours:1, cycloMode:'halfH', paint:false, kwh:0, team:{}, postprod:{} };
    const pk = st.plateauKey || id;
    const px = BOOK_PLATEAUX.find(x => x.k === pk); if (!px) return;
    const idx = (seenIdx[pk] = (seenIdx[pk] || 0) + 1);
    const prefix = (sameKeyCount[pk] > 1) ? `${px[lang]} ${String(idx).padStart(2,'0')}` : px[lang];
    const pRows: QuoteRow[] = [];
    if (px.isCyclo) {
      if (st.cycloMode==='halfH') pRows.push({lbl:`${prefix} · ${labels.cyclo5h}`, amt:px.rates.halfH ?? 0});
      else if (st.cycloMode==='fullH') pRows.push({lbl:`${prefix} · ${labels.cyclo10h}`, amt:px.rates.fullH ?? 0});
      else if (st.cycloMode==='editorial') pRows.push({lbl:`${prefix} · ${labels.cyclo10hEditorial}`, amt:0, onReq:true});
      if (st.paint) pRows.push({lbl:`${prefix} · ${labels.cycloPaint}`, amt:CYCLO_EXTRAS.paint});
      if ((st.kwh ?? 0) > 0) pRows.push({lbl:`${prefix} · ${labels.electricity} · ${st.kwh} kWh`, amt:+((st.kwh ?? 0)*CYCLO_EXTRAS.kwh).toFixed(2)});
    } else if (px.isVisite) { pRows.push({lbl:`${prefix} · ${labels.studioVisit}`, amt:0}); }
    else {
      const h = st.hours || 1;
      if (st.slotType==='hour') pRows.push({lbl:`${prefix} · ${h}h`, amt:(px.rates.hour ?? 0)*h});
      else if (st.slotType==='half') { const hh = Math.max(4, Math.min(7, h)); const amt = hh===4 ? (px.rates.half ?? 0) : +(((px.rates.half ?? 0) * hh / 4).toFixed(2)); pRows.push({lbl:`${prefix} · ${labels.halfDay} (${hh}h)`, amt}); }
      else { const totalH = h || 8; const fullDays = Math.floor(totalH / 8); const extraH = totalH - fullDays * 8;
        if (fullDays > 0) { pRows.push({ lbl: `${prefix} · ${fullDays} ${lang==='fr'?(fullDays>1?'journées (8h)':'journée (8h)'):(fullDays>1?'days (8h)':'day (8h)')}`, amt: +(((px.rates.full ?? 0) * fullDays).toFixed(2)) }); }
        if (extraH > 0) { const hourlyFromFull = (px.rates.full ?? 0) / 8; const extraAmt = +(hourlyFromFull * extraH).toFixed(2); if (extraH === 4) { pRows.push({lbl:`${prefix} · ${labels.halfDay} (4h)`, amt:extraAmt}); } else { pRows.push({lbl:`${prefix} · ${extraH}h ${labels.proRataDay}`, amt:extraAmt}); } }
      }
    }
    const slotRentalHours = px.isCyclo ? (st.cycloMode === 'halfH' ? 5 : 10) : px.isVisite ? 1 : (st.slotType === 'hour' ? (st.hours||1) : st.slotType === 'half' ? Math.max(4,Math.min(7,st.hours||4)) : (st.hours||8));
    const slotTeam = st.team || {};
    EQUIPE.forEach(e=>{ const val = slotTeam[e.k]; if (!val) return; if (e.unit === 'hour') { if (typeof val === 'number' && val>0) { const amt = +(e.price * slotRentalHours * val).toFixed(2); pRows.push({lbl:`${e[lang]} · ${val} × ${slotRentalHours}h`, amt}); } } else { if (val===true) pRows.push({lbl:e[lang], amt:0, onReq:true}); } });
    const slotPostprod = st.postprod || {};
    if (slotPostprod.enabled) {
      const ppLbl = sameKeyCount[pk] > 1 ? `${prefix} · ${labels.postProduction}` : labels.postProduction;
      if ((slotPostprod.amount ?? 0) > 0) { pRows.push({ lbl: `${ppLbl} · ${slotPostprod.images ?? 0} ${labels.images}`, amt: slotPostprod.amount ?? 0, estimate: true, breakdown: slotPostprod.breakdown, perView: slotPostprod.perView }); }
      else { pRows.push({ lbl: ppLbl, amt: 0, onReq: true }); }
      if (slotPostprod.video) { pRows.push({ lbl: sameKeyCount[pk] > 1 ? `${prefix} · ${labels.videoEditing}` : labels.videoEditing, amt: 0, onReq: true }); }
    }
    const subtotal = pRows.reduce((s,r)=>s+r.amt, 0);
    groups.push({plateauKey:pk, plateauName:px[lang], rows:pRows, subtotal});
  });
  const sharedRows: QuoteRow[] = [];
  const sharedSubtotal = sharedRows.reduce((s,r)=>s+r.amt, 0);
  const slotsTotal = groups.reduce((s,g)=>s+g.subtotal, 0);
  const total = slotsTotal + sharedSubtotal;
  const flatRows = [...groups.flatMap(g => g.rows), ...sharedRows];
  return { rows: flatRows, groups, sharedRows, sharedSubtotal, total };
}

export interface BuildSessionsArgs {
  slotIds: string[];
  plateau: string | null;
  slots: Record<string, SlotState>;
  configApplied: boolean;
  configSessions: BookingSession[];
  fallbackQuantity: number;
  selected: DateSelection | null;
  arrivalHour: number | null;
}

export function buildSessionsData({ slotIds, plateau, slots, configApplied, configSessions, fallbackQuantity, selected, arrivalHour }: BuildSessionsArgs): BookingSessionData[] {
  const ids = slotIds && slotIds.length > 0 ? slotIds : (plateau ? [plateau] : []);
  const isMulti = ids.length > 1;
  return ids.map(id => {
    const st: SlotState = slots[id] || {};
    const pk = st.plateauKey || id;
    const stDate = isMulti ? (st.date ?? null) : selected;
    const stArrival = isMulti
      ? (stDate ? (st.arrivalHour != null ? st.arrivalHour : 10) : null)
      : (arrivalHour ?? null);
    const cfgIdx = st.configSessionIdx;
    const session = (configApplied && cfgIdx != null) ? configSessions[cfgIdx] : null;
    const px = BOOK_PLATEAUX.find(x => x.k === pk);
    const manualProductType = px?.isCyclo ? 'cyclorama' : null;
    return {
      plateauKey: pk,
      slotType: st.slotType ?? 'hour',
      hours: st.hours || 1,
      date: stDate,
      arrivalHour: stArrival,
      cycloMode: st.cycloMode ?? null,
      productType: session?.projectType ?? manualProductType,
      method: session?.method ?? null,
      submethod: session?.submethod ?? null,
      media: session?.media ?? [],
      views: session?.views ?? [],
      viewsCount: Number(session?.viewsCount) || 0,
      quantity: session ? Number(session.quantity) || 0 : fallbackQuantity,
      postprodEnabled: session ? !!session.postprod : !!st.postprod?.enabled,
      postprodVideo: session ? !!session.postprodVideo : !!st.postprod?.video,
    };
  });
}

// SIREN (9 digits) / SIRET (14 digits) validation via the Luhn checksum —
// the standard French company-number check. Pure + shared so the chat and the
// booking form validate identically. Spaces are tolerated. (La Poste's
// 356000000 is the known Luhn exception; not special-cased here.)
export function isValidSiren(raw: string): boolean {
  const s = (raw || '').replace(/[\s.]/g, '');
  if (!/^\d{9}$/.test(s) && !/^\d{14}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    let d = Number(s[s.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export interface PlanSessionInput {
  session: BookingSession;
  date?: DateSelection | null;
  arrivalHour?: number | null;
}

export interface SessionPlan {
  slots: Record<string, SlotState>;
  slotIds: string[];
  plateau: string | null;
}

// Pure port of book-page's seedFromConfig core: turn configurator sessions into
// the slot model (keyed by slotId) that computePriceBreakdown / buildSessionsData
// consume. Per-session date/arrivalHour are injected (multi-session books each
// plateau on its own day). No state preservation — a fresh plan each call. Used
// by the chat edge function to price + assemble a booking from NL-extracted
// sessions, identical to the configurator.
export function planFromSessions(
  inputs: PlanSessionInput[],
  global: ConfigGlobal | Record<string, unknown>,
): SessionPlan {
  const valid = inputs
    .map((inp, idx) => ({ inp, idx }))
    .filter(({ inp }) => {
      const s = inp.session;
      return (s.projectType === 'cyclorama') || (s.projectType === 'ecom' && !!s.product && Number(s.quantity) > 0);
    });
  if (valid.length === 0) return { slots: {}, slotIds: [], plateau: null };
  const proj = recommendProjectLevel(valid.map((v) => v.inp.session), global);
  const slots: Record<string, SlotState> = {};
  const slotIds: string[] = [];
  let firstPlateau: string | null = null;
  valid.forEach(({ inp, idx }) => {
    const session = inp.session;
    const rec = recommendSession(session, global);
    const id = slotIdFor(rec.plateau, idx);
    const pxInfo = BOOK_PLATEAUX.find((x) => x.k === rec.plateau);
    const isCyclo = !!(pxInfo && pxInfo.isCyclo);
    const teamCopy: TeamState = { ...(proj.team || {}) };
    if (isCyclo) { delete teamCopy.styliste_op; delete teamCopy.operateur; }
    const ppPrice = session.postprod ? computePostprodPrice(session) : null;
    const sessPP: PostprodState = session.postprod
      ? {
          enabled: true,
          video: !!session.postprodVideo,
          amount: ppPrice ? ppPrice.amount : 0,
          images: ppPrice ? ppPrice.images : 0,
          breakdown: ppPrice ? ppPrice.breakdown : [],
          perView: ppPrice ? !!ppPrice.perView : false,
        }
      : {};
    slots[id] = {
      plateauKey: rec.plateau,
      slotType: rec.slotType || 'hour',
      hours: rec.hours || 1,
      cycloMode: rec.cycloMode || 'halfH',
      paint: false,
      kwh: 0,
      team: teamCopy,
      postprod: sessPP,
      date: inp.date ?? null,
      arrivalHour: inp.arrivalHour ?? undefined,
      configSessionIdx: idx,
    };
    slotIds.push(id);
    if (firstPlateau === null) firstPlateau = rec.plateau;
  });
  return { slots, slotIds, plateau: firstPlateau };
}
