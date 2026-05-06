import { IconArrowRight, CellLabel, PageHeader, Wordmark } from './ui';
import { useDocumentMeta } from './lib/use-document-meta';
import { usePageContext } from './router';
import { usePlateaux } from './lib/use-strapi';
import { common, plateau as plateauMsg } from './i18n/messages';

const PlateauVisual = ({ kind }: { kind: string }) => {
  const svgClass = "h-4/5 w-4/5";
  if (kind === 'cyc') return (
    <svg viewBox="0 0 500 400" className={svgClass} role="img" aria-label="Cyclorama — 4.7m × 6m infinity backdrop">
      <defs><linearGradient id="cycloG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff"/><stop offset="1" stopColor="#e2d6c0"/></linearGradient></defs>
      <path d="M60 360 Q60 80 250 80 Q440 80 440 360 Z" fill="url(#cycloG)" stroke="#000" strokeWidth="0.75"/>
      <ellipse cx="250" cy="360" rx="160" ry="14" fill="rgba(0,0,0,0.08)"/>
      <line x1="250" y1="60" x2="250" y2="380" stroke="#000" strokeWidth="0.4" strokeDasharray="2 3"/>
      <text x="250" y="50" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">4,7 M</text>
      <text x="40" y="370" textAnchor="end" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">6 M</text>
    </svg>
  );
  if (kind === 'horizontal') return (
    <svg viewBox="0 0 500 400" className={svgClass} role="img" aria-label="Horizontal stage — 4×4m top-shot platform">
      <rect x="80" y="60" width="340" height="280" fill="#f5f5f5" stroke="#000" strokeWidth="0.75"/>
      {[...Array(7)].map((_,i)=><line key={'h'+i} x1="80" y1={60+i*45} x2="420" y2={60+i*45} stroke="#888" strokeWidth="0.3" strokeDasharray="2 3"/>)}
      {[...Array(8)].map((_,i)=><line key={'v'+i} x1={80+i*48.5} y1="60" x2={80+i*48.5} y2="340" stroke="#888" strokeWidth="0.3" strokeDasharray="2 3"/>)}
      <path d="M180 160 L220 140 L240 150 L260 140 L300 160 L290 220 L260 220 L260 260 L220 260 L220 220 L190 220 Z" fill="#141414" opacity="0.85"/>
      <text x="250" y="50" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">TOP · SHOT</text>
      <text x="40" y="380" textAnchor="end" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">4 × 4 M</text>
    </svg>
  );
  if (kind === 'vertical') return (
    <svg viewBox="0 0 500 400" className={svgClass} role="img" aria-label="Vertical stage — 4.2m ghost mannequin platform">
      <rect x="160" y="40" width="180" height="330" fill="#fafafa" stroke="#000" strokeWidth="0.75"/>
      <g fill="none" stroke="#141414" strokeWidth="1">
        <circle cx="250" cy="95" r="22"/>
        <path d="M225 125 L215 200 L225 280 L245 280 L245 320 L235 370"/>
        <path d="M275 125 L285 200 L275 280 L255 280 L255 320 L265 370"/>
        <path d="M225 135 L200 180 M275 135 L300 180"/>
      </g>
      <line x1="160" y1="40" x2="160" y2="370" stroke="#000" strokeWidth="0.4" strokeDasharray="2 3"/>
      <text x="250" y="28" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">4,2 M</text>
      <text x="250" y="390" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">GHOST</text>
    </svg>
  );
  if (kind === 'eclipse') return (
    <svg viewBox="0 0 500 400" className={svgClass} role="img" aria-label="Eclipse stage — 360° rotating platform">
      <circle cx="250" cy="200" r="150" fill="none" stroke="#000" strokeWidth="0.75" strokeDasharray="2 4"/>
      <circle cx="250" cy="200" r="100" fill="none" stroke="#000" strokeWidth="0.5"/>
      <circle cx="250" cy="200" r="55" fill="#141414"/>
      {[0,60,120,180,240,300].map(a=>{ const rad=a*Math.PI/180; return <circle key={a} cx={250+Math.cos(rad)*150} cy={200+Math.sin(rad)*150} r="5" fill="#141414"/>; })}
      <text x="250" y="30" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">360°</text>
      <text x="250" y="390" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">ECLIPSE</text>
    </svg>
  );
  if (kind === 'live') return (
    <svg viewBox="0 0 500 400" className={svgClass} role="img" aria-label="Live stage — 3 camera NDI streaming setup">
      <rect x="60" y="60" width="380" height="230" fill="#141414"/>
      {[...Array(12)].map((_,i)=><line key={i} x1="60" y1={60+i*20} x2="440" y2={60+i*20} stroke="#fff" strokeOpacity="0.1" strokeWidth="0.4"/>)}
      <circle cx="80" cy="80" r="5" fill="#e5583a"/>
      <text x="92" y="84" fill="#fff" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">REC · LIVE</text>
      <g fill="#fff"><circle cx="250" cy="130" r="18"/><path d="M230 150 L270 150 L275 230 L250 235 L225 230 Z"/></g>
      <rect x="100" y="310" width="40" height="24" fill="#141414"/><rect x="230" y="310" width="40" height="24" fill="#141414"/><rect x="360" y="310" width="40" height="24" fill="#141414"/>
      <text x="250" y="380" textAnchor="middle" fill="#595959" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2">3 CAM · NDI</text>
    </svg>
  );
  return null;
};

