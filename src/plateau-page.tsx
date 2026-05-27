import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { BottomSheet, CellLabel, IconArrowRight, IconSelector, PageHeader, buildMainNav } from './ui';
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
// The asset fills the grid cell in `object-contain` so portrait, square and
// landscape sources all use as much of the available space as possible without
// cropping.
const Cover = ({ items, lang, plateauName, index, onPrev, onNext, className }: CoverCarouselProps) => {
  if (items.length === 0) return null;
  const item = items[index];
  const hasMultiple = items.length > 1;
  const total = items.length;
  const counterCurrent = String(index + 1).padStart(2, '0');
  const counterTotal = String(total).padStart(2, '0');

  const arrowBtn =
    'edo-focus-ring absolute top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center cursor-pointer bg-white text-foreground border border-border transition-colors duration-150 ease-edo-out hover:bg-foreground hover:text-background';

  return (
    <div
      className={cn('relative overflow-hidden bg-white min-h-56 md:min-h-0', className)}
      role={hasMultiple ? 'group' : undefined}
      aria-roledescription={hasMultiple ? 'carousel' : undefined}
      aria-label={hasMultiple ? common.imageCarousel[lang] : undefined}
    >
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

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={onPrev}
            aria-label={common.prevImage[lang]}
            className={cn(arrowBtn, 'left-4')}
          >
            <IconArrowRight width="16" height="16" className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label={common.nextImage[lang]}
            className={cn(arrowBtn, 'right-4')}
          >
            <IconArrowRight width="16" height="16" />
          </button>
          <div
            aria-hidden="true"
            className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-white border border-border px-2 py-1 font-mono text-micro uppercase tracking-ui text-foreground"
          >
            <span>{counterCurrent}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{counterTotal}</span>
          </div>
          <span aria-live="polite" className="sr-only">
            {`${index + 1} / ${total}`}
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
// and surfaces prev/next arrows. Inactive tiles are dimmed; the active tile
// shows a primary-color top accent.
const ThumbStrip = ({ items, lang, plateauName, activeIndex, onSelect, className }: ThumbStripProps) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const hasOverflow = items.length > VISIBLE_TILES;
  const visible = Math.min(items.length, VISIBLE_TILES);
  // Account for the 1px gaps between tiles so that exactly `visible` tiles fit
  // in the container with no leftover horizontal overflow. A plain `100/N%`
  // basis would sum to `100% + (N-1)px` with gap-px, producing a tiny scroll
  // and a few pixels of drift when scrollIntoView fires on index change.
  const tileBasis =
    visible <= 1 ? '100%' : `calc((100% - ${visible - 1}px) / ${visible})`;

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
  // Skip when the strip has no horizontal overflow — there is nowhere to scroll
  // to, and calling scrollIntoView on a fully-visible tile can still nudge
  // sub-pixel rounding under smooth-scroll, producing a visible shift.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth + 1) return;
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
    'edo-focus-ring absolute top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center cursor-pointer bg-white text-foreground border border-border transition-[opacity,background-color,color] duration-150 ease-edo-out hover:bg-foreground hover:text-background disabled:cursor-default disabled:opacity-0 disabled:pointer-events-none';

  return (
    <div className={cn('relative edo-hairline h-28 md:h-full', className)}>
      <div
        ref={stripRef}
        className="flex h-full edo-hairline overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                'edo-focus-ring group relative h-full shrink-0 snap-start overflow-hidden bg-white border-0 p-0 cursor-pointer transition-opacity duration-150 ease-edo-out',
                isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100',
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
              {isActive && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-primary"
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
  const [navSheetOpen, setNavSheetOpen] = useState(false);
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

  // Mobile navigation between plateaux: a sticky row at the top of the page
  // shows the currently selected plateau (number · name · tagline · arrow);
  // tapping it opens a BottomSheet listing all plateaux. Tapping a row in the
  // sheet navigates immediately and closes the sheet.
  const navigateToPlateau = (key: string) => {
    if (key === slug) {
      setNavSheetOpen(false);
      return;
    }
    setNavSheetOpen(false);
    goto(key === 'cyclorama' ? 'cyclorama' : `plateau-${key}`);
  };
  const currentNumber = String(Math.max(0, order.indexOf(slug)) + 1).padStart(2, '0');

  return (
    /* Mobile: single-column stacked, scrollable. Desktop (md+): 4-column bento */
    <div className="edo-page-enter grid w-full edo-hairline md:h-full md:grid-cols-plateau md:grid-rows-plateau md:overflow-hidden">

      {/* Unified header — compact right-aligned actions on all breakpoints */}
      <PageHeader
        lang={lang}
        title={common.stages[lang]}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={buildMainNav({ lang, goto, exclude: 'stages' })}
      />

      {/* Mobile navigation: sticky single-row trigger showing the current
          plateau. Tap opens a BottomSheet listing all plateaux; selecting a
          row in the sheet navigates and closes the sheet immediately. */}
      <button
        type="button"
        onClick={() => setNavSheetOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={navSheetOpen}
        aria-controls="plateau-nav-sheet"
        className="sticky top-14 z-30 md:hidden flex items-center gap-4 min-h-14 w-full px-4 py-3 bg-white border-b border-border text-left edo-focus-ring cursor-pointer"
      >
        <span className="font-mono text-label tracking-label text-muted-foreground">
          {currentNumber}
        </span>
        <span className="text-cell tracking-copy-tight font-medium text-foreground truncate">
          {p.name}
        </span>
        <span className="ml-auto font-mono text-micro uppercase tracking-ui text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
          {p.tagline[lang]}
        </span>
        <IconSelector width="16" height="16" className="shrink-0 text-foreground" />
      </button>

      <BottomSheet
        id="plateau-nav-sheet"
        open={navSheetOpen}
        onClose={() => setNavSheetOpen(false)}
        title={common.stages[lang]}
        ariaLabel={common.stages[lang]}
        closeLabel={common.close[lang]}
      >
        <ul className="list-none m-0 p-0 flex flex-col">
          {order.map((m, i) => {
            const cfg = plateaux[m];
            if (!cfg) return null;
            const active = m === slug;
            const num = String(i + 1).padStart(2, '0');
            return (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => navigateToPlateau(m)}
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
                  <span className="text-cell tracking-copy-tight font-medium truncate">
                    {cfg.name}
                  </span>
                  <span
                    className={cn(
                      'ml-auto font-mono text-micro uppercase tracking-ui whitespace-nowrap overflow-hidden text-ellipsis',
                      active ? 'text-background/70' : 'text-muted-foreground',
                    )}
                  >
                    {cfg.tagline[lang]}
                  </span>
                  <IconArrowRight width="16" height="16" className="shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      {/* Desktop sidebar: vertical list, hidden on mobile (replaced by inline pill nav). */}
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

      {/* Name + tagline. Hidden on mobile because the sticky picker trigger
          above already shows the plateau name + tagline — repeating them as a
          large hero right under the trigger felt duplicated. The trigger acts
          as the mobile heading; the desktop layout still surfaces this block
          in the right-hand column. The h1 below stays in the DOM on mobile
          via sr-only so screen readers always have a page heading. */}
      <h1 className="sr-only md:hidden">{p.name}</h1>
      <div className="hidden bg-white py-3.5 px-4 md:col-start-4 md:row-start-2 md:flex md:flex-col md:justify-between md:gap-1">
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
