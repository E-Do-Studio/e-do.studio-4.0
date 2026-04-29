/* global React, IconArrowRight, IconMenu, Wordmark, CellLabel, MarqueeCell, PLATEAUX, useBreakpoint */

/* =================================================================
   GALLERY V3 — duplicated from GalleryPageV2.
   Same row structure, but the brand name is rotated vertically.
   ================================================================= */

(() => {

const { useState: useStateGal, useMemo: useMemoGal } = React;

const CATEGORIES_GAL = [
  {k:'pap',        fr:'Prêt-à-porter',   en:'Ready-to-wear'},
  {k:'accessoires',fr:'Accessoires',     en:'Accessories'},
  {k:'eyewear',    fr:'Eyewear',         en:'Eyewear'},
  {k:'bijoux',     fr:'Bijoux',          en:'Jewelry'},
  {k:'cosmetique', fr:'Cosmétique',      en:'Cosmetics'},
  {k:'food',       fr:'Food & Spiritueux', en:'Food & Spirits'},
];

const PROJECTS = [
  {id:1,  title:'Maison Ortho',         cat:'pap',         plateau:'cyclorama', year:2026, refs:48, tone:'mono'},
  {id:2,  title:'Le Monde Béryl',        cat:'accessoires', plateau:'horizontal', year:2026, refs:32, tone:'mono'},
  {id:3,  title:'Atelier Soie',          cat:'pap',         plateau:'vertical',  year:2026, refs:24, tone:'warm'},
  {id:4,  title:'Kôji — Chapter 3',      cat:'eyewear',     plateau:'eclipse',   year:2025, refs:18, tone:'mono'},
  {id:5,  title:'Rue Saint-Honoré',      cat:'cosmetique',  plateau:'horizontal',year:2025, refs:40, tone:'warm'},
  {id:6,  title:'Ganymède',              cat:'bijoux',      plateau:'eclipse',   year:2025, refs:22, tone:'dark'},
  {id:7,  title:'Moa Studio FW26',       cat:'pap',         plateau:'live',      year:2026, refs:56, tone:'dark'},
  {id:8,  title:'Maison Margin',         cat:'pap',         plateau:'vertical',  year:2025, refs:30, tone:'mono'},
  {id:9,  title:'Toby Ombré',            cat:'food',        plateau:'horizontal',year:2026, refs:14, tone:'warm'},
  {id:10, title:'Noir Étoilé',           cat:'cosmetique',  plateau:'cyclorama', year:2025, refs:28, tone:'dark'},
  {id:11, title:'Orbite',                cat:'eyewear',     plateau:'eclipse',   year:2025, refs:16, tone:'mono'},
  {id:12, title:'Studio 11',             cat:'accessoires', plateau:'horizontal',year:2026, refs:36, tone:'warm'},
  {id:13, title:'Parure',                cat:'bijoux',      plateau:'eclipse',   year:2026, refs:20, tone:'mono'},
  {id:14, title:'Rue Cadet',             cat:'pap',         plateau:'cyclorama', year:2025, refs:44, tone:'dark'},
  {id:15, title:'Atelier Bois',          cat:'food',        plateau:'horizontal',year:2025, refs:12, tone:'warm'},
  {id:16, title:'Maison Ardent',         cat:'pap',         plateau:'vertical',  year:2026, refs:26, tone:'mono'},
  {id:17, title:'Saar Paris',            cat:'accessoires', plateau:'eclipse',   year:2026, refs:34, tone:'dark'},
  {id:18, title:'Solène',                cat:'bijoux',      plateau:'cyclorama', year:2025, refs:18, tone:'warm'},
];

const PLATEAU_OPTIONS = [
  {k:'cyclorama',  fr:'Cyclorama', en:'Cyclorama'},
  {k:'horizontal', fr:'Horizontal', en:'Horizontal'},
  {k:'vertical',   fr:'Vertical',   en:'Vertical'},
  {k:'eclipse',    fr:'Eclipse',    en:'Eclipse'},
  {k:'live',       fr:'Live',       en:'Live'},
];

/* Category → compatible plateaus (editorial mapping, independent of project data) */
const CAT_PLATEAU_MAP = {
  pap:         ['cyclorama','horizontal','vertical','live'],
  accessoires: ['cyclorama','eclipse'],
  eyewear:     ['cyclorama','eclipse'],
  bijoux:      ['cyclorama','eclipse'],
  cosmetique:  ['cyclorama','eclipse'],
  food:        ['cyclorama','eclipse'],
};
/* Inverted: plateau → compatible categories */
const PLATEAU_CAT_MAP = (() => {
  const out = {};
  PLATEAU_OPTIONS.forEach(p => { out[p.k] = []; });
  Object.entries(CAT_PLATEAU_MAP).forEach(([c, plats]) => {
    plats.forEach(p => { if(out[p]) out[p].push(c); });
  });
  return out;
})();

/* Bento footprint pattern — repeats every 12 tiles.
   Grid is 6 columns. Each number = [colSpan, rowSpan]. */
const BENTO_SHAPES = [
  [3,2], [2,1], [1,1], [2,1], [1,1],   // row 1-2
  [2,1], [2,2], [2,1],                  // row 3
  [1,1], [3,1], [2,1],                  // row 4
  [2,1],                                // row 5
];

/* Project cover — generative placeholder */
const ProjectCover = ({ project, dense }) => {
  const { tone, id } = project;
  const palettes = {
    mono: {bg:'#f0f0f0', accent:'#141414', soft:'#bfbfbf'},
    dark: {bg:'#141414', accent:'#f5f5f5', soft:'#2a2a2a'},
    warm: {bg:'#e8dfcf', accent:'#141414', soft:'#b8ad94'},
  };
  const p = palettes[tone] || palettes.mono;
  const layout = id % 4;
  return (
    <div style={{position:'relative',width:'100%',height:'100%',background:p.bg,overflow:'hidden'}}>
      <svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
        {layout===0 && (<><rect x="60" y="80" width="180" height="240" fill={p.soft}/><circle cx="150" cy="180" r="60" fill={p.accent}/></>)}
        {layout===1 && (<><rect x="0" y="220" width="300" height="160" fill={p.soft}/><rect x="100" y="110" width="100" height="210" fill={p.accent}/></>)}
        {layout===2 && (<><circle cx="150" cy="220" r="120" fill={p.soft}/><rect x="130" y="60" width="40" height="200" fill={p.accent}/></>)}
        {layout===3 && (<><path d={`M 0 380 Q 150 150 300 380 Z`} fill={p.soft}/><circle cx="150" cy="140" r="48" fill={p.accent}/></>)}
      </svg>
    </div>
  );
};

/* Filter chip cell — white, orange left border when active, compact */
const FilterCell = ({ label, active, onClick, count, dimmed }) => (
  <button onClick={onClick} style={{
    border:0,borderLeft:active?'2px solid var(--edo-orange)':'2px solid transparent',
    borderBottom:'1px solid var(--edo-gray-200)',
    background: active ? 'var(--edo-gray-100)' : '#fff', cursor:'pointer',textAlign:'left',
    padding:'9px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,width:'100%',
    fontFamily:'inherit',fontSize:13,
    fontWeight: active ? 500 : 400,
    color:'#141414',
    letterSpacing:'-0.01em',
    transition:'background .15s, opacity .15s',
    flexShrink:0,
    opacity: dimmed ? 0.32 : 1,
  }}
    onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background='var(--edo-gray-100)'; } }}
    onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='#fff'; } }}>
    <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</span>
    {count!=null && <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',color:active?'var(--edo-orange)':'#888',flexShrink:0}}>{count}</span>}
  </button>
);

