/* global React, NavMenu, IconArrowRight, IconMenu, IconPlay, DirectionA, NavigationCell, GalleryCell, ChatCell, CtaCell, ContactCell, Wordmark, CellLabel, Button, MarqueeCell, PlateauPage, GalleryPage, ContactPage, BookPage, DiscoveryPage, DiscoveryVariants, PostprodPage, LegalPage, useBreakpoint */

const { useState, useEffect } = React;

/* ==========================================================
   CYCLORAMA page — linked from every direction.
   Lean on existing cells, adapt for the new nav rail.
   ========================================================== */
const CycloramaPage = ({ lang, setLang, openMenu, goto }) => {
  const { isMobile } = useBreakpoint();
  const specs = [
    { k:{fr:'Surface',en:'Surface'}, v:{fr:'30 m²',en:'30 m²'} },
    { k:{fr:'Configuration',en:'Configuration'}, v:{fr:'Cyclo 2 faces',en:'2-sided cyclo'} },
    { k:{fr:'Dimensions',en:'Dimensions'}, v:{fr:'6m L · 5m l · 4,7m H',en:'6m L · 5m W · 4.7m H'} },
    { k:{fr:'Éclairage',en:'Lighting'}, v:{fr:'Broncolor Para 222',en:'Broncolor Para 222'} },
  ];
  const amenities = [
    {fr:'Cuisine tout équipée',en:'Fully equipped kitchen'},
    {fr:'Postes maquillage',en:'Makeup stations'},
    {fr:'Sonorisation Sonos',en:'Sonos sound system'},
    {fr:'Cabines de change',en:'Changing rooms'},
    {fr:'Wifi haut débit',en:'High-speed wifi'},
    {fr:'Espace détente',en:'Relaxation area'},
    {fr:'Porte sectionnelle',en:'Sectional door'},
    {fr:'Places de parking',en:'Parking'},
  ];
  const machines = [
    { slug:'cyclorama', fr:'Cyclorama', en:'Cyclorama' },
    { slug:'horizontal', fr:'Horizontal', en:'Horizontal' },
    { slug:'vertical', fr:'Vertical', en:'Vertical' },
    { slug:'eclipse', fr:'Eclipse', en:'Eclipse' },
    { slug:'live', fr:'Live', en:'Live' },
  ];
  return (
    <div style={{display:'grid', gridTemplateColumns:'190px 1fr 1fr 1fr', gridTemplateRows:'54px repeat(4,1fr)', gap:1, background:'#000', height:'100%', width:'100%'}}>
      {/* top row */}
      <div style={{gridColumn:'1',gridRow:'1',background:'#fff',display:'flex',alignItems:'center'}}>
        <button onClick={openMenu} style={{width:48,height:'100%',border:0,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <IconMenu width="18" height="18"/>
        </button>
        <button onClick={()=>goto('home')} style={{flex:'1 1 auto',height:'100%',border:0,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 12px'}}>
          <Wordmark size={32}/>
        </button>
      </div>
      <div style={{gridColumn:'2 / span 3', gridRow:'1', background:'#fff', padding:'0 16px', display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span className="edo-cell-label">{lang==='fr'?'Machines · Cyclorama 01 / 05':'Machines · Cyclorama 01 / 05'}</span>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{background:'transparent',border:0,cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase'}}>{lang==='fr'?'EN':'FR'} · {lang==='fr'?'EN':'FR'}</button>
      </div>

      {/* Left rail : machine list */}
      <div style={{gridColumn:'1', gridRow:'2 / span 4', background:'#fff', display:'flex',flexDirection:'column'}}>
        {machines.map((m,i)=>(
          <button key={m.slug} onClick={()=>m.slug==='cyclorama'?null:goto('home')}
            style={{padding:16,background:m.slug==='cyclorama'?'var(--edo-gray-100)':'#fff',border:0,borderBottom:'1px solid var(--edo-gray-200)',cursor:'pointer',textAlign:'left',display:'flex',flexDirection:'column',gap:6,transition:'background .15s'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',color:'#595959'}}>{String(i+1).padStart(2,'0')}</span>
            <span style={{fontSize:15,fontWeight:m.slug==='cyclorama'?500:400,color:m.slug==='cyclorama'?'#141414':'#595959',letterSpacing:'-0.01em'}}>{m[lang]}</span>
          </button>
        ))}
        <div style={{flex:1}}/>
      </div>

      {/* Big visual */}
      <div style={{gridColumn:'2 / span 2', gridRow:'2 / span 3', background:'linear-gradient(180deg,#f5efe4,#d9cbb3)', position:'relative', overflow:'hidden', display:'flex',alignItems:'center',justifyContent:'center'}}>
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
        <span className="edo-cell-label" style={{position:'absolute',top:12,left:12}}>3D · Cyclorama</span>
        <span className="edo-cell-label" style={{position:'absolute',top:12,right:12,color:'#141414'}}>30 M²</span>
      </div>

      {/* title */}
      <div style={{gridColumn:'4', gridRow:'2', background:'#fff', padding:16, display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
        <span className="edo-cell-label">{lang==='fr'?'Production libre':'Free production'}</span>
        <h1 style={{fontSize:42,fontWeight:300,margin:0,letterSpacing:'-0.03em',lineHeight:1}}>Cyclorama</h1>
      </div>

      {/* specs */}
      <div style={{gridColumn:'4', gridRow:'3', background:'#fff', padding:16, display:'flex',flexDirection:'column',gap:8,justifyContent:'space-between'}}>
        <span className="edo-cell-label">{lang==='fr'?'Caractéristiques':'Specifications'}</span>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {specs.map(s=>(
            <div key={s.k.fr} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:'1px solid var(--edo-gray-200)'}}>
              <span style={{color:'#595959'}}>{s.k[lang]}</span>
              <span style={{color:'#141414',fontFamily:'var(--font-mono)',letterSpacing:'0.02em'}}>{s.v[lang]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* amenities */}
      <div style={{gridColumn:'4', gridRow:'4', background:'#fff', padding:16, display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
        <span className="edo-cell-label">{lang==='fr'?'Équipements':'Amenities'}</span>
        <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 12px'}}>
          {amenities.map(a=>(<li key={a.fr} style={{fontSize:11,color:'#595959'}}>• {a[lang]}</li>))}
        </ul>
      </div>

      {/* CTA bar + description */}
      <div style={{gridColumn:'2 / span 2', gridRow:'5', background:'#fff', padding:16, display:'flex',justifyContent:'space-between',alignItems:'center',gap:20}}>
        <p style={{margin:0,fontSize:13,color:'#595959',lineHeight:1.5,maxWidth:540}}>
          {lang==='fr'
            ? "Notre cyclorama vous permet de réaliser photos et vidéos sur fond blanc infini, sous un éclairage Broncolor calibré. Disponible à la journée ou à la semaine, en production libre ou avec notre équipe."
            : "Our cyclorama lets you shoot photo and video on an infinite white background, lit with calibrated Broncolor gear. Available daily or weekly, as a free-production rental or crewed."}
        </p>
        <Button>{lang==='fr'?'Demander un devis':'Request a quote'} <IconArrowRight width="14" height="14"/></Button>
      </div>
      <div style={{gridColumn:'4', gridRow:'5', background:'var(--edo-orange)', padding:16, display:'flex',flexDirection:'column',justifyContent:'space-between',cursor:'pointer'}}>
        <span className="edo-cell-label" style={{color:'rgba(255,255,255,0.8)'}}>06 · {lang==='fr'?'Réserver':'Book now'}</span>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',color:'#fff'}}>
          <span style={{fontSize:22,fontWeight:500,letterSpacing:'-0.02em'}}>{lang==='fr'?'Planifier une visite':'Schedule a visit'}</span>
          <IconArrowRight width="20" height="20" stroke="#fff"/>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================
   APP shell : direction toolbar + stage + slide-over nav.
   ========================================================== */
const TABS = [
  { k:'A', title:'E-Do Web',  subtitle:'Version live' },
  { k:'B', title:'Discovery', subtitle:'Magazine',   discoveryV:'v2' },
];

/* Stub for secondary routes — placeholder rather than blank. */
const StubPage = ({ title, lang, goto, openMenu }) => (
  <div style={{display:'grid',gridTemplateColumns:'190px 1fr',gridTemplateRows:'52px 1fr 80px',gap:1,background:'#000',height:'100%',width:'100%'}}>
    <div style={{gridColumn:'1',gridRow:'1',background:'#fff',display:'flex',alignItems:'center'}}>
      <button onClick={openMenu} style={{width:48,height:'100%',border:0,borderRight:'1px solid #000',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <IconMenu width="18" height="18"/>
      </button>
      <button onClick={()=>goto('home')} style={{flex:1,height:'100%',border:0,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'flex-start',padding:'0 12px'}}>
          <Wordmark size={32}/>
        </button>
    </div>
    <div style={{gridColumn:'2',gridRow:'1',background:'#fff',display:'flex',alignItems:'center',padding:'0 16px'}}>
      <span className="edo-cell-label">{title}</span>
    </div>
    <div style={{gridColumn:'1 / 3', gridRow:'2', background:'#fafafa',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:40,textAlign:'center'}}>
      <span className="edo-cell-label" style={{color:'#888'}}>— {lang==='fr'?'Page liée · preview':'Linked page · preview'} —</span>
      <h2 style={{margin:0,fontSize:42,fontWeight:300,letterSpacing:'-0.02em'}}>{title}</h2>
      <p style={{maxWidth:540,color:'#595959',fontSize:14,lineHeight:1.5,margin:0}}>
        {lang==='fr'
          ? "Cette page est un maillon de la navigation — pour l'explo homepage on reste focus sur l'accueil et le cyclorama. Cliquez sur E-Do pour revenir."
          : "This page is part of the navigation — for the homepage exploration we're focused on home and cyclorama. Click E-Do to return."}
      </p>
      <button onClick={()=>goto('home')} style={{marginTop:12,background:'#141414',color:'#fff',border:0,height:40,padding:'0 22px',fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:10}}>
        ← {lang==='fr'?'Retour accueil':'Back to home'}
      </button>
    </div>
    <div style={{gridColumn:'1 / 3', gridRow:'3', background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <MarqueeCell/>
    </div>
  </div>
);

const App = () => {
  const [dir, setDir] = useState(() => { try { return localStorage.getItem('edo-dir') || 'A'; } catch(e){ return 'A'; } });
  const [screen, setScreen] = useState(() => { try { return localStorage.getItem('edo-screen') || 'home'; } catch(e){ return 'home'; } });
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('edo-lang') || 'fr'; } catch(e){ return 'fr'; } });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(()=>{ try { localStorage.setItem('edo-dir', dir); } catch(e){} }, [dir]);
  useEffect(()=>{ try { localStorage.setItem('edo-screen', screen); } catch(e){} }, [screen]);
  useEffect(()=>{ try { localStorage.setItem('edo-lang', lang); } catch(e){} }, [lang]);

  const goto = (s) => { setScreen(s); setMenuOpen(false); };

  const active = TABS.find(t=>t.k===dir);
  const props = { lang, setLang, openMenu:()=>setMenuOpen(true), goto };

  return (
    <div className="shell" data-screen-label={`E-Do · ${active.title} · ${screen}`}>
      {/* ========== Stage ========== */}
      <div className="stage">
        {screen==='home' && <DirectionA {...props}/>}
        {screen==='cyclorama' && <PlateauPage slug="cyclorama" {...props}/>}
        {screen==='plateau-horizontal' && <PlateauPage slug="horizontal" {...props}/>}
        {screen==='plateau-vertical' && <PlateauPage slug="vertical" {...props}/>}
        {screen==='plateau-eclipse' && <PlateauPage slug="eclipse" {...props}/>}
        {screen==='plateau-live' && <PlateauPage slug="live" {...props}/>}
        {screen==='discovery' && <DiscoveryVariants {...props} forceVariant={TABS.find(t=>t.k===dir)?.discoveryV}/>}
        {screen==='postprod' && <PostprodPage {...props}/>}
        {screen==='legal' && <LegalPage {...props}/>}
        {screen==='gallery' && <GalleryPageV3 {...props}/>}
        {screen==='contact' && <ContactPage {...props}/>}
        {screen==='book' && <BookPageV2 {...props}/>}

        <NavMenu
          lang={lang} setLang={setLang}
          isOpen={menuOpen} onClose={()=>setMenuOpen(false)}
          onNav={(item)=>{
            const l = item.label.toLowerCase();
            if (l.includes('cyclo')) goto('cyclorama');
            else if (l.includes('horizontal')) goto('plateau-horizontal');
            else if (l.includes('vertical')) goto('plateau-vertical');
            else if (l.includes('eclipse')) goto('plateau-eclipse');
            else if (l.includes('live')) goto('plateau-live');
            else if (l.includes('galerie') || l.includes('gallery') || l.includes('portfolio')) goto('gallery');
            else if (l.includes('réserv') || l.includes('reserv') || l.includes('book')) goto('book');
            else if (l.includes('contact')) goto('contact');
            else if (l.includes('discovery') || l.includes('journal')) goto('discovery');
            else if (l.includes('post-prod') || l.includes('postprod') || l.includes('post prod')) goto('postprod');
            else if (l.includes('legal') || l.includes('mention') || l.includes('légal')) goto('legal');
            else if (l.includes('accueil') || l.includes('home')) goto('home');
            else setMenuOpen(false);
          }}
        />
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

Object.assign(window, { CycloramaPage, App });
