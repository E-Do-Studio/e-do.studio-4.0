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
  // Contrôle posé sur la photo : sa toile de fond n'est pas une surface du
  // thème mais l'image elle-même. Le scope `dark` fait résoudre les tokens
  // vers la palette sombre — même voile foncé qu'avant, sans couleur écrite
  // en dur. Le reste (curseur, centrage, anneau de focus, transition) vient
  // déjà de la base de `Button`.
  const ctrlBtn =
    'dark absolute z-10 border border-foreground/20 bg-background/35 text-foreground backdrop-blur-md hover:bg-background/50 active:scale-[0.96] opacity-100 md:opacity-0 md:scale-95 md:group-hover:opacity-100 md:group-hover:scale-100 md:group-focus-within:opacity-100 md:group-focus-within:scale-100';

  return (
    <div
      className={cn(
        'group relative overflow-hidden bg-background aspect-[4/3] md:aspect-auto md:min-h-0',
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
        <Button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t('common.playVideo') : t('common.pauseVideo')}
          aria-pressed={paused}
          size="icon-lg"
          className={cn(ctrlBtn, 'bottom-3 right-3')}
        >
          {paused ? (
            <Play size={16} strokeWidth={1.5} />
          ) : (
            <Pause size={16} strokeWidth={1.5} />
          )}
        </Button>
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
  // Les bases doivent totaliser exactement 100 % pour que la dernière tuile
  // s'aligne sur la frontière de colonne au-dessus.
  const tileBasis = `${100 / items.length}%`;
  // Strip occupies ~60vw on desktop (same column span as the cover) and 100vw
  // on mobile, divided by n tiles. Without this hint the browser would pick
  // the 245w `thumbnail_` derivative and stretch it — visible blur.
  const tileSizes = `(min-width: 768px) ${Math.ceil(60 / items.length)}vw, ${Math.ceil(100 / items.length)}vw`;

  return (
    <div className={cn('relative h-16 md:h-full', className)}>
      <div className="flex h-full gap-px bg-border overflow-hidden">
        {items.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <Button
              key={`${item.url}-${i}`}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`${item.alt[lang] || plateauName} — ${i + 1} / ${items.length}`}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'group relative h-full overflow-hidden bg-background border-0 p-0 transition-opacity duration-150 ease-out',
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
            </Button>
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
    <main className="animate-in fade-in duration-300 grid w-full gap-px bg-border md:h-full md:grid-cols-[240px_repeat(3,minmax(0,1fr))] md:grid-rows-[54px_78px_minmax(0,1.58fr)_minmax(0,0.5fr)_minmax(0,0.52fr)] md:overflow-hidden">
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
        className="sticky top-14 z-30 flex h-14 items-stretch border-b border-border bg-background md:hidden"
        role="toolbar"
        aria-label={t('common.stages')}
      >
        <Button
          type="button"
          onClick={() => setNavSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={navSheetOpen}
          aria-controls="plateau-nav-sheet"
          variant="cell"
          size="cell"
          className="min-h-11 w-full flex-row items-center gap-2 bg-transparent px-4"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-foreground">
            {currentNumber}
          </span>
          <HoverMarquee className="text-base tracking-tight font-medium text-foreground">
            {p.name}
          </HoverMarquee>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <HoverMarquee className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {p.tagline[lang]}
            </HoverMarquee>
            <ChevronsUpDown
              width="16"
              height="16"
              className="shrink-0 text-foreground"
            />
          </span>
        </Button>
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
                  <Button
                    type="button"
                    onClick={() => navigateToPlateau(m)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'w-full flex gap-4 min-h-14 px-4 py-3',
                      'border-b border-border text-left',
                      'transition-colors duration-150 ease-out',
                      active
                        ? 'bg-foreground text-background'
                        : 'bg-background text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'font-mono text-xs tracking-widest',
                        active ? 'text-background/70' : 'text-muted-foreground',
                      )}
                    >
                      {num}
                    </span>
                    <HoverMarquee className="text-base tracking-tight font-medium">
                      {cfg.name}
                    </HoverMarquee>
                    <HoverMarquee
                      className={cn(
                        'ml-auto font-mono text-xs uppercase tracking-widest',
                        active ? 'text-background/70' : 'text-muted-foreground',
                      )}
                    >
                      {cfg.tagline[lang]}
                    </HoverMarquee>
                    <ArrowRight width="16" height="16" className="shrink-0" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </DrawerContent>
      </Drawer>

      {/* Desktop sidebar: vertical list, hidden on mobile (replaced by inline pill nav). */}
      <div className="hidden bg-background md:col-start-1 md:row-start-2 md:row-span-4 md:flex md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {order.map((m, i) => {
          const cfg = plateaux[m];
          if (!cfg) return null;
          const active = m === slug;
          return (
            <Button
              key={m}
              onClick={() =>
                goto(m === 'cyclorama' ? 'cyclorama' : 'plateau-' + m)
              }
              variant="cell"
              size="cell"
              aria-pressed={active}
              // La colonne est `hidden md:flex` : une classe sans préfixe
              // `md:` ne vaudrait qu'en dessous du palier, où l'élément
              // n'existe pas. Seul l'état `md:` a donc un sens ici.
              className={cn(
                'flex-none gap-1 border-b border-l-2 border-b-border px-4 py-3.5',
                active
                  ? 'border-l-primary bg-muted'
                  : 'border-l-transparent bg-background hover:bg-muted',
              )}
            >
              <span
                className={`font-mono text-xs tracking-widest ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={`text-base tracking-tight whitespace-nowrap ${active ? 'font-medium text-foreground' : 'font-normal text-muted-foreground'}`}
              >
                {cfg.name}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground hidden md:block">
                {cfg.tagline[lang]}
              </span>
            </Button>
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
      <div className="hidden bg-background py-3.5 px-4 md:col-start-4 md:row-start-2 md:flex md:flex-col md:justify-between md:gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{p.tagline[lang]}</span>
        <h1 className="text-2xl font-light m-0 tracking-tighter leading-none">
          {p.name}
        </h1>
      </div>

      {/* Specifications */}
      <div className="bg-background p-3 px-4 flex flex-col gap-1.5 md:col-start-4 md:row-start-3">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t('plateau.specs')}</span>
        <div className="flex flex-col flex-1 min-h-0">
          {p.specs.map((s) => (
            <div
              key={s.k.fr}
              className="flex items-baseline justify-between gap-3 border-b border-border py-1 text-xs last:border-b-0"
            >
              <span className="text-muted-foreground shrink-0">
                {s.k[lang]}
              </span>
              <span className="text-foreground font-mono tracking-widest text-xs text-right whitespace-pre-line overflow-hidden line-clamp-2 leading-snug">
                {(s.v[lang] || '').split(' · ').join(' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rates */}
      <div className="bg-background px-4 pt-2.5 pb-3 flex flex-col gap-1 md:col-start-4 md:row-start-4">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t('plateau.rates')}</span>
        <div className="flex flex-col flex-1 min-h-0">
          {p.rates.map((r) => (
            <div
              key={r.k.fr}
              className="flex items-baseline justify-between border-b border-border py-1 text-xs last:border-b-0"
            >
              <span className="text-muted-foreground">{r.k[lang]}</span>
              <span className="text-foreground font-mono tracking-widest text-xs">
                {typeof r.v === 'string' ? r.v : r.v[lang]}
              </span>
            </div>
          ))}
        </div>
        {p.ratesNote && (
          <div className="font-mono text-xs tracking-widest text-muted-foreground leading-normal mt-0.5 break-words">
            {p.ratesNote[lang]}
          </div>
        )}
      </div>

      {/* Description + Uses */}
      <div className="bg-background p-4 flex justify-between items-start gap-6 md:col-start-2 md:col-span-2 md:row-start-5">
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t('common.description')}</span>
          <p className="m-0 text-xs text-foreground leading-normal max-w-2xl">
            {p.desc[lang]}
          </p>
        </div>
        <div className="flex-none w-40 flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t('plateau.uses')}</span>
          <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
            {p.uses.map((a) => (
              <li
                key={a.fr}
                className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis"
              >
                · {a[lang]}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Book CTA */}
      <Button
        onClick={() => {
          try {
            localStorage.setItem('', slug);
          } catch (e) {}
          goto('book');
        }}
        className="p-4 border-0 flex flex-col justify-between text-left font-[inherit] min-h-20 transition-[color,background-color,opacity] duration-150 ease-out hover:opacity-90 md:col-start-4 md:row-start-5"
      >
        <span className="font-mono text-xs uppercase tracking-widest text-primary-foreground/80">
          06 · {t('common.bookNow')}
        </span>
        <div className="flex w-full items-end justify-between text-primary-foreground">
          <span className="text-2xl font-medium tracking-tight">
            {t('common.bookThisStage')}
          </span>
          <ArrowRight width="20" height="20" />
        </div>
      </Button>
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
