import { IconArrowRight, CellLabel, PageHeader } from './ui';
import { usePageContext } from './router';
import { PLATEAUX } from './data/plateaux';
import type { PlateauSpec } from './data/plateaux';

type PlateauKey = 'cyclorama' | 'horizontal' | 'vertical' | 'eclipse' | 'live';

const _PLATEAUX_LOCAL: Record<string, Omit<PlateauSpec, 'slug'>> = {
  cyclorama: {
    num: '01', name: 'Cyclorama',
    tagline: {fr:'Production libre', en:'Free production'},
    desc: {
      fr: "Cyclo 2 faces de 30 m² pour photo et vidéo sur fond blanc infini. À la journée ou à la semaine, en production libre ou avec notre équipe.",
      en: "30 m² 2-sided cyclorama for photo and video on an infinite white background. Daily or weekly, as a free-production rental or crewed."
    },
    specs: [
      { k:{fr:'Surface',en:'Surface'}, v:{fr:'240 m² · Cyclo 2 faces 32 m²',en:'240 m² · 2-sided cyclo 32 m²'} },
      { k:{fr:'Dimensions',en:'Dimensions'}, v:{fr:'6,3m L x 5,2m l x 5m H',en:'6.3m L × 5.2m W × 5m H'} },
      { k:{fr:'Éclairage naturel',en:'Natural light'}, v:{fr:'Skydomes occultable',en:'Blackout skydomes'} },
      { k:{fr:'Accès',en:'Access'}, v:{fr:'Quai de livraison 3,5m L × 4,5m H',en:'Loading dock 3.5m L × 4.5m H'} },
      { k:{fr:'Extérieur',en:'Exterior'}, v:{fr:'Accès direct, parking sur place',en:'Direct access, on-site parking'} },
      { k:{fr:'Électricité',en:'Electricity'}, v:{fr:'1 prise Marechal 63A triphasée\n15 prises 16A',en:'1 Marechal 63A 3-phase\n15 × 16A outlets'} },
      { k:{fr:'Connectivité & son',en:'Connectivity & sound'}, v:{fr:'Wi-Fi très haut débit\nSound system intégré',en:'High-speed Wi-Fi\nIntegrated sound system'} },
      { k:{fr:'Maquillage',en:'Make-up'}, v:{fr:'2 postes maquillage équipés',en:'2 equipped make-up stations'} },
      { k:{fr:'Habillage',en:'Dressing'}, v:{fr:"2 cabines d'essayage",en:'2 fitting rooms'} },
      { k:{fr:'Cuisine',en:'Kitchen'}, v:{fr:'Entièrement équipée',en:'Fully equipped'} },
    ],
    uses: [
      {fr:'Campagne & éditorial', en:'Campaign & editorial'},
      {fr:'Film publicitaire', en:'Advertising film'},
      {fr:'Packshot & still life', en:'Packshot & still life'},
    ],
    rates: [
      {k:{fr:'5h', en:'5 hours'}, v:'€ 650'},
      {k:{fr:'10h', en:'10 hours'}, v:'€ 880'},
      {k:{fr:'10h éditorial', en:'10 hours editorial'}, v:{fr:'Sur demande',en:'On request'}},
    ],
    ratesNote: { fr:'Remise en blanc 110 € · Électricité 1,40 €/kWh', en:'Repaint 110 € · Electricity 1.40 €/kWh' },
    visual: 'cyc',
  },
  horizontal: {
    num: '02', name: 'Horizontal',
    tagline: {fr:'Packshots à plat', en:'Flat packshots'},
    desc: {
      fr: "L'Horizontal est conçue pour les packshots à plat : flat lays précis et cohérents, adaptés aux vêtements, accessoires ou compositions produits.",
      en: "The Horizontal is built for flat packshots — precise, consistent flat lays for apparel, accessories and product compositions."
    },
    specs: [
      { k:{fr:'Caméra',en:'Camera'}, v:{fr:'Canon EOS R · 24–105 mm motorisé',en:'Canon EOS R · 24–105 mm motorized'} },
      { k:{fr:'Pilotage',en:'Control'}, v:{fr:'iPad · application intuitive',en:'iPad · intuitive app'} },
      { k:{fr:'Éclairage',en:'Lighting'}, v:{fr:'LED High-CRI continue',en:'High-CRI LED continuous'} },
      { k:{fr:'Détourage automatique',en:'Auto clipping'}, v:{fr:'AutoAlpha™',en:'AutoAlpha™'} },
      { k:{fr:'Formats',en:'Formats'}, v:{fr:'JPG · PNG · TIFF · RAW',en:'JPG · PNG · TIFF · RAW'} },
    ],
    uses: [
      {fr:'Prêt-à-porter à plat', en:'Flat-laid ready-to-wear'},
      {fr:'Compositions produits', en:'Product compositions'},
      {fr:'Détourage automatique', en:'Automatic clipping'},
    ],
    rates: [
      {k:{fr:'1 heure', en:'1 hour'}, v:'€ 120'},
      {k:{fr:'Demi-journée', en:'Half day'}, v:'€ 410'},
      {k:{fr:'Journée', en:'Full day'}, v:'€ 740'},
    ],
    visual: 'horizontal',
  },
  vertical: {
    num: '03', name: 'Vertical',
    tagline: {fr:'Mannequin ghost', en:'Ghost mannequin'},
    desc: {
      fr: "La Vertical est pensée pour les packshots textiles, particulièrement efficace pour le ghost, le piqué et les prises de vue e-commerce standardisées.",
      en: "The Vertical is built for textile packshots — particularly effective for ghost, hanging and standardized e-commerce shots."
    },
    specs: [
      { k:{fr:'Caméra',en:'Camera'}, v:{fr:'Canon EOS R · 70–200 mm motorisé',en:'Canon EOS R · 70–200 mm motorized'} },
      { k:{fr:'Pilotage',en:'Control'}, v:{fr:'iPad · application intuitive',en:'iPad · intuitive app'} },
      { k:{fr:'Éclairage',en:'Lighting'}, v:{fr:'LED High-CRI continue',en:'High-CRI LED continuous'} },
      { k:{fr:'Détourage automatique',en:'Auto clipping'}, v:{fr:'AutoAlpha™',en:'AutoAlpha™'} },
      { k:{fr:'Formats',en:'Formats'}, v:{fr:'JPG · PNG · TIFF · RAW',en:'JPG · PNG · TIFF · RAW'} },
    ],
    uses: [
      {fr:'Ghost', en:'Ghost'},
      {fr:'Piqué', en:'Piqué'},
      {fr:'Détourage automatique', en:'Automatic clipping'},
    ],
    rates: [
      {k:{fr:'1 heure', en:'1 hour'}, v:'€ 120'},
      {k:{fr:'Demi-journée', en:'Half day'}, v:'€ 410'},
      {k:{fr:'Journée', en:'Full day'}, v:'€ 740'},
    ],
    visual: 'vertical',
  },
  eclipse: {
    num: '04', name: 'Eclipse',
    tagline: {fr:'Photo & vidéo 360°', en:'Photo & video 360°'},
    desc: {
      fr: "L'Eclipse est conçue pour les produits petits et moyens : chaussures, sacs, accessoires, objets design ou beauté, avec plateau tournant intégré pour le 360°.",
      en: "The Eclipse is built for small and medium products — shoes, bags, accessories, design and beauty — with an integrated turntable for 360° shots."
    },
    specs: [
      { k:{fr:'Caméra',en:'Camera'}, v:{fr:'Canon EOS R · 24–105 mm motorisé',en:'Canon EOS R · 24–105 mm motorized'} },
      { k:{fr:'Pilotage',en:'Control'}, v:{fr:'iPad · application intuitive',en:'iPad · intuitive app'} },
      { k:{fr:'Motorisation',en:'Motion'}, v:{fr:'4 axes · hauteur · inclinaison · zoom · rotation 360°',en:'4 axes · height · tilt · zoom · 360° rotation'} },
      { k:{fr:'Éclairage',en:'Lighting'}, v:{fr:'LED High-CRI continue',en:'High-CRI LED continuous'} },
      { k:{fr:'Formats',en:'Formats'}, v:{fr:'JPG · PNG · TIFF · RAW · MP4 · MOV',en:'JPG · PNG · TIFF · RAW · MP4 · MOV'} },
    ],
    uses: [
      {fr:'Photo & vidéo e-commerce', en:'E-commerce photo & video'},
      {fr:'Still life', en:'Still life'},
      {fr:'Accessoires, chaussures & beauté', en:'Accessories, footwear & beauty'},
    ],
    rates: [
      {k:{fr:'1 heure', en:'1 hour'}, v:'€ 160'},
      {k:{fr:'Demi-journée', en:'Half day'}, v:'€ 560'},
      {k:{fr:'Journée', en:'Full day'}, v:'€ 990'},
    ],
    visual: 'eclipse',
  },
  live: {
    num: '05', name: 'Live',
    tagline: {fr:'Shooting porté', en:'On-model shooting'},
    desc: {
      fr: "La Live est notre solution dédiée au shooting sur modèle. Elle produit un contenu e-commerce cohérent, rapide et reproductible d'une session à l'autre.",
      en: "The Live is our dedicated on-model shooting solution — consistent e-commerce content, fast to produce and easy to reproduce across sessions."
    },
    specs: [
      { k:{fr:'Caméra',en:'Camera'}, v:{fr:'Canon EOS R · 24–105 mm motorisé',en:'Canon EOS R · 24–105 mm motorized'} },
      { k:{fr:'Pilotage',en:'Control'}, v:{fr:'iPad · application intuitive',en:'iPad · intuitive app'} },
      { k:{fr:'Motorisation',en:'Motion'}, v:{fr:'3 axes · hauteur · inclinaison · zoom',en:'3 axes · height · tilt · zoom'} },
      { k:{fr:'Éclairage',en:'Lighting'}, v:{fr:'LED High-CRI continue',en:'High-CRI LED continuous'} },
      { k:{fr:'Formats',en:'Formats'}, v:{fr:'JPG · PNG · TIFF · RAW · MP4 · MOV',en:'JPG · PNG · TIFF · RAW · MP4 · MOV'} },
    ],
    uses: [
      {fr:'Shooting porté', en:'On-model shooting'},
      {fr:'Photo & vidéo e-commerce', en:'E-commerce photo & video'},
      {fr:'Lookbooks & linesheets', en:'Lookbooks & linesheets'},
    ],
    rates: [
      {k:{fr:'1 heure', en:'1 hour'}, v:'€ 185'},
      {k:{fr:'Demi-journée', en:'Half day'}, v:'€ 620'},
      {k:{fr:'Journée', en:'Full day'}, v:'€ 1 120'},
    ],
    visual: 'live',
  },
};