/* Section header cell */
const FilterHeader = ({ label }) => (
  <div style={{background:'#fff',padding:'8px 14px 4px',display:'flex',alignItems:'center',flexShrink:0,borderBottom:'1px solid var(--edo-gray-200)'}}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:'#aaa'}}>{label}</span>
  </div>
);

const GalleryPageV3 = ({ lang, setLang, openMenu, goto }) => {
  const [cat, setCat]         = useStateGal('all');
  const [plateau, setPlateau] = useStateGal('all');
  const [filtersOpen, setFiltersOpen] = useStateGal(false);
  const { isMobile } = useBreakpoint();

  const filtered = useMemoGal(()=>(
    PROJECTS.filter(p => (cat==='all' || p.cat===cat) && (plateau==='all' || p.plateau===plateau))
  ), [cat, plateau]);

  const countCat = (k) => k==='all' ? PROJECTS.length : PROJECTS.filter(p=>p.cat===k).length;
  const countPlat = (k) => k==='all' ? PROJECTS.length : PROJECTS.filter(p=>p.plateau===k).length;
  const activeFilterCount = (cat!=='all'?1:0) + (plateau!=='all'?1:0);

  /* ---- Mobile layout ---- */
  if (isMobile) {
    return (
      <div style={{height:'100%',overflowY:'auto',overflowX:'hidden',background:'#000',display:'flex',flexDirection:'column',gap:1}}>
        {/* Header */}
        <div style={{display:'flex',gap:1,flexShrink:0,background:'#000'}}>
          <button onClick={()=>goto('home')} style={{flex:1,background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:12,height:52}}>
            <Wordmark size={28}/>
          </button>
          <button onClick={()=>goto('book')} style={{flex:'0 0 auto',background:'var(--edo-orange)',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 14px',gap:6,height:52}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'#fff',whiteSpace:'nowrap'}}>{lang==='fr'?'Réserver':'Book'}</span>
          </button>
          <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 52px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',height:52}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.15em',color:'#141414'}}>{lang==='fr'?'EN':'FR'}</span>
          </button>
          <button onClick={openMenu} style={{flex:'0 0 52px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',height:52}}>
            <IconMenu width="18" height="18"/>
          </button>
        </div>

        {/* Filter bar */}
        <div style={{background:'#fff',padding:'0 16px',display:'flex',alignItems:'center',gap:8,height:44,flexShrink:0,overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <span className="edo-cell-label" style={{flexShrink:0}}>{lang==='fr'?'Galerie':'Gallery'}</span>
          <div style={{flex:1}}/>
          <button onClick={()=>setFiltersOpen(!filtersOpen)} style={{flexShrink:0,border:'1px solid #141414',background:activeFilterCount>0?'#141414':'#fff',color:activeFilterCount>0?'#fff':'#141414',padding:'6px 12px',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.18em',textTransform:'uppercase',cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
            {lang==='fr'?'Filtres':'Filters'} {activeFilterCount>0 && `(${activeFilterCount})`}
          </button>
          {(cat!=='all'||plateau!=='all') && (
            <button onClick={()=>{setCat('all');setPlateau('all');}} style={{flexShrink:0,border:0,background:'#fff',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--edo-orange)',cursor:'pointer',whiteSpace:'nowrap',padding:'6px 8px'}}>
              ↺
            </button>
          )}
        </div>

        {/* Filters drawer — collapsed by default */}
        {filtersOpen && (
          <div style={{background:'#fff',borderTop:'1px solid var(--edo-gray-200)',flexShrink:0,display:'flex',gap:1,background:'#000',flexWrap:'wrap'}}>
            {/* Categories */}
            <div style={{flex:'1 1 50%',background:'#fff',display:'flex',flexDirection:'column',minWidth:0}}>
              <div style={{padding:'8px 14px 4px',borderBottom:'1px solid var(--edo-gray-200)'}}><span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:'#aaa'}}>{lang==='fr'?'Catégories':'Categories'}</span></div>
              <FilterCell label={lang==='fr'?'Tout':'All'} active={cat==='all'} count={countCat('all')} onClick={()=>setCat('all')}/>
              {CATEGORIES_GAL.map(c=>{
                const catDim = plateau!=='all' && !(PLATEAU_CAT_MAP[plateau]||[]).includes(c.k);
                return <FilterCell key={c.k} label={c[lang]} active={cat===c.k} count={countCat(c.k)} dimmed={catDim} onClick={()=>{ if(catDim){setPlateau('all');} setCat(c.k); }}/>;
              })}
            </div>
            {/* Plateaux */}
            <div style={{flex:'1 1 50%',background:'#fff',display:'flex',flexDirection:'column',minWidth:0,borderLeft:'1px solid var(--edo-gray-200)'}}>
              <div style={{padding:'8px 14px 4px',borderBottom:'1px solid var(--edo-gray-200)'}}><span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:'#aaa'}}>{lang==='fr'?'Plateaux':'Stages'}</span></div>
              <FilterCell label={lang==='fr'?'Tout':'All'} active={plateau==='all'} count={countPlat('all')} onClick={()=>setPlateau('all')}/>
              {PLATEAU_OPTIONS.map(p=>{
                const platDim = cat!=='all' && !(CAT_PLATEAU_MAP[cat]||[]).includes(p.k);
                return <FilterCell key={p.k} label={p[lang]} active={plateau===p.k} count={countPlat(p.k)} dimmed={platDim} onClick={()=>{ if(platDim){setCat('all');} setPlateau(p.k); }}/>;
              })}
            </div>
          </div>
        )}

        {/* Gallery grid — 2 columns on mobile */}
        <div style={{flex:1,background:'#000',display:'flex',flexDirection:'column',gap:1}}>
          {filtered.length===0 ? (
            <div style={{background:'#fff',padding:'40px 24px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,color:'#888'}}>
              <span className="edo-cell-label">{lang==='fr'?'Aucun résultat':'No results'}</span>
              <button onClick={()=>{setCat('all');setPlateau('all');}} style={{marginTop:8,border:'1px solid #141414',background:'#fff',padding:'8px 16px',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',cursor:'pointer'}}>{lang==='fr'?'Réinitialiser':'Reset'}</button>
            </div>
          ) : filtered.map((proj)=>{
            const cfg = CATEGORIES_GAL.find(c=>c.k===proj.cat);
            return (
              <div key={proj.id} style={{background:'#000',display:'grid',gridTemplateColumns:'1fr 1fr',gap:1}}>
                {[0,1].map(n=>(
                  <div key={n} style={{background:'#fff',aspectRatio:'4/5',position:'relative',overflow:'hidden'}}>
                    <ProjectCover project={{...proj, id: proj.id*3 + n}}/>
                    {n===0 && (
                      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'8px 10px',background:'rgba(255,255,255,.92)'}}>
                        <div style={{fontSize:11,fontWeight:500,letterSpacing:'-0.01em',color:'#141414',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{proj.title}</div>
                        <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'#888',letterSpacing:'0.05em'}}>{cfg?.[lang] || proj.cat} · {proj.year}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr',gridTemplateRows:'52px 1fr',gap:1,background:'#000',height:'100%',width:'100%',overflow:'hidden'}}>

      {/* ========== HEADER — one row, cells separated by filets ========== */}
      <div style={{gridColumn:'1',gridRow:'1',background:'#000',display:'flex',gap:1,minWidth:0}}>
        <button onClick={()=>goto('home')} style={{flex:'0 0 190px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:8}}>
          <Wordmark size={32}/>
        </button>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 24px',display:'flex',alignItems:'center',minWidth:0,gap:16}}>
          <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{lang==='fr'?'Galerie':'Gallery'}</span>
        </div>
        <button onClick={()=>goto('plateau-live')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Plateaux':'Stages'}</span>
          <IconArrowRight width="12" height="12"/>
        </button>
        <button onClick={()=>goto('postprod')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 18.33px',gap:8}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Post-prod':'Post-prod'}</span>
          <IconArrowRight width="12" height="12"/>
        </button>
        <button onClick={()=>goto('book')} style={{flex:'0 0 auto',background:'var(--edo-orange)',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 24px',gap:10,transition:'filter .15s'}}
          onMouseEnter={e=>e.currentTarget.style.filter='brightness(1.08)'}
          onMouseLeave={e=>e.currentTarget.style.filter='none'}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.05em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#fff'}}>{lang==='fr'?'Réserver':'Book'}</span>
          <IconArrowRight width="14" height="14" stroke="#fff"/>
        </button>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 54px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
          <span style={{color:'#141414',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.15em'}}>{lang==='fr'?'EN':'FR'}</span>
        </button>
      </div>

      {/* ========== BODY: left rail + right uniform grid ========== */}
      <div style={{gridColumn:'1',gridRow:'2',background:'#000',display:'grid',gridTemplateColumns:'190px 1fr',gap:1,overflow:'hidden',minHeight:0}}>

        {/* --- LEFT RAIL — single white column, no inner gaps --- */}
        <aside style={{background:'#fff',display:'flex',flexDirection:'column',overflowY:'auto',minHeight:0}}>
          <FilterHeader label={lang==='fr'?'Catégories':'Categories'}/>
          <FilterCell label={lang==='fr'?'Tout':'All'} active={cat==='all'} count={countCat('all')} onClick={()=>setCat('all')}/>
          {CATEGORIES_GAL.map(c=>{
            const catDim = plateau!=='all' && !(PLATEAU_CAT_MAP[plateau]||[]).includes(c.k);
            return (
              <FilterCell key={c.k} label={c[lang]} active={cat===c.k} count={countCat(c.k)} dimmed={catDim}
                onClick={()=>{ if(catDim){ setPlateau('all'); } setCat(c.k); }}/>
            );
          })}

          <FilterHeader label={lang==='fr'?'Plateaux':'Stages'}/>
          <FilterCell label={lang==='fr'?'Tout':'All'} active={plateau==='all'} count={countPlat('all')} onClick={()=>setPlateau('all')}/>
          {PLATEAU_OPTIONS.map(p=>{
            const platDim = cat!=='all' && !(CAT_PLATEAU_MAP[cat]||[]).includes(p.k);
            return (
              <FilterCell key={p.k} label={p[lang]} active={plateau===p.k} count={countPlat(p.k)} dimmed={platDim}
                onClick={()=>{ if(platDim){ setCat('all'); } setPlateau(p.k); }}/>
            );
          })}

          {(cat!=='all' || plateau!=='all') && (
            <button onClick={()=>{setCat('all');setPlateau('all');}} style={{border:0,background:'#fff',padding:'12px 14px',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--edo-orange)',textAlign:'left',borderBottom:'1px solid var(--edo-gray-200)',flexShrink:0}}>
              ↺ {lang==='fr'?'Réinitialiser':'Reset'}
            </button>
          )}
        </aside>

        {/* --- RIGHT: rows with left label + 3 images --- */}
        <div style={{background:'#000',overflowY:'auto',minHeight:0}}>
        <div style={{background:'#000',display:'flex',flexDirection:'column',gap:1}}>
          {filtered.length===0 ? (
            <div style={{background:'#fff',padding:'80px 24px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,color:'#888',minHeight:400}}>
              <span className="edo-cell-label">{lang==='fr'?'Aucun résultat':'No results'}</span>
              <span style={{fontSize:13}}>{lang==='fr'?'Essayez un autre filtre.':'Try another filter.'}</span>
              <button onClick={()=>{setCat('all');setPlateau('all');}} style={{marginTop:10,border:'1px solid #141414',background:'#fff',padding:'8px 16px',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',cursor:'pointer'}}>
                {lang==='fr'?'Réinitialiser':'Reset'}
              </button>
            </div>
          ) : filtered.map((proj, i)=>{
            const cfg = CATEGORIES_GAL.find(c=>c.k===proj.cat);
            const plat = PLATEAU_OPTIONS.find(p=>p.k===proj.plateau);
            return (
              <div key={proj.id} style={{
                background:'#000',display:'grid',gridTemplateColumns:'80px repeat(3, 1fr)',gap:1,
              }}>
                {/* Left label cell — vertical name */}
                <button onClick={()=>{}} style={{
                  border:0,background:'#fff',cursor:'pointer',padding:'14px 10px',textAlign:'left',
                  display:'flex',flexDirection:'column',justifyContent:'space-between',alignItems:'center',
                  fontFamily:'inherit',position:'relative',overflow:'hidden',
                }}>
                  {/* top: id */}
                  <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.12em',color:'#888',alignSelf:'flex-start'}}>
                    {String(proj.id).padStart(2,'0')}
                  </span>
                  {/* middle: vertical name */}
                  <div style={{
                    flex:'1 1 auto',display:'flex',alignItems:'center',justifyContent:'center',
                    writingMode:'vertical-rl',transform:'rotate(180deg)',
                    padding:'8px 0',minHeight:0,
                  }}>
                    <span style={{
                      fontSize:22,fontWeight:500,letterSpacing:'-0.015em',color:'#141414',lineHeight:1,
                      whiteSpace:'nowrap',
                    }}>
                      {proj.title}
                    </span>
                  </div>
                  {/* bottom: year */}
                  <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.12em',color:'#888',alignSelf:'flex-start'}}>
                    {proj.year}
                  </span>
                </button>
                {/* 3 image cells */}
                {[0,1,2].map(n => (
                  <div key={n} style={{background:'#fff',aspectRatio:'4/5',position:'relative',overflow:'hidden'}}>
                    <ProjectCover project={{...proj, id: proj.id*3 + n}}/>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { GalleryPageV3 });

})();

