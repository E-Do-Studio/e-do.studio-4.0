/* global React, CellLabel, CellTitle, Button, IconArrowRight, IconPlay, IconMenu, Wordmark, LangSwitch, Clock */
const { useState, useEffect, useRef } = React;

/* ======================================================
   SHARED DATA — machines, keywords, brands, gallery
   Sourced from the 3.0 repo (ecommerce-cell.tsx, etc.)
   ====================================================== */
const MACHINES = [
  { slug:'cyclorama', fr:{t:'Cyclorama', sub:'Production libre', label:'30 m² — Broncolor'}, en:{t:'Cyclorama', sub:'Free production', label:'30 m² — Broncolor'} },
  { slug:'horizontal',fr:{t:'Horizontal', sub:'Packshots à plat', label:'Packshot horizontal'}, en:{t:'Horizontal', sub:'Flat packshots', label:'Horizontal packshot'} },
  { slug:'vertical',  fr:{t:'Vertical',  sub:'Mannequin ghost', label:'Pleine hauteur'}, en:{t:'Vertical', sub:'Ghost mannequin', label:'Full height'} },
  { slug:'eclipse',   fr:{t:'Eclipse',   sub:'Chaussures et accessoires', label:'Éclipse 360°'}, en:{t:'Eclipse', sub:'Shoes & accessories', label:'Eclipse 360°'} },
  { slug:'live',      fr:{t:'Live',      sub:'Shooting porté', label:'Diffusion live'}, en:{t:'Live', sub:'On-model shooting', label:'Live broadcast'} },
];

const KEYWORDS = {
  fr: [
    { key:'food',     fr:'Food',       en:'Food' },
    { key:'access',   fr:'Accessoires',en:'Accessories' },
    { key:'spirits',  fr:'Spiritueux', en:'Spirits' },
    { key:'cosmetic', fr:'Cosmétique', en:'Cosmetics' },
    { key:'luxury',   fr:'Luxe',       en:'Luxury' },
    { key:'fashion',  fr:'Mode',       en:'Fashion' },
  ],
};
const KW = KEYWORDS.fr; // same array, lang picked on render

const BRANDS = [
  'JEAN PAUL GAULTIER','BALENCIAGA','COPERNI','CARVEN',
  'THE KOOPLES','VUARNET','GIAMBATTISTA VALLI','NUMÉRO','JOHN LOBB','HARTFORD',
  'INOUI','DIPTYQUE','RIMOWA','NODALETO'
];

/* Deterministic, warm / neutral placeholder tiles — evocative of fashion
   editorial & packshot work without pretending to be real imagery. */
const tile = (seed, palette='warm') => {
  const palettes = {
    warm:    [ [32,14,78],[28,10,62],[24,8,48],[36,16,72],[20,6,40] ],
    cool:    [ [210,12,80],[220,10,64],[230,8,46],[200,14,72],[240,6,38] ],
    mono:    [ [0,0,92],[0,0,78],[0,0,62],[0,0,48],[0,0,32] ],
    editorial:[[28,10,82],[32,14,70],[18,6,42],[38,18,88],[8,4,22]],
  };
  const pal = palettes[palette];
  const a = pal[seed % pal.length];
  const b = pal[(seed+2) % pal.length];
  return `linear-gradient(${135 + (seed*37)%90}deg, oklch(${a[2]}% ${a[1]/100} ${a[0]}) 0%, oklch(${b[2]}% ${b[1]/100} ${b[0]}) 100%)`;
};

/* ======================================================
   NAV cell — menu trigger + wordmark
   ====================================================== */
