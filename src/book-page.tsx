import React, { useState as useStateBook, useMemo as useMemoBook } from 'react';
import { usePageContext } from './router';
import { IconArrowRight, PageHeader, Toggle } from './ui';
import { MarqueeCell } from './cells';
import type { Lang } from './types';

type BilingualText = Record<Lang, string>;
type BookMode = 'config' | 'manual';
type SentMode = false | 'request' | 'quote' | 'booking';
type AnyProps = Record<string, any>;

interface BookRates {
  hour?: number | null;
  half?: number;
  full?: number;
  halfH?: number;
  fullH?: number;
  editorial?: number;
  [key: string]: number | null | undefined;
}

interface BookPlateau {
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

interface BookingSession {
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

interface ConfigGlobal {
  projectType: string;
  urgency: string;
  postprod: boolean;
}

interface DateSelection {
  y: number;
  m: number;
  d: number;
}

type TeamState = Record<string, number | boolean>;

interface QuoteBreakdown {
  view?: string;
  qty?: number;
  imagesPerSku?: number;
  unit: number;
  subtotal: number;
  labels?: BilingualText;
}

interface PostprodState {
  enabled?: boolean;
  video?: boolean;
  amount?: number;
  images?: number;
  breakdown?: QuoteBreakdown[];
  perView?: boolean;
}

interface PerPlateauState {
  slotType?: string | null;
  hours?: number;
  cycloMode?: string | null;
  paint?: boolean;
  kwh?: number;
  team?: TeamState;
  postprod?: PostprodState;
  date?: DateSelection | null;
  arrivalHour?: number;
}

interface QuoteRow {
  lbl: string;
  amt: number;
  onReq?: boolean;
  estimate?: boolean;
  breakdown?: QuoteBreakdown[];
  perView?: boolean;
}

interface QuoteGroup {
  plateauKey: string;
  plateauName: string;
  rows: QuoteRow[];
  subtotal: number;
}

interface PriceBreakdown {
  rows: QuoteRow[];
  groups: QuoteGroup[];
  sharedRows: QuoteRow[];
  sharedSubtotal: number;
  total: number;
  isPreview?: boolean;
}

interface CfgEntry {
  plateau: string;
  imageRate?: number;
  views?: string[];
  rates?: Record<string, number>;
  rate?: number;
  onRequest?: boolean;
}

interface Recommendation {
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

interface ContactState {
  marque: string;
  societe: string;
  siren: string;
  adresseFacturation: string;
  nom: string;
  prenom: string;
  email: string;
  tel: string;
  typesArticles: string[];
  quantiteArticles: string;
  vuesParArticle: string;
  autresInfos: string;
  cgvAccepted: boolean;
  autreType?: string;
}

const BOOK_PLATEAUX: BookPlateau[] = [
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

const CYCLO_EXTRAS = { paint: 110, kwh: 1.4 };

const fmtEUR = (n: unknown): string => {
  if (n == null || Number.isNaN(Number(n))) return '0';
  const num = Number(n);
  const truncated = Math.trunc(num * 100) / 100;
  const hasDecimals = truncated !== Math.trunc(truncated);
  return truncated.toLocaleString('fr-FR', {
    minimumFractionDigits: hasDecimals ? (truncated * 10 !== Math.trunc(truncated * 10) ? 2 : 1) : 0,
    maximumFractionDigits: 2,
  });
};

const EQUIPE: AnyProps[] = [
  {k:'styliste_op', fr:'Styliste', en:'Stylist', price:67.5, unit:'hour', forMethods:['packshot']},
  {k:'operateur', fr:'Opérateur machine', en:'Machine operator', price:67.5, unit:'hour', forMethods:['onmodel','other']},
  {k:'plateau', fr:'Assistant plateau', en:'Stage assistant', price:200, unit:'day'},
  {k:'setdesign', fr:'Assistant set design',en:'Set design assistant',price:500,unit:'day'},
  {k:'styliste', fr:'Assistant styliste', en:'Styling assistant', price:250, unit:'day'},
  {k:'prod', fr:'Assistant production',en:'Production assistant',price:350,unit:'day'},
];

const POSTPROD: AnyProps[] = [
  {k:'datamgmt', fr:'Data management (sélection / naming)', en:'Data management (select / naming)', price:50, unit:'hour'},
  {k:'retouche', fr:'Retouche packshot', en:'Packshot retouching', price:25, unit:'visual'},
  {k:'retouchehd', fr:'Retouche HD', en:'HD retouching', price:75, unit:'visual'},
  {k:'montage', fr:'Montage vidéo', en:'Video edit', price:450, unit:'flat'},
  {k:'animation', fr:'Animation 360° / stop-motion', en:'360° animation / stop-motion', price:400, unit:'product'},
];

const PP_UNIT: Record<string, Record<string, number>> = {
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

const computePostprodPrice = (session: BookingSession) => {
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

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FR = ['L','M','M','J','V','S','D'];
const DAYS_EN = ['M','T','W','T','F','S','S'];

const availFor = (plateauKey: string, y: number, m: number, d: number) => {
  const key = plateauKey.charCodeAt(0) + y + m*31 + d*7;
  const r = (key * 2654435761) >>> 0;
  const bucket = r % 10;
  if (bucket < 2) return 'unavailable';
  if (bucket < 4) return 'limited';
  return 'free';
};

const CFG_MATRIX: Record<string, CfgEntry> = {
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

const cfgMatrixKey = (s: BookingSession): string => {
  if (s.projectType === 'cyclorama') return 'cyclorama';
  if (s.product === 'pap') { if (s.method === 'onmodel') return 'pap.onmodel'; return `pap.packshot.${s.submethod || 'pique'}`; }
  if (s.product === 'accessoires') return `access.${s.submethod || 'chaussure'}`;
  return s.product ?? '';
};

const packshotRate = (entry: CfgEntry, views: string[]) => {
  const packshotViews = (views || []).filter(v => v !== 'detail');
  if (entry.imageRate) { const nbViews = Math.max(1, packshotViews.length); return Math.max(1, Math.round(entry.imageRate / nbViews)); }
  const key = packshotViews.sort().join('+') || 'face';
  return entry.rates?.[key] || entry.rates?.face || 50;
};

const recommendSession = (session: BookingSession, global: ConfigGlobal | Record<string, unknown>): Recommendation => {
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

const recommendProjectLevel = (sessions: BookingSession[], global: ConfigGlobal | Record<string, unknown>) => {
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

const makeBlankSession = (): BookingSession => ({
  projectType: null, product: null, method: null, submethod: null, media: [], views: [], viewsCount: '', quantity: '', postprod: false, postprodVideo: false,
});

const isSessionValid = (s: BookingSession) => {
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

const BookPageV2 = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const today = new Date();
  const [step, setStep] = useStateBook<number>(() => { try { if (localStorage.getItem('edo-book-plateau')) return 1; } catch(e){} return 0; });
  const [configGlobal, setConfigGlobal] = useStateBook<ConfigGlobal>({ projectType: 'ecom', urgency: 'flex', postprod: false });
  const [configSessions, setConfigSessions] = useStateBook<BookingSession[]>([makeBlankSession()]);
  const [activeSessionIdx, setActiveSessionIdx] = useStateBook<number>(0);
  const [configApplied, setConfigApplied] = useStateBook<boolean>(false);
  const [plateau, setPlateau] = useStateBook<string | null>(()=>{ try { const pre = localStorage.getItem('edo-book-plateau'); if (pre) { localStorage.removeItem('edo-book-plateau'); return pre; } } catch(e){} return null; });
  const [plateaus, setPlateaus] = useStateBook<string[]>(() => plateau ? [plateau] : []);
  const [perPlateau, setPerPlateau] = useStateBook<Record<string, PerPlateauState>>(() => {
    if (!plateau) return {};
    const px = BOOK_PLATEAUX.find(x => x.k === plateau);
    return { [plateau]: { slotType: (px && px.isCyclo) ? null : 'hour', hours: 1, cycloMode: 'halfH', paint: false, kwh: 0 } };
  });
  const togglePlateau = (k: string) => {
    setPlateaus(prev => {
      const next = prev.includes(k) ? prev.filter(x=>x!==k) : [...prev, k];
      setPlateau(next[0] || null);
      if (!prev.includes(k)) { const px = BOOK_PLATEAUX.find(x=>x.k===k); setPerPlateau(p => ({...p, [k]: { slotType:'hour', hours:1, cycloMode:'halfH', paint:false, kwh:0, ...(px && px.isCyclo ? {slotType:null} : {}) } })); }
      return next;
    });
  };
  const [viewY, setViewY] = useStateBook<number>(today.getFullYear());
  const [viewM, setViewM] = useStateBook<number>(today.getMonth());
  const [selected, setSelected] = useStateBook<DateSelection | null>(null);
  const [arrivalHour, setArrivalHour] = useStateBook<number>(10);
  const [dateIdx, setDateIdx] = useStateBook<number>(0);
  const [slotType, setSlotType] = useStateBook<string>('hour');
  const [hours, setHours] = useStateBook<number>(1);
  const [cycloMode, setCycloMode] = useStateBook<string>('halfH');
  const [paint, setPaint] = useStateBook<boolean>(false);
  const [kwh, setKwh] = useStateBook<number>(0);
  const [team, setTeam] = useStateBook<TeamState>({});
  const [pp, setPp] = useStateBook<Record<string, unknown>>({});
  const [contact, setContact] = useStateBook<ContactState>({ marque:'', societe:'', siren:'', adresseFacturation:'', nom:'', prenom:'', email:'', tel:'', typesArticles:[], quantiteArticles:'', vuesParArticle:'', autresInfos:'', cgvAccepted:false });
  const [sent, setSent] = useStateBook<SentMode>(false);
  const months = lang==='fr' ? MONTHS_FR : MONTHS_EN;
  const days = lang==='fr' ? DAYS_FR : DAYS_EN;
  const p = BOOK_PLATEAUX.find(x=>x.k===plateau) || {k:'', fr:'—', en:'—', desc:{fr:'',en:''}, rates:{hour:0,half:0,full:0}, hdUnit:'half', fdUnit:'full'};
  const rentalHours = p.isCyclo ? (cycloMode==='halfH' ? 5 : 10) : p.isVisite ? 1 : (slotType==='hour' ? hours : (slotType==='half' ? Math.max(4,Math.min(7,hours)) : 8));
  const priceBreakdown = useMemoBook<PriceBreakdown>(()=>{
    const keys = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []);
    const groups: QuoteGroup[] = [];
    if (step === 0 && keys.length === 0) {
      const previewRows: QuoteRow[] = [];
      (configSessions || []).forEach((s, idx) => {
        const valid = (s.projectType === 'cyclorama') || (s.projectType === 'ecom' && s.product && Number(s.quantity) > 0);
        if (!valid) return;
        const rec = recommendSession(s, configGlobal);
        const px = BOOK_PLATEAUX.find(x => x.k === rec.plateau);
        if (!px) return;
        const sessionTag = (configSessions.length > 1) ? `${lang==='fr'?'Session':'Session'} ${String(idx+1).padStart(2,'0')} · ` : '';
        if (px.isCyclo || rec.onRequest) { previewRows.push({ lbl: `${sessionTag}${px[lang]} · ${lang==='fr'?'sur demande':'on request'}`, amt: 0, onReq: true }); }
        else if (rec.slotType === 'hour') { const h = rec.hours || 1; previewRows.push({ lbl: `${sessionTag}${px[lang]} · ${h}h`, amt: +(((px.rates.hour ?? 0) * h).toFixed(2)) }); }
        else if (rec.slotType === 'half') { const hh = Math.max(4, Math.min(7, rec.hours || 4)); const amt = hh === 4 ? (px.rates.half ?? 0) : +(((px.rates.half ?? 0) * hh / 4).toFixed(2)); previewRows.push({ lbl: `${sessionTag}${px[lang]} · ${lang==='fr'?`Demi-journée (${hh}h)`:`Half day (${hh}h)`}`, amt }); }
        else if (rec.slotType === 'full') {
          const totalH = rec.hours || 8; const fullDays = Math.floor(totalH / 8); const extraH = totalH - fullDays * 8;
          if (fullDays >= 1) { previewRows.push({ lbl: `${sessionTag}${px[lang]} · ${fullDays} ${lang==='fr'?(fullDays>1?'journées (8h)':'journée (8h)'):(fullDays>1?'days (8h)':'day (8h)')}`, amt: +(((px.rates.full ?? 0) * fullDays).toFixed(2)) }); }
          if (extraH > 0) { const hourlyFromFull = (px.rates.full ?? 0) / 8; const amt = +(hourlyFromFull * extraH).toFixed(2); const lbl = extraH === 4 ? `${sessionTag}${px[lang]} · ${lang==='fr'?'Demi-journée (4h)':'Half day (4h)'}` : `${sessionTag}${px[lang]} · ${extraH}h`; previewRows.push({ lbl, amt }); }
        }
        if (s.postprod) { const pp = computePostprodPrice(s); if (pp) { previewRows.push({ lbl: `${sessionTag}${lang==='fr'?'Post-production':'Post-production'} · ${pp.images} ${lang==='fr'?'images':'images'}`, amt: pp.amount, estimate: true, breakdown: pp.breakdown, perView: pp.perView }); } else { previewRows.push({ lbl: `${sessionTag}${lang==='fr'?'Post-production':'Post-production'} · ${lang==='fr'?'sur demande':'on request'}`, amt: 0, onReq: true }); } }
        if (s.postprodVideo) { previewRows.push({ lbl: `${sessionTag}${lang==='fr'?'Montage vidéo':'Video editing'}`, amt: 0, onReq: true }); }
      });
      const total = previewRows.reduce((s,r)=>s+r.amt, 0);
      return { rows: previewRows, groups: [], sharedRows: [], sharedSubtotal: 0, total, isPreview: true };
    }
    keys.forEach(k => {
      const px = BOOK_PLATEAUX.find(x => x.k === k); if (!px) return;
      const isLegacyOnly = !plateaus || plateaus.length === 0;
      const st: PerPlateauState = isLegacyOnly ? { slotType, hours, cycloMode, paint, kwh, team } : (perPlateau[k] || { slotType:'hour', hours:1, cycloMode:'halfH', paint:false, kwh:0, team:{} });
      const pRows: QuoteRow[] = [];
      if (px.isCyclo) {
        if (st.cycloMode==='halfH') pRows.push({lbl:lang==='fr'?'Cyclorama · 5h':'Cyclorama · 5h', amt:px.rates.halfH ?? 0});
        else if (st.cycloMode==='fullH') pRows.push({lbl:lang==='fr'?'Cyclorama · 10h':'Cyclorama · 10h', amt:px.rates.fullH ?? 0});
        else if (st.cycloMode==='editorial') pRows.push({lbl:lang==='fr'?'Cyclorama · 10h éditorial':'Cyclorama · 10h editorial', amt:0, onReq:true});
        if (st.paint) pRows.push({lbl:lang==='fr'?'Peinture cyclo':'Cyclo paint', amt:CYCLO_EXTRAS.paint});
        if ((st.kwh ?? 0) > 0) pRows.push({lbl:`${lang==='fr'?'Électricité':'Electricity'} · ${st.kwh} kWh`, amt:+((st.kwh ?? 0)*CYCLO_EXTRAS.kwh).toFixed(2)});
      } else if (px.isVisite) { pRows.push({lbl:lang==='fr'?'Visite du studio':'Studio visit', amt:0}); }
      else {
        const h = st.hours || 1;
        if (st.slotType==='hour') pRows.push({lbl:`${px[lang]} · ${h}h`, amt:(px.rates.hour ?? 0)*h});
        else if (st.slotType==='half') { const hh = Math.max(4, Math.min(7, h)); const amt = hh===4 ? (px.rates.half ?? 0) : +(((px.rates.half ?? 0) * hh / 4).toFixed(2)); pRows.push({lbl:`${px[lang]} · ${lang==='fr'?`Demi-journée (${hh}h)`:`Half day (${hh}h)`}`, amt}); }
        else { const totalH = h || 8; const fullDays = Math.floor(totalH / 8); const extraH = totalH - fullDays * 8;
          if (fullDays > 0) { pRows.push({ lbl: `${px[lang]} · ${fullDays} ${lang==='fr'?(fullDays>1?'journées (8h)':'journée (8h)'):(fullDays>1?'days (8h)':'day (8h)')}`, amt: +(((px.rates.full ?? 0) * fullDays).toFixed(2)) }); }
          if (extraH > 0) { const hourlyFromFull = (px.rates.full ?? 0) / 8; const extraAmt = +(hourlyFromFull * extraH).toFixed(2); if (extraH === 4) { pRows.push({lbl:`${px[lang]} · ${lang==='fr'?'Demi-journée (4h)':'Half day (4h)'}`, amt:extraAmt}); } else { pRows.push({lbl:`${px[lang]} · ${extraH}h ${lang==='fr'?'(prorata jour/8)':'(pro-rata day/8)'}`, amt:extraAmt}); } }
        }
      }
      const plateauRentalHours = px.isCyclo ? (st.cycloMode === 'halfH' ? 5 : 10) : px.isVisite ? 1 : (st.slotType === 'hour' ? (st.hours||1) : st.slotType === 'half' ? Math.max(4,Math.min(7,st.hours||4)) : (st.hours||8));
      const plateauTeam = st.team || {};
      EQUIPE.forEach(e=>{ const val = plateauTeam[e.k]; if (!val) return; if (e.unit === 'hour') { if (typeof val === 'number' && val>0) { const amt = +(e.price * plateauRentalHours * val).toFixed(2); pRows.push({lbl:`${e[lang]} · ${val} × ${plateauRentalHours}h`, amt}); } } else { if (val===true) pRows.push({lbl:`${e[lang]} · ${lang==='fr'?'sur demande':'on request'}`, amt:0, onReq:true}); } });
      const plateauPostprod = st.postprod || {};
      if (plateauPostprod.enabled) {
        if ((plateauPostprod.amount ?? 0) > 0) { pRows.push({ lbl: `${lang==='fr'?'Post-production':'Post-production'} · ${plateauPostprod.images ?? 0} ${lang==='fr'?'images':'images'}`, amt: plateauPostprod.amount ?? 0, estimate: true, breakdown: plateauPostprod.breakdown, perView: plateauPostprod.perView }); }
        else { pRows.push({ lbl: `${lang==='fr'?'Post-production':'Post-production'} · ${lang==='fr'?'sur demande':'on request'}`, amt: 0, onReq: true }); }
        if (plateauPostprod.video) { pRows.push({ lbl: `${lang==='fr'?'Montage vidéo':'Video editing'}`, amt: 0, onReq: true }); }
      }
      const subtotal = pRows.reduce((s,r)=>s+r.amt, 0);
      groups.push({plateauKey:k, plateauName:px[lang], rows:pRows, subtotal});
    });
      const sharedRows: QuoteRow[] = [];
    const sharedSubtotal = sharedRows.reduce((s,r)=>s+r.amt, 0);
    const plateauTotal = groups.reduce((s,g)=>s+g.subtotal, 0);
    const total = plateauTotal + sharedSubtotal;
    const flatRows = [...groups.flatMap(g => g.rows), ...sharedRows];
    return { rows: flatRows, groups, sharedRows, sharedSubtotal, total };
  }, [plateau, plateaus, perPlateau, slotType, hours, cycloMode, paint, kwh, team, pp, lang, rentalHours, step, configSessions, configGlobal]);
  const calCells = useMemoBook<(number | null)[]>(()=>{ const first = new Date(viewY, viewM, 1); const dow = (first.getDay() + 6) % 7; const ndays = new Date(viewY, viewM+1, 0).getDate(); const arr: (number | null)[] = []; for (let i=0;i<dow;i++) arr.push(null); for (let d=1; d<=ndays; d++) arr.push(d); while (arr.length % 7) arr.push(null); return arr; }, [viewY, viewM]);
  const nextMonth = () => { let m = viewM+1, y = viewY; if (m>11) { m=0; y++; } setViewM(m); setViewY(y); };
  const prevMonth = () => { let m = viewM-1, y = viewY; if (m<0) { m=11; y--; } setViewM(m); setViewY(y); };
  const isPast = (d: number | null) => { if (!d) return true; const dt = new Date(viewY, viewM, d); const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()); return dt < t; };
  const isSelected = (d: number | null) => selected && selected.y===viewY && selected.m===viewM && selected.d===d;
  const contactValid = () => {
    const base = contact.societe && contact.siren && contact.adresseFacturation && contact.nom && contact.prenom && contact.email && contact.tel && contact.cgvAccepted;
    if (!base) return false;
    if (!p.isCyclo && !p.isVisite && !configApplied) { return contact.typesArticles.length>0 && contact.quantiteArticles && contact.vuesParArticle; }
    return true;
  };
  const canNext = () => {
    if (step===0) return (configSessions || []).length > 0 && configSessions.every(isSessionValid);
    if (step===1) return (plateaus && plateaus.length > 0) || !!plateau;
    if (step===2) return true;
    if (step===5) return contactValid();
    if (step===6) { const list = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []); if (list.length <= 1) return !!selected; return list.every(k => perPlateau[k] && perPlateau[k].date); }
    return true;
  };
  const canQuote = () => contactValid();
  const mode = configApplied || step === 0 ? 'config' : 'manual';
  const STEPS = mode === 'config' ? [
    {n:0, fr:'Configurateur', en:'Configurator'}, {n:2, fr:'Créneau', en:'Slot'}, {n:3, fr:'Équipe', en:'Team'}, {n:5, fr:'Coordonnées', en:'Contact'}, {n:6, fr:'Date', en:'Date'},
  ] : [
    {n:1, fr:'Plateau', en:'Stage'}, {n:2, fr:'Créneau', en:'Slot'}, {n:3, fr:'Équipe', en:'Team'}, {n:4, fr:'Post-prod', en:'Post-prod'}, {n:5, fr:'Coordonnées', en:'Contact'}, {n:6, fr:'Date', en:'Date'},
  ];
  const seedFromConfig = () => {
    const sessions = configSessions.filter(s => (s.projectType === 'cyclorama') || (s.projectType === 'ecom' && s.product && Number(s.quantity) > 0));
    if (sessions.length === 0) return null;
    const recs = sessions.map(s => ({ session: s, ...recommendSession(s, configGlobal) }));
    const proj = recommendProjectLevel(sessions, configGlobal);
    const pKeys = recs.map(r => r.plateau);
    const uniqPlateaus = Array.from(new Set(pKeys));
    setPlateaus(uniqPlateaus);
    const pp2: Record<string, PerPlateauState> = {};
    recs.forEach(r => {
      const existing = pp2[r.plateau];
      const ppPrice = r.session.postprod ? computePostprodPrice(r.session) : null;
      const sessPP = { enabled: !!r.session.postprod, video: !!r.session.postprodVideo, amount: ppPrice ? ppPrice.amount : 0, images: ppPrice ? ppPrice.images : 0, breakdown: ppPrice ? ppPrice.breakdown : [], perView: ppPrice ? !!ppPrice.perView : false };
      if (existing) {
        if (r.slotType === 'full' || existing.slotType === 'full') { existing.slotType = 'full'; existing.hours = Math.max(existing.hours||8, r.hours||8); }
        else if (r.slotType === 'half' || existing.slotType === 'half') { existing.slotType = 'half'; existing.hours = Math.max(existing.hours||4, r.hours||4); }
        else { existing.hours = (existing.hours||1) + (r.hours||1); }
        existing.postprod = existing.postprod || sessPP.enabled ? { enabled: existing.postprod?.enabled || sessPP.enabled, video: existing.postprod?.video || sessPP.video, amount: (existing.postprod?.amount || 0) + sessPP.amount, images: (existing.postprod?.images || 0) + sessPP.images, breakdown: [...(existing.postprod?.breakdown || []), ...sessPP.breakdown], perView: existing.postprod?.perView || sessPP.perView } : {};
      } else {
        const pxInfo = BOOK_PLATEAUX.find(x => x.k === r.plateau); const isCyclo = !!(pxInfo && pxInfo.isCyclo);
        const teamCopy = {...(proj.team || {})}; if (isCyclo) { delete teamCopy.styliste_op; delete teamCopy.operateur; }
        pp2[r.plateau] = { slotType: r.slotType || 'hour', hours: r.hours || 1, cycloMode: r.cycloMode || 'halfH', paint: false, kwh: 0, team: teamCopy, postprod: sessPP.enabled ? sessPP : {} };
      }
    });
    setPerPlateau(pp2);
    const firstRec = recs[0];
    setPlateau(firstRec.plateau);
    if (firstRec.cycloMode) setCycloMode(firstRec.cycloMode);
    if (firstRec.slotType) { setSlotType(firstRec.slotType); setHours(firstRec.hours); }
    setTeam(proj.team); setPp({});
    return { sessions, recs, proj };
  };
  const applyConfig = () => {
    const seeded = seedFromConfig(); if (!seeded) return;
    const { sessions, recs } = seeded;
    const productLabels = sessions.map(s => { const p = PRODUCTS.find(x=>x.k===s.product); return p ? p[lang] : ''; }).filter(Boolean);
    const totalSKUs = sessions.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    const briefLines: string[] = [];
    if (recs.length > 1) { briefLines.push(lang==='fr' ? `Projet multi-plateaux (${recs.length} sessions).` : `Multi-stage project (${recs.length} sessions).`); }
    recs.forEach((r, i) => {
      const px = BOOK_PLATEAUX.find(x => x.k === r.plateau); const s = r.session;
      const productLbl = PRODUCTS.find(x=>x.k===s.product)?.[lang] || s.product;
      const subLbl = s.submethod ? ` · ${s.submethod}` : ''; const mediaLbl = (s.media||[]).length ? ` (${(s.media||[]).join('+')})` : '';
      const dur = r.onRequest ? (lang==='fr'?'sur demande':'on request') : r.slotType==='full' ? (() => { const totalH = r.hours || (r.totalDays ? r.totalDays*8 : 8); const fd = Math.floor(totalH/8); const ex = totalH - fd*8; if (ex===0) return fd>1 ? `${fd}×8h` : '8h'; return `${fd}×8h+${ex}h`; })() : r.slotType==='half' ? `${r.hours}h (½j)` : `${r.hours}h`;
      briefLines.push(`\n${lang==='fr'?'Session':'Session'} ${i+1} — ${productLbl}${subLbl}${mediaLbl} → ${px ? px[lang] : r.plateau} · ${dur}`);
      briefLines.push(` ${lang==='fr'?'Quantité':'Quantity'} : ${s.quantity} ${lang==='fr'?'produits':'products'}`);
      if (s.views && s.views.length) { briefLines.push(` ${lang==='fr'?'Vues':'Views'} : ${s.views.join(', ')}`); } else if (s.viewsCount) { briefLines.push(` ${lang==='fr'?'Vues par produit':'Views per product'} : ${s.viewsCount}`); }
      if (s.postprod) { briefLines.push(` ${lang==='fr'?'Post-production':'Post-production'} : ${lang==='fr'?'oui':'yes'}${s.postprodVideo ? ` + ${lang==='fr'?'montage vidéo':'video edit'}` : ''}`); }
    });
    setContact(c => ({ ...c, typesArticles: productLabels, quantiteArticles: String(totalSKUs || ''), vuesParArticle: '', autresInfos: c.autresInfos || '' }));
    setConfigApplied(true); setStep(2);
  };
  const skipConfig = () => { setConfigApplied(false); setStep(1); };
  React.useEffect(() => { if (!configApplied) return; seedFromConfig(); }, [configSessions, configGlobal, configApplied]);
  const contentScrollRef = React.useRef<HTMLDivElement | null>(null);
  const innerScrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => { if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0; if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0; }, [step, dateIdx]);
  React.useEffect(() => { if (step === 6) setDateIdx(0); }, [step]);

  if (sent) {
    return <Confirmation lang={lang} openMenu={openMenu} goto={goto} setLang={setLang}
             plateau={p} selected={selected} arrivalHour={arrivalHour} rentalHours={rentalHours}
             plateaus={plateaus} perPlateau={perPlateau}
             total={priceBreakdown.total} rows={priceBreakdown.rows}
             contact={contact} months={months} mode={sent}/>;
  }

  return (
    <div className="grid w-full gap-px bg-black overflow-y-auto md:h-full md:overflow-hidden md:grid-cols-book-shell md:grid-rows-app">

      <PageHeader
        lang={lang}
        title={lang==='fr'?'Réservation':'Booking'}
        className="col-span-full h-14 md:col-start-1 md:col-span-3 md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={[
          { id: 'help', label: lang==='fr'?'Besoin d’aide':'Need help', onClick: () => goto('contact') },
        ]}
      />

      <div className="bg-white overflow-x-auto flex flex-row md:col-start-1 md:row-start-2 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:min-h-0">
        {STEPS.map((s,i)=>{
          const active = step===s.n;
          const curIdx = STEPS.findIndex(x=>x.n===step);
          const done = curIdx > -1 && i < curIdx;
          const clickable = done || active || (i === curIdx + 1 && canNext()) || s.n===0;
          return (
            <button key={s.n} onClick={()=>{ if(clickable) setStep(s.n); }}
              className={`edo-focus-ring flex-none ${active ? 'bg-muted border-b-2 border-b-primary md:border-b-0 md:border-l-3 md:border-l-primary' : 'bg-transparent border-b-2 border-b-transparent md:border-b-0 md:border-l-3 md:border-l-transparent'} ${i<STEPS.length-1 ? 'md:border-b md:border-b-border' : 'md:border-b-0'} px-4 h-12 md:px-6 md:h-control ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'} text-left flex items-center gap-3.5 transition-all duration-150 ${clickable ? 'opacity-100' : 'opacity-35'}`}>
              <span className={`font-mono text-label tracking-meta ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'} min-w-5.5`}>
                {done ? '✓' : String(i+1).padStart(2,'0')}
              </span>
              <span className={`text-detail ${active ? 'font-medium' : 'font-normal'} tracking-copy-tight text-foreground`}>{s[lang]}</span>
            </button>
          );
        })}
      </div>

      <div ref={contentScrollRef} className="bg-white overflow-auto flex flex-col md:col-start-2 md:row-start-2 md:min-h-0">
        {mode === 'manual' && (
          <div className="px-5 flex items-center justify-between gap-3 bg-muted min-h-control box-border shrink-0 border-b border-foreground">
            <span className="font-mono text-micro tracking-code uppercase text-muted-foreground min-w-0">
              {lang==='fr'?'Choix manuel — ou ':'Manual mode — or '}
              <span className="text-primary font-semibold">{lang==='fr'?'← laissez-vous guider':'← let us guide you'}</span>
            </span>
            <div className="flex items-center gap-2 flex-none">
              <button onClick={()=>{ setPlateau(null); setPlateaus([]); setPerPlateau({}); setSlotType('hour'); setHours(1); setCycloMode('halfH'); setPaint(false); setKwh(0); setTeam({}); setPp({}); setSelected(null); setStep(1); }}
                className="edo-focus-ring bg-transparent border border-border px-2 py-1 cursor-pointer font-mono text-micro tracking-code uppercase text-foreground whitespace-nowrap leading-normal">
                ↻ {lang==='fr'?'Réinitialiser':'Reset'}
              </button>
              <button onClick={()=>setStep(0)}
                className="edo-focus-ring bg-primary border border-primary px-3 py-1.5 cursor-pointer font-mono text-label tracking-code uppercase text-white whitespace-nowrap leading-normal font-semibold transition-all duration-150 hover:bg-foreground hover:text-white hover:border-foreground">
                ← {lang==='fr'?'Configurateur':'Configurator'}
              </button>
            </div>
          </div>
        )}
        <div ref={innerScrollRef} className="flex-1 overflow-y-auto">
          {step===0 && <Step0Configurator lang={lang} global={configGlobal} setGlobal={setConfigGlobal} sessions={configSessions} setSessions={setConfigSessions} activeIdx={activeSessionIdx} setActiveIdx={setActiveSessionIdx} onApply={applyConfig} onSkip={skipConfig} onReset={()=>{ setPlateau(null); setPlateaus([]); setPerPlateau({}); setSlotType('hour'); setHours(1); setCycloMode('halfH'); setPaint(false); setKwh(0); setTeam({}); setPp({}); setSelected(null); setConfigApplied(false); }}/>}
          {step===1 && <Step1Plateau lang={lang} plateau={plateau} setPlateau={setPlateau} plateaus={plateaus} togglePlateau={togglePlateau} setCycloMode={setCycloMode} setSlotType={setSlotType} setHours={setHours} onConfigurator={()=>setStep(0)}/>}
          {step===2 && <MultiPlateauStep lang={lang} plateaus={plateaus.length?plateaus:(plateau?[plateau]:[])} perPlateau={perPlateau} setPerPlateau={setPerPlateau} fallback={{slotType,hours,cycloMode,setSlotType,setHours,setCycloMode}} topBanner={(() => { const list = plateaus.length?plateaus:(plateau?[plateau]:[]); const allVisite = list.length>0 && list.every(k => BOOK_PLATEAUX.find(x=>x.k===k)?.isVisite); if (allVisite) return null; return (<div className="px-6 border-b border-foreground flex items-center h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">02 · {lang==='fr'?'Durée de location':'Rental duration'}</span><span className="font-mono text-label tracking-caption text-muted-foreground">{list.length > 1 ? (lang==='fr'?'Choisissez une durée pour chaque plateau (pré rempli selon estimation).':'Choose a duration for each stage (pre-filled based on estimate).') : (lang==='fr'?'Choisissez la durée pour votre plateau (pré rempli selon estimation).':'Choose a duration for your stage (pre-filled based on estimate).')}</span></div>); })()} renderOne={(px: AnyProps, st: AnyProps, setSt: (patch: AnyProps) => void) => (<Step3Slot lang={lang} p={px} slotType={st.slotType||'hour'} setSlotType={(v: string)=>setSt({slotType:v})} hours={st.hours||1} setHours={(v: number)=>setSt({hours:v})} cycloMode={st.cycloMode||'halfH'} setCycloMode={(v: string)=>setSt({cycloMode:v})}/>)}/>}
          {step===3 && <MultiPlateauStep lang={lang} plateaus={plateaus.length?plateaus:(plateau?[plateau]:[])} perPlateau={perPlateau} setPerPlateau={setPerPlateau} fallback={{team,setTeam}} topBanner={<div className="px-6 border-b border-foreground flex items-center h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">03 · {lang==='fr'?'Équipe E-DO (optionnel)':'E-DO team (optional)'}</span></div>} renderOne={(px: AnyProps, st: AnyProps, setSt: (patch: AnyProps) => void) => (<Step5Team lang={lang} p={px} team={st.team || {}} configSessions={configSessions} setTeam={(updater: any) => { const next = typeof updater === 'function' ? updater(st.team || {}) : updater; setSt({team: next}); }}/>)}/>}
          {step===4 && <MultiPlateauStep lang={lang} plateaus={plateaus.length?plateaus:(plateau?[plateau]:[])} perPlateau={perPlateau} setPerPlateau={setPerPlateau} fallback={{postprod:{},setPostprod:()=>{}}} topBanner={<div className="px-6 border-b border-foreground flex items-center h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">04 · {lang==='fr'?'Post-production (optionnel)':'Post-production (optional)'}</span></div>} renderOne={(px: AnyProps, st: AnyProps, setSt: (patch: AnyProps) => void) => (<Step6Postprod lang={lang} plateauKey={px && px.k} postprod={st.postprod || {}} setPostprod={(v: AnyProps) => setSt({postprod: v})}/>)}/>}
          {step===5 && <Step7Contact lang={lang} contact={contact} setContact={setContact} p={p} configMode={configApplied}/>}
          {step===6 && (() => {
            const list = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []);
            if (list.length <= 1) { return <Step2Date lang={lang} p={p} viewY={viewY} viewM={viewM} months={months} days={days} calCells={calCells} selected={selected} setSelected={setSelected} arrivalHour={arrivalHour} setArrivalHour={setArrivalHour} rentalHours={rentalHours} isPast={isPast} nextMonth={nextMonth} prevMonth={prevMonth}/>; }
            const safeIdx = Math.max(0, Math.min(dateIdx, list.length - 1));
            const k = list[safeIdx]; const px = BOOK_PLATEAUX.find(x => x.k === k); const st = perPlateau[k] || {};
            const setSt = (patch: PerPlateauState) => setPerPlateau(prev => ({...prev, [k]: {...(prev[k]||{}), ...patch}}));
            const stHours = st.hours != null ? st.hours : (st.slotType==='hour' ? 1 : st.slotType==='half' ? 4 : 8);
            const stRentalHours = px && px.isCyclo ? ((st.cycloMode||'halfH')==='halfH' ? 5 : 10) : px && px.isVisite ? 1 : stHours;
            const stSelected = st.date || null; const stArrival = st.arrivalHour != null ? st.arrivalHour : 10;
            return (<div><div className="px-6 border-b border-foreground flex items-center h-control box-border gap-4 bg-white flex-wrap sticky top-0 z-10"><span className="edo-cell-label text-primary whitespace-nowrap">{lang==='fr'?'Plateau':'Stage'} {String(safeIdx+1).padStart(2,'0')} / {String(list.length).padStart(2,'0')}</span><span className="text-detail font-normal tracking-copy-tight text-foreground">{px ? px[lang] : k}</span><div className="flex gap-1.5 ml-auto">{list.map((kk, i) => { const has = perPlateau[kk] && perPlateau[kk].date; const active = i === safeIdx; return (<button key={kk} onClick={()=>setDateIdx(i)} className={`${active ? 'bg-foreground text-white border-foreground' : has ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border'} border px-2.5 py-1 cursor-pointer font-mono text-label tracking-ui min-w-7 text-center`}>{String(i+1).padStart(2,'0')}{has?' ✓':''}</button>); })}</div></div><Step2Date lang={lang} p={px} viewY={viewY} viewM={viewM} months={months} days={days} calCells={calCells} selected={stSelected} setSelected={(d: DateSelection)=>setSt({date:d})} arrivalHour={stArrival} setArrivalHour={(h: number)=>setSt({arrivalHour:h})} rentalHours={stRentalHours} isPast={isPast} nextMonth={nextMonth} prevMonth={prevMonth}/></div>);
          })()}
        </div>

        {step>0 && (
        <div className="h-18 border-t border-border flex items-center justify-between px-12 shrink-0 bg-white">
          {(() => {
            const idx = STEPS.findIndex(s=>s.n===step); const isFirst = idx <= 0; const prevN = idx > 0 ? STEPS[idx-1].n : null; const nextN = idx > -1 && idx < STEPS.length-1 ? STEPS[idx+1].n : null;
            const dateList = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []); const isMultiDate = step===6 && dateList.length > 1;
            const safeDateIdx = Math.max(0, Math.min(dateIdx, dateList.length - 1)); const onLastDateSub = !isMultiDate || safeDateIdx >= dateList.length - 1; const onFirstDateSub = !isMultiDate || safeDateIdx <= 0;
            const currentDateK = isMultiDate ? dateList[safeDateIdx] : null; const currentDateValid = !isMultiDate || (currentDateK != null && perPlateau[currentDateK] && perPlateau[currentDateK].date);
            const handleBack = () => { if (isMultiDate && !onFirstDateSub) { setDateIdx(safeDateIdx - 1); return; } if (prevN !== null) setStep(prevN); };
            const handleSubNext = () => { if (isMultiDate && !onLastDateSub && currentDateValid) { setDateIdx(safeDateIdx + 1); return true; } return false; };
            const navBtnCls = "edo-focus-ring bg-white border border-border cursor-pointer font-mono text-caption tracking-meta uppercase text-foreground px-5 h-control inline-flex items-center gap-2 transition-all duration-150 hover:scale-102 hover:border-foreground";
            const navBtnPrimaryCls = "edo-focus-ring bg-foreground border-0 cursor-pointer text-white font-mono text-caption tracking-meta uppercase px-cell-lg h-control inline-flex items-center gap-2 transition-all duration-150 hover:scale-102";
            return (<>
          <button onClick={handleBack} disabled={isFirst && onFirstDateSub} className={"edo-focus-ring bg-white border border-border cursor-pointer font-mono text-caption tracking-meta uppercase text-foreground px-5 h-control inline-flex items-center gap-2 transition-all duration-150 hover:scale-102 hover:border-foreground" + (isFirst && onFirstDateSub ? ' opacity-30 cursor-not-allowed' : '')}>
            ← {lang==='fr'?'Retour':'Back'}
          </button>
          {step<5 ? (
            <button onClick={()=>canNext()&&nextN!==null&&setStep(nextN)} disabled={!canNext()} className={navBtnPrimaryCls + (canNext() ? '' : ' opacity-30 cursor-not-allowed')}>
              {lang==='fr'?'Continuer':'Continue'} <IconArrowRight width="14" height="14"/>
            </button>
          ) : p.isCyclo ? (
            step===5 ? (
              <button onClick={()=>canNext()&&nextN!==null&&setStep(nextN)} disabled={!canNext()} className={navBtnPrimaryCls + (canNext() ? '' : ' opacity-30 cursor-not-allowed')}>
                {lang==='fr'?'Continuer':'Continue'} <IconArrowRight width="14" height="14"/>
              </button>
            ) : isMultiDate && !onLastDateSub ? (
              <button onClick={()=>currentDateValid && handleSubNext()} disabled={!currentDateValid} className={navBtnPrimaryCls + (currentDateValid ? '' : ' opacity-30 cursor-not-allowed')}>
                {lang==='fr'?'Valider · plateau suivant':'Validate · next stage'} <IconArrowRight width="14" height="14"/>
              </button>
            ) : (
              <button onClick={()=>canNext()&&setSent('request')} disabled={!canNext()} className={navBtnPrimaryCls.replace('bg-foreground','bg-primary') + (canNext() ? '' : ' opacity-30 cursor-not-allowed')}>
                {lang==='fr'?'Envoyer la demande':'Submit request'} <IconArrowRight width="14" height="14"/>
              </button>
            )
          ) : (
            <div className="flex gap-2.5">
              <button onClick={()=>canQuote()&&setSent('quote')} disabled={!canQuote()} title={lang==='fr'?'Sans bloquer de date':'No date held'} className={navBtnCls + (canQuote() ? '' : ' opacity-30 cursor-not-allowed')}>
                {lang==='fr'?'Recevoir mon devis':'Receive my quote'} <IconArrowRight width="14" height="14"/>
              </button>
              {step===5 ? (
                <button onClick={()=>canNext()&&nextN!==null&&setStep(nextN)} disabled={!canNext()} className={navBtnPrimaryCls + (canNext() ? '' : ' opacity-30 cursor-not-allowed')}>
                  {lang==='fr'?'Choisir une date':'Pick a date'} <IconArrowRight width="14" height="14"/>
                </button>
              ) : isMultiDate && !onLastDateSub ? (
                <button onClick={()=>currentDateValid && handleSubNext()} disabled={!currentDateValid} className={navBtnPrimaryCls + (currentDateValid ? '' : ' opacity-30 cursor-not-allowed')}>
                  {lang==='fr'?'Valider · plateau suivant':'Validate · next stage'} <IconArrowRight width="14" height="14"/>
                </button>
              ) : (
                <button onClick={()=>canNext()&&setSent('booking')} disabled={!canNext()} className={navBtnPrimaryCls.replace('bg-foreground','bg-primary') + (canNext() ? '' : ' opacity-30 cursor-not-allowed')}>
                  {lang==='fr'?'Réserver':'Book now'} <IconArrowRight width="14" height="14"/>
                </button>
              )}
            </div>
          )}
            </>);
          })()}
        </div>
        )}
      </div>

