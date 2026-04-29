/* global React, IconArrowRight, IconMenu, Wordmark, CellLabel, MarqueeCell */

/* =================================================================
   BOOK PAGE V2 — Sandbox version (safe to experiment)
   -----------------------------------------------------------------
   Steps : 01 Plateau · 02 Date · 03 Créneau · 04 Équipement
           05 Équipe · 06 Post-prod · 07 Coordonnées · 08 Récap
   Price : side panel right — updates live, EUR HT
   Layout : grid 64px header + stepper rail + content + side panel
   ================================================================= */

const { useState: useStateBook, useMemo: useMemoBook } = React;

/* ---------- TARIFS (EUR HT) ---------- */
const BOOK_PLATEAUX = [
  {k:'live',       fr:'Live',       en:'Live',       desc:{fr:'Shooting porté',en:'On-model shooting'},
    rates:{hour:185, half:620,  full:1120}, hdUnit:'half', fdUnit:'full'},
  {k:'eclipse',    fr:'Eclipse',    en:'Eclipse',    desc:{fr:'Chaussures & accessoires',en:'Shoes & accessories'},
    rates:{hour:160, half:560,  full:990}, hdUnit:'half', fdUnit:'full'},
  {k:'horizontal', fr:'Horizontal', en:'Horizontal', desc:{fr:'Packshots à plat',en:'Flat packshots'},
    rates:{hour:120, half:410,  full:740}, hdUnit:'half', fdUnit:'full'},
  {k:'vertical',   fr:'Vertical',   en:'Vertical',   desc:{fr:'Mannequin ghost',en:'Ghost mannequin'},
    rates:{hour:120, half:410,  full:740}, hdUnit:'half', fdUnit:'full'},
  {k:'cyclorama',  fr:'Cyclorama',  en:'Cyclorama',  desc:{fr:'Cyclo blanc 30 m²',en:'White cyclo 30 m²'},
    rates:{hour:null, halfH:650, fullH:880, editorial:660}, hdUnit:'halfH', fdUnit:'fullH',
    isCyclo:true},
  {k:'visite',     fr:'Visite',     en:'Visit',      desc:{fr:'',en:''},
    rates:{hour:0, half:0, full:0}, hdUnit:'half', fdUnit:'full', isVisite:true},
];

const CYCLO_EXTRAS = {
  paint:   110,
  kwh:     1.4,
};

/* Format EUR : no rounding, show decimals only when non-zero. */
const fmtEUR = (n) => {
  if (n == null || isNaN(n)) return '0';
  const num = Number(n);
  // Truncate to 2 decimals without rounding to avoid hiding real precision
  const truncated = Math.trunc(num * 100) / 100;
  const hasDecimals = truncated !== Math.trunc(truncated);
  return truncated.toLocaleString('fr-FR', {
    minimumFractionDigits: hasDecimals ? (truncated * 10 !== Math.trunc(truncated * 10) ? 2 : 1) : 0,
    maximumFractionDigits: 2,
  });
};

const EQUIPE = [
  {k:'styliste_op',   fr:'Styliste',            en:'Stylist',            price:67.5, unit:'hour', forMethods:['packshot']},
  {k:'operateur',     fr:'Opérateur machine',   en:'Machine operator',   price:67.5, unit:'hour', forMethods:['onmodel','other']},
  {k:'plateau',       fr:'Assistant plateau',   en:'Stage assistant',    price:200, unit:'day'},
  {k:'setdesign',     fr:'Assistant set design',en:'Set design assistant',price:500,unit:'day'},
  {k:'styliste',      fr:'Assistant styliste',  en:'Styling assistant',  price:250, unit:'day'},
  {k:'prod',          fr:'Assistant production',en:'Production assistant',price:350,unit:'day'},
];

const POSTPROD = [
  {k:'datamgmt',   fr:'Data management (sélection / naming)', en:'Data management (select / naming)', price:50, unit:'hour'},
  {k:'retouche',   fr:'Retouche packshot', en:'Packshot retouching', price:25,  unit:'visual'},
  {k:'retouchehd', fr:'Retouche HD',       en:'HD retouching',       price:75,  unit:'visual'},
  {k:'montage',    fr:'Montage vidéo',     en:'Video edit',          price:450, unit:'flat'},
  {k:'animation',  fr:'Animation 360° / stop-motion', en:'360° animation / stop-motion', price:400, unit:'product'},
];

/* Post-prod unit pricing (€/image) — estimatif.
   Ghost est le seul cas où le prix varie par vue ; ailleurs un tarif unique s'applique à toutes les vues. */
const PP_UNIT = {
  'pap.onmodel':            { all: 7.90 },
  'pap.packshot.pique':     { all: 7.90 },
  'pap.packshot.ghost':     { face: 7.90, '3/4': 7.90, dos: 5.40, detail: 4.40 },
  'pap.packshot.flat':      { all: 5.40 },
  'access.chaussure':       { all: 5.40 },
  'access.maroquinerie':    { all: 5.40 },
  'access.textile':         { all: 5.40 },
  'eyewear':                { all: 11.50 },
  'food':                   { all: 5.40 },
  'cosmetique':             { all: 5.40 },
  'bijoux':                 { all: 16.50 },
};

/* Computes the estimative post-prod price for one session.
   Returns {amount, images, breakdown} where breakdown is an array of
   {label, qty, unit, subtotal} lines for display. */
const computePostprodPrice = (session) => {
  const cfgKey = cfgMatrixKey(session);
  const table = PP_UNIT[cfgKey];
  if (!table) return null;
  const qty = Number(session.quantity) || 0;
  if (qty <= 0) return null;

  const VIEW_LABELS = {
    face:   {fr:'Face',   en:'Front'},
    dos:    {fr:'Dos',    en:'Back'},
    '3/4':  {fr:'3/4',    en:'3/4'},
    detail: {fr:'Détail', en:'Detail'},
  };

  // Ghost : price per view
  if (cfgKey === 'pap.packshot.ghost') {
    const selected = (session.views || []).filter(v => table[v] != null);
    if (!selected.length) return null;
    const breakdown = selected.map(v => ({
      view: v,
      qty,
      unit: table[v],
      subtotal: +(qty * table[v]).toFixed(2),
      labels: VIEW_LABELS[v],
    }));
    const amount = +breakdown.reduce((s, b) => s + b.subtotal, 0).toFixed(2);
    const images = selected.length * qty;
    return { amount, images, breakdown, perView: true };
  }

  // All other cases : flat per-image rate
  const unit = table.all;
  let imagesPerSku = 1;
  if (session.product === 'pap' && session.method === 'packshot') {
    imagesPerSku = Math.max(1, (session.views || []).length);
  } else {
    imagesPerSku = Math.max(1, Number(session.viewsCount) || 1);
  }
  const images = imagesPerSku * qty;
  const amount = +(unit * images).toFixed(2);
  return {
    amount, images, unit, imagesPerSku, qty,
    breakdown: [{ qty, imagesPerSku, unit, subtotal: amount }],
    perView: false,
  };
};

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FR = ['L','M','M','J','V','S','D'];
const DAYS_EN = ['M','T','W','T','F','S','S'];

/* Deterministic "availability" per date */
const availFor = (plateauKey, y, m, d) => {
  const key = plateauKey.charCodeAt(0) + y + m*31 + d*7;
  const r = (key * 2654435761) >>> 0;
  const bucket = r % 10;
  if (bucket < 2) return 'unavailable';
  if (bucket < 4) return 'limited';
  return 'free';
};

/* ================================================================= */
/*  CONFIGURATEUR V2 — arborescence produits E-DO                    */
/* ================================================================= */
/*
   Arbre de questions (Excel fourni par le client) :
   Q1  Type de produit     : prêt-à-porter | accessoires | eyewear | food |
                             cosmétique | bijoux | cyclorama/production libre
   Q2  Méthode (PAP)       : packshot-piqué | packshot-ghost | packshot-flat | on-model
   Q2b Sous-type (access.) : chaussure | maroquinerie | accessoires-textile
   Q3  Média               : photo | video          (si pertinent)
   Q4  Vues (packshot)     : face / dos / détail / 3/4   (multi)
       Vues (autres)       : nombre de vues par produit  (numérique)
   Q5  Quantité            : nombre de produits
   Q6  Post-prod           : oui / non
   Q7  Post-prod vidéo     : oui / non (si média = video ET post-prod = oui)

   Matrice plateau + cadence (produits / 8h) :
   ─────────────────────────────────────────────────────────
   PAP · packshot piqué    → VERTICAL   · 50 face / 25 face+dos
   PAP · packshot ghost    → VERTICAL   · 75 face / 70 face+dos / 70 3/4
   PAP · packshot flat     → HORIZONTAL · 70 face / 60 face+dos
   PAP · on-model          → LIVE       · 70 /jour
   Accessoires · chaussure → ECLIPSE    · 60 /jour
   Accessoires · maroq.    → ECLIPSE    · 60 /jour
   Accessoires · textile   → ECLIPSE    · 80 /jour
   Eyewear                 → ECLIPSE    · 50 /jour
   Food & spiritueux       → ECLIPSE    · 50 /jour
   Cosmétique              → ECLIPSE    · 50 /jour
   Bijoux                  → ECLIPSE    · 60 /jour
   Cyclorama / prod libre  → CYCLORAMA  · sur demande

   "Détail" = juste de la post-prod en plus (pas d'impact sur la cadence).
*/

// Table de productivité : [key] → { plateau, cadences par combinaison de vues }
// cadences en produits / 8h
const CFG_MATRIX = {
  'pap.packshot.pique': {
    plateau: 'vertical',
    // Piqué : on raisonne en images/8h (chaque vue = 1 image dédiée).
    // 50 images/8h → face seule = 50 prod, face+dos = 25 prod, etc.
    imageRate: 50,
    views: ['face', 'dos', 'detail'], // detail = post-prod only
  },
  'pap.packshot.ghost': {
    plateau: 'vertical',
    rates: {
      face: 75,
      dos: 75,
      'face+dos': 70,
      '3/4': 70,
      'face+3/4': 70,
      'face+dos+3/4': 70,
    },
    views: ['face', 'dos', 'detail', '3/4'],
  },
  'pap.packshot.flat': {
    plateau: 'horizontal',
    rates: {
      face: 70,
      dos: 70,
      'face+dos': 60,
    },
    views: ['face', 'dos', 'detail'],
  },
  'pap.onmodel':         { plateau: 'live',    rate: 70 },
  'access.chaussure':    { plateau: 'eclipse', rate: 60 },
  'access.maroquinerie': { plateau: 'eclipse', rate: 60 },
  'access.textile':      { plateau: 'eclipse', rate: 80 },
  'eyewear':             { plateau: 'eclipse', rate: 50 },
  'food':                { plateau: 'eclipse', rate: 50 },
  'cosmetique':          { plateau: 'eclipse', rate: 50 },
  'bijoux':              { plateau: 'eclipse', rate: 60 },
  'cyclorama':           { plateau: 'cyclorama', onRequest: true },
};

// Retourne la clé matrice correspondant à une session
const cfgMatrixKey = (s) => {
  if (s.projectType === 'cyclorama') return 'cyclorama';
  if (s.product === 'pap') {
    if (s.method === 'onmodel') return 'pap.onmodel';
    return `pap.packshot.${s.submethod || 'pique'}`;
  }
  if (s.product === 'accessoires') return `access.${s.submethod || 'chaussure'}`;
  return s.product; // eyewear / food / cosmetique / bijoux
};

// Calcule la cadence applicable selon les vues cochées pour un packshot
const packshotRate = (entry, views) => {
  const packshotViews = (views || []).filter(v => v !== 'detail'); // detail = post-prod only
  // Mode "imageRate" : cadence exprimée en images/8h (ex: piqué).
  // Cadence produit = imageRate / nb de vues facturables.
  if (entry.imageRate) {
    const nbViews = Math.max(1, packshotViews.length);
    return Math.max(1, Math.round(entry.imageRate / nbViews));
  }
  const key = packshotViews.sort().join('+') || 'face';
  return entry.rates[key] || entry.rates['face'] || 50;
};

/* ================================================================= */
/*  recommendSession — produit un {plateau, slotType, hours, cycloMode}
    à partir d'une session configurator basée sur l'arbre E-DO.      */
/* ================================================================= */
const recommendSession = (session, global) => {
  const reasoning = [];
  const key = cfgMatrixKey(session);
  const entry = CFG_MATRIX[key];
  const qty = Number(session.quantity) || 0;
  const views = session.views || [];
  const viewsCount = Number(session.viewsCount) || 1;

  // Cas cyclorama : sur demande, pas de calcul
  if (!entry || entry.onRequest) {
    return {
      plateau: 'cyclorama',
      slotType: null,
      hours: 0,
      cycloMode: 'halfH',
      rentalHours: 5,
      totalVisuals: qty * viewsCount,
      onRequest: true,
      reasoning: [{fr:'Cyclorama / production libre : devis sur demande.', en:'Cyclorama / free production: quote on request.'}],
    };
  }

  const plateau = entry.plateau;

  // Cadence selon méthode
  let cadence;
  if (session.product === 'pap' && session.method === 'packshot') {
    cadence = packshotRate(entry, views);
    const viewsLabel = (views || []).filter(v=>v!=='detail').join(' + ') || 'face';
    if (entry.imageRate) {
      reasoning.push({
        fr:`Cadence : ${entry.imageRate} images / 8h → ${cadence} produits / 8h (${viewsLabel}).`,
        en:`Throughput: ${entry.imageRate} images / 8h → ${cadence} products / 8h (${viewsLabel}).`,
      });
    } else {
      reasoning.push({
        fr:`Cadence : ${cadence} produits / 8h (${viewsLabel}).`,
        en:`Throughput: ${cadence} products / 8h (${viewsLabel}).`,
      });
    }
    if ((views || []).includes('detail')) {
      reasoning.push({fr:'"Détail" compté comme post-prod additionnelle.', en:'"Detail" counted as additional post-prod.'});
    }
  } else {
    cadence = entry.rate;
    reasoning.push({
      fr:`Cadence : ${cadence} produits / 8h.`,
      en:`Throughput: ${cadence} products / 8h.`,
    });
  }

  // Heures réelles nécessaires : on arrondit au plus proche (tolérance ±0.5h)
  // pour ne pas pénaliser les quantités juste au-dessus d'un palier — ex. 23 produits
  // à 60/jour = 3.07h → 3h, pas 4h.
  const rawHours = qty > 0 ? (qty / cadence) * 8 : 0;
  const estimatedHours = Math.max(1, Math.round(rawHours));
  const rawDays = qty > 0 ? qty / cadence : 0;

  let slotType, hours, cycloMode = null;
  if (rawDays === 0) {
    slotType = 'hour'; hours = 1;
  } else if (estimatedHours <= 3) {
    slotType = 'hour';
    hours = estimatedHours;
    reasoning.push({fr:`${qty} produits → ~${hours}h.`, en:`${qty} products → ~${hours}h.`});
  } else if (estimatedHours <= 7) {
    slotType = 'half';
    hours = estimatedHours;
    reasoning.push({fr:`${qty} produits → demi-journée (${hours}h).`, en:`${qty} products → half day (${hours}h).`});
  } else {
    slotType = 'full';
    hours = estimatedHours; // heures RÉELLES, pas snap à 8h
    const totalDays = Math.ceil(rawDays);
    if (totalDays === 1) {
      reasoning.push({fr:`${qty} produits → journée complète (${hours}h).`, en:`${qty} products → full day (${hours}h).`});
    } else {
      reasoning.push({
        fr:`${qty} produits → ${hours}h (${totalDays} journées).`,
        en:`${qty} products → ${hours}h (${totalDays} days).`,
      });
    }
  }

  const rentalHours = hours;
  const totalDays = Math.max(1, Math.ceil(rawDays)) || 1;

  return {
    plateau, slotType, hours, cycloMode,
    reasoning,
    totalVisuals: qty * Math.max(1, viewsCount || (views||[]).filter(v=>v!=='detail').length || 1),
    rentalHours,
    totalDays, cadence,
    estimatedHours,
  };
};

/* Project-level team + postprod — per-session postprod drives team needs */
const recommendProjectLevel = (sessions, global) => {
  const reasoning = [];
  const totalSKUs = sessions.reduce((s, x) => s + (Number(x.quantity) || 0), 0);
  const nSessions = sessions.length;
  const anyPostprod = sessions.some(s => s.postprod);
  const anyVideo = sessions.some(s => s.postprodVideo);

  const team = {};
  // Aucune équipe pré-sélectionnée : tout est optionnel, l'utilisateur ajoute lui-même.

  // Post-prod — on garde la mention "sur demande" par plateau (géré dans applyConfig)
  const pp = {};
  if (anyPostprod) {
    reasoning.push({fr:'Post-production : devis sur demande par plateau concerné.', en:'Post-production: quote on request per relevant stage.'});
  }
  if (anyVideo) {
    reasoning.push({fr:'Montage vidéo inclus dans le devis post-prod.', en:'Video edit included in post-prod quote.'});
  }

  return { team, pp, reasoning, totalSKUs, totalVisuals: totalSKUs };
};

/* ================================================================= */
/*  MAIN                                                              */
/* ================================================================= */
const makeBlankSession = () => ({
  // Arbre E-DO : projectType → produit → méthode → sous-type → média → vues → quantité → post-prod
  projectType: null,  // 'ecom' | 'cyclorama'
  product: null,      // 'pap' | 'accessoires' | 'eyewear' | 'food' | 'cosmetique' | 'bijoux'  (only if projectType='ecom')
  method: null,       // 'packshot' | 'onmodel' (PAP) | 'photo' | 'video' (accessoires / autres)
  submethod: null,    // 'pique' | 'ghost' | 'flat' (packshot) | 'chaussure' | 'maroquinerie' | 'textile' (access.)
  media: [],          // ['photo','video'] (pour on-model et accessoires/autres) — multi-select
  views: [],          // ['face','dos','detail','3/4'] pour packshot
  viewsCount: '',     // nombre de vues par produit (non-packshot)
  quantity: '',       // nombre de produits
  postprod: false,
  postprodVideo: false,
});

const isSessionValid = (s) => {
  if (!s.projectType) return false;
  if (s.projectType === 'cyclorama') return true;
  if (!s.product) return false;
  if (s.product === 'pap') {
    if (!s.method) return false;
    if (s.method === 'packshot') {
      if (!s.submethod) return false;
      if (!(s.views || []).some(v => v !== 'detail')) return false;
      if (!Number(s.quantity)) return false;
      return true;
    }
    if (s.method === 'onmodel') {
      if (!((s.media||[]).length)) return false;
      if (!Number(s.quantity)) return false;
      if (!Number(s.viewsCount)) return false;
      return true;
    }
    return false;
  }
  if (s.product === 'accessoires') {
    if (!s.submethod) return false;
    if (!((s.media||[]).length)) return false;
    if (!Number(s.quantity)) return false;
    if (!Number(s.viewsCount)) return false;
    return true;
  }
  if (!((s.media||[]).length)) return false;
  if (!Number(s.quantity)) return false;
  if (!Number(s.viewsCount)) return false;
  return true;
};