const PlateauPage = ({ slug }: { slug: string }) => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const metaKey = slug === 'cyclorama' ? 'cyclorama' : `plateau-${slug}`;
  useDocumentMeta(metaKey, lang);
  const { data: plateaux, loading } = usePlateaux();
  if (loading || !plateaux) return <div className="flex items-center justify-center h-full bg-white"><span className="text-muted-foreground text-caption animate-pulse">{common.loading[lang]}</span></div>;
  const p = plateaux[slug] || plateaux.cyclorama;
  const order = ['live','eclipse','horizontal','vertical','cyclorama'];

  return (
    /* Mobile: single-column stacked, scrollable. Desktop (md+): 4-column bento */
    <div className="edo-page-enter grid w-full gap-px bg-black overflow-y-auto md:h-full md:grid-cols-plateau md:grid-rows-plateau md:overflow-hidden">

      {/* Mobile header (single row, hidden on desktop) */}
      <PageHeader
        lang={lang}
        title={common.stages[lang]}
        className="col-span-full h-14 md:hidden"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={[
          { id: 'contact', label: common.contactUs[lang], onClick: () => goto('contact') },
        ]}
      />

      {/* Desktop header: 4 cells each in their exact grid column (hidden on mobile) */}

      {/* Col 1 – logo */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-1 md:row-start-1">
        <button onClick={()=>goto('home')} aria-label="E-Do Studio home" className="edo-focus-ring flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-background p-2 transition-colors hover:bg-muted">
          <Wordmark size={32} />
        </button>
      </div>

      {/* Col 2 – page title */}
      <div className="hidden md:flex min-w-0 items-center bg-background px-6 md:col-start-2 md:row-start-1">
        <CellLabel className="shrink-0 text-primary">{common.stages[lang]}</CellLabel>
      </div>

      {/* Col 3 – post-prod action */}
      <button onClick={()=>goto('postprod')} className="edo-focus-ring hidden md:flex h-full cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted md:col-start-3 md:row-start-1">
        <span className="whitespace-nowrap">Post-prod</span>
        <IconArrowRight width={12} height={12} />
      </button>

      {/* Col 4 – gallery + lang toggle */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-4 md:row-start-1">
        <button onClick={()=>goto('gallery')} className="edo-focus-ring flex h-full flex-1 cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted">
          <span className="whitespace-nowrap">{common.gallery[lang]}</span>
          <IconArrowRight width={12} height={12} />
        </button>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background p-0 transition-colors hover:bg-muted">
          <span className="font-mono text-label tracking-meta text-foreground">{common.langToggleLabel[lang]}</span>
        </button>
      </div>

      {/* Sidebar: horizontal scroll on mobile, vertical list on desktop */}
      <div className="bg-white flex flex-row overflow-x-auto md:col-start-1 md:row-start-2 md:row-span-4 md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {order.map((m, i) => {
          const cfg = plateaux[m];
          const active = m === slug;
          return (
            <button key={m} onClick={()=>goto(m==='cyclorama'?'cyclorama':'plateau-'+m)}
              className={`edo-focus-ring flex-none py-3.5 px-4 border-0 cursor-pointer text-left flex flex-col gap-1 transition-colors duration-150
                md:border-b md:border-border
                ${active ? 'bg-muted border-b-2 border-b-primary md:border-b-border md:border-l-2 md:border-l-primary' : 'bg-white border-b-2 border-b-transparent md:border-b-border md:border-l-2 md:border-l-transparent hover:bg-muted'}`}>
              <span className={`font-mono text-label tracking-label ${active?'text-primary':'text-muted-foreground'}`}>{String(i+1).padStart(2,'0')}</span>
              <span className={`text-cell tracking-copy-tight whitespace-nowrap ${active?'font-medium text-foreground':'font-normal text-muted-foreground'}`}>{cfg.name}</span>
              <span className="font-mono text-micro tracking-ui uppercase text-muted-foreground hidden md:block">{cfg.tagline[lang]}</span>
            </button>
          );
        })}
      </div>

      {/* Visual diagram */}
      <div className="relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-edo-cream to-edo-sand min-h-56 md:col-start-2 md:col-span-2 md:row-start-2 md:row-span-3 md:min-h-0">
        <PlateauVisual kind={p.visual}/>
      </div>

      {/* Name + tagline */}
      <div className="bg-white py-3.5 px-4 flex flex-col justify-between gap-1 md:col-start-4 md:row-start-2">
        <CellLabel>{p.tagline[lang]}</CellLabel>
        <h1 className="text-tile-large font-light m-0 tracking-display leading-none">{p.name}</h1>
      </div>

      {/* Specifications */}
      <div className="bg-white p-3 px-4 flex flex-col gap-1.5 md:col-start-4 md:row-start-3">
        <CellLabel>{plateauMsg.specs[lang]}</CellLabel>
        <div className="flex flex-col flex-1 min-h-0">
          {p.specs.map((s, i) => (
            <div key={s.k.fr} className={`flex justify-between items-baseline gap-3 text-caption py-1 ${i < p.specs.length - 1 ? 'border-b border-border' : ''}`}>
              <span className="text-muted-foreground shrink-0">{s.k[lang]}</span>
              <span className="text-foreground font-mono tracking-caption text-label text-right whitespace-pre-line overflow-hidden line-clamp-2 leading-snug">{(s.v[lang]||'').split(' · ').join(' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rates */}
      <div className="bg-white px-4 pt-2.5 pb-3 flex flex-col gap-1 md:col-start-4 md:row-start-4">
        <CellLabel>{plateauMsg.rates[lang]}</CellLabel>
        <div className="flex flex-col flex-1 min-h-0">
          {p.rates.map((r, i) => (
            <div key={r.k.fr} className={`flex justify-between items-baseline text-caption py-1 ${i < p.rates.length - 1 ? 'border-b border-border' : ''}`}>
              <span className="text-muted-foreground">{r.k[lang]}</span>
              <span className="text-foreground font-mono tracking-caption text-caption">{typeof r.v === 'string' ? r.v : r.v[lang]}</span>
            </div>
          ))}
        </div>
        {p.ratesNote && (
          <div className="font-mono text-micro tracking-caption text-muted-foreground leading-normal mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {p.ratesNote[lang]}
          </div>
        )}
      </div>

      {/* Description + Uses */}
      <div className="bg-white p-4 flex justify-between items-start gap-6 md:col-start-2 md:col-span-2 md:row-start-5">
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <CellLabel>{common.description[lang]}</CellLabel>
          <p className="m-0 text-caption text-foreground leading-normal max-w-2xl">{p.desc[lang]}</p>
        </div>
        <div className="flex-none w-40 flex flex-col gap-1.5">
          <CellLabel>{plateauMsg.uses[lang]}</CellLabel>
          <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
            {p.uses.map(a => <li key={a.fr} className="text-caption text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">· {a[lang]}</li>)}
          </ul>
        </div>
      </div>

      {/* Book CTA */}
      <button onClick={()=>{ try{localStorage.setItem('edo-book-plateau', slug);}catch(e){} goto('book'); }}
        className="edo-focus-ring bg-primary p-4 border-0 cursor-pointer flex flex-col justify-between text-left text-white font-inherit min-h-20 transition-colors hover:bg-foreground hover:text-white md:col-start-4 md:row-start-5">
        <CellLabel className="text-white/80">06 · {common.bookNow[lang]}</CellLabel>
        <div className="flex justify-between items-end text-white w-full">
          <span className="text-tile-large font-medium tracking-headline">{common.bookThisStage[lang]}</span>
          <IconArrowRight width="20" height="20"/>
        </div>
      </button>
    </div>
  );
};

export { PlateauPage };
