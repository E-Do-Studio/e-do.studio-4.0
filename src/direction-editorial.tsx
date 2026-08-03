import { lazy, Suspense, useEffect, useState } from 'react';
import { cn } from './ui/cn';
import { HoverMarquee } from './ui/hover-marquee';
import { IconArrowRight, IconLock } from './ui/icons';
import { ImageCrossfade } from './ui/image-crossfade';
import { MobileAssistantFab } from './ui/mobile-assistant-fab';
import { PageHeader } from './ui/page-header';
import { ResponsiveImage } from './ui/responsive-image';
import { CellLabel } from './ui/typography';
import { VideoLoop } from './ui/video-loop';
import { BookCTATile } from './book-cta';
import { SocialClientsBar } from './social-clients-bar';

const AssistantChat = lazy(() => import('./assistant-chat'));
import { useLoaderData } from '@tanstack/react-router';
import {
  buildLocalBusinessSchema,
  buildWebSiteSchema,
} from './lib/structured-data';
import type { Lang } from './types';
import { usePageContext } from './lib/page-context';
import { common, home as homeMsg } from './i18n/messages';

interface MachineRowItem {
  slug: string;
  fr: { t: string; sub: string };
  en: { t: string; sub: string };
}

// Rendered before Strapi resolves so the four ecommerce cells don't flash
// empty on first refresh. Titles match the Strapi `machines` collection and
// subs mirror homeMsg.machineSubs (the same overrides we apply at runtime).
const HOME_FALLBACK_MACHINES: MachineRowItem[] = [
  { slug: 'horizontal', fr: { t: 'Horizontal', sub: 'Packshot à plat' }, en: { t: 'Horizontal', sub: 'Flat packshot' } },
  { slug: 'vertical', fr: { t: 'Vertical', sub: 'Packshot ghost / piqué' }, en: { t: 'Vertical', sub: 'Ghost / pinned packshot' } },
  { slug: 'eclipse', fr: { t: 'Éclipse', sub: 'Photo et vidéo objets et access' }, en: { t: 'Eclipse', sub: 'Object & accessory photo / video' } },
  { slug: 'live', fr: { t: 'Live', sub: 'Photo et vidéo Porté' }, en: { t: 'Live', sub: 'On-model photo & video' } },
];

interface MachineRowProps {
  idx: number;
  m: MachineRowItem;
  lang: Lang;
  onClick: () => void;
  isLast: boolean;
}

const MachineRow = ({ idx, m, lang, onClick, isLast }: MachineRowProps) => (
  <button
    onClick={onClick}
    className={cn(
      'edo-focus-ring flex cursor-pointer items-center border-0 bg-white text-left',
      'grid grid-cols-machine-row gap-3.5 px-4 py-2.5',
      'font-sans text-foreground transition-colors duration-150',
      'hover:bg-muted',
      isLast ? 'border-none' : 'border-b border-border',
    )}
  >
    <span className="font-mono text-label text-muted-foreground tracking-meta">
      {String(idx + 1).padStart(2, '0')}
    </span>
    <div className="min-w-0 overflow-hidden">
      <HoverMarquee className="text-cell font-medium tracking-headline leading-cell">
        {m[lang].t}
      </HoverMarquee>
      <HoverMarquee className="mt-1 text-label font-mono text-muted-foreground uppercase tracking-caption">
        {m[lang].sub}
      </HoverMarquee>
    </div>
    <IconArrowRight className="text-muted-foreground transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5" width="16" height="16" />
  </button>
);

// The chat cell takes a 3×2 desktop slot but is `hidden` on mobile. Without
// a viewport gate the lazy chunk (and Supabase) would still load on phones
// for an offscreen widget — defer the mount to desktop and let the FAB
// own the mobile path.
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