const BookPageV2 = ({ lang, setLang, openMenu, goto }) => {
  const today = new Date();
  const [step, setStep] = useStateBook(() => {
    // If we arrived here from a specific plateau page, skip the configurator
    // and land on step 1 (plateau selection, with the plateau already selected).
    try {
      if (localStorage.getItem('edo-book-plateau')) return 1;
    } catch(e){}
    return 0;
  }); // 0 = configurateur, 1..7 = flow

  // Configurator state — now project-level globals + array of plateau sessions
  const [configGlobal, setConfigGlobal] = useStateBook({
    projectType: 'ecom',
    urgency: 'flex',
    postprod: false,
  });
  const [configSessions, setConfigSessions] = useStateBook([makeBlankSession()]);
  const [activeSessionIdx, setActiveSessionIdx] = useStateBook(0);
  const [configApplied, setConfigApplied] = useStateBook(false);

  const [plateau, setPlateau] = useStateBook(()=>{
    try {
      const pre = localStorage.getItem('edo-book-plateau');
      if (pre) { localStorage.removeItem('edo-book-plateau'); return pre; }
    } catch(e){}
    return null;
  });

  // Multi-plateau : list of selected plateau keys + per-plateau config overrides.
  // The first selected plateau stays in the legacy `plateau` state so the single-
  // plateau flow still works. `plateaus` is the source of truth from Step 1 on.
  const [plateaus, setPlateaus] = useStateBook(() => plateau ? [plateau] : []);
  const [perPlateau, setPerPlateau] = useStateBook(() => {
    if (!plateau) return {};
    const px = BOOK_PLATEAUX.find(x => x.k === plateau);
    return {
      [plateau]: {
        slotType: (px && px.isCyclo) ? null : 'hour',
        hours: 1,
        cycloMode: 'halfH',
        paint: false,
        kwh: 0,
      }
    };
  }); // {plateauKey: {slotType, hours, cycloMode, paint, kwh}}

  const togglePlateau = (k) => {
    setPlateaus(prev => {
      const next = prev.includes(k) ? prev.filter(x=>x!==k) : [...prev, k];
      // keep legacy `plateau` in sync with the first selected one
      setPlateau(next[0] || null);
      // seed per-plateau defaults when adding
      if (!prev.includes(k)) {
        const px = BOOK_PLATEAUX.find(x=>x.k===k);
        setPerPlateau(p => ({...p, [k]: {
          slotType:'hour', hours:1, cycloMode:'halfH', paint:false, kwh:0,
          ...(px && px.isCyclo ? {slotType:null} : {}),
        }}));
      }
      return next;
    });
  };
  const [viewY, setViewY] = useStateBook(today.getFullYear());
  const [viewM, setViewM] = useStateBook(today.getMonth());
  const [selected, setSelected] = useStateBook(null); // {y,m,d}
  const [arrivalHour, setArrivalHour] = useStateBook(10); // arrival time in hours (9-18)
  const [dateIdx, setDateIdx] = useStateBook(0); // sub-step index for multi-plateau date selection

  const [slotType, setSlotType] = useStateBook('hour');   // hour / half / full
  const [hours, setHours] = useStateBook(1);
  const [cycloMode, setCycloMode] = useStateBook('halfH'); // halfH / fullH / editorial

  // Step 4 : equipment
  const [paint, setPaint] = useStateBook(false);
  const [kwh, setKwh] = useStateBook(0);

  // Step 5 : team
  const [team, setTeam] = useStateBook({}); // {k: days}
  // Step 6 : postprod
  const [pp, setPp] = useStateBook({}); // {k: qty}

  // Step 7 : contact
  const [contact, setContact] = useStateBook({
    marque:'', societe:'', siren:'', adresseFacturation:'',
    nom:'', prenom:'', email:'', tel:'',
    typesArticles:[], quantiteArticles:'', vuesParArticle:'',
    autresInfos:'', cgvAccepted:false,
  });

  const [sent, setSent] = useStateBook(false);

  const months = lang==='fr' ? MONTHS_FR : MONTHS_EN;
  const days   = lang==='fr' ? DAYS_FR   : DAYS_EN;

  const p = BOOK_PLATEAUX.find(x=>x.k===plateau) || {k:null, fr:'—', en:'—', desc:{fr:'',en:''}, rates:{hour:0,half:0,full:0}, hdUnit:'half', fdUnit:'full'};

  /* ---------- Rental duration (shared) ---------- */
  const rentalHours = p.isCyclo
    ? (cycloMode==='halfH' ? 5 : 10)
    : p.isVisite ? 1
    : (slotType==='hour' ? hours : (slotType==='half' ? Math.max(4,Math.min(7,hours)) : 8));

  /* ---------- Price computation (multi-plateau aware) ---------- */
  const priceBreakdown = useMemoBook(()=>{
    // If no plateaus array, fall back to legacy single `plateau` (configurator
    // skip path, etc.). Multi-plateau case iterates over `plateaus`.
    const keys = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []);
    const groups = []; // [{plateauKey, plateauName, rows: [], subtotal}]

    // -------- CONFIGURATOR LIVE PREVIEW (step 0) --------
    // When the user is still in the configurator and hasn't picked a plateau,
    // derive an estimate per session so the side panel updates live as answers
    // come in. Uses the same recommendation engine as applyConfig.
    if (step === 0 && keys.length === 0) {
      const previewRows = [];
      (configSessions || []).forEach((s, idx) => {
        const valid = (s.projectType === 'cyclorama') ||
          (s.projectType === 'ecom' && s.product && Number(s.quantity) > 0);
        if (!valid) return;
        const rec = recommendSession(s, configGlobal);
        const px = BOOK_PLATEAUX.find(x => x.k === rec.plateau);
        if (!px) return;
        const sessionTag = (configSessions.length > 1)
          ? `${lang==='fr'?'Session':'Session'} ${String(idx+1).padStart(2,'0')} · `
          : '';
        if (px.isCyclo || rec.onRequest) {
          previewRows.push({
            lbl: `${sessionTag}${px[lang]} · ${lang==='fr'?'sur demande':'on request'}`,
            amt: 0, onReq: true,
          });
        } else if (rec.slotType === 'hour') {
          const h = rec.hours || 1;
          previewRows.push({
            lbl: `${sessionTag}${px[lang]} · ${h}h`,
            amt: +(px.rates.hour * h).toFixed(2),
          });
        } else if (rec.slotType === 'half') {
          const hh = Math.max(4, Math.min(7, rec.hours || 4));
          const amt = hh === 4 ? px.rates.half : +(px.rates.half * hh / 4).toFixed(2);
          previewRows.push({
            lbl: `${sessionTag}${px[lang]} · ${lang==='fr'?`Demi-journée (${hh}h)`:`Half day (${hh}h)`}`,
            amt,
          });
        } else if (rec.slotType === 'full') {
          const totalH = rec.hours || 8;
          const fullDays = Math.floor(totalH / 8);
          const extraH = totalH - fullDays * 8;
          if (fullDays >= 1) {
            previewRows.push({
              lbl: `${sessionTag}${px[lang]} · ${fullDays} ${lang==='fr'?(fullDays>1?'journées (8h)':'journée (8h)'):(fullDays>1?'days (8h)':'day (8h)')}`,
              amt: +(px.rates.full * fullDays).toFixed(2),
            });
          }
          if (extraH > 0) {
            // Heures supplémentaires facturées au prorata de la journée complète (tarif jour / 8).
            const hourlyFromFull = px.rates.full / 8;
            const amt = +(hourlyFromFull * extraH).toFixed(2);
            // Si exactement 4h → ½ journée ; sinon affichage en heures.
            const lbl = extraH === 4
              ? `${sessionTag}${px[lang]} · ${lang==='fr'?'Demi-journée (4h)':'Half day (4h)'}`
              : `${sessionTag}${px[lang]} · ${extraH}h`;
            previewRows.push({ lbl, amt });
          }
        }
        // Post-prod estimatif par session
        if (s.postprod) {
          const pp = computePostprodPrice(s);
          if (pp) {
            previewRows.push({
              lbl: `${sessionTag}${lang==='fr'?'Post-production':'Post-production'} · ${pp.images} ${lang==='fr'?'images':'images'}`,
              amt: pp.amount,
              estimate: true,
              breakdown: pp.breakdown,
              perView: pp.perView,
            });
          } else {
            previewRows.push({
              lbl: `${sessionTag}${lang==='fr'?'Post-production':'Post-production'} · ${lang==='fr'?'sur demande':'on request'}`,
              amt: 0, onReq: true,
            });
          }
        }
        if (s.postprodVideo) {
          previewRows.push({
            lbl: `${sessionTag}${lang==='fr'?'Montage vidéo':'Video editing'}`,
            amt: 0, onReq: true,
          });
        }
      });
      const total = previewRows.reduce((s,r)=>s+r.amt, 0);
      return { rows: previewRows, groups: [], sharedRows: [], sharedSubtotal: 0, total, isPreview: true };
    }

    keys.forEach(k => {
      const px = BOOK_PLATEAUX.find(x => x.k === k);
      if (!px) return;
      const isLegacyOnly = !plateaus || plateaus.length === 0;
      // For the legacy single plateau, use top-level state. For multi, use perPlateau.
      const st = isLegacyOnly
        ? { slotType, hours, cycloMode, paint, kwh, team }
        : (perPlateau[k] || { slotType:'hour', hours:1, cycloMode:'halfH', paint:false, kwh:0, team:{} });

      const pRows = [];
      if (px.isCyclo) {
        if (st.cycloMode==='halfH') pRows.push({lbl:lang==='fr'?'Cyclorama · 5h':'Cyclorama · 5h', amt:px.rates.halfH});
        else if (st.cycloMode==='fullH') pRows.push({lbl:lang==='fr'?'Cyclorama · 10h':'Cyclorama · 10h', amt:px.rates.fullH});
        else if (st.cycloMode==='editorial') pRows.push({lbl:lang==='fr'?'Cyclorama · 10h éditorial':'Cyclorama · 10h editorial', amt:0, onReq:true});
        if (st.paint) pRows.push({lbl:lang==='fr'?'Peinture cyclo':'Cyclo paint', amt:CYCLO_EXTRAS.paint});
        if (st.kwh > 0) pRows.push({lbl:`${lang==='fr'?'Électricité':'Electricity'} · ${st.kwh} kWh`, amt:+(st.kwh*CYCLO_EXTRAS.kwh).toFixed(2)});
      } else if (px.isVisite) {
        pRows.push({lbl:lang==='fr'?'Visite du studio':'Studio visit', amt:0});
      } else {
        const h = st.hours || 1;
        if (st.slotType==='hour') pRows.push({lbl:`${px[lang]} · ${h}h`, amt:px.rates.hour*h});
        else if (st.slotType==='half') {
          const hh = Math.max(4, Math.min(7, h));
          const amt = hh===4 ? px.rates.half : +(px.rates.half * hh / 4).toFixed(2);
          pRows.push({lbl:`${px[lang]} · ${lang==='fr'?`Demi-journée (${hh}h)`:`Half day (${hh}h)`}`, amt});
        }
        else {
          const totalH = h || 8;
          const fullDays = Math.floor(totalH / 8);
          const extraH = totalH - fullDays * 8;
          if (fullDays > 0) {
            pRows.push({
              lbl: `${px[lang]} · ${fullDays} ${lang==='fr'?(fullDays>1?'journées (8h)':'journée (8h)'):(fullDays>1?'days (8h)':'day (8h)')}`,
              amt: +(px.rates.full * fullDays).toFixed(2),
            });
          }
          if (extraH > 0) {
            const hourlyFromFull = px.rates.full / 8;
            const extraAmt = +(hourlyFromFull * extraH).toFixed(2);
            if (extraH === 4) {
              pRows.push({lbl:`${px[lang]} · ${lang==='fr'?'Demi-journée (4h)':'Half day (4h)'}`, amt:extraAmt});
            } else {
              pRows.push({lbl:`${px[lang]} · ${extraH}h ${lang==='fr'?'(prorata jour/8)':'(pro-rata day/8)'}`, amt:extraAmt});
            }
          }
        }
      }

      // Team for this specific plateau
      const plateauRentalHours = px.isCyclo
        ? (st.cycloMode === 'halfH' ? 5 : 10)
        : px.isVisite ? 1
        : (st.slotType === 'hour' ? (st.hours||1) : st.slotType === 'half' ? Math.max(4,Math.min(7,st.hours||4)) : (st.hours||8));

      const plateauTeam = st.team || {};
      EQUIPE.forEach(e=>{
        const val = plateauTeam[e.k];
        if (!val) return;
        if (e.unit === 'hour') {
          if (val>0) {
            // Flat hourly rate × plateau hours × count
            const amt = +(e.price * plateauRentalHours * val).toFixed(2);
            pRows.push({lbl:`${e[lang]} · ${val} × ${plateauRentalHours}h`, amt});
          }
        } else {
          if (val===true) pRows.push({lbl:`${e[lang]} · ${lang==='fr'?'sur demande':'on request'}`, amt:0, onReq:true});
        }
      });

      // Post-prod per plateau — estimatif basé sur quantité × vues × tarif unitaire
      const plateauPostprod = st.postprod || {};
      if (plateauPostprod.enabled) {
        if (plateauPostprod.amount > 0) {
          pRows.push({
            lbl: `${lang==='fr'?'Post-production':'Post-production'} · ${plateauPostprod.images} ${lang==='fr'?'images':'images'}`,
            amt: plateauPostprod.amount,
            estimate: true,
            breakdown: plateauPostprod.breakdown,
            perView: plateauPostprod.perView,
          });
        } else {
          pRows.push({
            lbl: `${lang==='fr'?'Post-production':'Post-production'} · ${lang==='fr'?'sur demande':'on request'}`,
            amt: 0, onReq: true,
          });
        }
        if (plateauPostprod.video) {
          pRows.push({
            lbl: `${lang==='fr'?'Montage vidéo':'Video editing'}`,
            amt: 0, onReq: true,
          });
        }
      }

      const subtotal = pRows.reduce((s,r)=>s+r.amt, 0);
      groups.push({plateauKey:k, plateauName:px[lang], rows:pRows, subtotal});
    });

    // No shared rows anymore — everything is per plateau
    const sharedRows = [];

    const sharedSubtotal = sharedRows.reduce((s,r)=>s+r.amt, 0);
    const plateauTotal = groups.reduce((s,g)=>s+g.subtotal, 0);
    const total = plateauTotal + sharedSubtotal;

    // Also expose a flat rows array for backward compatibility
    const flatRows = [
      ...groups.flatMap(g => g.rows),
      ...sharedRows,
    ];

    return { rows: flatRows, groups, sharedRows, sharedSubtotal, total };
  }, [plateau, plateaus, perPlateau, slotType, hours, cycloMode, paint, kwh, team, pp, lang, rentalHours, step, configSessions, configGlobal]);

  /* ---------- Calendar cells ---------- */
  const calCells = useMemoBook(()=>{
    const first = new Date(viewY, viewM, 1);
    const dow = (first.getDay() + 6) % 7;
    const ndays = new Date(viewY, viewM+1, 0).getDate();
    const arr = [];
    for (let i=0;i<dow;i++) arr.push(null);
    for (let d=1; d<=ndays; d++) arr.push(d);
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [viewY, viewM]);

  const nextMonth = () => { let m = viewM+1, y = viewY; if (m>11) { m=0; y++; } setViewM(m); setViewY(y); };
  const prevMonth = () => { let m = viewM-1, y = viewY; if (m<0) { m=11; y--; } setViewM(m); setViewY(y); };

  const isPast = (d) => {
    if (!d) return true;
    const dt = new Date(viewY, viewM, d);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dt < t;
  };
  const isSelected = (d) => selected && selected.y===viewY && selected.m===viewM && selected.d===d;

  /* ---------- Step validation ---------- */
  const contactValid = () => {
    const base = contact.societe && contact.siren && contact.adresseFacturation
      && contact.nom && contact.prenom && contact.email && contact.tel && contact.cgvAccepted;
    if (!base) return false;
    if (!p.isCyclo && !p.isVisite && !configApplied) {
      return contact.typesArticles.length>0 && contact.quantiteArticles && contact.vuesParArticle;
    }
    return true;
  };
  const canNext = () => {
    if (step===0) return (configSessions || []).length > 0 && configSessions.every(isSessionValid);
    if (step===1) return (plateaus && plateaus.length > 0) || !!plateau;
    if (step===2) return true;          // slot/duration — always valid (has default)
    if (step===5) return contactValid();
    if (step===6) {
      const list = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []);
      if (list.length <= 1) return !!selected;
      return list.every(k => perPlateau[k] && perPlateau[k].date);
    }
    return true;
  };
  // For the quote button : only contact details are required, date is optional.
  const canQuote = () => contactValid();

  /* ---------- Steps config ---------- */
  // mode = 'config' (configurateur) or 'manual' (mode manuel).
  // The sidebar shows EITHER the Configurateur step OR the Plateau step, never both.
  const mode = configApplied || step === 0 ? 'config' : 'manual';
  const STEPS = mode === 'config' ? [
    {n:0, fr:'Configurateur',  en:'Configurator'},
    {n:2, fr:'Créneau',     en:'Slot'},
    {n:3, fr:'Équipe',      en:'Team'},
    {n:5, fr:'Coordonnées', en:'Contact'},
    {n:6, fr:'Date',        en:'Date'},
  ] : [
    {n:1, fr:'Plateau',     en:'Stage'},
    {n:2, fr:'Créneau',     en:'Slot'},
    {n:3, fr:'Équipe',      en:'Team'},
    {n:4, fr:'Post-prod',   en:'Post-prod'},
    {n:5, fr:'Coordonnées', en:'Contact'},
    {n:6, fr:'Date',        en:'Date'},
  ];

  /* ---------- Seed plateau/slot/team state from current configurator answers.
       Pure state-sync — no navigation, no contact-form prefill.
       Called by applyConfig() AND by the live-resync useEffect below.        */
  const seedFromConfig = () => {
    const sessions = configSessions.filter(s =>
      (s.projectType === 'cyclorama') ||
      (s.projectType === 'ecom' && s.product && Number(s.quantity) > 0)
    );
    if (sessions.length === 0) return null;

    const recs = sessions.map(s => ({ session: s, ...recommendSession(s, configGlobal) }));
    const proj = recommendProjectLevel(sessions, configGlobal);

    // Seed plateaus array + per-plateau config from recommendations
    const pKeys = recs.map(r => r.plateau);
    // de-dup plateaus (if 2 sessions land on same plateau, still list once — the
    // second session will just add hours, but keep it simple for now : unique keys)
    const uniqPlateaus = Array.from(new Set(pKeys));
    setPlateaus(uniqPlateaus);
    const pp2 = {};
    recs.forEach(r => {
      const existing = pp2[r.plateau];
      // sessions postprod → apply per plateau
      const ppPrice = r.session.postprod ? computePostprodPrice(r.session) : null;
      const sessPP = {
        enabled: !!r.session.postprod,
        video: !!r.session.postprodVideo,
        amount: ppPrice ? ppPrice.amount : 0,
        images: ppPrice ? ppPrice.images : 0,
        breakdown: ppPrice ? ppPrice.breakdown : [],
        perView: ppPrice ? !!ppPrice.perView : false,
      };
      if (existing) {
        // if same plateau twice, keep max of hours/slot
        if (r.slotType === 'full' || existing.slotType === 'full') {
          existing.slotType = 'full';
          existing.hours = Math.max(existing.hours||8, r.hours||8);
        } else if (r.slotType === 'half' || existing.slotType === 'half') {
          existing.slotType = 'half'; existing.hours = Math.max(existing.hours||4, r.hours||4);
        } else {
          existing.hours = (existing.hours||1) + (r.hours||1);
        }
        existing.postprod = existing.postprod || sessPP.enabled ? {
          enabled: existing.postprod?.enabled || sessPP.enabled,
          video: existing.postprod?.video || sessPP.video,
          amount: (existing.postprod?.amount || 0) + sessPP.amount,
          images: (existing.postprod?.images || 0) + sessPP.images,
          breakdown: [...(existing.postprod?.breakdown || []), ...sessPP.breakdown],
          perView: existing.postprod?.perView || sessPP.perView,
        } : {};
      } else {
        const pxInfo = BOOK_PLATEAUX.find(x => x.k === r.plateau);
        const isCyclo = !!(pxInfo && pxInfo.isCyclo);
        // Cyclorama is self-service — strip the hourly on-stage roles.
        const teamCopy = {...(proj.team || {})};
        if (isCyclo) {
          delete teamCopy.styliste_op;
          delete teamCopy.operateur;
        }
        pp2[r.plateau] = {
          slotType: r.slotType || 'hour',
          hours: r.hours || 1,
          cycloMode: r.cycloMode || 'halfH',
          paint: false, kwh: 0,
          team: teamCopy,
          postprod: sessPP.enabled ? sessPP : {},
        };
      }
    });
    setPerPlateau(pp2);

    const firstRec = recs[0];
    setPlateau(firstRec.plateau);
    if (firstRec.cycloMode) setCycloMode(firstRec.cycloMode);
    if (firstRec.slotType) { setSlotType(firstRec.slotType); setHours(firstRec.hours); }
    setTeam(proj.team);
    setPp({});

    return { sessions, recs, proj };
  };

  /* ---------- Apply configurator recommendation (V2 tree) ---------- */
  const applyConfig = () => {
    const seeded = seedFromConfig();
    if (!seeded) return;
    const { sessions, recs } = seeded;

    // Pre-fill contact form
    const productLabels = sessions.map(s => {
      const p = PRODUCTS.find(x=>x.k===s.product);
      return p ? p[lang] : '';
    }).filter(Boolean);
    const totalSKUs = sessions.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

    // Build brief for "autres infos"
    const briefLines = [];
    if (recs.length > 1) {
      briefLines.push(lang==='fr'
        ? `Projet multi-plateaux (${recs.length} sessions).`
        : `Multi-stage project (${recs.length} sessions).`);
    }
    recs.forEach((r, i) => {
      const px = BOOK_PLATEAUX.find(x => x.k === r.plateau);
      const s = r.session;
      const productLbl = PRODUCTS.find(x=>x.k===s.product)?.[lang] || s.product;
      const subLbl = s.submethod ? ` · ${s.submethod}` : '';
      const mediaLbl = (s.media||[]).length ? ` (${(s.media||[]).join('+')})` : '';
      const dur = r.onRequest ? (lang==='fr'?'sur demande':'on request')
        : r.slotType==='full' ? (() => {
            const totalH = r.hours || (r.totalDays ? r.totalDays*8 : 8);
            const fd = Math.floor(totalH/8); const ex = totalH - fd*8;
            if (ex===0) return fd>1 ? `${fd}×8h` : '8h';
            return `${fd}×8h+${ex}h`;
          })()
        : r.slotType==='half' ? `${r.hours}h (½j)`
        : `${r.hours}h`;
      briefLines.push(`\n${lang==='fr'?'Session':'Session'} ${i+1} — ${productLbl}${subLbl}${mediaLbl} → ${px[lang]} · ${dur}`);
      briefLines.push(`  ${lang==='fr'?'Quantité':'Quantity'} : ${s.quantity} ${lang==='fr'?'produits':'products'}`);
      if (s.views && s.views.length) {
        briefLines.push(`  ${lang==='fr'?'Vues':'Views'} : ${s.views.join(', ')}`);
      } else if (s.viewsCount) {
        briefLines.push(`  ${lang==='fr'?'Vues par produit':'Views per product'} : ${s.viewsCount}`);
      }
      if (s.postprod) {
        briefLines.push(`  ${lang==='fr'?'Post-production':'Post-production'} : ${lang==='fr'?'oui':'yes'}${s.postprodVideo ? ` + ${lang==='fr'?'montage vidéo':'video edit'}` : ''}`);
      }
    });

    setContact(c => ({
      ...c,
      typesArticles: productLabels,
      quantiteArticles: String(totalSKUs || ''),
      vuesParArticle: '',
      // Le brief n'est plus injecté dans "autres informations" — il reste affiché côté récap.
      autresInfos: c.autresInfos || '',
    }));
    setConfigApplied(true);
    setStep(2); // go directly to Slot step
  };

  const skipConfig = () => { setConfigApplied(false); setStep(1); };

  /* Live re-sync : whenever the configurator answers change AFTER they've been
     applied once, re-seed plateau/slot/team so the quote always reflects the
     latest answers — even if the user navigated to a later step and came back. */
  React.useEffect(() => {
    if (!configApplied) return;
    seedFromConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configSessions, configGlobal, configApplied]);

  /* Scroll to top of content area whenever step changes */
  const contentScrollRef = React.useRef(null);
  const innerScrollRef = React.useRef(null);
  React.useEffect(() => {
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
    if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0;
  }, [step, dateIdx]);

  /* Reset multi-plateau date sub-step index when entering step 6 */
  React.useEffect(() => {
    if (step === 6) setDateIdx(0);
  }, [step]);

  /* ---------- Confirmation screen ---------- */
  if (sent) {
    return <Confirmation lang={lang} openMenu={openMenu} goto={goto} setLang={setLang}
             plateau={p} selected={selected} arrivalHour={arrivalHour} rentalHours={rentalHours}
             plateaus={plateaus} perPlateau={perPlateau}
             total={priceBreakdown.total} rows={priceBreakdown.rows}
             contact={contact} months={months} mode={sent}/>;
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'190px 1fr 300px',gridTemplateRows:'54px 1fr',gap:1,background:'#000',height:'100%',width:'100%',overflow:'hidden'}}>

      {/* ========== HEADER — LEFT (logo cell only — no burger on web) ========== */}
      <div style={{gridColumn:'1',gridRow:'1',background:'#000',display:'flex',gap:1,minWidth:0}}>
        <button onClick={()=>goto('home')} style={{flex:'1 1 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:8}}>
          <Wordmark size={32}/>
        </button>
      </div>

      {/* ========== HEADER — RIGHT (title + help + lang cells) ========== */}
      <div style={{gridColumn:'2 / 4',gridRow:'1',background:'#000',display:'flex',gap:1,minWidth:0}}>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 24px',display:'flex',alignItems:'center',minWidth:0}}>
          <div style={{display:'flex',alignItems:'baseline',gap:14}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{lang==='fr'?'Réservation':'Booking'}</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.1em',color:'#888'}}>
              {''}
            </span>
          </div>
        </div>
        <button onClick={()=>goto('contact')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 24px',gap:10}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.05em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Besoin d’aide':'Need help'}</span>
          <IconArrowRight width="14" height="14"/>
        </button>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 54px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
          <span style={{color:'#141414',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.15em'}}>{lang==='fr'?'EN':'FR'}</span>
        </button>
      </div>

      {/* ========== STEPPER — LEFT SIDEBAR ========== */}
      <div style={{gridColumn:'1',gridRow:'2',background:'#fff',overflow:'auto',padding:'0 0 32px',display:'flex',flexDirection:'column',gap:0,minHeight:0}}>
        {STEPS.map((s,i)=>{
          const active = step===s.n;
          const curIdx = STEPS.findIndex(x=>x.n===step);
          const done = curIdx > -1 && i < curIdx;
          const clickable = done || active || (i === curIdx + 1 && canNext()) || s.n===0;
          return (
            <button key={s.n} onClick={()=>{ if(clickable) setStep(s.n); }} style={{
              border:0,background:active?'var(--edo-gray-100)':'transparent',
              borderLeft:active?'3px solid var(--edo-orange)':'3px solid transparent',
              borderBottom: i<STEPS.length-1 ? '1px solid var(--edo-gray-200)' : '0',
              padding:'0 24px',
              height: 42,
              cursor:clickable?'pointer':'not-allowed',
              textAlign:'left',display:'flex',alignItems:'center',gap:14,transition:'all .15s',
              opacity:clickable?1:0.35,
            }}>
              <span style={{
                fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',
                color:active?'var(--edo-orange)':(done?'#141414':'#888'),
                minWidth:22,
              }}>
                {done ? '✓' : String(i+1).padStart(2,'0')}
              </span>
              <span style={{fontSize:13,fontWeight:active?500:400,letterSpacing:'-0.01em',color:'#141414'}}>{s[lang]}</span>
            </button>
          );
        })}
      </div>

      {/* ========== CONTENT ========== */}
      <div ref={contentScrollRef} style={{gridColumn:'2',gridRow:'2',background:'#fff',overflow:'auto',display:'flex',flexDirection:'column',minHeight:0}}>
        {/* Manual-mode banner — visible across every step in manual mode */}
        {mode === 'manual' && (
          <div style={{padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,background:'#fafafa',minHeight:42,boxSizing:'border-box',flexShrink:0,borderBottom:'1px solid #000'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:'#595959',minWidth:0}}>
              {lang==='fr'?'Choix manuel — ou ':'Manual mode — or '}
              <span style={{color:'var(--edo-orange)',fontWeight:600}}>{lang==='fr'?'← laissez-vous guider':'← let us guide you'}</span>
            </span>
            <div style={{display:'flex',alignItems:'center',gap:8,flex:'0 0 auto'}}>
              <button onClick={()=>{
                  setPlateau(null);
                  setPlateaus([]);
                  setPerPlateau({});
                  setSlotType('hour'); setHours(1); setCycloMode('halfH');
                  setPaint(false); setKwh(0);
                  setTeam({}); setPp({});
                  setSelected(null);
                  setStep(1);
                }} style={{background:'transparent',border:'1px solid var(--edo-gray-200)',padding:'3px 8px',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:'#141414',whiteSpace:'nowrap',lineHeight:1.4}}>
                ↻ {lang==='fr'?'Réinitialiser':'Reset'}
              </button>
              <button onClick={()=>setStep(0)}
                onMouseEnter={e=>{e.currentTarget.style.background='#141414';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='#141414';}}
                onMouseLeave={e=>{e.currentTarget.style.background='var(--edo-orange)';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='var(--edo-orange)';}}
                style={{background:'var(--edo-orange)',border:'1px solid var(--edo-orange)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#fff',whiteSpace:'nowrap',lineHeight:1.4,fontWeight:600,transition:'all .15s ease'}}>
                ← {lang==='fr'?'Configurateur':'Configurator'}
              </button>
            </div>
          </div>
        )}
        <div ref={innerScrollRef} style={{flex:1,overflowY:'auto'}}>
          {step===0 && <Step0Configurator lang={lang} global={configGlobal} setGlobal={setConfigGlobal}
                         sessions={configSessions} setSessions={setConfigSessions}
                         activeIdx={activeSessionIdx} setActiveIdx={setActiveSessionIdx}
                         onApply={applyConfig} onSkip={skipConfig}
                         onReset={()=>{
                           setPlateau(null);
                           setPlateaus([]);
                           setPerPlateau({});
                           setSlotType('hour'); setHours(1); setCycloMode('halfH');
                           setPaint(false); setKwh(0);
                           setTeam({}); setPp({});
                           setSelected(null);
                           setConfigApplied(false);
                         }}/>}
          {step===1 && <Step1Plateau lang={lang} plateau={plateau} setPlateau={setPlateau} plateaus={plateaus} togglePlateau={togglePlateau} setCycloMode={setCycloMode} setSlotType={setSlotType} setHours={setHours} onConfigurator={()=>setStep(0)}/>}
          {step===2 && <MultiPlateauStep lang={lang} plateaus={plateaus.length?plateaus:(plateau?[plateau]:[])} perPlateau={perPlateau} setPerPlateau={setPerPlateau}
                         fallback={{slotType,hours,cycloMode,setSlotType,setHours,setCycloMode}}
                         topBanner={(() => {
                           const list = plateaus.length?plateaus:(plateau?[plateau]:[]);
                           const allVisite = list.length>0 && list.every(k => BOOK_PLATEAUX.find(x=>x.k===k)?.isVisite);
                           if (allVisite) return null;
                           return (
                             <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,boxSizing:'border-box',gap:12,background:'#fff',flexWrap:'wrap',position:'sticky',top:0,zIndex:5}}>
                               <span className="edo-cell-label" style={{color:'var(--edo-orange)',whiteSpace:'nowrap'}}>02 · {lang==='fr'?'Durée de location':'Rental duration'}</span>
                               <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',color:'#888'}}>
                                 {list.length > 1
                                   ? (lang==='fr'?'Choisissez une durée pour chaque plateau (pré rempli selon estimation).':'Choose a duration for each stage (pre-filled based on estimate).')
                                   : (lang==='fr'?'Choisissez la durée pour votre plateau (pré rempli selon estimation).':'Choose a duration for your stage (pre-filled based on estimate).')}
                               </span>
                             </div>
                           );
                         })()}
                         renderOne={(px, st, setSt) => (
                           <Step3Slot lang={lang} p={px}
                             slotType={st.slotType||'hour'} setSlotType={v=>setSt({slotType:v})}
                             hours={st.hours||1} setHours={v=>setSt({hours:v})}
                             cycloMode={st.cycloMode||'halfH'} setCycloMode={v=>setSt({cycloMode:v})}/>
                         )}/>}
          {step===3 && <MultiPlateauStep lang={lang} plateaus={plateaus.length?plateaus:(plateau?[plateau]:[])} perPlateau={perPlateau} setPerPlateau={setPerPlateau}
                         fallback={{team,setTeam}}
                         topBanner={
                           <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,boxSizing:'border-box',gap:12,background:'#fff',flexWrap:'wrap',position:'sticky',top:0,zIndex:5}}>
                             <span className="edo-cell-label" style={{color:'var(--edo-orange)',whiteSpace:'nowrap'}}>03 · {lang==='fr'?'Équipe E-DO (optionnel)':'E-DO team (optional)'}</span>
                           </div>
                         }
                         renderOne={(px, st, setSt) => (
                           <Step5Team lang={lang}
                             p={px}
                             team={st.team || {}}
                             configSessions={configSessions}
                             setTeam={updater => {
                               const next = typeof updater === 'function' ? updater(st.team || {}) : updater;
                               setSt({team: next});
                             }}/>
                         )}/>}
          {step===4 && <MultiPlateauStep lang={lang} plateaus={plateaus.length?plateaus:(plateau?[plateau]:[])} perPlateau={perPlateau} setPerPlateau={setPerPlateau}
                         fallback={{postprod:{},setPostprod:()=>{}}}
                         topBanner={
                           <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,boxSizing:'border-box',gap:12,background:'#fff',flexWrap:'wrap',position:'sticky',top:0,zIndex:5}}>
                             <span className="edo-cell-label" style={{color:'var(--edo-orange)',whiteSpace:'nowrap'}}>04 · {lang==='fr'?'Post-production (optionnel)':'Post-production (optional)'}</span>
                           </div>
                         }
                         renderOne={(px, st, setSt) => (
                           <Step6Postprod lang={lang}
                             plateauKey={px && px.k}
                             postprod={st.postprod || {}}
                             setPostprod={v => setSt({postprod: v})}/>
                         )}/>}
          {step===5 && <Step7Contact lang={lang} contact={contact} setContact={setContact} p={p} configMode={configApplied}/>}
          {step===6 && (() => {
            const list = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []);
            if (list.length <= 1) {
              return <Step2Date lang={lang} p={p} viewY={viewY} viewM={viewM} months={months} days={days}
                       calCells={calCells} selected={selected} setSelected={setSelected}
                       arrivalHour={arrivalHour} setArrivalHour={setArrivalHour} rentalHours={rentalHours}
                       isPast={isPast} nextMonth={nextMonth} prevMonth={prevMonth}/>;
            }
            const safeIdx = Math.max(0, Math.min(dateIdx, list.length - 1));
            const k = list[safeIdx];
            const px = BOOK_PLATEAUX.find(x => x.k === k);
            const st = perPlateau[k] || {};
            const setSt = (patch) => setPerPlateau(prev => ({...prev, [k]: {...(prev[k]||{}), ...patch}}));
            const stHours = st.hours != null ? st.hours : (st.slotType==='hour' ? 1 : st.slotType==='half' ? 4 : 8);
            const stRentalHours = px && px.isCyclo
              ? ((st.cycloMode||'halfH')==='halfH' ? 5 : 10)
              : px && px.isVisite ? 1
              : stHours;
            const stSelected = st.date || null;
            const stArrival = st.arrivalHour != null ? st.arrivalHour : 10;
            return (
              <div>
                {/* Sub-step indicator */}
                <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,boxSizing:'border-box',gap:16,background:'#fff',flexWrap:'wrap',position:'sticky',top:0,zIndex:6}}>
                  <span className="edo-cell-label" style={{color:'var(--edo-orange)',whiteSpace:'nowrap'}}>
                    {lang==='fr'?'Plateau':'Stage'} {String(safeIdx+1).padStart(2,'0')} / {String(list.length).padStart(2,'0')}
                  </span>
                  <span style={{fontSize:13,fontWeight:400,letterSpacing:'-0.01em',color:'#141414'}}>{px ? px[lang] : k}</span>
                  <div style={{display:'flex',gap:6,marginLeft:'auto'}}>
                    {list.map((kk, i) => {
                      const has = perPlateau[kk] && perPlateau[kk].date;
                      const active = i === safeIdx;
                      return (
                        <button key={kk} onClick={()=>setDateIdx(i)} style={{
                          background: active ? '#141414' : (has ? 'var(--edo-orange)' : '#fff'),
                          color: active || has ? '#fff' : '#141414',
                          border: '1px solid '+(active ? '#141414' : (has ? 'var(--edo-orange)' : 'var(--edo-gray-200)')),
                          padding:'4px 10px', cursor:'pointer',
                          fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em',
                          minWidth:28, textAlign:'center',
                        }}>{String(i+1).padStart(2,'0')}{has?' ✓':''}</button>
                      );
                    })}
                  </div>
                </div>
                <Step2Date lang={lang} p={px} viewY={viewY} viewM={viewM} months={months} days={days}
                  calCells={calCells} selected={stSelected} setSelected={(d)=>setSt({date:d})}
                  arrivalHour={stArrival} setArrivalHour={(h)=>setSt({arrivalHour:h})} rentalHours={stRentalHours}
                  isPast={isPast} nextMonth={nextMonth} prevMonth={prevMonth}/>
              </div>
            );
          })()}
        </div>

        {/* Step nav — hidden on step 0 (configurator has its own CTAs) */}
        {step>0 && (
        <div style={{height:72,borderTop:'1px solid var(--edo-gray-200)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 48px',flexShrink:0,background:'#fff'}}>
          {(() => {
            const idx = STEPS.findIndex(s=>s.n===step);
            const isFirst = idx <= 0;
            const prevN = idx > 0 ? STEPS[idx-1].n : null;
            const nextN = idx > -1 && idx < STEPS.length-1 ? STEPS[idx+1].n : null;
            const isContactStep = step===5;
            const isLastBeforeDate = step===5;
            // Multi-plateau sub-step on date step (6)
            const dateList = plateaus && plateaus.length > 0 ? plateaus : (plateau ? [plateau] : []);
            const isMultiDate = step===6 && dateList.length > 1;
            const safeDateIdx = Math.max(0, Math.min(dateIdx, dateList.length - 1));
            const onLastDateSub = !isMultiDate || safeDateIdx >= dateList.length - 1;
            const onFirstDateSub = !isMultiDate || safeDateIdx <= 0;
            const currentDateK = isMultiDate ? dateList[safeDateIdx] : null;
            const currentDateValid = !isMultiDate || (perPlateau[currentDateK] && perPlateau[currentDateK].date);
            const handleBack = () => {
              if (isMultiDate && !onFirstDateSub) { setDateIdx(safeDateIdx - 1); return; }
              if (prevN !== null) setStep(prevN);
            };
            const handleSubNext = () => {
              if (isMultiDate && !onLastDateSub && currentDateValid) { setDateIdx(safeDateIdx + 1); return true; }
              return false;
            };
            return (<>
          <button onClick={handleBack} disabled={isFirst && onFirstDateSub}
            {...navBtnHover}
            style={{...navBtn, opacity:(isFirst && onFirstDateSub)?0.3:1, cursor:(isFirst && onFirstDateSub)?'not-allowed':'pointer'}}>
            ← {lang==='fr'?'Retour':'Back'}
          </button>
          {step<5 ? (
            <button onClick={()=>canNext()&&nextN!==null&&setStep(nextN)} disabled={!canNext()}
              {...navBtnPrimaryHover}
              style={{...navBtnPrimary, opacity:canNext()?1:0.3, cursor:canNext()?'pointer':'not-allowed'}}>
              {lang==='fr'?'Continuer':'Continue'} <IconArrowRight width="14" height="14" stroke="#fff"/>
            </button>
          ) : p.isCyclo ? (
            /* Cyclorama : un seul bouton "Envoyer la demande" — date requise à l’étape 6 */
            step===5 ? (
              <button onClick={()=>canNext()&&nextN!==null&&setStep(nextN)} disabled={!canNext()}
                {...navBtnPrimaryHover}
                style={{...navBtnPrimary, opacity:canNext()?1:0.3, cursor:canNext()?'pointer':'not-allowed'}}>
                {lang==='fr'?'Continuer':'Continue'} <IconArrowRight width="14" height="14" stroke="#fff"/>
              </button>
            ) : isMultiDate && !onLastDateSub ? (
              <button onClick={()=>currentDateValid && handleSubNext()} disabled={!currentDateValid}
                {...navBtnPrimaryHover}
                style={{...navBtnPrimary, opacity:currentDateValid?1:0.3, cursor:currentDateValid?'pointer':'not-allowed'}}>
                {lang==='fr'?'Valider · plateau suivant':'Validate · next stage'} <IconArrowRight width="14" height="14" stroke="#fff"/>
              </button>
            ) : (
              <button onClick={()=>canNext()&&setSent('request')} disabled={!canNext()}
                {...navBtnPrimaryHover}
                style={{...navBtnPrimary,background:'var(--edo-orange)',opacity:canNext()?1:0.3, cursor:canNext()?'pointer':'not-allowed'}}>
                {lang==='fr'?'Envoyer la demande':'Submit request'} <IconArrowRight width="14" height="14" stroke="#fff"/>
              </button>
            )
          ) : (
            /* Plateaux standard : devis (sans date) + réserver (avec date) */
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>canQuote()&&setSent('quote')} disabled={!canQuote()}
                title={lang==='fr'?'Sans bloquer de date':'No date held'}
                {...navBtnHover}
                style={{...navBtn, opacity:canQuote()?1:0.3, cursor:canQuote()?'pointer':'not-allowed'}}>
                {lang==='fr'?'Recevoir mon devis':'Receive my quote'} <IconArrowRight width="14" height="14"/>
              </button>
              {step===5 ? (
                <button onClick={()=>canNext()&&nextN!==null&&setStep(nextN)} disabled={!canNext()}
                  {...navBtnPrimaryHover}
                  style={{...navBtnPrimary, opacity:canNext()?1:0.3, cursor:canNext()?'pointer':'not-allowed'}}>
                  {lang==='fr'?'Choisir une date':'Pick a date'} <IconArrowRight width="14" height="14" stroke="#fff"/>
                </button>
              ) : isMultiDate && !onLastDateSub ? (
                <button onClick={()=>currentDateValid && handleSubNext()} disabled={!currentDateValid}
                  {...navBtnPrimaryHover}
                  style={{...navBtnPrimary, opacity:currentDateValid?1:0.3, cursor:currentDateValid?'pointer':'not-allowed'}}>
                  {lang==='fr'?'Valider · plateau suivant':'Validate · next stage'} <IconArrowRight width="14" height="14" stroke="#fff"/>
                </button>
              ) : (
                <button onClick={()=>canNext()&&setSent('booking')} disabled={!canNext()}
                  {...navBtnPrimaryHover}
                  style={{...navBtnPrimary,background:'var(--edo-orange)',opacity:canNext()?1:0.3, cursor:canNext()?'pointer':'not-allowed'}}>
                  {lang==='fr'?'Réserver':'Book now'} <IconArrowRight width="14" height="14" stroke="#fff"/>
                </button>
              )}
            </div>
          )}
            </>);
          })()}
        </div>
        )}
      </div>

      {/* ========== SIDE PANEL — running total ========== */}
      <SidePanel lang={lang} p={p} selected={selected} months={months}
        slotType={slotType} hours={hours} cycloMode={cycloMode}
        rows={priceBreakdown.rows} total={priceBreakdown.total}
        isPreview={!!priceBreakdown.isPreview} step={step}
        plateaus={plateaus} perPlateau={perPlateau}/>
    </div>
  );
};

