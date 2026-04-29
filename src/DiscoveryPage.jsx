/* global React, IconArrowRight, IconMenu, Wordmark, CellLabel, MarqueeCell */

/* =================================================================
   DISCOVERY — full bento grid (no left rail)
   Filters are cells inside the bento. Article tiles have varied
   footprints driven by id.
   ================================================================= */

const { useState: useStateDisc, useMemo: useMemoDisc } = React;

const POSTS = [
  {id:1,  kind:'journal',   tone:'warm', cat:{fr:'Journal',en:'Journal'},       title:{fr:'Derrière la scène · Maison Ortho FW26',en:'Behind the scenes · Maison Ortho FW26'}, date:{fr:'14 mars 2026',en:'Mar 14, 2026'}, read:'6 min', featured:true},
  {id:2,  kind:'tutorial',  tone:'mono', cat:{fr:'Tuto',en:'Tutorial'},          title:{fr:'Calibrer son cyclo — guide Broncolor Para 222',en:'Calibrating your cyclo — Broncolor Para 222 guide'}, date:{fr:'28 février',en:'Feb 28'}, read:'4 min'},
  {id:3,  kind:'interview', tone:'dark', cat:{fr:'Entretien',en:'Interview'},    title:{fr:'Claire Laurent · vingt ans de plateau',en:'Claire Laurent · twenty years on set'}, date:{fr:'20 février',en:'Feb 20'}, read:'9 min'},
  {id:4,  kind:'recipe',    tone:'warm', cat:{fr:'Recette',en:'Recipe'},         title:{fr:'Le still-life du lundi — huile, main, lumière',en:'Monday still-life — oil, hand, light'}, date:{fr:'12 février',en:'Feb 12'}, read:'3 min'},
  {id:5,  kind:'news',      tone:'mono', cat:{fr:'Studio',en:'Studio'},          title:{fr:'Le plateau Eclipse ouvre ses portes',en:'Eclipse stage is now open'}, date:{fr:'3 février',en:'Feb 3'}, read:'2 min'},
  {id:6,  kind:'journal',   tone:'dark', cat:{fr:'Journal',en:'Journal'},        title:{fr:'Une nuit sur le plateau Live · Moa FW26',en:'A night on the Live stage · Moa FW26'}, date:{fr:'25 janvier',en:'Jan 25'}, read:'7 min'},
  {id:7,  kind:'tutorial',  tone:'warm', cat:{fr:'Tuto',en:'Tutorial'},          title:{fr:'Tendre un fond papier sans pli',en:'How to hang a seamless backdrop'}, date:{fr:'18 janvier',en:'Jan 18'}, read:'5 min'},
  {id:8,  kind:'interview', tone:'mono', cat:{fr:'Entretien',en:'Interview'},    title:{fr:'Tomás Vidal · le e-commerce sans triche',en:'Tomás Vidal · honest e-commerce'}, date:{fr:'9 janvier',en:'Jan 9'}, read:'8 min'},
  {id:9,  kind:'news',      tone:'dark', cat:{fr:'Studio',en:'Studio'},          title:{fr:'Bilan 2025 · 284 projets, 6 plateaux',en:'2025 review · 284 projects, 6 stages'}, date:{fr:'2 janvier',en:'Jan 2'}, read:'4 min'},
];

const KINDS = [
  {k:'all',       fr:'Tout',        en:'All'},
  {k:'journal',   fr:'Journal',     en:'Journal'},
  {k:'tutorial',  fr:'Tutos',       en:'Tutorials'},
  {k:'interview', fr:'Entretiens',  en:'Interviews'},
  {k:'news',      fr:'Studio',      en:'Studio news'},
  {k:'recipe',    fr:'Recettes',    en:'Recipes'},
];

/* Bento footprint pattern for non-featured posts — 6-column grid */
const BENTO_SHAPES_D = [
  [2,1], [2,2], [2,1],
  [3,1], [3,1],
  [2,1], [2,1], [2,1],
  [4,1], [2,1],
];

