import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { BottomSheet } from './ui/bottom-sheet';
import { Button } from './ui/button';
import { cn } from './ui/cn';
import { EmptyState } from './ui/empty-state';
import { HoverMarquee } from './ui/hover-marquee';
import { IconArrowRight, IconSelector } from './ui/icons';
import { PageHeader, buildMainNav } from './ui/page-header';
import { ResponsiveImage } from './ui/responsive-image';
import { buildPostProdServiceSchema, buildBreadcrumbSchema } from './lib/structured-data';
import { useLoaderData } from '@tanstack/react-router';
import type { PPCat as StrapiPPCat, PPSample, SeoMeta } from './lib/strapi';
import type { Bilingual } from './types';
import { usePageContext } from './lib/page-context';
import { common, postprod as postprodMsg } from './i18n/messages';

interface PPPrice {
  amount?: string;
  unit?: Bilingual;
  from?: boolean;
  kind?: string;
}

// `samples` is a tagged union: real CMS media (image | video) plus a
// `placeholder` variant that drives the SVG palette fallback when fewer
// than 6 demo medias are configured in Strapi.
type SampleSlot = PPSample | { kind: 'placeholder'; seed: string };

interface PPCat {
  k: string;
  medium: string;
  fr: string;
  en: string;
  tagline: Bilingual;
  price: PPPrice;
  note: Bilingual;
  features: Bilingual<string[]>;
  formats: string[];
  samples: SampleSlot[];
  brands: string[];
  featured?: boolean;
}


interface PaletteColors {
  bg: string;
  a: string;
  b: string;
}

const PALETTES: Record<string, PaletteColors> = {
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

interface SampleImageProps {
  sample: SampleSlot;
  label?: string;
  medium: string;
}

const SampleVideo = ({ src, mime, label }: { src: string; mime: string; label?: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // `autoplay` + `muted` is enough on most browsers, but Safari/iOS
    // sometimes ignores the attribute when the element mounts off-screen.
    // Calling .play() defensively keeps the loop running once visible.
    el.play().catch(() => {});
  }, [src]);
  return (
    <div className="relative w-full h-full overflow-hidden bg-muted">
      <video
        ref={ref}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-label={label ?? ''}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      >
        <source src={src} type={mime} />
      </video>
      {label && (
        <span className="absolute bottom-1.5 left-2 font-mono text-micro tracking-ui uppercase opacity-55 text-white">
          {label}
        </span>
      )}
    </div>
  );
};

const SampleImage = ({ sample, label, medium }: SampleImageProps) => {
  if (sample.kind === 'video') {
    return <SampleVideo src={sample.url} mime={sample.mime} label={sample.alt || label} />;
  }
  if (sample.kind === 'image') {
    return (
      <div className="relative w-full h-full overflow-hidden bg-muted">
        <ResponsiveImage
          src={sample.url}
          alt={sample.alt || label || ''}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {label && (
          <span className="absolute bottom-1.5 left-2 font-mono text-micro tracking-ui uppercase opacity-55 text-white">
            {label}
          </span>
        )}
      </div>
    );
  }
  const seed = sample.seed;
  const p = PALETTES[seed] || PALETTES['mono-a'];
  const hash = [...seed].reduce((a,c)=>a+c.charCodeAt(0),0) % 5;
  return (
    <div className="relative w-full h-full overflow-hidden" style={{background: p.bg}}>
      <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        {hash===0 && (<><rect x="60" y="80" width="180" height="260" fill={p.b}/><ellipse cx="150" cy="200" rx="70" ry="110" fill={p.a}/></>)}
        {hash===1 && (<><rect x="0" y="240" width="300" height="160" fill={p.b}/><rect x="95" y="100" width="110" height="220" fill={p.a}/></>)}
        {hash===2 && (<><circle cx="150" cy="240" r="140" fill={p.b}/><rect x="130" y="60" width="40" height="220" fill={p.a}/></>)}
        {hash===3 && (<><path d="M 0 400 Q 150 160 300 400 Z" fill={p.b}/><circle cx="150" cy="150" r="55" fill={p.a}/></>)}
        {hash===4 && (<><ellipse cx="150" cy="220" rx="100" ry="150" fill={p.b}/><ellipse cx="150" cy="220" rx="55" ry="90" fill={p.a}/></>)}
      </svg>
      <div className="absolute inset-0 pointer-events-none bg-postprod-pattern"/>
      {medium==='video' && (
        <div className="absolute top-2 right-2 bg-black/55 text-white font-mono text-micro tracking-meta px-1.5 py-0.5 flex items-center gap-1">
          <span className="inline-block w-0 h-0 border-l-4 border-l-white border-t-3 border-t-transparent border-b-3 border-b-transparent"/>
          VIDEO
        </div>
      )}
      {label && <span className="absolute bottom-1.5 left-2 font-mono text-micro tracking-ui uppercase opacity-55" style={{color: p.a}}>{label}</span>}
    </div>
  );
};

