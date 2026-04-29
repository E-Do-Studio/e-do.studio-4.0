/* global React, Button, CellLabel, IconX */
const { useState } = React;

const NAV_ITEMS = {
  fr: [
    { label: 'Accueil', href: '/fr' },
    { label: 'Cyclorama', href: '/fr/cyclorama' },
    { label: 'Galerie', href: '/fr/galerie' },
    { label: 'Discovery', href: '/fr/discovery' },
    { label: 'Post-production', href: '/fr/post-production' },
    { label: 'Contact', href: '/fr/contact' },
    { label: 'Légal', href: '/fr/legal' },
  ],
  en: [
    { label: 'Home', href: '/en' },
    { label: 'Cyclorama', href: '/en/cyclorama' },
    { label: 'Gallery', href: '/en/galerie' },
    { label: 'Discovery', href: '/en/discovery' },
    { label: 'Post-production', href: '/en/post-production' },
    { label: 'Contact', href: '/en/contact' },
    { label: 'Legal', href: '/en/legal' },
  ],
};

const NavMenu = ({ lang, isOpen, onClose, onNav, setLang }) => (
  <>
    <div onClick={onClose} style={{
      position:'fixed',inset:0,zIndex:200,
      background:'rgba(0,0,0,.4)',backdropFilter:'blur(2px)',WebkitBackdropFilter:'blur(2px)',
      opacity:isOpen?1:0,pointerEvents:isOpen?'auto':'none',
      transition:'opacity .3s'
    }}/>
    <aside style={{
      position:'fixed',top:0,left:0,height:'100%',width:288,zIndex:201,
      background:'#fff',borderRight:'1px solid #000',
      display:'flex',flexDirection:'column',
      transform:isOpen?'translateX(0)':'translateX(-100%)',
      transition:'transform .3s cubic-bezier(.16,1,.3,1)'
    }}>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',borderBottom:'1px solid #000'}}>
        <div style={{display:'flex',alignItems:'center',padding:'14px 16px'}}>
          <CellLabel>Navigation</CellLabel>
        </div>
        <button onClick={onClose} aria-label="Close"
          style={{width:48,height:48,background:'#fff',border:0,borderLeft:'1px solid #000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <IconX width="20" height="20"/>
        </button>
      </div>

      <nav style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
        {NAV_ITEMS[lang].map((item,i)=>(
          <a key={item.href} onClick={()=>{onNav?.(item);}}
            style={{position:'relative',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:16,borderBottom:'1px solid #000',cursor:'pointer',transition:'background .15s',minHeight:72}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
            onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
            <CellLabel>{String(i+1).padStart(2,'0')}</CellLabel>
            <span style={{fontSize:16,fontWeight:500,color:'#595959',marginTop:24}}>{item.label}</span>
          </a>
        ))}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
          {[
            {s:'Instagram',href:'https://www.instagram.com/edostudio/'},
            {s:'LinkedIn', href:'https://www.linkedin.com/company/e-do/'},
            {s:'Facebook', href:'https://www.facebook.com/EdoStudioAgency/'},
            {s:'TikTok',   href:'https://www.tiktok.com/@edostudio'},
          ].map((it,i)=>(
            <a key={it.s} href={it.href} target="_blank" rel="noopener" style={{
              display:'flex',alignItems:'center',justifyContent:'center',padding:'12px 16px',
              borderBottom:'1px solid #000',borderRight: i%2===0?'1px solid #000':'none',
              fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'#595959',cursor:'pointer',transition:'background .15s',textDecoration:'none'
            }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>{it.s}</a>
          ))}
        </div>
      </nav>

      <div style={{display:'grid',gridTemplateColumns:'auto 1fr',borderTop:'1px solid #000'}}>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')}
          style={{width:48,height:48,background:'#fff',border:0,borderRight:'1px solid #000',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          {lang==='fr'?'EN':'FR'}
        </button>
        <button onClick={()=>{onNav&&onNav('book');onClose&&onClose();}} style={{height:48,background:'var(--edo-orange)',color:'#fff',border:0,cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase'}}>
          {lang==='fr'?'Réserver':'Book now'}
        </button>
      </div>
    </aside>
  </>
);

Object.assign(window, { NavMenu, NAV_ITEMS });
