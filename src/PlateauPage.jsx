/* global React, IconArrowRight, IconMenu, IconPlay, Wordmark, CellLabel, Button, MarqueeCell, useBreakpoint */

/* =================================================================
   PLATEAU page — template for all 5 machines.
   Data-driven: one config object per plateau.
   ================================================================= */

const PLATEAUX = {
  cyclorama: {
    num: '01',
    name: 'Cyclorama',
    tagline: {fr:'Production libre', en:'Free production'},
    desc: {
      fr:"Cyclo 2 faces de 30 m² pour photo et vidéo sur fond blanc infini. À la journée ou à la semaine, en production libre ou avec notre équipe.",
      en:"30 m² 2-sided cyclorama for photo and video on an infinite white background. Daily or weekly, as a free-production rental or crewed."
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
      {fr:'Film publicitaire',    en:'Advertising film'},
      {fr:'Packshot & still life',en:'Packshot & still life'},
    ],
    rates: [
      {k:{fr:'5h',             en:'5 hours'},           v:'€ 650'},
      {k:{fr:'10h',            en:'10 hours'},          v:'€ 880'},
      {k:{fr:'10h éditorial',  en:'10 hours editorial'},v:{fr:'Sur demande',en:'On request'}},
    ],
    ratesNote: {
      fr:'Remise en blanc 110 € · Électricité 1,40 €/kWh',
      en:'Repaint 110 € · Electricity 1.40 €/kWh',
    },
    visual: 'cyc',
  },
  horizontal: {
    num: '02',
    name: 'Horizontal',
    tagline: {fr:'Packshots à plat', en:'Flat packshots'},
    desc: {
      fr:"L'Horizontal est conçue pour les packshots à plat : flat lays précis et cohérents, adaptés aux vêtements, accessoires ou compositions produits.",
      en:"The Horizontal is built for flat packshots — precise, consistent flat lays for apparel, accessories and product compositions."
    },
    specs: [
      { k:{fr:'Caméra',en:'Camera'},                      v:{fr:'Canon EOS R · 24–105 mm motorisé',en:'Canon EOS R · 24–105 mm motorized'} },
      { k:{fr:'Pilotage',en:'Control'},                   v:{fr:'iPad · application intuitive',en:'iPad · intuitive app'} },
      { k:{fr:'Éclairage',en:'Lighting'},                 v:{fr:'LED High-CRI continue',en:'High-CRI LED continuous'} },
      { k:{fr:'Détourage automatique',en:'Auto clipping'},v:{fr:'AutoAlpha™',en:'AutoAlpha™'} },
      { k:{fr:'Formats',en:'Formats'},                    v:{fr:'JPG · PNG · TIFF · RAW',en:'JPG · PNG · TIFF · RAW'} },
    ],
    uses: [
      {fr:'Prêt-à-porter à plat',   en:'Flat-laid ready-to-wear'},
      {fr:'Compositions produits',  en:'Product compositions'},
      {fr:'Détourage automatique',  en:'Automatic clipping'},
    ],
    rates: [
      {k:{fr:'1 heure',      en:'1 hour'},    v:'€ 120'},
      {k:{fr:'Demi-journée', en:'Half day'},  v:'€ 410'},
      {k:{fr:'Journée',      en:'Full day'},  v:'€ 740'},
    ],
    visual: 'horizontal',
  },
  vertical: {
    num: '03',
    name: 'Vertical',
    tagline: {fr:'Mannequin ghost', en:'Ghost mannequin'},
    desc: {
      fr:"La Vertical est pensée pour les packshots textiles, particulièrement efficace pour le ghost, le piqué et les prises de vue e-commerce standardisées.",
      en:"The Vertical is built for textile packshots — particularly effective for ghost, hanging and standardized e-commerce shots."
    },
    specs: [
      { k:{fr:'Caméra',en:'Camera'},                      v:{fr:'Canon EOS R · 70–200 mm motorisé',en:'Canon EOS R · 70–200 mm motorized'} },
      { k:{fr:'Pilotage',en:'Control'},                   v:{fr:'iPad · application intuitive',en:'iPad · intuitive app'} },
      { k:{fr:'Éclairage',en:'Lighting'},                 v:{fr:'LED High-CRI continue',en:'High-CRI LED continuous'} },
      { k:{fr:'Détourage automatique',en:'Auto clipping'},v:{fr:'AutoAlpha™',en:'AutoAlpha™'} },
      { k:{fr:'Formats',en:'Formats'},                    v:{fr:'JPG · PNG · TIFF · RAW',en:'JPG · PNG · TIFF · RAW'} },
    ],
    uses: [
      {fr:'Ghost',                 en:'Ghost'},
      {fr:'Piqué',                  en:'Piqué'},
      {fr:'Détourage automatique',  en:'Automatic clipping'},
    ],
    rates: [
      {k:{fr:'1 heure',      en:'1 hour'},    v:'€ 120'},
      {k:{fr:'Demi-journée', en:'Half day'},  v:'€ 410'},
      {k:{fr:'Journée',      en:'Full day'},  v:'€ 740'},
    ],
    visual: 'vertical',
  },
  eclipse: {
    num: '04',
    name: 'Eclipse',
    tagline: {fr:'Photo & vidéo 360°', en:'Photo & video 360°'},
    desc: {
      fr:"L'Eclipse est conçue pour les produits petits et moyens : chaussures, sacs, accessoires, objets design ou beauté, avec plateau tournant intégré pour le 360°.",
      en:"The Eclipse is built for small and medium products — shoes, bags, accessories, design and beauty — with an integrated turntable for 360° shots."
    },
    specs: [
      { k:{fr:'Caméra',en:'Camera'},               v:{fr:'Canon EOS R · 24–105 mm motorisé',en:'Canon EOS R · 24–105 mm motorized'} },
      { k:{fr:'Pilotage',en:'Control'},            v:{fr:'iPad · application intuitive',en:'iPad · intuitive app'} },
      { k:{fr:'Motorisation',en:'Motion'},         v:{fr:'4 axes · hauteur · inclinaison · zoom · rotation 360°',en:'4 axes · height · tilt · zoom · 360° rotation'} },
      { k:{fr:'Éclairage',en:'Lighting'},          v:{fr:'LED High-CRI continue',en:'High-CRI LED continuous'} },
      { k:{fr:'Formats',en:'Formats'},             v:{fr:'JPG · PNG · TIFF · RAW · MP4 · MOV',en:'JPG · PNG · TIFF · RAW · MP4 · MOV'} },
    ],
    uses: [
      {fr:'Photo & vidéo e-commerce', en:'E-commerce photo & video'},
      {fr:'Still life',               en:'Still life'},
      {fr:'Accessoires, chaussures & beauté', en:'Accessories, footwear & beauty'},
    ],
    rates: [
      {k:{fr:'1 heure',      en:'1 hour'},    v:'€ 160'},
      {k:{fr:'Demi-journée', en:'Half day'},  v:'€ 560'},
      {k:{fr:'Journée',      en:'Full day'},  v:'€ 990'},
    ],
    visual: 'eclipse',
  },
  live: {
    num: '05',
    name: 'Live',
    tagline: {fr:'Shooting porté', en:'On-model shooting'},
    desc: {
      fr:"La Live est notre solution dédiée au shooting sur modèle. Elle produit un contenu e-commerce cohérent, rapide et reproductible d'une session à l'autre.",
      en:"The Live is our dedicated on-model shooting solution — consistent e-commerce content, fast to produce and easy to reproduce across sessions."
    },
    specs: [
      { k:{fr:'Caméra',en:'Camera'},               v:{fr:'Canon EOS R · 24–105 mm motorisé',en:'Canon EOS R · 24–105 mm motorized'} },
      { k:{fr:'Pilotage',en:'Control'},            v:{fr:'iPad · application intuitive',en:'iPad · intuitive app'} },
      { k:{fr:'Motorisation',en:'Motion'},         v:{fr:'3 axes · hauteur · inclinaison · zoom',en:'3 axes · height · tilt · zoom'} },
      { k:{fr:'Éclairage',en:'Lighting'},          v:{fr:'LED High-CRI continue',en:'High-CRI LED continuous'} },
      { k:{fr:'Formats',en:'Formats'},             v:{fr:'JPG · PNG · TIFF · RAW · MP4 · MOV',en:'JPG · PNG · TIFF · RAW · MP4 · MOV'} },
    ],
    uses: [
      {fr:'Shooting porté',       en:'On-model shooting'},
      {fr:'Photo & vidéo e-commerce', en:'E-commerce photo & video'},
      {fr:'Lookbooks & linesheets', en:'Lookbooks & linesheets'},
    ],
    rates: [
      {k:{fr:'1 heure',      en:'1 hour'},    v:'€ 185'},
      {k:{fr:'Demi-journée', en:'Half day'},  v:'€ 620'},
      {k:{fr:'Journée',      en:'Full day'},  v:'€ 1 120'},
    ],
    visual: 'live',
  },
};