/* Generative cover art — abstract composition per post */
const PostCover = ({ post, big }) => {
  const palettes = {
    mono: {bg:'#f3f3f3', ink:'#141414', soft:'#c4c4c4'},
    dark: {bg:'#141414', ink:'#f3d9b6', soft:'#3a3a3a'},
    warm: {bg:'#eadfcb', ink:'#141414', soft:'#c8b994'},
  };
  const p = palettes[post.tone];
  const layout = post.id % 5;
  return (
    <div style={{position:'relative',width:'100%',height:'100%',background:p.bg,overflow:'hidden'}}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
        {layout===0 && (<><rect x="50" y="40" width="300" height="200" fill={p.soft}/><circle cx="200" cy="140" r="58" fill={p.ink}/></>)}
        {layout===1 && (<><rect x="0" y="180" width="400" height="140" fill={p.soft}/><rect x="140" y="60" width="120" height="200" fill={p.ink}/></>)}
        {layout===2 && (<><path d="M 0 300 Q 200 60 400 300 Z" fill={p.soft}/><circle cx="200" cy="120" r="42" fill={p.ink}/></>)}
        {layout===3 && (<><g stroke={p.soft} strokeWidth="14" fill="none"><line x1="-20" y1="80" x2="420" y2="80"/><line x1="-20" y1="150" x2="420" y2="150"/><line x1="-20" y1="220" x2="420" y2="220"/></g><rect x="160" y="110" width="80" height="80" fill={p.ink}/></>)}
        {layout===4 && (<><circle cx="120" cy="150" r="90" fill={p.soft}/><circle cx="260" cy="150" r="60" fill={p.ink} opacity="0.85"/></>)}
      </svg>
      {big && (
        <span style={{position:'absolute',bottom:12,right:12,fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.1em',color:post.tone==='dark'?'rgba(243,217,182,.7)':'#888'}}>
          {post.read}
        </span>
      )}
    </div>
  );
};

/* Filter chip cell */
/* Filter chip cell — bento-style with black filets */
const FilterCellD = ({ label, active, onClick, count }) => (
  <button onClick={onClick} style={{
    border:0,background: active ? '#141414' : '#fff', cursor:'pointer',textAlign:'left',
    padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,width:'100%',
    fontFamily:'inherit',fontSize:13,
    fontWeight: active ? 500 : 400,
    color: active ? '#fff' : '#141414',
    letterSpacing:'-0.01em',
    transition:'background .15s, color .15s',
  }}
    onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background='#f5f5f5'; } }}
    onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='#fff'; } }}>
    <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</span>
    {count!=null && <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',opacity:active?0.7:0.45,flexShrink:0}}>{count}</span>}
  </button>
);

/* Section header cell */
const FilterHeaderD = ({ label }) => (
  <div style={{background:'#fff',padding:'7px 16px',display:'flex',alignItems:'center'}}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:'#aaa'}}>{label}</span>
  </div>
);

