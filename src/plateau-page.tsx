import { useEffect, useState } from 'react';
import { useLoaderData, useParams } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { CarouselNav } from './ui/carousel-nav';
import { HoverMarquee } from './ui/hover-marquee';
import { ArrowRight, ChevronsUpDown, Pause, Play, X } from 'lucide-react';
import { PageHeader, buildMainNav } from './ui/page-header';
import { ResponsiveImage } from './ui/responsive-image';
import { CellLabel } from './ui/typography';
import { cn } from '@/lib/utils';
import { VideoLoop } from './ui/video-loop';
import { usePageContext } from './lib/page-context';
import type { PlateauSpec } from './lib/strapi';
import { useT } from './i18n/use-t';
import type { Lang } from './types';
import type { MediaItem } from './lib/strapi';

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
// object-fit switches per media based on aspect ratio: only clearly landscape
// sources (aspect > ~1.3, matching the cell's landscape ratio) use
// `object-cover` to fill cleanly. Square and portrait sources use
// `object-contain` to preserve the subject — a packshot or square scarf must
// never be charcuted to fill the wider cell. Falls back to `cover` when
// natural dims are unknown. Controls are frosted-glass squares fading in on
// hover (always visible on touch).
const COVER_ASPECT_THRESHOLD = 1.3;
const Cover = ({
  items,
  lang,
  plateauName,
  index,
  onPrev,
  onNext,
  className,
}: CoverCarouselProps) => {
  const t = useT();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    setPaused(false);
  }, [index]);

  if (items.length === 0) return null;
  const item = items[index];
  const hasMultiple = items.length > 1;
  const total = items.length;
  const imageAspect =
    item.width && item.height ? item.width / item.height : null;
  const fit: 'cover' | 'contain' =
    imageAspect != null && imageAspect < COVER_ASPECT_THRESHOLD
      ? 'contain'
      : 'cover';
  const ctrlBtn =
    'edo-focus-ring absolute z-10 flex h-9 w-9 items-center justify-center cursor-pointer bg-black/35 backdrop-blur-md border border-white/20 text-white transition-[opacity,transform,background-color] duration-150 ease-edo-out hover:bg-black/50 active:scale-[0.96] opacity-100 md:opacity-0 md:scale-95 md:group-hover:opacity-100 md:group-hover:scale-100 md:group-focus-within:opacity-100 md:group-focus-within:scale-100';

  return (
    <div
      className={cn(
        'group relative overflow-hidden bg-white aspect-[4/3] md:aspect-auto md:min-h-0',
        className,
      )}
      role={hasMultiple ? 'group' : undefined}
      aria-roledescription={hasMultiple ? 'carousel' : undefined}
      aria-label={hasMultiple ? t('common.imageCarousel') : undefined}
    >
      {item.kind === 'video' ? (
        <VideoLoop
          key={item.url}
          src={item.url}
          poster={item.poster}
          objectFit={fit}
          paused={paused}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <ResponsiveImage
          key={item.url}
          src={item.url}
          alt={item.alt[lang] || `${plateauName} — ${index + 1}`}
          sizes="(min-width: 768px) 60vw, 100vw"
          priority
          className={cn(
            'absolute inset-0 h-full w-full',
            fit === 'contain' ? 'object-contain' : 'object-cover',
          )}
        />
      )}

      {item.kind === 'video' && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t('common.playVideo') : t('common.pauseVideo')}
          aria-pressed={paused}
          className={cn(ctrlBtn, 'bottom-3 right-3')}
        >
          {paused ? (
            <Play size={16} strokeWidth={1.5} />
          ) : (
            <Pause size={16} strokeWidth={1.5} />
          )}
        </button>
      )}

      {hasMultiple && (
        <>
          <CarouselNav onPrev={onPrev} onNext={onNext} />
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

// Thumbnail strip — every media item is rendered as a tile and fills 1/n of the
// strip width, so the full set is visible at once with no scroll and no arrows.
// Clicking a tile sets it as the cover. Inactive tiles are dimmed; the active
// tile is shown at full opacity.
const ThumbStrip = ({
  items,
  lang,
  plateauName,
  activeIndex,
  onSelect,
  className,
}: ThumbStripProps) => {
  if (items.length === 0) return null;
  // Tiles touch — `edo-hairline` forces `gap: 0` on the strip, and each tile's
  // 1.5px right-border serves as the visible separator. The bases must sum to
  // exactly 100% so the last tile aligns with the column boundary above.
  const tileBasis = `${100 / items.length}%`;
  // Strip occupies ~60vw on desktop (same column span as the cover) and 100vw
  // on mobile, divided by n tiles. Without this hint the browser would pick
  // the 245w `thumbnail_` derivative and stretch it — visible blur.
  const tileSizes = `(min-width: 768px) ${Math.ceil(60 / items.length)}vw, ${Math.ceil(100 / items.length)}vw`;

  return (
    <div className={cn('relative edo-hairline h-16 md:h-full', className)}>
      <div className="flex h-full edo-hairline overflow-hidden">
        {items.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={`${item.url}-${i}`}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`${item.alt[lang] || plateauName} — ${i + 1} / ${items.length}`}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'edo-focus-ring group relative h-full shrink-0 overflow-hidden bg-white border-0 p-0 cursor-pointer transition-opacity duration-150 ease-edo-out',
                isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100',
              )}
              style={{ flexBasis: tileBasis }}
            >
              {item.kind === 'video' ? (
                <VideoLoop
                  src={item.url}
                  poster={item.poster}
                  objectFit="cover"
                  paused={isActive}
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <ResponsiveImage
                  src={item.previewUrl ?? item.url}
                  alt={item.alt[lang] || `${plateauName} — ${i + 1}`}
                  sizes={tileSizes}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface PlateauPageProps {
  slug: string;
  plateaux: Record<string, PlateauSpec> | null;
}

const PlateauPage = ({ slug, plateaux }: PlateauPageProps) => {
  const t = useT();
  const { lang, setLang, openMenu, goto } = usePageContext();
  const [activeIndex, setActiveIndex] = useState(0);
  const [navSheetOpen, setNavSheetOpen] = useState(false);
  if (!plateaux) return null;
  const p = plateaux[slug] || plateaux.cyclorama;
  if (!p) return null;
  const order = ['live', 'eclipse', 'horizontal', 'vertical', 'cyclorama'];
  const coverItems: MediaItem[] = p.media ?? [];
  const safeIndex =
    coverItems.length === 0
      ? 0
      : ((activeIndex % coverItems.length) + coverItems.length) %
        coverItems.length;
  const goPrev = () => setActiveIndex((i) => i - 1);
  const goNext = () => setActiveIndex((i) => i + 1);

  // Mobile navigation between plateaux: a sticky row at the top of the page
  // shows the currently selected plateau (number · name · tagline · arrow);
  // tapping it opens a Drawer listing all plateaux. Tapping a row in the
  // sheet navigates immediately and closes the sheet.
  const navigateToPlateau = (key: string) => {
    if (key === slug) {
      setNavSheetOpen(false);
      return;
    }
    setNavSheetOpen(false);
    goto(key === 'cyclorama' ? 'cyclorama' : `plateau-${key}`);
  };
  const currentNumber = String(Math.max(0, order.indexOf(slug)) + 1).padStart(
    2,
    '0',
  );

  return (
    /* Mobile: single-column stacked, scrollable. Desktop (md+): 4-column bento */
    <main className="edo-page-enter grid w-full edo-hairline md:h-full md:grid-cols-plateau md:grid-rows-plateau md:overflow-hidden">
      {/* Unified header — compact right-aligned actions on all breakpoints */}
      <PageHeader
        lang={lang}
        title={t('common.stages')}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={buildMainNav({ lang, goto, exclude: 'stages' })}
      />

      {/* Mobile navigation: same sticky strip gabarit as MobileNavStrip
          (gallery filters) — h-14 wrapper with min-h-11 trigger button. Tap
          opens a Drawer listing all plateaux. */}
      <div
        className="sticky top-14 z-30 flex h-14 items-stretch border-b border-border bg-white md:hidden"
        role="toolbar"
        aria-label={t('common.stages')}
      >
        <button
          type="button"
          onClick={() => setNavSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={navSheetOpen}
          aria-controls="plateau-nav-sheet"
          className="edo-focus-ring flex min-h-11 w-full cursor-pointer items-center gap-2 px-4 text-left transition-colors duration-150 ease-edo-out hover:bg-muted"
        >
          <span className="font-mono text-label uppercase tracking-label text-foreground">
            {currentNumber}
          </span>
          <HoverMarquee className="text-cell tracking-copy-tight font-medium text-foreground">
            {p.name}
          </HoverMarquee>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <HoverMarquee className="font-mono text-label uppercase tracking-caption text-muted-foreground">
              {p.tagline[lang]}
            </HoverMarquee>
            <ChevronsUpDown
              width="16"
              height="16"
              className="shrink-0 text-foreground"
            />
          </span>
        </button>
      </div>

      <Drawer open={navSheetOpen} onOpenChange={setNavSheetOpen}>
        <DrawerContent id="plateau-nav-sheet">
          <DrawerHeader>
            <DrawerTitle>{t('common.stages')}</DrawerTitle>
            <DrawerClose
              aria-label={t('common.close')}
              render={<Button variant="ghost" size="icon" />}
            >
              <X />
            </DrawerClose>
          </DrawerHeader>
          <ul className="m-0 flex list-none flex-col overflow-y-auto p-0">
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
                    active
                      ? 'bg-foreground text-background'
                      : 'bg-white text-foreground',
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
                  <HoverMarquee className="text-cell tracking-copy-tight font-medium">
                    {cfg.name}
                  </HoverMarquee>
                  <HoverMarquee
                    className={cn(
                      'ml-auto font-mono text-micro uppercase tracking-ui',
                      active ? 'text-background/70' : 'text-muted-foreground',
                    )}
                  >
                    {cfg.tagline[lang]}
                  </HoverMarquee>
                  <ArrowRight width="16" height="16" className="shrink-0" />
                </button>
              </li>
            );
          })}
          </ul>
        </DrawerContent>
      </Drawer>

      {/* Desktop sidebar: vertical list, hidden on mobile (replaced by inline pill nav). */}
      <div className="hidden bg-white md:col-start-1 md:row-start-2 md:row-span-4 md:flex md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {order.map((m, i) => {
          const cfg = plateaux[m];
          if (!cfg) return null;
          const active = m === slug;
          return (
            <button
              key={m}
              onClick={() =>
                goto(m === 'cyclorama' ? 'cyclorama' : 'plateau-' + m)
              }
              className={`edo-focus-ring flex-none py-3.5 px-4 border-0 cursor-pointer text-left flex flex-col gap-1 transition-colors duration-150
                md:border-b md:border-border
                ${active ? 'bg-muted border-b-2 border-b-primary md:border-b-border md:border-l-2 md:border-l-primary' : 'bg-white border-b-2 border-b-transparent md:border-b-border md:border-l-2 md:border-l-transparent hover:bg-muted'}`}
            >
              <span
                className={`font-mono text-label tracking-label ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={`text-cell tracking-copy-tight whitespace-nowrap ${active ? 'font-medium text-foreground' : 'font-normal text-muted-foreground'}`}
              >
                {cfg.name}
              </span>
              <span className="font-mono text-micro tracking-ui uppercase text-muted-foreground hidden md:block">
                {cfg.tagline[lang]}
              </span>
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

      {/* Thumbnail strip — every media item visible at once (1/n width each),
          no scroll, no arrows. Clicking a tile sets it as the cover. */}
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
        <h1 className="text-tile-large font-light m-0 tracking-display leading-none">
          {p.name}
        </h1>
      </div>

      {/* Specifications */}
      <div className="bg-white p-3 px-4 flex flex-col gap-1.5 md:col-start-4 md:row-start-3">
        <CellLabel>{t('plateau.specs')}</CellLabel>
        <div className="flex flex-col flex-1 min-h-0">
          {p.specs.map((s, i) => (
            <div
              key={s.k.fr}
              className={`flex justify-between items-baseline gap-3 text-caption py-1 ${i < p.specs.length - 1 ? 'border-b border-border' : ''}`}
            >
              <span className="text-muted-foreground shrink-0">
                {s.k[lang]}
              </span>
              <span className="text-foreground font-mono tracking-caption text-label text-right whitespace-pre-line overflow-hidden line-clamp-2 leading-snug">
                {(s.v[lang] || '').split(' · ').join(' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rates */}
      <div className="bg-white px-4 pt-2.5 pb-3 flex flex-col gap-1 md:col-start-4 md:row-start-4">
        <CellLabel>{t('plateau.rates')}</CellLabel>
        <div className="flex flex-col flex-1 min-h-0">
          {p.rates.map((r, i) => (
            <div
              key={r.k.fr}
              className={`flex justify-between items-baseline text-caption py-1 ${i < p.rates.length - 1 ? 'border-b border-border' : ''}`}
            >
              <span className="text-muted-foreground">{r.k[lang]}</span>
              <span className="text-foreground font-mono tracking-caption text-caption">
                {typeof r.v === 'string' ? r.v : r.v[lang]}
              </span>
            </div>
          ))}
        </div>
        {p.ratesNote && (
          <div className="font-mono text-micro tracking-caption text-muted-foreground leading-normal mt-0.5 break-words">
            {p.ratesNote[lang]}
          </div>
        )}
      </div>

      {/* Description + Uses */}
      <div className="bg-white p-4 flex justify-between items-start gap-6 md:col-start-2 md:col-span-2 md:row-start-5">
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <CellLabel>{t('common.description')}</CellLabel>
          <p className="m-0 text-caption text-foreground leading-normal max-w-2xl">
            {p.desc[lang]}
          </p>
        </div>
        <div className="flex-none w-40 flex flex-col gap-1.5">
          <CellLabel>{t('plateau.uses')}</CellLabel>
          <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
            {p.uses.map((a) => (
              <li
                key={a.fr}
                className="text-caption text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis"
              >
                · {a[lang]}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Book CTA */}
      <button
        onClick={() => {
          try {
            localStorage.setItem('edo-book-plateau', slug);
          } catch (e) {}
          goto('book');
        }}
        className="edo-focus-ring bg-primary p-4 border-0 cursor-pointer flex flex-col justify-between text-left text-white font-inherit min-h-20 transition-[color,background-color,opacity] duration-150 ease-edo-out hover:opacity-90 md:col-start-4 md:row-start-5"
      >
        <CellLabel className="text-white/80">
          06 · {t('common.bookNow')}
        </CellLabel>
        <div className="flex justify-between items-end text-white w-full">
          <span className="text-tile-large font-medium tracking-headline">
            {t('common.bookThisStage')}
          </span>
          <ArrowRight width="20" height="20" />
        </div>
      </button>
    </main>
  );
};

const CycloramaPage = () => {
  const { plateaux } = useLoaderData({ from: '/$lang/cyclorama' });
  return <PlateauPage slug="cyclorama" plateaux={plateaux} />;
};

const PlateauSlugPage = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const { plateaux } = useLoaderData({ from: '/$lang/plateau/$slug' });
  return <PlateauPage key={slug} slug={slug} plateaux={plateaux} />;
};

export { PlateauPage, CycloramaPage, PlateauSlugPage };