const PlateauVisual = ({ kind }: { kind: string }) => {
  const svgClass = "h-4/5 w-4/5";
  if (kind === 'cyc') return (
    <svg viewBox="0 0 500 400" className={svgClass}>
      <defs><linearGradient id="cycloG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff"/><stop offset="1" stopColor="#e2d6c0"/></linearGradient></defs>
      <path d="M60 360 Q60 80 250 80 Q440 80 440 360 Z" fill="url(#cycloG)" stroke="#000" strokeWidth="0.75"/>
      <ellipse cx="250" cy="360" rx="160" ry="14" fill="rgba(0,0,0,0.08)"/>
      <line x1="250" y1="60" x2="250" y2="380" stroke="#000" strokeWidth="0.4" strokeDasharray="2 3"/>
      <text x="250" y="50" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">4,7 M</text>
      <text x="40" y="370" textAnchor="end" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">6 M</text>
    </svg>
  );
  if (kind === 'horizontal') return (
    <svg viewBox="0 0 500 400" className={svgClass}>
      <rect x="80" y="60" width="340" height="280" fill="#f5f5f5" stroke="#000" strokeWidth="0.75"/>
      {[...Array(7)].map((_,i)=><line key={'h'+i} x1="80" y1={60+i*45} x2="420" y2={60+i*45} stroke="#888" strokeWidth="0.3" strokeDasharray="2 3"/>)}
      {[...Array(8)].map((_,i)=><line key={'v'+i} x1={80+i*48.5} y1="60" x2={80+i*48.5} y2="340" stroke="#888" strokeWidth="0.3" strokeDasharray="2 3"/>)}
      <path d="M180 160 L220 140 L240 150 L260 140 L300 160 L290 220 L260 220 L260 260 L220 260 L220 220 L190 220 Z" fill="#141414" opacity="0.85"/>
      <text x="250" y="50" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">TOP · SHOT</text>
      <text x="40" y="380" textAnchor="end" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">4 × 4 M</text>
    </svg>
  );
  if (kind === 'vertical') return (
    <svg viewBox="0 0 500 400" className={svgClass}>
      <rect x="160" y="40" width="180" height="330" fill="#fafafa" stroke="#000" strokeWidth="0.75"/>
      <g fill="none" stroke="#141414" strokeWidth="1">
        <circle cx="250" cy="95" r="22"/>
        <path d="M225 125 L215 200 L225 280 L245 280 L245 320 L235 370"/>
        <path d="M275 125 L285 200 L275 280 L255 280 L255 320 L265 370"/>
        <path d="M225 135 L200 180 M275 135 L300 180"/>
      </g>
      <line x1="160" y1="40" x2="160" y2="370" stroke="#000" strokeWidth="0.4" strokeDasharray="2 3"/>
      <text x="250" y="28" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">4,2 M</text>
      <text x="250" y="390" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">GHOST</text>
    </svg>
  );
  if (kind === 'eclipse') return (
    <svg viewBox="0 0 500 400" className={svgClass}>
      <circle cx="250" cy="200" r="150" fill="none" stroke="#000" strokeWidth="0.75" strokeDasharray="2 4"/>
      <circle cx="250" cy="200" r="100" fill="none" stroke="#000" strokeWidth="0.5"/>
      <circle cx="250" cy="200" r="55" fill="#141414"/>
      {[0,60,120,180,240,300].map(a=>{ const rad=a*Math.PI/180; return <circle key={a} cx={250+Math.cos(rad)*150} cy={200+Math.sin(rad)*150} r="5" fill="#141414"/>; })}
      <text x="250" y="30" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">360°</text>
      <text x="250" y="390" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">ECLIPSE</text>
    </svg>
  );
  if (kind === 'live') return (
    <svg viewBox="0 0 500 400" className={svgClass}>
      <rect x="60" y="60" width="380" height="230" fill="#141414"/>
      {[...Array(12)].map((_,i)=><line key={i} x1="60" y1={60+i*20} x2="440" y2={60+i*20} stroke="#fff" strokeOpacity="0.1" strokeWidth="0.4"/>)}
      <circle cx="80" cy="80" r="5" fill="#e5583a"/>
      <text x="92" y="84" fill="#fff" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">REC · LIVE</text>
      <g fill="#fff"><circle cx="250" cy="130" r="18"/><path d="M230 150 L270 150 L275 230 L250 235 L225 230 Z"/></g>
      <rect x="100" y="310" width="40" height="24" fill="#141414"/><rect x="230" y="310" width="40" height="24" fill="#141414"/><rect x="360" y="310" width="40" height="24" fill="#141414"/>
      <text x="250" y="380" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">3 CAM · NDI</text>
    </svg>
  );
  return null;
};