const SAMPLE_CYCLE = ['warm-a','warm-b','warm-c','warm-d','warm-e','warm-b'];

// Real media items from Strapi (when present) come first; the remaining
// slots fall back to the palette cycle so the grid stays visually full
// even when fewer than 6 demo medias are configured.
function fillSamples(samples: PPSample[]): SampleSlot[] {
  const out: SampleSlot[] = [];
  for (let i = 0; i < 6; i++) {
    const s = samples[i];
    if (s) out.push(s);
    else out.push({ kind: 'placeholder', seed: SAMPLE_CYCLE[i % SAMPLE_CYCLE.length] });
  }
  return out;
}

function adaptStrapiCats(strapi: StrapiPPCat[]): PPCat[] {
  return strapi.map(c => ({
    k: c.k,
    medium: c.medium,
    fr: c.fr,
    en: c.en,
    tagline: c.tagline,
    price: c.price,
    note: c.note,
    features: c.features,
    formats: c.formats ?? [],
    samples: fillSamples(c.samples ?? []),
    brands: c.brands ?? [],
  }));
}

const PostprodPage = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const { postProdTypes } = useLoaderData({ from: '/$lang/post-production' });
  const cats: PPCat[] = postProdTypes ? adaptStrapiCats(postProdTypes) : [];
  const strapiCats: StrapiPPCat[] = postProdTypes ?? [];

  const { type = '' } = useSearch({ from: '/$lang/post-production' });
  const navigate = useNavigate();
  const setFilters = (next: string | null) =>
    navigate({ to: '.', search: next ? { type: next } : {} });

  // Auto-select the first available cat when the URL param is missing OR points
  // to a slug that no longer exists in Strapi. The auto-selection must NOT
  // pollute the URL — fall back silently to "no param" (the default state).
  const hasValidType = !!type && cats.some(c => c.k === type);
  useEffect(() => {
    if (type && cats.length > 0 && !cats.some(c => c.k === type)) {
      setFilters(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, cats]);

  const k = hasValidType ? type : (cats[0]?.k ?? '');
  const cat = cats.find(c => c.k === k) || cats[0];

  const defaultK = cats[0]?.k;
  const setType = (next: string) => {
    setFilters(!next || next === defaultK ? null : next);
  };

  const [navSheetOpen, setNavSheetOpen] = useState(false);
  const navigateToType = (nextK: string) => {
    setNavSheetOpen(false);
    if (nextK !== k) setType(nextK);
  };
  const currentIndex = Math.max(0, cats.findIndex(c => c.k === k));
  const currentNumber = String(currentIndex + 1).padStart(2, '0');

  const postprodLabel = lang === 'fr' ? 'Post-production' : 'Post-production';
  const breadcrumbBase: { name: string; pathname: string }[] = [
    { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
    { name: postprodLabel, pathname: '/post-production' },
  ];
  const breadcrumbItems = cat && hasValidType
    ? [...breadcrumbBase, { name: cat[lang], pathname: `/post-production?type=${cat.k}` }]
    : breadcrumbBase;
  const dark = !!cat?.featured;
  const bgCls = dark ? 'bg-foreground' : 'bg-white';
  const fgCls = dark ? 'text-white' : 'text-foreground';
  const mutedCls = dark ? 'text-white/62' : 'text-muted-foreground';
  const lineCls = dark ? 'border-white/18' : 'border-border';

  if (!cat) {
    // Le h1 reste dans l'arbre même sans catégorie, pour qu'il y en ait
    // toujours exactement un (le titre de catégorie ci-dessous est un h2).
    return (
      <>
        <h1 className="sr-only">{postprodLabel}</h1>
        <EmptyState
          size="page"
          label="Post-production"
          description={lang === 'fr' ? 'Aucune catégorie configurée. Renseignez vos types de post-production dans Strapi.' : 'No categories configured. Add post-production types in Strapi.'}
          action={{ label: lang === 'fr' ? 'Retour accueil' : 'Back home', onClick: () => goto('home') }}
        />
      </>
    );
  }

  return (
    /* Mobile: single-column scrollable. Desktop (md+): sidebar + workspace */
    <main className="edo-page-enter grid w-full grid-cols-[minmax(0,1fr)] edo-hairline md:h-full md:grid-cols-plateau md:grid-rows-app md:overflow-hidden">

      {/* Single, stable page h1 — data-independent so it's present at every
          breakpoint and before Strapi resolves. The selected category is an h2. */}
      <h1 className="sr-only">{postprodLabel}</h1>

      <PageHeader
        lang={lang}
        title="Post-production"
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={buildMainNav({ lang, goto, exclude: 'postprod' })}
      />

      {/* Mobile navigation: sticky single-row trigger showing the current
          post-prod type. Tap opens a BottomSheet listing all types; selecting
          a row in the sheet updates the type and closes the sheet immediately.
          Name + tagline stack vertically so long taglines don't truncate the
          name (post-prod taglines are full sentences). */}
      <button
        type="button"
        onClick={() => setNavSheetOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={navSheetOpen}
        aria-controls="postprod-nav-sheet"
        className="col-span-full sticky top-14 z-30 md:hidden flex items-center gap-4 min-h-14 w-full px-4 py-2.5 bg-white border-b border-border text-left edo-focus-ring cursor-pointer"
      >
        <span className="font-mono text-label tracking-label text-muted-foreground">
          {currentNumber}
        </span>
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <HoverMarquee className="text-cell tracking-copy-tight font-medium text-foreground">
            {cat[lang]}
          </HoverMarquee>
          <HoverMarquee className="font-mono text-micro uppercase tracking-ui text-muted-foreground">
            {cat.tagline[lang]}
          </HoverMarquee>
        </span>
        <IconSelector width="16" height="16" className="shrink-0 text-foreground" />
      </button>

      <BottomSheet
        id="postprod-nav-sheet"
        open={navSheetOpen}
        onClose={() => setNavSheetOpen(false)}
        title="Post-production"
        ariaLabel="Post-production"
        closeLabel={common.close[lang]}
      >
        <ul className="list-none m-0 p-0 flex flex-col">
          {cats.map((c, i) => {
            const active = c.k === k;
            const num = String(i + 1).padStart(2, '0');
            return (
              <li key={c.k}>
                <button
                  type="button"
                  onClick={() => navigateToType(c.k)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center gap-4 min-h-14 px-4 py-3',
                    'border-b border-border text-left',
                    'edo-focus-ring cursor-pointer transition-colors duration-150 ease-edo-out',
                    active ? 'bg-foreground text-background' : 'bg-white text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-label tracking-label',
                      active ? 'text-background/70' : 'text-muted-foreground',
                    )}
                  >
                    {num}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <HoverMarquee className="text-cell tracking-copy-tight font-medium">
                      {c[lang]}
                    </HoverMarquee>
                    <HoverMarquee
                      className={cn(
                        'font-mono text-micro uppercase tracking-ui',
                        active ? 'text-background/70' : 'text-muted-foreground',
                      )}
                    >
                      {c.tagline[lang]}
                    </HoverMarquee>
                  </span>
                  <IconArrowRight width="16" height="16" className="shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      {/* Desktop sidebar — vertical list, hidden on mobile (mobile uses the inline nav above) */}
      <aside className="hidden bg-white md:col-start-1 md:row-start-2 md:flex md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {cats.map((c,idx)=>{
          const active = k===c.k;
          const isLast = idx===cats.length-1;
          return (
            <button key={c.k} onClick={()=>setType(c.k)}
              className={`edo-focus-ring flex-none border-0 ${active?'bg-muted border-l-2 border-l-primary':'bg-white border-l-2 border-l-transparent'} ${idx>0?'border-t border-t-border':''} ${isLast?'border-b border-b-border':''} py-3 px-4 cursor-pointer text-left flex flex-col gap-1 transition-all duration-150 min-h-18`}>
              <span className={`font-mono text-micro tracking-label ${active?'text-primary':'text-muted-foreground'}`}>{String(idx+1).padStart(2,'0')}</span>
              <span className={`text-detail ${active?'font-medium':'font-normal'} tracking-copy-tight text-foreground leading-snug whitespace-nowrap overflow-hidden text-ellipsis`}>{c[lang]}</span>
              <span className="font-mono text-micro text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis mt-auto">
                {c.price?.kind==='quote' ? common.onRequest[lang] : `${c.price.from?(postprodMsg.from[lang] + ' '):''}${c.price.amount}${c.price.unit?.[lang] ?? ''}`}
              </span>
            </button>
          );
        })}
        <div className="mt-auto flex py-3.5 px-4 border-t border-t-border flex-col gap-1.5 shrink-0 bg-muted">
          <span className="font-mono text-micro tracking-label uppercase text-primary">
            {postprodMsg.note[lang]}
          </span>
          <span className="text-caption text-muted-foreground leading-normal text-pretty">
            {postprodMsg.noteBody[lang]}
          </span>
        </div>
      </aside>

      {/* Mobile-only category subheading (h2). The page h1 is the stable
          "Post-production" title above; the sticky trigger surfaces the name +
          tagline visually on mobile, so this stays in the a11y tree only. */}
      <h2 className="sr-only md:hidden">{cat[lang]}</h2>

      {/* Description + pricing panel */}
      <div className={`${bgCls} ${fgCls} py-8 px-6 md:px-9 flex flex-col justify-between gap-6 md:col-start-2 md:row-start-2 md:overflow-y-auto md:min-h-0`}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-label tracking-label text-primary">
              {String(cats.findIndex(x=>x.k===k)+1).padStart(2,'0')} · {postprodMsg.category[lang]}
            </span>
            {cat.featured && (
              <span className="font-mono text-micro tracking-label uppercase bg-primary text-white px-2 py-0.5">
                {postprodMsg.standard[lang]}
              </span>
            )}
          </div>
          <h2 className={`hidden md:block m-0 text-hero font-light tracking-display leading-none ${fgCls}`}>
            {cat[lang]}
          </h2>
          <ul className="mt-2 p-0 list-none flex flex-col gap-1.5">
            {cat.features[lang].map(f=>(
              <li key={f} className={`text-detail flex gap-2 items-start leading-snug ${fgCls}`}>
                <span className="text-primary font-mono shrink-0">+</span>
                <span className="min-w-0">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`flex flex-col gap-3 pt-4 border-t ${lineCls}`}>
          {cat.price && (
            <div className="flex items-baseline gap-2.5 flex-wrap">
              {cat.price.kind==='quote' ? (
                <span className={`text-page-title font-light tracking-headline leading-none ${fgCls}`}>
                  {common.onRequest[lang]}
                </span>
              ) : (
                <>
                  {cat.price.from && <span className={`font-mono text-label tracking-label uppercase ${mutedCls}`}>{postprodMsg.from[lang]}</span>}
                  <span className={`text-hero font-light tracking-headline leading-none ${fgCls}`}>{cat.price.amount}</span>
                  <span className={`text-detail opacity-65 ${fgCls}`}>{cat.price.unit?.[lang] ?? ''}</span>
                </>
              )}
            </div>
          )}
          <Button onClick={()=>goto('contact')} className="w-full justify-between py-3.5 px-5 mt-2">
            {postprodMsg.requestQuote[lang]}
            <IconArrowRight width="16" height="16"/>
          </Button>
        </div>
      </div>

      {/* Sample media grid — images + videos (EDO-222) */}
      <div className="grid grid-cols-3 md:col-start-3 md:col-span-2 md:row-start-2 md:grid-rows-double md:min-h-0">
        {cat.samples.slice(0, 6).map((sample, i) => (
          <div
            key={i}
            className={cn(
              bgCls,
              'relative overflow-hidden aspect-portrait md:aspect-auto md:h-full',
              i % 3 !== 2 && 'border-r border-hairline',
              i < 3 && 'border-b border-hairline',
            )}
          >
            <SampleImage
              sample={sample}
              label={cat.brands?.[i] || `${cat.k.toUpperCase()} · ${String(i + 1).padStart(2, '0')}`}
              medium={cat.medium}
            />
          </div>
        ))}
      </div>
    </main>
  );
};

export { PostprodPage };