const NavigationCell = ({ lang, onMenu, onLogo, compact=false }) => (
  <div style={{display:'grid',gridTemplateColumns:`${compact?48:60}px 1fr`,height:'100%',background:'#fff'}}>
    <button onClick={onMenu} aria-label="Menu"
      style={{background:'#fff',border:0,borderRight:'1px solid #000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s'}}
      onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
      <IconMenu width="20" height="20" />
    </button>
    <button onClick={onLogo}
      style={{background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s',padding:'0 16px'}}
      onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
      <Wordmark size={32}/>
    </button>
  </div>
);

/* ======================================================
   CYCLORAMA cell — hero service tile with 3D line-drawing
   ====================================================== */
const CycloramaCell = ({ lang, onOpen, variant='full' }) => (
  <button onClick={onOpen}
    style={{background:'#f5efe4',border:0,height:'100%',width:'100%',padding:0,cursor:'pointer',position:'relative',overflow:'hidden',textAlign:'left',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
    {/* cyclorama 3D silhouette */}
    <svg viewBox="0 0 500 300" preserveAspectRatio="xMidYMid meet" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
      <defs>
        <linearGradient id={`cy-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1"/>
          <stop offset="1" stopColor="#e2d6c0" stopOpacity="1"/>
        </linearGradient>
      </defs>
      <path d="M40 280 Q40 60 250 60 Q460 60 460 280 Z" fill={`url(#cy-${variant})`} stroke="#000" strokeWidth="0.5"/>
      <ellipse cx="250" cy="280" rx="170" ry="10" fill="rgba(0,0,0,0.08)"/>
    </svg>
    <div style={{position:'relative',padding:'16px 16px 0'}}>
      <CellLabel>{lang==='fr'?'Production libre · Studio cyclorama':'Free production · Cyclorama studio'}</CellLabel>
    </div>
    <div style={{position:'relative',padding:'0 16px 16px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}}>
      <div>
        <div style={{fontSize:variant==='full'?40:26,fontWeight:300,letterSpacing:'-0.03em',lineHeight:.95,color:'#141414'}}>Cyclorama</div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'#595959',marginTop:6}}>
          30 M² · 6×5×4,7M · BRONCOLOR
        </div>
      </div>
      <IconArrowRight width="18" height="18"/>
    </div>
  </button>
);

/* ======================================================
   SERVICE tile — a single service entry with image bg + label/title
   Used to fill the 6-keyword e-commerce block
   ====================================================== */
const ServiceTile = ({ label, lang, seed, palette='warm', sublabel, onClick }) => (
  <button onClick={onClick}
    style={{background:tile(seed,palette),border:0,position:'relative',overflow:'hidden',cursor:'pointer',height:'100%',width:'100%',padding:0,textAlign:'left',transition:'transform .3s'}}>
    <div style={{position:'absolute',inset:0,padding:12,display:'flex',flexDirection:'column',justifyContent:'space-between',color:'#fff',mixBlendMode:'difference'}}>
      {sublabel ? <CellLabel style={{color:'rgba(255,255,255,.9)'}}>{sublabel}</CellLabel> : <span/>}
      <span style={{fontSize:16,fontWeight:500,letterSpacing:'-0.01em'}}>{label}</span>
    </div>
  </button>
);

/* ======================================================
   E-COMMERCE keywords cell — 3 rows × 2 cols of categories
   ====================================================== */
const EcommerceKeywordsCell = ({ lang, onOpenService }) => (
  <div style={{display:'grid',gridTemplateRows:'repeat(3, 1fr)',gap:1,background:'#000',height:'100%'}}>
    {[0,2,4].map((start,r) => (
      <div key={r} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#000'}}>
        {KW.slice(start,start+2).map((kw,i) => (
          <ServiceTile key={kw.key}
            label={kw[lang]}
            lang={lang}
            seed={start+i+1}
            palette={['editorial','mono','warm'][r]}
            onClick={()=>onOpenService?.('ecommerce')}
          />
        ))}
      </div>
    ))}
  </div>
);

/* ======================================================
   POST-PRODUCTION cell — service tile
   ====================================================== */
const PostProdCell = ({ lang, onOpen }) => (
  <button onClick={onOpen}
    style={{background:'#0a0a0a',color:'#fff',border:0,height:'100%',width:'100%',padding:16,cursor:'pointer',textAlign:'left',display:'flex',flexDirection:'column',justifyContent:'space-between',position:'relative',overflow:'hidden'}}>
    <div style={{position:'absolute',inset:0,opacity:.35}}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
        {Array.from({length:16}).map((_,i)=>(
          <line key={i} x1="0" x2="400" y1={i*20} y2={i*20} stroke="#fff" strokeWidth="0.4"/>
        ))}
        <rect x="40" y="80" width="280" height="140" fill="none" stroke="var(--edo-orange)" strokeWidth="1"/>
        <line x1="40" y1="150" x2="320" y2="150" stroke="var(--edo-orange)" strokeWidth="0.8" strokeDasharray="2 2"/>
        <circle cx="180" cy="150" r="30" fill="none" stroke="#fff" strokeWidth="1"/>
      </svg>
    </div>
    <CellLabel style={{color:'rgba(255,255,255,.7)',position:'relative'}}>02 · {lang==='fr'?'Service':'Service'}</CellLabel>
    <div style={{position:'relative',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}}>
      <div>
        <div style={{fontSize:26,fontWeight:300,letterSpacing:'-0.02em',lineHeight:1}}>{lang==='fr'?'Post-production':'Post-production'}</div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,.55)',marginTop:8}}>
          {lang==='fr'?'Retouche · colorimétrie · détourage':'Retouching · color · clipping path'}
        </div>
      </div>
      <IconArrowRight width="18" height="18" stroke="#fff"/>
    </div>
  </button>
);

/* ======================================================
   ETOUCH cell — portal login
   ====================================================== */
const EtouchCell = ({ lang }) => (
  <a href="https://etouch.e-do.studio" target="_blank" rel="noopener noreferrer"
    style={{background:'#fff',height:'100%',width:'100%',padding:16,display:'flex',flexDirection:'column',justifyContent:'space-between',textDecoration:'none',color:'inherit',cursor:'pointer',transition:'background .15s'}}
    onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
    <CellLabel>etouch</CellLabel>
    <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
      <div>
        <div style={{fontSize:22,fontWeight:300,letterSpacing:'-0.02em',lineHeight:1}}>{lang==='fr'?'Espace client':'Client portal'}</div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'#595959',marginTop:8}}>
          {lang==='fr'?'Livrables · validation · archive':'Deliverables · review · archive'}
        </div>
      </div>
      <IconArrowRight width="18" height="18"/>
    </div>
  </a>
);

/* ======================================================
   MACHINE LIST cell — the 5 studios, text list
   ====================================================== */
const MachineListCell = ({ lang, onSelect }) => (
  <div style={{background:'#fff',height:'100%',display:'flex',flexDirection:'column'}}>
    <div style={{padding:'12px 16px',borderBottom:'1px solid var(--edo-gray-200)'}}>
      <CellLabel>{lang==='fr'?'Machines · 05':'Machines · 05'}</CellLabel>
    </div>
    {MACHINES.map((m,i)=>(
      <button key={m.slug} onClick={()=>onSelect?.(m)}
        style={{flex:1,background:'#fff',border:0,borderBottom: i<MACHINES.length-1?'1px solid var(--edo-gray-200)':'none',cursor:'pointer',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',transition:'background .15s',gap:10}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',letterSpacing:'0.2em'}}>{String(i+1).padStart(2,'0')}</span>
          <div style={{minWidth:0}}>
            <div style={{fontSize:14,fontWeight:500,color:'#141414',letterSpacing:'-0.01em'}}>{m[lang].t}</div>
            <div style={{fontSize:11,color:'#595959',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m[lang].sub}</div>
          </div>
        </div>
        <IconArrowRight width="14" height="14" stroke="#888"/>
      </button>
    ))}
  </div>
);

/* ======================================================
   CONTACT cell (vertical — phone, mail, address, links)
   ====================================================== */
const ContactCell = ({ lang }) => (
  <div style={{background:'#fff',height:'100%',display:'flex',flexDirection:'column'}}>
    <div style={{flex:1,padding:16,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
      <CellLabel>Contact</CellLabel>
      <div>
        <a href="tel:+33144041149" style={{display:'block',fontSize:12,color:'#595959',padding:'6px 0',textDecoration:'none'}}>+33 1 44 04 11 49</a>
        <a href="mailto:contact@e-do.studio" style={{display:'block',fontSize:12,color:'#595959',padding:'6px 0',textDecoration:'none'}}>contact@e-do.studio</a>
        <a style={{display:'block',fontSize:12,color:'#595959',padding:'6px 0',textDecoration:'none'}}>69 bd Victor Hugo · Bât. 6.7<br/>93400 Saint-Ouen</a>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#000',borderTop:'1px solid #000'}}>
      <a style={{background:'#fff',padding:12,fontSize:12,color:'#595959',cursor:'pointer',transition:'background .15s'}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        {lang==='fr'?'Nous contacter':'Contact us'}
      </a>
      <a style={{background:'#fff',padding:12,fontSize:12,color:'#595959',cursor:'pointer',transition:'background .15s'}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        {lang==='fr'?'Légal':'Legal'}
      </a>
    </div>
  </div>
);

/* ======================================================
   CHAT cell — typewriter assistant
   ====================================================== */
const chatWelcome = {
  fr: "Bonjour ! Je peux vous renseigner sur nos services, le cyclorama, la post-production ou un devis.",
  en: "Hello! I can help you with our services, the cyclorama, post-production or a quote.",
};
const chatResp = {
  fr: {
    prix:"Nos tarifs démarrent à 15 € / photo en packshot e-commerce. Demandez un devis pour un plan précis.",
    tarif:"Nos tarifs démarrent à 15 € / photo en packshot e-commerce.",
    devis:"Pour un devis, précisez volume de références, type de produit et délai.",
    cyclorama:"Cyclorama 30 m² avec éclairage Broncolor Para 222, disponible en production libre.",
    horaire:"Studio ouvert du lundi au vendredi, 10 h – 18 h. Samedi et dimanche sur demande.",
    adresse:"69 bd Victor Hugo, Bâtiment 6.7, 93400 Saint-Ouen — M° Garibaldi L13 ou Mairie de Saint-Ouen L14.",
    retouche:"Notre post-production couvre retouche, colorimétrie, détourage et CGI.",
    default:"Posez-moi une question sur nos services, tarifs ou le studio.",
  },
  en: {
    price:"Our rates start at €15 / photo for e-commerce packshots. Ask for a custom quote.",
    quote:"For a quote, please share your volume, product type and deadline.",
    cyclorama:"30 m² cyclorama with Broncolor Para 222 lighting — available as free production.",
    hours:"Studio open Monday to Friday, 10 am – 6 pm. Weekends on request.",
    address:"69 bd Victor Hugo, Building 6.7, 93400 Saint-Ouen — M° Garibaldi L13 or Mairie de Saint-Ouen L14.",
    retouch:"Our post-production covers retouching, color grading, clipping and CGI.",
    default:"Ask me about our services, rates or the studio.",
  },
};
const getResp = (input, lang) => {
  const l = input.toLowerCase();
  const r = chatResp[lang] || chatResp.fr;
  for (const k of Object.keys(r)) { if (k!=='default' && l.includes(k)) return r[k]; }
  return r.default;
};

const ChatCell = ({ lang }) => {
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [shown, setShown] = useState(0);
  const iRef = useRef();
  const type = (text) => {
    clearInterval(iRef.current);
    setMsg(text); setShown(0);
    let i = 0;
    iRef.current = setInterval(() => {
      i++; setShown(i);
      if (i >= text.length) clearInterval(iRef.current);
    }, 22);
  };
  useEffect(() => { const t = setTimeout(() => type(chatWelcome[lang]), 300); return () => { clearTimeout(t); clearInterval(iRef.current); }; }, [lang]);
  const submit = (e) => { e.preventDefault(); if (!input.trim()) return; type(getResp(input, lang)); setInput(''); };
  return (
    <div style={{background:'#fff',height:'100%',padding:16,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
      <CellLabel>{lang==='fr'?'Assistant E-Do':'E-Do assistant'}</CellLabel>
      <div style={{flex:1,display:'flex',alignItems:'flex-start',padding:'8px 0'}}>
        <p style={{fontSize:13,color:'#595959',lineHeight:1.55,margin:0,textWrap:'pretty'}}>
          {msg.slice(0, shown)}{shown < msg.length && <span style={{animation:'pulse 1s infinite'}}>|</span>}
        </p>
      </div>
      <form onSubmit={submit} style={{display:'flex',alignItems:'center',gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          placeholder={lang==='fr'?'prix, devis, cyclorama…':'price, quote, cyclorama…'}
          style={{flex:1,fontSize:13,background:'transparent',border:0,borderBottom:'1px solid #000',paddingBottom:4,outline:'none',color:'#141414',fontFamily:'inherit'}}/>
        <button type="submit" aria-label="send" style={{background:'transparent',border:0,color:'#595959',cursor:'pointer'}}>
          <IconArrowRight width="16" height="16"/>
        </button>
      </form>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }`}</style>
    </div>
  );
};

/* ======================================================
   GALLERY cell — grid of portfolio thumbnails with hover
   ====================================================== */
const GalleryCell = ({ columns=3, rows=1, onOpen, seeds=null, palette='editorial', showViewAll=false, lang='fr' }) => {
  const total = columns*rows - (showViewAll?1:0);
  const actualSeeds = seeds || Array.from({length: total}, (_, i)=>i+1);
  return (
    <div style={{display:'grid',gridTemplateColumns:`repeat(${columns},1fr)`,gridTemplateRows:`repeat(${rows},1fr)`,gap:1,background:'#000',height:'100%'}}>
      {actualSeeds.slice(0,total).map((s,i) => (
        <button key={i} onClick={()=>onOpen?.(i)}
          style={{background:tile(s,palette),border:0,cursor:'pointer',overflow:'hidden',position:'relative',transition:'transform .3s'}}>
          <span style={{position:'absolute',bottom:8,left:8,fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:'#fff',mixBlendMode:'difference'}}>
            {String(i+1).padStart(2,'0')} · {BRANDS[i % BRANDS.length].split(' ')[0]}
          </span>
        </button>
      ))}
      {showViewAll && (
        <button onClick={()=>onOpen?.('all')} style={{background:'#fff',border:0,cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'#595959',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          {lang==='fr'?'Galerie →':'Gallery →'}
        </button>
      )}
    </div>
  );
};

/* ======================================================
   CTA cell (orange or ghost)
   ====================================================== */
const CtaCell = ({ label, sub, onClick, variant='primary', size='md' }) => (
  <button onClick={onClick}
    style={{background: variant==='primary' ? 'var(--edo-orange)' : '#fff', color: variant==='primary'?'#fff':'#141414',border:0,height:'100%',width:'100%',padding:16,display:'flex',flexDirection:'column',justifyContent:'space-between',cursor:'pointer',textAlign:'left',transition:'all .15s'}}
    onMouseEnter={e=>{ if(variant!=='primary') e.currentTarget.style.background='var(--edo-gray-100)'; }}
    onMouseLeave={e=>{ if(variant!=='primary') e.currentTarget.style.background='#fff'; }}>
    <span className="edo-cell-label" style={{color: variant==='primary' ? 'rgba(255,255,255,.7)' : undefined}}>{sub}</span>
    <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}}>
      <span style={{fontSize:size==='lg'?26:18,fontWeight:variant==='primary'?500:400,letterSpacing:'-0.02em',lineHeight:1}}>{label}</span>
      <IconArrowRight width="20" height="20"/>
    </div>
  </button>
);

/* ======================================================
   CLIENT LOGOS / marquee — continuously scrolling brand list
   ====================================================== */
const MarqueeCell = ({ items = BRANDS, speed=40, size=18 }) => (
  <div style={{background:'#fff',height:'100%',overflow:'hidden',display:'flex',alignItems:'center',position:'relative'}}>
    <div style={{display:'inline-flex',gap:40,animation:`mq ${speed}s linear infinite`,whiteSpace:'nowrap',paddingLeft:20}}>
      {[...items,...items,...items].map((x,i)=>(
        <span key={i} style={{fontFamily:'var(--font-sans)',fontWeight:700,fontSize:size,color:'#141414',letterSpacing:'-0.01em'}}>{x}</span>
      ))}
    </div>
    <style>{`@keyframes mq { to { transform: translateX(-50%) } }`}</style>
  </div>
);

/* ======================================================
   ABOUT / tagline cell
   ====================================================== */
const AboutCell = ({ lang, size='sm' }) => (
  <div style={{background:'#fff',height:'100%',padding:16,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
    <CellLabel>{lang==='fr'?'À propos':'About'}</CellLabel>
    <p style={{fontSize:size==='lg'?15:12,lineHeight:1.5,color:'#141414',margin:0,textWrap:'pretty',fontWeight:400}}>
      {lang==='fr'
        ? "E-Do Studio est un espace hybride dédié à la production d'images haut de gamme pour les marques de mode et de luxe."
        : "E-Do Studio is a hybrid space dedicated to premium image production for fashion and luxury brands."}
    </p>
  </div>
);

/* ======================================================
   BRAND cell (5 rows) — used in Direction C as the left rail
   ====================================================== */
const BrandStackCell = ({ lang, setLang, onMenu, onLogo, onVideo }) => (
  <div style={{display:'grid',gridTemplateRows:'subgrid',gridRow:'1 / -1',gap:1,background:'#000',height:'100%'}}>
    {/* Row 1: logo + lang + menu */}
    <div style={{display:'grid',gridTemplateColumns:'48px 1fr 1fr',gap:1,background:'#000'}}>
      <button onClick={onMenu} aria-label="Menu"
        style={{background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s'}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        <IconMenu width="18" height="18"/>
      </button>
      <button onClick={onLogo}
        style={{background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:8,transition:'background .15s'}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        <Wordmark size={32}/>
      </button>
      <LangSwitch lang={lang} onToggle={()=>setLang(lang==='fr'?'en':'fr')}/>
    </div>

    {/* Row 2: Etouch */}
    <EtouchCell lang={lang}/>

    {/* Rows 3-4: Studio video — letterboxed 16:9 inside the 2-row cell */}
    <div style={{gridRow:'3 / span 2', background:'#000',position:'relative',overflow:'hidden',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onVideo}>
      <div style={{width:'100%',aspectRatio:'16 / 9',maxHeight:'100%',background:'#0a0a0a',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, #1a1a1a 0%, #000 100%)'}}></div>
        <div style={{position:'absolute',top:10,left:10,fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'#8a8a8a'}}>Studio · Reel · 16:9</div>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:44,height:44,border:'1px solid #fff',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <IconPlay width="18" height="18" stroke="#fff"/>
          </div>
        </div>
      </div>
    </div>

    {/* Row 5: Discovery */}
    <button style={{background:'#fff',border:0,cursor:'pointer',padding:16,display:'flex',flexDirection:'column',justifyContent:'space-between',alignItems:'flex-start',textAlign:'left',transition:'background .15s'}}
      onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
      <CellLabel>E-Do Studio</CellLabel>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%'}}>
        <CellTitle style={{fontSize:14}}>{lang==='fr'?'Découverte':'Discovery'}</CellTitle>
        <IconArrowRight width="14" height="14"/>
      </div>
    </button>
  </div>
);

Object.assign(window, {
  MACHINES, KW, BRANDS, tile,
  NavigationCell, CycloramaCell, ServiceTile, EcommerceKeywordsCell,
  PostProdCell, EtouchCell, MachineListCell, ContactCell, ChatCell,
  GalleryCell, CtaCell, MarqueeCell, AboutCell, BrandStackCell
});