      <SidePanel lang={lang} p={p} selected={selected} months={months} slotType={slotType} hours={hours} cycloMode={cycloMode} rows={priceBreakdown.rows} total={priceBreakdown.total} isPreview={!!priceBreakdown.isPreview} step={step} plateaus={plateaus} perPlateau={perPlateau}/>
    </div>
  );
};

const StepIntro = ({ n, lang, t, s, compact }: AnyProps) => (
  <div className={`${compact ? 'py-2.5 pb-2' : 'py-3 pb-2.5'} flex items-baseline gap-4 flex-wrap`}>
    <span className="edo-cell-label text-primary shrink-0">{n} · {t}</span>
    {s && <span className="text-caption text-muted-foreground leading-snug flex-auto min-w-0">{s}</span>}
  </div>
);

const StepBody = ({ children }: AnyProps) => (
  <div className="px-12 pb-6">{children}</div>
);

const PROJECT_TYPES: AnyProps[] = [
  {k:'ecom', fr:'E-commerce', en:'E-commerce', desc:{fr:'Packshots, on-model, fiches produit.', en:'Packshots, on-model, product pages.'}},
  {k:'cyclorama', fr:'Cyclorama / Prod. libre', en:'Cyclorama / Free production', desc:{fr:'Studio cyclo, besoin sur-mesure.', en:'Cyclo studio, custom needs.'}},
];

const URGENCY_OPTIONS: AnyProps[] = [
  {k:'flex', fr:'Flexible', en:'Flexible', desc:{fr:'Dans le mois', en:'This month'}},
  {k:'week', fr:'Sous 1 semaine', en:'Within 1 week', desc:{fr:'Date rapprochée', en:'Soon'}},
  {k:'urgent', fr:'Urgent', en:'Urgent', desc:{fr:'48h ou moins', en:'48h or less'}},
];

const PRODUCTS: AnyProps[] = [
  {k:'pap', fr:'Prêt-à-porter', en:'Ready-to-wear', desc:{fr:'Vêtements, textile porté.', en:'Clothing, worn textile.'}},
  {k:'accessoires', fr:'Accessoires', en:'Accessories', desc:{fr:'Chaussures, maroquinerie, textile.', en:'Shoes, leather goods, textile.'}},
  {k:'eyewear', fr:'Lunetterie', en:'Eyewear', desc:{fr:'Lunettes, solaires.', en:'Glasses, sunglasses.'}},
  {k:'food', fr:'Food & Spiritueux', en:'Food & Spirits', desc:{fr:'Boissons, gastronomie.', en:'Drinks, gourmet.'}},
  {k:'cosmetique', fr:'Cosmétique', en:'Cosmetics', desc:{fr:'Soin, parfumerie, make-up.', en:'Skincare, fragrance, makeup.'}},
  {k:'bijoux', fr:'Bijoux', en:'Jewelry', desc:{fr:'Bijoux, montres.', en:'Jewelry, watches.'}},
];

const PAP_METHODS: AnyProps[] = [
  {k:'packshot', fr:'Packshot', en:'Packshot', desc:{fr:'Shoot produit non porté.', en:'Unworn product shoot.'}},
  {k:'onmodel', fr:'Mannequin (on-model)', en:'On-model', desc:{fr:'Shoot porté sur mannequin.', en:'On-model shoot.'}},
];

const PAP_PACKSHOT_SUBS: AnyProps[] = [
  {k:'pique', fr:'Piqué', en:'Pinned', desc:{fr:'Épinglé sur panneau vertical.', en:'Pinned on vertical board.'}},
  {k:'ghost', fr:'Ghost', en:'Ghost', desc:{fr:'Mannequin invisible, effet porté.', en:'Invisible mannequin, worn look.'}},
  {k:'flat', fr:'Flat', en:'Flat', desc:{fr:'Posé à plat, vue zénithale.', en:'Laid flat, top view.'}},
];

const ACCESS_SUBS: AnyProps[] = [
  {k:'chaussure', fr:'Chaussures', en:'Shoes', desc:{fr:'', en:''}},
  {k:'maroquinerie', fr:'Maroquinerie', en:'Leather goods', desc:{fr:'Sacs, ceintures, petite maroquinerie.', en:'Bags, belts, small leather goods.'}},
  {k:'textile', fr:'Accessoires textile', en:'Textile accessories', desc:{fr:'Foulards, chapeaux, gants.', en:'Scarves, hats, gloves.'}},
];

const MEDIA_OPTIONS: AnyProps[] = [
  {k:'photo', fr:'Photo', en:'Photo', desc:{fr:'', en:''}},
  {k:'video', fr:'Vidéo', en:'Video', desc:{fr:'', en:''}},
];

const PACKSHOT_VIEWS: AnyProps[] = [
  {k:'face', fr:'Face', en:'Front'},
  {k:'dos', fr:'Dos', en:'Back'},
  {k:'3/4', fr:'3/4', en:'3/4'},
  {k:'detail', fr:'Détail', en:'Detail'},
];

const CfgChoice = ({ idx, on, onClick, label, desc, sub }: AnyProps) => (
  <button onClick={onClick}
    className={`group edo-focus-ring ${on ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-muted'} border-0 outline-none shadow-none p-3.5 text-left cursor-pointer font-inherit flex flex-col gap-1 transition-all duration-150 min-w-0 min-h-28`}>
    <div className="flex justify-between items-start">
      {idx!=null && <span className={`font-mono text-label tracking-meta ${on ? 'text-white/60' : 'text-muted-foreground'}`}>{String(idx).padStart(2,'0')}</span>}
      {on
        ? <span className="text-primary text-cell leading-none">●</span>
        : <span data-cfg-arrow className={`text-primary text-detail leading-none transition-all duration-200 origin-right ${on ? '' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-110'}`}>→</span>}
    </div>
    <div data-cfg-label className={`text-cell font-normal tracking-headline mt-0.5 leading-cell text-balance transition-transform duration-200 origin-left ${on ? '' : 'group-hover:scale-102'}`}>{label}</div>
    {sub && <div className={`font-mono text-micro tracking-ui uppercase ${on ? 'text-white/55' : 'text-muted-foreground'}`}>{sub}</div>}
    {desc && <div className={`text-caption leading-normal mt-auto text-pretty ${on ? 'text-white/65' : 'text-muted-foreground'}`}>{desc}</div>}
  </button>
);


const Step0Configurator = ({ lang, global, setGlobal, sessions, setSessions, activeIdx, setActiveIdx, onApply, onSkip, onReset }: AnyProps) => {
  const active = sessions[activeIdx] || sessions[0];
  const [openQ, setOpenQ] = React.useState(null);
  const [touchedQs, setTouchedQs] = React.useState(new Set());
  const touchQ = (k) => setTouchedQs(prev => { if (prev.has(k)) return prev; const next = new Set(prev); next.add(k); return next; });
  const setSession = (patch) => { setSessions(prev => prev.map((s, i) => i === activeIdx ? {...s, ...patch} : s)); };
  const resetFrom = (field, value) => {
    const cascades = { projectType:{ product:null, method:null, submethod:null, media:[], views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false }, product:{ method:null, submethod:null, media:[], views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false }, method:{ submethod:null, media:[], views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false }, submethod:{ media:[], views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false }, media:{ views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false } };
    setSession({ [field]: value, ...(cascades[field] || {}) }); setOpenQ(null); setTouchedQs(new Set());
  };
  const addSession = () => { setSessions(prev => [...prev, makeBlankSession()]); setActiveIdx(sessions.length); setOpenQ(null); setTouchedQs(new Set()); };
  const removeSession = (idx) => { if (sessions.length <= 1) return; setSessions(prev => prev.filter((_, i) => i !== idx)); setActiveIdx(Math.max(0, Math.min(activeIdx, sessions.length - 2))); };
  const sessionValid = isSessionValid;
  const allValid = sessions.every(sessionValid);
  const recs = allValid ? sessions.map(s => ({ session: s, ...recommendSession(s, global) })) : null;
  const S = active;
  const labelFor = (fr,en) => lang==='fr' ? fr : en;
  const qList: AnyProps[] = [];
  qList.push({ key:'projectType', num:'00', label: labelFor('Type de projet','Project type'), visible: true, answered: !!S.projectType, summary: S.projectType ? (PROJECT_TYPES.find(x=>x.k===S.projectType)?.[lang] || '') : '' });
  if (S.projectType === 'ecom') { qList.push({ key:'product', num:'01', label: labelFor('Type de produit','Product type'), visible: true, answered: !!S.product, summary: S.product ? (PRODUCTS.find(x=>x.k===S.product)?.[lang] || '') : '' }); }
  if (S.product === 'pap') { qList.push({ key:'method', num:'02', label: labelFor('Méthode','Method'), visible: true, answered: !!S.method, summary: S.method ? (PAP_METHODS.find(x=>x.k===S.method)?.[lang] || '') : '' }); }
  if (S.product === 'pap' && S.method === 'packshot') { qList.push({ key:'submethod', num:'03', label: labelFor('Type de packshot','Packshot type'), visible: true, answered: !!S.submethod, summary: S.submethod ? (PAP_PACKSHOT_SUBS.find(x=>x.k===S.submethod)?.[lang] || '') : '' }); }
  if (S.product === 'accessoires') { qList.push({ key:'submethod', num:'02', label: labelFor("Type d'accessoire",'Accessory type'), visible: true, answered: !!S.submethod, summary: S.submethod ? (ACCESS_SUBS.find(x=>x.k===S.submethod)?.[lang] || '') : '' }); }
  const mediaVisible = (S.product === 'pap' && S.method === 'onmodel') || (S.product === 'accessoires' && S.submethod) || (['eyewear','food','cosmetique','bijoux'].includes(S.product));
  if (mediaVisible) { const mediaNum = S.product==='pap' ? '03' : S.product==='accessoires' ? '03' : '02'; qList.push({ key:'media', num:mediaNum, label: labelFor('Média','Media'), visible: true, multi: true, answered: ((S.media||[]).length) > 0, summary: (S.media||[]).map(m => MEDIA_OPTIONS.find(x=>x.k===m)?.[lang]).filter(Boolean).join(' + ') }); }
  if (S.product === 'pap' && S.method === 'packshot' && S.submethod) { qList.push({ key:'quantity', num:'04', label: labelFor('Nombre de produits','Number of products'), visible: true, answered: !!Number(S.quantity), summary: S.quantity ? `${S.quantity} ${labelFor('produits','products')}` : '' }); }
  if (S.product === 'pap' && S.method === 'packshot' && S.submethod) { qList.push({ key:'views', num:'05', label: labelFor('Vues par produit','Views per product'), visible: true, multi: true, answered: (S.views||[]).some(v => v !== 'detail'), summary: (S.views||[]).map(v => PACKSHOT_VIEWS.find(x=>x.k===v)?.[lang]).filter(Boolean).join(' + ') }); }
  const qvVisible = (S.product === 'pap' && S.method === 'onmodel' && (S.media||[]).length) || (S.product === 'accessoires' && S.submethod && (S.media||[]).length) || (['eyewear','food','cosmetique','bijoux'].includes(S.product) && (S.media||[]).length);
  if (qvVisible) { qList.push({ key:'qtyViews', num: S.product==='pap' ? '04' : S.product==='accessoires' ? '04' : '03', label: labelFor('Produits & vues','Products & views'), visible: true, answered: !!Number(S.quantity) && !!Number(S.viewsCount), summary: (S.quantity && S.viewsCount) ? `${S.quantity} ${labelFor('prod.','prod.')} × ${S.viewsCount} ${labelFor('vues','views')}` : '' }); }
  const ppVisible = S.projectType === 'ecom' && S.product && sessionValid(S);
  if (ppVisible) { qList.push({ key:'postprod', num:'pp', label: labelFor('Post-production','Post-production'), visible: true, answered: true, summary: S.postprod ? (S.postprodVideo ? labelFor('Oui + vidéo','Yes + video') : labelFor('Oui','Yes')) : labelFor('Non','No') }); }
  const firstUnansweredIdx = qList.findIndex(q => !q.answered);
  const autoOpenKey = firstUnansweredIdx >= 0 ? qList[firstUnansweredIdx].key : (qList.length ? qList[qList.length-1].key : null);
  const currentOpen = openQ !== null ? openQ : autoOpenKey;
  const currentIdx = qList.findIndex(q => q.key === currentOpen);
  const isOpen = (key) => { const idx = qList.findIndex(q => q.key === key); if (idx === currentIdx) return true; if (qList[idx]?.answered && idx === currentIdx - 1) { const nextKey = qList[currentIdx]?.key; if (nextKey && !touchedQs.has(nextKey)) return true; } if (idx === currentIdx + 1) { const curr = qList[currentIdx]; if (curr?.answered && touchedQs.has(curr.key)) return true; } return false; };
  const accQ = (qKey, children) => { const q = qList.find(x => x.key === qKey); if (!q || !q.visible) return null; const open = isOpen(qKey); if (!open && q.answered) { return (<button key={qKey+':collapsed'} onClick={()=>setOpenQ(qKey)} className="edo-focus-ring w-full bg-white border-0 border-b border-b-foreground px-6 h-control box-border cursor-pointer font-inherit text-left flex items-center gap-3.5 transition-colors duration-150 hover:bg-muted"><span className="edo-cell-label text-primary shrink-0 w-7">{q.num}</span><span className="edo-cell-label text-muted-foreground shrink-0">{q.label}</span><span className="flex-1 font-mono text-caption tracking-copy-tight text-foreground text-right text-balance">{q.summary || '—'}</span><span className="edo-cell-label text-muted-foreground shrink-0">{lang==='fr'?'modifier':'edit'}</span></button>); } if (!open) return null; const onInteract = ()=>{ touchQ(qKey); setOpenQ(qKey); }; return (<div key={qKey+':open'} onClickCapture={onInteract}>{children}</div>); };
  return (
    <div className="min-w-0 overflow-y-auto h-full">
      <div className="px-5 flex items-center justify-between gap-3 bg-muted min-h-control box-border sticky top-0 z-local border-b border-foreground">
        <span className="font-mono text-micro tracking-code uppercase text-muted-foreground min-w-0">{lang==='fr'?'Notre configurateur vous accompagne — ou ':'Our configurator guides you — or '}<span className="text-primary font-semibold">{lang==='fr'?'choisissez manuellement →':'pick manually →'}</span></span>
        <div className="flex items-center gap-2 flex-none">
          <button onClick={()=>{ setSessions([makeBlankSession()]); setActiveIdx(0); setOpenQ(null); setTouchedQs(new Set()); if (onReset) onReset(); }} className="edo-focus-ring bg-transparent border border-border px-2 py-1 cursor-pointer font-mono text-micro tracking-code uppercase text-foreground whitespace-nowrap leading-normal">↻ {lang==='fr'?'Réinitialiser':'Reset'}</button>
          <button onClick={onSkip} className="edo-focus-ring bg-primary border border-primary px-3 py-1.5 cursor-pointer font-mono text-label tracking-code uppercase text-white whitespace-nowrap leading-normal font-semibold transition-all duration-150 hover:bg-foreground hover:text-white hover:border-foreground">{lang==='fr'?'Choisir manuellement':'Choose manually'} →</button>
        </div>
      </div>
      {sessions.length > 1 && (<>
        <div className="px-6 pt-3.5 pb-1 flex items-baseline justify-between gap-4 flex-wrap"><span className="edo-cell-label text-primary">{lang==='fr'?'Sessions produit':'Product sessions'} — {sessions.length}</span><button onClick={addSession} className="edo-focus-ring bg-white border border-border px-3.5 py-2 cursor-pointer font-mono text-label tracking-meta uppercase text-foreground flex items-center gap-2 h-8">+ {lang==='fr'?'Ajouter une session':'Add a session'}</button></div>
        <div className="grid bg-black border-t border-b border-foreground" style={{gridTemplateColumns:`repeat(${sessions.length}, minmax(0,1fr))`,gap:1}}>
          {sessions.map((s, i) => { const isActive = i === activeIdx; const valid = sessionValid(s); const p = PRODUCTS.find(x => x.k === s.product); const label = s.projectType === 'cyclorama' ? (lang==='fr'?'Cyclorama':'Cyclorama') : (p ? p[lang] : (lang==='fr'?'À définir':'To define')); return (<button key={i} onClick={()=>{setActiveIdx(i); setOpenQ(null); setTouchedQs(new Set());}} className={`${isActive ? 'bg-foreground text-white' : 'bg-white text-foreground'} border-0 px-3.5 py-3 text-left cursor-pointer font-inherit flex flex-col gap-1 min-w-0`}><div className="flex items-center justify-between gap-2"><span className={`font-mono text-label tracking-meta ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{lang==='fr'?'Session':'Session'} {String(i+1).padStart(2,'0')}</span><span onClick={(e)=>{e.stopPropagation(); removeSession(i);}} className={`text-detail cursor-pointer px-1 leading-none ${isActive ? 'text-white/50' : 'text-muted-foreground'}`} title={lang==='fr'?'Retirer':'Remove'}>×</span></div><div className="text-detail font-normal tracking-headline">{label}</div><div className={`font-mono text-micro tracking-caption ${isActive ? 'text-white/55' : 'text-muted-foreground'}`}>{valid ? (s.projectType==='cyclorama' ? (lang==='fr'?'sur demande':'on request') : `${s.quantity} ${lang==='fr'?'produits':'products'}`) : (lang==='fr'?'incomplet':'incomplete')}</div></button>); })}
        </div>
      </>)}
      {accQ('projectType', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">00 · {lang==='fr'?'Type de projet':'Project type'}</span></div><div className="grid grid-cols-2 gap-px bg-black border-b border-foreground">{PROJECT_TYPES.map((pt,i)=>(<CfgChoice key={pt.k} idx={i+1} on={S.projectType===pt.k} onClick={()=>resetFrom('projectType', pt.k)} label={pt[lang]} desc={pt.desc[lang]}/>))}</div></>)}
      {S.projectType === 'ecom' && (accQ('product', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">01 · {lang==='fr'?'Type de produit':'Product type'}</span></div><div className="grid grid-cols-3 gap-px bg-black border-b border-foreground">{PRODUCTS.map((p,i)=>(<CfgChoice key={p.k} idx={i+1} on={S.product===p.k} onClick={()=>resetFrom('product', p.k)} label={p[lang]} desc={p.desc[lang]}/>))}</div></>))}
      {S.product === 'pap' && (accQ('method', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">02 · {lang==='fr'?'Méthode':'Method'}</span></div><div className="grid grid-cols-2 gap-px bg-black border-b border-foreground">{PAP_METHODS.map((m,i)=>(<CfgChoice key={m.k} idx={i+1} on={S.method===m.k} onClick={()=>resetFrom('method', m.k)} label={m[lang]} desc={m.desc[lang]}/>))}</div></>))}
      {S.product === 'pap' && S.method === 'packshot' && (accQ('submethod', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">03 · {lang==='fr'?'Type de packshot':'Packshot type'}</span></div><div className="grid grid-cols-3 gap-px bg-black border-b border-foreground">{PAP_PACKSHOT_SUBS.map((sub,i)=>(<CfgChoice key={sub.k} idx={i+1} on={S.submethod===sub.k} onClick={()=>resetFrom('submethod', sub.k)} label={sub[lang]} desc={sub.desc[lang]}/>))}</div></>))}
      {S.product === 'accessoires' && (accQ('submethod', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">02 · {lang==='fr'?"Type d'accessoire":'Accessory type'}</span></div><div className="grid grid-cols-3 gap-px bg-black border-b border-foreground">{ACCESS_SUBS.map((sub,i)=>(<CfgChoice key={sub.k} idx={i+1} on={S.submethod===sub.k} onClick={()=>resetFrom('submethod', sub.k)} label={sub[lang]} desc={sub.desc[lang]}/>))}</div></>))}
      {((S.product === 'pap' && S.method === 'onmodel') || (S.product === 'accessoires' && S.submethod) || (['eyewear','food','cosmetique','bijoux'].includes(S.product))) && (accQ('media', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">{S.product==='pap' ? '03' : S.product==='accessoires' ? '03' : '02'} · {lang==='fr'?'Média':'Media'}</span><span className="font-mono text-label tracking-caption text-muted-foreground ml-3">{lang==='fr'?'(un ou les deux)':'(one or both)'}</span></div><div className="grid grid-cols-2 gap-px bg-black border-b border-foreground">{MEDIA_OPTIONS.map((m,i)=>{ const cur = Array.isArray(S.media) ? S.media : (S.media ? [S.media] : []); const on = cur.includes(m.k); return (<CfgChoice key={m.k} idx={i+1} on={on} onClick={()=>{ const next = on ? cur.filter(x=>x!==m.k) : [...cur, m.k]; setSession({ media: next }); }} label={m[lang]} desc={m.desc[lang]}/>); })}</div></>))}
      {S.product === 'pap' && S.method === 'packshot' && S.submethod && (accQ('quantity', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">04 · {lang==='fr'?'Nombre de produits':'Number of products'}</span></div><div className="grid grid-cols-1 gap-px bg-black border-b border-foreground"><div className="bg-white px-3 py-2.5 flex flex-col gap-2 min-w-0"><div className="flex items-center gap-1.5 max-w-xs min-w-0"><input value={S.quantity} onChange={e=>setSession({quantity: e.target.value.replace(/\D/g,'')})} placeholder="—" inputMode="numeric" className="flex-1 min-w-0 bg-white border border-border outline-none px-3.5 py-2.5 font-mono text-cell tracking-copy-tight text-foreground text-center"/></div></div></div></>))}
      {S.product === 'pap' && S.method === 'packshot' && S.submethod && (accQ('views', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">05 · {lang==='fr'?'Vues par produit':'Views per product'}</span><span className="font-mono text-label tracking-caption text-muted-foreground ml-3">{lang==='fr'?'(multi-sélection)':'(multi-select)'}</span></div><div className="grid gap-px bg-black border-b border-foreground grid-cols-auto-tiles">{PACKSHOT_VIEWS.filter(v => v.k !== '3/4' || S.submethod === 'ghost').map((v,i)=>{ const on = (S.views || []).includes(v.k); return (<button key={v.k} onClick={()=>{ const cur = S.views || []; setSession({ views: cur.includes(v.k) ? cur.filter(x => x !== v.k) : [...cur, v.k] }); }} className={`${on ? 'bg-foreground text-white' : 'bg-white text-foreground'} border-0 px-3 py-2.5 text-left cursor-pointer font-inherit flex flex-col gap-1.5 min-h-18 min-w-0`}><span className={`font-mono text-label tracking-meta uppercase ${on ? 'text-white/60' : 'text-muted-foreground'}`}>{String(i+1).padStart(2,'0')}</span><span className="text-detail font-normal tracking-headline">{v[lang]}</span>{on && <span className="text-primary text-caption mt-auto">●</span>}</button>); })}</div></>))}
      {((S.product === 'pap' && S.method === 'onmodel' && (S.media||[]).length > 0) || (S.product === 'accessoires' && S.submethod && (S.media||[]).length > 0) || (['eyewear','food','cosmetique','bijoux'].includes(S.product) && (S.media||[]).length > 0)) && (accQ('qtyViews', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">{S.product==='pap' ? '04' : S.product==='accessoires' ? '04' : '03'} · {lang==='fr'?'Produits & vues':'Products & views'}</span></div><div className="grid grid-cols-2 gap-px bg-black border-b border-foreground"><div className="bg-white px-3 py-2.5 flex flex-col gap-2 min-w-0"><span className="edo-cell-label text-muted-foreground">{lang==='fr'?'Nombre de produits':'Number of products'}</span><div className="flex items-center gap-1.5 min-w-0"><input value={S.quantity} onChange={e=>setSession({quantity: e.target.value.replace(/\D/g,'')})} placeholder="—" inputMode="numeric" className="flex-1 min-w-0 w-full bg-white border border-border outline-none px-3.5 py-2.5 font-mono text-cell tracking-copy-tight text-foreground text-center"/></div></div><div className="bg-white px-3 py-2.5 flex flex-col gap-2 min-w-0"><span className="edo-cell-label text-muted-foreground">{lang==='fr'?'Vues par produit':'Views per product'}</span><div className="flex items-center gap-1.5 min-w-0"><input value={S.viewsCount} onChange={e=>setSession({viewsCount: e.target.value.replace(/\D/g,'')})} placeholder="—" inputMode="numeric" className="flex-1 min-w-0 w-full bg-white border border-border outline-none px-3.5 py-2.5 font-mono text-cell tracking-copy-tight text-foreground text-center"/></div></div></div></>))}
      {S.projectType === 'ecom' && S.product && sessionValid(S) && (accQ('postprod', <><div className="px-6 border-b border-foreground flex items-center h-control gap-3 box-border"><span className="edo-cell-label text-primary">{lang==='fr'?'Post-production':'Post-production'}</span></div><div className="grid gap-px bg-black border-b border-foreground" style={{gridTemplateColumns:((S.media||[]).includes('video') && S.postprod) ? '1fr 1fr' : '1fr'}}><div className="bg-white px-3.5 py-2.5 flex items-center justify-between gap-3"><div><div className="text-detail font-medium tracking-copy-tight">{lang==='fr'?'Post-production par E-DO ?':'Post-production by E-DO?'}</div><div className={`font-mono text-label text-muted-foreground mt-0.5`}>{lang==='fr'?'Prix estimatif affiché — ajusté après brief':'Estimated price shown — adjusted after brief'}</div></div><Toggle on={S.postprod} onClick={()=>setSession({postprod:!S.postprod, postprodVideo: S.postprod ? false : S.postprodVideo})}/></div>{((S.media||[]).includes('video')) && S.postprod && (<div className="bg-white px-3.5 py-2.5 flex items-center justify-between gap-3"><div><div className="text-detail font-medium tracking-copy-tight">{lang==='fr'?'Montage vidéo ?':'Video editing?'}</div><div className={`font-mono text-label text-muted-foreground mt-0.5`}>{lang==='fr'?'Uniquement pour les projets vidéo':'Only for video projects'}</div></div><Toggle on={S.postprodVideo} onClick={()=>setSession({postprodVideo:!S.postprodVideo})}/></div>)}</div></>))}
      {S.projectType === 'cyclorama' && (<div className="bg-muted p-5 border-t border-b border-foreground text-center"><div className="text-cell font-normal tracking-headline mb-2">{lang==='fr'?'Cyclorama / Production libre':'Cyclorama / Free production'}</div><div className="text-detail text-muted-foreground max-w-xl mx-auto leading-normal">{lang==='fr'?"Besoin sur-mesure, nous établissons un devis personnalisé.":"Custom needs — we'll prepare a tailored quote based on stage, duration and technical resources."}</div></div>)}
      {sessionValid(active) && activeIdx === sessions.length - 1 && (<div className="px-6 py-1.5 flex justify-center items-center bg-white"><button onClick={addSession} className="edo-focus-ring bg-white border border-border px-4 py-1.5 cursor-pointer font-mono text-label tracking-meta uppercase text-foreground flex items-center gap-2 h-7">+ {lang==='fr'?'Ajouter une autre session produit':'Add another product session'}</button></div>)}
      <div className="h-0 bg-white"/>
      {allValid && recs && (<div className="m-0 bg-foreground text-white"><div className="px-6 py-2 border-b border-white/10 flex items-center justify-between gap-4"><span className={`font-mono text-label tracking-meta uppercase tracking-label text-primary`}>{lang==='fr'?'Récap — recommandation':'Recap — recommendation'}</span><span className={`font-mono text-micro tracking-ui text-white/45`}>{lang==='fr'?'estimation, ajustable':'estimate, tweakable'}</span></div>{recs.map((r, i) => { const px = BOOK_PLATEAUX.find(x => x.k === r.plateau) || BOOK_PLATEAUX[0]; const p = PRODUCTS.find(x => x.k === r.session.product); const productLabel = r.session.projectType === 'cyclorama' ? (lang==='fr'?'Cyclorama':'Cyclorama') : (p?.[lang] || ''); const totalHours = r.estimatedHours || r.hours || 0; let dur; if (r.onRequest) { dur = lang==='fr' ? 'sur demande' : 'on request'; } else if (totalHours <= 16) { dur = `${totalHours}h`; } else { const d = Math.floor(totalHours / 8); const h = totalHours - d * 8; const dLbl = lang==='fr' ? (d > 1 ? 'jours' : 'jour') : (d > 1 ? 'days' : 'day'); dur = h > 0 ? `${d} ${dLbl} ${lang==='fr'?'et':'+'} ${h}h (${totalHours}h)` : `${d} ${dLbl} (${totalHours}h)`; } return (<div key={i} className="px-6 py-2 border-b border-white/10 grid grid-cols-auto-fluid gap-5 items-baseline"><span className={`font-mono text-label tracking-meta uppercase tracking-label text-white/50`}>{String(i+1).padStart(2,'0')}</span><div><div className="text-detail font-normal tracking-headline mb-px">{px[lang]} <span className="text-white/50 text-caption">· {dur}</span></div><div className={`font-mono text-micro tracking-caption text-white/55`}>{productLabel}{r.session.projectType==='cyclorama' ? '' : ` · ${r.session.quantity} ${lang==='fr'?'produits':'products'}`}{r.session.projectType==='cyclorama' ? '' : (() => { const q = Number(r.session.quantity)||0; const vc = Number(r.session.viewsCount)||0; const vLen = (r.session.views||[]).length; const v = vc || vLen || 0; const n = q * v; return n > 0 ? ` · ${n} ${lang==='fr'?'images':'images'}` : ''; })()}{r.cadence ? ` · ${lang==='fr'?`Estimation : ${r.cadence} produits/jour`:`Estimate: ${r.cadence} products/day`}` : ''}</div></div></div>); })}<div className="px-6 py-2.5 flex items-center justify-end gap-3"><button onClick={onApply} className="edo-focus-ring bg-primary border-0 text-white py-2.5 px-5 cursor-pointer font-mono text-label tracking-meta uppercase tracking-label inline-flex items-center gap-2.5">{lang==='fr'?'Continuer vers la réservation':'Continue to booking'}<IconArrowRight width="12" height="12"/></button></div></div>)}
      <div className="h-4 bg-white"/>
    </div>
  );
};

const MultiPlateauStep = ({ lang, plateaus, perPlateau, setPerPlateau, fallback, renderOne, topBanner }: AnyProps) => {
  const list = plateaus && plateaus.length > 0 ? plateaus : [];
  if (list.length === 0) { return (<div className="p-12 text-center text-muted-foreground font-mono text-caption tracking-ui uppercase">{lang==='fr'?'Aucun plateau sélectionné — revenez à l’étape 01.':'No stage selected — go back to step 01.'}</div>); }
  const setOne = (k, patch) => { setPerPlateau(prev => ({...prev, [k]: {...(prev[k] || {}), ...patch}})); };
  return (
    <div>
      {topBanner}
      {list.map((k, idx) => {
        const px = BOOK_PLATEAUX.find(x => x.k === k);
        if (!px) return null;
        const st = perPlateau[k] || {};
        return (
          <div key={k} className={idx < list.length - 1 ? 'border-b-8 border-b-muted' : ''}>
            {list.length > 1 && (
              <div className="px-6 border-b border-foreground flex items-center h-control box-border gap-3 bg-white flex-wrap">
                <span className="edo-cell-label text-primary whitespace-nowrap">{lang==='fr'?'Plateau':'Stage'} {String(idx+1).padStart(2,'0')}</span>
                <span className="text-detail font-normal tracking-copy-tight text-foreground">{px[lang]}</span>
                <span className="font-mono text-label tracking-caption text-muted-foreground">{px.desc[lang]}</span>
              </div>
            )}
            {renderOne(px, st, patch => setOne(k, patch))}
          </div>
        );
      })}
    </div>
  );
};

const Step1Plateau = ({ lang, plateau, setPlateau, plateaus, togglePlateau, setCycloMode, setSlotType, setHours, onConfigurator }: AnyProps) => (
  <div>
    <div className="px-6 border-b border-foreground flex items-center h-control box-border gap-3 bg-white whitespace-nowrap sticky top-0 z-local">
      <span className="edo-cell-label text-primary whitespace-nowrap">01 · {lang==='fr'?'Plateau':'Stage'}</span>
      <span className="font-mono text-label tracking-caption text-muted-foreground">{lang==='fr'?'Sélection multiple possible':'Multi-select possible'}</span>
    </div>
    <div className="grid grid-cols-3 gap-px bg-black border-b border-foreground w-full auto-rows-bento">
    {BOOK_PLATEAUX.map((px,i)=>{
      const on = (plateaus || []).includes(px.k);
      const priceRows = px.isVisite ? [{lbl: lang==='fr'?'Visite':'Visit', val: lang==='fr'?'Gratuit':'Free'}] : px.isCyclo ? [{lbl: lang==='fr'?'½ journée (5h)':'Half day (5h)', val:`${px.rates.halfH} €`},{lbl: lang==='fr'?'Journée (10h)':'Full day (10h)', val:`${px.rates.fullH} €`},{lbl: lang==='fr'?'Éditorial (10h)':'Editorial (10h)', val: lang==='fr'?'Sur demande':'On request'}] : [{lbl: lang==='fr'?'Heure':'Hourly', val:`${px.rates.hour} €`},{lbl: lang==='fr'?'½ journée (4h)':'Half day (4h)',val:`${px.rates.half} €`},{lbl: lang==='fr'?'Journée (8h)':'Full day (8h)',val:`${px.rates.full} €`}];
      return (
        <button key={px.k} onClick={()=>{ togglePlateau(px.k); }}
          className={`group edo-focus-ring ${on ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-muted'} border-0 px-cell py-4 text-left cursor-pointer font-inherit flex flex-col gap-1.5 transition-all duration-150 min-w-0`}>
          <div className="flex justify-between items-start">
            <span className={`font-mono text-label tracking-meta ${on ? 'text-white/60' : 'text-muted-foreground'}`}>{String(i+1).padStart(2,'0')}</span>
            {on ? <span className="text-primary text-cell leading-none">●</span> : <span data-plateau-arrow className={`text-primary text-cell leading-none transition-all duration-200 origin-right ${on ? '' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-110'}`}>→</span>}
          </div>
          <div data-plateau-label className={`text-page-title font-light tracking-headline mt-1 transition-transform duration-200 origin-left ${on ? '' : 'group-hover:scale-102'}`}>{px[lang]}</div>
          <div className={`text-detail ${on ? 'text-white/65' : 'text-muted-foreground'} leading-snug`}>{px.desc[lang]}</div>
          {priceRows.length>0 && (<div className={`mt-auto pt-3 flex flex-col gap-1 border-t ${on ? 'border-t-white/15' : 'border-t-border'}`}>{priceRows.map(pr=>(<div key={pr.lbl} className="flex justify-between items-baseline gap-2 whitespace-nowrap"><span className={`font-mono text-label tracking-caption ${on ? 'text-white/55' : 'text-muted-foreground'} uppercase overflow-hidden text-ellipsis`}>{pr.lbl}</span><span className="text-detail font-medium tabular-nums">{pr.val}</span></div>))}</div>)}
        </button>
      );
    })}
    </div>
  </div>
);

const LegendChip = ({ bg, br, lbl }: AnyProps) => (<span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5" style={{background:bg,border:`1px solid ${br}`}}/> {lbl}</span>);

const Step2Date = ({ lang, p, viewY, viewM, months, days, calCells, selected, setSelected, arrivalHour, setArrivalHour, rentalHours, isPast, nextMonth, prevMonth }: AnyProps) => {
  const isSelected = (d) => selected && selected.y===viewY && selected.m===viewM && selected.d===d;
  const maxStart = 19 - rentalHours;
  React.useEffect(()=>{ if (arrivalHour > maxStart) setArrivalHour(Math.max(9, Math.min(10, maxStart))); }, [maxStart]);
  return (<div>
    <div className="px-6 border-b border-foreground flex items-center h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">06 · {lang==='fr'?'Choisir une date':'Pick a date'}</span></div>
    <div className="grid gap-px bg-black border-b border-foreground w-full grid-cols-fluid-two-auto"><div className="bg-white px-12 py-2 flex items-center gap-5 min-w-0 flex-wrap"><h2 className="m-0 text-tile-title font-light tracking-headline">{months[viewM]} <span className="text-muted-foreground">{viewY}</span></h2><div className="flex gap-3 font-mono text-micro tracking-ui uppercase text-muted-foreground flex-wrap"><LegendChip bg="#fff" br="#141414" lbl={lang==='fr'?'Libre':'Free'}/><LegendChip bg="#f6e4c4" br="#d9b47d" lbl={lang==='fr'?'Partiel':'Limited'}/><LegendChip bg="var(--edo-gray-100)" br="var(--edo-gray-200)" lbl={lang==='fr'?'Indisponible':'Booked'}/><LegendChip bg="var(--edo-orange)" br="var(--edo-orange)" lbl={lang==='fr'?'Sélectionné':'Selected'}/></div></div><button onClick={prevMonth} className="bg-white border-0 cursor-pointer px-cell font-mono text-detail text-foreground">←</button><button onClick={nextMonth} className="bg-white border-0 cursor-pointer px-cell font-mono text-detail text-foreground">→</button></div>
    <div className="grid grid-cols-7 gap-px bg-black border-b border-foreground w-full">{days.map((d,i)=>(<div key={i} className="bg-muted py-1.5 text-center font-mono text-micro tracking-meta uppercase text-muted-foreground">{d}</div>))}</div>
    <div className="grid grid-cols-7 gap-px bg-black border-b border-foreground w-full">{calCells.map((d,i)=>{
      if (d===null) return <div key={i} className="bg-muted aspect-calendar"/>;
      const dow = new Date(viewY, viewM, d).getDay(); const weekend = dow===0 || dow===6; const isFullDay = rentalHours>=8; const weekendBlocked = weekend && !isFullDay;
      const av = weekendBlocked ? 'unavailable' : availFor(p.k, viewY, viewM, d); const past = isPast(d); const sel = isSelected(d);
      const clickable = !past && av!=='unavailable';
      return (<button key={i} disabled={!clickable} onClick={()=>setSelected({y:viewY,m:viewM,d})} title={weekendBlocked ? (lang==='fr'?'Week-end : réservation journée complète uniquement':'Weekend: full-day booking only') : ''}
        className={`${sel ? 'bg-primary text-white' : past ? 'bg-muted text-muted-foreground' : av==='unavailable' ? 'bg-muted text-foreground' : av==='limited' ? 'bg-edo-limited text-foreground' : 'bg-white text-foreground'} border-0 ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'} flex flex-col justify-between text-left font-inherit min-w-0 px-2.5 py-1.5 aspect-calendar`}>
        <span className={`text-cell ${sel ? 'font-medium' : 'font-normal'} tracking-copy-tight`}>{d}</span>
        {!past && av!=='unavailable' && (<span className="font-mono text-nano tracking-caption uppercase opacity-70">{av==='free'?(lang==='fr'?'libre':'free'):(lang==='fr'?'partiel':'part.')}</span>)}
        {weekendBlocked && !past && (<span className="font-mono text-nano tracking-caption uppercase text-muted-foreground">{lang==='fr'?'journée':'full only'}</span>)}
      </button>);
    })}</div>
    <div className="grid grid-cols-1 gap-px bg-black border-b border-foreground w-full"><div className="bg-white px-12 py-2.5 flex items-center gap-5 flex-wrap"><span className="edo-cell-label">{lang==='fr'?'Heure d’arrivée':'Arrival time'}</span><span className="font-mono text-label tracking-ui text-muted-foreground">{String(arrivalHour).padStart(2,'0')}:00 → {String(arrivalHour+rentalHours).padStart(2,'0')}:00 · {rentalHours}h</span></div></div>
    <div className="grid grid-cols-10 gap-px bg-black border-b border-foreground w-full">{Array.from({length:10},(_,i)=>i+9).map(h=>{ const on = arrivalHour===h; const endsTooLate = h + rentalHours > 19; const disabled = endsTooLate; return (<button key={h} disabled={disabled} onClick={()=>!disabled && setArrivalHour(h)} title={disabled ? (lang==='fr'?`Termine à ${h+rentalHours}h, après la fermeture`:`Ends at ${h+rentalHours}h, past closing`) : ''} className={`${on ? 'bg-foreground text-white' : disabled ? 'bg-muted text-muted-foreground' : 'bg-white text-foreground'} border-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} flex items-center justify-center font-mono text-caption tracking-caption min-w-0 aspect-arrival`}>{String(h).padStart(2,'0')}:00</button>); })}</div>
  </div>);
};

const StepperBtn = ({ onClick, children }: AnyProps) => (
  <button onClick={onClick} className="edo-focus-ring w-7.5 h-8 flex-none basis-8 border border-border bg-white cursor-pointer text-cell text-foreground font-inherit inline-flex items-center justify-center transition-all duration-150 hover:scale-102 hover:border-foreground">{children}</button>
);

const BentoSlotTile = ({ idx, on, onClick, label, sub, desc, price, hint, lang }: AnyProps) => (
  <button onClick={onClick}
    className={`group edo-focus-ring ${on ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-muted'} border-0 px-cell py-4 text-left cursor-pointer font-inherit flex flex-col gap-1.5 transition-all duration-150 min-w-0 min-h-44`}>
    <div className="flex justify-between items-start">
      <span className={`font-mono text-label tracking-meta ${on ? 'text-white/60' : 'text-muted-foreground'}`}>{String(idx).padStart(2,'0')}</span>
      {on ? <span className="text-primary text-cell leading-none">●</span> : <span data-slot-arrow className={`text-primary text-cell leading-none transition-all duration-200 origin-right ${on ? '' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-110'}`}>→</span>}
    </div>
    <div data-slot-label className={`text-page-title font-light tracking-headline mt-1 transition-transform duration-200 origin-left ${on ? '' : 'group-hover:scale-102'}`}>{label}</div>
    {sub && <div className={`font-mono text-label tracking-code uppercase ${on ? 'text-white/55' : 'text-muted-foreground'}`}>{sub}</div>}
    {desc && <div className={`text-detail ${on ? 'text-white/65' : 'text-muted-foreground'} leading-snug`}>{desc}</div>}
    <div className={`mt-auto pt-3 flex justify-between items-baseline border-t ${on ? 'border-t-white/15' : 'border-t-border'}`}>
      <span className={`font-mono text-label tracking-caption ${on ? 'text-white/55' : 'text-muted-foreground'} uppercase`}>{hint || (lang==='fr'?'Tarif HT':'Rate ex. VAT')}</span>
      <span className="text-cell font-medium tabular-nums">{price}</span>
    </div>
  </button>
);

const Step3Slot = ({ lang, p, slotType, setSlotType, hours, setHours, cycloMode, setCycloMode }: AnyProps) => {
  if (p.isCyclo) {
    return (<div><div className="grid grid-cols-3 gap-px bg-black border-b border-foreground w-full auto-rows-bento"><BentoSlotTile idx={1} on={cycloMode==='halfH'} onClick={()=>setCycloMode('halfH')} label={lang==='fr'?'Demi-journée':'Half day'} sub="5 heures" desc={lang==='fr'?'Bloc de 5h, parfait pour un shoot packshot ciblé.':'5-hour block, perfect for a focused packshot shoot.'} price="650 €" lang={lang}/><BentoSlotTile idx={2} on={cycloMode==='fullH'} onClick={()=>setCycloMode('fullH')} label={lang==='fr'?'Journée':'Full day'} sub="10 heures" desc={lang==='fr'?'Bloc de 10h, volume e-commerce ou campagne.':'10-hour block, e-commerce volume or campaign.'} price="880 €" lang={lang}/><BentoSlotTile idx={3} on={cycloMode==='editorial'} onClick={()=>setCycloMode('editorial')} label={lang==='fr'?'Éditorial':'Editorial'} sub="10 heures" desc={lang==='fr'?'Tarif réduit presse, usage personnel ou portfolio.':'Reduced rate for press, personal or portfolio use.'} price={lang==='fr'?'Sur demande':'On request'} hint={lang==='fr'?'Presse / personnel':'Press / personal'} lang={lang}/></div></div>);
  }
  if (p.isVisite) {
    return (<div><div className="px-12"><StepIntro n="02" lang={lang} t={lang==='fr'?'Visite du studio':'Studio visit'} s={lang==='fr'?'La visite est gratuite et dure environ une heure. Nous vous recontactons pour confirmer le créneau.':'Studio visit is free and lasts about an hour. We will confirm the slot by phone.'}/></div><div className="grid grid-cols-1 gap-px bg-black border-t border-b border-foreground w-full"><div className="bg-white px-12 py-8 flex items-baseline gap-5"><span className="text-hero font-light tracking-display leading-none">0 €</span><span className="font-mono text-caption tracking-meta uppercase text-muted-foreground">{lang==='fr'?'Gratuit · sur rendez-vous':'Free · by appointment'}</span></div></div></div>);
  }
  return (<div>
    <div className="grid grid-cols-3 gap-px bg-black border-b border-foreground w-full auto-rows-bento">
      <BentoSlotTile idx={1} on={slotType==='hour'} onClick={()=>{setSlotType('hour'); setHours(1);}} label={lang==='fr'?"À l'heure":"Hourly"} sub={lang==='fr'?'1 à 3 heures':'1 to 3 hours'} desc={lang==='fr'?'Idéal pour un essai ou un shoot rapide.':'Ideal for a test or a quick shoot.'} price={`${p.rates.hour} €/h`} lang={lang}/>
      <BentoSlotTile idx={2} on={slotType==='half'} onClick={()=>{setSlotType('half'); setHours(4);}} label={lang==='fr'?'Demi-journée':'Half day'} sub={lang==='fr'?'4 à 7 heures':'4 to 7 hours'} desc={lang==='fr'?'Bloc 4h, prorata au-delà jusqu’à 7h.':'4-hour block, pro-rata up to 7 hours.'} price={`${p.rates.half} €`} lang={lang}/>
      <BentoSlotTile idx={3} on={slotType==='full'} onClick={()=>{setSlotType('full'); setHours(8);}} label={lang==='fr'?'Journée':'Full day'} sub={lang==='fr'?'8 heures':'8 hours'} desc={lang==='fr'?'Journée complète, tarif le plus avantageux.':'Full day, best rate.'} price={`${p.rates.full} €`} lang={lang}/>
    </div>
    {(slotType==='hour' || slotType==='half') && (<div className="grid grid-cols-1 gap-px bg-black border-b border-foreground w-full"><div className="bg-white px-12 py-5 flex items-center justify-between gap-5 flex-wrap"><div className="flex flex-col gap-1"><span className="edo-cell-label">{slotType==='hour' ? (lang==='fr'?"Nombre d'heures":"Number of hours") : (lang==='fr'?'Nombre d’heures · demi-journée':'Hours · half day')}</span><span className="font-mono text-label tracking-caption text-muted-foreground leading-normal whitespace-nowrap">{slotType==='hour' ? (lang==='fr' ? '↗ Dès 4h, bascule en demi-journée. Dès 8h, journée complète.' : '↗ From 4h, switches to half day. From 8h, full day.') : (lang==='fr' ? `↗ 4h = ${p.rates.half} €. Au-delà, prorata (${p.rates.half}/4 × h). Dès 8h, journée complète.` : `↗ 4h = €${p.rates.half}. Beyond, pro-rata (${p.rates.half}/4 × h). From 8h, full day.`)}</span></div><div className="flex items-center gap-3.5"><StepperBtn onClick={()=>{ if (slotType==='hour') setHours(Math.max(1,hours-1)); else { const n=hours-1; if(n<4){setSlotType('hour'); setHours(3);} else setHours(n); } }}>−</StepperBtn><span className="text-page-title font-light tracking-headline min-w-10 text-center">{hours}</span><StepperBtn onClick={()=>{ const n = hours+1; if (n>=8) { setSlotType('full'); setHours(8); } else if (slotType==='hour' && n>=4) { setSlotType('half'); setHours(n); } else { setHours(n); } }}>+</StepperBtn></div></div></div>)}
    {slotType==='full' && (<div className="grid grid-cols-1 gap-px bg-black border-b border-foreground w-full"><div className="bg-white px-12 py-5 flex items-center justify-between gap-5 flex-wrap"><div className="flex flex-col gap-1"><span className="edo-cell-label">{lang==='fr'?'Durée totale':'Total duration'}</span><span className="font-mono text-label tracking-caption text-muted-foreground leading-normal whitespace-nowrap">{(() => { const fullDays = Math.floor(hours/8); const extraH = hours - fullDays*8; if (extraH === 0) { return lang==='fr' ? `↗ ${fullDays} ${fullDays>1?'journées':'journée'} (${hours}h) · ${(p.rates.full*fullDays).toFixed(0)} €` : `↗ ${fullDays} ${fullDays>1?'days':'day'} (${hours}h) · €${(p.rates.full*fullDays).toFixed(0)}`; } const extraAmt = +(p.rates.full / 8 * extraH).toFixed(2); return lang==='fr' ? `↗ ${fullDays} ${fullDays>1?'journées':'journée'} (${fullDays*8}h) + ${extraH}h · ${(p.rates.full*fullDays+extraAmt).toFixed(0)} €` : `↗ ${fullDays} ${fullDays>1?'days':'day'} (${fullDays*8}h) + ${extraH}h · €${(p.rates.full*fullDays+extraAmt).toFixed(0)}`; })()}</span></div><div className="flex items-center gap-3.5"><StepperBtn onClick={()=>{ const n = hours-1; if (n<8) { setSlotType('half'); setHours(7); } else { setHours(n); } }}>−</StepperBtn><span className="text-page-title font-light tracking-headline min-w-16 text-center">{hours}h</span><StepperBtn onClick={()=>setHours(hours+1)}>+</StepperBtn></div></div></div>)}
  </div>);
};

const Step4Equipment = ({ lang, p, paint, setPaint, kwh, setKwh }: AnyProps) => (
  <div className="px-12 pb-6">
    <StepIntro n="03" lang={lang} t={lang==='fr'?'Équipements & options':'Equipment & options'} s={p.isCyclo ? (lang==='fr'?'Options spécifiques au cyclorama (peinture fraîche, électricité additionnelle).':'Cyclorama-specific options (fresh paint, extra electricity).') : (lang==='fr'?'Aucune option supplémentaire requise. Le matériel standard est inclus.':'No extra options required. Standard kit is included.')}/>
    {p.isCyclo ? (<div className="flex flex-col gap-3"><div className={`flex items-center justify-between py-cell px-5 bg-white ${paint ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent'}`}><div><div className="text-cell font-medium tracking-copy-tight">{lang==='fr'?'Peinture fraîche du cyclo':'Fresh cyclo paint'}</div><div className="font-mono text-label text-muted-foreground mt-1">{lang==='fr'?'Repeint avant votre arrivée · forfait':'Repainted before your arrival · flat fee'}</div></div><div className="flex items-center gap-3.5"><span className="text-cell font-medium">110 €</span><Toggle on={paint} onClick={()=>setPaint(!paint)}/></div></div><div className="py-cell px-5 bg-white"><div className="flex justify-between items-center"><div><div className="text-cell font-medium tracking-copy-tight">{lang==='fr'?'Électricité additionnelle':'Extra electricity'}</div><div className="font-mono text-label text-muted-foreground mt-1">1,40 € / kWh</div></div><span className="text-cell font-medium">{fmtEUR(kwh*CYCLO_EXTRAS.kwh)} €</span></div><div className="flex items-center gap-3.5 mt-3.5"><StepperBtn onClick={()=>setKwh(Math.max(0,kwh-10))}>−</StepperBtn><div className="flex-1 h-1.5 bg-border relative"><div className="absolute inset-y-0 left-0 bg-primary" style={{right:`${100-Math.min(100,kwh/2)}%`}}/></div><StepperBtn onClick={()=>setKwh(Math.min(200,kwh+10))}>+</StepperBtn><span className="font-mono text-detail min-w-16 text-right">{kwh} kWh</span></div></div></div>) : (<div className="py-6 px-5 bg-white flex items-center gap-3.5"><span className="text-cell text-primary">✓</span><span className="text-detail text-foreground">{lang==='fr'?'Matériel standard inclus : fonds, supports, blocs d’alimentation, Wi-Fi pro.':'Standard kit included: backdrops, stands, power blocks, pro Wi-Fi.'}</span></div>)}
  </div>
);

const Step5Team = ({ lang, p, team, setTeam, configSessions }: AnyProps) => {
  const setDays = (k, val) => setTeam(prev => { const n = {...prev}; if (val<=0) delete n[k]; else n[k]=val; return n; });
  const toggleReq = (k) => setTeam(prev => { const n = {...prev}; if (n[k]===true) delete n[k]; else n[k]=true; return n; });
  const allSessions = configSessions || [];
  const plateauSessions = allSessions.filter(s => { const rec = recommendSession(s, {}); return rec && rec.plateau === p.k; });
  const hasPackshot = plateauSessions.some(s => s.method === 'packshot');
  const hasNonPackshot = plateauSessions.length === 0 || plateauSessions.some(s => s.method !== 'packshot');
  const items = EQUIPE.filter(e => { if (e.k === 'styliste_op') return hasPackshot; if (e.k === 'operateur') return hasNonPackshot; return true; });
  const hasPique = plateauSessions.some(s => s.product === 'pap' && s.method === 'packshot' && s.submethod === 'pique');
  const hasOnModel = plateauSessions.some(s => s.method === 'onmodel');
  const recommended = { styliste_op: hasPique, plateau: hasOnModel };
  return (<div className="px-12 pb-6"><div className="flex flex-col gap-px bg-border">{items.map(e=>{ const isHourly = e.unit === 'hour'; const n = isHourly ? (team[e.k]||0) : 0; const onReq = !isHourly && team[e.k]===true; return (<div key={e.k} className="bg-white px-5 py-4 flex items-center justify-between gap-5"><div><div className="text-detail font-medium tracking-copy-tight flex items-center gap-2"><span>{e[lang]}</span>{recommended[e.k] && (<span className="font-mono text-micro tracking-ui uppercase text-primary border border-primary px-1.5 py-0.5 leading-none">{lang==='fr'?'Recommandé':'Recommended'}</span>)}</div><div className="font-mono text-label text-muted-foreground mt-0.5">{isHourly ? `${fmtEUR(e.price)} € / ${e.unit==='hour' ? 'h' : (lang==='fr'?'jour':'day')}` : (lang==='fr'?'Tarif sur demande selon le brief':'Rate on request based on brief')}</div></div>{isHourly ? (<label className="flex items-center gap-2.5 cursor-pointer select-none"><span className={`font-mono text-label tracking-ui uppercase ${n>0 ? 'text-primary' : 'text-muted-foreground'}`}>{n>0 ? (lang==='fr'?'Inclus':'Included') : (lang==='fr'?'Ajouter':'Add')}</span><span onClick={()=>setDays(e.k, n>0 ? 0 : 1)} className={`w-5.5 h-5.5 border-1-5 ${n>0 ? 'border-primary bg-primary' : 'border-input bg-white'} inline-flex items-center justify-center text-white text-detail font-bold`}>{n>0?'✓':''}</span></label>) : (<label className="flex items-center gap-2.5 cursor-pointer select-none"><span className={`font-mono text-label tracking-ui uppercase ${onReq ? 'text-primary' : 'text-muted-foreground'}`}>{lang==='fr'?'Sur demande':'On request'}</span><span onClick={()=>toggleReq(e.k)} className={`w-5.5 h-5.5 border-1-5 ${onReq ? 'border-primary bg-primary' : 'border-input bg-white'} inline-flex items-center justify-center text-white text-detail font-bold`}>{onReq?'✓':''}</span></label>)}</div>); })}</div></div>);
};

const Step6Postprod = ({ lang, postprod, setPostprod, plateauKey }: AnyProps) => {
  const enabled = !!postprod.enabled;
  const video = !!postprod.video;
  const videoAllowed = plateauKey !== 'vertical' && plateauKey !== 'horizontal';
  React.useEffect(() => { if (!videoAllowed && video) setPostprod({...postprod, video: false}); }, [videoAllowed, video]);
  return (<div className="px-12 pb-6"><div className="flex flex-col gap-px bg-border"><div className={`bg-white px-6 py-5 flex items-center justify-between gap-5 ${enabled ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent'}`}><div><div className="text-cell font-medium tracking-copy-tight">{lang==='fr'?'Post-production par E-DO':'Post-production by E-DO'}</div><div className="font-mono text-label text-muted-foreground mt-1 leading-normal">{lang==='fr' ? 'Sélection, retouche, livraison — chiffrage sur demande selon le volume.' : 'Selection, retouching, delivery — quoted on request based on volume.'}</div></div><div className="flex items-center gap-3"><span className={`font-mono text-label tracking-code uppercase ${enabled ? 'text-primary' : 'text-muted-foreground'}`}>{lang==='fr'?(enabled?'Oui':'Non'):(enabled?'Yes':'No')}</span><Toggle on={enabled} onClick={()=>setPostprod({...postprod, enabled: !enabled, video: !enabled ? video : false})}/></div></div>{enabled && videoAllowed && (<div className={`bg-white px-6 py-5 flex items-center justify-between gap-5 ${video ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent'}`}><div><div className="text-cell font-medium tracking-copy-tight">{lang==='fr'?'Montage vidéo':'Video editing'}</div><div className="font-mono text-label text-muted-foreground mt-1 leading-normal">{lang==='fr' ? 'Uniquement si votre projet inclut de la vidéo — chiffrage sur demande.' : 'Only if your project includes video — quoted on request.'}</div></div><div className="flex items-center gap-3"><span className={`font-mono text-label tracking-code uppercase ${video ? 'text-primary' : 'text-muted-foreground'}`}>{lang==='fr'?(video?'Oui':'Non'):(video?'Yes':'No')}</span><Toggle on={video} onClick={()=>setPostprod({...postprod, video: !video})}/></div></div>)}</div></div>);
};

const ARTICLE_TYPES: AnyProps[] = [
  {k:'pap', fr:'Prêt-à-porter', en:'Ready-to-wear'},
  {k:'maroquinerie',fr:'Maroquinerie', en:'Leather goods'},
  {k:'chaussures', fr:'Chaussures', en:'Shoes'},
  {k:'accessoires', fr:'Accessoires', en:'Accessories'},
  {k:'eyewear', fr:'Eyewear', en:'Eyewear'},
  {k:'bijoux', fr:'Bijoux', en:'Jewelry'},
  {k:'cosmetique', fr:'Cosmétique', en:'Cosmetics'},
  {k:'food', fr:'Food & spiritueux', en:'Food & spirits'},
  {k:'autre', fr:'Autre', en:'Other'},
];

const BentoField = ({ label, children, span }: AnyProps) => (
  <div className={`bg-white px-3 py-1.5 flex flex-col gap-px min-h-control ${span ? '' : ''}`} {...(span ? {style:{gridColumn:span}} : {})}>
    <span className="edo-cell-label text-muted-foreground text-micro tracking-meta">{label}</span>
    {children}
  </div>
);

const BentoInput = ({ value, onChange, placeholder, type='text' }: AnyProps) => (
  <input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} className="bg-transparent border-0 outline-none p-0 font-inherit text-detail tracking-copy-tight w-full text-foreground"/>
);

const Step7Contact = ({ lang, contact, setContact, p, configMode }: AnyProps) => {
  const isCyclo = p && p.isCyclo;
  const hideProductFields = !!configMode;
  const toggleType = (k) => { const cur = contact.typesArticles || []; const next = cur.includes(k) ? cur.filter(x=>x!==k) : [...cur, k]; setContact({...contact, typesArticles: next}); };
  return (<div>
    <div className="px-6 border-b border-foreground flex items-center h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">05 · {lang==='fr'?'Vos coordonnées':'Your details'}</span></div>
    <div className="grid grid-cols-2 gap-px bg-black border-b border-foreground">
      <div className="col-span-2 grid grid-cols-3 gap-px bg-black"><BentoField label={lang==='fr'?'Marque':'Brand'}><BentoInput value={contact.marque} onChange={v=>setContact({...contact,marque:v})} placeholder="—"/></BentoField><BentoField label={lang==='fr'?'Société *':'Company *'}><BentoInput value={contact.societe} onChange={v=>setContact({...contact,societe:v})} placeholder="—"/></BentoField><BentoField label="SIREN *"><BentoInput value={contact.siren} onChange={v=>setContact({...contact,siren:v})} placeholder="—"/></BentoField></div>
      <BentoField label={lang==='fr'?'Adresse de facturation *':'Billing address *'} span="1 / 3"><BentoInput value={contact.adresseFacturation} onChange={v=>setContact({...contact,adresseFacturation:v})} placeholder="—"/></BentoField>
      <BentoField label={lang==='fr'?'Nom *':'Last name *'}><BentoInput value={contact.nom} onChange={v=>setContact({...contact,nom:v})} placeholder="—"/></BentoField>
      <BentoField label={lang==='fr'?'Prénom *':'First name *'}><BentoInput value={contact.prenom} onChange={v=>setContact({...contact,prenom:v})} placeholder="—"/></BentoField>
      <BentoField label="Email *"><BentoInput value={contact.email} type="email" onChange={v=>setContact({...contact,email:v})} placeholder="—"/></BentoField>
      <BentoField label={lang==='fr'?'Téléphone *':'Phone *'}><BentoInput value={contact.tel} type="tel" onChange={v=>setContact({...contact,tel:v})} placeholder="—"/></BentoField>
      {!isCyclo && !hideProductFields && (<>
        <div className="bg-white px-3 py-1.5 col-span-2 flex flex-col gap-1 min-h-control"><span className="edo-cell-label text-muted-foreground text-micro tracking-meta">{lang==='fr'?"Type d'articles *":'Item types *'}</span><div className="grid grid-cols-5 gap-1">{ARTICLE_TYPES.map(t=>{ const on = (contact.typesArticles||[]).includes(t.k); return (<button key={t.k} onClick={()=>toggleType(t.k)} className={`${on ? 'bg-foreground text-white border-foreground' : 'bg-transparent text-foreground border-border'} border px-2 py-1 font-inherit text-caption cursor-pointer tracking-copy-tight inline-flex items-center justify-start gap-1 whitespace-nowrap min-w-0`}><span className={`w-2 h-2 border ${on ? 'border-white bg-primary' : 'border-muted-foreground bg-transparent'} inline-flex items-center justify-center shrink-0`}>{on && <span className="w-0.5 h-0.5 bg-white"/>}</span><span className="overflow-hidden text-ellipsis">{t[lang]}</span></button>); })}</div>{(contact.typesArticles||[]).includes('autre') && (<input value={contact.autreType||''} onChange={e=>setContact({...contact,autreType:e.target.value})} placeholder={lang==='fr'?"Précisez (autre type d'articles)…":'Specify (other item type)…'} className="mt-0.5 bg-transparent border-0 border-b border-b-border outline-none py-1 px-0 font-inherit text-caption tracking-copy-tight w-full text-foreground"/>)}</div>
        <BentoField label={lang==='fr'?'Qté articles (SKUs) *':'Qty items (SKUs) *'}><BentoInput value={contact.quantiteArticles} type="number" onChange={v=>setContact({...contact,quantiteArticles:v})} placeholder="—"/></BentoField>
        <BentoField label={lang==='fr'?'Vues / article *':'Views / item *'}><BentoInput value={contact.vuesParArticle} type="number" onChange={v=>setContact({...contact,vuesParArticle:v})} placeholder="—"/></BentoField>
      </>)}
      <div className="bg-white px-3 py-1.5 col-span-2 flex flex-col gap-0.5 min-h-control"><span className="edo-cell-label text-muted-foreground text-micro tracking-meta">{lang==='fr'?'Autres informations':'Other information'}</span><textarea value={contact.autresInfos||''} onChange={e=>setContact({...contact,autresInfos:e.target.value})} placeholder={lang==='fr'?'Contraintes, inspirations, références… (facultatif)':'Constraints, inspirations, references… (optional)'} className="w-full box-border bg-transparent border-0 outline-none p-0 font-inherit text-caption min-h-7 resize-y text-foreground"/></div>
      <label className="col-span-2 bg-white px-3 py-1.5 flex flex-col gap-0.5 cursor-pointer min-h-control"><span className="edo-cell-label text-muted-foreground text-micro tracking-meta">CGV *</span><div className="flex items-center gap-2"><input type="checkbox" checked={!!contact.cgvAccepted} onChange={e=>setContact({...contact,cgvAccepted:e.target.checked})} className="w-3.5 h-3.5 accent-primary cursor-pointer shrink-0"/><span className="text-caption leading-snug text-foreground">{lang==='fr' ? <>J'accepte les <a href="#" onClick={e=>e.preventDefault()} className="text-primary underline">conditions générales de vente</a> et les modalités de paiement.</> : <>I accept the <a href="#" onClick={e=>e.preventDefault()} className="text-primary underline">terms and conditions of sale</a> and payment terms.</>}</span></div></label>
    </div>
  </div>);
};

const SidePanel = ({ lang, p, selected, months, slotType, hours, cycloMode, rows, total, isPreview, step, plateaus, perPlateau }: AnyProps) => {
  const slotLbl = isPreview ? (lang==='fr'?'estimation live':'live estimate') : p.isCyclo ? (cycloMode==='halfH'?'5h':(cycloMode==='fullH'?'10h':(lang==='fr'?'10h éditorial':'10h editorial'))) : p.isVisite ? (lang==='fr'?'visite':'visit') : (slotType==='hour'? `${hours}h`:(slotType==='half'?(()=>{const hh=Math.max(4,Math.min(7,hours||4));return hh===4?(lang==='fr'?'½ j':'½ d'):`${hh}h`;})():(()=>{ const totalH = hours || 8; const fullDays = Math.floor(totalH / 8); const extraH = totalH - fullDays * 8; const dUnit = lang==='fr'?'j':'d'; let s = `${fullDays} ${dUnit}`; if (extraH === 4) s += lang==='fr'?' + ½ j':' + ½ d'; else if (extraH > 0) s += ` + ${extraH}h`; return s; })()));
  const title = isPreview ? (lang==='fr'?'Estimation':'Estimate') : p[lang];
  return (<div className="bg-foreground md:col-start-3 md:row-start-2 text-white p-6 overflow-auto flex flex-col gap-3.5 min-h-0"><div><span className="edo-cell-label text-white/55">{lang==='fr'?'Votre devis':'Your quote'}</span><h2 className="m-0 mt-2 text-tile-large font-light tracking-headline text-white/85">{title}</h2><div className="font-mono text-label text-white/55 mt-1 tracking-caption">{slotLbl}</div></div>{(() => { const list = (plateaus || []).filter(Boolean); const isMulti = list.length > 1; if (isMulti) { const datedList = list.map(k => ({k, px: BOOK_PLATEAUX.find(x => x.k === k), d: (perPlateau||{})[k]?.date})).filter(x => x.d); if (datedList.length === 0) return null; return (<div className="pt-3.5 border-t border-white/10"><span className="edo-cell-label text-white/55 mb-1.5 block">{lang==='fr'?'Dates':'Dates'}</span><div className="flex flex-col gap-1.5">{datedList.map(({k, px, d}) => (<div key={k} className="flex justify-between items-baseline gap-2 text-detail"><span className="text-white/55 font-mono text-label tracking-caption uppercase">{px ? px[lang] : k}</span><span className="tracking-copy-tight">{d.d} {months[d.m]} {d.y}</span></div>))}</div></div>); } if (!selected) return null; return (<div className="pt-3.5 border-t border-white/10"><span className="edo-cell-label text-white/55 mb-1.5 block">{lang==='fr'?'Date':'Date'}</span><div className="text-cell tracking-copy-tight">{selected.d} {months[selected.m]} {selected.y}</div></div>); })()}<div className="pt-3.5 border-t border-white/10 flex-1 min-h-0 flex flex-col"><span className="edo-cell-label text-white/55 mb-2.5 block">{lang==='fr'?'Détail':'Breakdown'}</span><div className="flex flex-col gap-1.5 overflow-auto pr-1">{rows.length===0 && <span className="text-caption text-white/40">—</span>}{rows.map((r,i)=>(<div key={i} className="flex flex-col gap-0.5"><div className="flex justify-between items-baseline gap-2 text-caption"><span className="tracking-copy-tight">{(() => { const idx = r.lbl.indexOf(' · '); if (idx === -1) return <span className="text-white/75">{r.lbl}</span>; return (<><span className="text-white/40">{r.lbl.slice(0, idx)}</span><span className="text-white/75">{r.lbl.slice(idx)}</span></>); })()}</span><span className="font-mono tabular-nums text-white whitespace-nowrap">{r.onReq ? (lang==='fr'?'sur demande':'on request') : `${fmtEUR(r.amt)} €`}</span></div>{r.breakdown && r.breakdown.length > 0 && (<div className="pl-0.5 flex flex-col gap-px">{r.breakdown.map((b, bi) => { const viewLbl = b.labels ? b.labels[lang] : null; const formula = b.imagesPerSku && b.imagesPerSku > 1 ? `${b.qty} × ${b.imagesPerSku} × ${fmtEUR(b.unit)} €` : `${b.qty} × ${fmtEUR(b.unit)} €`; const line = viewLbl ? `${viewLbl} · ${formula}` : formula; return (<div key={bi} className="flex justify-between gap-2 font-mono text-micro text-white/40 tracking-caption"><span>→ {line}</span><span className="tabular-nums">{fmtEUR(b.subtotal)} €</span></div>); })}</div>)}</div>))}</div></div><div className="pt-3.5 border-t border-white/25"><div className="flex justify-between items-baseline"><span className="font-mono text-caption tracking-ui uppercase text-white/65">Total HT</span><span className="text-page-title font-light tracking-headline tabular-nums">{fmtEUR(total)} €</span></div><div className="font-mono text-micro text-white/45 mt-1 tracking-ui">TVA 20% · {fmtEUR(total*1.2)} € TTC</div>{rows.some(r=>r.estimate) && (<div className="font-mono text-micro text-white/45 mt-1.5 tracking-caption leading-normal">{lang==='fr' ? '⚠ Prix post-production estimatif — ajusté après brief selon volume et complexité.' : '⚠ Post-production price is an estimate — adjusted after brief based on volume and complexity.'}</div>)}</div></div>);
};

const Toggle = ({ on, onClick }: AnyProps) => (
  <button onClick={onClick} className={`w-11.5 h-6.5 ${on ? 'bg-primary' : 'bg-border'} border-0 rounded-full relative cursor-pointer transition-colors duration-150`}>
    <span className={`absolute top-1 left-toggle-thumb ${on ? 'translate-x-5' : 'translate-x-0'} w-5 h-5 bg-white rounded-full transition-transform duration-150 shadow-toggle`}/>
  </button>
);

const Confirmation = ({ lang, openMenu, goto, setLang, plateau, selected, arrivalHour, rentalHours, plateaus, perPlateau, total, rows, contact, months, mode }: AnyProps) => {
  const isMultiPlateau = (plateaus || []).filter(Boolean).length > 1;
  const fmtTime = (h) => `${String(h).padStart(2,'0')}:00`;
  const ref = React.useMemo(()=>{ const prefix = mode==='quote' ? 'EDO-Q-' : mode==='booking' ? 'EDO-R-' : 'EDO-'; return prefix + Math.random().toString(36).substr(2,6).toUpperCase(); },[mode]);
  const copy = (() => {
    if (mode==='quote') return { tag: lang==='fr'?'Devis envoyé':'Quote sent', status: lang==='fr'?'Devis':'Quote', title: lang==='fr'?'Votre devis arrive.':'Your quote is on its way.', body: lang==='fr' ? `Nous vous envoyons votre devis détaillé pour le plateau ${plateau[lang]} par e-mail sous 24h (jours ouvrés). Aucune date n'est pas bloquée à ce stade — vous restez libre de réserver ensuite.` : `We're sending your detailed quote for the ${plateau[lang]} stage by email within 24h (working days). No date is held yet — you stay free to book later.` };
    if (mode==='booking') return { tag: lang==='fr'?'Réservation confirmée':'Booking confirmed', status: lang==='fr'?'Réservée':'Booked', title: lang==='fr'?'C’est réservé.':'You’re booked.', body: lang==='fr' ? `Nous avons bien enregistré votre réservation pour le plateau ${plateau[lang]}. Un membre de l'équipe vous recontacte sous 24h (jours ouvrés) pour confirmer les modalités de paiement.` : `We've locked in your booking for the ${plateau[lang]} stage. A team member will contact you within 24h (working days) to confirm payment terms.` };
    return { tag: lang==='fr'?'Demande envoyée':'Request sent', status: lang==='fr'?'Confirmée':'Confirmed', title: (lang==='fr'?'Merci, ':'Thank you, ')+(contact.prenom||contact.nom||''), body: lang==='fr' ? "Nous avons bien reçu votre demande pour le cyclorama. Un membre de l'équipe vous recontacte sous 24h (jours ouvrés) pour confirmer les détails." : "We've received your cyclorama request. A team member will contact you within 24h (working days) to confirm details." };
  })();
  const navBtnCls = "edo-focus-ring bg-white border border-border cursor-pointer font-mono text-caption tracking-meta uppercase text-foreground px-5 h-control inline-flex items-center gap-2 transition-all duration-150 hover:scale-102 hover:border-foreground";
  const navBtnPrimaryCls = "edo-focus-ring bg-foreground border-0 cursor-pointer text-white font-mono text-caption tracking-meta uppercase px-cell-lg h-control inline-flex items-center gap-2 transition-all duration-150 hover:scale-102";
  return (<div className="grid w-full gap-px bg-black overflow-y-auto md:h-full md:grid-cols-app md:grid-rows-app md:overflow-hidden">
    <PageHeader
      lang={lang}
      title={lang==='fr'?'Réservation':'Booking'}
      subtitle={copy.tag}
      className="col-span-full h-14 md:col-start-1 md:col-span-2 md:row-start-1 md:h-full"
      onMenuClick={openMenu}
      onLogoClick={()=>goto('home')}
      onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
    />
    <div className="bg-black overflow-auto flex flex-col gap-px md:col-span-2 md:row-start-2 md:min-h-0">
      <div className="grid gap-px bg-black grid-cols-1 md:grid-cols-confirmation-hero">
        <div className="bg-white pt-7 px-12 pb-6 flex flex-col gap-2.5 min-h-44"><div className="inline-flex items-center gap-2.5 py-1.5 px-3 bg-primary text-white font-mono text-micro tracking-label uppercase self-start">● {copy.status}</div><h1 className="m-0 text-hero font-light tracking-display leading-solid text-balance">{copy.title}</h1><p className="m-0 text-detail text-muted-foreground leading-normal max-w-xl text-pretty">{copy.body}</p></div>
        <div className="bg-white p-6 flex flex-col justify-between gap-3.5 min-h-44"><div className="flex flex-col gap-3.5"><div><div className="edo-cell-label text-muted-foreground mb-1">{lang==='fr'?'Référence':'Reference'}</div><div className="font-mono text-cell tracking-ui text-foreground">{ref}</div></div><div><div className="edo-cell-label text-muted-foreground mb-1">{lang==='fr'?'Émis le':'Issued'}</div><div className="font-mono text-caption text-foreground">{new Date().toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div></div></div><div><div className="edo-cell-label text-muted-foreground mb-1">{lang==='fr'?'Contact':'Contact'}</div><div className="text-detail font-medium tracking-copy-tight">{[contact.prenom,contact.nom].filter(Boolean).join(' ')||'—'}</div><div className="text-caption text-muted-foreground">{contact.email||'—'}</div></div></div>
      </div>
      <div className="grid grid-cols-4 gap-px bg-black">
        <div className="bg-white px-5 py-3"><div className="edo-cell-label text-muted-foreground mb-1">{lang==='fr'?'Plateau':'Stage'}</div><div className="text-cell font-medium tracking-headline">{isMultiPlateau ? plateaus.map(k => { const px = BOOK_PLATEAUX.find(x=>x.k===k); return px?px[lang]:k; }).join(' · ') : plateau[lang]}</div></div>
        <div className="bg-white px-5 py-3"><div className="edo-cell-label text-muted-foreground mb-1">{isMultiPlateau ? (lang==='fr'?'Dates':'Dates') : (lang==='fr'?'Date':'Date')}</div>{isMultiPlateau ? (<div className="flex flex-col gap-1">{plateaus.map(k => { const px = BOOK_PLATEAUX.find(x => x.k === k); const st = (perPlateau || {})[k] || {}; const d = st.date; const ah = st.arrivalHour != null ? st.arrivalHour : 10; const stHours = st.hours != null ? st.hours : (st.slotType==='hour' ? 1 : st.slotType==='half' ? 4 : 8); const stRH = px && px.isCyclo ? ((st.cycloMode||'halfH')==='halfH' ? 5 : 10) : px && px.isVisite ? 1 : stHours; return (<div key={k} className="flex justify-between gap-2 text-caption font-mono tracking-caption"><span className="text-muted-foreground">{px?px[lang]:k}</span><span className={`${d ? 'text-foreground' : 'text-edo-gray-500'} tabular-nums`}>{d ? `${d.d} ${months[d.m]} · ${fmtTime(ah)}–${fmtTime(ah+stRH)}` : (mode==='quote'?(lang==='fr'?'Non fixée':'Not set'):'—')}</span></div>); })}</div>) : (<div className={`text-cell font-medium tracking-headline ${selected?'text-foreground':'text-muted-foreground'}`}>{selected ? `${selected.d} ${months[selected.m]} ${selected.y} · ${fmtTime(arrivalHour||10)}–${fmtTime((arrivalHour||10)+(rentalHours||0))}` : (mode==='quote'?(lang==='fr'?'Non fixée':'Not set'):'—')}</div>)}</div>
        <div className="bg-white px-5 py-3"><div className="edo-cell-label text-muted-foreground mb-1">{lang==='fr'?'Société':'Company'}</div><div className="text-detail font-medium tracking-copy-tight">{contact.societe||'—'}</div></div>
        <div className="bg-white px-5 py-3"><div className="edo-cell-label text-muted-foreground mb-1">SIREN</div><div className="font-mono text-caption tracking-caption">{contact.siren||'—'}</div></div>
      </div>
      <div className="bg-white px-12 py-cell pb-5"><div className="edo-cell-label text-muted-foreground mb-2.5">{lang==='fr'?'Détail du devis*':'Quote breakdown*'}</div><div className="flex flex-col">{rows.map((r,i)=>(<div key={i} className={`flex flex-col py-1.5 gap-0.5 ${i===rows.length-1 ? '' : 'border-b border-b-border'}`}><div className="flex justify-between items-baseline text-caption"><span className="tracking-copy-tight">{(() => { const idx = r.lbl.indexOf(' · '); if (idx === -1) return <span className="text-foreground">{r.lbl}</span>; return (<><span className="text-muted-foreground">{r.lbl.slice(0, idx)}</span><span className="text-foreground">{r.lbl.slice(idx)}</span></>); })()}</span><span className="font-mono tabular-nums text-foreground">{r.onReq ? (lang==='fr'?'sur demande':'on request') : `${fmtEUR(r.amt)} €`}</span></div>{r.breakdown && r.breakdown.length > 0 && (<div className="flex flex-col gap-px mt-0.5">{r.breakdown.map((b, bi) => { const viewLbl = b.labels ? b.labels[lang] : null; const formula = b.imagesPerSku && b.imagesPerSku > 1 ? `${b.qty} × ${b.imagesPerSku} × ${fmtEUR(b.unit)} €` : `${b.qty} × ${fmtEUR(b.unit)} €`; const line = viewLbl ? `${viewLbl} · ${formula}` : formula; return (<div key={bi} className="flex justify-between gap-2 font-mono text-label text-muted-foreground tracking-caption"><span>→ {line}</span><span className="tabular-nums">{fmtEUR(b.subtotal)} €</span></div>); })}</div>)}</div>))}<div className="flex justify-between items-baseline mt-3 pt-2.5 border-t-2 border-t-foreground"><span className="font-mono text-caption tracking-meta uppercase">Total HT*</span><span className="text-page-title font-light tracking-display tabular-nums">{fmtEUR(total)} €</span></div><div className="font-mono text-label text-muted-foreground mt-2.5 tracking-caption leading-copy pt-2 border-t border-t-border">{lang==='fr' ? '* Les montants affichés sont une estimation indicative basée sur les éléments renseignés et ne constituent pas un devis définitif. Le devis final, contractuel et signable, vous sera adressé par e-mail après brief avec notre équipe et pourra être ajusté selon le volume réel, la complexité, les vues additionnelles ou la post-production.' : '* The amounts shown are an indicative estimate based on the information provided and do not constitute a final quote. The final, contractual and signable quote will be sent by email after a brief with our team and may be adjusted based on actual volume, complexity, additional views or post-production.'}</div></div></div>
      <div className="grid grid-cols-2 gap-px bg-black">
        <div className="bg-white px-5 py-3 flex items-center"><button onClick={()=>goto('home')} className={navBtnCls.replace('bg-white','bg-transparent').replace('border border-border','border-0').replace('px-5','px-0')}>← {lang==='fr'?"Retour à l'accueil":'Back home'}</button></div>
        <div className="bg-white px-5 py-3 flex items-center justify-end"><button onClick={()=>window.location.reload()} className={navBtnPrimaryCls.replace('bg-foreground','bg-primary')}>{lang==='fr'?'Nouvelle demande':'New request'} <IconArrowRight width="14" height="14"/></button></div>
      </div>
    </div>
  </div>);
};

export { BookPageV2 };
