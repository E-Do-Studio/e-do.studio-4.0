/* global React, IconArrowRight, IconMenu, IconPlay, Wordmark, CellLabel */

/* =================================================================
   DISCOVERY — Bento aéré, viewport-fit.
   ~10 cases hétérogènes. Pas de featured. Une case "more" scrollable.
   Clic article = page dédiée plein écran.
   ================================================================= */

const { useState: useDS, useMemo: useDSM } = React;

/* Social icons (local copy) */
const SocialIcon = ({ kind, size=16 }) => {
  const p = {width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:1.4};
  if (kind==='instagram') return (<svg viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>);
  if (kind==='facebook')  return (<svg viewBox="0 0 24 24" {...p}><path d="M14 7h3V4h-3c-2 0-3 1.5-3 3.5V10H8v3h3v8h3v-8h2.5l.5-3H14V8c0-.5.3-1 1-1Z"/></svg>);
  if (kind==='linkedin')  return (<svg viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7M7 7.5v0M11 17v-7M11 13c0-2 1-3 2.5-3s2.5 1 2.5 3v4"/></svg>);
  if (kind==='tiktok')    return (<svg viewBox="0 0 24 24" {...p}><path d="M15 4v9.5a3.5 3.5 0 1 1-3.5-3.5M15 4c0 2.5 2 4 4 4"/></svg>);
  return null;
};

/* ---------- Content -------------------------------------- */
const D_POSTS = [
  {id:1,  cat:'tips',     tone:'warm', tag:{fr:'Tips',en:'Tips'},          title:{fr:'Cinq lumières pour un still-life propre',en:'Five lights for a clean still-life'}, sub:{fr:'Comment poser une boîte et la rendre désirable. Tour des cinq sources qu\u2019on règle dans cet ordre, en commençant par la boîte douce du dessus, et pourquoi la dernière passe se joue souvent au flag.',en:'How to set a box and make it desirable.'}, date:{fr:'14 mars',en:'Mar 14'}, read:'6 min', author:'Léo Marchal'},
  {id:2,  cat:'tuto',     tone:'mono', tag:{fr:'Tuto',en:'Tutorial'},      title:{fr:'Calibrer son cyclorama',en:'Calibrating your cyclorama'}, sub:{fr:'Para 222, charte 18%, balance des blancs.',en:'Para 222, 18% chart, white balance.'}, date:{fr:'28 fév.',en:'Feb 28'}, read:'4 min', author:'Inès Bertrand'},
  {id:3,  cat:'studio',   tone:'dark', tag:{fr:'Studio',en:'Studio'},      title:{fr:'Une nuit sur le plateau Live',en:'A night on the Live stage'}, sub:{fr:'Lookbook Moa FW26 — coulisses d\u2019un tournage de nuit, six looks, deux régies, une équipe qui anticipe.',en:'Moa FW26 lookbook — behind the scenes.'}, date:{fr:'25 jan.',en:'Jan 25'}, read:'7 min', author:'Camille Royer'},
  {id:4,  cat:'tips',     tone:'warm', tag:{fr:'Tips',en:'Tips'},          title:{fr:'Tendre un fond papier sans pli',en:'Hang a seamless without creases'}, sub:{fr:'Le geste, l\u2019humidit\u00e9, la patience.',en:'The gesture, humidity, patience.'}, date:{fr:'18 jan.',en:'Jan 18'}, read:'5 min', author:'Léo Marchal'},
  {id:5,  cat:'studio',   tone:'mono', tag:{fr:'Studio',en:'Studio'},      title:{fr:'Le plateau Eclipse ouvre ses portes',en:'Eclipse stage is now open'}, sub:{fr:'120 m², lumi\u00e8re sud, plafond 5,40m.',en:'120 m², south light, 5.4m ceiling.'}, date:{fr:'3 fév.',en:'Feb 3'}, read:'2 min', author:'Studio'},
  {id:6,  cat:'possible', tone:'warm', tag:{fr:'Possibilités',en:'What\u2019s possible'}, title:{fr:'Tourner photo + vid\u00e9o le m\u00eame jour',en:'Shoot photo + video the same day'}, sub:{fr:'Une \u00e9quipe, deux plateaux, un planning.',en:'One crew, two stages, one plan.'}, date:{fr:'7 mars',en:'Mar 7'}, read:'5 min', author:'Production'},
  {id:7,  cat:'tips',     tone:'mono', tag:{fr:'Tips',en:'Tips'},          title:{fr:'Bien briefer son styliste',en:'How to brief your stylist'}, sub:{fr:'Trois listes, un mood, dix minutes.',en:'Three lists, one mood, ten minutes.'}, date:{fr:'2 mars',en:'Mar 2'}, read:'3 min', author:'Inès Bertrand'},
  {id:8,  cat:'possible', tone:'dark', tag:{fr:'Possibilités',en:'What\u2019s possible'}, title:{fr:'Live shopping depuis le plateau Live',en:'Live shopping from the Live stage'}, sub:{fr:'Multi-cam, r\u00e9gie son, public en salle.',en:'Multi-cam, sound mixing, audience.'}, date:{fr:'15 fév.',en:'Feb 15'}, read:'6 min', author:'Production'},
  {id:9,  cat:'tuto',     tone:'warm', tag:{fr:'Tuto',en:'Tutorial'},      title:{fr:'Étalonner sans LUT — la méthode rapide',en:'Grading without LUT — the quick method'}, sub:{fr:'Trois courbes, deux roues, un œil.',en:'Three curves, two wheels, one eye.'}, date:{fr:'10 fév.',en:'Feb 10'}, read:'8 min', author:'Léo Marchal'},
  {id:10, cat:'studio',   tone:'warm', tag:{fr:'Studio',en:'Studio'},      title:{fr:'La cuisine du studio — chef Anne',en:'The studio kitchen — chef Anne'}, sub:{fr:'Manger bien sur un tournage, ça change tout.',en:'Eating well on a set changes everything.'}, date:{fr:'22 jan.',en:'Jan 22'}, read:'4 min', author:'Studio'},
  {id:11, cat:'tuto',     tone:'mono', tag:{fr:'Tuto',en:'Tutorial'},      title:{fr:'Préparer son shoot en 30 minutes',en:'Prep your shoot in 30 minutes'}, sub:{fr:'Checklist du brief au call sheet.',en:'Brief to call sheet checklist.'}, date:{fr:'5 jan.',en:'Jan 5'}, read:'5 min', author:'Inès Bertrand'},
  {id:12, cat:'possible', tone:'mono', tag:{fr:'Possibilités',en:'What\u2019s possible'}, title:{fr:'Production crew clé en main',en:'Turnkey production crew'}, sub:{fr:'Photographe, styliste, MUA, retoucheur.',en:'Photographer, stylist, MUA, retoucher.'}, date:{fr:'12 déc.',en:'Dec 12'}, read:'4 min', author:'Production'},
];

const D_TESTIMONIAL = {
  q:{fr:'Trois jours, six looks, zéro stress. L\u2019équipe anticipe avant qu\u2019on demande.',en:'Three days, six looks, zero stress.'},
  name:'Hélène Vidal',
  role:{fr:'DA — Maison Ortho',en:'AD — Maison Ortho'},
};

const D_CATS = [
  {k:'all',      fr:'Tout',           en:'All'},
  {k:'tips',     fr:'Tips',           en:'Tips'},
  {k:'tuto',     fr:'Tutos',          en:'Tutorials'},
  {k:'studio',   fr:'Studio',         en:'Studio'},
  {k:'possible', fr:'Possibilités',   en:'Possibilities'},
];

/* Cover SVG abstract */
const DCover = ({ tone='mono', seed=0 }) => {
  const palettes = {
    mono:{bg:'#f1f1f1', a:'#141414', b:'#bcbcbc'},
    dark:{bg:'#141414', a:'#f3d9b6', b:'#3a3a3a'},
    warm:{bg:'#e9dfca', a:'#141414', b:'#c4b594'},
  };
  const p = palettes[tone] || palettes.mono;
  const k = seed % 6;
  return (
    <div style={{position:'relative',width:'100%',height:'100%',background:p.bg,overflow:'hidden'}}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
        {k===0 && <><rect x="40" y="40" width="320" height="220" fill={p.b}/><circle cx="200" cy="150" r="60" fill={p.a}/></>}
        {k===1 && <><rect x="0" y="200" width="400" height="120" fill={p.b}/><rect x="150" y="60" width="100" height="200" fill={p.a}/></>}
        {k===2 && <><path d="M0 300 Q200 60 400 300 Z" fill={p.b}/><circle cx="200" cy="120" r="46" fill={p.a}/></>}
        {k===3 && <><g stroke={p.b} strokeWidth="14" fill="none"><line x1="-20" y1="80" x2="420" y2="80"/><line x1="-20" y1="160" x2="420" y2="160"/><line x1="-20" y1="240" x2="420" y2="240"/></g><rect x="170" y="120" width="60" height="60" fill={p.a}/></>}
        {k===4 && <><circle cx="120" cy="150" r="100" fill={p.b}/><circle cx="270" cy="150" r="64" fill={p.a} opacity=".88"/></>}
        {k===5 && <><rect x="0" y="0" width="200" height="300" fill={p.b}/><path d="M200 0 L400 300 L200 300 Z" fill={p.a}/></>}
      </svg>
    </div>
  );
};

/* ============ Header buttons ============== */
const DLangBtn = ({ lang, setLang }) => (
  <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 54px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <span style={{color:'#141414',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.15em'}}>{lang==='fr'?'EN':'FR'}</span>
  </button>
);
const DBookBtn = ({ lang, goto }) => (
  <button onClick={()=>goto('contact')} style={{flex:'0 0 auto',background:'#fff',border:'1px solid var(--edo-gray-200)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 24px',gap:10}}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.05em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Nous contacter':'Contact us'}</span>
    <IconArrowRight width="14" height="14" stroke="#141414"/>
  </button>
);

/* ============ Bento card primitives ============== */

/* DESIGN-ONLY · numero de case */
const CellBadge = ({ n }) => null;

/* ARTICLE COVER — image + title bottom (clickable → opens article) */
const CardArticle = ({ post, lang, onOpen, gc, gr, headline=false, badge }) => (
  <button onClick={onOpen} style={{
    gridColumn:gc,gridRow:gr,background:'#fff',border:0,cursor:'pointer',padding:0,
    textAlign:'left',display:'grid',gridTemplateRows:headline?'1fr 70px':'1fr auto',
    minHeight:0,minWidth:0,overflow:'hidden',transition:'opacity .2s ease',position:'relative',
  }}
  onMouseEnter={e=>{
    e.currentTarget.style.opacity='0.92';
    const t = e.currentTarget.querySelector('[data-card-text]');
    if (t) t.style.transform='scale(1.03)';
  }}
  onMouseLeave={e=>{
    e.currentTarget.style.opacity='1';
    const t = e.currentTarget.querySelector('[data-card-text]');
    if (t) t.style.transform='scale(1)';
  }}>
    {badge!=null && <CellBadge n={badge}/>}
    <div style={{position:'relative',minHeight:0,borderBottom:'1px solid var(--edo-gray-200)'}}>
      <DCover tone={post.tone} seed={post.id+1}/>
    </div>
    <div data-card-text style={{padding: headline ? '10px 18px 12px' : '14px 18px 16px',display:'flex',flexDirection:'column',gap:4,minWidth:0,overflow:'hidden',transition:'transform .2s ease',transformOrigin:'left center'}}>
      <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:'var(--edo-orange)'}}>{post.tag[lang]} · {post.read}</span>
      <h3 style={{
        margin:0,
        fontSize: headline ? 'clamp(16px,1.4vw,22px)' : 'clamp(15px,1.2vw,18px)',
        fontWeight: headline ? 300 : 400,
        letterSpacing: headline ? '-0.02em' : '-0.01em',
        lineHeight: headline ? 1.1 : 1.2,
        color:'#141414',
        textWrap:'balance',
        display:'-webkit-box',
        WebkitLineClamp: headline ? 3 : 2,
        WebkitBoxOrient:'vertical',
        overflow:'hidden',
      }}>{post.title[lang]}</h3>
      <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.08em',color:'#888'}}>{post.author} · {post.date[lang]}</span>
    </div>
  </button>
);

/* IMAGE FULL — visual only */
const CardImageFull = ({ tone='warm', seed=0, label, gc, gr, badge }) => (
  <div style={{gridColumn:gc,gridRow:gr,background:'#000',position:'relative',minHeight:0,minWidth:0,overflow:'hidden'}}>
    {badge!=null && <CellBadge n={badge}/>}
    <DCover tone={tone} seed={seed}/>
    {label && (
      <span style={{position:'absolute',bottom:14,left:14,fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',textTransform:'uppercase',color:'#fff'}}>
        {label}
      </span>
    )}
  </div>
);

/* TESTIMONIAL */
const CardTestimonial = ({ t, lang, gc, gr }) => (
  <figure style={{
    gridColumn:gc,gridRow:gr,
    background:'#eadfcb',color:'#141414',
    margin:0,padding:'20px 24px',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:14,
    minHeight:0,minWidth:0,overflow:'hidden',
  }}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',textTransform:'uppercase',color:'#595959'}}>{lang==='fr'?'Témoignage':'Testimonial'}</span>
    <blockquote style={{margin:0,fontSize:'clamp(14px,1.15vw,18px)',fontWeight:400,letterSpacing:'-0.01em',lineHeight:1.3,textWrap:'pretty',display:'-webkit-box',WebkitLineClamp:4,WebkitBoxOrient:'vertical',overflow:'hidden'}}>« {t.q[lang]} »</blockquote>
    <figcaption style={{display:'flex',justifyContent:'space-between',gap:10,fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',color:'#595959'}}>
      <span style={{color:'#141414',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.name}</span>
      <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.role[lang]}</span>
    </figcaption>
  </figure>
);

/* FILTERS — chip nav */
const CardFilters = ({ cat, setCat, lang, gc, gr, count }) => (
  <div style={{gridColumn:gc,gridRow:gr,background:'#fff',padding:'18px 22px',display:'flex',flexDirection:'column',gap:12,minHeight:0,minWidth:0,overflow:'hidden',justifyContent:'space-between'}}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',textTransform:'uppercase',color:'var(--edo-orange)'}}>Discovery · {lang==='fr'?'Le journal':'Journal'}</span>
    <h2 style={{margin:0,fontSize:'clamp(20px,1.7vw,28px)',fontWeight:300,letterSpacing:'-0.025em',lineHeight:1.05,color:'#141414',textWrap:'balance',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
      {lang==='fr'?'Tips, coulisses, possibilités.':'Tips, behind the scenes.'}
    </h2>
    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
      {D_CATS.map(c=>{
        const on = cat===c.k;
        return (
          <button key={c.k} onClick={()=>setCat(c.k)} style={{
            background:on?'#141414':'transparent',color:on?'#fff':'#141414',
            border:on?'1px solid #141414':'1px solid var(--edo-gray-200)',
            fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em',textTransform:'uppercase',
            padding:'5px 10px',cursor:'pointer',transition:'all .12s',whiteSpace:'nowrap',
          }}>{c[lang]}</button>
        );
      })}
    </div>
    <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.1em',color:'#888'}}>
      {count} {lang==='fr'?'articles':'posts'}
    </span>
  </div>
);

/* MORE — scrollable list with built-in filter chips */
const CardMore = ({ posts, lang, onOpen, gc, gr, cat, setCat, badge }) => {
  const filtered = cat==='all' ? posts : posts.filter(p=>p.cat===cat);
  return (
  <div style={{
    gridColumn:gc,gridRow:gr,background:'#fff',
    display:'flex',flexDirection:'column',minHeight:0,minWidth:0,overflow:'hidden',position:'relative',
  }}>
    {badge!=null && <CellBadge n={badge}/>}
    <div style={{padding:'14px 18px 12px',display:'flex',flexDirection:'column',gap:10,borderBottom:'1px solid var(--edo-gray-200)',flexShrink:0}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',textTransform:'uppercase',color:'var(--edo-orange)'}}>{lang==='fr'?'Plus d\u2019articles':'More posts'}</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.1em',color:'#888'}}>{filtered.length}/{posts.length}</span>
      </div>
      <div style={{display:'flex',gap:3}}>
        {D_CATS.map(c=>{
          const on = cat===c.k;
          return (
            <button key={c.k} onClick={()=>setCat(c.k)} style={{
              flex:'1 1 0',minWidth:0,
              background:on?'#141414':'transparent',color:on?'#fff':'#141414',
              border:on?'1px solid #141414':'1px solid var(--edo-gray-200)',
              fontFamily:'var(--font-mono)',fontSize:8,letterSpacing:'0.04em',textTransform:'uppercase',
              padding:'4px 4px',cursor:'pointer',transition:'all .12s',whiteSpace:'nowrap',
              overflow:'hidden',textOverflow:'ellipsis',
            }}>{c[lang]}</button>
          );
        })}
      </div>
    </div>
    <div style={{flex:'1 1 auto',overflowY:'auto',minHeight:0}}>
      {filtered.map(p=>(
        <button key={p.id} onClick={()=>onOpen(p)} style={{
          width:'100%',background:'#fff',
          border:0,borderBottom:'1px solid var(--edo-gray-200)',
          padding:'12px 18px 14px',cursor:'pointer',textAlign:'left',
          display:'grid',gridTemplateColumns:'46px 1fr',gap:12,alignItems:'center',
          transition:'background .15s ease',
        }}
        onMouseEnter={e=>{
          e.currentTarget.style.background='var(--edo-gray-100)';
          const t=e.currentTarget.querySelector('[data-row-text]');
          if (t) t.style.transform='scale(1.025)';
        }}
        onMouseLeave={e=>{
          e.currentTarget.style.background='#fff';
          const t=e.currentTarget.querySelector('[data-row-text]');
          if (t) t.style.transform='scale(1)';
        }}>
          <div style={{aspectRatio:'1/1',position:'relative',overflow:'hidden'}}>
            <DCover tone={p.tone} seed={p.id+4}/>
          </div>
          <div data-row-text style={{minWidth:0,display:'flex',flexDirection:'column',gap:3,transition:'transform .2s ease',transformOrigin:'left center'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'#888'}}>
              {p.tag[lang]} · {p.read}
            </span>
            <span style={{fontSize:13,fontWeight:400,letterSpacing:'-0.005em',lineHeight:1.25,color:'#141414',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
              {p.title[lang]}
            </span>
          </div>
        </button>
      ))}
      {filtered.length===0 && (
        <div style={{padding:'30px 18px',textAlign:'center',color:'#888',fontSize:11,fontFamily:'var(--font-mono)',letterSpacing:'0.1em',textTransform:'uppercase'}}>
          {lang==='fr'?'Aucun article':'No posts'}
        </div>
      )}
    </div>
  </div>
  );
};

/* NEWSLETTER */
const CardNewsletter = ({ lang, gc, gr }) => (
  <div style={{
    gridColumn:gc,gridRow:gr,background:'#141414',color:'#fff',
    padding:'18px 22px',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:14,
    minHeight:0,minWidth:0,overflow:'hidden',
  }}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',textTransform:'uppercase',color:'var(--edo-orange)'}}>Newsletter</span>
    <h3 style={{margin:0,fontSize:'clamp(16px,1.3vw,20px)',fontWeight:300,letterSpacing:'-0.015em',lineHeight:1.15,color:'#fff'}}>
      {lang==='fr'?'Une édition par mois.':'One edition a month.'}
    </h3>
    <div style={{display:'flex',borderBottom:'1px solid #fff',paddingBottom:6,gap:8}}>
      <input placeholder="email@studio.com" style={{flex:1,minWidth:0,border:0,background:'transparent',color:'#fff',fontSize:13,outline:'none'}}/>
      <button style={{background:'transparent',border:0,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase'}}>
        OK <IconArrowRight width="11" height="11" stroke="#fff"/>
      </button>
    </div>
  </div>
);

/* ===================================================================
   ARTICLE OVERLAY — full-screen reading view
   =================================================================== */
const ArticleOverlay = ({ post, lang, onClose }) => {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{
      position:'absolute',inset:0,background:'#000',zIndex:50,
      display:'grid',gridTemplateColumns:'1fr',gridTemplateRows:'52px 1fr',gap:1,
      overflow:'hidden',
    }}>
      {/* Top bar */}
      <div style={{gridRow:'1',background:'#000',display:'flex',gap:1}}>
        <button onClick={onClose} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',padding:'0 22px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{display:'inline-block',transform:'rotate(180deg)',color:'#141414'}}>
            <IconArrowRight width="14" height="14"/>
          </span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.18em',textTransform:'uppercase',color:'#141414'}}>
            {lang==='fr'?'Retour journal':'Back to journal'}
          </span>
        </button>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 24px',display:'flex',alignItems:'center',gap:14}}>
          <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{post.tag[lang]}</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.1em',color:'#888'}}>{post.read} · {post.author} · {post.date[lang]}</span>
        </div>
        <button onClick={onClose} style={{flex:'0 0 52px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{fontSize:18,fontWeight:300,color:'#141414'}}>×</span>
        </button>
      </div>

      {/* Body */}
      <div style={{gridRow:'2',background:'#000',display:'grid',gridTemplateColumns:'1.1fr 1fr',gap:1,minHeight:0,overflow:'hidden'}}>
        {/* Cover */}
        <div style={{background:'#000',position:'relative',minHeight:0}}>
          <DCover tone={post.tone} seed={post.id+1}/>
        </div>
        {/* Text */}
        <div style={{background:'#fff',padding:'40px 48px 40px',overflowY:'auto',minHeight:0,display:'flex',flexDirection:'column',gap:20}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',textTransform:'uppercase',color:'var(--edo-orange)'}}>{post.tag[lang]} · {post.read}</span>
          <h1 style={{margin:0,fontSize:'clamp(28px,3vw,46px)',fontWeight:300,letterSpacing:'-0.03em',lineHeight:1,color:'#141414',textWrap:'balance'}}>
            {post.title[lang]}
          </h1>
          <p style={{margin:0,fontSize:16,lineHeight:1.55,color:'#141414',fontWeight:400,textWrap:'pretty'}}>
            {post.sub[lang]}
          </p>
          <p style={{margin:0,fontSize:14,lineHeight:1.65,color:'#595959',textWrap:'pretty'}}>
            {lang==='fr'
              ? "L\u2019article complet sera publié ici. Pour l\u2019instant, on tient le résumé et la photographie de couverture. La grille du journal reste fluide : les rubriques se filtrent depuis la page d\u2019accueil du journal, et chaque article peut être ouvert en plein écran sans casser la navigation principale."
              : "The full article will be published here. For now, we keep the abstract and the cover image. The journal grid stays fluid: sections are filtered from the journal home, and each piece can open full-screen without breaking the main navigation."}
          </p>
          <div style={{marginTop:'auto',paddingTop:18,borderTop:'1px solid var(--edo-gray-200)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#888'}}>{post.author} · {post.date[lang]}</span>
            <button onClick={onClose} style={{background:'#141414',color:'#fff',border:0,height:40,padding:'0 22px',fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',cursor:'pointer'}}>
              {lang==='fr'?'Fermer':'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================================================================
   DiscoveryV2 — BENTO grille fixe, ~10 cases, aérée.
   Layout 6 cols × 4 rows :
      Row 1 : [Filters 2x1] [Image 2x1] [Article B 2x1]
      Row 2 : [Article A 4x2] [More 2x2]
      Row 3 :       (suite)
      Row 4 : [Article C 2x1] [Article D 2x1] [Newsletter 2x1]
   =================================================================== */
const DiscoveryV2 = ({ lang, setLang, openMenu, goto }) => {
  const [cat, setCat] = useDS('all');
  const [openPost, setOpenPost] = useDS(null);

  const list = D_POSTS;

  // Stable visible ids (4 article slots) — fixés, indépendants du filtre
  const visibleIds = [3, 1, 6, 9];
  const pickById = (ids) => ids.map(id => list.find(p=>p.id===id)).filter(Boolean);
  const fixed = pickById(visibleIds);
  const a0 = fixed[0]; // featured (large)
  const a1 = fixed[1];
  const a2 = fixed[2];
  const a3 = fixed[3];

  // "more" = articles not in fixed slots — le filtre s'applique seulement ici
  const moreList = list.filter(p => !fixed.find(x=>x.id===p.id));

  // Empty state guard
  const hasContent = list.length > 0;

  return (
    <div style={{position:'relative',display:'grid',gridTemplateColumns:'1fr',gridTemplateRows:'52px 1fr 44px',gap:1,background:'#000',height:'100%',width:'100%',overflow:'hidden'}}>

      {/* ============== HEADER ============== */}
      <div style={{gridRow:'1',background:'#000',display:'flex',gap:1,minWidth:0}}>
        <button onClick={()=>goto('home')} style={{flex:'0 0 190px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:8}}>
          <Wordmark size={32}/>
        </button>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 24px',display:'flex',alignItems:'center',gap:16}}>
          <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>Discovery</span>
        </div>
        <button onClick={()=>goto('gallery')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Galerie':'Gallery'}</span>
          <IconArrowRight width="12" height="12"/>
        </button>
        <button onClick={()=>goto('plateau-live')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Plateaux':'Stages'}</span>
          <IconArrowRight width="12" height="12"/>
        </button>
        <DBookBtn lang={lang} goto={goto}/>
        <DLangBtn lang={lang} setLang={setLang}/>
      </div>

      {/* ============== BENTO GRID — 4 colonnes × 3 rangs (cellules plus carrées) ============== */}
      <div style={{
        gridRow:'2',background:'#000',
        display:'grid',
        gridTemplateColumns:'repeat(8, minmax(0,1fr))',
        gridTemplateRows:'repeat(3, minmax(0,1fr)) 84px repeat(2, minmax(0,1fr))',
        gap:1,
        minHeight:0,overflow:'hidden',
        position:'relative',
      }}>

        {/* DESIGN-ONLY · Repères de cellules A1..D6 (désactivé) */}
        {false && (
        <div aria-hidden style={{
          position:'absolute',inset:0,zIndex:40,pointerEvents:'none',
          display:'grid',
          gridTemplateColumns:'repeat(4, 1fr)',
          gridTemplateRows:'repeat(3, 1fr) 84px repeat(2, 1fr)',
        }}>
          {Array.from({length:24}).map((_,i)=>{
            const col = String.fromCharCode(65 + (i%4));   // A B C D
            const row = Math.floor(i/4) + 1;                // 1..6
            return (
              <div key={i} style={{
                outline:'1px dashed rgba(255,107,53,0.55)',
                outlineOffset:'-1px',
                display:'flex',alignItems:'flex-start',justifyContent:'flex-start',
              }}>
                <span style={{
                  fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',
                  background:'var(--edo-orange)',color:'#fff',padding:'3px 7px',
                }}>{col}{row}</span>
              </div>
            );
          })}
        </div>
        )}

        {/* Row 1-3 : Intro col A (1c × 1) | More col B (1c × 3 rangs) avec filtres intégrés | Article a0 col C+D (2c × 3 rangs) */}
        {/* Row 1-2 col A : image pleine */}
        <div style={{gridColumn:'1 / span 2',gridRow:'1 / span 2',background:'#000',position:'relative',minHeight:0,minWidth:0,overflow:'hidden'}}>
          <CellBadge n={1}/>
          <DCover tone="dark" seed={5}/>
          <div style={{position:'absolute',left:14,bottom:12,zIndex:5}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(255,255,255,0.85)'}}>
              {lang==='fr'?'Live':'Live'}
            </span>
          </div>
        </div>
        <CardMore posts={moreList} lang={lang} onOpen={(p)=>setOpenPost(p)} cat={cat} setCat={setCat} gc="3 / span 2" gr="1 / span 4" badge={2}/>
        {a0 && <CardArticle post={a0} lang={lang} onOpen={()=>setOpenPost(a0)} headline gc="5 / span 4" gr="1 / span 3" badge={3}/>}

        {/* Row 3 col A : case noire quadrillée avec citation typographique forte */}
        <div style={{
          gridColumn:'1 / span 2',gridRow:'3 / span 1',background:'#141414',color:'#fff',
          padding:'24px 22px',display:'flex',alignItems:'center',justifyContent:'center',
          minHeight:0,minWidth:0,overflow:'hidden',position:'relative',
        }}>
          <CellBadge n={4}/>
          {/* Quadrillage façon home page Discovery */}
          <svg viewBox="0 0 200 100" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.2}}>
            {[...Array(9)].map((_,i)=>(<line key={'h'+i} x1="0" y1={i*14} x2="200" y2={i*14} stroke="#fff" strokeWidth="0.3"/>))}
            {[...Array(16)].map((_,i)=>(<line key={'v'+i} x1={i*14} y1="0" x2={i*14} y2="100" stroke="#fff" strokeWidth="0.3"/>))}
          </svg>
          <p style={{margin:0,fontSize:'clamp(20px,1.8vw,30px)',fontWeight:700,fontStyle:'italic',letterSpacing:'-0.025em',lineHeight:1.1,color:'#fff',textWrap:'balance',position:'relative',textAlign:'center'}}>
            {lang==='fr'
              ? 'On apprend en faisant. On partage ce qu\u2019on apprend.'
              : 'We learn by doing. We share what we learn.'}
          </p>
        </div>

        {/* Live (#5) maintenant fusionné avec #1 dans A1+A2 ci-dessus */}

        {/* Row 5-6 col A+B : grande case fusionnée — texte gauche, image droite */}
        {a3 && (
          <button onClick={()=>setOpenPost(a3)} style={{
            gridColumn:'1 / span 4',gridRow:'5 / span 2',background:'#fff',border:0,cursor:'pointer',padding:0,
            display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:0,minWidth:0,overflow:'hidden',textAlign:'left',
            transition:'opacity .2s ease',position:'relative',
          }}
          onMouseEnter={e=>{
            e.currentTarget.style.opacity='0.96';
            const t=e.currentTarget.querySelector('[data-a3-text]');
            if (t) t.style.transform='scale(1.02)';
          }}
          onMouseLeave={e=>{
            e.currentTarget.style.opacity='1';
            const t=e.currentTarget.querySelector('[data-a3-text]');
            if (t) t.style.transform='scale(1)';
          }}>
            <CellBadge n={6}/>
            {/* Image à gauche (A5+A6) */}
            <div style={{position:'relative',overflow:'hidden',background:'#141414'}}>
              <DCover tone={a3.tone} seed={a3.id+10}/>
            </div>
            {/* Texte à droite (B5+B6) */}
            <div data-a3-text style={{padding:'24px 28px',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:14,minWidth:0,minHeight:0,overflow:'hidden',transition:'transform .2s ease',transformOrigin:'left center'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',textTransform:'uppercase',color:'var(--edo-orange)'}}>
                {a3.tag[lang]} · {a3.read}
              </span>
              <div style={{display:'flex',flexDirection:'column',gap:10,minWidth:0}}>
                <h3 style={{margin:0,fontSize:'clamp(20px,1.7vw,30px)',fontWeight:300,letterSpacing:'-0.025em',lineHeight:1.05,color:'#141414',textWrap:'balance'}}>
                  {a3.title[lang]}
                </h3>
                <p style={{margin:0,fontSize:13,lineHeight:1.5,color:'#666',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                  {a3.lede?.[lang] || (lang==='fr'?'Lire l\u2019article complet sur Discovery.':'Read the full article on Discovery.')}
                </p>
              </div>
              <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'#141414',display:'inline-flex',alignItems:'center',gap:8}}>
                {lang==='fr'?'Lire l\u2019article':'Read article'} <span style={{fontSize:14}}>→</span>
              </span>
            </div>
          </button>
        )}

        {/* Col C rangs 4-6 : wrapper flex — Bouton Réserver 84px + case unique Coulisses/Backstage */}
        <div style={{
          gridColumn:'5 / span 2',gridRow:'4 / span 3',
          display:'flex',flexDirection:'column',gap:1,background:'#000',
          minHeight:0,minWidth:0,overflow:'hidden',
        }}>
          {/* Bouton Réserver — 84px fixe (même hauteur que home) */}
          <button onClick={()=>goto('book')} style={{
            flex:'0 0 84px',background:'var(--edo-orange)',border:0,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 22px',gap:14,
            color:'#fff',transition:'background .15s ease',position:'relative',minWidth:0,overflow:'hidden',textAlign:'left',
          }}
          onMouseEnter={e=>{
            e.currentTarget.style.background='#141414';
            const t = e.currentTarget.querySelector('[data-resa-text]');
            if (t) t.style.transform='scale(1.03)';
            const a = e.currentTarget.querySelector('[data-resa-arrow]');
            if (a) a.style.transform='translateX(4px) scale(1.15)';
          }}
          onMouseLeave={e=>{
            e.currentTarget.style.background='var(--edo-orange)';
            const t = e.currentTarget.querySelector('[data-resa-text]');
            if (t) t.style.transform='scale(1)';
            const a = e.currentTarget.querySelector('[data-resa-arrow]');
            if (a) a.style.transform='translateX(0) scale(1)';
          }}>
            <CellBadge n={7}/>
            <span data-resa-text style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4,minWidth:0,transition:'transform .2s ease',transformOrigin:'left center'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,.75)'}}>
                {lang==='fr'?'Studio · 7j/7':'Studio · 7d/7'}
              </span>
              <span style={{fontSize:20,fontWeight:400,letterSpacing:'-0.015em',lineHeight:1.05,color:'#fff'}}>
                {lang==='fr'?'Réserver':'Book'}
              </span>
            </span>
            <IconArrowRight data-resa-arrow width="16" height="16" stroke="#fff" style={{transition:'transform .25s ease',flexShrink:0}}/>
          </button>
          {/* Case unique Coulisses (occupe tout le reste) */}
          <div style={{flex:'1 1 0',minHeight:0,position:'relative',background:'#000',overflow:'hidden'}}>
            <DCover tone="warm" seed={9}/>
            <div style={{position:'absolute',left:14,bottom:12,zIndex:5,display:'flex',flexDirection:'column',gap:4}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(255,255,255,0.85)'}}>
                {lang==='fr'?'Coulisses':'Behind the scenes'}
              </span>
            </div>
          </div>
        </div>
        <AssistantChat lang={lang} gc="7 / span 2" gr="4 / span 3"/>

        {/* Coulisses + Backstage maintenant fusionnés dans la colonne C ci-dessus */}

        {/* Row 4 col A : Newsletter signup */}
        <div style={{
          gridColumn:'1 / span 2',gridRow:'4 / span 1',background:'#fff',color:'#141414',
          padding:'18px 22px',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:10,
          minHeight:0,minWidth:0,overflow:'hidden',position:'relative',
        }}>
          <CellBadge n={10}/>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',textTransform:'uppercase',color:'var(--edo-orange)'}}>Newsletter</span>
          <form onSubmit={e=>{e.preventDefault();}} style={{display:'flex',borderBottom:'1px solid #141414',paddingBottom:6,gap:8,alignItems:'center'}}>
            <input placeholder={lang==='fr'?'votre@email.com':'your@email.com'} style={{flex:1,minWidth:0,border:0,background:'transparent',color:'#141414',fontSize:13,outline:'none',fontFamily:'inherit',padding:'4px 0'}}/>
            <button type="submit" style={{background:'transparent',border:0,color:'var(--edo-orange)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',padding:0,whiteSpace:'nowrap'}}>
              OK →
            </button>
          </form>
        </div>

        {/* Témoignage : on le repousse en bas dans la mini a1 ? Non. On le retire pour réduire le nombre de cellules plates. */}
        {/* Empty state for filter */}
        {!hasContent && (
          <div style={{gridColumn:'1 / span 8',gridRow:'1 / span 6',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',textTransform:'uppercase',color:'#888'}}>{lang==='fr'?'Aucun article dans cette rubrique':'No posts in this section'}</span>
            <button onClick={()=>setCat('all')} style={{background:'#141414',color:'#fff',border:0,height:40,padding:'0 22px',fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',cursor:'pointer'}}>
              {lang==='fr'?'Voir tout':'See all'}
            </button>
          </div>
        )}
      </div>

      {/* ============== FOOTER · Socials + Brand marquee (matche homepage row 6) ============== */}
      <div style={{gridRow:'3',background:'#000',display:'grid',gridTemplateColumns:'repeat(12, minmax(0,1fr))',gap:1,minHeight:0,overflow:'hidden'}}>
        {[
          {k:'instagram',label:'IG',href:'https://www.instagram.com/edostudio/'},
          {k:'linkedin', label:'LI',href:'https://www.linkedin.com/company/e-do/'},
          {k:'facebook', label:'FB',href:'https://www.facebook.com/EdoStudioAgency/'},
          {k:'tiktok',   label:'TT',href:'https://www.tiktok.com/@edostudio'},
        ].map((s,i)=>(
          <a key={s.k} href={s.href} target="_blank" rel="noopener" style={{
            gridColumn:`${1+i}`,
            background:'#fff',textDecoration:'none',color:'#141414',
            display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'0 12px',transition:'background .15s ease',
          }}
          onMouseEnter={e=>{
            e.currentTarget.style.background='var(--edo-gray-100)';
            [...e.currentTarget.children].forEach(c=>{c.style.transform='scale(1.15)';c.style.transition='transform .2s ease';});
          }}
          onMouseLeave={e=>{
            e.currentTarget.style.background='#fff';
            [...e.currentTarget.children].forEach(c=>{c.style.transform='scale(1)';});
          }}>
            <SocialIcon kind={s.k} size={12}/>
            <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.15em'}}>{s.label}</span>
          </a>
        ))}
        <div style={{gridColumn:'5 / 13',background:'#fff',overflow:'hidden',minWidth:0,display:'flex',alignItems:'center'}}>
          <MarqueeCell size={20}/>
        </div>
      </div>
      {openPost && <ArticleOverlay post={openPost} lang={lang} onClose={()=>setOpenPost(null)}/>}
    </div>
  );
};

const DiscoveryVariants = (props) => <DiscoveryV2 {...props}/>;

Object.assign(window, { DiscoveryV2, DiscoveryVariants });
