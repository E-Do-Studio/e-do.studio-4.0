import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { CellLabel, IconArrowRight, MobileNavStrip, PageHeader } from './ui';
import type { StripOption } from './ui';
import { cn } from './ui/cn';
import { VideoLoop } from './ui/video-loop';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { buildPlateauServiceSchema, buildBreadcrumbSchema } from './lib/structured-data';
import { usePageContext } from './router';
import { usePlateaux } from './lib/use-strapi';
import { common, plateau as plateauMsg } from './i18n/messages';
import type { Lang } from './types';
import type { MediaItem } from './lib/strapi';

// Up to 4 thumbnails visible at once in the strip; the rest reachable via arrows.
const VISIBLE_TILES = 4;

interface CoverCarouselProps {
  items: MediaItem[];
  lang: Lang;
  plateauName: string;
  index: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

// Cover — renders the currently selected media item full-cell with prev/next
// arrows overlaid inside the image. Arrows are hidden when only one media item.
// Media renders inside a fixed-aspect inner box so the visible width stays
// stable across portrait images and wider videos (no width "jump" on swap).
const Cover = ({ items, lang, plateauName, index, onPrev, onNext, className }: CoverCarouselProps) => {
  if (items.length === 0) return null;
  const item = items[index];
  const hasMultiple = items.length > 1;

  const arrowBtn =
    'edo-focus-ring absolute top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 cursor-pointer items-center justify-center bg-foreground/5 text-foreground transition-colors duration-150 hover:bg-foreground/10';

  return (
    <div
      className={cn('relative overflow-hidden bg-white min-h-56 md:min-h-0', className)}
      role={hasMultiple ? 'group' : undefined}
      aria-roledescription={hasMultiple ? 'carousel' : undefined}
      aria-label={hasMultiple ? common.imageCarousel[lang] : undefined}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-[3/4] h-full max-w-full max-h-full">
          {item.kind === 'video' ? (
            <VideoLoop
              key={item.url}
              src={item.url}
              poster={item.poster}
              objectFit="contain"
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <img
              key={item.url}
              src={item.url}
              alt={item.alt[lang] || `${plateauName} — ${index + 1}`}
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
        </div>
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={onPrev}
            aria-label={common.prevImage[lang]}
            className={cn(arrowBtn, 'left-3 md:left-4')}
          >
            <IconArrowRight width="16" height="16" className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label={common.nextImage[lang]}
            className={cn(arrowBtn, 'right-3 md:right-4')}
          >
            <IconArrowRight width="16" height="16" />
          </button>
          <span aria-live="polite" className="sr-only">
            {`${index + 1} / ${items.length}`}
          </span>
        </>
      )}
    </div>
  );
};

interface ThumbStripProps {
  items: MediaItem[];
  lang: Lang;
  plateauName: string;
  activeIndex: number;
  onSelect: (i: number) => void;
  className?: string;
}

// Thumbnail strip — up to 4 tiles visible at a time. Clicking a tile sets it
// as the cover. When there are more than 4 items the strip scrolls horizontally
// and surfaces prev/next arrows; the active tile is outlined.
const ThumbStrip = ({ items, lang, plateauName, activeIndex, onSelect, className }: ThumbStripProps) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const hasOverflow = items.length > VISIBLE_TILES;
  const visible = Math.min(items.length, VISIBLE_TILES);
  const tileBasis = `${100 / visible}%`;

  const updateScrollState = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const epsilon = 1;
    setCanPrev(el.scrollLeft > epsilon);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - epsilon);
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    updateScrollState();
    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [updateScrollState, items.length]);

  // Keep the active tile in view when the cover moves via the overlay arrows.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>(`[data-tile-index="${activeIndex}"]`);
    tile?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeIndex]);

  const scrollByTile = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    const firstTile = el.querySelector<HTMLElement>('[data-tile-index]');
    const step = firstTile?.offsetWidth ?? el.clientWidth / VISIBLE_TILES;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  const arrowBtn =
    'edo-focus-ring absolute top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 cursor-pointer items-center justify-center bg-foreground/5 text-foreground transition-[opacity,background-color] duration-150 hover:bg-foreground/10 disabled:cursor-default disabled:opacity-0 disabled:pointer-events-none';

  return (
    <div className={cn('relative', className)}>
      <div
        ref={stripRef}
        className="flex h-full gap-px overflow-x-auto bg-edo-pure-black snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={`${item.url}-${i}`}
              type="button"
              data-tile-index={i}
              onClick={() => onSelect(i)}
              aria-label={`${item.alt[lang] || plateauName} — ${i + 1} / ${items.length}`}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'edo-focus-ring relative shrink-0 snap-start overflow-hidden bg-white border-0 p-0 cursor-pointer',
                isActive && 'outline outline-2 outline-primary outline-offset-[-2px]',
              )}
              style={{ flexBasis: tileBasis }}
            >
              {item.kind === 'video' ? (
                <VideoLoop
                  src={item.url}
                  poster={item.poster}
                  objectFit="cover"
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <img
                  src={item.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </button>
          );
        })}
      </div>

      {hasOverflow && (
        <>
          <button
            type="button"
            onClick={() => scrollByTile(-1)}
            disabled={!canPrev}
            aria-label={common.prevImage[lang]}
            className={cn(arrowBtn, 'left-2')}
          >
            <IconArrowRight width="16" height="16" className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollByTile(1)}
            disabled={!canNext}
            aria-label={common.nextImage[lang]}
            className={cn(arrowBtn, 'right-2')}
          >
            <IconArrowRight width="16" height="16" />
          </button>
        </>
      )}
    </div>
  );
};