const PlateauPage = ({ slug }: { slug: string }) => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const p = PLATEAUX[slug] || PLATEAUX.cyclorama;
  const order = ['live','eclipse','horizontal','vertical','cyclorama'];

  return (
    /* Mobile: single-column stacked, scrollable. Desktop (md+): 4-column bento */
    <div className="grid w-full gap-px bg-black overflow-y-auto md:h-full md:grid-cols-plateau md:grid-rows-plateau md:overflow-hidden">

      <PageHeader
        lang={lang}
        title={lang==='fr'?'Plateaux':'Stages'}
        className="col-span-full h-14 md:col-start-1 md:col-span-4 md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={[
          { id: 'postprod', label: 'Post-prod', onClick: () => goto('postprod'), className: 'hidden md:flex' },
          { id: 'gallery', label: lang==='fr'?'Galerie':'Gallery', onClick: () => goto('gallery'), className: 'hidden md:flex' },
          { id: 'contact', label: lang==='fr'?'Nous contacter':'Contact us', onClick: () => goto('contact') },
        ]}
      />

      {/* Sidebar: horizontal scroll on mobile, vertical list on desktop */}
      <div className="bg-white flex flex-row overflow-x-auto md:col-start-1 md:row-start-2 md:row-span-4 md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {order.map((m, i) => {
          const cfg = PLATEAUX[m];
          const active = m === slug;
          return (
            <button key={m} onClick={()=>goto(m==='cyclorama'?'cyclorama':'plateau-'+m)}
              className={`edo-focus-ring flex-none py-3.5 px-4 border-0 cursor-pointer text-left flex flex-col gap-1 transition-colors duration-150
                md:border-b md:border-border
                ${active ? 'bg-muted border-b-2 border-b-primary md:border-b-border md:border-l-2 md:border-l-primary' : 'bg-white border-b-2 border-b-transparent md:border-b-border md:border-l-2 md:border-l-transparent hover:bg-muted'}`}>
              <span className={`font-mono text-label tracking-label ${active?'text-primary':'text-muted-foreground'}`}>{String(i+1).padStart(2,'0')}</span>
              <span className={`text-cell tracking-copy-tight whitespace-nowrap ${active?'font-medium text-foreground':'font-normal text-muted-foreground'}`}>{cfg.name}</span>
              <span className="font-mono text-micro tracking-ui uppercase text-muted-foreground hidden md:block">{cfg.tagline[lang]}</span>
            </button>
          );
        })}
      </div>

      {/* Visual diagram */}
      <div className="relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-edo-cream to-edo-sand min-h-56 md:col-start-2 md:col-span-2 md:row-start-2 md:row-span-3 md:min-h-0">
        <PlateauVisual kind={p.visual}/>
      </div>

      {/* Name + tagline */}
      <div className="bg-white py-3.5 px-4 flex flex-col justify-between gap-1 md:col-start-4 md:row-start-2">
        <CellLabel>{p.tagline[lang]}</CellLabel>
        <h1 className="text-tile-large font-light m-0 tracking-display leading-none">{p.name}</h1>
      </div>

      {/* Specifications */}
      <div className="bg-white p-3 px-4 flex flex-col gap-1.5 md:col-start-4 md:row-start-3">
        <CellLabel>{lang==='fr'?'Caractéristiques':'Specifications'}</CellLabel>
        <div className="flex flex-col flex-1 min-h-0">
          {p.specs.map((s, i) => (
            <div key={s.k.fr} className={`flex justify-between items-baseline gap-3 text-caption py-1 ${i < p.specs.length - 1 ? 'border-b border-border' : ''}`}>
              <span className="text-muted-foreground shrink-0">{s.k[lang]}</span>
              <span className="text-foreground font-mono tracking-caption text-label text-right whitespace-pre-line overflow-hidden line-clamp-2 leading-snug">{(s.v[lang]||'').split(' · ').join(' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rates */}
      <div className="bg-white px-4 pt-2.5 pb-3 flex flex-col gap-1 md:col-start-4 md:row-start-4">
        <CellLabel>{lang==='fr'?'Tarifs HT':'Rates excl. VAT'}</CellLabel>
        <div className="flex flex-col flex-1 min-h-0">
          {p.rates.map((r, i) => (
            <div key={r.k.fr} className={`flex justify-between items-baseline text-caption py-1 ${i < p.rates.length - 1 ? 'border-b border-border' : ''}`}>
              <span className="text-muted-foreground">{r.k[lang]}</span>
              <span className="text-foreground font-mono tracking-caption text-caption">{typeof r.v === 'string' ? r.v : r.v[lang]}</span>
            </div>
          ))}
        </div>
        {p.ratesNote && (
          <div className="font-mono text-micro tracking-caption text-muted-foreground leading-normal mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {p.ratesNote[lang]}
          </div>
        )}
      </div>

      {/* Description + Uses */}
      <div className="bg-white p-4 flex justify-between items-start gap-6 md:col-start-2 md:col-span-2 md:row-start-5">
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <CellLabel>{lang==='fr'?'Description':'Description'}</CellLabel>
          <p className="m-0 text-caption text-foreground leading-normal max-w-2xl">{p.desc[lang]}</p>
        </div>
        <div className="flex-none w-40 flex flex-col gap-1.5">
          <CellLabel>{lang==='fr'?'Usages':'Uses'}</CellLabel>
          <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
            {p.uses.map(a => <li key={a.fr} className="text-caption text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">· {a[lang]}</li>)}
          </ul>
        </div>
      </div>

      {/* Book CTA */}
      <button onClick={()=>{ try{localStorage.setItem('edo-book-plateau', slug);}catch(e){} goto('book'); }}
        className="edo-focus-ring bg-primary p-4 border-0 cursor-pointer flex flex-col justify-between text-left text-white font-inherit min-h-20 transition-colors hover:bg-foreground hover:text-white md:col-start-4 md:row-start-5">
        <CellLabel className="text-white/80">06 · {lang==='fr'?'Réserver':'Book now'}</CellLabel>
        <div className="flex justify-between items-end text-white w-full">
          <span className="text-tile-large font-medium tracking-headline">{lang==='fr'?'Réserver ce plateau':'Book this stage'}</span>
          <IconArrowRight width="20" height="20"/>
        </div>
      </button>
    </div>
  );
};

export { PlateauPage, PLATEAUX };
