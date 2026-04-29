/* global React */
const { useState, useEffect, useRef } = React;

// ---------- CellLabel & CellTitle ----------
const CellLabel = ({ children, style, ...p }) => (
  <span className="edo-cell-label" style={style} {...p}>{children}</span>
);
const CellTitle = ({ children, style, ...p }) => (
  <span className="edo-cell-title" style={style} {...p}>{children}</span>
);

// ---------- Button ----------
const buttonBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 8, whiteSpace: 'nowrap', border: 0, cursor: 'pointer',
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 400,
  letterSpacing: '0.2em', textTransform: 'uppercase', lineHeight: 1,
  borderRadius: 0, transition: 'all 150ms',
};
const buttonSizes = {
  sm: { height: 32, padding: '0 12px' },
  default: { height: 36, padding: '0 16px' },
  lg: { height: 40, padding: '0 24px' },
  icon: { width: 36, height: 36, padding: 0 },
};
const buttonVariants = {
  default: { background: 'var(--edo-orange)', color: '#fff' },
  outline: { background: '#fff', color: '#141414', boxShadow: 'inset 0 0 0 1px #000' },
  secondary: { background: 'oklch(.967 .001 286.375)', color: '#141414' },
  ghost: { background: 'transparent', color: '#141414' },
  link: { background: 'transparent', color: 'var(--edo-orange)', textDecoration: 'underline', textUnderlineOffset: 4, padding: 0 },
  destructive: { background: 'var(--edo-red)', color: '#fff' },
};
const Button = ({ variant='default', size='default', style, children, ...p }) => (
  <button
    style={{ ...buttonBase, ...buttonSizes[size], ...buttonVariants[variant], ...style }}
    onMouseEnter={e => { if (variant==='ghost' || variant==='outline' || variant==='secondary') e.currentTarget.style.background = 'var(--edo-gray-100)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = buttonVariants[variant].background; }}
    {...p}
  >{children}</button>
);

// ---------- Icons (Lucide, minimal set) ----------
const iconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconMenu = (p) => <svg {...iconProps} {...p}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>;
const IconX = (p) => <svg {...iconProps} {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconArrowRight = (p) => <svg {...iconProps} {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const IconGlobe = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconPlay = (p) => <svg {...iconProps} {...p}><polygon points="6 4 20 12 6 20 6 4"/></svg>;

// ---------- Clock (from brand-cell.tsx) ----------
const Clock = () => {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  const h = t.getHours(), m = t.getMinutes(), s = t.getSeconds();
  const hourDeg = (h % 12) * 30 + m * 0.5, minDeg = m * 6, secDeg = s * 6;
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'10px 0'}}>
      <svg viewBox="0 0 100 100" width="30" height="30">
        {[...Array(12)].map((_, i) => {
          const a = (i * 30 - 90) * Math.PI / 180;
          return <line key={i} x1={50+42*Math.cos(a)} y1={50+42*Math.sin(a)} x2={50+46*Math.cos(a)} y2={50+46*Math.sin(a)} stroke="#595959" strokeWidth="1.5"/>;
        })}
        <line x1="50" y1="50" x2="50" y2="26" stroke="#141414" strokeWidth="3" strokeLinecap="round" transform={`rotate(${hourDeg},50,50)`}/>
        <line x1="50" y1="50" x2="50" y2="18" stroke="#141414" strokeWidth="2" strokeLinecap="round" transform={`rotate(${minDeg},50,50)`}/>
        <line x1="50" y1="55" x2="50" y2="16" stroke="var(--edo-orange)" strokeWidth="1" strokeLinecap="round" transform={`rotate(${secDeg},50,50)`}/>
        <circle cx="50" cy="50" r="2.5" fill="#141414"/>
      </svg>
      <span style={{fontFamily:'var(--font-mono)',fontSize:7,color:'#595959',marginTop:2,fontVariantNumeric:'tabular-nums'}}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}</span>
      <span style={{fontFamily:'var(--font-mono)',fontSize:6,textTransform:'uppercase',letterSpacing:'0.2em',color:'#595959',marginTop:1}}>Paris</span>
    </div>
  );
};

// ---------- Wordmark ----------
const Wordmark = ({ size = 40, variant='full' }) => (
  <img
    src={variant === 'mark' ? window.__resources.logoMark : window.__resources.logoFull}
    alt="E-Do Studio"
    style={{ height: size, width: 'auto', display: 'block' }}
  />
);

// ---------- Language switch ----------
const LangSwitch = ({ lang, onToggle }) => (
  <button onClick={onToggle} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,background:'#fff',border:0,cursor:'pointer',height:'100%',transition:'background .15s'}}
    onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
    <IconGlobe width="14" height="14" />
    <div style={{display:'flex',alignItems:'center',gap:2,fontFamily:'var(--font-mono)',fontSize:9,fontWeight:500,color:'#595959'}}>
      <span>{lang==='fr'?'EN':'FR'}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      <span>{lang === 'fr' ? 'EN' : 'FR'}</span>
    </div>
  </button>
);

Object.assign(window, { CellLabel, CellTitle, Button, IconMenu, IconX, IconArrowRight, IconGlobe, IconPlay, Clock, Wordmark, LangSwitch });