const StepIntro = ({ n, lang, t, s, compact }) => (
  <div style={{padding: compact ? '10px 0 8px' : '12px 0 10px',display:'flex',alignItems:'baseline',gap:16,flexWrap:'wrap'}}>
    <span className="edo-cell-label" style={{color:'var(--edo-orange)',flexShrink:0}}>{n} · {t}</span>
    {s && <span style={{fontSize:11,color:'#595959',lineHeight:1.35,flex:'1 1 auto',minWidth:0}}>{s}</span>}
  </div>
);

/* Generic padded content wrapper for step bodies (not used by Step1 full-bleed bento) */
const StepBody = ({ children }) => (
  <div style={{padding:'0 48px 24px'}}>{children}</div>
);

/* ================================================================= */
/*  STEP 0 — CONFIGURATEUR                                            */
/*  Questionnaire intelligent qui recommande plateau + durée + équipe */
/* ================================================================= */
const PROJECT_TYPES = [
  {k:'ecom',       fr:'E-commerce',              en:'E-commerce',
    desc:{fr:'Packshots, on-model, fiches produit.', en:'Packshots, on-model, product pages.'}},
  {k:'cyclorama',  fr:'Cyclorama / Prod. libre', en:'Cyclorama / Free production',
    desc:{fr:'Studio cyclo, besoin sur-mesure.', en:'Cyclo studio, custom needs.'}},
];