const DirectionA = () => {
  const { lang, setLang, openMenu, goto, siteData } = usePageContext();
  const isDesktop = useIsDesktop();
  const { socialLinks, machines, contact, studioHours, businessInfo: business } = siteData;
  const { announcement, homeHero } = useLoaderData({ from: '/$lang/' });
  const announcementText = announcement?.[lang]?.trim() ?? '';
  // SHOWREEL cell (small video tile): always video, as it was before EDO-176.
  // The multi-image rotation lives on the GALERIE cell (see below).
  const heroCmsVideo = homeHero?.videoUrl;
  const heroPosters = homeHero?.posters ?? [];
  const galleryHasCmsPosters = heroPosters.length > 0;
  const galleryUseCrossfade = heroPosters.length >= 2;
  const heroUseFallback = !heroCmsVideo;
  const heroVideo = heroCmsVideo ?? (heroUseFallback ? '/videos/showreel.mp4' : undefined);
  const heroVideoPoster = heroUseFallback ? '/showreel-preview.webp' : undefined;
  // Aperçu statique en couche de base de la cellule showreel ; quand le CMS
  // fournit une vidéo, VideoLoop apparaît par-dessus en fondu.
  const heroShowStaticPicture = !heroCmsVideo;
  // Subtitles for the homepage machine grid are pinned in the codebase so
  // marketing wording stays consistent regardless of Strapi content.
  const ecomMachines: MachineRowItem[] = machines
    ? machines
        .filter((m) => m.slug !== 'cyclorama')
        .map((m) => {
          const override = homeMsg.machineSubs[m.slug];
          return {
            slug: m.slug,
            fr: { t: m.fr.t, sub: override?.fr ?? m.fr.sub },
            en: { t: m.en.t, sub: override?.en ?? m.en.sub },
          };
        })
    : HOME_FALLBACK_MACHINES;

  return (
    /* Mobile: 2-col grid, vertical scroll. Desktop (md+): 12-col bento, fixed viewport */
    <main className="edo-page-enter grid w-full grid-cols-2 edo-hairline md:h-full md:grid-cols-12 md:grid-rows-home md:overflow-hidden">
      <h1 className="sr-only">E-Do Studio — {homeMsg.srTitle[lang]}</h1>

      {/* ── Row 1: Header ── */}
      <PageHeader
        lang={lang}
        title={homeMsg.monSatHours[lang]}
        titleAside={announcementText ? (
          <span className="flex min-w-0 items-center gap-2 font-mono text-cell font-medium text-foreground">
            <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="truncate uppercase">{announcementText}</span>
          </span>
        ) : undefined}
        className="col-span-2 h-14 md:col-start-1 md:col-span-12 md:row-start-1 md:h-full"
        subgrid={false}
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={[
          { id: 'book', label: common.book[lang], onClick: () => goto('book'), variant: 'primary', className: 'md:hidden' },
          ...(contact?.phone
            ? [{ id: 'phone', label: contact.phone.replace(/^\+33\s?/, '0'), href: contact.phoneHref || `tel:${contact.phone.replace(/\s/g, '')}`, showArrow: false, className: 'hidden sm:flex' }]
            : []),
          { id: 'contact', label: common.contactUs[lang], onClick: () => goto('contact'), className: 'hidden md:flex' },
          { id: 'legal', label: 'Legal', onClick: () => goto('legal'), showArrow: false, className: 'hidden md:flex' },
          { id: 'etouch', label: 'Etouch', href: 'https://etouch.e-do.studio', target: '_blank', rel: 'noopener noreferrer', variant: 'dark', showArrow: false, className: 'hidden sm:flex' },
        ]}
      />

      {/* ── Row 2: Social links + clients marquee ── */}
      <SocialClientsBar
        className="col-span-2 md:col-start-1 md:col-end-13 md:row-start-2"
      />

      {/* ── Rows 3-4 left: E-commerce section ── */}
      <div className="col-span-2 min-h-72 flex flex-col overflow-hidden bg-white md:col-start-1 md:col-end-7 md:row-start-3 md:row-end-5 md:min-h-0">
        <div className="flex flex-shrink-0 flex-col gap-4 px-5 pt-6 pb-5 md:flex-1 md:min-h-0 md:px-7 md:pt-5 md:pb-4">
          <h2 className="m-0 text-balance text-[clamp(1.5rem,2.2vw,2rem)] font-light tracking-display leading-tight text-foreground">
            {homeMsg.studioHeadlineLead[lang]}{' '}
            <span className="italic text-primary">
              {homeMsg.studioHeadlineAccent[lang]}
            </span>
            .
          </h2>
          <p className="m-0 text-pretty font-mono text-detail leading-relaxed text-muted-foreground">
            {homeMsg.studioSubtitleLead[lang]}
            <span className="text-foreground">
              {homeMsg.studioSubtitleStrong[lang]}
            </span>
          </p>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden bg-white md:flex-none md:w-full md:max-h-full md:aspect-[4/1]">
          <div className="grid flex-1 grid-cols-2 content-end bg-white md:grid-cols-4 md:content-stretch">
            {ecomMachines.map((m, i) => (
              <button
                key={m.slug}
                onClick={() => goto('plateau-' + m.slug)}
                className={cn(
                  'edo-focus-ring group flex aspect-[4/3] min-w-0 cursor-pointer flex-col justify-between bg-white px-3 py-3 text-left text-foreground transition-colors duration-150 hover:bg-muted md:aspect-auto md:h-full md:w-full md:px-4 md:py-4',
                  'border-t border-l border-edo-gray-200',
                  i % 2 === 0 && 'border-l-0',
                  i === 0 ? 'md:border-l-0' : 'md:border-l',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-micro text-muted-foreground tracking-meta">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <IconArrowRight
                    className="text-muted-foreground transition-all duration-200 ease-edo-out group-hover:translate-x-1 group-hover:text-foreground"
                    width="14"
                    height="14"
                  />
                </div>
                <div className="transition-transform duration-200 ease-edo-out group-hover:-translate-y-0.5">
                  <HoverMarquee className="text-cell font-medium tracking-headline leading-tight text-foreground">{m[lang].t}</HoverMarquee>
                  <HoverMarquee className="mt-1 text-micro font-mono uppercase tracking-caption text-muted-foreground transition-colors duration-200 group-hover:text-foreground">{m[lang].sub}</HoverMarquee>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rows 3-4 right: Gallery hero ── */}
      <button
        onClick={() => goto('gallery')}
        aria-label={common.gallery[lang]}
        className="edo-focus-ring group relative col-span-2 aspect-[6/5] flex flex-col items-stretch justify-end overflow-hidden border-0 bg-edo-dark p-6 text-white transition-all duration-150 hover:brightness-75 md:col-start-7 md:col-end-13 md:row-start-3 md:row-end-5 md:aspect-auto"
      >
        {galleryUseCrossfade ? (
          <ImageCrossfade
            images={heroPosters.map((p, i) => ({
              url: p.url,
              alt: p.alt || `${common.gallery[lang]} — ${i + 1}`,
            }))}
            priority
          />
        ) : galleryHasCmsPosters ? (
          <ResponsiveImage
            src={heroPosters[0].url}
            alt={heroPosters[0].alt || common.gallery[lang]}
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <picture>
            <source srcSet="/gallery-hero.avif" type="image/avif" />
            <source srcSet="/gallery-hero.webp" type="image/webp" />
            <img
              src="/gallery-hero.jpg"
              alt=""
              width={1280}
              height={986}
              fetchPriority="high"
              decoding="async"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          </picture>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.25)_0%,rgba(0,0,0,0)_30%,rgba(0,0,0,0)_55%,rgba(0,0,0,.65)_100%)]"
        />
        <div className="relative flex-1" />
        <div className="relative flex w-full items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-hero font-light tracking-display leading-solid text-white transition-transform duration-300 group-hover:scale-102">
              {common.gallery[lang]}
            </div>
          </div>
          <div className="flex-shrink-0">
            <IconArrowRight
              className="transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5 group-hover:scale-110"
              width="16" height="16"            />
          </div>
        </div>
      </button>

      {/*
       * Mobile JSX order below mirrors the requested mobile stack:
       *   Post-production + Cyclorama (50/50) → Video → Book CTA → Discovery (full-width).
       * Desktop positions are pinned by md:col-start-* / md:row-start-* so JSX order
       * doesn't affect the bento layout above the md breakpoint.
       */}

      {/* ── Rows 5-6 middle (desktop) / mobile row A left: Cyclorama ── */}
      <button
        onClick={() => goto('cyclorama')}
        className="edo-focus-ring group col-span-1 h-36 flex cursor-pointer flex-col justify-between border-0 bg-white p-5 text-left text-foreground transition-colors duration-150 hover:bg-muted md:col-span-3 md:col-start-4 md:col-end-7 md:row-start-5 md:row-end-7 md:h-auto md:min-h-0"
      >
        <CellLabel>Espace</CellLabel>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="whitespace-nowrap text-page-title font-light tracking-display leading-none text-foreground">
              Cyclorama
            </div>
            <div className="mt-1.5 text-caption font-mono uppercase tracking-ui text-muted-foreground">
              {homeMsg.freeProductionPhotovideo[lang]}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center justify-center">
            <IconArrowRight
              className="transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5"
              width="16" height="16"
            />
          </div>
        </div>
      </button>

      {/* ── Rows 5-6 right (desktop) / mobile row A right: Post-production ── */}
      <button
        onClick={() => goto('postprod')}
        className="edo-focus-ring group col-span-1 h-36 flex cursor-pointer flex-col justify-between border-0 bg-white p-5 text-left text-foreground transition-colors duration-150 hover:bg-muted md:col-start-7 md:col-end-10 md:row-start-5 md:row-end-7 md:mt-home-offset md:h-home-offset"
      >
        <CellLabel>Service</CellLabel>
        <div className="flex items-end justify-between gap-2.5">
          <div className="min-w-0">
            <div className="whitespace-nowrap text-page-title font-light tracking-display leading-none text-foreground">
              Post-production
            </div>
            <div className="mt-1.5 font-mono text-caption uppercase tracking-ui text-muted-foreground">
              {homeMsg.retouchPhotoVideo[lang]}
            </div>
          </div>
          <IconArrowRight
            className="flex-shrink-0 transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5"
            width="16" height="16"
          />
        </div>
      </button>

      {/* ── Row 5 left (desktop) / mobile row B: Video / showreel ──
          Mobile uses a 5:4 aspect ratio so the showreel renders at a similar
          relative size to its desktop tile (~360×284 on a 1440×900 viewport),
          instead of being shrunk to a short banner. md+ reverts to the grid
          row sizing via aspect-auto. */}
      <div className="col-span-2 aspect-[5/4] flex overflow-hidden bg-black md:col-span-3 md:col-start-1 md:col-end-4 md:row-start-5 md:aspect-auto md:min-h-0">
        <button
          onClick={() => goto('gallery')}
          aria-label={common.gallery[lang]}
          className="edo-focus-ring group relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden border-0 bg-edo-dark p-0 text-left transition-all duration-150 hover:brightness-75"
        >
          {heroShowStaticPicture ? (
            <picture>
              <source srcSet="/showreel-preview.avif" type="image/avif" />
              <source srcSet="/showreel-preview.webp" type="image/webp" />
              <img
                src="/showreel-preview.webp"
                alt=""
                fetchPriority="high"
                decoding="async"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
            </picture>
          ) : null}
          {heroVideo && (
            <VideoLoop
              src={heroVideo}
              poster={heroVideoPoster}
              className="absolute inset-0 h-full w-full"
            />
          )}
          <div className="absolute inset-0 bg-home-media-gradient" />
        </button>
      </div>

      {/* ── Row 5 right (desktop only): Book CTA.
          On mobile, the Book CTA lives in the header as a primary action
          (md:hidden), so this tile is desktop-only via `hidden md:flex`. */}
      <BookCTATile
        lang={lang}
        onClick={() => goto('book')}
        className="col-span-2 hidden md:col-start-7 md:col-end-10 md:row-start-5 md:flex"
      />

      {/* ── Row 6 left: Discovery CTA (Coming soon) ── */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        tabIndex={-1}
        className="pointer-events-none cursor-not-allowed group relative col-span-2 h-20 flex items-center justify-between gap-3 border-0 bg-foreground px-4 py-3 text-left text-white md:col-span-3 md:col-start-1 md:col-end-4 md:row-start-6 md:h-21"
      >
        <svg viewBox="0 0 200 84" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-20">
          {[...Array(7)].map((_, i) => (<line key={'h' + i} x1="0" y1={i * 14} x2="200" y2={i * 14} stroke="currentColor" strokeWidth="0.3" />))}
          {[...Array(14)].map((_, i) => (<line key={'v' + i} x1={i * 14} y1="0" x2={i * 14} y2="84" stroke="currentColor" strokeWidth="0.3" />))}
        </svg>
        <div className="relative flex min-w-0 flex-col gap-1">
          <CellLabel className="text-white/70">Discovery</CellLabel>
          <div className="text-tile-title font-normal tracking-headline leading-tight text-white/60">
            {homeMsg.tellMeMore[lang]}
          </div>
        </div>
        <div className="relative flex flex-shrink-0 items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-label uppercase tracking-ui text-white/80">
            <IconLock width="11" height="11" />
            {homeMsg.comingSoon[lang]}
          </span>
          <span className="sm:hidden inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 p-1.5 text-white/80" aria-hidden="true">
            <IconLock width="12" height="12" />
          </span>
        </div>
      </button>

      {/* ── Rows 5-6 far right: Assistant chat (desktop only; mobile uses FAB) ──
          Mounted only above md so phones never download the chat chunk
          (and its Supabase dependency) for an offscreen widget. */}
      {isDesktop ? (
        <Suspense
          fallback={
            <div
              aria-hidden
              className="hidden bg-white md:flex md:col-start-10 md:col-end-13 md:row-start-5 md:row-end-7 md:min-h-0"
            />
          }
        >
          <AssistantChat
            lang={lang}
            className="hidden md:flex md:col-start-10 md:col-end-13 md:row-start-5 md:row-end-7 md:min-h-0"
          />
        </Suspense>
      ) : (
        <div
          aria-hidden
          className="hidden bg-white md:flex md:col-start-10 md:col-end-13 md:row-start-5 md:row-end-7 md:min-h-0"
        />
      )}

      {/* ── Mobile chat FAB + sheet ──
          Discreet 40px floating button that opens a full-screen sheet on
          mobile. Desktop keeps the in-grid AssistantChat. Logic lives in
          MobileAssistantFab so the discovery page can reuse the same UX. */}
      <MobileAssistantFab lang={lang} />

    </main>
  );
};

export { DirectionA };
