/* global React, IconArrowRight, IconMenu, Wordmark, CellLabel */

/* =================================================================
   POST-PRODUCTION — bento sans scroll
   Tout tient dans le viewport. Rail gauche = sélecteur de catégorie.
   Main = grille bento qui change de contenu selon la catégorie :
     - bloc prix
     - bloc description
     - bloc features
     - bloc formats + délai
     - mosaïque d'images exemples
   ================================================================= */

const { useState: usePP } = React;

const PP_CATS = [
  {
    k:'on-model', medium:'photo',
    fr:'On model', en:'On model',
    tagline:{fr:'Shoot porté sur mannequin',en:'On-model shoot'},
    price:{amount:'7,90€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Retouche peau, maquillage, cheveux et nettoyage textile.",
      en:'Skin, make-up, hair retouch and fabric cleanup.',
    },
    features:{
      fr:['Détourage','Changement de fond','Nettoyage peau','Étalonnage couleur','Nettoyage textile','Harmonisation silhouette'],
      en:['Cutout','Background change','Skin cleanup','Color grading','Fabric cleanup','Silhouette harmonization'],
    },
    formats:['JPG','TIFF','PSD'],
    samples:['warm-a','warm-b','warm-c','warm-d','warm-e','warm-b'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'ghost', medium:'photo',
    fr:'Ghost', en:'Ghost',
    tagline:{fr:'Mannequin invisible, effet porté',en:'Invisible mannequin, worn look'},
    price:{amount:'5,40€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Assemblage avant / arrière, disparition du mannequin, volume naturel. Doublures, cols ouverts et superpositions gérés.",
      en:'Front / back assembly, mannequin removal, natural volume. Linings, open collars and layering handled.',
    },
    features:{
      fr:['Détourage','Changement de fond','Disparition mannequin','Étalonnage couleur','Nettoyage textile','Revolumisation et harmonisation du vêtement'],
      en:['Cutout','Background change','Mannequin removal','Color grading','Fabric cleanup','Garment revolumizing & harmonization'],
    },
    formats:['JPG','PNG','TIFF','PSD'],
    samples:['mono-a','mono-b','mono-c','mono-d','mono-e','mono-a'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'a-plat', medium:'photo',
    fr:'Flat', en:'Flat',
    tagline:{fr:'Posé à plat, vue zénithale',en:'Laid flat, top view'},
    price:{amount:'5,40€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Mise à plat stylée, découpe clean, ombre maîtrisée. Pour e-shop et éditorial.",
      en:'Styled flat lay, clean cutout, controlled shadow. For e-shop and editorial.',
    },
    features:{
      fr:['Détourage','Changement de fond','Nettoyage textile','Étalonnage couleur','Revolumisation et harmonisation du vêtement'],
      en:['Cutout','Background change','Fabric cleanup','Color grading','Garment revolumizing & harmonization'],
    },
    formats:['JPG','PNG','TIFF'],
    samples:['mono-b','mono-c','mono-d','mono-a','mono-e','mono-c'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'accessoires', medium:'photo',
    fr:'Accessoires', en:'Accessories',
    tagline:{fr:'Maroquinerie · bijoux · souliers · cosmétique · eyewear · food & spiritueux',en:'Leather · jewelry · shoes · cosmetics · eyewear · food & spirits'},
    price:{amount:'5,40€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Traitement matières, cuirs, métaux, pierres. Détail et texture préservés.",
      en:'Materials, leather, metal, stones. Detail and texture preserved.',
    },
    features:{
      fr:['Détourage','Changement de fond','Nettoyage','Étalonnage couleur','Travail des matières et reflets','Revolumisation et harmonie des lignes','Mise en valeur des détails et textures'],
      en:['Cutout','Background change','Cleanup','Color grading','Materials & reflections work','Revolumizing & line harmonization','Detail & texture enhancement'],
    },
    formats:['JPG','TIFF','PSD'],
    samples:['warm-c','warm-d','warm-a','warm-e','warm-b','warm-d'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'pique', medium:'photo',
    fr:'Piqué', en:'Pinned',
    tagline:{fr:'Épinglé sur panneau vertical',en:'Pinned on vertical board'},
    price:{amount:'7,90€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Pièce présentée sur mousse ou épingles, nettoyage complet des fixations et remise en forme.",
      en:'Garment on foam or pins, full removal of fixings and reshaping.',
    },
    features:{
      fr:['Détourage','Changement de fond','Nettoyage épingles & mousse','Étalonnage couleur','Nettoyage textile','Revolumisation et harmonisation du vêtement'],
      en:['Cutout','Background change','Pin & foam cleanup','Color grading','Fabric cleanup','Garment revolumizing & harmonization'],
    },
    formats:['JPG','TIFF','PSD'],
    samples:['mono-c','mono-a','mono-e','mono-d','mono-b','mono-a'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'high-end', medium:'photo',
    fr:'High end', en:'High end',
    tagline:{fr:'Campagne · éditorial · still life',en:'Campaign · editorial · still life'},
    price:{kind:'quote'},
    note:{
      fr:"Retouche haute couture : dodge & burn HD, compositing, matte-painting, pièce unique.",
      en:'High-couture retouch: HD dodge & burn, compositing, matte-painting, one-of-a-kind.',
    },
    features:{
      fr:['Retouche sur mesure'],
      en:['Bespoke retouching'],
    },
    formats:['TIFF','PSD','EXR'],
    samples:['dark-a','dark-b','dark-c','dark-d','dark-e','dark-b'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'video', medium:'video',
    fr:'Vidéo', en:'Video',
    tagline:{fr:'Campagne · lookbook vidéo · contenu réseaux sociaux',en:'Campaign · video lookbook · social media content'},
    price:{kind:'quote'},
    note:{
      fr:"Post-production vidéo de A à Z : détourage, montage, étalonnage, motion design. Formats e-com, social, campagne et film de marque.",
      en:'Full video post-production: cutout, editing, color grading, motion design. E-com, social, campaign and brand film formats.',
    },
    features:{
      fr:['Détourage & montage','Étalonnage couleur','Motion design & titrages','Export multi-formats'],
      en:['Cutout & editing','Color grading','Motion design & titles','Multi-format export'],
    },
    formats:['MP4','MOV','ProRes','DNxHR'],
    samples:['mono-v-a','warm-v-c','dark-v-b','warm-v-d','mono-v-c','dark-v-d'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
];

const SampleImage = ({ seed, label, medium }) => {
  const palettes = {
    'mono-a':{bg:'#f0f0f0',a:'#141414',b:'#bfbfbf'},'mono-b':{bg:'#e8e8e8',a:'#2a2a2a',b:'#a8a8a8'},
    'mono-c':{bg:'#dcdcdc',a:'#1a1a1a',b:'#8e8e8e'},'mono-d':{bg:'#f5f5f5',a:'#141414',b:'#c8c8c8'},
    'mono-e':{bg:'#c8c8c8',a:'#1a1a1a',b:'#7a7a7a'},
    'warm-a':{bg:'#e8dfcf',a:'#2a241c',b:'#b8ad94'},'warm-b':{bg:'#d9ccb0',a:'#3a2f20',b:'#a89674'},
    'warm-c':{bg:'#f0e7d4',a:'#2a241c',b:'#c4b694'},'warm-d':{bg:'#ddcfad',a:'#1f1a12',b:'#9e8a63'},
    'warm-e':{bg:'#cab995',a:'#1a1610',b:'#8e7a52'},
    'dark-a':{bg:'#1a1a1a',a:'#f0f0f0',b:'#3a3a3a'},'dark-b':{bg:'#0f0f0f',a:'#e8e8e8',b:'#2a2a2a'},
    'dark-c':{bg:'#141414',a:'#d8d8d8',b:'#333333'},'dark-d':{bg:'#1f1f1f',a:'#f0f0f0',b:'#404040'},
    'dark-e':{bg:'#0a0a0a',a:'#d0d0d0',b:'#262626'},
    'mono-v-a':{bg:'#d8d8d8',a:'#141414',b:'#8a8a8a'},'mono-v-b':{bg:'#ededed',a:'#2a2a2a',b:'#9e9e9e'},
    'mono-v-c':{bg:'#c4c4c4',a:'#141414',b:'#7a7a7a'},'mono-v-d':{bg:'#e0e0e0',a:'#1a1a1a',b:'#9a9a9a'},
    'mono-v-e':{bg:'#b8b8b8',a:'#141414',b:'#707070'},
    'warm-v-a':{bg:'#e0d2b4',a:'#2a241c',b:'#a8976e'},'warm-v-b':{bg:'#cfbe9a',a:'#1f1a12',b:'#8e7a52'},
    'warm-v-c':{bg:'#f2e7d0',a:'#2a241c',b:'#b8a47e'},'warm-v-d':{bg:'#d4c5a2',a:'#1f1a12',b:'#9e8a63'},
    'warm-v-e':{bg:'#c4b089',a:'#1a1610',b:'#7e6a42'},
    'dark-v-a':{bg:'#111111',a:'#e8e8e8',b:'#2e2e2e'},'dark-v-b':{bg:'#1c1c1c',a:'#f0f0f0',b:'#3e3e3e'},
    'dark-v-c':{bg:'#0a0a0a',a:'#d0d0d0',b:'#262626'},'dark-v-d':{bg:'#181818',a:'#e0e0e0',b:'#363636'},
    'dark-v-e':{bg:'#050505',a:'#c8c8c8',b:'#1e1e1e'},
  };
  const p = palettes[seed] || palettes['mono-a'];
  const hash = [...seed].reduce((a,c)=>a+c.charCodeAt(0),0) % 5;
  return (
    <div style={{position:'relative',width:'100%',height:'100%',background:p.bg,overflow:'hidden'}}>
      <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
        {hash===0 && (<><rect x="60" y="80" width="180" height="260" fill={p.b}/><ellipse cx="150" cy="200" rx="70" ry="110" fill={p.a}/></>)}
        {hash===1 && (<><rect x="0" y="240" width="300" height="160" fill={p.b}/><rect x="95" y="100" width="110" height="220" fill={p.a}/></>)}
        {hash===2 && (<><circle cx="150" cy="240" r="140" fill={p.b}/><rect x="130" y="60" width="40" height="220" fill={p.a}/></>)}
        {hash===3 && (<><path d="M 0 400 Q 150 160 300 400 Z" fill={p.b}/><circle cx="150" cy="150" r="55" fill={p.a}/></>)}
        {hash===4 && (<><ellipse cx="150" cy="220" rx="100" ry="150" fill={p.b}/><ellipse cx="150" cy="220" rx="55" ry="90" fill={p.a}/></>)}
      </svg>
      <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(135deg, transparent 0 22px, rgba(255,255,255,0.04) 22px 23px)',pointerEvents:'none'}}/>
      {medium==='video' && (
        <div style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.55)',color:'#fff',fontFamily:'var(--font-mono)',fontSize:8,letterSpacing:'0.14em',padding:'2px 6px',display:'flex',alignItems:'center',gap:5}}>
          <span style={{width:0,height:0,borderLeft:'4px solid #fff',borderTop:'3px solid transparent',borderBottom:'3px solid transparent'}}/>
          VIDEO
        </div>
      )}
      {label && <span style={{position:'absolute',bottom:6,left:8,fontFamily:'var(--font-mono)',fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',color:p.a,opacity:0.55}}>{label}</span>}
    </div>
  );
};

const PostprodPage = ({ lang, setLang, openMenu, goto }) => {
  const [k, setK] = usePP(PP_CATS[0].k);
  const cat = PP_CATS.find(c=>c.k===k) || PP_CATS[0];
  const dark = !!cat.featured;
  const bg = dark?'#141414':'#fff';
  const fg = dark?'#fff':'#141414';
  const muted = dark?'rgba(255,255,255,0.62)':'#595959';
  const line = dark?'rgba(255,255,255,0.18)':'var(--edo-gray-200)';

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'190px 1fr',
      gridTemplateRows:'54px 1fr',
      gap:1,background:'#000',height:'100%',width:'100%',overflow:'hidden',
    }}>

      {/* ============== TOP NAV ============== */}
      <button onClick={()=>goto('home')} style={{gridColumn:'1',gridRow:'1',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:8}}>
        <Wordmark size={32}/>
      </button>
      <div style={{gridColumn:'2',gridRow:'1',background:'#000',display:'flex',gap:1,minWidth:0}}>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 24px',display:'flex',alignItems:'center',minWidth:0,gap:16,overflow:'hidden'}}>
          <span className="edo-cell-label" style={{color:'var(--edo-orange)',whiteSpace:'nowrap'}}>{lang==='fr'?'Post-production':'Post-production'}</span>
        </div>
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

      {/* ============== LEFT RAIL ============== */}
      <aside style={{gridColumn:'1',gridRow:'2',background:'#fff',display:'flex',flexDirection:'column',minHeight:0,overflowY:'auto'}}>
        {PP_CATS.map((c,idx)=>{
          const active = k===c.k;
          const isLast = idx===PP_CATS.length-1;
          return (
            <button key={c.k} onClick={()=>setK(c.k)} style={{
              width:'100%',border:0,background:active?'var(--edo-gray-100)':'#fff',
              borderLeft:active?'2px solid var(--edo-orange)':'2px solid transparent',
              borderTop:idx===0?'0':'1px solid var(--edo-gray-200)',
              borderBottom:isLast?'1px solid var(--edo-gray-200)':'0',
              padding:'14px 16px',cursor:'pointer',textAlign:'left',
              display:'flex',flexDirection:'column',gap:4,transition:'all .15s',flexShrink:0,
              minHeight:74,
            }}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',color:active?'var(--edo-orange)':'#888'}}>{String(idx+1).padStart(2,'0')}</span>
              <span style={{fontSize:13,fontWeight:active?500:400,letterSpacing:'-0.01em',color:'#141414',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c[lang]}</span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:9,color:'#595959',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:'auto'}}>
                {c.price?.kind==='quote' ? (lang==='fr'?'Sur demande':'On request') : `${c.price.from?(lang==='fr'?'À partir de ':'From '):''}${c.price.amount}${c.price.unit[lang]}`}
              </span>
            </button>
          );
        })}
        <div style={{marginTop:'auto',padding:'14px 16px',borderTop:'1px solid var(--edo-gray-200)',display:'flex',flexDirection:'column',gap:6,flexShrink:0,background:'#fafafa'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--edo-orange)'}}>
            {lang==='fr'?'À noter':'Note'}
          </span>
          <span style={{fontSize:11,color:'#595959',lineHeight:1.4,textWrap:'pretty'}}>
            {lang==='fr'?'Nous retouchons aussi vos images non shootées chez nous.':'We also retouch images not shot at our studio.'}
          </span>
        </div>
      </aside>

      {/* ============== MAIN — épuré ============== */}
      <main style={{
        gridColumn:'2',gridRow:'2',background:'#000',
        display:'grid',
        gridTemplateColumns:'1.15fr 1fr 1fr 1fr',
        gridTemplateRows:'1fr 1fr',
        gap:1,minHeight:0,minWidth:0,overflow:'hidden',
      }}>

        {/* ---- A : éditorial (titre + description + CTA) ---- */}
        <div style={{gridColumn:'1',gridRow:'1 / span 2',background:bg,color:fg,padding:'32px 36px',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:24,minWidth:0,minHeight:0,overflow:'hidden'}}>
          <div style={{display:'flex',flexDirection:'column',gap:18}}>
            <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.22em',color:'var(--edo-orange)'}}>
                {String(PP_CATS.findIndex(x=>x.k===k)+1).padStart(2,'0')} · {lang==='fr'?'CATÉGORIE':'CATEGORY'}
              </span>
              {cat.featured && (
                <span style={{fontFamily:'var(--font-mono)',fontSize:8,letterSpacing:'0.18em',textTransform:'uppercase',background:'var(--edo-orange)',color:'#fff',padding:'2px 7px'}}>
                  {lang==='fr'?'Standard':'Standard'}
                </span>
              )}
            </div>
            <h1 style={{margin:0,fontSize:'clamp(32px, 3.6vw, 54px)',fontWeight:300,letterSpacing:'-0.03em',lineHeight:1,color:fg}}>
              {cat[lang]}
            </h1>
            <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',color:muted}}>
              {cat.tagline[lang]}
            </span>
            <ul style={{margin:'8px 0 0',padding:0,listStyle:'none',display:'flex',flexDirection:'column',gap:6}}>
              {cat.features[lang].map(f=>(
                <li key={f} style={{fontSize:13,color:fg,display:'flex',gap:8,alignItems:'flex-start',lineHeight:1.35}}>
                  <span style={{color:'var(--edo-orange)',fontFamily:'var(--font-mono)',flexShrink:0}}>+</span>
                  <span style={{minWidth:0}}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:12,borderTop:`1px solid ${line}`,paddingTop:18}}>
            {cat.price && (
              <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
                {cat.price.kind==='quote' ? (
                  <span style={{fontSize:'clamp(22px, 2.2vw, 32px)',fontWeight:300,letterSpacing:'-0.02em',lineHeight:1,color:fg}}>
                    {lang==='fr'?'Sur demande':'On request'}
                  </span>
                ) : (
                  <>
                    {cat.price.from && <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:muted}}>{lang==='fr'?'À partir de':'From'}</span>}
                    <span style={{fontSize:'clamp(32px, 3.2vw, 46px)',fontWeight:300,letterSpacing:'-0.025em',lineHeight:1,color:fg}}>{cat.price.amount}</span>
                    <span style={{fontSize:13,opacity:0.65,color:fg}}>{cat.price.unit[lang]}</span>
                  </>
                )}
              </div>
            )}
            <button onClick={()=>goto('contact')} style={{
              background:'var(--edo-orange)',border:0,color:'#fff',padding:'14px 20px',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,transition:'filter .15s',marginTop:8,
            }}
              onMouseEnter={e=>e.currentTarget.style.filter='brightness(1.08)'}
              onMouseLeave={e=>e.currentTarget.style.filter='none'}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.08em',textTransform:'uppercase',color:'#fff'}}>
                {lang==='fr'?'Demander un devis':'Request a quote'}
              </span>
              <IconArrowRight width="16" height="16" stroke="#fff"/>
            </button>
          </div>
        </div>

        {/* ---- B : sample 1 ---- */}
        <div style={{gridColumn:'2',gridRow:'1',background:bg,position:'relative',overflow:'hidden',minHeight:0,minWidth:0}}>
          <SampleImage seed={cat.samples[0]} label={cat.brands?.[0] || `${cat.k.toUpperCase()} · 01`} medium={cat.medium}/>
        </div>

        {/* ---- C : sample 2 ---- */}
        <div style={{gridColumn:'3',gridRow:'1',background:bg,position:'relative',overflow:'hidden',minHeight:0,minWidth:0}}>
          <SampleImage seed={cat.samples[1]} label={cat.brands?.[1] || `${cat.k.toUpperCase()} · 02`} medium={cat.medium}/>
        </div>

        {/* ---- D : sample 3 ---- */}
        <div style={{gridColumn:'4',gridRow:'1',background:bg,position:'relative',overflow:'hidden',minHeight:0,minWidth:0}}>
          <SampleImage seed={cat.samples[2]} label={cat.brands?.[2] || `${cat.k.toUpperCase()} · 03`} medium={cat.medium}/>
        </div>

        {/* ---- E : sample 4 ---- */}
        <div style={{gridColumn:'2',gridRow:'2',background:bg,position:'relative',overflow:'hidden',minHeight:0,minWidth:0}}>
          <SampleImage seed={cat.samples[3] || cat.samples[0]} label={cat.brands?.[3] || `${cat.k.toUpperCase()} · 04`} medium={cat.medium}/>
        </div>

        {/* ---- F : sample 5 ---- */}
        <div style={{gridColumn:'3',gridRow:'2',background:bg,position:'relative',overflow:'hidden',minHeight:0,minWidth:0}}>
          <SampleImage seed={cat.samples[4] || cat.samples[1]} label={cat.brands?.[4] || `${cat.k.toUpperCase()} · 05`} medium={cat.medium}/>
        </div>

        {/* ---- G : sample 6 ---- */}
        <div style={{gridColumn:'4',gridRow:'2',background:bg,position:'relative',overflow:'hidden',minHeight:0,minWidth:0}}>
          <SampleImage seed={cat.samples[5] || cat.samples[2]} label={cat.brands?.[5] || `${cat.k.toUpperCase()} · 06`} medium={cat.medium}/>
        </div>

      </main>
    </div>
  );
};

Object.assign(window, { PostprodPage });
