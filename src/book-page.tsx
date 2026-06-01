import React, { useState as useStateBook, useMemo as useMemoBook, useCallback as useCallbackBook } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryState, parseAsInteger } from 'nuqs';
import { usePageContext } from './router';
import { CellLabel, EmptyState, IconArrowRight, PageHeader, buildMainNav } from './ui';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { buildWebPageSchema, buildBreadcrumbSchema } from './lib/structured-data';
import { MarqueeCell } from './cells';
import { createBooking } from './lib/bookings';
import { validateContact, type ContactFormErrors } from './lib/booking-schema';
import { loadDraft, clearDraft, useBookingDraftSaver } from './lib/use-booking-draft';
import { useAvailability, isHourBlocked, clearAvailabilityCache } from './lib/availability';
import type { Lang } from './types';
import type { BookingSessionData } from './lib/bookings';
import { common, booking as bookingMsg } from './i18n/messages';
import { pathForStep, confirmationPath, type BookMode } from './book/book-routes';
import { saveConfirmation, type ConfirmationMode } from './book/confirmation-snapshot';

type BilingualText = Record<Lang, string>;
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

interface BookPageV2Props {
  forcedStep?: number;
  forceManual?: boolean;
}

const BookPageV2 = ({ forcedStep, forceManual }: BookPageV2Props = {}) => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const navigate = useNavigate();
  useDocumentMeta('book', lang, { noIndex: true });
  const bookPathname = lang === 'fr' ? '/reserver' : '/book';
  useStructuredData('book', [
    buildWebPageSchema({
      lang,
      pathname: bookPathname,
      name: lang === 'fr' ? 'Réserver — E-Do Studio Paris' : 'Book — E-Do Studio Paris',
      description:
        lang === 'fr'
          ? 'Réservez votre créneau au studio E-Do. Sélectionnez un plateau, une date et configurez votre session.'
          : 'Book your slot at E-Do Studio. Select a stage, date and configure your session.',
    }),
    buildBreadcrumbSchema(
      [
        { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
        { name: lang === 'fr' ? 'Réserver' : 'Book', pathname: bookPathname },
      ],
      lang,
    ),
  ]);
  const today = new Date();
  const [draft] = useStateBook(() => loadDraft());
  // Manual mode keeps a single URL (/reserver/manuel) and tracks the current
  // step via nuqs (`?step=N`) instead of routing per step. This way back /
  // forward navigation works and reloading the page keeps the user on the
  // step they were on. Configurator mode uses TanStack routes per step and
  // ignores this query parameter.
  const [manualStepQuery, setManualStepQuery] = useQueryState(
    'step',
    parseAsInteger,
  );
  const [step, setStep] = useStateBook<number>(() => {
    if (forceManual && manualStepQuery != null) return manualStepQuery;
    if (forcedStep != null) return forcedStep;
    if (draft) return draft.step;
    try { if (localStorage.getItem('edo-book-plateau')) return 1; } catch(e){}
    return 1;
  });
  const [configGlobal, setConfigGlobal] = useStateBook<ConfigGlobal>(() => draft ? draft.configGlobal as ConfigGlobal : { projectType: 'ecom', urgency: 'flex', postprod: false });
  const [configSessions, setConfigSessions] = useStateBook<BookingSession[]>(() => draft ? draft.configSessions as BookingSession[] : [makeBlankSession()]);
  const [activeSessionIdx, setActiveSessionIdx] = useStateBook<number>(() => draft ? draft.activeSessionIdx : 0);
  const [configApplied, setConfigApplied] = useStateBook<boolean>(() => {
    if (forceManual) return false;
    if (forcedStep != null && forcedStep !== 0 && forcedStep !== 1) return true;
    return draft ? draft.configApplied : false;
  });
  const [plateau, setPlateau] = useStateBook<string | null>(() => { if (draft) return draft.plateau; try { const pre = localStorage.getItem('edo-book-plateau'); if (pre) { localStorage.removeItem('edo-book-plateau'); return pre; } } catch(e){} return null; });
  const [plateaus, setPlateaus] = useStateBook<string[]>(() => draft ? draft.plateaus : (plateau ? [plateau] : []));
  const [perPlateau, setPerPlateau] = useStateBook<Record<string, PerPlateauState>>(() => {
    if (draft) return draft.perPlateau as Record<string, PerPlateauState>;
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
  const [viewY, setViewY] = useStateBook<number>(() => draft ? draft.viewY : today.getFullYear());
  const [viewM, setViewM] = useStateBook<number>(() => draft ? draft.viewM : today.getMonth());
  const [selected, setSelected] = useStateBook<DateSelection | null>(() => draft ? draft.selected : null);
  const [arrivalHour, setArrivalHour] = useStateBook<number>(() => draft ? draft.arrivalHour : 10);
  const [dateIdx, setDateIdx] = useStateBook<number>(() => draft ? draft.dateIdx : 0);
  const [slotType, setSlotType] = useStateBook<string>(() => draft ? draft.slotType : 'hour');
  const [hours, setHours] = useStateBook<number>(() => draft ? draft.hours : 1);
  const [cycloMode, setCycloMode] = useStateBook<string>(() => draft ? draft.cycloMode : 'halfH');
  const [paint, setPaint] = useStateBook<boolean>(() => draft ? draft.paint : false);
  const [kwh, setKwh] = useStateBook<number>(() => draft ? draft.kwh : 0);
  const [team, setTeam] = useStateBook<TeamState>(() => draft ? draft.team as TeamState : {});
  const [pp, setPp] = useStateBook<Record<string, unknown>>(() => draft ? draft.pp : {});
  const [contact, setContact] = useStateBook<ContactState>(() => draft ? { ...(draft.contact as unknown as ContactState), cgvAccepted: false } : { marque:'', societe:'', siren:'', adresseFacturation:'', nom:'', prenom:'', email:'', tel:'', typesArticles:[], quantiteArticles:'', vuesParArticle:'', autresInfos:'', cgvAccepted:false });
  const [contactErrors, setContactErrors] = useStateBook<ContactFormErrors>({});
  const [saving, setSaving] = useStateBook<boolean>(false);
  const [saveError, setSaveError] = useStateBook<string | null>(null);
  const [availRefreshKey, setAvailRefreshKey] = useStateBook(0);
  const saveDraft = useBookingDraftSaver(() => ({
    step, configGlobal, configSessions, activeSessionIdx, configApplied,
    plateau, plateaus, perPlateau, slotType, hours, cycloMode, paint, kwh,
    team, pp, contact: contact as unknown as Record<string, unknown>, selected, arrivalHour, dateIdx, viewY, viewM,
  }));
  React.useEffect(saveDraft, [step, configGlobal, configSessions, activeSessionIdx, configApplied, plateau, plateaus, perPlateau, slotType, hours, cycloMode, paint, kwh, team, pp, contact, selected, arrivalHour, dateIdx, viewY, viewM, saveDraft]);
  React.useEffect(() => {
    if (forcedStep == null) return;
    if (step !== forcedStep) setStep(forcedStep);
  }, [forcedStep]);
  React.useEffect(() => {
    if (forceManual && configApplied) setConfigApplied(false);
  }, [forceManual]);
  // Manual mode: sync the URL ?step= ↔ internal step state. The pair of
  // effects below stops looping once the two sides agree (the equality
  // guards short-circuit on the second pass).
  React.useEffect(() => {
    if (!forceManual) return;
    if (manualStepQuery != null && manualStepQuery !== step) {
      setStep(manualStepQuery);
    }
  }, [manualStepQuery, forceManual]);
  React.useEffect(() => {
    if (!forceManual) return;
    if (step !== manualStepQuery) {
      setManualStepQuery(step);
    }
  }, [step, forceManual]);
  const goToStep = useCallbackBook((n: number, modeOverride?: BookMode) => {
    setStep(n);
    const nextMode: BookMode = modeOverride ?? (forceManual ? 'manual' : (configApplied || n === 0 ? 'config' : 'manual'));
    const target = pathForStep(lang, nextMode, n);
    if (typeof window !== 'undefined' && window.location.pathname !== target) {
      navigate({ to: target });
    }
  }, [lang, configApplied, forceManual, navigate]);
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
        const sessionTag = (configSessions.length > 1) ? `${bookingMsg.session[lang]} ${String(idx+1).padStart(2,'0')} · ` : '';
        if (px.isCyclo || rec.onRequest) { previewRows.push({ lbl: `${sessionTag}${px[lang]} · ${common.onRequest[lang]}`, amt: 0, onReq: true }); }
        else if (rec.slotType === 'hour') { const h = rec.hours || 1; previewRows.push({ lbl: `${sessionTag}${px[lang]} · ${h}h`, amt: +(((px.rates.hour ?? 0) * h).toFixed(2)) }); }
        else if (rec.slotType === 'half') { const hh = Math.max(4, Math.min(7, rec.hours || 4)); const amt = hh === 4 ? (px.rates.half ?? 0) : +(((px.rates.half ?? 0) * hh / 4).toFixed(2)); previewRows.push({ lbl: `${sessionTag}${px[lang]} · ${bookingMsg.halfDay[lang]} (${hh}h)`, amt }); }
        else if (rec.slotType === 'full') {
          const totalH = rec.hours || 8; const fullDays = Math.floor(totalH / 8); const extraH = totalH - fullDays * 8;
          if (fullDays >= 1) { previewRows.push({ lbl: `${sessionTag}${px[lang]} · ${fullDays} ${lang==='fr'?(fullDays>1?'journées (8h)':'journée (8h)'):(fullDays>1?'days (8h)':'day (8h)')}`, amt: +(((px.rates.full ?? 0) * fullDays).toFixed(2)) }); }
          if (extraH > 0) { const hourlyFromFull = (px.rates.full ?? 0) / 8; const amt = +(hourlyFromFull * extraH).toFixed(2); const lbl = extraH === 4 ? `${sessionTag}${px[lang]} · ${bookingMsg.halfDay[lang]} (4h)` : `${sessionTag}${px[lang]} · ${extraH}h`; previewRows.push({ lbl, amt }); }
        }
        if (s.postprod) { const pp = computePostprodPrice(s); if (pp) { previewRows.push({ lbl: `${sessionTag}${bookingMsg.postProduction[lang]} · ${pp.images} ${bookingMsg.images[lang]}`, amt: pp.amount, estimate: true, breakdown: pp.breakdown, perView: pp.perView }); } else { previewRows.push({ lbl: `${sessionTag}${bookingMsg.postProduction[lang]} · ${common.onRequest[lang]}`, amt: 0, onReq: true }); } }
        if (s.postprodVideo) { previewRows.push({ lbl: `${sessionTag}${bookingMsg.videoEditing[lang]}`, amt: 0, onReq: true }); }
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
        if (st.cycloMode==='halfH') pRows.push({lbl:bookingMsg.cyclo5h[lang], amt:px.rates.halfH ?? 0});
        else if (st.cycloMode==='fullH') pRows.push({lbl:bookingMsg.cyclo10h[lang], amt:px.rates.fullH ?? 0});
        else if (st.cycloMode==='editorial') pRows.push({lbl:bookingMsg.cyclo10hEditorial[lang], amt:0, onReq:true});
        if (st.paint) pRows.push({lbl:bookingMsg.cycloPaint[lang], amt:CYCLO_EXTRAS.paint});
        if ((st.kwh ?? 0) > 0) pRows.push({lbl:`${bookingMsg.electricity[lang]} · ${st.kwh} kWh`, amt:+((st.kwh ?? 0)*CYCLO_EXTRAS.kwh).toFixed(2)});
      } else if (px.isVisite) { pRows.push({lbl:bookingMsg.studioVisit[lang], amt:0}); }
      else {
        const h = st.hours || 1;
        if (st.slotType==='hour') pRows.push({lbl:`${px[lang]} · ${h}h`, amt:(px.rates.hour ?? 0)*h});
        else if (st.slotType==='half') { const hh = Math.max(4, Math.min(7, h)); const amt = hh===4 ? (px.rates.half ?? 0) : +(((px.rates.half ?? 0) * hh / 4).toFixed(2)); pRows.push({lbl:`${px[lang]} · ${bookingMsg.halfDay[lang]} (${hh}h)`, amt}); }
        else { const totalH = h || 8; const fullDays = Math.floor(totalH / 8); const extraH = totalH - fullDays * 8;
          if (fullDays > 0) { pRows.push({ lbl: `${px[lang]} · ${fullDays} ${lang==='fr'?(fullDays>1?'journées (8h)':'journée (8h)'):(fullDays>1?'days (8h)':'day (8h)')}`, amt: +(((px.rates.full ?? 0) * fullDays).toFixed(2)) }); }
          if (extraH > 0) { const hourlyFromFull = (px.rates.full ?? 0) / 8; const extraAmt = +(hourlyFromFull * extraH).toFixed(2); if (extraH === 4) { pRows.push({lbl:`${px[lang]} · ${bookingMsg.halfDay[lang]} (4h)`, amt:extraAmt}); } else { pRows.push({lbl:`${px[lang]} · ${extraH}h ${bookingMsg.proRataDay[lang]}`, amt:extraAmt}); } }
        }
      }
      const plateauRentalHours = px.isCyclo ? (st.cycloMode === 'halfH' ? 5 : 10) : px.isVisite ? 1 : (st.slotType === 'hour' ? (st.hours||1) : st.slotType === 'half' ? Math.max(4,Math.min(7,st.hours||4)) : (st.hours||8));
      const plateauTeam = st.team || {};
      EQUIPE.forEach(e=>{ const val = plateauTeam[e.k]; if (!val) return; if (e.unit === 'hour') { if (typeof val === 'number' && val>0) { const amt = +(e.price * plateauRentalHours * val).toFixed(2); pRows.push({lbl:`${e[lang]} · ${val} × ${plateauRentalHours}h`, amt}); } } else { if (val===true) pRows.push({lbl:`${e[lang]} · ${common.onRequest[lang]}`, amt:0, onReq:true}); } });
      const plateauPostprod = st.postprod || {};
      if (plateauPostprod.enabled) {
        if ((plateauPostprod.amount ?? 0) > 0) { pRows.push({ lbl: `${bookingMsg.postProduction[lang]} · ${plateauPostprod.images ?? 0} ${bookingMsg.images[lang]}`, amt: plateauPostprod.amount ?? 0, estimate: true, breakdown: plateauPostprod.breakdown, perView: plateauPostprod.perView }); }
        else { pRows.push({ lbl: `${bookingMsg.postProduction[lang]} · ${common.onRequest[lang]}`, amt: 0, onReq: true }); }
        if (plateauPostprod.video) { pRows.push({ lbl: bookingMsg.videoEditing[lang], amt: 0, onReq: true }); }
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
    const requireProductFields = !p.isCyclo && !p.isVisite && !configApplied;
    const result = validateContact(contact, lang as 'fr' | 'en', { requireProductFields });
    return result.success;
  };
  const runContactValidation = () => {
    const requireProductFields = !p.isCyclo && !p.isVisite && !configApplied;
    const result = validateContact(contact, lang as 'fr' | 'en', { requireProductFields });
    if (!result.success) { setContactErrors(result.errors); return false; }
    setContactErrors({});
    return true;
  };
  const handleContactNext = (nextN: number | null) => {
    if (!runContactValidation()) return;
    if (nextN !== null) goToStep(nextN);
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
      const dur = r.onRequest ? common.onRequest[lang] : r.slotType==='full' ? (() => { const totalH = r.hours || (r.totalDays ? r.totalDays*8 : 8); const fd = Math.floor(totalH/8); const ex = totalH - fd*8; if (ex===0) return fd>1 ? `${fd}×8h` : '8h'; return `${fd}×8h+${ex}h`; })() : r.slotType==='half' ? `${r.hours}h (½j)` : `${r.hours}h`;
      briefLines.push(`\n${bookingMsg.session[lang]} ${i+1} — ${productLbl}${subLbl}${mediaLbl} → ${px ? px[lang] : r.plateau} · ${dur}`);
      briefLines.push(` ${bookingMsg.quantity[lang]} : ${s.quantity} ${bookingMsg.products[lang]}`);
      if (s.views && s.views.length) { briefLines.push(` ${bookingMsg.views[lang]} : ${s.views.join(', ')}`); } else if (s.viewsCount) { briefLines.push(` ${bookingMsg.viewsPerProduct[lang]} : ${s.viewsCount}`); }
      if (s.postprod) { briefLines.push(` ${bookingMsg.postProduction[lang]} : ${bookingMsg.yes[lang]}${s.postprodVideo ? ` + ${bookingMsg.videoEdit[lang]}` : ''}`); }
    });
    setContact(c => ({ ...c, typesArticles: productLabels, quantiteArticles: String(totalSKUs || ''), vuesParArticle: '', autresInfos: c.autresInfos || '' }));
    setConfigApplied(true);
    goToStep(2, 'config');
  };
  const skipConfig = () => { setConfigApplied(false); goToStep(1, 'manual'); };
  React.useEffect(() => { if (!configApplied) return; seedFromConfig(); }, [configSessions, configGlobal, configApplied]);
  const contentScrollRef = React.useRef<HTMLFormElement | null>(null);
  const innerScrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => { if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0; if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0; }, [step, dateIdx]);
  React.useEffect(() => { if (step === 6) setDateIdx(0); }, [step]);

  const buildSessionsData = useCallbackBook((): BookingSessionData[] => {
    const keys = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []);
    const isMulti = keys.length > 1;
    if (configApplied && configSessions.length > 0) {
      return configSessions.filter(s => s.projectType === 'cyclorama' || (s.projectType === 'ecom' && s.product && Number(s.quantity) > 0)).map(s => {
        const rec = recommendSession(s, configGlobal);
        return {
          plateauKey: rec.plateau,
          slotType: rec.slotType,
          hours: rec.hours || 1,
          date: selected,
          arrivalHour: arrivalHour ?? null,
          cycloMode: rec.cycloMode,
          productType: s.projectType,
          method: s.method,
          submethod: s.submethod,
          media: s.media || [],
          views: s.views || [],
          viewsCount: Number(s.viewsCount) || 0,
          quantity: Number(s.quantity) || 0,
          postprodEnabled: !!s.postprod,
          postprodVideo: !!s.postprodVideo,
        };
      });
    }
    return keys.map(k => {
      const st = perPlateau[k] || {};
      const stDate = isMulti ? (st.date ?? null) : selected;
      const stArrival = isMulti
        ? (stDate ? (st.arrivalHour != null ? st.arrivalHour : 10) : null)
        : (arrivalHour ?? null);
      return {
        plateauKey: k,
        slotType: st.slotType ?? 'hour',
        hours: st.hours || 1,
        date: stDate,
        arrivalHour: stArrival,
        cycloMode: st.cycloMode ?? null,
        productType: configGlobal.projectType || null,
        method: null,
        submethod: null,
        media: [],
        views: [],
        viewsCount: 0,
        quantity: Number(contact.quantiteArticles) || 0,
        postprodEnabled: !!(st.postprod as PostprodState)?.enabled,
        postprodVideo: !!(st.postprod as PostprodState)?.video,
      };
    });
  }, [plateaus, plateau, perPlateau, configApplied, configSessions, configGlobal, contact.quantiteArticles, selected, arrivalHour]);

  const handleSubmit = useCallbackBook(async (submitMode: 'quote' | 'booking' | 'request') => {
    if (!runContactValidation()) return;
    contentScrollRef.current?.requestSubmit();
    setSaving(true);
    setSaveError(null);
    try {
      const sessionsData = buildSessionsData();
      const firstDate = selected || (() => {
        const keys = plateaus && plateaus.length > 0 ? plateaus : [];
        for (const k of keys) {
          const st = perPlateau[k];
          if (st?.date) return st.date;
        }
        return null;
      })();
      const result = await createBooking({
        mode: submitMode,
        contact,
        projectType: configGlobal.projectType || null,
        urgency: configGlobal.urgency || null,
        sessions: sessionsData,
        quote: { rows: priceBreakdown.rows, total: priceBreakdown.total },
        preferredDate: firstDate,
        arrivalHour: arrivalHour ?? null,
      });
      saveConfirmation({
        mode: submitMode as ConfirmationMode,
        savedRef: result.reference ?? null,
        plateauKey: p.k || null,
        plateauName: { fr: p.fr, en: p.en },
        selected: firstDate,
        arrivalHour: arrivalHour ?? null,
        rentalHours,
        plateaus,
        perPlateau: perPlateau as Record<string, unknown>,
        contact: contact as unknown as Record<string, unknown>,
        total: priceBreakdown.total,
        rows: priceBreakdown.rows as unknown[],
        isCyclo: !!p.isCyclo,
      });
      clearDraft();
      navigate({ to: confirmationPath(lang) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('réservé') || msg.includes('already booked')) {
        clearAvailabilityCache();
        setAvailRefreshKey(k => k + 1);
      }
      setSaveError(msg || bookingMsg.saveError[lang]);
    } finally {
      setSaving(false);
    }
  }, [buildSessionsData, selected, plateaus, perPlateau, contact, configGlobal, priceBreakdown, arrivalHour, lang, p, rentalHours, navigate]);

  return (
    <div className="edo-page-enter grid w-full edo-hairline md:h-full md:overflow-hidden md:grid-cols-book md:grid-rows-app">

      {/* Unified header spans cols 1-3 — col 4 hosts the dark "Your Quote"
          label aligned with the quote panel below. Within the header subgrid
          (cols 1-3), the title sits in col 2 and the right block in col 3. */}
      <PageHeader
        lang={lang}
        title={bookingMsg.title[lang]}
        className="col-span-full h-14 md:col-start-1 md:col-end-4 md:row-start-1 md:h-full"
        titleClassName="lg:col-start-2 lg:col-span-1"
        rightBlockClassName="lg:col-start-3"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={buildMainNav({ lang, goto })}
      />

      {/* Desktop col 4 – dark label matching quote panel below */}
      <div className="hidden md:flex h-full items-center bg-foreground px-6 md:col-start-4 md:row-start-1">
        <CellLabel className="text-white/55">{bookingMsg.yourQuote[lang]}</CellLabel>
      </div>

      <div className="bg-white overflow-x-auto flex flex-row md:col-start-1 md:row-start-2 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:min-h-0">
        {STEPS.map((s,i)=>{
          const active = step===s.n;
          const curIdx = STEPS.findIndex(x=>x.n===step);
          const done = curIdx > -1 && i < curIdx;
          const clickable = done || active || (i === curIdx + 1 && canNext()) || s.n===0;
          return (
            <button type="button" key={s.n} onClick={()=>{ if(clickable) goToStep(s.n); }}
              className={`edo-focus-ring flex-none ${active ? 'bg-muted border-b-2 border-b-primary md:border-b-0 md:border-l-3 md:border-l-primary' : 'bg-transparent border-b-2 border-b-transparent md:border-b-0 md:border-l-3 md:border-l-transparent'} ${i<STEPS.length-1 ? 'md:border-b md:border-b-border' : 'md:border-b-0'} px-4 h-12 md:px-6 md:h-control ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'} text-left flex items-center gap-3.5 transition-all duration-150 ${clickable ? 'opacity-100' : 'opacity-35'}`}>
              <span className={`font-mono text-label tracking-meta ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'} min-w-5.5`}>
                {done ? '✓' : String(i+1).padStart(2,'0')}
              </span>
              <span className={`text-detail ${active ? 'font-medium' : 'font-normal'} tracking-copy-tight text-foreground`}>{s[lang]}</span>
            </button>
          );
        })}
      </div>

      <form ref={contentScrollRef} name="booking" aria-label="Booking" onSubmit={(e) => e.preventDefault()} className="bg-white overflow-auto flex flex-col md:col-start-2 md:col-span-2 md:row-start-2 md:min-h-0">
        {mode === 'manual' && (
          <div className="flex flex-col md:flex-row md:items-stretch md:min-h-control bg-muted box-border shrink-0 border-b border-hairline">
            <span className="font-mono text-micro tracking-code uppercase text-muted-foreground px-5 py-3 md:py-0 md:self-center md:pl-5 md:pr-3 flex-1 min-w-0 leading-relaxed">
              {bookingMsg.manualOr[lang]}
              <span className="text-foreground">{bookingMsg.letUsGuide[lang]}</span>
            </span>
            <div className="flex items-stretch border-t border-hairline md:border-t-0 md:flex-none md:w-1/2">
              <button type="button" onClick={()=>{ setPlateau(null); setPlateaus([]); setPerPlateau({}); setSlotType('hour'); setHours(1); setCycloMode('halfH'); setPaint(false); setKwh(0); setTeam({}); setPp({}); setSelected(null); goToStep(1, 'manual'); }}
                className="edo-focus-ring flex-1 bg-transparent border-l border-hairline px-5 py-3 md:py-0 cursor-pointer font-mono text-micro tracking-code uppercase text-foreground whitespace-nowrap leading-normal inline-flex items-center justify-center transition-colors duration-150 hover:bg-white">
                ↻ {common.reset[lang]}
              </button>
              <button type="button" onClick={()=>goToStep(0, 'config')}
                className="edo-focus-ring flex-1 bg-primary border-l border-hairline px-5 py-3 md:py-0 cursor-pointer font-mono text-label tracking-code uppercase text-white whitespace-nowrap leading-normal font-semibold inline-flex items-center justify-center transition-all duration-150 hover:opacity-90">
                ← {bookingMsg.configurator[lang]}
              </button>
            </div>
          </div>
        )}
        <div ref={innerScrollRef} className="flex-1 overflow-y-auto">
          {step===0 && <Step0Configurator lang={lang} global={configGlobal} setGlobal={setConfigGlobal} sessions={configSessions} setSessions={setConfigSessions} activeIdx={activeSessionIdx} setActiveIdx={setActiveSessionIdx} onApply={applyConfig} onSkip={skipConfig} onReset={()=>{ setPlateau(null); setPlateaus([]); setPerPlateau({}); setSlotType('hour'); setHours(1); setCycloMode('halfH'); setPaint(false); setKwh(0); setTeam({}); setPp({}); setSelected(null); setConfigApplied(false); }}/>}
          {step===1 && <Step1Plateau lang={lang} plateau={plateau} setPlateau={setPlateau} plateaus={plateaus} togglePlateau={togglePlateau} setCycloMode={setCycloMode} setSlotType={setSlotType} setHours={setHours} onConfigurator={()=>goToStep(0, 'config')}/>}
          {step===2 && <MultiPlateauStep lang={lang} plateaus={plateaus.length?plateaus:(plateau?[plateau]:[])} perPlateau={perPlateau} setPerPlateau={setPerPlateau} fallback={{slotType,hours,cycloMode,setSlotType,setHours,setCycloMode}} topBanner={(() => { const list = plateaus.length?plateaus:(plateau?[plateau]:[]); const allVisite = list.length>0 && list.every(k => BOOK_PLATEAUX.find(x=>x.k===k)?.isVisite); if (allVisite) return null; return (<div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">02 · {bookingMsg.rentalDuration[lang]}</span><span className="font-mono text-label tracking-caption text-muted-foreground">{list.length > 1 ? bookingMsg.chooseDurationEach[lang] : bookingMsg.chooseDurationSingle[lang]}</span></div>); })()} renderOne={(px: AnyProps, st: AnyProps, setSt: (patch: AnyProps) => void) => (<Step3Slot lang={lang} p={px} slotType={st.slotType||'hour'} setSlotType={(v: string)=>setSt({slotType:v})} hours={st.hours||1} setHours={(v: number)=>setSt({hours:v})} cycloMode={st.cycloMode||'halfH'} setCycloMode={(v: string)=>setSt({cycloMode:v})}/>)}/>}
          {step===3 && <MultiPlateauStep lang={lang} plateaus={plateaus.length?plateaus:(plateau?[plateau]:[])} perPlateau={perPlateau} setPerPlateau={setPerPlateau} fallback={{team,setTeam}} topBanner={<div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">03 · {bookingMsg.teamOptional[lang]}</span></div>} renderOne={(px: AnyProps, st: AnyProps, setSt: (patch: AnyProps) => void) => (<Step5Team lang={lang} p={px} team={st.team || {}} configSessions={configSessions} setTeam={(updater: any) => { const next = typeof updater === 'function' ? updater(st.team || {}) : updater; setSt({team: next}); }}/>)}/>}
          {step===4 && <MultiPlateauStep lang={lang} plateaus={plateaus.length?plateaus:(plateau?[plateau]:[])} perPlateau={perPlateau} setPerPlateau={setPerPlateau} fallback={{postprod:{},setPostprod:()=>{}}} topBanner={<div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">04 · {bookingMsg.postProdOptional[lang]}</span></div>} renderOne={(px: AnyProps, st: AnyProps, setSt: (patch: AnyProps) => void) => (<Step6Postprod lang={lang} plateauKey={px && px.k} postprod={st.postprod || {}} setPostprod={(v: AnyProps) => setSt({postprod: v})}/>)}/>}
          {step===5 && <Step7Contact lang={lang} contact={contact} setContact={setContact} p={p} configMode={configApplied} errors={contactErrors}/>}
          {step===6 && (() => {
            const list = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []);
            if (list.length <= 1) { return <Step2Date lang={lang} p={p} viewY={viewY} viewM={viewM} months={months} days={days} calCells={calCells} selected={selected} setSelected={setSelected} arrivalHour={arrivalHour} setArrivalHour={setArrivalHour} rentalHours={rentalHours} isPast={isPast} nextMonth={nextMonth} prevMonth={prevMonth} refreshKey={availRefreshKey}/>; }
            const safeIdx = Math.max(0, Math.min(dateIdx, list.length - 1));
            const k = list[safeIdx]; const px = BOOK_PLATEAUX.find(x => x.k === k); const st = perPlateau[k] || {};
            const setSt = (patch: PerPlateauState) => setPerPlateau(prev => ({...prev, [k]: {...(prev[k]||{}), ...patch}}));
            const stHours = st.hours != null ? st.hours : (st.slotType==='hour' ? 1 : st.slotType==='half' ? 4 : 8);
            const stRentalHours = px && px.isCyclo ? ((st.cycloMode||'halfH')==='halfH' ? 5 : 10) : px && px.isVisite ? 1 : stHours;
            const stSelected = st.date || null; const stArrival = st.arrivalHour != null ? st.arrivalHour : 10;
            return (<div><div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 md:gap-4 bg-white flex-wrap sticky top-0 z-10"><span className="edo-cell-label text-primary whitespace-nowrap">{lang==='fr'?'Plateau':'Stage'} {String(safeIdx+1).padStart(2,'0')} / {String(list.length).padStart(2,'0')}</span><span className="text-detail font-normal tracking-copy-tight text-foreground">{px ? px[lang] : k}</span><div className="flex gap-1.5 flex-wrap w-full md:w-auto md:ml-auto">{list.map((kk, i) => { const has = perPlateau[kk] && perPlateau[kk].date; const active = i === safeIdx; return (<button type="button" key={kk} onClick={()=>setDateIdx(i)} className={`${active ? 'bg-foreground text-white border-foreground' : has ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border'} border px-2.5 py-1 cursor-pointer font-mono text-label tracking-ui min-w-7 text-center`}>{String(i+1).padStart(2,'0')}{has?' ✓':''}</button>); })}</div></div><Step2Date lang={lang} p={px} viewY={viewY} viewM={viewM} months={months} days={days} calCells={calCells} selected={stSelected} setSelected={(d: DateSelection)=>setSt({date:d})} arrivalHour={stArrival} setArrivalHour={(h: number)=>setSt({arrivalHour:h})} rentalHours={stRentalHours} isPast={isPast} nextMonth={nextMonth} prevMonth={prevMonth} refreshKey={availRefreshKey}/></div>);
          })()}
        </div>

        {saveError && (
          <div className="bg-red-50 border-t border-red-200 px-12 py-3 flex items-center justify-between shrink-0">
            <span className="text-red-700 text-caption">{saveError}</span>
            <button type="button" onClick={()=>setSaveError(null)} className="text-red-500 text-caption font-mono cursor-pointer border-0 bg-transparent hover:text-red-700">✕</button>
          </div>
        )}
        <BookingHubspotFields
          mode={mode}
          step={step}
          plateau={plateau}
          plateaus={plateaus}
          perPlateau={perPlateau}
          selected={selected}
          arrivalHour={arrivalHour}
          rentalHours={rentalHours}
          projectType={configGlobal.projectType}
          urgency={configGlobal.urgency}
          total={priceBreakdown.total}
          contact={contact}
        />
        {step===0 && canNext() && (() => {
          const recs = configSessions.map(s => ({ session: s, ...recommendSession(s, configGlobal) }));
          return (
            <div className="bg-foreground text-white shrink-0">
              <div className="flex flex-col md:flex-row md:items-stretch border-b border-white/10">
                <span className="font-mono text-label tracking-meta uppercase tracking-label text-primary px-5 md:pl-6 md:pr-3 py-2 flex-1 min-w-0 md:self-center">{lang==='fr'?'Récap — recommandation':'Recap — recommendation'}</span>
                <span className="font-mono text-micro tracking-ui text-white/45 px-5 py-2 border-t border-white/10 md:border-t-0 md:self-center md:w-1/2 md:border-l md:border-white/10">{lang==='fr'?'estimation, ajustable':'estimate, tweakable'}</span>
              </div>
              {recs.map((r, i) => {
                const px = BOOK_PLATEAUX.find(x => x.k === r.plateau) || BOOK_PLATEAUX[0];
                const pr = PRODUCTS.find(x => x.k === r.session.product);
                const productLabel = r.session.projectType === 'cyclorama' ? (lang==='fr'?'Cyclorama':'Cyclorama') : (pr?.[lang] || '');
                const totalHours = r.estimatedHours || r.hours || 0;
                let dur: string;
                if (r.onRequest) { dur = lang==='fr' ? 'sur demande' : 'on request'; }
                else if (totalHours <= 16) { dur = `${totalHours}h`; }
                else {
                  const d = Math.floor(totalHours / 8); const h = totalHours - d * 8;
                  const dLbl = lang==='fr' ? (d > 1 ? 'jours' : 'jour') : (d > 1 ? 'days' : 'day');
                  dur = h > 0 ? `${d} ${dLbl} ${lang==='fr'?'et':'+'} ${h}h (${totalHours}h)` : `${d} ${dLbl} (${totalHours}h)`;
                }
                return (
                  <div key={i} className="px-5 md:px-6 py-2 border-b border-white/10 grid grid-cols-auto-fluid gap-3 md:gap-5 items-baseline">
                    <span className="font-mono text-label tracking-meta uppercase tracking-label text-white/50">{String(i+1).padStart(2,'0')}</span>
                    <div>
                      <div className="text-detail font-normal tracking-headline mb-px">{px[lang]} <span className="text-white/50 text-caption">· {dur}</span></div>
                      <div className="font-mono text-micro tracking-caption text-white/55">{productLabel}{r.session.projectType==='cyclorama' ? '' : ` · ${r.session.quantity} ${lang==='fr'?'produits':'products'}`}{r.session.projectType==='cyclorama' ? '' : (() => { const q = Number(r.session.quantity)||0; const vc = Number(r.session.viewsCount)||0; const vLen = (r.session.views||[]).length; const v = vc || vLen || 0; const n = q * v; return n > 0 ? ` · ${n} ${lang==='fr'?'images':'images'}` : ''; })()}{r.cadence ? ` · ${lang==='fr'?`Estimation : ${r.cadence} produits/jour`:`Estimate: ${r.cadence} products/day`}` : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
        {step===0 && (
          <div className="flex items-stretch min-h-control shrink-0">
            <button type="button" onClick={applyConfig} disabled={!canNext()} className={`edo-focus-ring bg-primary border-0 cursor-pointer text-white font-mono text-caption tracking-meta uppercase px-5 py-3 md:py-0 inline-flex items-center justify-center gap-2 flex-1 min-w-0 transition-opacity duration-150 hover:opacity-90${canNext() ? '' : ' opacity-30 cursor-not-allowed'}`}>
              {lang==='fr'?'Continuer vers la réservation':'Continue to booking'} <IconArrowRight width="14" height="14"/>
            </button>
          </div>
        )}
        {step>0 && (
        <div className="border-t border-border flex flex-col md:flex-row md:items-stretch shrink-0 bg-white md:min-h-control">
          {(() => {
            const idx = STEPS.findIndex(s=>s.n===step); const isFirst = idx <= 0; const prevN = idx > 0 ? STEPS[idx-1].n : null; const nextN = idx > -1 && idx < STEPS.length-1 ? STEPS[idx+1].n : null;
            const dateList = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []); const isMultiDate = step===6 && dateList.length > 1;
            const safeDateIdx = Math.max(0, Math.min(dateIdx, dateList.length - 1)); const onLastDateSub = !isMultiDate || safeDateIdx >= dateList.length - 1; const onFirstDateSub = !isMultiDate || safeDateIdx <= 0;
            const currentDateK = isMultiDate ? dateList[safeDateIdx] : null; const currentDateValid = !isMultiDate || (currentDateK != null && perPlateau[currentDateK] && perPlateau[currentDateK].date);
            const handleBack = () => { if (isMultiDate && !onFirstDateSub) { setDateIdx(safeDateIdx - 1); return; } if (prevN !== null) goToStep(prevN); };
            const handleSubNext = () => { if (isMultiDate && !onLastDateSub && currentDateValid) { setDateIdx(safeDateIdx + 1); return true; } return false; };
            const backBtnCls = "edo-focus-ring bg-white border-0 cursor-pointer font-mono text-caption tracking-meta uppercase text-foreground px-5 py-3 md:py-0 inline-flex items-center justify-start gap-2 transition-colors duration-150 min-h-control md:flex-1 md:min-h-0 min-w-0 hover:bg-muted";
            const navBtnSecondaryCls = "edo-focus-ring bg-white border-t md:border-t-0 md:border-l border-hairline cursor-pointer font-mono text-caption tracking-meta uppercase text-foreground px-5 py-3 md:py-0 inline-flex items-center justify-center gap-2 transition-colors duration-150 min-h-control md:min-h-0 flex-1 min-w-0 hover:bg-muted";
            const navBtnPrimaryCls = "edo-focus-ring bg-primary border-t md:border-t-0 md:border-l border-hairline cursor-pointer text-white font-mono text-caption tracking-meta uppercase px-5 py-3 md:py-0 inline-flex items-center justify-center gap-2 transition-opacity duration-150 min-h-control md:min-h-0 flex-1 min-w-0 hover:opacity-90";
            const navBtnOrangeCls = "edo-focus-ring bg-primary border-t md:border-t-0 md:border-l border-hairline cursor-pointer text-white font-mono text-caption tracking-meta uppercase px-5 py-3 md:py-0 inline-flex items-center justify-center gap-2 transition-opacity duration-150 min-h-control md:min-h-0 flex-1 min-w-0 hover:opacity-90";
            return (<>
          <button type="button" onClick={handleBack} disabled={isFirst && onFirstDateSub} className={backBtnCls + (isFirst && onFirstDateSub ? ' opacity-30 cursor-not-allowed' : '')}>
            ← {lang==='fr'?'Retour':'Back'}
          </button>
          <div className="flex items-stretch md:flex-none md:w-1/2">
          {step<5 ? (
            <button type="button" onClick={()=>{ if (!canNext()) return; if (step===0) { applyConfig(); } else if (nextN !== null) { goToStep(nextN); } }} disabled={!canNext()} className={navBtnPrimaryCls + (canNext() ? '' : ' opacity-30 cursor-not-allowed')}>
              {step===0 ? (lang==='fr'?'Continuer vers la réservation':'Continue to booking') : (lang==='fr'?'Continuer':'Continue')} <IconArrowRight width="14" height="14"/>
            </button>
          ) : p.isCyclo ? (
            step===5 ? (
              <button type="button" onClick={()=>handleContactNext(nextN)} className={navBtnPrimaryCls}>
                {lang==='fr'?'Continuer':'Continue'} <IconArrowRight width="14" height="14"/>
              </button>
            ) : isMultiDate && !onLastDateSub ? (
              <button type="button" onClick={()=>currentDateValid && handleSubNext()} disabled={!currentDateValid} className={navBtnPrimaryCls + (currentDateValid ? '' : ' opacity-30 cursor-not-allowed')}>
                {lang==='fr'?'Valider · plateau suivant':'Validate · next stage'} <IconArrowRight width="14" height="14"/>
              </button>
            ) : (
              <button type="button" onClick={()=>canNext()&&!saving&&handleSubmit('request')} disabled={!canNext()||saving} className={navBtnOrangeCls + (canNext()&&!saving ? '' : ' opacity-30 cursor-not-allowed')}>
                {saving ? (lang==='fr'?'Envoi…':'Sending…') : (lang==='fr'?'Envoyer la demande':'Submit request')} <IconArrowRight width="14" height="14"/>
              </button>
            )
          ) : (
            <>
              <button type="button" onClick={()=>!saving&&handleSubmit('quote')} disabled={saving} title={lang==='fr'?'Sans bloquer de date':'No date held'} className={navBtnSecondaryCls + (canQuote()&&!saving ? '' : ' opacity-30 cursor-not-allowed')}>
                {saving ? (lang==='fr'?'Envoi…':'Sending…') : (lang==='fr'?'Recevoir mon devis':'Receive my quote')} <IconArrowRight width="14" height="14"/>
              </button>
              {step===5 ? (
                <button type="button" onClick={()=>handleContactNext(nextN)} className={navBtnPrimaryCls}>
                  {lang==='fr'?'Choisir une date':'Pick a date'} <IconArrowRight width="14" height="14"/>
                </button>
              ) : isMultiDate && !onLastDateSub ? (
                <button type="button" onClick={()=>currentDateValid && handleSubNext()} disabled={!currentDateValid} className={navBtnPrimaryCls + (currentDateValid ? '' : ' opacity-30 cursor-not-allowed')}>
                  {lang==='fr'?'Valider · plateau suivant':'Validate · next stage'} <IconArrowRight width="14" height="14"/>
                </button>
              ) : (
                <button type="button" onClick={()=>canNext()&&!saving&&handleSubmit('booking')} disabled={!canNext()||saving} className={navBtnOrangeCls + (canNext()&&!saving ? '' : ' opacity-30 cursor-not-allowed')}>
                  {saving ? (lang==='fr'?'Réservation…':'Booking…') : (lang==='fr'?'Réserver':'Book now')} <IconArrowRight width="14" height="14"/>
                </button>
              )}
            </>
          )}
          </div>
            </>);
          })()}
        </div>
        )}
      </form>

      <SidePanel lang={lang} p={p} selected={selected} months={months} slotType={slotType} hours={hours} cycloMode={cycloMode} rows={priceBreakdown.rows} total={priceBreakdown.total} isPreview={!!priceBreakdown.isPreview} step={step} plateaus={plateaus} perPlateau={perPlateau}/>
    </div>
  );
};

const formatBookingDate = (d?: AnyProps | null) =>
  d ? `${d.y}-${String(d.m + 1).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : '';

const BookingHubspotFields = ({
  mode, step, plateau, plateaus, perPlateau,
  selected, arrivalHour, rentalHours,
  projectType, urgency, total, contact,
}: AnyProps) => {
  const datesByPlateau = Object.fromEntries(
    Object.entries(perPlateau || {})
      .map(([k, v]) => [k, formatBookingDate((v as AnyProps)?.date)])
      .filter(([, d]) => d)
  );
  return (
    <div hidden aria-hidden>
      <input type="hidden" name="mode" value={mode} readOnly />
      <input type="hidden" name="plateau" value={plateau || ''} readOnly />
      <input type="hidden" name="plateaus" value={(plateaus || []).join(',')} readOnly />
      <input type="hidden" name="preferred_date" value={formatBookingDate(selected)} readOnly />
      <input type="hidden" name="per_plateau_dates" value={JSON.stringify(datesByPlateau)} readOnly />
      <input type="hidden" name="arrival_hour" value={arrivalHour ?? ''} readOnly />
      <input type="hidden" name="rental_hours" value={String(rentalHours ?? '')} readOnly />
      <input type="hidden" name="project_type" value={projectType || ''} readOnly />
      <input type="hidden" name="urgency" value={urgency || ''} readOnly />
      <input type="hidden" name="total_ht" value={String(total ?? 0)} readOnly />
      <input type="hidden" name="item_types" value={(contact?.typesArticles || []).join(',')} readOnly />
      {step !== 5 && (
        <>
          <input type="hidden" name="firstname" value={contact?.prenom || ''} readOnly />
          <input type="hidden" name="lastname" value={contact?.nom || ''} readOnly />
          <input type="hidden" name="email" value={contact?.email || ''} readOnly />
          <input type="hidden" name="phone" value={contact?.tel || ''} readOnly />
          <input type="hidden" name="company" value={contact?.societe || ''} readOnly />
          <input type="hidden" name="brand" value={contact?.marque || ''} readOnly />
          <input type="hidden" name="siren" value={contact?.siren || ''} readOnly />
          <input type="hidden" name="address" value={contact?.adresseFacturation || ''} readOnly />
          <input type="hidden" name="message" value={contact?.autresInfos || ''} readOnly />
          <input type="hidden" name="other_item_type" value={contact?.autreType || ''} readOnly />
          <input type="hidden" name="quantity_items" value={contact?.quantiteArticles || ''} readOnly />
          <input type="hidden" name="views_per_item" value={contact?.vuesParArticle || ''} readOnly />
          <input type="hidden" name="cgv_accepted" value={contact?.cgvAccepted ? 'true' : 'false'} readOnly />
        </>
      )}
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
  <button type="button" onClick={onClick}
    className={`group edo-focus-ring ${on ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-muted'} border-0 outline-none shadow-none p-5 sm:p-3.5 text-left cursor-pointer font-inherit flex flex-col gap-1 transition-all duration-150 min-w-0 min-h-32 sm:min-h-28`}>
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
  const accQ = (qKey, children) => { const q = qList.find(x => x.key === qKey); if (!q || !q.visible) return null; const open = isOpen(qKey); if (!open && q.answered) { return (<button type="button" key={qKey+':collapsed'} onClick={()=>setOpenQ(qKey)} className="edo-focus-ring w-full bg-white border-0 border-b border-b-foreground px-5 md:px-6 min-h-control py-3 md:py-0 box-border cursor-pointer font-inherit text-left flex items-center gap-3 md:gap-3.5 transition-colors duration-150 hover:bg-muted"><span className="edo-cell-label text-primary shrink-0 w-7">{q.num}</span><span className="edo-cell-label text-muted-foreground shrink-0">{q.label}</span><span className="flex-1 min-w-0 font-mono text-caption tracking-copy-tight text-foreground text-right text-balance">{q.summary || '—'}</span><span className="edo-cell-label text-muted-foreground shrink-0">{lang==='fr'?'modifier':'edit'}</span></button>); } if (!open) return null; const onInteract = ()=>{ touchQ(qKey); setOpenQ(qKey); }; return (<div key={qKey+':open'} onClickCapture={onInteract}>{children}</div>); };
  return (
    <div className="min-w-0 overflow-y-auto h-full">
      <div className="flex flex-col md:flex-row md:items-stretch md:min-h-control bg-muted box-border sticky top-0 z-local border-b border-hairline">
        <span className="font-mono text-micro tracking-code uppercase text-muted-foreground px-5 py-3 md:py-0 md:self-center md:pl-5 md:pr-3 flex-1 min-w-0 leading-relaxed">{lang==='fr'?'Notre configurateur vous accompagne — ou ':'Our configurator guides you — or '}<span className="text-primary font-semibold">{lang==='fr'?'choisissez manuellement →':'pick manually →'}</span></span>
        <div className="flex items-stretch border-t border-hairline md:border-t-0 md:flex-none md:w-1/2">
          <button type="button" onClick={()=>{ setSessions([makeBlankSession()]); setActiveIdx(0); setOpenQ(null); setTouchedQs(new Set()); if (onReset) onReset(); }} className="edo-focus-ring flex-1 bg-transparent border-l border-hairline px-5 py-3 md:py-0 cursor-pointer font-mono text-micro tracking-code uppercase text-foreground whitespace-nowrap leading-normal inline-flex items-center justify-center transition-colors duration-150 hover:bg-white">↻ {lang==='fr'?'Réinitialiser':'Reset'}</button>
          <button type="button" onClick={onSkip} className="edo-focus-ring flex-1 bg-primary border-l border-hairline px-5 py-3 md:py-0 cursor-pointer font-mono text-label tracking-code uppercase text-white whitespace-nowrap leading-normal font-semibold inline-flex items-center justify-center transition-all duration-150 hover:opacity-90">{lang==='fr'?'Choisir manuellement':'Choose manually'} →</button>
        </div>
      </div>
      {sessions.length > 1 && (<>
        <div className="px-6 pt-3.5 pb-1 flex items-baseline justify-between gap-4 flex-wrap"><span className="edo-cell-label text-primary">{lang==='fr'?'Sessions produit':'Product sessions'} — {sessions.length}</span><button type="button" onClick={addSession} className="edo-focus-ring bg-white border border-border px-3.5 py-2 cursor-pointer font-mono text-label tracking-meta uppercase text-foreground flex items-center gap-2 h-8">+ {lang==='fr'?'Ajouter une session':'Add a session'}</button></div>
        <div className="grid bg-white border-t border-b border-hairline" style={{gridTemplateColumns:`repeat(${sessions.length}, minmax(0,1fr))`,gap:1}}>
          {sessions.map((s, i) => { const isActive = i === activeIdx; const valid = sessionValid(s); const p = PRODUCTS.find(x => x.k === s.product); const label = s.projectType === 'cyclorama' ? (lang==='fr'?'Cyclorama':'Cyclorama') : (p ? p[lang] : (lang==='fr'?'À définir':'To define')); return (<button type="button" key={i} onClick={()=>{setActiveIdx(i); setOpenQ(null); setTouchedQs(new Set());}} className={`${isActive ? 'bg-foreground text-white' : 'bg-white text-foreground'} border-0 px-3.5 py-3 text-left cursor-pointer font-inherit flex flex-col gap-1 min-w-0`}><div className="flex items-center justify-between gap-2"><span className={`font-mono text-label tracking-meta ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{lang==='fr'?'Session':'Session'} {String(i+1).padStart(2,'0')}</span><span onClick={(e)=>{e.stopPropagation(); removeSession(i);}} className={`text-detail cursor-pointer px-1 leading-none ${isActive ? 'text-white/50' : 'text-muted-foreground'}`} title={lang==='fr'?'Retirer':'Remove'}>×</span></div><div className="text-detail font-normal tracking-headline">{label}</div><div className={`font-mono text-micro tracking-caption ${isActive ? 'text-white/55' : 'text-muted-foreground'}`}>{valid ? (s.projectType==='cyclorama' ? (lang==='fr'?'sur demande':'on request') : `${s.quantity} ${lang==='fr'?'produits':'products'}`) : (lang==='fr'?'incomplet':'incomplete')}</div></button>); })}
        </div>
      </>)}
      {accQ('projectType', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border"><span className="edo-cell-label text-primary">00 · {lang==='fr'?'Type de projet':'Project type'}</span></div><div className="grid grid-cols-2 gap-hairline bg-edo-pure-black border-b border-hairline">{PROJECT_TYPES.map((pt,i)=>(<CfgChoice key={pt.k} idx={i+1} on={S.projectType===pt.k} onClick={()=>resetFrom('projectType', pt.k)} label={pt[lang]} desc={pt.desc[lang]}/>))}</div></>)}
      {S.projectType === 'ecom' && (accQ('product', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border"><span className="edo-cell-label text-primary">01 · {lang==='fr'?'Type de produit':'Product type'}</span></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-hairline bg-edo-pure-black border-b border-hairline">{PRODUCTS.map((p,i)=>(<CfgChoice key={p.k} idx={i+1} on={S.product===p.k} onClick={()=>resetFrom('product', p.k)} label={p[lang]} desc={p.desc[lang]}/>))}</div></>))}
      {S.product === 'pap' && (accQ('method', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border"><span className="edo-cell-label text-primary">02 · {lang==='fr'?'Méthode':'Method'}</span></div><div className="grid grid-cols-2 gap-hairline bg-edo-pure-black border-b border-hairline">{PAP_METHODS.map((m,i)=>(<CfgChoice key={m.k} idx={i+1} on={S.method===m.k} onClick={()=>resetFrom('method', m.k)} label={m[lang]} desc={m.desc[lang]}/>))}</div></>))}
      {S.product === 'pap' && S.method === 'packshot' && (accQ('submethod', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border"><span className="edo-cell-label text-primary">03 · {lang==='fr'?'Type de packshot':'Packshot type'}</span></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-hairline bg-edo-pure-black border-b border-hairline">{PAP_PACKSHOT_SUBS.map((sub,i)=>(<CfgChoice key={sub.k} idx={i+1} on={S.submethod===sub.k} onClick={()=>resetFrom('submethod', sub.k)} label={sub[lang]} desc={sub.desc[lang]}/>))}</div></>))}
      {S.product === 'accessoires' && (accQ('submethod', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border"><span className="edo-cell-label text-primary">02 · {lang==='fr'?"Type d'accessoire":'Accessory type'}</span></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-hairline bg-edo-pure-black border-b border-hairline">{ACCESS_SUBS.map((sub,i)=>(<CfgChoice key={sub.k} idx={i+1} on={S.submethod===sub.k} onClick={()=>resetFrom('submethod', sub.k)} label={sub[lang]} desc={sub.desc[lang]}/>))}</div></>))}
      {((S.product === 'pap' && S.method === 'onmodel') || (S.product === 'accessoires' && S.submethod) || (['eyewear','food','cosmetique','bijoux'].includes(S.product))) && (accQ('media', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border flex-wrap"><span className="edo-cell-label text-primary">{S.product==='pap' ? '03' : S.product==='accessoires' ? '03' : '02'} · {lang==='fr'?'Média':'Media'}</span><span className="font-mono text-label tracking-caption text-muted-foreground ml-3">{lang==='fr'?'(un ou les deux)':'(one or both)'}</span></div><div className="grid grid-cols-2 gap-hairline bg-edo-pure-black border-b border-hairline">{MEDIA_OPTIONS.map((m,i)=>{ const cur = Array.isArray(S.media) ? S.media : (S.media ? [S.media] : []); const on = cur.includes(m.k); return (<CfgChoice key={m.k} idx={i+1} on={on} onClick={()=>{ const next = on ? cur.filter(x=>x!==m.k) : [...cur, m.k]; setSession({ media: next }); }} label={m[lang]} desc={m.desc[lang]}/>); })}</div></>))}
      {S.product === 'pap' && S.method === 'packshot' && S.submethod && (accQ('quantity', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border"><span className="edo-cell-label text-primary">04 · {lang==='fr'?'Nombre de produits':'Number of products'}</span></div><div className="grid grid-cols-1 gap-hairline bg-edo-pure-black border-b border-hairline"><div className="bg-white px-4 sm:px-3 py-4 sm:py-2.5 flex flex-col gap-2 min-w-0"><div className="flex items-center gap-1.5 max-w-xs min-w-0"><input value={S.quantity} onChange={e=>setSession({quantity: e.target.value.replace(/\D/g,'')})} placeholder="—" inputMode="numeric" className="flex-1 min-w-0 bg-white border border-border outline-none px-3.5 py-2.5 font-mono text-cell tracking-copy-tight text-foreground text-center"/></div></div></div></>))}
      {S.product === 'pap' && S.method === 'packshot' && S.submethod && (accQ('views', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border flex-wrap"><span className="edo-cell-label text-primary">05 · {lang==='fr'?'Vues par produit':'Views per product'}</span><span className="font-mono text-label tracking-caption text-muted-foreground ml-3">{lang==='fr'?'(multi-sélection)':'(multi-select)'}</span></div><div className="grid gap-hairline bg-edo-pure-black border-b border-hairline grid-cols-auto-tiles">{PACKSHOT_VIEWS.filter(v => v.k !== '3/4' || S.submethod === 'ghost').map((v,i)=>{ const on = (S.views || []).includes(v.k); return (<button type="button" key={v.k} onClick={()=>{ const cur = S.views || []; setSession({ views: cur.includes(v.k) ? cur.filter(x => x !== v.k) : [...cur, v.k] }); }} className={`${on ? 'bg-foreground text-white' : 'bg-white text-foreground'} border-0 px-4 sm:px-3 py-4 sm:py-2.5 text-left cursor-pointer font-inherit flex flex-col gap-1.5 min-h-22 sm:min-h-18 min-w-0`}><span className={`font-mono text-label tracking-meta uppercase ${on ? 'text-white/60' : 'text-muted-foreground'}`}>{String(i+1).padStart(2,'0')}</span><span className="text-detail font-normal tracking-headline">{v[lang]}</span>{on && <span className="text-primary text-caption mt-auto">●</span>}</button>); })}</div></>))}
      {((S.product === 'pap' && S.method === 'onmodel' && (S.media||[]).length > 0) || (S.product === 'accessoires' && S.submethod && (S.media||[]).length > 0) || (['eyewear','food','cosmetique','bijoux'].includes(S.product) && (S.media||[]).length > 0)) && (accQ('qtyViews', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border"><span className="edo-cell-label text-primary">{S.product==='pap' ? '04' : S.product==='accessoires' ? '04' : '03'} · {lang==='fr'?'Produits & vues':'Products & views'}</span></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-hairline bg-edo-pure-black border-b border-hairline"><div className="bg-white px-4 sm:px-3 py-4 sm:py-2.5 flex flex-col gap-2 min-w-0"><span className="edo-cell-label text-muted-foreground">{lang==='fr'?'Nombre de produits':'Number of products'}</span><div className="flex items-center gap-1.5 min-w-0"><input value={S.quantity} onChange={e=>setSession({quantity: e.target.value.replace(/\D/g,'')})} placeholder="—" inputMode="numeric" className="flex-1 min-w-0 w-full bg-white border border-border outline-none px-3.5 py-2.5 font-mono text-cell tracking-copy-tight text-foreground text-center"/></div></div><div className="bg-white px-4 sm:px-3 py-4 sm:py-2.5 flex flex-col gap-2 min-w-0"><span className="edo-cell-label text-muted-foreground">{lang==='fr'?'Vues par produit':'Views per product'}</span><div className="flex items-center gap-1.5 min-w-0"><input value={S.viewsCount} onChange={e=>setSession({viewsCount: e.target.value.replace(/\D/g,'')})} placeholder="—" inputMode="numeric" className="flex-1 min-w-0 w-full bg-white border border-border outline-none px-3.5 py-2.5 font-mono text-cell tracking-copy-tight text-foreground text-center"/></div></div></div></>))}
      {S.projectType === 'ecom' && S.product && sessionValid(S) && (accQ('postprod', <><div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border"><span className="edo-cell-label text-primary">{lang==='fr'?'Post-production':'Post-production'}</span></div><div className="grid gap-hairline bg-edo-pure-black border-b border-hairline" style={{gridTemplateColumns:((S.media||[]).includes('video') && S.postprod) ? '1fr 1fr' : '1fr'}}><div className="bg-white px-4 sm:px-3.5 py-4 sm:py-2.5 flex items-center justify-between gap-3"><div><div className="text-detail font-medium tracking-copy-tight">{lang==='fr'?'Post-production par E-DO ?':'Post-production by E-DO?'}</div><div className={`font-mono text-label text-muted-foreground mt-0.5`}>{lang==='fr'?'Prix estimatif affiché — ajusté après brief':'Estimated price shown — adjusted after brief'}</div></div><Toggle on={S.postprod} onClick={()=>setSession({postprod:!S.postprod, postprodVideo: S.postprod ? false : S.postprodVideo})}/></div>{((S.media||[]).includes('video')) && S.postprod && (<div className="bg-white px-4 sm:px-3.5 py-4 sm:py-2.5 flex items-center justify-between gap-3"><div><div className="text-detail font-medium tracking-copy-tight">{lang==='fr'?'Montage vidéo ?':'Video editing?'}</div><div className={`font-mono text-label text-muted-foreground mt-0.5`}>{lang==='fr'?'Uniquement pour les projets vidéo':'Only for video projects'}</div></div><Toggle on={S.postprodVideo} onClick={()=>setSession({postprodVideo:!S.postprodVideo})}/></div>)}</div></>))}
      {S.projectType === 'cyclorama' && (<div className="bg-muted p-5 border-t border-b border-hairline text-center"><div className="text-cell font-normal tracking-headline mb-2">{lang==='fr'?'Cyclorama / Production libre':'Cyclorama / Free production'}</div><div className="text-detail text-muted-foreground max-w-xl mx-auto leading-normal">{lang==='fr'?"Besoin sur-mesure, nous établissons un devis personnalisé.":"Custom needs — we'll prepare a tailored quote based on stage, duration and technical resources."}</div></div>)}
      {sessionValid(active) && activeIdx === sessions.length - 1 && (<div className="px-6 py-1.5 flex justify-center items-center bg-white"><button type="button" onClick={addSession} className="edo-focus-ring bg-white border border-border px-4 py-1.5 cursor-pointer font-mono text-label tracking-meta uppercase text-foreground flex items-center gap-2 h-7">+ {lang==='fr'?'Ajouter une autre session produit':'Add another product session'}</button></div>)}
      <div className="h-4 bg-white"/>
    </div>
  );
};

const MultiPlateauStep = ({ lang, plateaus, perPlateau, setPerPlateau, fallback, renderOne, topBanner }: AnyProps) => {
  const list = plateaus && plateaus.length > 0 ? plateaus : [];
  if (list.length === 0) { return <EmptyState size="compact" label={bookingMsg.noStageSelected[lang]} />; }
  const setOne = (k, patch) => { setPerPlateau(prev => ({...prev, [k]: {...(prev[k] || {}), ...patch}})); };
  return (
    <div>
      {topBanner}
      {list.map((k, idx) => {
        const px = BOOK_PLATEAUX.find(x => x.k === k);
        if (!px) return null;
        const st = perPlateau[k] || {};
        return (
          <div key={k}>
            {list.length > 1 && (
              <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap">
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
    <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local">
      <span className="edo-cell-label text-primary whitespace-nowrap">01 · {lang==='fr'?'Plateau':'Stage'}</span>
      <span className="font-mono text-label tracking-caption text-muted-foreground">{lang==='fr'?'Sélection multiple possible':'Multi-select possible'}</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 edo-hairline w-full auto-rows-bento">
    {BOOK_PLATEAUX.map((px,i)=>{
      const on = (plateaus || []).includes(px.k);
      const priceRows = px.isVisite ? [{lbl: lang==='fr'?'Visite':'Visit', val: lang==='fr'?'Gratuit':'Free'}] : px.isCyclo ? [{lbl: lang==='fr'?'½ journée (5h)':'Half day (5h)', val:`${px.rates.halfH} €`},{lbl: lang==='fr'?'Journée (10h)':'Full day (10h)', val:`${px.rates.fullH} €`},{lbl: lang==='fr'?'Éditorial (10h)':'Editorial (10h)', val: lang==='fr'?'Sur demande':'On request'}] : [{lbl: lang==='fr'?'Heure':'Hourly', val:`${px.rates.hour} €`},{lbl: lang==='fr'?'½ journée (4h)':'Half day (4h)',val:`${px.rates.half} €`},{lbl: lang==='fr'?'Journée (8h)':'Full day (8h)',val:`${px.rates.full} €`}];
      return (
        <button type="button" key={px.k} onClick={()=>{ togglePlateau(px.k); }}
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

const Step2Date = ({ lang, p, viewY, viewM, months, days, calCells, selected, setSelected, arrivalHour, setArrivalHour, rentalHours, isPast, nextMonth, prevMonth, refreshKey = 0 }: AnyProps) => {
  const { availMap, bookedHoursMap, loading: availLoading } = useAvailability(p?.k, viewY, viewM, rentalHours, refreshKey);
  const isSelected = (d: number) => selected && selected.y===viewY && selected.m===viewM && selected.d===d;
  const now = new Date();
  const todayY = now.getFullYear(); const todayM = now.getMonth(); const todayD = now.getDate();
  const currentHour = now.getHours();
  const isToday = (d: number) => viewY===todayY && viewM===todayM && d===todayD;
  const isSelectedToday = selected && selected.y===todayY && selected.m===todayM && selected.d===todayD;
  const maxStart = 19 - rentalHours;
  const fr = lang==='fr';
  const selectedDayBooked = selected ? bookedHoursMap[selected.d] : undefined;
  React.useEffect(()=>{ if (arrivalHour > maxStart) setArrivalHour(Math.max(9, Math.min(10, maxStart))); }, [maxStart]);
  React.useEffect(()=>{
    if (!selected) return;
    const isPastH = (h: number) => isSelectedToday && h <= currentHour;
    const isBlocked = (h: number) => isPastH(h) || isHourBlocked(selectedDayBooked, h, rentalHours);
    if (isBlocked(arrivalHour)) {
      for (let h = 9; h <= maxStart; h++) {
        if (!isBlocked(h) && h + rentalHours <= 19) { setArrivalHour(h); return; }
      }
    }
  }, [selected, selectedDayBooked, isSelectedToday]);
  React.useEffect(()=>{
    if (selected) return;
    if (availLoading) return;
    if (viewY !== todayY || viewM !== todayM) return;
    const isFullDay = rentalHours >= 8;
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const hasValidArrival = (d: number) => {
      const booked = bookedHoursMap[d];
      const sameAsToday = d === todayD;
      for (let h = 9; h <= 19 - rentalHours; h++) {
        if (sameAsToday && h <= currentHour) continue;
        if (isHourBlocked(booked, h, rentalHours)) continue;
        return true;
      }
      return false;
    };
    for (let d = todayD; d <= daysInMonth; d++) {
      const dow = new Date(viewY, viewM, d).getDay();
      const weekend = dow === 0 || dow === 6;
      if (weekend && !isFullDay) continue;
      const av = availMap[d] || 'free';
      if (av === 'unavailable') continue;
      if (!hasValidArrival(d)) continue;
      setSelected({ y: viewY, m: viewM, d });
      return;
    }
  }, [availLoading, availMap, bookedHoursMap, selected, viewY, viewM, rentalHours]);
  return (<div>
    <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">{`06 · ${fr ? 'Choisir une date' : 'Pick a date'}`}</span></div>

    <div className="flex min-w-0 edo-hairline">
      <div className="flex min-w-0 flex-1 items-baseline gap-x-4 md:gap-x-6 gap-y-2 bg-white px-5 md:px-6 py-3 flex-wrap">
        <h2 className="m-0 text-page-title font-light tracking-headline shrink-0">{months[viewM]} <span className="text-muted-foreground">{viewY}</span></h2>
        <div className="flex items-center gap-x-3 gap-y-1.5 font-mono text-label tracking-ui uppercase text-muted-foreground flex-wrap">
          {availLoading && <span className="text-primary animate-pulse">{bookingMsg.calLoading[lang]}</span>}
          <span className="inline-flex items-center gap-2"><span aria-hidden className="inline-block w-2.5 h-2.5 bg-white border border-foreground"/>{bookingMsg.calFreeLegend[lang]}</span>
          <span className="inline-flex items-center gap-2"><span aria-hidden className="inline-block w-2.5 h-2.5 bg-edo-sand border border-edo-sand"/>{bookingMsg.calPartialLegend[lang]}</span>
          <span className="inline-flex items-center gap-2"><span aria-hidden className="inline-block w-2.5 h-2.5 bg-edo-gray-50 border border-input"/>{bookingMsg.calUnavailableLegend[lang]}</span>
          <span className="inline-flex items-center gap-2"><span aria-hidden className="inline-block w-2.5 h-2.5 bg-primary border border-primary"/>{bookingMsg.calSelectedLegend[lang]}</span>
        </div>
      </div>
      <button type="button" onClick={prevMonth} aria-label={bookingMsg.calPrevMonth[lang]} className="edo-focus-ring flex basis-header flex-none cursor-pointer items-center justify-center border-0 bg-white font-mono text-detail text-foreground transition-colors hover:bg-muted">{"←"}</button>
      <button type="button" onClick={nextMonth} aria-label={bookingMsg.calNextMonth[lang]} className="edo-focus-ring flex basis-header flex-none cursor-pointer items-center justify-center border-0 bg-white font-mono text-detail text-foreground transition-colors hover:bg-muted">{"→"}</button>
    </div>

    <div className="grid grid-cols-7 border-b border-hairline w-full">
      {days.map((d,i)=><div key={i} className="bg-edo-gray-50 py-2.5 text-center font-mono text-caption tracking-meta uppercase text-muted-foreground border-r border-input last:border-r-0">{d}</div>)}
    </div>

    <div className={`grid grid-cols-7 border-b border-hairline w-full transition-opacity duration-200 ${availLoading ? 'opacity-60' : ''}`}>{calCells.map((d,i)=>{
      if (d===null) return <div key={i} className="bg-edo-gray-50 aspect-cal-cell border-r border-b border-input"/>;
      const dow = new Date(viewY, viewM, d).getDay(); const weekend = dow===0 || dow===6; const isFullDay = rentalHours>=8; const weekendBlocked = weekend && !isFullDay;
      const av = weekendBlocked ? 'unavailable' : (availMap[d] || 'free'); const past = isPast(d); const sel = isSelected(d);
      const clickable = !past && av!=='unavailable';
      const tdy = isToday(d);
      const partial = !sel && !past && av==='free' && !weekendBlocked && !!bookedHoursMap[d] && bookedHoursMap[d].size > 0;
      return (<button type="button" key={i} disabled={!clickable} onClick={()=>setSelected({y:viewY,m:viewM,d})}
        title={weekendBlocked ? (fr ? `Week-end : journée complète uniquement` : 'Weekend: full-day booking only') : tdy ? (fr ? "Aujourd'hui" : 'Today') : ''}
        className={[
          'aspect-cal-cell border-r border-b border-input flex flex-col items-start justify-start text-left font-inherit min-w-0 p-1.5 sm:p-2 relative transition-colors duration-100',
          sel ? 'bg-primary text-white cursor-pointer hover:bg-primary/85' :
          past ? 'bg-edo-gray-50 text-muted-foreground/30 cursor-not-allowed' :
          av==='unavailable' ? 'bg-edo-gray-50 text-muted-foreground/40 cursor-not-allowed' :
          partial ? 'bg-edo-sand text-foreground cursor-pointer hover:bg-edo-warm' :
          tdy ? 'bg-primary/8 text-foreground cursor-pointer hover:bg-primary/15' :
          'bg-white text-foreground cursor-pointer hover:bg-edo-gray-100',
        ].join(' ')}>
        <span className={[
          'text-detail sm:text-cell tabular-nums leading-none',
          sel ? 'font-semibold text-white' : partial ? 'font-medium text-foreground' : tdy ? 'font-bold text-primary' : past ? 'font-normal' : 'font-medium',
        ].join(' ')}>{d}</span>
        {tdy && !sel && !partial && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"/>}
        {!past && av!=='unavailable' && !weekendBlocked && (
          <span className={`font-mono text-nano sm:text-micro tracking-caption uppercase mt-auto ${sel ? 'text-white/70' : partial ? 'text-muted-foreground' : tdy ? 'text-primary/70' : 'text-muted-foreground'}`}>
            {partial ? bookingMsg.calPartial[lang] : (fr ? 'libre' : 'free')}
          </span>
        )}
        {weekendBlocked && !past && (
          <span className="font-mono text-nano sm:text-micro tracking-caption uppercase mt-auto text-muted-foreground/50">{fr ? `journée` : 'full day'}</span>
        )}
      </button>);
    })}</div>

    <div className="border-b border-hairline bg-white px-5 md:px-6 py-2.5 flex items-center gap-3 md:gap-5 flex-wrap">
      <span className="edo-cell-label">{fr ? "Heure d'arrivée" : 'Arrival time'}</span>
      <span className="font-mono text-label tracking-ui text-muted-foreground">{String(arrivalHour).padStart(2,'0')}:00 {"→"} {String(arrivalHour+rentalHours).padStart(2,'0')}:00 {"·"} {rentalHours}h</span>
    </div>
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-hairline bg-white border-b border-hairline w-full">{Array.from({length:10},(_,i)=>i+9).map(h=>{
      const on = arrivalHour===h; const endsTooLate = h + rentalHours > 19;
      const pastHour = isSelectedToday && h <= currentHour;
      const booked = isHourBlocked(selectedDayBooked, h, rentalHours);
      const disabled = endsTooLate || pastHour || booked;
      return (<button type="button" key={h} disabled={disabled} onClick={()=>!disabled && setArrivalHour(h)}
        title={booked ? (fr ? 'Créneau déjà réservé' : 'Time slot already booked') : pastHour ? (fr ? 'Créneau passé' : 'Past time slot') : endsTooLate ? (fr ? `Termine à ${h+rentalHours}h, après la fermeture` : `Ends at ${h+rentalHours}h, past closing`) : ''}
        className={`${on ? 'bg-foreground text-white' : disabled ? 'bg-muted text-muted-foreground' : 'bg-white text-foreground hover:bg-edo-gray-100'} border-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} flex items-center justify-center font-mono text-caption tracking-caption min-w-0 py-3 sm:py-0 sm:aspect-arrival transition-colors duration-100${booked ? ' line-through' : ''}`}>
        {String(h).padStart(2,'0')}:00
      </button>);
    })}</div>
  </div>);
};

const StepperBtn = ({ onClick, children }: AnyProps) => (
  <button type="button" onClick={onClick} className="edo-focus-ring w-7.5 h-8 flex-none basis-8 border border-border bg-white cursor-pointer text-cell text-foreground font-inherit inline-flex items-center justify-center transition-all duration-150 hover:scale-102 hover:border-foreground">{children}</button>
);

const BentoSlotTile = ({ idx, on, onClick, label, sub, desc, price, hint, lang }: AnyProps) => (
  <button type="button" onClick={onClick}
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
    return (<div><div className="grid grid-cols-1 sm:grid-cols-3 edo-hairline w-full auto-rows-bento"><BentoSlotTile idx={1} on={cycloMode==='halfH'} onClick={()=>setCycloMode('halfH')} label={lang==='fr'?'Demi-journée':'Half day'} sub="5 heures" desc={lang==='fr'?'Bloc de 5h, parfait pour un shoot packshot ciblé.':'5-hour block, perfect for a focused packshot shoot.'} price="650 €" lang={lang}/><BentoSlotTile idx={2} on={cycloMode==='fullH'} onClick={()=>setCycloMode('fullH')} label={lang==='fr'?'Journée':'Full day'} sub="10 heures" desc={lang==='fr'?'Bloc de 10h, volume e-commerce ou campagne.':'10-hour block, e-commerce volume or campaign.'} price="880 €" lang={lang}/><BentoSlotTile idx={3} on={cycloMode==='editorial'} onClick={()=>setCycloMode('editorial')} label={lang==='fr'?'Éditorial':'Editorial'} sub="10 heures" desc={lang==='fr'?'Tarif réduit presse, usage personnel ou portfolio.':'Reduced rate for press, personal or portfolio use.'} price={lang==='fr'?'Sur demande':'On request'} hint={lang==='fr'?'Presse / personnel':'Press / personal'} lang={lang}/></div></div>);
  }
  if (p.isVisite) {
    return (<div><div className="px-5 md:px-12"><StepIntro n="02" lang={lang} t={lang==='fr'?'Visite du studio':'Studio visit'} s={lang==='fr'?'La visite est gratuite et dure environ une heure. Nous vous recontactons pour confirmer le créneau.':'Studio visit is free and lasts about an hour. We will confirm the slot by phone.'}/></div><div className="grid grid-cols-1 gap-hairline bg-white border-t border-b border-hairline w-full"><div className="bg-white px-5 md:px-12 py-6 md:py-8 flex flex-wrap items-baseline gap-3 md:gap-5"><span className="text-hero font-light tracking-display leading-none">0 €</span><span className="font-mono text-caption tracking-meta uppercase text-muted-foreground">{lang==='fr'?'Gratuit · sur rendez-vous':'Free · by appointment'}</span></div></div></div>);
  }
  return (<div>
    <div className="grid grid-cols-1 sm:grid-cols-3 edo-hairline w-full auto-rows-bento">
      <BentoSlotTile idx={1} on={slotType==='hour'} onClick={()=>{setSlotType('hour'); setHours(1);}} label={lang==='fr'?"À l'heure":"Hourly"} sub={lang==='fr'?'1 à 3 heures':'1 to 3 hours'} desc={lang==='fr'?'Idéal pour un essai ou un shoot rapide.':'Ideal for a test or a quick shoot.'} price={`${p.rates.hour} €/h`} lang={lang}/>
      <BentoSlotTile idx={2} on={slotType==='half'} onClick={()=>{setSlotType('half'); setHours(4);}} label={lang==='fr'?'Demi-journée':'Half day'} sub={lang==='fr'?'4 à 7 heures':'4 to 7 hours'} desc={lang==='fr'?"Bloc 4h, prorata au-delà jusqu'à 7h.":"4-hour block, pro-rata up to 7 hours."} price={`${p.rates.half} €`} lang={lang}/>
      <BentoSlotTile idx={3} on={slotType==='full'} onClick={()=>{setSlotType('full'); setHours(8);}} label={lang==='fr'?'Journée':'Full day'} sub={lang==='fr'?'8 heures':'8 hours'} desc={lang==='fr'?'Journée complète, tarif le plus avantageux.':'Full day, best rate.'} price={`${p.rates.full} €`} lang={lang}/>
    </div>
    {(slotType==='hour' || slotType==='half') && (<div className="grid grid-cols-1 gap-hairline bg-white border-b border-hairline w-full"><div className="bg-white px-5 md:px-12 py-5 flex items-center justify-between gap-5 flex-wrap"><div className="flex flex-col gap-1 min-w-0"><span className="edo-cell-label">{slotType==='hour' ? (lang==='fr'?"Nombre d'heures":"Number of hours") : (lang==='fr'?"Nombre d'heures · demi-journée":"Hours · half day")}</span><span className="font-mono text-label tracking-caption text-muted-foreground leading-normal">{slotType==='hour' ? (lang==='fr' ? '↗ Dès 4h, bascule en demi-journée. Dès 8h, journée complète.' : '↗ From 4h, switches to half day. From 8h, full day.') : (lang==='fr' ? `↗ 4h = ${p.rates.half} €. Au-delà, prorata (${p.rates.half}/4 × h). Dès 8h, journée complète.` : `↗ 4h = €${p.rates.half}. Beyond, pro-rata (${p.rates.half}/4 × h). From 8h, full day.`)}</span></div><div className="flex items-center gap-3.5"><StepperBtn onClick={()=>{ if (slotType==='hour') setHours(Math.max(1,hours-1)); else { const n=hours-1; if(n<4){setSlotType('hour'); setHours(3);} else setHours(n); } }}>−</StepperBtn><span className="text-page-title font-light tracking-headline min-w-10 text-center">{hours}</span><StepperBtn onClick={()=>{ const n = hours+1; if (n>=8) { setSlotType('full'); setHours(8); } else if (slotType==='hour' && n>=4) { setSlotType('half'); setHours(n); } else { setHours(n); } }}>+</StepperBtn></div></div></div>)}
    {slotType==='full' && (<div className="grid grid-cols-1 gap-hairline bg-white border-b border-hairline w-full"><div className="bg-white px-5 md:px-12 py-5 flex items-center justify-between gap-5 flex-wrap"><div className="flex flex-col gap-1 min-w-0"><span className="edo-cell-label">{lang==='fr'?'Durée totale':'Total duration'}</span><span className="font-mono text-label tracking-caption text-muted-foreground leading-normal">{(() => { const fullDays = Math.floor(hours/8); const extraH = hours - fullDays*8; if (extraH === 0) { return lang==='fr' ? `↗ ${fullDays} ${fullDays>1?'journées':'journée'} (${hours}h) · ${(p.rates.full*fullDays).toFixed(0)} €` : `↗ ${fullDays} ${fullDays>1?'days':'day'} (${hours}h) · €${(p.rates.full*fullDays).toFixed(0)}`; } const extraAmt = +(p.rates.full / 8 * extraH).toFixed(2); return lang==='fr' ? `↗ ${fullDays} ${fullDays>1?'journées':'journée'} (${fullDays*8}h) + ${extraH}h · ${(p.rates.full*fullDays+extraAmt).toFixed(0)} €` : `↗ ${fullDays} ${fullDays>1?'days':'day'} (${fullDays*8}h) + ${extraH}h · €${(p.rates.full*fullDays+extraAmt).toFixed(0)}`; })()}</span></div><div className="flex items-center gap-3.5"><StepperBtn onClick={()=>{ const n = hours-1; if (n<8) { setSlotType('half'); setHours(7); } else { setHours(n); } }}>−</StepperBtn><span className="text-page-title font-light tracking-headline min-w-16 text-center">{hours}h</span><StepperBtn onClick={()=>setHours(hours+1)}>+</StepperBtn></div></div></div>)}
  </div>);
};

const Step4Equipment = ({ lang, p, paint, setPaint, kwh, setKwh }: AnyProps) => (
  <div className="px-5 md:px-12 pb-6">
    <StepIntro n="03" lang={lang} t={lang==='fr'?'Équipements & options':'Equipment & options'} s={p.isCyclo ? (lang==='fr'?'Options spécifiques au cyclorama (peinture fraîche, électricité additionnelle).':'Cyclorama-specific options (fresh paint, extra electricity).') : (lang==='fr'?'Aucune option supplémentaire requise. Le matériel standard est inclus.':'No extra options required. Standard kit is included.')}/>
    {p.isCyclo ? (<div className="flex flex-col gap-3"><div className={`flex items-center justify-between py-cell px-5 bg-white ${paint ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent'}`}><div><div className="text-cell font-medium tracking-copy-tight">{lang==='fr'?'Peinture fraîche du cyclo':'Fresh cyclo paint'}</div><div className="font-mono text-label text-muted-foreground mt-1">{lang==='fr'?'Repeint avant votre arrivée · forfait':'Repainted before your arrival · flat fee'}</div></div><div className="flex items-center gap-3.5"><span className="text-cell font-medium">110 €</span><Toggle on={paint} onClick={()=>setPaint(!paint)}/></div></div><div className="py-cell px-5 bg-white"><div className="flex justify-between items-center"><div><div className="text-cell font-medium tracking-copy-tight">{lang==='fr'?'Électricité additionnelle':'Extra electricity'}</div><div className="font-mono text-label text-muted-foreground mt-1">1,40 € / kWh</div></div><span className="text-cell font-medium">{fmtEUR(kwh*CYCLO_EXTRAS.kwh)} €</span></div><div className="flex items-center gap-3.5 mt-3.5"><StepperBtn onClick={()=>setKwh(Math.max(0,kwh-10))}>−</StepperBtn><div className="flex-1 h-1.5 bg-border relative"><div className="absolute inset-y-0 left-0 bg-primary" style={{right:`${100-Math.min(100,kwh/2)}%`}}/></div><StepperBtn onClick={()=>setKwh(Math.min(200,kwh+10))}>+</StepperBtn><span className="font-mono text-detail min-w-16 text-right">{kwh} kWh</span></div></div></div>) : (<div className="py-6 px-5 bg-white flex items-center gap-3.5"><span className="text-cell text-primary">✓</span><span className="text-detail text-foreground">{lang==='fr'?"Matériel standard inclus : fonds, supports, blocs d'alimentation, Wi-Fi pro.":"Standard kit included: backdrops, stands, power blocks, pro Wi-Fi."}</span></div>)}
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
  return (<div className="px-5 md:px-12 pb-6"><div className="flex flex-col gap-hairline bg-border">{items.map(e=>{ const isHourly = e.unit === 'hour'; const n = isHourly ? (team[e.k]||0) : 0; const onReq = !isHourly && team[e.k]===true; return (<div key={e.k} className="bg-white px-5 py-4 flex items-center justify-between gap-5"><div><div className="text-detail font-medium tracking-copy-tight flex items-center gap-2"><span>{e[lang]}</span>{recommended[e.k] && (<span className="font-mono text-micro tracking-ui uppercase text-primary border border-primary px-1.5 py-0.5 leading-none">{lang==='fr'?'Recommandé':'Recommended'}</span>)}</div><div className="font-mono text-label text-muted-foreground mt-0.5">{isHourly ? `${fmtEUR(e.price)} € / ${e.unit==='hour' ? 'h' : (lang==='fr'?'jour':'day')}` : (lang==='fr'?'Tarif sur demande selon le brief':'Rate on request based on brief')}</div></div>{isHourly ? (<label className="flex items-center gap-2.5 cursor-pointer select-none"><span className={`font-mono text-label tracking-ui uppercase ${n>0 ? 'text-primary' : 'text-muted-foreground'}`}>{n>0 ? (lang==='fr'?'Inclus':'Included') : (lang==='fr'?'Ajouter':'Add')}</span><span onClick={()=>setDays(e.k, n>0 ? 0 : 1)} className={`w-5.5 h-5.5 border-1-5 ${n>0 ? 'border-primary bg-primary' : 'border-input bg-white'} inline-flex items-center justify-center text-white text-detail font-bold`}>{n>0?'✓':''}</span></label>) : (<label className="flex items-center gap-2.5 cursor-pointer select-none"><span className={`font-mono text-label tracking-ui uppercase ${onReq ? 'text-primary' : 'text-muted-foreground'}`}>{lang==='fr'?'Sur demande':'On request'}</span><span onClick={()=>toggleReq(e.k)} className={`w-5.5 h-5.5 border-1-5 ${onReq ? 'border-primary bg-primary' : 'border-input bg-white'} inline-flex items-center justify-center text-white text-detail font-bold`}>{onReq?'✓':''}</span></label>)}</div>); })}</div></div>);
};

const Step6Postprod = ({ lang, postprod, setPostprod, plateauKey }: AnyProps) => {
  const enabled = !!postprod.enabled;
  const video = !!postprod.video;
  const videoAllowed = plateauKey !== 'vertical' && plateauKey !== 'horizontal';
  React.useEffect(() => { if (!videoAllowed && video) setPostprod({...postprod, video: false}); }, [videoAllowed, video]);
  return (<div className="px-5 md:px-12 pb-6"><div className="flex flex-col gap-hairline bg-border"><div className={`bg-white px-5 md:px-6 py-5 flex items-center justify-between gap-5 ${enabled ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent'}`}><div><div className="text-cell font-medium tracking-copy-tight">{lang==='fr'?'Post-production par E-DO':'Post-production by E-DO'}</div><div className="font-mono text-label text-muted-foreground mt-1 leading-normal">{lang==='fr' ? 'Sélection, retouche, livraison — chiffrage sur demande selon le volume.' : 'Selection, retouching, delivery — quoted on request based on volume.'}</div></div><div className="flex items-center gap-3"><span className={`font-mono text-label tracking-code uppercase ${enabled ? 'text-primary' : 'text-muted-foreground'}`}>{lang==='fr'?(enabled?'Oui':'Non'):(enabled?'Yes':'No')}</span><Toggle on={enabled} onClick={()=>setPostprod({...postprod, enabled: !enabled, video: !enabled ? video : false})}/></div></div>{enabled && videoAllowed && (<div className={`bg-white px-5 md:px-6 py-5 flex items-center justify-between gap-5 ${video ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent'}`}><div><div className="text-cell font-medium tracking-copy-tight">{lang==='fr'?'Montage vidéo':'Video editing'}</div><div className="font-mono text-label text-muted-foreground mt-1 leading-normal">{lang==='fr' ? 'Uniquement si votre projet inclut de la vidéo — chiffrage sur demande.' : 'Only if your project includes video — quoted on request.'}</div></div><div className="flex items-center gap-3"><span className={`font-mono text-label tracking-code uppercase ${video ? 'text-primary' : 'text-muted-foreground'}`}>{lang==='fr'?(video?'Oui':'Non'):(video?'Yes':'No')}</span><Toggle on={video} onClick={()=>setPostprod({...postprod, video: !video})}/></div></div>)}</div></div>);
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

const BentoField = ({ label, children, span, error }: AnyProps) => (
  <div className={`bg-white px-4 py-2.5 sm:px-3 sm:py-1.5 flex flex-col gap-hairline min-h-control ${error ? 'ring-1 ring-inset ring-red-400' : ''}`} {...(span ? {style:{gridColumn:span}} : {})}>
    <span className="edo-cell-label text-muted-foreground text-micro tracking-meta">{label}</span>
    {children}
    {error && <span className="text-red-500 text-micro leading-tight">{error}</span>}
  </div>
);

const BentoInput = ({ value, onChange, placeholder, type='text', name, autoComplete, inputMode }: AnyProps) => (
  <input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} name={name} autoComplete={autoComplete} inputMode={inputMode} className="bg-transparent border-0 outline-none p-0 font-inherit text-detail tracking-copy-tight w-full text-foreground"/>
);

const Step7Contact = ({ lang, contact, setContact, p, configMode, errors = {} }: AnyProps) => {
  const isCyclo = p && p.isCyclo;
  const hideProductFields = !!configMode;
  const toggleType = (k) => { const cur = contact.typesArticles || []; const next = cur.includes(k) ? cur.filter(x=>x!==k) : [...cur, k]; setContact({...contact, typesArticles: next}); };
  return (<div>
    <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local"><span className="edo-cell-label text-primary whitespace-nowrap">05 · {lang==='fr'?'Vos coordonnées':'Your details'}</span></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 edo-hairline">
      <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 edo-hairline"><BentoField label={lang==='fr'?'Marque':'Brand'}><BentoInput name="brand" value={contact.marque} onChange={v=>setContact({...contact,marque:v})} placeholder="—"/></BentoField><BentoField label={lang==='fr'?'Société *':'Company *'} error={errors.societe}><BentoInput name="company" autoComplete="organization" value={contact.societe} onChange={v=>setContact({...contact,societe:v})} placeholder="—"/></BentoField><BentoField label="SIREN *" error={errors.siren}><BentoInput name="siren" inputMode="numeric" value={contact.siren} onChange={v=>setContact({...contact,siren:v})} placeholder="—"/></BentoField></div>
      <BentoField label={lang==='fr'?'Adresse de facturation *':'Billing address *'} span="1 / -1" error={errors.adresseFacturation}><BentoInput name="address" autoComplete="street-address" value={contact.adresseFacturation} onChange={v=>setContact({...contact,adresseFacturation:v})} placeholder="—"/></BentoField>
      <BentoField label={lang==='fr'?'Nom *':'Last name *'} error={errors.nom}><BentoInput name="lastname" autoComplete="family-name" value={contact.nom} onChange={v=>setContact({...contact,nom:v})} placeholder="—"/></BentoField>
      <BentoField label={lang==='fr'?'Prénom *':'First name *'} error={errors.prenom}><BentoInput name="firstname" autoComplete="given-name" value={contact.prenom} onChange={v=>setContact({...contact,prenom:v})} placeholder="—"/></BentoField>
      <BentoField label="Email *" error={errors.email}><BentoInput name="email" autoComplete="email" value={contact.email} type="email" onChange={v=>setContact({...contact,email:v})} placeholder="—"/></BentoField>
      <BentoField label={lang==='fr'?'Téléphone *':'Phone *'} error={errors.tel}><BentoInput name="phone" autoComplete="tel" value={contact.tel} type="tel" onChange={v=>setContact({...contact,tel:v})} placeholder="—"/></BentoField>
      {!isCyclo && !hideProductFields && (<>
        <div className={`bg-white px-3 py-1.5 col-span-1 sm:col-span-2 flex flex-col gap-1 min-h-control ${errors.typesArticles ? 'ring-1 ring-inset ring-red-400' : ''}`}><span className="edo-cell-label text-muted-foreground text-micro tracking-meta">{lang==='fr'?"Type d'articles *":'Item types *'}</span><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">{ARTICLE_TYPES.map(t=>{ const on = (contact.typesArticles||[]).includes(t.k); return (<button type="button" key={t.k} onClick={()=>toggleType(t.k)} className={`${on ? 'bg-foreground text-white border-foreground' : 'bg-transparent text-foreground border-border'} border px-2 py-1 font-inherit text-caption cursor-pointer tracking-copy-tight inline-flex items-center justify-start gap-1 whitespace-nowrap min-w-0`}><span className={`w-2 h-2 border ${on ? 'border-white bg-primary' : 'border-muted-foreground bg-transparent'} inline-flex items-center justify-center shrink-0`}>{on && <span className="w-0.5 h-0.5 bg-white"/>}</span><span className="overflow-hidden text-ellipsis">{t[lang]}</span></button>); })}</div>{(contact.typesArticles||[]).includes('autre') && (<input name="other_item_type" value={contact.autreType||''} onChange={e=>setContact({...contact,autreType:e.target.value})} placeholder={lang==='fr'?"Précisez (autre type d'articles)…":'Specify (other item type)…'} className="mt-0.5 bg-transparent border-0 border-b border-b-border outline-none py-1 px-0 font-inherit text-caption tracking-copy-tight w-full text-foreground"/>)}{errors.typesArticles && <span className="text-red-500 text-micro leading-tight">{errors.typesArticles}</span>}</div>
        <BentoField label={lang==='fr'?'Qté articles (SKUs) *':'Qty items (SKUs) *'} error={errors.quantiteArticles}><BentoInput name="quantity_items" value={contact.quantiteArticles} type="number" onChange={v=>setContact({...contact,quantiteArticles:v})} placeholder="—"/></BentoField>
        <BentoField label={lang==='fr'?'Vues / article *':'Views / item *'} error={errors.vuesParArticle}><BentoInput name="views_per_item" value={contact.vuesParArticle} type="number" onChange={v=>setContact({...contact,vuesParArticle:v})} placeholder="—"/></BentoField>
      </>)}
      <div className="bg-white px-3 py-1.5 col-span-1 sm:col-span-2 flex flex-col gap-0.5 min-h-control"><span className="edo-cell-label text-muted-foreground text-micro tracking-meta">{lang==='fr'?'Autres informations':'Other information'}</span><textarea name="message" value={contact.autresInfos||''} onChange={e=>setContact({...contact,autresInfos:e.target.value})} placeholder={lang==='fr'?'Contraintes, inspirations, références… (facultatif)':'Constraints, inspirations, references… (optional)'} className="w-full box-border bg-transparent border-0 outline-none p-0 font-inherit text-caption min-h-7 resize-y text-foreground"/></div>
      <label className={`col-span-1 sm:col-span-2 bg-white px-3 py-1.5 flex flex-col gap-0.5 cursor-pointer min-h-control ${errors.cgvAccepted ? 'ring-1 ring-inset ring-red-400' : ''}`}><span className="edo-cell-label text-muted-foreground text-micro tracking-meta">CGV *</span><div className="flex items-center gap-2"><input type="checkbox" name="cgv_accepted" checked={!!contact.cgvAccepted} onChange={e=>setContact({...contact,cgvAccepted:e.target.checked})} className="w-3.5 h-3.5 accent-primary cursor-pointer shrink-0"/><span className="text-caption leading-snug text-foreground">{lang==='fr' ? <>J'accepte les <a href={`/${lang}/legal?doc=cgv`} target="_blank" rel="noopener noreferrer" className="text-primary underline">conditions générales de vente</a> et les modalités de paiement.</> : <>I accept the <a href={`/${lang}/legal?doc=cgv`} target="_blank" rel="noopener noreferrer" className="text-primary underline">terms and conditions of sale</a> and payment terms.</>}</span></div>{errors.cgvAccepted && <span className="text-red-500 text-micro leading-tight">{errors.cgvAccepted}</span>}</label>
    </div>
  </div>);
};

const SidePanel = ({ lang, p, selected, months, slotType, hours, cycloMode, rows, total, isPreview, step, plateaus, perPlateau }: AnyProps) => {
  const slotLbl = isPreview ? (lang==='fr'?'estimation live':'live estimate') : p.isCyclo ? (cycloMode==='halfH'?'5h':(cycloMode==='fullH'?'10h':(lang==='fr'?'10h éditorial':'10h editorial'))) : p.isVisite ? (lang==='fr'?'visite':'visit') : (slotType==='hour'? `${hours}h`:(slotType==='half'?(()=>{const hh=Math.max(4,Math.min(7,hours||4));return hh===4?(lang==='fr'?'½ j':'½ d'):`${hh}h`;})():(()=>{ const totalH = hours || 8; const fullDays = Math.floor(totalH / 8); const extraH = totalH - fullDays * 8; const dUnit = lang==='fr'?'j':'d'; let s = `${fullDays} ${dUnit}`; if (extraH === 4) s += lang==='fr'?' + ½ j':' + ½ d'; else if (extraH > 0) s += ` + ${extraH}h`; return s; })()));
  const title = isPreview ? (lang==='fr'?'Estimation':'Estimate') : p[lang];
  return (<div className="bg-foreground md:col-start-4 md:row-start-2 text-white px-5 py-6 md:p-6 overflow-auto flex flex-col gap-4 md:gap-3.5 min-h-0"><div><span className="edo-cell-label text-white/55 md:hidden">{lang==='fr'?'Votre devis':'Your quote'}</span><h2 className="m-0 mt-2 md:mt-0 text-tile-large font-light tracking-headline text-white/85">{title}</h2><div className="font-mono text-label text-white/55 mt-1 tracking-caption">{slotLbl}</div></div>{(() => { const list = (plateaus || []).filter(Boolean); const isMulti = list.length > 1; if (isMulti) { const datedList = list.map(k => ({k, px: BOOK_PLATEAUX.find(x => x.k === k), d: (perPlateau||{})[k]?.date})).filter(x => x.d); if (datedList.length === 0) return null; return (<div className="pt-3.5 border-t border-white/10"><span className="edo-cell-label text-white/55 mb-1.5 block">{lang==='fr'?'Dates':'Dates'}</span><div className="flex flex-col gap-1.5">{datedList.map(({k, px, d}) => (<div key={k} className="flex justify-between items-baseline gap-2 text-detail"><span className="text-white/55 font-mono text-label tracking-caption uppercase">{px ? px[lang] : k}</span><span className="tracking-copy-tight">{d.d} {months[d.m]} {d.y}</span></div>))}</div></div>); } if (!selected) return null; return (<div className="pt-3.5 border-t border-white/10"><span className="edo-cell-label text-white/55 mb-1.5 block">{lang==='fr'?'Date':'Date'}</span><div className="text-cell tracking-copy-tight">{selected.d} {months[selected.m]} {selected.y}</div></div>); })()}<div className="pt-3.5 border-t border-white/10 flex-1 min-h-0 flex flex-col"><span className="edo-cell-label text-white/55 mb-2.5 block">{lang==='fr'?'Détail':'Breakdown'}</span><div className="flex flex-col gap-1.5 overflow-auto pr-1">{rows.length===0 && <span className="text-caption text-white/40">—</span>}{rows.map((r,i)=>(<div key={i} className="flex flex-col gap-0.5"><div className="flex justify-between items-baseline gap-2 text-caption"><span className="tracking-copy-tight">{(() => { const idx = r.lbl.indexOf(' · '); if (idx === -1) return <span className="text-white/75">{r.lbl}</span>; return (<><span className="text-white/40">{r.lbl.slice(0, idx)}</span><span className="text-white/75">{r.lbl.slice(idx)}</span></>); })()}</span><span className="font-mono tabular-nums text-white whitespace-nowrap">{r.onReq ? (lang==='fr'?'sur demande':'on request') : `${fmtEUR(r.amt)} €`}</span></div>{r.breakdown && r.breakdown.length > 0 && (<div className="pl-0.5 flex flex-col gap-hairline">{r.breakdown.map((b, bi) => { const viewLbl = b.labels ? b.labels[lang] : null; const formula = b.imagesPerSku && b.imagesPerSku > 1 ? `${b.qty} × ${b.imagesPerSku} × ${fmtEUR(b.unit)} €` : `${b.qty} × ${fmtEUR(b.unit)} €`; const line = viewLbl ? `${viewLbl} · ${formula}` : formula; return (<div key={bi} className="flex justify-between gap-2 font-mono text-micro text-white/40 tracking-caption"><span>→ {line}</span><span className="tabular-nums">{fmtEUR(b.subtotal)} €</span></div>); })}</div>)}</div>))}</div></div><div className="pt-3.5 border-t border-white/25"><div className="flex justify-between items-baseline"><span className="font-mono text-caption tracking-ui uppercase text-white/65">Total HT</span><span className="text-page-title font-light tracking-headline tabular-nums">{fmtEUR(total)} €</span></div><div className="font-mono text-micro text-white/45 mt-1 tracking-ui">TVA 20% · {fmtEUR(total*1.2)} € TTC</div>{rows.some(r=>r.estimate) && (<div className="font-mono text-micro text-white/45 mt-1.5 tracking-caption leading-normal">{lang==='fr' ? '⚠ Prix post-production estimatif — ajusté après brief selon volume et complexité.' : '⚠ Post-production price is an estimate — adjusted after brief based on volume and complexity.'}</div>)}</div></div>);
};

const Toggle = ({ on, onClick }: AnyProps) => (
  <button type="button" onClick={onClick} className={`w-11.5 h-6.5 ${on ? 'bg-primary' : 'bg-border'} border-0 rounded-full relative cursor-pointer transition-colors duration-150`}>
    <span className={`absolute top-[3px] left-toggle-thumb ${on ? 'translate-x-5' : 'translate-x-0'} w-5 h-5 bg-white rounded-full transition-transform duration-150 shadow-toggle`}/>
  </button>
);

export { BookPageV2 };