const URGENCY_OPTIONS = [
  {k:'flex',   fr:'Flexible',       en:'Flexible',    desc:{fr:'Dans le mois',  en:'This month'}},
  {k:'week',   fr:'Sous 1 semaine', en:'Within 1 week', desc:{fr:'Date rapprochée', en:'Soon'}},
  {k:'urgent', fr:'Urgent',         en:'Urgent',      desc:{fr:'48h ou moins',  en:'48h or less'}},
];

/* === V2 TREE CONSTANTS === */
// Q1 — Type de produit
const PRODUCTS = [
  {k:'pap',         fr:'Prêt-à-porter',     en:'Ready-to-wear',     desc:{fr:'Vêtements, textile porté.', en:'Clothing, worn textile.'}},
  {k:'accessoires', fr:'Accessoires',       en:'Accessories',       desc:{fr:'Chaussures, maroquinerie, textile.', en:'Shoes, leather goods, textile.'}},
  {k:'eyewear',     fr:'Lunetterie',        en:'Eyewear',           desc:{fr:'Lunettes, solaires.', en:'Glasses, sunglasses.'}},
  {k:'food',        fr:'Food & Spiritueux', en:'Food & Spirits',    desc:{fr:'Boissons, gastronomie.', en:'Drinks, gourmet.'}},
  {k:'cosmetique',  fr:'Cosmétique',        en:'Cosmetics',         desc:{fr:'Soin, parfumerie, make-up.', en:'Skincare, fragrance, makeup.'}},
  {k:'bijoux',      fr:'Bijoux',            en:'Jewelry',           desc:{fr:'Bijoux, montres.', en:'Jewelry, watches.'}},
];

// Q2 (PAP) — Méthode
const PAP_METHODS = [
  {k:'packshot', fr:'Packshot', en:'Packshot', desc:{fr:'Shoot produit non porté.', en:'Unworn product shoot.'}},
  {k:'onmodel',  fr:'Mannequin (on-model)', en:'On-model', desc:{fr:'Shoot porté sur mannequin.', en:'On-model shoot.'}},
];

// Q2b (PAP packshot) — Sous-type
const PAP_PACKSHOT_SUBS = [
  {k:'pique', fr:'Piqué',  en:'Pinned',  desc:{fr:'Épinglé sur panneau vertical.', en:'Pinned on vertical board.'}},
  {k:'ghost', fr:'Ghost',  en:'Ghost',   desc:{fr:'Mannequin invisible, effet porté.', en:'Invisible mannequin, worn look.'}},
  {k:'flat',  fr:'Flat',   en:'Flat',    desc:{fr:'Posé à plat, vue zénithale.', en:'Laid flat, top view.'}},
];

// Q2 (accessoires) — Sous-type
const ACCESS_SUBS = [
  {k:'chaussure',    fr:'Chaussures',           en:'Shoes',               desc:{fr:'', en:''}},
  {k:'maroquinerie', fr:'Maroquinerie',         en:'Leather goods',       desc:{fr:'Sacs, ceintures, petite maroquinerie.', en:'Bags, belts, small leather goods.'}},
  {k:'textile',      fr:'Accessoires textile',  en:'Textile accessories', desc:{fr:'Foulards, chapeaux, gants.', en:'Scarves, hats, gloves.'}},
];

// Q3 — Média
const MEDIA_OPTIONS = [
  {k:'photo', fr:'Photo',  en:'Photo',  desc:{fr:'', en:''}},
  {k:'video', fr:'Vidéo',  en:'Video',  desc:{fr:'', en:''}},
];

// Q4 (packshot) — Vues (multi-select)
const PACKSHOT_VIEWS = [
  {k:'face',   fr:'Face',   en:'Front'},
  {k:'dos',    fr:'Dos',    en:'Back'},
  {k:'3/4',    fr:'3/4',    en:'3/4'},       // only for ghost
  {k:'detail', fr:'Détail', en:'Detail'},
];

