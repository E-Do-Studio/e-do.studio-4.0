/* global React, MarqueeCell, CellLabel, CellTitle, IconArrowRight, IconPlay, IconMenu, Wordmark, LangSwitch, Clock, tile, BRANDS, MACHINES */

/* =================================================================
   DIRECTION D — Planche contact, épurée
   -----------------------------------------------------------------
   Col gauche  : Discovery (top) + Showreel 16:9
   Col milieu  : Machines (liste)
   Col droite  : Galerie (top) + Assistant carré (bottom)
   Bottom bar  : Etouch · Socials · Marquee · Contact
   ================================================================= */

const { useState } = React;

const cellBase = {
  background:'#fff', border:0, cursor:'pointer', textAlign:'left',
  padding:'14px 16px', display:'flex', flexDirection:'column',
  justifyContent:'space-between', transition:'background .15s',
  minWidth:0, minHeight:0, overflow:'hidden', position:'relative',
  color:'#141414', fontFamily:'inherit',
};

const hoverGray = {
  onMouseEnter:e=>e.currentTarget.style.background='var(--edo-gray-100)',
  onMouseLeave:e=>e.currentTarget.style.background='#fff',
};

/* Social icons */
const SocialIcon = ({ kind, size=16 }) => {
  const p = {width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:1.4};
  if (kind==='instagram') return (<svg viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>);
  if (kind==='facebook') return (<svg viewBox="0 0 24 24" {...p}><path d="M14 7h3V4h-3c-2 0-3 1.5-3 3.5V10H8v3h3v8h3v-8h2.5l.5-3H14V8c0-.5.3-1 1-1Z"/></svg>);
  if (kind==='linkedin') return (<svg viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7M7 7.5v0M11 17v-7M11 13c0-2 1-3 2.5-3s2.5 1 2.5 3v4"/></svg>);
  if (kind==='tiktok') return (<svg viewBox="0 0 24 24" {...p}><path d="M15 4v9.5a3.5 3.5 0 1 1-3.5-3.5M15 4c0 2.5 2 4 4 4"/></svg>);
  if (kind==='etouch')  return (<svg viewBox="0 0 24 24" {...p}><path d="M5 12a7 7 0 0 1 14 0M8 12v6h8v-6"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>);
  return null;
};

/* Category icons */
const CatIcon = ({ kind, size=22 }) => {
  const p = {width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:1.1,strokeLinecap:'round',strokeLinejoin:'round'};
  if (kind==='cosmetique') return (<svg viewBox="0 0 24 24" {...p}><rect x="8" y="10" width="8" height="11" rx="1"/><path d="M10 10V6h4v4M12 3v3"/></svg>);
  if (kind==='bijoux')     return (<svg viewBox="0 0 24 24" {...p}><path d="M4 10l3-4h10l3 4-8 10z"/><path d="M4 10h16M9 10l3-4 3 4M9 10l3 10M15 10l-3 10"/></svg>);
  if (kind==='pap')        return (<svg viewBox="0 0 24 24" {...p}><path d="M6 8l3-3h6l3 3 2 2-3 2v9H4v-9L1 10z" transform="translate(1 1)"/></svg>);
  if (kind==='accessoires')return (<svg viewBox="0 0 24 24" {...p}><path d="M5 9 L19 9 L18 20 Q18 21 17 21 L7 21 Q6 21 6 20 Z"/><path d="M9 9 V7 Q9 4 12 4 Q15 4 15 7 V9"/></svg>);
  if (kind==='food')       return (<svg viewBox="0 0 24 24" {...p}><path d="M8 3v6a2 2 0 0 0 2 2h0v10M10 11a2 2 0 0 0 2-2V3M16 3v9c0 1 .5 1.5 1 2v7"/></svg>);
  if (kind==='eyewear')    return (<svg viewBox="0 0 24 24" {...p}><circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M10.5 14h3M3.5 12L6 7h3M20.5 12L18 7h-3"/></svg>);
  return null;
};

/* Machine row — list item */
const MachineRow = ({ idx, m, lang, onClick, isLast }) => (
  <button onClick={onClick} style={{
    background:'#fff', border:0, cursor:'pointer', textAlign:'left',
    padding:'10px 16px', display:'grid',
    gridTemplateColumns:'28px 1fr 12px',
    alignItems:'center', gap:14,
    borderBottom: isLast ? 'none' : '1px solid var(--edo-gray-200)',
    transition:'background .15s',
    fontFamily:'inherit', color:'#141414',
    flex:1, minHeight:0, overflow:'hidden',
  }} {...hoverGray}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',letterSpacing:'0.15em'}}>
      {String(idx+1).padStart(2,'0')}
    </span>
    <div style={{minWidth:0,overflow:'hidden'}}>
      <div style={{fontSize:16,fontWeight:500,letterSpacing:'-0.015em',lineHeight:1.15,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m[lang].t}</div>
      <div style={{fontSize:10,fontFamily:'var(--font-mono)',color:'#888',marginTop:3,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m[lang].sub}</div>
    </div>
    <IconArrowRight width="16" height="16" stroke="#888"/>
  </button>
);

/* Category cell — icon + label */
const CategoryCell = ({ kind, label, onClick }) => (
  <button onClick={onClick} style={{
    background:'#fff',border:0,cursor:'pointer',textAlign:'left',
    padding:'10px 12px',display:'flex',flexDirection:'column',justifyContent:'space-between',
    transition:'background .15s',color:'#141414',fontFamily:'inherit',
    minWidth:0,minHeight:0,overflow:'hidden',gap:10,
  }} {...hoverGray}>
    <CatIcon kind={kind}/>
    <div style={{fontSize:11,fontWeight:500,letterSpacing:'-0.005em',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</div>
  </button>
);

/* ========================================================= */

const DirectionA = ({ lang, setLang, openMenu, goto }) => {
  const [ecomMode, setEcomMode] = useState('type'); // 'type' | 'machine'
  const categories = [
    {k:'pap',        fr:'Prêt-à-porter',   en:'Ready-to-wear'},
    {k:'accessoires',fr:'Accessoires',     en:'Accessories'},
    {k:'eyewear',    fr:'Eyewear',         en:'Eyewear'},
    {k:'bijoux',     fr:'Bijoux',          en:'Jewelry'},
    {k:'cosmetique', fr:'Cosmétique',      en:'Cosmetics'},
    {k:'food',       fr:'Food & Spiritueux', en:'Food & Spirits'},
  ];
  const ecomMachines = [
    {slug:'live',       fr:{t:'Live',       sub:'Shooting porté'},    en:{t:'Live',       sub:'On-model shooting'}},
    {slug:'eclipse',    fr:{t:'Eclipse',    sub:'Chaussures & accessoires'}, en:{t:'Eclipse', sub:'Shoes & accessories'}},
    {slug:'horizontal', fr:{t:'Horizontal', sub:'Packshots à plat'}, en:{t:'Horizontal', sub:'Flat packshots'}},
    {slug:'vertical',   fr:{t:'Vertical',   sub:'Mannequin ghost'},   en:{t:'Vertical',   sub:'Ghost mannequin'}},
  ];

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'repeat(12, 1fr)',
      gridTemplateRows:'54px 84px 1.1fr 1.25fr 84px 44px',
      gap:1, background:'#000', width:'100%', height:'100%', minHeight:0,
    }}>

      {/* ========== ROW 1 · Header unifié (flex horizontal, tailles custom) ========== */}
      {/* ========== ROW 1 · Header split au niveau du col 7 ========== */}
      {/* Gauche: cols 1-7 (aligné avec Machines) */}
      <div style={{gridColumn:'1 / 6', gridRow:'1', display:'flex', gap:1, background:'#000', minWidth:0}}>
        <button onClick={()=>goto('home')} style={{flex:'0 0 190px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:8}} {...hoverGray}>
          <Wordmark size={32}/>
        </button>
        <div style={{flex:'1 1 auto',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 12px',minWidth:0}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.12em',textTransform:'uppercase',color:'#595959',whiteSpace:'nowrap'}}>{lang==='fr'?'Lun–Sam · 09—19':'Mon–Sat · 09—19'}</span>
        </div>
      </div>
      {/* Droite: cols 5-13 (élargi pour accueillir email + téléphone complets) */}
      <div style={{gridColumn:'6 / 13', gridRow:'1', display:'flex', gap:1, background:'#000', minWidth:0}}>
        <div style={{flex:'1 1 auto',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 18px',overflow:'hidden',minWidth:0}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.05em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>01 44 04 11 49</span>
        </div>
        <button onClick={()=>goto('contact')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 28px',gap:12,overflow:'hidden'}} {...hoverGray}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.05em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Nous contacter':'Contact us'}</span>
          <IconArrowRight width="16" height="16"/>
        </button>
        <button onClick={()=>goto('legal')} style={{flex:'0 0 70px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 8px',overflow:'hidden'}} {...hoverGray}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.15em',textTransform:'uppercase',color:'#141414',whiteSpace:'nowrap'}}>Legal</span>
        </button>
        <a href="https://etouch.e-do.studio/" target="_blank" rel="noopener noreferrer" style={{flex:'0 0 92px',background:'#141414',textDecoration:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 12px'}}>
          <span style={{color:'#fff',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase'}}>Etouch</span>
        </a>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 54px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}} {...hoverGray}>
          <span style={{color:'#141414',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.15em'}}>{lang==='fr'?'EN':'FR'}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* ROW 2 · Top strip : Discovery (1-4) · Machines title (5-8) · Galerie opens here (9-12) */}

      {/* Discovery — col A (1-4), row 5 (below TYPE) */}
      <button onClick={()=>goto('discovery')} style={{
        ...cellBase,
        gridColumn:'1 / 4', gridRow:'5', background:'#141414', color:'#fff',
        padding:'14px 18px', minHeight:84, flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:14,
      }}>
        <svg viewBox="0 0 200 84" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.2}}>
          {[...Array(7)].map((_,i)=>(<line key={'h'+i} x1="0" y1={i*14} x2="200" y2={i*14} stroke="#fff" strokeWidth="0.3"/>))}
          {[...Array(14)].map((_,i)=>(<line key={'v'+i} x1={i*14} y1="0" x2={i*14} y2="84" stroke="#fff" strokeWidth="0.3"/>))}
        </svg>
        <div style={{minWidth:0,display:'flex',flexDirection:'column',gap:4,position:'relative'}}>
          <CellLabel style={{color:'rgba(255,255,255,.7)'}}>Discovery</CellLabel>
          <div style={{fontSize:20,fontWeight:400,letterSpacing:'-0.015em',lineHeight:1.05,color:'#fff'}}>
            {lang==='fr'?"Dites-m'en plus":'Tell me more'}
          </div>
        </div>
        <div style={{position:'relative',flexShrink:0}}>
          <IconArrowRight width="16" height="16" stroke="#fff"/>
        </div>
      </button>

      {/* Machines list — col B (4-7), spans rows 2-3 (title removed) */}
      {/* Réserver — col C (7-10) row 4, above Post-prod, hauteur identique à Discovery (84px) */}
      <button onClick={()=>goto('book')} style={{
        gridColumn:'7 / 10', gridRow:'4', background:'var(--edo-orange)',
        border:0, cursor:'pointer', color:'#fff',
        padding:'14px 20px', height:84, alignSelf:'start',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:14,
        fontFamily:'inherit', textAlign:'left',
      }}
        onMouseEnter={e=>e.currentTarget.style.background='#c64f1f'}
        onMouseLeave={e=>e.currentTarget.style.background='var(--edo-orange)'}>
        <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:0}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,.75)'}}>{lang==='fr'?'Demander un devis ou':'Request a quote or'}</span>
          <span style={{fontSize:20,fontWeight:400,letterSpacing:'-0.015em',lineHeight:1.05,color:'#fff'}}>{lang==='fr'?'Réserver':'Book'}</span>
        </div>
        <IconArrowRight width="16" height="16" stroke="#fff"/>
      </button>

      {/* ========================================================= */}
      {/* ROW 3 · Main : Showreel (1-4) · Machines list (5-8) · Galerie (9-12, spans 2-3) */}

      {/* Showreel — col A (1-4), row 4 (swapped with TYPE) */}
      <div style={{gridColumn:'1 / 4', gridRow:'4', background:'#000', display:'flex', minHeight:0, overflow:'hidden'}}>
        <button onClick={()=>goto('gallery')} style={{
          background:'#0a0a0a', color:'#fff', padding:0, border:0, cursor:'pointer',
          position:'relative', overflow:'hidden', width:'100%', height:'100%',
          fontFamily:'inherit', textAlign:'left',
        }}>
          <img src={window.__resources.showreelPreview} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,.25) 100%)'}}/>
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:56,height:56,borderRadius:'50%',border:'1px solid rgba(255,255,255,.5)',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.25)',backdropFilter:'blur(6px)'}}>
              <IconPlay width="18" height="18" stroke="#fff"/>
            </div>
          </div>
        </button>
      </div>

      {/* Cyclorama feature — col B (4-7), rows 4-5 (replaces machines list) */}
      <button onClick={()=>goto('cyclorama')} style={{
        gridColumn:'4 / 7', gridRow:'4 / 6', background:'#fff',
        border:0, cursor:'pointer', color:'#141414',
        padding:'18px 20px', position:'relative', overflow:'hidden', fontFamily:'inherit', textAlign:'left',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
      }} {...hoverGray}>
        {/* top meta */}
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <CellLabel>{lang==='fr'?'Espace':'Space'}</CellLabel>
        </div>

        {/* title block */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:14}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:'clamp(22px, 2.4vw, 32px)',fontWeight:300,letterSpacing:'-0.03em',lineHeight:1,color:'#141414',whiteSpace:'nowrap'}}>Cyclorama</div>
            <div style={{fontSize:11,color:'#888',marginTop:6,fontFamily:'var(--font-mono)',letterSpacing:'0.08em',textTransform:'uppercase'}}>
              {lang==='fr'?'Production libre · Photo & Vidéo':'Free production · Photo & Video'}
            </div>
          </div>
          <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <IconArrowRight width="16" height="16" stroke="#141414"/>
          </div>
        </div>
      </button>

      {/* Galerie — cols C+D (7-13), spans rows 2-3 */}
      <button onClick={()=>goto('gallery')} style={{
        ...cellBase,
        gridColumn:'7 / 13', gridRow:'2 / 4',
        background:'#1a1a1a', padding:'20px 24px',
        color:'#fff', alignItems:'stretch',
        backgroundImage:`linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,.65) 100%), url(${window.__resources.galleryHero})`,
        backgroundSize:'cover', backgroundPosition:'center',
      }}>
        <div style={{flex:1}}/>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',width:'100%',gap:16}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:'clamp(44px, 5vw, 72px)',fontWeight:300,letterSpacing:'-0.035em',lineHeight:0.92,color:'#fff'}}>
              {lang==='fr'?'Galerie':'Gallery'}
            </div>
          </div>
          <div style={{flexShrink:0}}>
            <IconArrowRight width="16" height="16" stroke="#fff"/>
          </div>
        </div>
      </button>

      {/* ========================================================= */}
      {/* ROW 4 · A: TYPE · B: Réserver · C: Post-prod · D: Assistant */}

      {/* E-COMMERCE — cols A+B (1-7), rows 2-3 : unifie Type + Machines */}
      <div style={{gridColumn:'1 / 7', gridRow:'2 / 4', background:'#fff', display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0, position:'relative'}}>
        {/* Header: title + toggle on same line */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'24px 18px 0',gap:12,flexShrink:0}}>
          <div style={{fontSize:'clamp(22px, 2.4vw, 32px)',fontWeight:300,letterSpacing:'-0.03em',lineHeight:1,color:'#141414',whiteSpace:'nowrap',minWidth:0,overflow:'hidden',textOverflow:'ellipsis'}}>
            {lang==='fr'?'Shooting e-commerce':'E-commerce shooting'}
          </div>
          {/* Toggle */}
          <div style={{display:'flex',border:'1px solid #141414',padding:2,gap:2,flexShrink:0}}>
            {[
              {v:'type',    fr:'Par catégorie', en:'By category'},
              {v:'machine', fr:'Par machine',   en:'By machine'},
            ].map(o=>{
              const active = ecomMode===o.v;
              return (
                <button key={o.v} onClick={()=>setEcomMode(o.v)} style={{
                  border:0, cursor:'pointer', padding:'5px 12px',
                  background: active?'#141414':'transparent',
                  color: active?'#fff':'#141414',
                  fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase',
                  transition:'all .15s', whiteSpace:'nowrap',
                }}>{lang==='fr'?o.fr:o.en}</button>
              );
            })}
          </div>
        </div>

        {/* Subline */}
        <div style={{padding:'6px 18px 14px',flexShrink:0}}>
          <div style={{fontSize:11,color:'#888',fontFamily:'var(--font-mono)',letterSpacing:'0.08em',textTransform:'uppercase'}}>
            {lang==='fr'
              ? '4 solutions intelligentes'
              : '4 smart solutions'}
          </div>
        </div>

        {/* Content — either categories grid OR machines list */}
        <div style={{flex:1,minHeight:0,display:'flex',overflow:'hidden',background:'#fff'}}>
          {ecomMode==='type' ? (
            <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(6, 1fr)',alignContent:'end'}}>
              {categories.map((c,i)=>(
                <button key={c.k} onClick={()=>goto('gallery')} style={{
                  background:'#fff',border:0,
                  borderRight: i%6===5 ? 'none' : '1px solid var(--edo-gray-200)',
                  borderTop: '1px solid var(--edo-gray-200)',
                  cursor:'pointer',textAlign:'left',
                  padding:'12px 10px',display:'flex',flexDirection:'column',justifyContent:'space-between',
                  transition:'background .15s',color:'#141414',fontFamily:'inherit',
                  minWidth:0,overflow:'hidden',gap:8,aspectRatio:'1 / 1',
                }} {...hoverGray}>
                  <CatIcon kind={c.k} size={20}/>
                  <div style={{fontSize:11,fontWeight:500,letterSpacing:'-0.005em',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{lang==='fr'?c.fr:c.en}</div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(4, 1fr)',alignContent:'end'}}>
              {ecomMachines.map((m,i)=>(
                <button key={m.slug} onClick={()=>goto('plateau-'+m.slug)} style={{
                  background:'#fff',border:0,
                  borderRight: i%4===3 ? 'none' : '1px solid var(--edo-gray-200)',
                  borderTop: '1px solid var(--edo-gray-200)',
                  cursor:'pointer',textAlign:'left',
                  padding:'14px 14px',display:'flex',flexDirection:'column',justifyContent:'space-between',
                  transition:'background .15s',color:'#141414',fontFamily:'inherit',
                  minWidth:0,overflow:'hidden',gap:10,aspectRatio:'1 / 1',
                }} {...hoverGray}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:9,color:'#888',letterSpacing:'0.15em'}}>
                      {String(i+1).padStart(2,'0')}
                    </span>
                    <IconArrowRight width="16" height="16" stroke="#888"/>
                  </div>
                  <div>
                    <div style={{fontSize:15,fontWeight:500,letterSpacing:'-0.015em',lineHeight:1.05,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m[lang].t}</div>
                    <div style={{fontSize:9,fontFamily:'var(--font-mono)',color:'#888',marginTop:3,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m[lang].sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Post-production — col C (7-10), rows 4-5, starts below Réserver (85px offset) */}
      <button onClick={()=>goto('postprod')} style={{...cellBase, gridColumn:'7 / 10', gridRow:'4 / 6', background:'#fff',color:'#141414',padding:'18px 20px', alignSelf:'stretch', height:'calc(100% - 85px)', marginTop:85}} {...hoverGray}>
        <CellLabel>{lang==='fr'?'Service':'Service'}</CellLabel>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',width:'100%',gap:10}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:'clamp(22px, 2.4vw, 32px)',fontWeight:300,letterSpacing:'-0.03em',lineHeight:1,color:'#141414',whiteSpace:'nowrap'}}>Post-production</div>
            <div style={{fontSize:11,color:'#888',marginTop:6,fontFamily:'var(--font-mono)',letterSpacing:'0.08em',textTransform:'uppercase'}}>{lang==='fr'?'Retouche · Photo & Vidéo':'Retouching · Photo & Video'}</div>
          </div>
          <IconArrowRight width="16" height="16"/>
        </div>
      </button>

      {/* Assistant — col D (10-13) only */}
      <AssistantChat lang={lang}/>

      {/* ========================================================= */}
      {/* ROW 5 · Socials · Brands marquee · Contact */}
      {[
        {k:'instagram',label:'IG',href:'https://www.instagram.com/edostudio/'},
        {k:'linkedin',label:'LI',href:'https://www.linkedin.com/company/e-do/'},
        {k:'facebook',label:'FB',href:'https://www.facebook.com/EdoStudioAgency/'},
        {k:'tiktok',label:'TT',href:'https://www.tiktok.com/@edostudio'}
      ].map((s,i)=>(
        <a key={s.k} href={s.href} target="_blank" rel="noopener" style={{gridColumn:`${1+i}`, gridRow:'6', background:'#fff',textDecoration:'none',color:'#141414',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 12px',transition:'background .15s'}}
          {...hoverGray}>
          <SocialIcon kind={s.k} size={12}/>
          <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.15em'}}>{s.label}</span>
        </a>
      ))}

      <div style={{gridColumn:'5 / 13', gridRow:'6', background:'#fff',overflow:'hidden',minWidth:0,display:'flex',alignItems:'center'}}>
        <MarqueeCell size={20}/>
      </div>

    </div>
  );
};

Object.assign(window, { DirectionA });