/* ---------- visual ---------- */
const PlateauVisual = ({ kind }) => {
  if (kind === 'cyc') return (
    <svg viewBox="0 0 500 400" style={{width:'80%',height:'80%'}}>
      <defs>
        <linearGradient id="cycloG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff"/>
          <stop offset="1" stopColor="#e2d6c0"/>
        </linearGradient>
      </defs>
      <path d="M60 360 Q60 80 250 80 Q440 80 440 360 Z" fill="url(#cycloG)" stroke="#000" strokeWidth="0.75"/>
      <ellipse cx="250" cy="360" rx="160" ry="14" fill="rgba(0,0,0,0.08)"/>
      <line x1="250" y1="60" x2="250" y2="380" stroke="#000" strokeWidth="0.4" strokeDasharray="2 3"/>
      <text x="250" y="50" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">4,7 M</text>
      <text x="40" y="370" textAnchor="end" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">6 M</text>
    </svg>
  );
  if (kind === 'horizontal') return (
    <svg viewBox="0 0 500 400" style={{width:'80%',height:'80%'}}>
      <rect x="80" y="60" width="340" height="280" fill="#f5f5f5" stroke="#000" strokeWidth="0.75"/>
      {/* top-shot grid */}
      {[...Array(7)].map((_,i)=>(<line key={'h'+i} x1="80" y1={60+i*45} x2="420" y2={60+i*45} stroke="#888" strokeWidth="0.3" strokeDasharray="2 3"/>))}
      {[...Array(8)].map((_,i)=>(<line key={'v'+i} x1={80+i*48.5} y1="60" x2={80+i*48.5} y2="340" stroke="#888" strokeWidth="0.3" strokeDasharray="2 3"/>))}
      {/* flat shirt icon */}
      <path d="M180 160 L220 140 L240 150 L260 140 L300 160 L290 220 L260 220 L260 260 L220 260 L220 220 L190 220 Z" fill="#141414" opacity="0.85"/>
      <text x="250" y="50" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">TOP · SHOT</text>
      <text x="40" y="380" textAnchor="end" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">4 × 4 M</text>
    </svg>
  );
  if (kind === 'vertical') return (
    <svg viewBox="0 0 500 400" style={{width:'80%',height:'80%'}}>
      <rect x="160" y="40" width="180" height="330" fill="#fafafa" stroke="#000" strokeWidth="0.75"/>
      {/* ghost mannequin silhouette */}
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
    <svg viewBox="0 0 500 400" style={{width:'80%',height:'80%'}}>
      <circle cx="250" cy="200" r="150" fill="none" stroke="#000" strokeWidth="0.75" strokeDasharray="2 4"/>
      <circle cx="250" cy="200" r="100" fill="none" stroke="#000" strokeWidth="0.5"/>
      <circle cx="250" cy="200" r="55" fill="#141414"/>
      {/* camera positions around */}
      {[0,60,120,180,240,300].map(a=>{
        const rad = a*Math.PI/180;
        const x = 250 + Math.cos(rad)*150;
        const y = 200 + Math.sin(rad)*150;
        return <circle key={a} cx={x} cy={y} r="5" fill="#141414"/>
      })}
      <text x="250" y="30" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">360°</text>
      <text x="250" y="390" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">ECLIPSE</text>
    </svg>
  );
  if (kind === 'live') return (
    <svg viewBox="0 0 500 400" style={{width:'80%',height:'80%'}}>
      <rect x="60" y="60" width="380" height="230" fill="#141414"/>
      {/* stage scan lines */}
      {[...Array(12)].map((_,i)=>(<line key={i} x1="60" y1={60+i*20} x2="440" y2={60+i*20} stroke="#fff" strokeOpacity="0.1" strokeWidth="0.4"/>))}
      {/* REC dot */}
      <circle cx="80" cy="80" r="5" fill="#e5583a"/>
      <text x="92" y="84" fill="#fff" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">REC · LIVE</text>
      {/* model silhouette */}
      <g fill="#fff">
        <circle cx="250" cy="130" r="18"/>
        <path d="M230 150 L270 150 L275 230 L250 235 L225 230 Z"/>
      </g>
      {/* cameras */}
      <rect x="100" y="310" width="40" height="24" fill="#141414"/>
      <rect x="230" y="310" width="40" height="24" fill="#141414"/>
      <rect x="360" y="310" width="40" height="24" fill="#141414"/>
      <text x="250" y="380" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">3 CAM · NDI</text>
    </svg>
  );
  return null;
};