/* Small form atom — bento tile selectable */
const CfgChoice = ({ idx, on, onClick, label, desc, sub }) => (
  <button onClick={onClick}
    onMouseEnter={e=>{
      if (on) return;
      e.currentTarget.style.background='var(--edo-gray-100)';
      const arr = e.currentTarget.querySelector('[data-cfg-arrow]');
      if (arr) { arr.style.opacity='1'; arr.style.transform='translateX(0) scale(1.15)'; }
      const lbl = e.currentTarget.querySelector('[data-cfg-label]');
      if (lbl) lbl.style.transform='scale(1.02)';
    }}
    onMouseLeave={e=>{
      if (on) return;
      e.currentTarget.style.background='#fff';
      const arr = e.currentTarget.querySelector('[data-cfg-arrow]');
      if (arr) { arr.style.opacity='0'; arr.style.transform='translateX(-4px) scale(1)'; }
      const lbl = e.currentTarget.querySelector('[data-cfg-label]');
      if (lbl) lbl.style.transform='scale(1)';
    }}
    style={{
    background:on?'#141414':'#fff',color:on?'#fff':'#141414',
    border:0,outline:'none',boxShadow:'none',padding:'14px 14px',textAlign:'left',cursor:'pointer',fontFamily:'inherit',
    display:'flex',flexDirection:'column',gap:4,transition:'background .15s, color .15s',minWidth:0,minHeight:110,
  }}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
      {idx!=null && <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',color:on?'rgba(255,255,255,0.6)':'#888'}}>{String(idx).padStart(2,'0')}</span>}
      {on
        ? <span style={{color:'var(--edo-orange)',fontSize:16,lineHeight:1}}>●</span>
        : <span data-cfg-arrow style={{color:'var(--edo-orange)',fontSize:14,lineHeight:1,opacity:0,transform:'translateX(-4px) scale(1)',transition:'opacity .15s, transform .2s ease',transformOrigin:'right center'}}>→</span>}
    </div>
    <div data-cfg-label style={{fontSize:15,fontWeight:400,letterSpacing:'-0.015em',marginTop:2,lineHeight:1.15,textWrap:'balance',transition:'transform .2s ease',transformOrigin:'left center'}}>{label}</div>
    {sub && <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase',color:on?'rgba(255,255,255,0.55)':'#888'}}>{sub}</div>}
    {desc && <div style={{fontSize:11,color:on?'rgba(255,255,255,0.65)':'#595959',lineHeight:1.4,marginTop:'auto',textWrap:'pretty'}}>{desc}</div>}
  </button>
);

const CfgToggle = ({ on, onClick }) => (
  <button onClick={onClick} style={{
    width:46,height:26,background:on?'var(--edo-orange)':'var(--edo-gray-200)',
    border:0,borderRadius:13,position:'relative',cursor:'pointer',transition:'background .15s',flexShrink:0,
  }}>
    <span style={{position:'absolute',top:3,left:on?23:3,width:20,height:20,background:'#fff',borderRadius:10,transition:'left .15s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
  </button>
);

const Step0Configurator = ({ lang, global, setGlobal, sessions, setSessions, activeIdx, setActiveIdx, onApply, onSkip, onReset }) => {
  const active = sessions[activeIdx] || sessions[0];
  const [openQ, setOpenQ] = React.useState(null); // key of the question currently expanded; null = auto (first unanswered)
  const [touchedQs, setTouchedQs] = React.useState(new Set()); // Qs the user has actively interacted with (inputs, buttons, etc.)
  const touchQ = (k) => setTouchedQs(prev => {
    if (prev.has(k)) return prev;
    const next = new Set(prev); next.add(k); return next;
  });
  const setSession = (patch) => {
    setSessions(prev => prev.map((s, i) => i === activeIdx ? {...s, ...patch} : s));
  };
  const resetFrom = (field, value) => {
    const cascades = {
      projectType:{ product:null, method:null, submethod:null, media:[], views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false },
      product:    { method:null, submethod:null, media:[], views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false },
      method:     { submethod:null, media:[], views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false },
      submethod:  { media:[], views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false },
      media:      { views:[], viewsCount:'', quantity:'', postprod:false, postprodVideo:false },
    };
    setSession({ [field]: value, ...(cascades[field] || {}) });
    setOpenQ(null); // after any structural change, fall back to auto
    setTouchedQs(new Set()); // reset touched set
  };
  const addSession = () => {
    setSessions(prev => [...prev, makeBlankSession()]);
    setActiveIdx(sessions.length);
    setOpenQ(null);
    setTouchedQs(new Set());
  };
  const removeSession = (idx) => {
    if (sessions.length <= 1) return;
    setSessions(prev => prev.filter((_, i) => i !== idx));
    setActiveIdx(Math.max(0, Math.min(activeIdx, sessions.length - 2)));
  };

  const sessionValid = isSessionValid;

  const allValid = sessions.every(sessionValid);
  const recs = allValid ? sessions.map(s => ({ session: s, ...recommendSession(s, global) })) : null;

  const S = active;
  const tabGrid = { display:'grid', gridTemplateColumns:`repeat(${sessions.length}, minmax(0,1fr))`, gap:1, background:'#000', borderTop:'1px solid #000', borderBottom:'1px solid #000' };

  /* ===== Accordion question list — defines what's visible, answered, & first-open ===== */
  // Each Q : { key, label, answered, summary, visible, multi }
  const L = (fr,en) => lang==='fr' ? fr : en;
  const qList = [];
  // Q00 — Type de projet
  qList.push({
    key:'projectType', num:'00',
    label: L('Type de projet','Project type'),
    visible: true,
    answered: !!S.projectType,
    summary: S.projectType ? (PROJECT_TYPES.find(x=>x.k===S.projectType)?.[lang] || '') : '',
  });
  // Q01 — Produit (ecom only)
  if (S.projectType === 'ecom') {
    qList.push({
      key:'product', num:'01',
      label: L('Type de produit','Product type'),
      visible: true,
      answered: !!S.product,
      summary: S.product ? (PRODUCTS.find(x=>x.k===S.product)?.[lang] || '') : '',
    });
  }
  // Q02 — PAP method
  if (S.product === 'pap') {
    qList.push({
      key:'method', num:'02',
      label: L('Méthode','Method'),
      visible: true,
      answered: !!S.method,
      summary: S.method ? (PAP_METHODS.find(x=>x.k===S.method)?.[lang] || '') : '',
    });
  }
  // Q03 — PAP packshot sous-type
  if (S.product === 'pap' && S.method === 'packshot') {
    qList.push({
      key:'submethod', num:'03',
      label: L('Type de packshot','Packshot type'),
      visible: true,
      answered: !!S.submethod,
      summary: S.submethod ? (PAP_PACKSHOT_SUBS.find(x=>x.k===S.submethod)?.[lang] || '') : '',
    });
  }
  // Q02 — Accessoires sous-type
  if (S.product === 'accessoires') {
    qList.push({
      key:'submethod', num:'02',
      label: L("Type d'accessoire",'Accessory type'),
      visible: true,
      answered: !!S.submethod,
      summary: S.submethod ? (ACCESS_SUBS.find(x=>x.k===S.submethod)?.[lang] || '') : '',
    });
  }
  // Q-media
  const mediaVisible = (S.product === 'pap' && S.method === 'onmodel')
    || (S.product === 'accessoires' && S.submethod)
    || (['eyewear','food','cosmetique','bijoux'].includes(S.product));
  if (mediaVisible) {
    const mediaNum = S.product==='pap' ? '03' : S.product==='accessoires' ? '03' : '02';
    qList.push({
      key:'media', num:mediaNum,
      label: L('Média','Media'),
      visible: true,
      multi: true,
      answered: ((S.media||[]).length) > 0,
      summary: (S.media||[]).map(m => MEDIA_OPTIONS.find(x=>x.k===m)?.[lang]).filter(Boolean).join(' + '),
    });
  }
  // Q-quantity (packshot)
  if (S.product === 'pap' && S.method === 'packshot' && S.submethod) {
    qList.push({
      key:'quantity', num:'04',
      label: L('Nombre de produits','Number of products'),
      visible: true,
      answered: !!Number(S.quantity),
      summary: S.quantity ? `${S.quantity} ${L('produits','products')}` : '',
    });
  }
  // Q-views (packshot multi)
  if (S.product === 'pap' && S.method === 'packshot' && S.submethod) {
    qList.push({
      key:'views', num:'05',
      label: L('Vues par produit','Views per product'),
      visible: true,
      multi: true,
      answered: (S.views||[]).some(v => v !== 'detail'),
      summary: (S.views||[]).map(v => PACKSHOT_VIEWS.find(x=>x.k===v)?.[lang]).filter(Boolean).join(' + '),
    });
  }
  // Q-qty+views (on-model / accessoires / simples)
  const qvVisible = (S.product === 'pap' && S.method === 'onmodel' && (S.media||[]).length)
    || (S.product === 'accessoires' && S.submethod && (S.media||[]).length)
    || (['eyewear','food','cosmetique','bijoux'].includes(S.product) && (S.media||[]).length);
  if (qvVisible) {
    qList.push({
      key:'qtyViews', num: S.product==='pap' ? '04' : S.product==='accessoires' ? '04' : '03',
      label: L('Produits & vues','Products & views'),
      visible: true,
      answered: !!Number(S.quantity) && !!Number(S.viewsCount),
      summary: (S.quantity && S.viewsCount) ? `${S.quantity} ${L('prod.','prod.')} × ${S.viewsCount} ${L('vues','views')}` : '',
    });
  }
  // Q-postprod
  const ppVisible = S.projectType === 'ecom' && S.product && sessionValid(S);
  if (ppVisible) {
    qList.push({
      key:'postprod', num:'pp',
      label: L('Post-production','Post-production'),
      visible: true,
      answered: true, // always answered (toggle defaults to off = valid answer)
      summary: S.postprod ? (S.postprodVideo ? L('Oui + vidéo','Yes + video') : L('Oui','Yes')) : L('Non','No'),
    });
  }

  // Determine which Q is "currently open"
  // openQ = user-selected focus (click on summary or click on an option in a later Q). null = auto (first unanswered).
  const firstUnansweredIdx = qList.findIndex(q => !q.answered);
  const autoOpenKey = firstUnansweredIdx >= 0 ? qList[firstUnansweredIdx].key : (qList.length ? qList[qList.length-1].key : null);
  const currentOpen = openQ !== null ? openQ : autoOpenKey;
  const currentIdx = qList.findIndex(q => q.key === currentOpen);

  // A Q is "expanded" if :
  //   • it's the currentOpen,
  //   • OR it's the Q immediately BEFORE the current Q, AND it's answered, AND the current Q has NOT
  //     been touched yet (so answering one Q doesn't snap the previous one closed until the user
  //     actively starts on the next — important for multi-entry Qs like "views by product").
  //   • OR it's the Q immediately AFTER the current Q, AND the current Q has been touched AND answered
  //     (progressive disclosure forward — e.g. typing qty opens postprod underneath).
  const isOpen = (key) => {
    const idx = qList.findIndex(q => q.key === key);
    if (idx === currentIdx) return true;
    if (qList[idx]?.answered && idx === currentIdx - 1) {
      const nextKey = qList[currentIdx]?.key;
      if (nextKey && !touchedQs.has(nextKey)) return true;
    }
    if (idx === currentIdx + 1) {
      const curr = qList[currentIdx];
      if (curr?.answered && touchedQs.has(curr.key)) return true;
    }
    return false;
  };

  /* Accordion row : shows either the full question body (when open) or a compact summary (collapsed). */
  // Render accordion Q — PLAIN FUNCTION, not a component, to avoid re-mounting children on every render
  // (which causes inputs inside to lose focus mid-typing).
  const accQ = (qKey, children) => {
    const q = qList.find(x => x.key === qKey);
    if (!q || !q.visible) return null;
    const open = isOpen(qKey);
    if (!open && q.answered) {
      return (
        <button key={qKey+':collapsed'} onClick={()=>setOpenQ(qKey)} style={{
          width:'100%',background:'#fff',border:0,borderBottom:'1px solid #000',
          padding:'0 24px',height:42,boxSizing:'border-box',cursor:'pointer',fontFamily:'inherit',textAlign:'left',
          display:'flex',alignItems:'center',gap:14,transition:'background .15s',
        }}
        onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <span className="edo-cell-label" style={{color:'var(--edo-orange)',flexShrink:0,width:28}}>
            {q.num}
          </span>
          <span className="edo-cell-label" style={{color:'#888',flexShrink:0}}>
            {q.label}
          </span>
          <span style={{flex:1,fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'-0.01em',color:'#141414',textAlign:'right',textWrap:'balance'}}>
            {q.summary || '—'}
          </span>
          <span className="edo-cell-label" style={{color:'#888',flexShrink:0}}>
            {lang==='fr'?'modifier':'edit'}
          </span>
        </button>
      );
    }
    if (!open) return null;
    const qIdx = qList.findIndex(q2 => q2.key === qKey);
    // Interacting with this Q locks focus here (setOpenQ). Prevents auto-advance from closing
    // the Q mid-edit just because its "answered" flag flipped true (e.g. quantity: typing 2 marks
    // it answered; user wants to keep tweaking without the block collapsing out from under them).
    const onInteract = ()=>{ touchQ(qKey); setOpenQ(qKey); };
    return (
      <div key={qKey+':open'} onClickCapture={onInteract}>{children}</div>
    );
  };

  return (
    <div style={{minWidth:0,overflowY:'auto',height:'100%'}}>
      {/* skip banner */}
      <div style={{padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,background:'#fafafa',minHeight:42,boxSizing:'border-box',position:'sticky',top:0,zIndex:5,borderBottom:'1px solid #000'}}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:'#595959',minWidth:0}}>
          {lang==='fr'?'Notre configurateur vous accompagne — ou ':'Our configurator guides you — or '}
          <span style={{color:'var(--edo-orange)',fontWeight:600}}>{lang==='fr'?'choisissez manuellement →':'pick manually →'}</span>
        </span>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:'0 0 auto'}}>
          <button onClick={()=>{
              setSessions([makeBlankSession()]);
              setActiveIdx(0);
              setOpenQ(null);
              setTouchedQs(new Set());
              if (onReset) onReset();
            }} style={{background:'transparent',border:'1px solid var(--edo-gray-200)',padding:'3px 8px',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:'#141414',whiteSpace:'nowrap',lineHeight:1.4}}>
            ↻ {lang==='fr'?'Réinitialiser':'Reset'}
          </button>
          <button onClick={onSkip}
            onMouseEnter={e=>{e.currentTarget.style.background='#141414';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='#141414';}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--edo-orange)';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='var(--edo-orange)';}}
            style={{background:'var(--edo-orange)',border:'1px solid var(--edo-orange)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#fff',whiteSpace:'nowrap',lineHeight:1.4,fontWeight:600,transition:'all .15s ease'}}>
            {lang==='fr'?'Choisir manuellement':'Choose manually'} →
          </button>
        </div>
      </div>

      {/* SESSION TABS (only if > 1) */}
      {sessions.length > 1 && (
        <>
          <div style={{padding:'14px 24px 4px',display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>
              {lang==='fr'?'Sessions produit':'Product sessions'} — {sessions.length}
            </span>
            <button onClick={addSession} style={{background:'#fff',border:'1px solid var(--edo-gray-200)',padding:'8px 14px',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#141414',display:'flex',alignItems:'center',gap:8,height:32}}>
              + {lang==='fr'?'Ajouter une session':'Add a session'}
            </button>
          </div>
          <div style={tabGrid}>
            {sessions.map((s, i) => {
              const isActive = i === activeIdx;
              const valid = sessionValid(s);
              const p = PRODUCTS.find(x => x.k === s.product);
              const label = s.projectType === 'cyclorama'
                ? (lang==='fr'?'Cyclorama':'Cyclorama')
                : (p ? p[lang] : (lang==='fr'?'À définir':'To define'));
              return (
                <button key={i} onClick={()=>{setActiveIdx(i); setOpenQ(null); setTouchedQs(new Set());}} style={{
                  background: isActive ? '#141414' : '#fff',
                  color: isActive ? '#fff' : '#141414',
                  border:0,padding:'12px 14px',textAlign:'left',cursor:'pointer',fontFamily:'inherit',
                  display:'flex',flexDirection:'column',gap:3,minWidth:0,
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',color:isActive?'var(--edo-orange)':'#888'}}>
                      {lang==='fr'?'Session':'Session'} {String(i+1).padStart(2,'0')}
                    </span>
                    <span onClick={(e)=>{e.stopPropagation(); removeSession(i);}}
                      style={{fontSize:14,color:isActive?'rgba(255,255,255,0.5)':'#888',cursor:'pointer',padding:'0 4px',lineHeight:1}}
                      title={lang==='fr'?'Retirer':'Remove'}>×</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:400,letterSpacing:'-0.015em'}}>
                    {label}
                  </div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.05em',color:isActive?'rgba(255,255,255,0.55)':'#888'}}>
                    {valid ? (s.projectType==='cyclorama' ? (lang==='fr'?'sur demande':'on request') : `${s.quantity} ${lang==='fr'?'produits':'products'}`) : (lang==='fr'?'incomplet':'incomplete')}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Q00 — TYPE DE PROJET */}
      {accQ('projectType', <>
      <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
        <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>00 · {lang==='fr'?'Type de projet':'Project type'}</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
        {PROJECT_TYPES.map((pt,i)=>(
          <CfgChoice key={pt.k} idx={i+1} on={S.projectType===pt.k}
            onClick={()=>resetFrom('projectType', pt.k)}
            label={pt[lang]} desc={pt.desc[lang]}/>
        ))}
      </div>
      </>)}

      {/* Q1 — TYPE DE PRODUIT (ecom only) */}
      {S.projectType === 'ecom' && (
      accQ('product', <>
      <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
        <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>01 · {lang==='fr'?'Type de produit':'Product type'}</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
        {PRODUCTS.map((p,i)=>(
          <CfgChoice key={p.k} idx={i+1} on={S.product===p.k}
            onClick={()=>resetFrom('product', p.k)}
            label={p[lang]} desc={p.desc[lang]}/>
        ))}
      </div>
      </>)
      )}

      {/* Q2 — PAP Méthode */}
      {S.product === 'pap' && (
        accQ('method', <>
          <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>02 · {lang==='fr'?'Méthode':'Method'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
            {PAP_METHODS.map((m,i)=>(
              <CfgChoice key={m.k} idx={i+1} on={S.method===m.k}
                onClick={()=>resetFrom('method', m.k)}
                label={m[lang]} desc={m.desc[lang]}/>
            ))}
          </div>
        </>)
      )}

      {/* Q2b — PAP Packshot sous-type */}
      {S.product === 'pap' && S.method === 'packshot' && (
        accQ('submethod', <>
          <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>03 · {lang==='fr'?'Type de packshot':'Packshot type'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
            {PAP_PACKSHOT_SUBS.map((sub,i)=>(
              <CfgChoice key={sub.k} idx={i+1} on={S.submethod===sub.k}
                onClick={()=>resetFrom('submethod', sub.k)}
                label={sub[lang]} desc={sub.desc[lang]}/>
            ))}
          </div>
        </>)
      )}

      {/* Q2 — ACCESSOIRES sous-type */}
      {S.product === 'accessoires' && (
        accQ('submethod', <>
          <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>02 · {lang==='fr'?"Type d'accessoire":'Accessory type'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
            {ACCESS_SUBS.map((sub,i)=>(
              <CfgChoice key={sub.k} idx={i+1} on={S.submethod===sub.k}
                onClick={()=>resetFrom('submethod', sub.k)}
                label={sub[lang]} desc={sub.desc[lang]}/>
            ))}
          </div>
        </>)
      )}

      {/* Q3 — MÉDIA (on-model / accessoires / simple products) */}
      {((S.product === 'pap' && S.method === 'onmodel')
        || (S.product === 'accessoires' && S.submethod)
        || (['eyewear','food','cosmetique','bijoux'].includes(S.product))) && (
        accQ('media', <>
          <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>
              {S.product==='pap' ? '03' : S.product==='accessoires' ? '03' : '02'} · {lang==='fr'?'Média':'Media'}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',color:'#888',marginLeft:12}}>
              {lang==='fr'?'(un ou les deux)':'(one or both)'}
            </span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
            {MEDIA_OPTIONS.map((m,i)=>{
              const cur = Array.isArray(S.media) ? S.media : (S.media ? [S.media] : []);
              const on = cur.includes(m.k);
              return (
                <CfgChoice key={m.k} idx={i+1} on={on}
                  onClick={()=>{
                    const next = on ? cur.filter(x=>x!==m.k) : [...cur, m.k];
                    setSession({ media: next });
                  }}
                  label={m[lang]} desc={m.desc[lang]}/>
              );
            })}
          </div>
        </>)
      )}

      {/* Q4 — PACKSHOT : quantité */}
      {S.product === 'pap' && S.method === 'packshot' && S.submethod && (
        accQ('quantity', <>
          <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>04 · {lang==='fr'?'Nombre de produits':'Number of products'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
            <div style={{background:'#fff',padding:'10px 12px',display:'flex',flexDirection:'column',gap:8,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,maxWidth:320,minWidth:0}}>
                <input value={S.quantity} onChange={e=>setSession({quantity: e.target.value.replace(/\D/g,'')})}
                  placeholder="—" inputMode="numeric"
                  style={{flex:'1 1 0',minWidth:0,background:'#fff',border:'1px solid var(--edo-gray-200)',outline:'none',padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:18,letterSpacing:'-0.01em',color:'#141414',textAlign:'center'}}/>
              </div>
            </div>
          </div>
        </>)
      )}

      {/* Q5 — PACKSHOT : vues (multi) */}
      {S.product === 'pap' && S.method === 'packshot' && S.submethod && (
        accQ('views', <>
          <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>05 · {lang==='fr'?'Vues par produit':'Views per product'}</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',color:'#888',marginLeft:12}}>
              {lang==='fr'?'(multi-sélection)':'(multi-select)'}
            </span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
            {PACKSHOT_VIEWS.filter(v => v.k !== '3/4' || S.submethod === 'ghost').map((v,i)=>{
              const on = (S.views || []).includes(v.k);
              return (
                <button key={v.k} onClick={()=>{
                  const cur = S.views || [];
                  setSession({ views: cur.includes(v.k) ? cur.filter(x => x !== v.k) : [...cur, v.k] });
                }} style={{
                  background:on?'#141414':'#fff',color:on?'#fff':'#141414',
                  border:0,padding:'10px 12px',textAlign:'left',cursor:'pointer',fontFamily:'inherit',
                  display:'flex',flexDirection:'column',gap:6,minHeight:72,minWidth:0,
                }}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',color:on?'rgba(255,255,255,0.6)':'#888'}}>
                    {String(i+1).padStart(2,'0')}
                  </span>
                  <span style={{fontSize:14,fontWeight:400,letterSpacing:'-0.015em'}}>{v[lang]}</span>
                  {on && <span style={{color:'var(--edo-orange)',fontSize:12,marginTop:'auto'}}>●</span>}
                </button>
              );
            })}
          </div>
        </>)
      )}

      {/* Q4+Q5 pour on-model / accessoires / simples : qty + viewsCount */}
      {((S.product === 'pap' && S.method === 'onmodel' && (S.media||[]).length > 0)
        || (S.product === 'accessoires' && S.submethod && (S.media||[]).length > 0)
        || (['eyewear','food','cosmetique','bijoux'].includes(S.product) && (S.media||[]).length > 0)) && (
        accQ('qtyViews', <>
          <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>
              {S.product==='pap' ? '04' : S.product==='accessoires' ? '04' : '03'} · {lang==='fr'?'Produits & vues':'Products & views'}
            </span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
            <div style={{background:'#fff',padding:'10px 12px',display:'flex',flexDirection:'column',gap:8,minWidth:0}}>
              <span className="edo-cell-label" style={{color:'#888'}}>{lang==='fr'?'Nombre de produits':'Number of products'}</span>
              <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                <input value={S.quantity} onChange={e=>setSession({quantity: e.target.value.replace(/\D/g,'')})}
                  placeholder="—" inputMode="numeric"
                  style={{flex:'1 1 0',minWidth:0,width:'100%',background:'#fff',border:'1px solid var(--edo-gray-200)',outline:'none',padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:18,letterSpacing:'-0.01em',color:'#141414',textAlign:'center'}}/>
              </div>
            </div>
            <div style={{background:'#fff',padding:'10px 12px',display:'flex',flexDirection:'column',gap:8,minWidth:0}}>
              <span className="edo-cell-label" style={{color:'#888'}}>{lang==='fr'?'Vues par produit':'Views per product'}</span>
              <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                <input value={S.viewsCount} onChange={e=>setSession({viewsCount: e.target.value.replace(/\D/g,'')})}
                  placeholder="—" inputMode="numeric"
                  style={{flex:'1 1 0',minWidth:0,width:'100%',background:'#fff',border:'1px solid var(--edo-gray-200)',outline:'none',padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:18,letterSpacing:'-0.01em',color:'#141414',textAlign:'center'}}/>
              </div>
            </div>
          </div>
        </>)
      )}

      {/* POST-PROD */}
      {S.projectType === 'ecom' && S.product && sessionValid(S) && (
        accQ('postprod', <>
          <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,gap:12,boxSizing:'border-box'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{lang==='fr'?'Post-production':'Post-production'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns: ((S.media||[]).includes('video') && S.postprod) ? '1fr 1fr' : '1fr',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
            <div style={{background:'#fff',padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div>
                <div style={{fontSize:14,fontWeight:500,letterSpacing:'-0.01em'}}>{lang==='fr'?'Post-production par E-DO ?':'Post-production by E-DO?'}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:2}}>{lang==='fr'?'Prix estimatif affiché — ajusté après brief':'Estimated price shown — adjusted after brief'}</div>
              </div>
              <CfgToggle on={S.postprod} onClick={()=>setSession({postprod:!S.postprod, postprodVideo: S.postprod ? false : S.postprodVideo})}/>
            </div>
            {((S.media||[]).includes('video')) && S.postprod && (
              <div style={{background:'#fff',padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <div>
                  <div style={{fontSize:14,fontWeight:500,letterSpacing:'-0.01em'}}>{lang==='fr'?'Montage vidéo ?':'Video editing?'}</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:2}}>{lang==='fr'?'Uniquement pour les projets vidéo':'Only for video projects'}</div>
                </div>
                <CfgToggle on={S.postprodVideo} onClick={()=>setSession({postprodVideo:!S.postprodVideo})}/>
              </div>
            )}
          </div>
        </>)
      )}

      {/* CYCLORAMA */}
      {S.projectType === 'cyclorama' && (
        <div style={{background:'#fafafa',padding:'20px 24px',borderTop:'1px solid #000',borderBottom:'1px solid #000',textAlign:'center'}}>
          <div style={{fontSize:17,fontWeight:400,letterSpacing:'-0.015em',marginBottom:8}}>
            {lang==='fr'?'Cyclorama / Production libre':'Cyclorama / Free production'}
          </div>
          <div style={{fontSize:13,color:'#595959',maxWidth:520,margin:'0 auto',lineHeight:1.5}}>
            {lang==='fr'
              ?"Besoin sur-mesure, nous établissons un devis personnalisé."
              :"Custom needs — we'll prepare a tailored quote based on stage, duration and technical resources."}
          </div>
        </div>
      )}

      {/* ADD ANOTHER (visible after the active session is valid, on any count) */}
      {sessionValid(active) && activeIdx === sessions.length - 1 && (
        <div style={{padding:'6px 24px',display:'flex',justifyContent:'center',alignItems:'center',background:'#fff'}}>
          <button onClick={addSession} style={{background:'#fff',border:'1px solid var(--edo-gray-200)',padding:'6px 16px',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#141414',display:'flex',alignItems:'center',gap:8,height:28}}>
            + {lang==='fr'?'Ajouter une autre session produit':'Add another product session'}
          </button>
        </div>
      )}

      {/* spacer bottom */}
      <div style={{height:0,background:'#fff'}}/>

      {/* INLINE RECAP + APPLY (full-width, bottom of page) */}
      {allValid && recs && (
        <div style={{margin:'0 0 0',background:'#141414',color:'#fff'}}>
          <div style={{padding:'8px 24px',borderBottom:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--edo-orange)'}}>
              {lang==='fr'?'Récap — recommandation':'Recap — recommendation'}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.1em',color:'rgba(255,255,255,0.45)'}}>
              {lang==='fr'?'estimation, ajustable':'estimate, tweakable'}
            </span>
          </div>
          {recs.map((r, i) => {
            const px = BOOK_PLATEAUX.find(x => x.k === r.plateau);
            const p = PRODUCTS.find(x => x.k === r.session.product);
            const productLabel = r.session.projectType === 'cyclorama'
              ? (lang==='fr'?'Cyclorama':'Cyclorama')
              : (p?.[lang] || '');
            // Durée : heures jusqu'à 16h, puis jours + heures au-delà
            const totalHours = r.estimatedHours || r.hours || 0;
            let dur;
            if (r.onRequest) {
              dur = lang==='fr' ? 'sur demande' : 'on request';
            } else if (totalHours <= 16) {
              dur = `${totalHours}h`;
            } else {
              const d = Math.floor(totalHours / 8);
              const h = totalHours - d * 8;
              const dLbl = lang==='fr' ? (d > 1 ? 'jours' : 'jour') : (d > 1 ? 'days' : 'day');
              dur = h > 0
                ? `${d} ${dLbl} ${lang==='fr'?'et':'+'} ${h}h (${totalHours}h)`
                : `${d} ${dLbl} (${totalHours}h)`;
            }
            return (
              <div key={i} style={{padding:'8px 24px',borderBottom:i<recs.length-1 ? '1px solid rgba(255,255,255,0.1)':'none',display:'grid',gridTemplateColumns:'auto 1fr',gap:20,alignItems:'baseline'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',color:'rgba(255,255,255,0.5)'}}>
                  {String(i+1).padStart(2,'0')}
                </span>
                <div>
                  <div style={{fontSize:14,fontWeight:400,letterSpacing:'-0.015em',marginBottom:1}}>
                    {px[lang]} <span style={{color:'rgba(255,255,255,0.5)',fontSize:11}}>· {dur}</span>
                  </div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.05em',color:'rgba(255,255,255,0.55)'}}>
                    {productLabel}{r.session.projectType==='cyclorama' ? '' : ` · ${r.session.quantity} ${lang==='fr'?'produits':'products'}`}
                    {r.session.projectType==='cyclorama' ? '' : (() => {
                      const q = Number(r.session.quantity)||0;
                      const vc = Number(r.session.viewsCount)||0;
                      const vLen = (r.session.views||[]).length;
                      const v = vc || vLen || 0;
                      const n = q * v;
                      return n > 0 ? ` · ${n} ${lang==='fr'?'images':'images'}` : '';
                    })()}
                    {r.cadence ? ` · ${lang==='fr'?`Estimation : ${r.cadence} produits/jour`:`Estimate: ${r.cadence} products/day`}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'flex-end',gap:12}}>
            <button onClick={onApply} style={{
              background:'var(--edo-orange)',border:0,color:'#fff',padding:'10px 20px',cursor:'pointer',
              fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',
              display:'inline-flex',alignItems:'center',gap:10,
            }}>
              {lang==='fr'?'Continuer vers la réservation':'Continue to booking'}
              <IconArrowRight width="12" height="12"/>
            </button>
          </div>
        </div>
      )}

      <div style={{height:16,background:'#fff'}}/>
    </div>
  );
};

/* ================================================================= */
/*  MULTI-PLATEAU WRAPPER                                             */
/*  Loops over selected plateaus and renders a section per plateau    */
/* ================================================================= */
const MultiPlateauStep = ({ lang, plateaus, perPlateau, setPerPlateau, fallback, renderOne, topBanner }) => {
  const list = plateaus && plateaus.length > 0 ? plateaus : [];
  if (list.length === 0) {
    return (
      <div style={{padding:'48px',textAlign:'center',color:'#888',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.1em',textTransform:'uppercase'}}>
        {lang==='fr'?'Aucun plateau sélectionné — revenez à l’étape 01.':'No stage selected — go back to step 01.'}
      </div>
    );
  }

  const setOne = (k, patch) => {
    setPerPlateau(prev => ({...prev, [k]: {...(prev[k] || {}), ...patch}}));
  };

  return (
    <div>
      {topBanner}
      {list.map((k, idx) => {
        const px = BOOK_PLATEAUX.find(x => x.k === k);
        if (!px) return null;
        const st = perPlateau[k] || {};
        return (
          <div key={k} style={{borderBottom: idx < list.length - 1 ? '8px solid var(--edo-gray-100)' : '0'}}>
            {list.length > 1 && (
              <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,boxSizing:'border-box',gap:12,background:'#fff',flexWrap:'wrap'}}>
                <span className="edo-cell-label" style={{color:'var(--edo-orange)',whiteSpace:'nowrap'}}>
                  {lang==='fr'?'Plateau':'Stage'} {String(idx+1).padStart(2,'0')}
                </span>
                <span style={{fontSize:13,fontWeight:400,letterSpacing:'-0.01em',color:'#141414'}}>{px[lang]}</span>
                <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',color:'#888'}}>{px.desc[lang]}</span>
              </div>
            )}
            {renderOne(px, st, patch => setOne(k, patch))}
          </div>
        );
      })}
    </div>
  );
};

/* ================================================================= */
/*  STEP 1 — PLATEAU                                                  */
/* ================================================================= */
const Step1Plateau = ({ lang, plateau, setPlateau, plateaus, togglePlateau, setCycloMode, setSlotType, setHours, onConfigurator }) => (
  <div>
    <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,boxSizing:'border-box',gap:12,background:'#fff',whiteSpace:'nowrap',position:'sticky',top:0,zIndex:5}}>
      <span className="edo-cell-label" style={{color:'var(--edo-orange)',whiteSpace:'nowrap'}}>01 · {lang==='fr'?'Plateau':'Stage'}</span>
      <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',color:'#888'}}>
        {lang==='fr'?'Sélection multiple possible':'Multi-select possible'}
      </span>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridAutoRows:'minmax(180px,auto)',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
    {BOOK_PLATEAUX.map((px,i)=>{
      const on = (plateaus || []).includes(px.k);
      const priceRows = px.isVisite
        ? [{lbl: lang==='fr'?'Visite':'Visit', val: lang==='fr'?'Gratuit':'Free'}]
        : px.isCyclo
          ? [
              {lbl: lang==='fr'?'½ journée (5h)':'Half day (5h)',   val:`${px.rates.halfH} €`},
              {lbl: lang==='fr'?'Journée (10h)':'Full day (10h)',  val:`${px.rates.fullH} €`},
              {lbl: lang==='fr'?'Éditorial (10h)':'Editorial (10h)', val: lang==='fr'?'Sur demande':'On request'},
            ]
          : [
              {lbl: lang==='fr'?'Heure'  :'Hourly',  val:`${px.rates.hour} €`},
              {lbl: lang==='fr'?'½ journée (4h)':'Half day (4h)',val:`${px.rates.half} €`},
              {lbl: lang==='fr'?'Journée (8h)':'Full day (8h)',val:`${px.rates.full} €`},
            ];
      return (
        <button key={px.k} onClick={()=>{
            togglePlateau(px.k);
          }}
          onMouseEnter={e=>{
            if (on) return;
            e.currentTarget.style.background='var(--edo-gray-100)';
            const arr = e.currentTarget.querySelector('[data-plateau-arrow]');
            if (arr) { arr.style.opacity='1'; arr.style.transform='translateX(0) scale(1.15)'; }
            const lbl = e.currentTarget.querySelector('[data-plateau-label]');
            if (lbl) lbl.style.transform='scale(1.02)';
          }}
          onMouseLeave={e=>{
            if (on) return;
            e.currentTarget.style.background='#fff';
            const arr = e.currentTarget.querySelector('[data-plateau-arrow]');
            if (arr) { arr.style.opacity='0'; arr.style.transform='translateX(-4px) scale(1)'; }
            const lbl = e.currentTarget.querySelector('[data-plateau-label]');
            if (lbl) lbl.style.transform='scale(1)';
          }}
          style={{background:on?'#141414':'#fff',color:on?'#fff':'#141414',
            border:0,padding:'16px 18px',textAlign:'left',cursor:'pointer',fontFamily:'inherit',
            display:'flex',flexDirection:'column',gap:6,transition:'background .15s,color .15s',minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',color:on?'rgba(255,255,255,0.6)':'#888'}}>{String(i+1).padStart(2,'0')}</span>
            {on
              ? <span style={{color:'var(--edo-orange)',fontSize:18,lineHeight:1}}>●</span>
              : <span data-plateau-arrow style={{color:'var(--edo-orange)',fontSize:16,lineHeight:1,opacity:0,transform:'translateX(-4px) scale(1)',transition:'opacity .15s, transform .2s ease',transformOrigin:'right center'}}>→</span>}
          </div>
          <div data-plateau-label style={{fontSize:26,fontWeight:300,letterSpacing:'-0.02em',marginTop:4,transition:'transform .2s ease',transformOrigin:'left center'}}>{px[lang]}</div>
          <div style={{fontSize:13,color:on?'rgba(255,255,255,0.65)':'#595959',lineHeight:1.35}}>{px.desc[lang]}</div>
          {priceRows.length>0 && (
          <div style={{marginTop:'auto',paddingTop:12,display:'flex',flexDirection:'column',gap:4,borderTop:'1px solid '+(on?'rgba(255,255,255,0.15)':'var(--edo-gray-200)')}}>
            {priceRows.map(pr=>(
              <div key={pr.lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8,whiteSpace:'nowrap'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.06em',color:on?'rgba(255,255,255,0.55)':'#888',textTransform:'uppercase',overflow:'hidden',textOverflow:'ellipsis'}}>{pr.lbl}</span>
                <span style={{fontSize:13,fontWeight:500,fontVariantNumeric:'tabular-nums'}}>{pr.val}</span>
              </div>
            ))}
          </div>
          )}
        </button>
      );
    })}
    </div>
  </div>
);

/* ================================================================= */
/*  STEP 2 — DATE                                                     */
/* ================================================================= */
const Step2Date = ({ lang, p, viewY, viewM, months, days, calCells, selected, setSelected, arrivalHour, setArrivalHour, rentalHours, isPast, nextMonth, prevMonth }) => {
  const isSelected = (d) => selected && selected.y===viewY && selected.m===viewM && selected.d===d;
  // Auto-adjust arrival if current choice would end after 19h
  const maxStart = 19 - rentalHours;
  React.useEffect(()=>{
    if (arrivalHour > maxStart) setArrivalHour(Math.max(9, Math.min(10, maxStart)));
  }, [maxStart]);

  return (
  <div>
    <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,boxSizing:'border-box',gap:12,background:'#fff',flexWrap:'wrap',position:'sticky',top:0,zIndex:5}}>
      <span className="edo-cell-label" style={{color:'var(--edo-orange)',whiteSpace:'nowrap'}}>06 · {lang==='fr'?'Choisir une date':'Pick a date'}</span>
    </div>

    {/* Header band: month + legend + nav (bento row, compact) */}
    <div style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
      <div style={{background:'#fff',padding:'8px 48px',display:'flex',alignItems:'center',gap:20,minWidth:0,flexWrap:'wrap'}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:300,letterSpacing:'-0.02em'}}>
          {months[viewM]} <span style={{color:'#888'}}>{viewY}</span>
        </h2>
        <div style={{display:'flex',gap:12,fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.08em',textTransform:'uppercase',color:'#595959',flexWrap:'wrap'}}>
          <LegendChip bg="#fff" br="#141414"  lbl={lang==='fr'?'Libre':'Free'}/>
          <LegendChip bg="#f6e4c4" br="#d9b47d" lbl={lang==='fr'?'Partiel':'Limited'}/>
          <LegendChip bg="var(--edo-gray-100)" br="var(--edo-gray-200)" lbl={lang==='fr'?'Indisponible':'Booked'}/>
          <LegendChip bg="var(--edo-orange)" br="var(--edo-orange)" lbl={lang==='fr'?'Sélectionné':'Selected'}/>
        </div>
      </div>
      <button onClick={prevMonth} style={{background:'#fff',border:0,cursor:'pointer',padding:'0 18px',fontFamily:'var(--font-mono)',fontSize:13,color:'#141414'}}>←</button>
      <button onClick={nextMonth} style={{background:'#fff',border:0,cursor:'pointer',padding:'0 18px',fontFamily:'var(--font-mono)',fontSize:13,color:'#141414'}}>→</button>
    </div>

    {/* Weekday row */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
      {days.map((d,i)=>(
        <div key={i} style={{background:'#fafafa',padding:'6px 0',textAlign:'center',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:'#888'}}>{d}</div>
      ))}
    </div>

    {/* Calendar — bento cells (flat to fit viewport without scroll) */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
      {calCells.map((d,i)=>{
        if (d===null) return <div key={i} style={{background:'#fafafa',aspectRatio:'1.9 / 1'}}/>;
        const dow = new Date(viewY, viewM, d).getDay();
        const weekend = dow===0 || dow===6;
        const isFullDay = rentalHours>=8;
        const weekendBlocked = weekend && !isFullDay;
        const av = weekendBlocked ? 'unavailable' : availFor(p.k, viewY, viewM, d);
        const past = isPast(d);
        const sel = isSelected(d);
        const bg = sel?'var(--edo-orange)':(past?'#fafafa':(av==='unavailable'?'var(--edo-gray-100)':(av==='limited'?'#f6e4c4':'#fff')));
        const color = sel?'#fff':(past?'#c0c0c0':'#141414');
        const clickable = !past && av!=='unavailable';
        return (
          <button key={i} disabled={!clickable}
            onClick={()=>setSelected({y:viewY,m:viewM,d})}
            title={weekendBlocked ? (lang==='fr'?'Week-end : réservation journée complète uniquement':'Weekend: full-day booking only') : ''}
            style={{
              background:bg,color,border:0,cursor:clickable?'pointer':'not-allowed',
              aspectRatio:'1.9 / 1',padding:'6px 10px',display:'flex',flexDirection:'column',justifyContent:'space-between',
              textAlign:'left',fontFamily:'inherit',minWidth:0,
            }}>
            <span style={{fontSize:15,fontWeight:sel?500:400,letterSpacing:'-0.01em'}}>{d}</span>
            {!past && av!=='unavailable' && (
              <span style={{fontFamily:'var(--font-mono)',fontSize:8,letterSpacing:'0.06em',textTransform:'uppercase',opacity:0.7}}>
                {av==='free'?(lang==='fr'?'libre':'free'):(lang==='fr'?'partiel':'part.')}
              </span>
            )}
            {weekendBlocked && !past && (
              <span style={{fontFamily:'var(--font-mono)',fontSize:8,letterSpacing:'0.06em',textTransform:'uppercase',color:'#888'}}>
                {lang==='fr'?'journée':'full only'}
              </span>
            )}
          </button>
        );
      })}
    </div>

    {/* Arrival time label row */}
    <div style={{display:'grid',gridTemplateColumns:'1fr',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
      <div style={{background:'#fff',padding:'10px 48px',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
        <span className="edo-cell-label">{lang==='fr'?'Heure d’arrivée':'Arrival time'}</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.08em',color:'#595959'}}>
          {String(arrivalHour).padStart(2,'0')}:00 → {String(arrivalHour+rentalHours).padStart(2,'0')}:00 · {rentalHours}h
        </span>
      </div>
    </div>

    {/* Arrival time — 10 square bento cells */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
      {Array.from({length:10},(_,i)=>i+9).map(h=>{
        const on = arrivalHour===h;
        const endsTooLate = h + rentalHours > 19;
        const disabled = endsTooLate;
        return (
          <button key={h} disabled={disabled} onClick={()=>!disabled && setArrivalHour(h)}
            title={disabled ? (lang==='fr'?`Termine à ${h+rentalHours}h, après la fermeture`:`Ends at ${h+rentalHours}h, past closing`) : ''}
            style={{background:on?'#141414':(disabled?'var(--edo-gray-100)':'#fff'),
              color:on?'#fff':(disabled?'#c0c0c0':'#141414'),
              border:0,cursor:disabled?'not-allowed':'pointer',
              aspectRatio:'1.5 / 1',display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.05em',minWidth:0}}>
            {String(h).padStart(2,'0')}:00
          </button>
        );
      })}
    </div>
  </div>
  );
};

/* ================================================================= */
/*  STEP 3 — SLOT (bento layout, same vocabulary as Step 1)           */
/* ================================================================= */

/* Helper: one bento tile with idx / label / sub / description / price */
const BentoSlotTile = ({ idx, on, onClick, label, sub, desc, price, hint, lang }) => (
  <button onClick={onClick}
    onMouseEnter={e=>{
      if (on) return;
      e.currentTarget.style.background='var(--edo-gray-100)';
      const arr = e.currentTarget.querySelector('[data-slot-arrow]');
      if (arr) { arr.style.opacity='1'; arr.style.transform='translateX(0) scale(1.15)'; }
      const lbl = e.currentTarget.querySelector('[data-slot-label]');
      if (lbl) lbl.style.transform='scale(1.02)';
    }}
    onMouseLeave={e=>{
      if (on) return;
      e.currentTarget.style.background='#fff';
      const arr = e.currentTarget.querySelector('[data-slot-arrow]');
      if (arr) { arr.style.opacity='0'; arr.style.transform='translateX(-4px) scale(1)'; }
      const lbl = e.currentTarget.querySelector('[data-slot-label]');
      if (lbl) lbl.style.transform='scale(1)';
    }}
    style={{background:on?'#141414':'#fff',color:on?'#fff':'#141414',
      border:0,padding:'16px 18px',textAlign:'left',cursor:'pointer',fontFamily:'inherit',
      display:'flex',flexDirection:'column',gap:6,transition:'background .15s,color .15s',minWidth:0,minHeight:180}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
      <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',color:on?'rgba(255,255,255,0.6)':'#888'}}>{String(idx).padStart(2,'0')}</span>
      {on
        ? <span style={{color:'var(--edo-orange)',fontSize:18,lineHeight:1}}>●</span>
        : <span data-slot-arrow style={{color:'var(--edo-orange)',fontSize:16,lineHeight:1,opacity:0,transform:'translateX(-4px) scale(1)',transition:'opacity .15s, transform .2s ease',transformOrigin:'right center'}}>→</span>}
    </div>
    <div data-slot-label style={{fontSize:26,fontWeight:300,letterSpacing:'-0.02em',marginTop:4,transition:'transform .2s ease',transformOrigin:'left center'}}>{label}</div>
    {sub && <div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:on?'rgba(255,255,255,0.55)':'#888'}}>{sub}</div>}
    {desc && <div style={{fontSize:13,color:on?'rgba(255,255,255,0.65)':'#595959',lineHeight:1.35}}>{desc}</div>}
    <div style={{marginTop:'auto',paddingTop:12,display:'flex',justifyContent:'space-between',alignItems:'baseline',borderTop:'1px solid '+(on?'rgba(255,255,255,0.15)':'var(--edo-gray-200)')}}>
      <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.06em',color:on?'rgba(255,255,255,0.55)':'#888',textTransform:'uppercase'}}>
        {hint || (lang==='fr'?'Tarif HT':'Rate ex. VAT')}
      </span>
      <span style={{fontSize:15,fontWeight:500,fontVariantNumeric:'tabular-nums'}}>{price}</span>
    </div>
  </button>
);

const Step3Slot = ({ lang, p, slotType, setSlotType, hours, setHours, cycloMode, setCycloMode }) => {
  /* ---- CYCLORAMA : 3 blocs (5h / 10h / 10h editorial) ---- */
  if (p.isCyclo) {
    return (
      <div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridAutoRows:'minmax(180px,auto)',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
          <BentoSlotTile idx={1} on={cycloMode==='halfH'} onClick={()=>setCycloMode('halfH')}
            label={lang==='fr'?'Demi-journée':'Half day'} sub="5 heures"
            desc={lang==='fr'?'Bloc de 5h, parfait pour un shoot packshot ciblé.':'5-hour block, perfect for a focused packshot shoot.'}
            price="650 €" lang={lang}/>
          <BentoSlotTile idx={2} on={cycloMode==='fullH'} onClick={()=>setCycloMode('fullH')}
            label={lang==='fr'?'Journée':'Full day'} sub="10 heures"
            desc={lang==='fr'?'Bloc de 10h, volume e-commerce ou campagne.':'10-hour block, e-commerce volume or campaign.'}
            price="880 €" lang={lang}/>
          <BentoSlotTile idx={3} on={cycloMode==='editorial'} onClick={()=>setCycloMode('editorial')}
            label={lang==='fr'?'Éditorial':'Editorial'} sub="10 heures"
            desc={lang==='fr'?'Tarif réduit presse, usage personnel ou portfolio.':'Reduced rate for press, personal or portfolio use.'}
            price={lang==='fr'?'Sur demande':'On request'} hint={lang==='fr'?'Presse / personnel':'Press / personal'} lang={lang}/>
        </div>
      </div>
    );
  }

  /* ---- VISITE ---- */
  if (p.isVisite) {
    return (
      <div>
        <div style={{padding:'0 48px'}}>
          <StepIntro n="02" lang={lang} t={lang==='fr'?'Visite du studio':'Studio visit'}
            s={lang==='fr'?'La visite est gratuite et dure environ une heure. Nous vous recontactons pour confirmer le créneau.':'Studio visit is free and lasts about an hour. We will confirm the slot by phone.'}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:1,background:'#000',borderTop:'1px solid #000',borderBottom:'1px solid #000',width:'100%'}}>
          <div style={{background:'#fff',padding:'32px 48px',display:'flex',alignItems:'baseline',gap:20}}>
            <span style={{fontSize:56,fontWeight:300,letterSpacing:'-0.035em'}}>0 €</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'#595959'}}>{lang==='fr'?'Gratuit · sur rendez-vous':'Free · by appointment'}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ---- PLATEAUX STANDARD : Hour / Half / Full ---- */
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridAutoRows:'minmax(180px,auto)',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
        <BentoSlotTile idx={1} on={slotType==='hour'} onClick={()=>{setSlotType('hour'); setHours(1);}}
          label={lang==='fr'?'À l’heure':'Hourly'} sub={lang==='fr'?'1 à 3 heures':'1 to 3 hours'}
          desc={lang==='fr'?'Idéal pour un essai ou un shoot rapide.':'Ideal for a test or a quick shoot.'}
          price={`${p.rates.hour} €/h`} lang={lang}/>
        <BentoSlotTile idx={2} on={slotType==='half'} onClick={()=>{setSlotType('half'); setHours(4);}}
          label={lang==='fr'?'Demi-journée':'Half day'} sub={lang==='fr'?'4 à 7 heures':'4 to 7 hours'}
          desc={lang==='fr'?'Bloc 4h, prorata au-delà jusqu’à 7h.':'4-hour block, pro-rata up to 7 hours.'}
          price={`${p.rates.half} €`} lang={lang}/>
        <BentoSlotTile idx={3} on={slotType==='full'} onClick={()=>{setSlotType('full'); setHours(8);}}
          label={lang==='fr'?'Journée':'Full day'} sub={lang==='fr'?'8 heures':'8 hours'}
          desc={lang==='fr'?'Journée complète, tarif le plus avantageux.':'Full day, best rate.'}
          price={`${p.rates.full} €`} lang={lang}/>
      </div>

      {/* Stepper row — shown for hour/half/full */}
      {(slotType==='hour' || slotType==='half') && (
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
          <div style={{background:'#fff',padding:'20px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <span className="edo-cell-label">
                {slotType==='hour'
                  ? (lang==='fr'?'Nombre d’heures':'Number of hours')
                  : (lang==='fr'?'Nombre d’heures · demi-journée':'Hours · half day')}
              </span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',color:'#888',lineHeight:1.5,whiteSpace:'nowrap'}}>
                {slotType==='hour'
                  ? (lang==='fr' ? '↗ Dès 4h, bascule en demi-journée. Dès 8h, journée complète.' : '↗ From 4h, switches to half day. From 8h, full day.')
                  : (lang==='fr' ? `↗ 4h = ${p.rates.half} €. Au-delà, prorata (${p.rates.half}/4 × h). Dès 8h, journée complète.` : `↗ 4h = €${p.rates.half}. Beyond, pro-rata (${p.rates.half}/4 × h). From 8h, full day.`)}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <StepperBtn onClick={()=>{
                if (slotType==='hour') setHours(Math.max(1,hours-1));
                else { const n=hours-1; if(n<4){setSlotType('hour'); setHours(3);} else setHours(n); }
              }}>−</StepperBtn>
              <span style={{fontSize:32,fontWeight:300,letterSpacing:'-0.02em',minWidth:40,textAlign:'center'}}>{hours}</span>
              <StepperBtn onClick={()=>{
                const n = hours+1;
                if (n>=8) { setSlotType('full'); setHours(8); }
                else if (slotType==='hour' && n>=4) { setSlotType('half'); setHours(n); }
                else { setHours(n); }
              }}>+</StepperBtn>
            </div>
          </div>
        </div>
      )}

      {/* Stepper for full-day : edit total hours (8h+ → multi-jours) */}
      {slotType==='full' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:1,background:'#000',borderBottom:'1px solid #000',width:'100%'}}>
          <div style={{background:'#fff',padding:'20px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <span className="edo-cell-label">
                {lang==='fr'?'Durée totale':'Total duration'}
              </span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',color:'#888',lineHeight:1.5,whiteSpace:'nowrap'}}>
                {(() => {
                  const fullDays = Math.floor(hours/8);
                  const extraH = hours - fullDays*8;
                  if (extraH === 0) {
                    return lang==='fr'
                      ? `↗ ${fullDays} ${fullDays>1?'journées':'journée'} (${hours}h) · ${(p.rates.full*fullDays).toFixed(0)} €`
                      : `↗ ${fullDays} ${fullDays>1?'days':'day'} (${hours}h) · €${(p.rates.full*fullDays).toFixed(0)}`;
                  }
                  const extraAmt = +(p.rates.full / 8 * extraH).toFixed(2);
                  return lang==='fr'
                    ? `↗ ${fullDays} ${fullDays>1?'journées':'journée'} (${fullDays*8}h) + ${extraH}h · ${(p.rates.full*fullDays+extraAmt).toFixed(0)} €`
                    : `↗ ${fullDays} ${fullDays>1?'days':'day'} (${fullDays*8}h) + ${extraH}h · €${(p.rates.full*fullDays+extraAmt).toFixed(0)}`;
                })()}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <StepperBtn onClick={()=>{
                const n = hours-1;
                if (n<8) { setSlotType('half'); setHours(7); }
                else { setHours(n); }
              }}>−</StepperBtn>
              <span style={{fontSize:32,fontWeight:300,letterSpacing:'-0.02em',minWidth:60,textAlign:'center'}}>{hours}h</span>
              <StepperBtn onClick={()=>setHours(hours+1)}>+</StepperBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================================================================= */
/*  STEP 4 — EQUIPMENT                                                */
/* ================================================================= */
const Step4Equipment = ({ lang, p, paint, setPaint, kwh, setKwh }) => (
  <div style={{padding:'0 48px 24px'}}>
    <StepIntro n="03" lang={lang}
      t={lang==='fr'?'Équipements & options':'Equipment & options'}
      s={p.isCyclo
        ? (lang==='fr'?'Options spécifiques au cyclorama (peinture fraîche, électricité additionnelle).':'Cyclorama-specific options (fresh paint, extra electricity).')
        : (lang==='fr'?'Aucune option supplémentaire requise. Le matériel standard est inclus.':'No extra options required. Standard kit is included.')}/>

    {p.isCyclo ? (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px',background:'#fff',borderLeft:paint?'3px solid var(--edo-orange)':'3px solid transparent'}}>
          <div>
            <div style={{fontSize:15,fontWeight:500,letterSpacing:'-0.01em'}}>{lang==='fr'?'Peinture fraîche du cyclo':'Fresh cyclo paint'}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:4}}>{lang==='fr'?'Repeint avant votre arrivée · forfait':'Repainted before your arrival · flat fee'}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:16,fontWeight:500}}>110 €</span>
            <Toggle on={paint} onClick={()=>setPaint(!paint)}/>
          </div>
        </div>

        <div style={{padding:'18px 20px',background:'#fff'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:15,fontWeight:500,letterSpacing:'-0.01em'}}>{lang==='fr'?'Électricité additionnelle':'Extra electricity'}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:4}}>1,40 € / kWh</div>
            </div>
            <span style={{fontSize:16,fontWeight:500}}>{fmtEUR(kwh*CYCLO_EXTRAS.kwh)} €</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginTop:14}}>
            <StepperBtn onClick={()=>setKwh(Math.max(0,kwh-10))}>−</StepperBtn>
            <div style={{flex:1,height:6,background:'var(--edo-gray-200)',position:'relative'}}>
              <div style={{position:'absolute',inset:`0 ${100-Math.min(100,kwh/2)}% 0 0`,background:'var(--edo-orange)'}}/>
            </div>
            <StepperBtn onClick={()=>setKwh(Math.min(200,kwh+10))}>+</StepperBtn>
            <span style={{fontFamily:'var(--font-mono)',fontSize:13,minWidth:60,textAlign:'right'}}>{kwh} kWh</span>
          </div>
        </div>
      </div>
    ) : (
      <div style={{padding:'24px 20px',background:'#fff',display:'flex',alignItems:'center',gap:14}}>
        <span style={{fontSize:18,color:'var(--edo-orange)'}}>✓</span>
        <span style={{fontSize:13,color:'#141414'}}>{lang==='fr'?'Matériel standard inclus : fonds, supports, blocs d’alimentation, Wi-Fi pro.':'Standard kit included: backdrops, stands, power blocks, pro Wi-Fi.'}</span>
      </div>
    )}
  </div>
);

/* ================================================================= */
/*  STEP 5 — TEAM                                                     */
/* ================================================================= */
const Step5Team = ({ lang, p, team, setTeam, configSessions }) => {
  const setDays = (k, val) => setTeam(prev => { const n = {...prev}; if (val<=0) delete n[k]; else n[k]=val; return n; });
  const toggleReq = (k) => setTeam(prev => { const n = {...prev}; if (n[k]===true) delete n[k]; else n[k]=true; return n; });
  // Determine which on-stage role(s) apply based on sessions for THIS plateau:
  //   packshot (piqué/ghost/flat) → Styliste
  //   anything else → Opérateur machine
  // Sessions are filtered to only those whose recommended plateau matches `p`.
  const allSessions = configSessions || [];
  const plateauSessions = allSessions.filter(s => {
    const rec = recommendSession(s, {});
    return rec && rec.plateau === p.k;
  });
  // If no session maps to this plateau (e.g. manual mode), show Opérateur by default.
  const hasPackshot = plateauSessions.some(s => s.method === 'packshot');
  const hasNonPackshot = plateauSessions.length === 0
    || plateauSessions.some(s => s.method !== 'packshot');
  const items = EQUIPE.filter(e => {
    if (e.k === 'styliste_op') return hasPackshot;
    if (e.k === 'operateur')   return hasNonPackshot;
    return true;
  });
  // Recommendations
  const hasPique = plateauSessions.some(s => s.product === 'pap' && s.method === 'packshot' && s.submethod === 'pique');
  const hasOnModel = plateauSessions.some(s => s.method === 'onmodel');
  const recommended = {
    styliste_op: hasPique,
    plateau: hasOnModel,
  };
  return (
    <div style={{padding:'0 48px 24px'}}>
      <div style={{display:'flex',flexDirection:'column',gap:1,background:'var(--edo-gray-200)'}}>
        {items.map(e=>{
          const isHourly = e.unit === 'hour';
          const n = isHourly ? (team[e.k]||0) : 0;
          const onReq = !isHourly && team[e.k]===true;
          return (
            <div key={e.k} style={{background:'#fff',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:20}}>
              <div>
                <div style={{fontSize:14,fontWeight:500,letterSpacing:'-0.01em',display:'flex',alignItems:'center',gap:8}}>
                  <span>{e[lang]}</span>
                  {recommended[e.k] && (
                    <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--edo-orange)',border:'1px solid var(--edo-orange)',padding:'2px 6px',lineHeight:1}}>
                      {lang==='fr'?'Recommandé':'Recommended'}
                    </span>
                  )}
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:2}}>
                  {isHourly
                    ? `${fmtEUR(e.price)} € / ${e.unit==='hour' ? 'h' : (lang==='fr'?'jour':'day')}`
                    : (lang==='fr'?'Tarif sur demande selon le brief':'Rate on request based on brief')}
                </div>
              </div>
              {isHourly ? (
                <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:n>0?'var(--edo-orange)':'#888'}}>
                    {n>0 ? (lang==='fr'?'Inclus':'Included') : (lang==='fr'?'Ajouter':'Add')}
                  </span>
                  <span onClick={()=>setDays(e.k, n>0 ? 0 : 1)} style={{
                    width:22,height:22,border:'1.5px solid '+(n>0?'var(--edo-orange)':'#c0c0c0'),
                    background:n>0?'var(--edo-orange)':'#fff',
                    display:'inline-flex',alignItems:'center',justifyContent:'center',
                    color:'#fff',fontSize:13,fontWeight:700,
                  }}>{n>0?'✓':''}</span>
                </label>
              ) : (
                <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:onReq?'var(--edo-orange)':'#888'}}>
                    {lang==='fr'?'Sur demande':'On request'}
                  </span>
                  <span onClick={()=>toggleReq(e.k)} style={{
                    width:22,height:22,border:'1.5px solid '+(onReq?'var(--edo-orange)':'#c0c0c0'),
                    background:onReq?'var(--edo-orange)':'#fff',
                    display:'inline-flex',alignItems:'center',justifyContent:'center',
                    color:'#fff',fontSize:13,fontWeight:700,
                  }}>{onReq?'✓':''}</span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ================================================================= */
/*  STEP 6 — POSTPROD (simple oui/non + montage vidéo)                */
/* ================================================================= */
const Step6Postprod = ({ lang, postprod, setPostprod, plateauKey }) => {
  const enabled = !!postprod.enabled;
  const video = !!postprod.video;
  // Vertical & horizontal = packshots only, no video produced on these stages.
  const videoAllowed = plateauKey !== 'vertical' && plateauKey !== 'horizontal';
  // Force video off when not allowed (in case it was previously enabled then plateau switched).
  React.useEffect(() => {
    if (!videoAllowed && video) setPostprod({...postprod, video: false});
  }, [videoAllowed, video]);
  return (
    <div style={{padding:'0 48px 24px'}}>
      <div style={{display:'flex',flexDirection:'column',gap:1,background:'var(--edo-gray-200)'}}>
        {/* Toggle principal : post-prod oui/non */}
        <div style={{background:'#fff',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,borderLeft:enabled?'3px solid var(--edo-orange)':'3px solid transparent'}}>
          <div>
            <div style={{fontSize:15,fontWeight:500,letterSpacing:'-0.01em'}}>
              {lang==='fr'?'Post-production par E-DO':'Post-production by E-DO'}
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:4,lineHeight:1.4}}>
              {lang==='fr'
                ? 'Sélection, retouche, livraison — chiffrage sur demande selon le volume.'
                : 'Selection, retouching, delivery — quoted on request based on volume.'}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:enabled?'var(--edo-orange)':'#888'}}>
              {lang==='fr'?(enabled?'Oui':'Non'):(enabled?'Yes':'No')}
            </span>
            <Toggle on={enabled} onClick={()=>setPostprod({...postprod, enabled: !enabled, video: !enabled ? video : false})}/>
          </div>
        </div>

        {/* Sous-option : montage vidéo (seulement si post-prod activée ET plateau supporte la vidéo) */}
        {enabled && videoAllowed && (
          <div style={{background:'#fff',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,borderLeft:video?'3px solid var(--edo-orange)':'3px solid transparent'}}>
            <div>
              <div style={{fontSize:15,fontWeight:500,letterSpacing:'-0.01em'}}>
                {lang==='fr'?'Montage vidéo':'Video editing'}
              </div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:4,lineHeight:1.4}}>
                {lang==='fr'
                  ? 'Uniquement si votre projet inclut de la vidéo — chiffrage sur demande.'
                  : 'Only if your project includes video — quoted on request.'}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:video?'var(--edo-orange)':'#888'}}>
                {lang==='fr'?(video?'Oui':'Non'):(video?'Yes':'No')}
              </span>
              <Toggle on={video} onClick={()=>setPostprod({...postprod, video: !video})}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ================================================================= */
/*  STEP 7 — CONTACT                                                  */
/* ================================================================= */
const ARTICLE_TYPES = [
  {k:'pap',         fr:'Prêt-à-porter', en:'Ready-to-wear'},
  {k:'maroquinerie',fr:'Maroquinerie',  en:'Leather goods'},
  {k:'chaussures',  fr:'Chaussures',    en:'Shoes'},
  {k:'accessoires', fr:'Accessoires',   en:'Accessories'},
  {k:'eyewear',     fr:'Eyewear',       en:'Eyewear'},
  {k:'bijoux',      fr:'Bijoux',        en:'Jewelry'},
  {k:'cosmetique',  fr:'Cosmétique',    en:'Cosmetics'},
  {k:'food',        fr:'Food & spiritueux', en:'Food & spirits'},
  {k:'autre',       fr:'Autre',         en:'Other'},
];

/* Bento cell for a form field — monospace label top, input below, clean frame */
const BentoField = ({ label, children, span }) => (
  <div style={{background:'#fff',padding:'6px 12px',display:'flex',flexDirection:'column',gap:1,gridColumn:span,minHeight:42}}>
    <span className="edo-cell-label" style={{color:'#888',fontSize:9,letterSpacing:'0.15em'}}>{label}</span>
    {children}
  </div>
);

const BentoInput = ({ value, onChange, placeholder, type='text' }) => (
  <input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
    style={{background:'transparent',border:0,outline:'none',padding:0,fontFamily:'inherit',fontSize:13,letterSpacing:'-0.01em',width:'100%',color:'#141414'}}/>
);

const Step7Contact = ({ lang, contact, setContact, p, configMode }) => {
  const isCyclo = p && p.isCyclo;
  // En mode configurateur, type d'articles / quantité / vues sont déjà saisis dans le configurateur.
  const hideProductFields = !!configMode;
  const toggleType = (k) => {
    const cur = contact.typesArticles || [];
    const next = cur.includes(k) ? cur.filter(x=>x!==k) : [...cur, k];
    setContact({...contact, typesArticles: next});
  };
  return (
    <div>
      <div style={{padding:'0 24px',borderBottom:'1px solid #000',display:'flex',alignItems:'center',height:42,boxSizing:'border-box',gap:12,background:'#fff',flexWrap:'wrap',position:'sticky',top:0,zIndex:5}}>
        <span className="edo-cell-label" style={{color:'var(--edo-orange)',whiteSpace:'nowrap'}}>05 · {lang==='fr'?'Vos coordonnées':'Your details'}</span>
      </div>

      {/* ===== FORMULAIRE BENTO — 2 colonnes (B + C au sein du main content) ===== */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#000',borderBottom:'1px solid #000'}}>
        {/* Ligne 1 : Marque · Société · SIREN (3 colonnes sur les 2 cellules B+C) */}
        <div style={{gridColumn:'1 / 3',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,background:'#000'}}>
          <BentoField label={lang==='fr'?'Marque':'Brand'}>
            <BentoInput value={contact.marque} onChange={v=>setContact({...contact,marque:v})} placeholder="—"/>
          </BentoField>
          <BentoField label={lang==='fr'?'Société *':'Company *'}>
            <BentoInput value={contact.societe} onChange={v=>setContact({...contact,societe:v})} placeholder="—"/>
          </BentoField>
          <BentoField label="SIREN *">
            <BentoInput value={contact.siren} onChange={v=>setContact({...contact,siren:v})} placeholder="—"/>
          </BentoField>
        </div>

        {/* Ligne 2 : Adresse de facturation (B + C) */}
        <BentoField label={lang==='fr'?'Adresse de facturation *':'Billing address *'} span="1 / 3">
          <BentoInput value={contact.adresseFacturation} onChange={v=>setContact({...contact,adresseFacturation:v})} placeholder="—"/>
        </BentoField>

        {/* Ligne 4 : Nom · Prénom */}
        <BentoField label={lang==='fr'?'Nom *':'Last name *'}>
          <BentoInput value={contact.nom} onChange={v=>setContact({...contact,nom:v})} placeholder="—"/>
        </BentoField>
        <BentoField label={lang==='fr'?'Prénom *':'First name *'}>
          <BentoInput value={contact.prenom} onChange={v=>setContact({...contact,prenom:v})} placeholder="—"/>
        </BentoField>

        {/* Ligne 5 : Email · Téléphone */}
        <BentoField label="Email *">
          <BentoInput value={contact.email} type="email" onChange={v=>setContact({...contact,email:v})} placeholder="—"/>
        </BentoField>
        <BentoField label={lang==='fr'?'Téléphone *':'Phone *'}>
          <BentoInput value={contact.tel} type="tel" onChange={v=>setContact({...contact,tel:v})} placeholder="—"/>
        </BentoField>

        {/* ===== PRODUITS (hors cyclorama, et masqué en mode configurateur car déjà saisi) ===== */}
        {!isCyclo && !hideProductFields && (
          <>
            {/* Ligne 6 : Type d'articles (B + C) — bento, chips sur 2 lignes pour tout afficher */}
            <div style={{background:'#fff',padding:'6px 12px',gridColumn:'1 / 3',display:'flex',flexDirection:'column',gap:4,minHeight:42}}>
              <span className="edo-cell-label" style={{color:'#888',fontSize:9,letterSpacing:'0.15em'}}>{lang==='fr'?'Type d’articles *':'Item types *'}</span>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4}}>
                {ARTICLE_TYPES.map(t=>{
                  const on = (contact.typesArticles||[]).includes(t.k);
                  return (
                    <button key={t.k} onClick={()=>toggleType(t.k)} style={{
                      background:on?'#141414':'transparent',
                      color:on?'#fff':'#141414',
                      border:'1px solid '+(on?'#141414':'var(--edo-gray-200)'),
                      padding:'4px 8px',fontFamily:'inherit',fontSize:11,cursor:'pointer',
                      letterSpacing:'-0.005em',display:'inline-flex',alignItems:'center',justifyContent:'flex-start',gap:5,whiteSpace:'nowrap',minWidth:0,
                    }}>
                      <span style={{width:9,height:9,border:'1px solid '+(on?'#fff':'#888'),background:on?'var(--edo-orange)':'transparent',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {on && <span style={{width:3,height:3,background:'#fff'}}/>}
                      </span>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{t[lang]}</span>
                    </button>
                  );
                })}
              </div>
              {(contact.typesArticles||[]).includes('autre') && (
                <input
                  value={contact.autreType||''}
                  onChange={e=>setContact({...contact,autreType:e.target.value})}
                  placeholder={lang==='fr'?'Précisez (autre type d’articles)…':'Specify (other item type)…'}
                  style={{marginTop:2,background:'transparent',border:0,borderBottom:'1px solid var(--edo-gray-200)',outline:'none',padding:'3px 0',fontFamily:'inherit',fontSize:12,letterSpacing:'-0.01em',width:'100%',color:'#141414'}}
                />
              )}
            </div>

            {/* Ligne 7 : Quantité · Vues/article */}
            <BentoField label={lang==='fr'?'Qté articles (SKUs) *':'Qty items (SKUs) *'}>
              <BentoInput value={contact.quantiteArticles} type="number" onChange={v=>setContact({...contact,quantiteArticles:v})} placeholder="—"/>
            </BentoField>
            <BentoField label={lang==='fr'?'Vues / article *':'Views / item *'}>
              <BentoInput value={contact.vuesParArticle} type="number" onChange={v=>setContact({...contact,vuesParArticle:v})} placeholder="—"/>
            </BentoField>
          </>
        )}

        {/* Ligne 8 : Autres infos (B + C) */}
        <div style={{background:'#fff',padding:'6px 12px',gridColumn:'1 / 3',display:'flex',flexDirection:'column',gap:2,minHeight:42}}>
          <span className="edo-cell-label" style={{color:'#888',fontSize:9,letterSpacing:'0.15em'}}>{lang==='fr'?'Autres informations':'Other information'}</span>
          <textarea value={contact.autresInfos||''} onChange={e=>setContact({...contact,autresInfos:e.target.value})}
            placeholder={lang==='fr'?'Contraintes, inspirations, références… (facultatif)':'Constraints, inspirations, references… (optional)'}
            style={{width:'100%',boxSizing:'border-box',background:'transparent',border:0,outline:'none',padding:0,fontFamily:'inherit',fontSize:12,minHeight:28,resize:'vertical',color:'#141414'}}/>
        </div>

        {/* Ligne 9 : CGV (B + C) */}
        <label style={{gridColumn:'1 / 3',background:'#fff',padding:'6px 12px',display:'flex',flexDirection:'column',gap:2,cursor:'pointer',minHeight:42}}>
          <span className="edo-cell-label" style={{color:'#888',fontSize:9,letterSpacing:'0.15em'}}>CGV *</span>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="checkbox" checked={!!contact.cgvAccepted} onChange={e=>setContact({...contact,cgvAccepted:e.target.checked})}
              style={{width:14,height:14,accentColor:'var(--edo-orange)',cursor:'pointer',flexShrink:0}}/>
            <span style={{fontSize:11,lineHeight:1.35,color:'#141414'}}>
              {lang==='fr'
                ? <>J’accepte les <a href="#" onClick={e=>e.preventDefault()} style={{color:'var(--edo-orange)',textDecoration:'underline'}}>conditions générales de vente</a> et les modalités de paiement.</>
                : <>I accept the <a href="#" onClick={e=>e.preventDefault()} style={{color:'var(--edo-orange)',textDecoration:'underline'}}>terms and conditions of sale</a> and payment terms.</>}
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};

/* ================================================================= */
/*  SIDE PANEL                                                        */
/* ================================================================= */
const SidePanel = ({ lang, p, selected, months, slotType, hours, cycloMode, rows, total, isPreview, step, plateaus, perPlateau }) => {
  const slotLbl = isPreview
    ? (lang==='fr'?'estimation live':'live estimate')
    : p.isCyclo
    ? (cycloMode==='halfH'?'5h':(cycloMode==='fullH'?'10h':(lang==='fr'?'10h éditorial':'10h editorial')))
    : p.isVisite ? (lang==='fr'?'visite':'visit')
    : (slotType==='hour'?`${hours}h`:(slotType==='half'?(()=>{const hh=Math.max(4,Math.min(7,hours||4));return hh===4?(lang==='fr'?'½ j':'½ d'):`${hh}h`;})():(()=>{
        const totalH = hours || 8;
        const fullDays = Math.floor(totalH / 8);
        const extraH = totalH - fullDays * 8;
        const dUnit = lang==='fr'?'j':'d';
        let s = `${fullDays} ${dUnit}`;
        if (extraH === 4) s += lang==='fr'?' + ½ j':' + ½ d';
        else if (extraH > 0) s += ` + ${extraH}h`;
        return s;
      })()));
  const title = isPreview
    ? (lang==='fr'?'Estimation':'Estimate')
    : p[lang];

  return (
    <div style={{gridColumn:'3',gridRow:'2',background:'#141414',color:'#fff',padding:'24px 24px 20px',overflow:'auto',display:'flex',flexDirection:'column',gap:14,minHeight:0}}>
      <div>
        <span className="edo-cell-label" style={{color:'rgba(255,255,255,0.55)'}}>{lang==='fr'?'Votre devis':'Your quote'}</span>
        <h2 style={{margin:'8px 0 0',fontSize:22,fontWeight:300,letterSpacing:'-0.02em',color:'rgba(255,255,255,0.85)'}}>{title}</h2>
        <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'rgba(255,255,255,0.55)',marginTop:4,letterSpacing:'0.05em'}}>{slotLbl}</div>
      </div>

      {(() => {
        const list = (plateaus || []).filter(Boolean);
        const isMulti = list.length > 1;
        if (isMulti) {
          const datedList = list
            .map(k => ({k, px: BOOK_PLATEAUX.find(x => x.k === k), d: (perPlateau||{})[k]?.date}))
            .filter(x => x.d);
          if (datedList.length === 0) return null;
          return (
            <div style={{paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.12)'}}>
              <span className="edo-cell-label" style={{color:'rgba(255,255,255,0.55)',marginBottom:6,display:'block'}}>{lang==='fr'?'Dates':'Dates'}</span>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {datedList.map(({k, px, d}) => (
                  <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8,fontSize:13}}>
                    <span style={{color:'rgba(255,255,255,0.55)',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',textTransform:'uppercase'}}>{px ? px[lang] : k}</span>
                    <span style={{letterSpacing:'-0.01em'}}>{d.d} {months[d.m]} {d.y}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (!selected) return null;
        return (
          <div style={{paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.12)'}}>
            <span className="edo-cell-label" style={{color:'rgba(255,255,255,0.55)',marginBottom:6,display:'block'}}>{lang==='fr'?'Date':'Date'}</span>
            <div style={{fontSize:15,letterSpacing:'-0.01em'}}>{selected.d} {months[selected.m]} {selected.y}</div>
          </div>
        );
      })()}

      <div style={{paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.12)',flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
        <span className="edo-cell-label" style={{color:'rgba(255,255,255,0.55)',marginBottom:10,display:'block'}}>{lang==='fr'?'Détail':'Breakdown'}</span>
        <div style={{display:'flex',flexDirection:'column',gap:6,overflow:'auto',paddingRight:4}}>
          {rows.length===0 && <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>—</span>}
          {rows.map((r,i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',gap:2}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8,fontSize:12}}>
                <span style={{letterSpacing:'-0.005em'}}>
                  {(() => {
                    const idx = r.lbl.indexOf(' · ');
                    if (idx === -1) return <span style={{color:'rgba(255,255,255,0.75)'}}>{r.lbl}</span>;
                    return (
                      <>
                        <span style={{color:'rgba(255,255,255,0.4)'}}>{r.lbl.slice(0, idx)}</span>
                        <span style={{color:'rgba(255,255,255,0.75)'}}>{r.lbl.slice(idx)}</span>
                      </>
                    );
                  })()}
                </span>
                <span style={{fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',color:'#fff',whiteSpace:'nowrap'}}>
                  {r.onReq ? (lang==='fr'?'sur demande':'on request') : `${fmtEUR(r.amt)} €`}
                </span>
              </div>
              {r.breakdown && r.breakdown.length > 0 && (
                <div style={{paddingLeft:2,display:'flex',flexDirection:'column',gap:1}}>
                  {r.breakdown.map((b, bi) => {
                    const viewLbl = b.labels ? b.labels[lang] : null;
                    const formula = b.imagesPerSku && b.imagesPerSku > 1
                      ? `${b.qty} × ${b.imagesPerSku} × ${fmtEUR(b.unit)} €`
                      : `${b.qty} × ${fmtEUR(b.unit)} €`;
                    const line = viewLbl ? `${viewLbl} · ${formula}` : formula;
                    return (
                      <div key={bi} style={{display:'flex',justifyContent:'space-between',gap:8,fontFamily:'var(--font-mono)',fontSize:9,color:'rgba(255,255,255,0.4)',letterSpacing:'0.02em'}}>
                        <span>→ {line}</span>
                        <span style={{fontVariantNumeric:'tabular-nums'}}>{fmtEUR(b.subtotal)} €</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.24)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)'}}>Total HT</span>
          <span style={{fontSize:28,fontWeight:300,letterSpacing:'-0.02em',fontVariantNumeric:'tabular-nums'}}>{fmtEUR(total)} €</span>
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'rgba(255,255,255,0.45)',marginTop:4,letterSpacing:'0.08em'}}>
          TVA 20% · {fmtEUR(total*1.2)} € TTC
        </div>
        {rows.some(r=>r.estimate) && (
          <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'rgba(255,255,255,0.45)',marginTop:6,letterSpacing:'0.05em',lineHeight:1.5}}>
            {lang==='fr'
              ? '⚠ Prix post-production estimatif — ajusté après brief selon volume et complexité.'
              : '⚠ Post-production price is an estimate — adjusted after brief based on volume and complexity.'}
          </div>
        )}
      </div>
    </div>
  );
};

/* ================================================================= */
/*  CONFIRMATION                                                      */
/* ================================================================= */
const Confirmation = ({ lang, openMenu, goto, setLang, plateau, selected, arrivalHour, rentalHours, plateaus, perPlateau, total, rows, contact, months, mode }) => {
  const isMultiPlateau = (plateaus || []).filter(Boolean).length > 1;
  const fmtTime = (h) => `${String(h).padStart(2,'0')}:00`;
  const ref = React.useMemo(()=>{
    const prefix = mode==='quote' ? 'EDO-Q-' : mode==='booking' ? 'EDO-R-' : 'EDO-';
    return prefix + Math.random().toString(36).substr(2,6).toUpperCase();
  },[mode]);

  const copy = (() => {
    if (mode==='quote') return {
      tag: lang==='fr'?'Devis envoyé':'Quote sent',
      status: lang==='fr'?'Devis':'Quote',
      title: lang==='fr'?'Votre devis arrive.':'Your quote is on its way.',
      body: lang==='fr'
        ? `Nous vous envoyons votre devis détaillé pour le plateau ${plateau[lang]} par e-mail sous 24h (jours ouvrés). Aucune date n'est bloquée à ce stade — vous restez libre de réserver ensuite.`
        : `We're sending your detailed quote for the ${plateau[lang]} stage by email within 24h (working days). No date is held yet — you stay free to book later.`,
    };
    if (mode==='booking') return {
      tag: lang==='fr'?'Réservation confirmée':'Booking confirmed',
      status: lang==='fr'?'Réservée':'Booked',
      title: lang==='fr'?'C’est réservé.':'You’re booked.',
      body: lang==='fr'
        ? `Nous avons bien enregistré votre réservation pour le plateau ${plateau[lang]}. Un membre de l'équipe vous recontacte sous 24h (jours ouvrés) pour confirmer les modalités de paiement.`
        : `We've locked in your booking for the ${plateau[lang]} stage. A team member will contact you within 24h (working days) to confirm payment terms.`,
    };
    // request (cyclorama)
    return {
      tag: lang==='fr'?'Demande envoyée':'Request sent',
      status: lang==='fr'?'Confirmée':'Confirmed',
      title: (lang==='fr'?'Merci, ':'Thank you, ')+(contact.prenom||contact.nom||''),
      body: lang==='fr'
        ? `Nous avons bien reçu votre demande pour le cyclorama. Un membre de l'équipe vous recontacte sous 24h (jours ouvrés) pour confirmer les détails.`
        : `We've received your cyclorama request. A team member will contact you within 24h (working days) to confirm details.`,
    };
  })();

  return (
    <div style={{display:'grid',gridTemplateColumns:'190px 1fr',gridTemplateRows:'54px 1fr',gap:1,background:'#000',height:'100%',width:'100%',overflow:'hidden'}}>
      {/* Top-left : wordmark */}
      <div style={{gridColumn:'1',gridRow:'1',background:'#fff',display:'flex',alignItems:'center'}}>
        <button onClick={()=>goto('home')} style={{...iconBtn,flex:'1 1 auto',padding:'0 12px'}}><Wordmark size={32}/></button>
      </div>
      {/* Top-right header band */}
      <div style={{gridColumn:'2',gridRow:'1',background:'#000',display:'flex',gap:1,minWidth:0}}>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 24px',display:'flex',alignItems:'center',gap:14,minWidth:0}}>
          <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{lang==='fr'?'Réservation':'Booking'}</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.1em',color:'#888'}}>{copy.tag}</span>
        </div>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 54px',background:'#fff',border:0,cursor:'pointer',color:'#141414',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.15em'}}>{lang==='fr'?'EN':'FR'}</button>
      </div>

      {/* Main content — full-bleed bento (no centered sheet) */}
      <div style={{gridColumn:'1 / 3',gridRow:'2',background:'#000',overflow:'auto',display:'flex',flexDirection:'column',gap:1,minHeight:0}}>

        {/* ROW 1 — hero : status tag + title + body + reference, 2 cols */}
        <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:1,background:'#000'}}>
          <div style={{background:'#fff',padding:'28px 48px 24px',display:'flex',flexDirection:'column',gap:10,minHeight:180}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'5px 11px',background:'var(--edo-orange)',color:'#fff',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',alignSelf:'flex-start'}}>
              ● {copy.status}
            </div>
            <h1 style={{margin:0,fontSize:42,fontWeight:300,letterSpacing:'-0.04em',lineHeight:0.95,textWrap:'balance'}}>{copy.title}</h1>
            <p style={{margin:0,fontSize:13,color:'#595959',lineHeight:1.45,maxWidth:560,textWrap:'pretty'}}>{copy.body}</p>
          </div>
          <div style={{background:'#fff',padding:'24px 28px',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:14,minHeight:180}}>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <div className="edo-cell-label" style={{color:'#888',marginBottom:3}}>{lang==='fr'?'Référence':'Reference'}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:15,letterSpacing:'0.08em',color:'#141414'}}>{ref}</div>
              </div>
              <div>
                <div className="edo-cell-label" style={{color:'#888',marginBottom:3}}>{lang==='fr'?'Émis le':'Issued'}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:12,color:'#141414'}}>
                  {new Date().toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            </div>
            <div>
              <div className="edo-cell-label" style={{color:'#888',marginBottom:3}}>{lang==='fr'?'Contact':'Contact'}</div>
              <div style={{fontSize:13,fontWeight:500,letterSpacing:'-0.01em'}}>{[contact.prenom,contact.nom].filter(Boolean).join(' ')||'—'}</div>
              <div style={{fontSize:11,color:'#595959'}}>{contact.email||'—'}</div>
            </div>
          </div>
        </div>

        {/* ROW 2 — meta line : Plateau · Date · Société · SIREN, 4 cols */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:1,background:'#000'}}>
          <div style={{background:'#fff',padding:'12px 20px'}}>
            <div className="edo-cell-label" style={{color:'#888',marginBottom:4}}>{lang==='fr'?'Plateau':'Stage'}</div>
            <div style={{fontSize:15,fontWeight:500,letterSpacing:'-0.015em'}}>
              {isMultiPlateau
                ? plateaus.map(k => { const px = BOOK_PLATEAUX.find(x=>x.k===k); return px?px[lang]:k; }).join(' · ')
                : plateau[lang]}
            </div>
          </div>
          <div style={{background:'#fff',padding:'12px 20px'}}>
            <div className="edo-cell-label" style={{color:'#888',marginBottom:4}}>
              {isMultiPlateau ? (lang==='fr'?'Dates':'Dates') : (lang==='fr'?'Date':'Date')}
            </div>
            {isMultiPlateau ? (
              <div style={{display:'flex',flexDirection:'column',gap:3}}>
                {plateaus.map(k => {
                  const px = BOOK_PLATEAUX.find(x => x.k === k);
                  const st = (perPlateau || {})[k] || {};
                  const d = st.date;
                  const ah = st.arrivalHour != null ? st.arrivalHour : 10;
                  const stHours = st.hours != null ? st.hours : (st.slotType==='hour' ? 1 : st.slotType==='half' ? 4 : 8);
                  const stRH = px && px.isCyclo ? ((st.cycloMode||'halfH')==='halfH' ? 5 : 10) : px && px.isVisite ? 1 : stHours;
                  return (
                    <div key={k} style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:12,fontFamily:'var(--font-mono)',letterSpacing:'0.01em'}}>
                      <span style={{color:'#888'}}>{px?px[lang]:k}</span>
                      <span style={{color:d?'#141414':'#888',fontVariantNumeric:'tabular-nums'}}>
                        {d ? `${d.d} ${months[d.m]} · ${fmtTime(ah)}–${fmtTime(ah+stRH)}` : (mode==='quote'?(lang==='fr'?'Non fixée':'Not set'):'—')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{fontSize:15,fontWeight:500,letterSpacing:'-0.015em',color:selected?'#141414':'#888'}}>
                {selected
                  ? `${selected.d} ${months[selected.m]} ${selected.y} · ${fmtTime(arrivalHour||10)}–${fmtTime((arrivalHour||10)+(rentalHours||0))}`
                  : (mode==='quote'?(lang==='fr'?'Non fixée':'Not set'):'—')}
              </div>
            )}
          </div>
          <div style={{background:'#fff',padding:'12px 20px'}}>
            <div className="edo-cell-label" style={{color:'#888',marginBottom:4}}>{lang==='fr'?'Société':'Company'}</div>
            <div style={{fontSize:13,fontWeight:500,letterSpacing:'-0.01em'}}>{contact.societe||'—'}</div>
          </div>
          <div style={{background:'#fff',padding:'12px 20px'}}>
            <div className="edo-cell-label" style={{color:'#888',marginBottom:4}}>SIREN</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.02em'}}>{contact.siren||'—'}</div>
          </div>
        </div>

        {/* ROW 3 — detailed quote breakdown, full width */}
        <div style={{background:'#fff',padding:'18px 48px 20px'}}>
          <div className="edo-cell-label" style={{color:'#888',marginBottom:10}}>{lang==='fr'?'Détail du devis*':'Quote breakdown*'}</div>
          <div style={{display:'flex',flexDirection:'column'}}>
            {rows.map((r,i)=>(
              <div key={i} style={{display:'flex',flexDirection:'column',padding:'6px 0',borderBottom:i===rows.length-1?'0':'1px solid var(--edo-gray-200)',gap:2}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',fontSize:12}}>
                  <span style={{letterSpacing:'-0.01em'}}>
                    {(() => {
                      const idx = r.lbl.indexOf(' · ');
                      if (idx === -1) return <span style={{color:'#141414'}}>{r.lbl}</span>;
                      return (
                        <>
                          <span style={{color:'#888'}}>{r.lbl.slice(0, idx)}</span>
                          <span style={{color:'#141414'}}>{r.lbl.slice(idx)}</span>
                        </>
                      );
                    })()}
                  </span>
                  <span style={{fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',color:'#141414'}}>
                    {r.onReq ? (lang==='fr'?'sur demande':'on request') : `${fmtEUR(r.amt)} €`}
                  </span>
                </div>
                {r.breakdown && r.breakdown.length > 0 && (
                  <div style={{display:'flex',flexDirection:'column',gap:1,marginTop:2}}>
                    {r.breakdown.map((b, bi) => {
                      const viewLbl = b.labels ? b.labels[lang] : null;
                      const formula = b.imagesPerSku && b.imagesPerSku > 1
                        ? `${b.qty} × ${b.imagesPerSku} × ${fmtEUR(b.unit)} €`
                        : `${b.qty} × ${fmtEUR(b.unit)} €`;
                      const line = viewLbl ? `${viewLbl} · ${formula}` : formula;
                      return (
                        <div key={bi} style={{display:'flex',justifyContent:'space-between',gap:8,fontFamily:'var(--font-mono)',fontSize:10,color:'#888',letterSpacing:'0.02em'}}>
                          <span>→ {line}</span>
                          <span style={{fontVariantNumeric:'tabular-nums'}}>{fmtEUR(b.subtotal)} €</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginTop:12,paddingTop:10,borderTop:'2px solid #141414'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase'}}>Total HT*</span>
              <span style={{fontSize:34,fontWeight:300,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>{fmtEUR(total)} €</span>
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:10,letterSpacing:'0.03em',lineHeight:1.55,paddingTop:8,borderTop:'1px solid var(--edo-gray-200)'}}>
              {lang==='fr'
                ? '* Les montants affichés sont une estimation indicative basée sur les éléments renseignés et ne constituent pas un devis définitif. Le devis final, contractuel et signable, vous sera adressé par e-mail après brief avec notre équipe et pourra être ajusté selon le volume réel, la complexité, les vues additionnelles ou la post-production.'
                : '* The amounts shown are an indicative estimate based on the information provided and do not constitute a final quote. The final, contractual and signable quote will be sent by email after a brief with our team and may be adjusted based on actual volume, complexity, additional views or post-production.'}
            </div>
          </div>
        </div>

        {/* ROW 4 — next steps / nav */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#000'}}>
          <div style={{background:'#fff',padding:'12px 20px',display:'flex',alignItems:'center'}}>
            <button onClick={()=>goto('home')} {...navBtnHover} style={{...navBtn,border:0,padding:0,background:'transparent'}}>← {lang==='fr'?'Retour à l’accueil':'Back home'}</button>
          </div>
          <div style={{background:'#fff',padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'flex-end'}}>
            <button onClick={()=>window.location.reload()} {...navBtnPrimaryHover} style={{...navBtnPrimary,background:'var(--edo-orange)'}}>
              {lang==='fr'?'Nouvelle demande':'New request'} <IconArrowRight width="14" height="14" stroke="#fff"/>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ================================================================= */
/*  HELPERS                                                           */
/* ================================================================= */
const StepHeader = ({ n, lang, t, s }) => (
  <div>
    <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{n} · {lang==='fr'?'Étape':'Step'}</span>
    <h1 style={{margin:'6px 0 6px',fontSize:32,fontWeight:300,letterSpacing:'-0.035em',lineHeight:1.05}}>{t}</h1>
    <p style={{margin:0,fontSize:14,color:'#595959',lineHeight:1.45,maxWidth:560}}>{s}</p>
  </div>
);

const SlotCard = ({ on, onClick, label, sub, price, hint, lang }) => (
  <button onClick={onClick} style={{
    background:on?'#141414':'#fff',color:on?'#fff':'#141414',
    border:on?'1px solid #141414':0,
    padding:'22px 20px',cursor:'pointer',textAlign:'left',fontFamily:'inherit',
    display:'flex',flexDirection:'column',gap:6,minHeight:140,transition:'all .15s',
  }}>
    <div style={{fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',fontFamily:'var(--font-mono)',color:on?'rgba(255,255,255,0.55)':'#888'}}>{sub}</div>
    <div style={{fontSize:22,fontWeight:300,letterSpacing:'-0.02em'}}>{label}</div>
    <div style={{marginTop:'auto',display:'flex',justifyContent:'space-between',alignItems:'baseline',borderTop:'1px solid '+(on?'rgba(255,255,255,0.15)':'var(--edo-gray-200)'),paddingTop:10}}>
      <span style={{fontSize:18,fontWeight:500}}>{price}</span>
      {hint && <span style={{fontFamily:'var(--font-mono)',fontSize:9,color:on?'rgba(255,255,255,0.55)':'#888',textAlign:'right',maxWidth:120,lineHeight:1.3}}>{hint}</span>}
    </div>
  </button>
);

const Toggle = ({ on, onClick }) => (
  <button onClick={onClick} style={{
    width:46,height:26,background:on?'var(--edo-orange)':'var(--edo-gray-200)',
    border:0,borderRadius:13,position:'relative',cursor:'pointer',transition:'background .15s',
  }}>
    <span style={{position:'absolute',top:3,left:on?23:3,width:20,height:20,background:'#fff',borderRadius:10,transition:'left .15s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
  </button>
);

const LegendChip = ({ bg, br, lbl }) => (
  <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
    <span style={{width:10,height:10,background:bg,border:`1px solid ${br}`}}/> {lbl}
  </span>
);

const FormInput = ({ value, onChange, placeholder, type='text', required }) => (
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} required={required}
    style={{background:'#fff',border:0,outline:'none',padding:'16px 20px',fontFamily:'inherit',fontSize:14,letterSpacing:'-0.01em',width:'100%',boxSizing:'border-box'}}/>
);

/* ---------- Button + stepper styles ---------- */
const iconBtn = {
  width:54,height:'100%',border:0,background:'transparent',cursor:'pointer',
  display:'flex',alignItems:'center',justifyContent:'center',
};

const topBtn = {
  background:'transparent',border:0,cursor:'pointer',
  fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#595959',
};

const navBtn = {
  background:'#fff',border:'1px solid var(--edo-gray-200)',cursor:'pointer',
  fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'#141414',
  padding:'0 20px',height:42,display:'inline-flex',alignItems:'center',gap:8,
  transition:'transform .15s ease, border-color .15s ease',
};

const navBtnPrimary = {
  background:'#141414',border:0,cursor:'pointer',color:'#fff',
  fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',
  padding:'0 22px',height:42,display:'inline-flex',alignItems:'center',gap:8,
  transition:'transform .15s ease, background .15s ease',
};

// Hover handlers — applied to back/continue buttons (light scale 1.02).
const navBtnHover = {
  onMouseEnter: e => { if (e.currentTarget.disabled) return; e.currentTarget.style.transform='scale(1.02)'; e.currentTarget.style.borderColor='#141414'; },
  onMouseLeave: e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.borderColor='var(--edo-gray-200)'; },
};
const navBtnPrimaryHover = {
  onMouseEnter: e => { if (e.currentTarget.disabled) return; e.currentTarget.style.transform='scale(1.02)'; },
  onMouseLeave: e => { e.currentTarget.style.transform='scale(1)'; },
};

const calNavBtn = {
  background:'#fff',border:0,padding:'0 16px',height:36,cursor:'pointer',
  fontFamily:'var(--font-mono)',fontSize:12,color:'#141414',
};

const stepperBtn = {
  width:30,height:30,flex:'0 0 30px',border:'1px solid var(--edo-gray-200)',background:'#fff',
  cursor:'pointer',fontSize:15,color:'#141414',fontFamily:'inherit',
  display:'inline-flex',alignItems:'center',justifyContent:'center',
  transition:'transform .15s ease, border-color .15s ease',
};

const StepperBtn = ({ onClick, children }) => (
  <button onClick={onClick}
    onMouseEnter={e=>{ e.currentTarget.style.transform='scale(1.02)'; e.currentTarget.style.borderColor='#141414'; }}
    onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.borderColor='var(--edo-gray-200)'; }}
    style={stepperBtn}>{children}</button>
);

Object.assign(window, { BookPageV2 });