const PlateauPage = ({ slug }: { slug: string }) => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const metaKey = slug === 'cyclorama' ? 'cyclorama' : `plateau-${slug}`;
  const { data: plateaux, loading } = usePlateaux();
  const seoOverride = plateaux?.[slug]?.seo?.[lang];
  useDocumentMeta(metaKey, lang, seoOverride);
  const pathname = slug === 'cyclorama' ? '/cyclorama' : `/plateau/${slug}`;
  const plateauForSchema = plateaux?.[slug];
  useStructuredData(`plateau-${slug}`, [
    plateauForSchema
      ? buildPlateauServiceSchema({ plateau: plateauForSchema, slug, lang, pathname })
      : null,
    buildBreadcrumbSchema(
      [
        { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
        { name: common.stages[lang], pathname },
        { name: plateauForSchema?.name || slug, pathname },
      ],
      lang,
    ),
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  if (loading || !plateaux) return null;
  const p = plateaux[slug] || plateaux.cyclorama;
  if (!p) return null;
  const order = ['live','eclipse','horizontal','vertical','cyclorama'];
  const coverItems: MediaItem[] = p.media ?? [];
  const safeIndex = coverItems.length === 0
    ? 0
    : ((activeIndex % coverItems.length) + coverItems.length) % coverItems.length;
  const goPrev = () => setActiveIndex((i) => i - 1);
  const goNext = () => setActiveIndex((i) => i + 1);

  // Mobile navigation between plateaux: each option maps to a router screen.
  // Labels are kept clean (no "01 · ") to match EDO-261 (post-prod) — the
  // numbered prefix only survives on the desktop sidebar where ordering is
  // already visually conveyed by the vertical column.
  const plateauOptions: StripOption[] = order.flatMap((m) => {
    const cfg = plateaux[m];
    return cfg ? [{ k: m, label: cfg.name }] : [];
  });
  const navigateToPlateau = (key: string) => {
    if (key === slug) return;
    goto(key === 'cyclorama' ? 'cyclorama' : `plateau-${key}`);
  };

  return (
    /* Mobile: single-column stacked, scrollable. Desktop (md+): 4-column bento */
    <div className="edo-page-enter grid w-full gap-px bg-edo-pure-black md:h-full md:grid-cols-plateau md:grid-rows-plateau md:overflow-hidden">

      {/* Unified header — compact right-aligned actions on all breakpoints */}
      <PageHeader
        lang={lang}
        title={common.stages[lang]}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={[
          { id: 'postprod', label: 'Post-prod', onClick: () => goto('postprod'), className: 'hidden md:flex' },
          { id: 'gallery', label: common.gallery[lang], onClick: () => goto('gallery'), className: 'hidden md:flex' },
          { id: 'contact', label: common.contactUs[lang], onClick: () => goto('contact') },
        ]}
      />

      {/* Mobile navigation: bottom-sheet trigger replacing the horizontal strip. */}
      <MobileNavStrip
        triggerLabel="PLATEAUX"
        ariaLabel={common.stages[lang]}
        lang={lang}
        hasActive={false}
        summary={p.name}
        groups={[
          {
            key: 'plateau',
            label: 'PLATEAUX',
            options: plateauOptions,
            value: slug,
            onSelect: navigateToPlateau,
          },
        ]}
        onApply={(draft) => navigateToPlateau(draft.plateau)}
      />

      {/* Desktop sidebar: vertical list, hidden on mobile (replaced by MobileNavStrip). */}
      <div className="hidden bg-white md:col-start-1 md:row-start-2 md:row-span-4 md:flex md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {order.map((m, i) => {
          const cfg = plateaux[m];
          if (!cfg) return null;
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

      {/* Cover — current media item with prev/next arrows overlaid inside the
          image. The cover and the thumbnail strip below share `activeIndex`,
          so navigating either control keeps both in sync. */}
      {coverItems.length > 0 && (
        <Cover
          items={coverItems}
          lang={lang}
          plateauName={p.name}
          index={safeIndex}
          onPrev={goPrev}
          onNext={goNext}
          className="md:col-start-2 md:col-span-2 md:row-start-2 md:row-span-2 md:min-h-0"
        />
      )}

      {/* Thumbnail strip — up to 4 tiles visible at once, scrollable when the
          entry has more media. Clicking a tile sets it as the cover. */}
      {coverItems.length > 0 && (
        <ThumbStrip
          items={coverItems}
          lang={lang}
          plateauName={p.name}
          activeIndex={safeIndex}
          onSelect={setActiveIndex}
          className="md:col-start-2 md:col-span-2 md:row-start-4 md:min-h-0"
        />
      )}

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
        className="edo-focus-ring bg-primary p-4 border-0 cursor-pointer flex flex-col justify-between text-left text-white font-inherit min-h-20 transition-[color,background-color,opacity] duration-150 ease-edo-out hover:opacity-90 md:col-start-4 md:row-start-5">
        <CellLabel className="text-white/80">06 · {common.bookNow[lang]}</CellLabel>
        <div className="flex justify-between items-end text-white w-full">
          <span className="text-tile-large font-medium tracking-headline">{common.bookThisStage[lang]}</span>
          <IconArrowRight width="20" height="20"/>
        </div>
      </button>
    </div>
  );
};

const CycloramaPage = () => <PlateauPage slug="cyclorama" />;

const PlateauSlugPage = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  return <PlateauPage key={slug} slug={slug} />;
};

export { PlateauPage, CycloramaPage, PlateauSlugPage };