const PlateauPage = ({ slug, lang, setLang, openMenu, goto }) => {
  const p = PLATEAUX[slug] || PLATEAUX.cyclorama;
  const order = ['live','eclipse','horizontal','vertical','cyclorama'];
  const { isMobile } = useBreakpoint();

  const specsFr = 1.58;

  /* ---- Mobile layout ---- */
  if (isMobile) {
    return (
      <div style={{height:'100%',overflowY:'auto',overflowX:'hidden',background:'#000',display:'flex',flexDirection:'column',gap:1}}>
        {/* Header */}
        <div style={{display:'flex',gap:1,flexShrink:0,background:'#000'}}>
          <button onClick={()=>goto('home')} style={{flex:1,background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:12,height:52}}>
            <Wordmark size={28}/>
          </button>
          <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 52px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',height:52}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.15em',color:'#141414'}}>{lang==='fr'?'EN':'FR'}</span>
          </button>
          <button onClick={openMenu} style={{flex:'0 0 52px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',height:52}}>
            <IconMenu width="18" height="18"/>
          </button>
        </div>

        {/* Horizontal tab bar — machine selector */}
        <div style={{background:'#000',display:'flex',gap:1,flexShrink:0,overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          {order.map((m,i)=>{
            const cfg = PLATEAUX[m];
            const active = m===slug;
            return (
              <button key={m} onClick={()=>goto(m==='cyclorama'?'cyclorama':'plateau-'+m)}
                style={{flex:'0 0 auto',padding:'10px 14px',background:active?'var(--edo-gray-100)':'#fff',border:0,borderBottom:active?'2px solid var(--edo-orange)':'2px solid transparent',cursor:'pointer',textAlign:'center',display:'flex',flexDirection:'column',gap:2,transition:'background .15s',whiteSpace:'nowrap'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',color:active?'var(--edo-orange)':'#595959'}}>{String(i+1).padStart(2,'0')}</span>
                <span style={{fontSize:13,fontWeight:active?500:400,color:active?'#141414':'#595959',letterSpacing:'-0.01em'}}>{cfg.name}</span>
              </button>
            );
          })}
        </div>

        {/* Visual */}
        <div style={{background:'linear-gradient(180deg,#f5efe4,#d9cbb3)',aspectRatio:'4/3',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <PlateauVisual kind={p.visual}/>
        </div>

        {/* Title */}
        <div style={{background:'#fff',padding:'14px 16px',display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
          <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{p.tagline[lang]}</span>
          <h1 style={{fontSize:26,fontWeight:300,margin:0,letterSpacing:'-0.03em',lineHeight:1}}>{p.name}</h1>
        </div>

        {/* Description */}
        <div style={{background:'#fff',padding:'12px 16px',flexShrink:0}}>
          <span className="edo-cell-label" style={{marginBottom:8,display:'block'}}>{lang==='fr'?'Description':'Description'}</span>
          <p style={{margin:0,fontSize:13,color:'#141414',lineHeight:1.55}}>{p.desc[lang]}</p>
        </div>

        {/* Specs */}
        <div style={{background:'#fff',padding:'12px 16px',flexShrink:0}}>
          <span className="edo-cell-label" style={{marginBottom:8,display:'block'}}>{lang==='fr'?'Caractéristiques':'Specifications'}</span>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {p.specs.map((s,i)=>(
              <div key={s.k.fr} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8,fontSize:12,padding:'6px 0',borderBottom:i<p.specs.length-1?'1px solid var(--edo-gray-200)':'0'}}>
                <span style={{color:'#595959',flexShrink:0}}>{s.k[lang]}</span>
                <span style={{color:'#141414',fontFamily:'var(--font-mono)',letterSpacing:'0.02em',fontSize:11,textAlign:'right'}}>{(s.v[lang]||'').split(' · ').join(' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rates */}
        <div style={{background:'#fff',padding:'12px 16px',flexShrink:0}}>
          <span className="edo-cell-label" style={{marginBottom:8,display:'block'}}>{lang==='fr'?'Tarifs HT':'Rates excl. VAT'}</span>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {p.rates.map((r,i)=>(
              <div key={r.k.fr} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',fontSize:13,padding:'6px 0',borderBottom:i<p.rates.length-1?'1px solid var(--edo-gray-200)':'0'}}>
                <span style={{color:'#595959'}}>{r.k[lang]}</span>
                <span style={{color:'#141414',fontFamily:'var(--font-mono)',letterSpacing:'0.02em',fontSize:13}}>{typeof r.v === 'string' ? r.v : r.v[lang]}</span>
              </div>
            ))}
          </div>
          {p.ratesNote && (
            <div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.02em',color:'#888',lineHeight:1.5,paddingTop:8}}>{p.ratesNote[lang]}</div>
          )}
        </div>

        {/* Uses */}
        <div style={{background:'#fff',padding:'12px 16px',flexShrink:0}}>
          <span className="edo-cell-label" style={{marginBottom:8,display:'block'}}>{lang==='fr'?'Usages':'Uses'}</span>
          <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:4}}>
            {p.uses.map(a=>(<li key={a.fr} style={{fontSize:13,color:'#595959'}}>· {a[lang]}</li>))}
          </ul>
        </div>

        {/* Book CTA */}
        <button onClick={()=>{ try{localStorage.setItem('edo-book-plateau', slug);}catch(e){} goto('book'); }} style={{background:'var(--edo-orange)',padding:'20px 16px',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',fontFamily:'inherit',flexShrink:0}}>
          <div>
            <span className="edo-cell-label" style={{color:'rgba(255,255,255,0.8)',display:'block',marginBottom:4}}>06 · {lang==='fr'?'Réserver':'Book now'}</span>
            <span style={{fontSize:20,fontWeight:500,letterSpacing:'-0.02em',color:'#fff'}}>{lang==='fr'?'Réserver ce plateau':'Book this stage'}</span>
          </div>
          <IconArrowRight width="20" height="20" stroke="#fff"/>
        </button>
      </div>
    );
  }

  return (
    <div style={{display:'grid', gridTemplateColumns:'190px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gridTemplateRows:`54px 78px minmax(0, ${specsFr}fr) minmax(0, 0.72fr) minmax(0, 0.52fr)`, gap:1, background:'#000', height:'100%', width:'100%'}}>

      {/* ========== HEADER — LEFT (logo only — no burger on web) ========== */}
      <div style={{gridColumn:'1', gridRow:'1', background:'#000', display:'flex', gap:1, minWidth:0}}>
        <button onClick={()=>goto('home')} style={{flex:'0 0 190px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:8}}>
          <Wordmark size={32}/>
        </button>
      </div>

      {/* ========== HEADER — RIGHT (title + contact + lang cells) ========== */}
      <div style={{gridColumn:'2 / span 3', gridRow:'1', background:'#000', display:'flex', gap:1, minWidth:0}}>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 24px',display:'flex',alignItems:'center',minWidth:0}}>
          <div style={{display:'flex',alignItems:'baseline',gap:14}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{lang==='fr'?'Plateaux':'Stages'}</span>
          </div>
        </div>
        <button onClick={()=>goto('postprod')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Post-prod':'Post-prod'}</span>
          <IconArrowRight width="12" height="12"/>
        </button>
        <button onClick={()=>goto('gallery')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Galerie':'Gallery'}</span>
          <IconArrowRight width="12" height="12"/>
        </button>
        <button onClick={()=>goto('contact')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 24px',gap:10}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.05em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Nous contacter':'Contact us'}</span>
          <IconArrowRight width="14" height="14"/>
        </button>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 54px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
          <span style={{color:'#141414',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.15em'}}>{lang==='fr'?'EN':'FR'}</span>
        </button>
      </div>

      {/* ============ Left rail (rows 2-5) ============ */}
      <div style={{gridColumn:'1', gridRow:'2 / span 4', background:'#fff', display:'flex', flexDirection:'column', minHeight:0}}>
        {order.map((m,i)=>{
          const cfg = PLATEAUX[m];
          const active = m===slug;
          return (
            <button key={m} onClick={()=>goto(m==='cyclorama'?'cyclorama':'plateau-'+m)}
              style={{flex:'0 0 auto',padding:'14px 16px',background:active?'var(--edo-gray-100)':'#fff',border:0,borderLeft:active?'2px solid var(--edo-orange)':'2px solid transparent',borderBottom:'1px solid var(--edo-gray-200)',cursor:'pointer',textAlign:'left',display:'flex',flexDirection:'column',gap:4,transition:'background .15s'}}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='var(--edo-gray-100)'; }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='#fff'; }}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',color:active?'var(--edo-orange)':'#595959'}}>{String(i+1).padStart(2,'0')}</span>
              <span style={{fontSize:15,fontWeight:active?500:400,color:active?'#141414':'#595959',letterSpacing:'-0.01em'}}>{cfg.name}</span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.08em',textTransform:'uppercase',color:'#888'}}>{cfg.tagline[lang]}</span>
            </button>
          );
        })}
      </div>

      {/* ============ Big visual (col 2-3, rows 2-4) ============ */}
      <div style={{gridColumn:'2 / span 2', gridRow:'2 / span 3', background:'linear-gradient(180deg,#f5efe4,#d9cbb3)', position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <PlateauVisual kind={p.visual}/>
      </div>

      {/* ============ Right col — title + specs + uses ============ */}
      <div style={{gridColumn:'4', gridRow:'2', background:'#fff', padding:'14px 16px', display:'flex', flexDirection:'column', justifyContent:'space-between', gap:4, minHeight:0, overflow:'hidden'}}>
        <span className="edo-cell-label">{p.tagline[lang]}</span>
        <h1 style={{fontSize:30, fontWeight:300, margin:0, letterSpacing:'-0.03em', lineHeight:1}}>{p.name}</h1>
      </div>

      <div style={{gridColumn:'4', gridRow:'3', background:'#fff', padding:'12px 16px', display:'flex', flexDirection:'column', gap:6, minHeight:0, overflow:'hidden'}}>
        <span className="edo-cell-label">{lang==='fr'?'Caractéristiques':'Specifications'}</span>
        <div style={{display:'flex',flexDirection:'column',gap:0,flex:'1 1 auto',minHeight:0,overflow:'hidden'}}>
          {p.specs.map((s,i)=>(
            <div key={s.k.fr} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:12,fontSize:11,padding:'4px 0',borderBottom:i<p.specs.length-1?'1px solid var(--edo-gray-200)':'0'}}>
              <span style={{color:'#595959',flexShrink:0}}>{s.k[lang]}</span>
              <span style={{color:'#141414',fontFamily:'var(--font-mono)',letterSpacing:'0.02em',fontSize:10,textAlign:'right',whiteSpace:'pre-line',overflow:'hidden',textOverflow:'clip',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',lineHeight:1.35}}>{(s.v[lang]||'').split(' · ').join(' ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{gridColumn:'4', gridRow:'4', background:'#fff', padding:'10px 16px 12px', display:'flex', flexDirection:'column', gap:4, minHeight:0, overflow:'hidden'}}>
        <span className="edo-cell-label">{lang==='fr'?'Tarifs HT':'Rates excl. VAT'}</span>
        <div style={{display:'flex',flexDirection:'column',gap:0,flex:'1 1 auto',minHeight:0,overflow:'hidden'}}>
          {p.rates.map((r,i)=>(
            <div key={r.k.fr} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',fontSize:12,padding:'4px 0',borderBottom:i<p.rates.length-1?'1px solid var(--edo-gray-200)':'0'}}>
              <span style={{color:'#595959'}}>{r.k[lang]}</span>
              <span style={{color:'#141414',fontFamily:'var(--font-mono)',letterSpacing:'0.02em',fontSize:12}}>{typeof r.v === 'string' ? r.v : r.v[lang]}</span>
            </div>
          ))}
        </div>
        {p.ratesNote && (
          <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.02em',color:'#888',lineHeight:1.5,paddingTop:0,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {p.ratesNote[lang]}
          </div>
        )}
      </div>

      {/* ============ Bottom bar — description + uses ============ */}
      <div style={{gridColumn:'2 / span 2', gridRow:'5', background:'#fff', padding:16, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:24, minHeight:0, overflow:'hidden'}}>
        <div style={{flex:'1 1 auto', display:'flex', flexDirection:'column', gap:6, minWidth:0, minHeight:0, overflow:'hidden'}}>
          <span className="edo-cell-label">{lang==='fr'?'Description':'Description'}</span>
          <p style={{margin:0,fontSize:12,color:'#141414',lineHeight:1.45,maxWidth:640,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical'}}>{p.desc[lang]}</p>
        </div>
        <div style={{flex:'0 0 200px', display:'flex', flexDirection:'column', gap:6, minHeight:0, overflow:'hidden'}}>
          <span className="edo-cell-label">{lang==='fr'?'Usages':'Uses'}</span>
          <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:2,overflow:'hidden'}}>
            {p.uses.map(a=>(<li key={a.fr} style={{fontSize:11,color:'#595959',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>· {a[lang]}</li>))}
          </ul>
        </div>
      </div>
      <button onClick={()=>{ try{localStorage.setItem('edo-book-plateau', slug);}catch(e){} goto('book'); }} style={{gridColumn:'4', gridRow:'5', background:'var(--edo-orange)', padding:16, border:0, cursor:'pointer', display:'flex', flexDirection:'column', justifyContent:'space-between', textAlign:'left', fontFamily:'inherit'}}>
        <span className="edo-cell-label" style={{color:'rgba(255,255,255,0.8)'}}>06 · {lang==='fr'?'Réserver':'Book now'}</span>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',color:'#fff',width:'100%'}}>
          <span style={{fontSize:22,fontWeight:500,letterSpacing:'-0.02em'}}>{lang==='fr'?'Réserver ce plateau':'Book this stage'}</span>
          <IconArrowRight width="20" height="20" stroke="#fff"/>
        </div>
      </button>

    </div>
  );
};

Object.assign(window, { PlateauPage, PLATEAUX });
