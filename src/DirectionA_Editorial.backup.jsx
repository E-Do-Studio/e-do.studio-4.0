/* global React, NavigationCell, CycloramaCell, EcommerceKeywordsCell, PostProdCell, EtouchCell, MachineListCell, ContactCell, ChatCell, GalleryCell, CtaCell, MarqueeCell, AboutCell, BrandStackCell, CellLabel, CellTitle, IconArrowRight, Wordmark, LangSwitch, Clock, IconMenu, tile, BRANDS */

/* =================================================================
   DIRECTION A — Éditorial
   -----------------------------------------------------------------
   Grille aérée 12 colonnes, hero gallery éditorial grand format,
   services listés clairement en dessous, typographie forte.
   Le bento respire — moins de cellules, plus grandes.
   ================================================================= */
const DirectionA = ({ lang, setLang, openMenu, goto }) => {
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'repeat(12, 1fr)',
      gridTemplateRows:'52px 1fr 1fr 1fr 52px',
      gap:1, background:'#000', height:'100%', width:'100%', minHeight:0,
    }}>
      {/* HEADER */}
      <div style={{gridColumn:'1 / 4', gridRow:'1', minWidth:0}}>
        <NavigationCell lang={lang} onMenu={openMenu} onLogo={()=>goto('home')}/>
      </div>
      <div style={{gridColumn:'4 / 11', gridRow:'1', background:'#fff', display:'flex', alignItems:'center', padding:'0 16px', overflow:'hidden', whiteSpace:'nowrap'}}>
        <CellLabel style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>E-Do Studio — {lang==='fr'?"Studio photo · Paris / Saint-Ouen":"Photo studio · Paris / Saint-Ouen"}</CellLabel>
      </div>
      <div style={{gridColumn:'11 / 13', gridRow:'1', background:'#fff', display:'grid', gridTemplateColumns:'1fr 1fr'}}>
        <div style={{borderRight:'1px solid #000'}}><Clock/></div>
        <LangSwitch lang={lang} onToggle={()=>setLang(lang==='fr'?'en':'fr')}/>
      </div>

      {/* HERO — Manifesto typography (left) + Hero gallery (right) */}
      <div style={{gridColumn:'1 / 7', gridRow:'2 / 4', background:'#fff', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14, minWidth:0, minHeight:0, overflow:'hidden'}}>
        <CellLabel>{lang==='fr'?'— Studio photo · E-commerce · Luxe':'— Photo studio · E-commerce · Luxury'}</CellLabel>
        <h1 style={{margin:0, fontSize:'clamp(28px, 3.8vw, 56px)', fontWeight:300, letterSpacing:'-0.035em', lineHeight:1.02, color:'#141414', flex:'1 1 auto', display:'flex', alignItems:'center'}}>
          <span>
            {lang==='fr' ? <>La production d'image,<br/><i style={{fontWeight:300,fontStyle:'italic',color:'var(--edo-orange)'}}>augmentée.</i></>
                        : <>Image production,<br/><i style={{fontWeight:300,fontStyle:'italic',color:'var(--edo-orange)'}}>augmented.</i></>}
          </span>
        </h1>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap',flexShrink:0}}>
          <p style={{margin:0,fontSize:12,color:'#595959',lineHeight:1.5,maxWidth:340,textWrap:'pretty',flex:'1 1 220px'}}>
            {lang==='fr'
              ? "Un espace hybride pour les marques de mode et de luxe : cyclorama 30 m², e-commerce haute cadence, post-production."
              : "A hybrid space for fashion & luxury brands: 30 m² cyclorama, high-volume e-commerce, post-production."}
          </p>
          <button onClick={()=>goto('cyclorama')}
            style={{background:'#141414',color:'#fff',border:0,height:40,padding:'0 18px',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:10,whiteSpace:'nowrap',flexShrink:0}}>
            {lang==='fr'?'Découvrir':'Discover'} <IconArrowRight width="13" height="13" stroke="#fff"/>
          </button>
        </div>
      </div>

      <div style={{gridColumn:'7 / 13', gridRow:'2 / 4', position:'relative', overflow:'hidden', minWidth:0, minHeight:0}}>
        <GalleryCell columns={3} rows={2} palette="editorial" seeds={[1,3,5,2,7,9]}
          onOpen={()=>goto('gallery')}/>
        <div style={{position:'absolute',top:12,left:12,color:'#fff',mixBlendMode:'difference',pointerEvents:'none'}}>
          <CellLabel style={{color:'rgba(255,255,255,.95)'}}>{lang==='fr'?'04 · Galerie · Travaux récents':'04 · Gallery · Recent work'}</CellLabel>
        </div>
      </div>

      {/* SERVICES row — 4 service cards */}
      <div style={{gridColumn:'1 / 4', gridRow:'4'}}>
        <CycloramaCell lang={lang} variant="full" onOpen={()=>goto('cyclorama')}/>
      </div>

      <button onClick={()=>goto('services')}
        style={{gridColumn:'4 / 7', gridRow:'4', background:'#fff',border:0,cursor:'pointer',padding:'18px 20px',textAlign:'left',display:'flex',flexDirection:'column',justifyContent:'space-between',transition:'background .15s'}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        <CellLabel>02 · {lang==='fr'?'E-commerce':'E-commerce'}</CellLabel>
        <div>
          <div style={{fontSize:28,fontWeight:300,letterSpacing:'-0.02em',lineHeight:1,color:'#141414'}}>
            {lang==='fr'?'Packshot haute cadence':'High-volume packshot'}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'4px 8px',marginTop:12}}>
            {(lang==='fr'?['Mode','Luxe','Accessoires','Cosmétique','Spiritueux','Food']:['Fashion','Luxury','Accessories','Cosmetics','Spirits','Food']).map(t=>(
              <span key={t} style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#595959',padding:'3px 8px',border:'1px solid var(--edo-gray-200)'}}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'#595959'}}>{lang==='fr'?'À partir de 15 €/photo':'From €15 /photo'}</span>
          <IconArrowRight width="18" height="18"/>
        </div>
      </button>

      <div style={{gridColumn:'7 / 10', gridRow:'4'}}>
        <PostProdCell lang={lang} onOpen={()=>goto('postprod')}/>
      </div>

      <div style={{gridColumn:'10 / 13', gridRow:'4'}}>
        <EtouchCell lang={lang}/>
      </div>

      {/* BOTTOM row — about, clients marquee, contact */}
      <div style={{gridColumn:'1 / 4', gridRow:'5', background:'#fff', display:'flex',alignItems:'center',padding:'0 16px',gap:12}}>
        <CellLabel>{lang==='fr'?'05 · Confiance · 2015 →':'05 · Trusted by · 2015 →'}</CellLabel>
      </div>
      <div style={{gridColumn:'4 / 11', gridRow:'5'}}>
        <MarqueeCell/>
      </div>
      <button onClick={()=>goto('contact')}
        style={{gridColumn:'11 / 13', gridRow:'5', background:'var(--edo-orange)',color:'#fff',border:0,cursor:'pointer',padding:'0 16px',fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <span>{lang==='fr'?'Demander un devis':'Request a quote'}</span>
        <IconArrowRight width="14" height="14" stroke="#fff"/>
      </button>
    </div>
  );
};

Object.assign(window, { DirectionA });