const DiscoveryPage = ({ lang, setLang, openMenu, goto }) => {
  const [kind, setKind] = useStateDisc('all');

  const filtered = useMemoDisc(()=>(
    kind==='all' ? POSTS : POSTS.filter(p=>p.kind===kind)
  ), [kind]);

  const featured = filtered.find(p=>p.featured) || filtered[0];
  const rest = featured ? filtered.filter(p=>p.id!==featured.id) : [];

  const countKind = (k) => k==='all' ? POSTS.length : POSTS.filter(p=>p.kind===k).length;

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr',gridTemplateRows:'52px 1fr',gap:1,background:'#000',height:'100%',width:'100%',overflow:'hidden'}}>

      {/* HEADER — one row, all cells separated by filets */}
      <div style={{gridColumn:'1',gridRow:'1',background:'#000',display:'flex',gap:1,minWidth:0}}>
        <button onClick={()=>goto('home')} style={{flex:'0 0 190px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:8}}>
          <Wordmark size={32}/>
        </button>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 24px',display:'flex',alignItems:'center',minWidth:0,gap:16}}>
          <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{lang==='fr'?'Discovery':'Discovery'}</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.1em',color:'#888'}}>
            {filtered.length}/{POSTS.length} {lang==='fr'?'articles':'posts'}
          </span>
        </div>
        <button onClick={()=>goto('plateau-live')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Plateaux':'Stages'}</span>
          <IconArrowRight width="12" height="12"/>
        </button>
        <button onClick={()=>goto('postprod')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Post-prod':'Post-prod'}</span>
          <IconArrowRight width="12" height="12"/>
        </button>
        <button onClick={()=>goto('gallery')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Galerie':'Gallery'}</span>
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

      {/* BODY: left rail + right content */}
      <div style={{gridColumn:'1',gridRow:'2',background:'#000',display:'grid',gridTemplateColumns:'190px 1fr',gap:1,overflow:'hidden',minHeight:0}}>

        {/* LEFT RAIL — bento filter column */}
        <aside style={{background:'#000',display:'flex',flexDirection:'column',gap:1,overflowY:'auto',minHeight:0}}>
          <FilterHeaderD label={lang==='fr'?'Rubriques':'Sections'}/>
          <FilterCellD label={lang==='fr'?'Tout':'All'} active={kind==='all'} count={POSTS.length} onClick={()=>setKind('all')}/>
          {KINDS.filter(k=>k.k!=='all').map(k=>{
            const c = POSTS.filter(p=>p.kind===k.k).length;
            return <FilterCellD key={k.k} label={k[lang]} active={kind===k.k} count={c} onClick={()=>setKind(k.k)}/>;
          })}

          {/* flexible tail to push newsletter to bottom */}
          <div style={{flex:'1 1 auto',background:'#fff',minHeight:20}}/>

          <FilterHeaderD label={lang==='fr'?'Newsletter':'Newsletter'}/>
          <div style={{background:'#fff',padding:'12px 16px 14px',display:'flex',flexDirection:'column',gap:10}}>
            <p style={{margin:0,fontSize:12,fontWeight:300,lineHeight:1.35,color:'#595959'}}>
              {lang==='fr'?'Édition mensuelle — coulisses, tutos, entretiens.':'Monthly — behind the scenes, tutorials, interviews.'}
            </p>
            <div style={{display:'flex',borderBottom:'1px solid #141414'}}>
              <input placeholder="email@studio.com" style={{flex:1,border:0,padding:'6px 0',background:'transparent',color:'#141414',fontFamily:'inherit',fontSize:12,outline:'none',minWidth:0}}/>
              <button style={{border:0,background:'transparent',color:'#141414',cursor:'pointer',padding:'0 4px',display:'flex',alignItems:'center'}}>
                <IconArrowRight width="12" height="12"/>
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT: uniform grid */}
        <div style={{background:'#000',overflowY:'auto',minHeight:0}}>

        {/* Featured — full-width clean */}
        {featured && (
          <div style={{background:'#fff'}}>
            <button onClick={()=>{}} style={{
              width:'100%',border:0,background:'#fff',cursor:'pointer',padding:0,textAlign:'left',
              display:'grid',gridTemplateColumns:'1.2fr 1fr',minHeight:380,
            }}>
              <div style={{position:'relative'}}><PostCover post={featured} big/></div>
              <div style={{padding:'36px 36px',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:20}}>
                <div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'#aaa',marginBottom:14}}>
                    {lang==='fr'?'À la une':'Featured'}
                  </div>
                  <h1 style={{fontSize:32,fontWeight:300,letterSpacing:'-0.025em',lineHeight:1.1,margin:0,color:'#141414'}}>
                    {featured.title[lang]}
                  </h1>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                  <div style={{display:'flex',gap:10,fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.1em',color:'#888',textTransform:'uppercase'}}>
                    <span>{featured.cat[lang]}</span><span>·</span><span>{featured.date[lang]}</span><span>·</span><span>{featured.read}</span>
                  </div>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'#141414',display:'inline-flex',alignItems:'center',gap:8}}>
                    {lang==='fr'?'Lire':'Read'} <IconArrowRight width="12" height="12"/>
                  </span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Uniform grid */}
        <div style={{marginTop:1,background:'#000',display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:1}}>
          {rest.length===0 ? (
            <div style={{gridColumn:'1 / -1',background:'#fff',padding:'60px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:8,color:'#888'}}>
              <span className="edo-cell-label">{lang==='fr'?'Aucun autre article':'No more posts'}</span>
            </div>
          ) : rest.map((p)=>(
              <button key={p.id} onClick={()=>{}} style={{
                border:0,background:'#fff',cursor:'pointer',padding:0,position:'relative',overflow:'hidden',
                display:'flex',flexDirection:'column',textAlign:'left',aspectRatio:'4/5',
              }}>
                <div style={{flex:'1 1 auto',minHeight:0,position:'relative'}}>
                  <PostCover post={p}/>
                </div>
                <div style={{flex:'0 0 auto',padding:'12px 14px 14px',background:'#fff',display:'flex',flexDirection:'column',gap:4,borderTop:'1px solid #000'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:'#888'}}>{p.cat[lang]}</span>
                  <h3 style={{margin:0,fontSize:14,fontWeight:500,letterSpacing:'-0.01em',lineHeight:1.25,color:'#141414'}}>{p.title[lang]}</h3>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:2,fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.05em',color:'#888'}}>
                    <span>{p.date[lang]}</span>
                    <span>{p.read}</span>
                  </div>
                </div>
              </button>
            ))}
        </div>

        </div>
      </div>
    </div>
  );
};

Object.assign(window, { DiscoveryPage });
