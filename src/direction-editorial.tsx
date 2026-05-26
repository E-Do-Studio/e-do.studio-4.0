import { lazy, Suspense, useState } from 'react';
import { CellLabel, IconArrowRight, IconChat, IconX, ImageCrossfade, PageHeader, SocialLinksRow, VideoLoop, cn } from './ui';
import { MarqueeCell } from './cells';

const AssistantChat = lazy(() => import('./assistant-chat'));
import { useSocialLinks, useMachines, useContact, useHomeHero, useStudioHours, useSiteBusinessInfo } from './lib/use-strapi';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import {
  buildLocalBusinessSchema,
  buildWebSiteSchema,
} from './lib/structured-data';
import type { Lang } from './types';
import { usePageContext } from './router';
import { cells as cellsMsg, common, contact as contactMsg, home as homeMsg } from './i18n/messages';

interface MachineRowItem {
  slug: string;
  fr: { t: string; sub: string };
  en: { t: string; sub: string };
}

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
      <div className="truncate text-cell font-medium tracking-headline leading-cell">
        {m[lang].t}
      </div>
      <div className="truncate mt-1 text-label font-mono text-muted-foreground uppercase tracking-caption">
        {m[lang].sub}
      </div>
    </div>
    <IconArrowRight className="text-muted-foreground transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5" width="16" height="16" />
  </button>
);

const DirectionA = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('home', lang);
  const { data: socialLinks } = useSocialLinks();
  const { data: machines } = useMachines();
  const { data: contact } = useContact();
  const { data: studioHours } = useStudioHours();
  const { data: business } = useSiteBusinessInfo();
  const { data: homeHero, loading: homeHeroLoading, error: homeHeroError } = useHomeHero();
  useStructuredData('home', [
    buildLocalBusinessSchema({ lang, contact, hours: studioHours, business, socials: socialLinks }),
    buildWebSiteSchema(lang),
  ]);
  // SHOWREEL cell (small video tile): always video, as it was before EDO-176.
  // The multi-image rotation lives on the GALERIE cell (see below).
  const heroResolved = !homeHeroLoading;
  const heroCmsVideo = homeHero?.videoUrl;
  const heroPosters = homeHero?.posters ?? [];
  const galleryHasCmsPosters = heroPosters.length > 0;
  const galleryUseCrossfade = heroPosters.length >= 2;
  const heroUseFallback = heroResolved && !heroCmsVideo;
  const heroVideo = heroCmsVideo ?? (heroUseFallback ? '/videos/showreel.mp4' : undefined);
  const heroVideoPoster = heroUseFallback ? '/showreel-preview.webp' : undefined;
  const heroShowStaticPicture = heroUseFallback || !!homeHeroError;
  const [chatOpen, setChatOpen] = useState(false);
  // Subtitles for the homepage machine grid are pinned in the codebase so
  // marketing wording stays consistent regardless of Strapi content.
  const ecomMachines: MachineRowItem[] = (machines ?? [])
    .filter((m) => m.slug !== 'cyclorama')
    .map((m) => {
      const override = homeMsg.machineSubs[m.slug];
      return {
        slug: m.slug,
        fr: { t: m.fr.t, sub: override?.fr ?? m.fr.sub },
        en: { t: m.en.t, sub: override?.en ?? m.en.sub },
      };
    });

  return (
    /* Mobile: 2-col grid, vertical scroll. Desktop (md+): 12-col bento, fixed viewport */
    <div className="edo-page-enter grid w-full grid-cols-2 gap-px bg-edo-pure-black md:h-full md:grid-cols-12 md:grid-rows-home md:overflow-hidden">
      <h1 className="sr-only">E-Do Studio — {homeMsg.srTitle[lang]}</h1>

      {/* ── Row 1: Header ── */}
      <PageHeader
        lang={lang}
        title={contactMsg.hours[lang]}
        subtitle={homeMsg.monSatHours[lang]}
        className="col-span-2 h-14 md:col-start-1 md:col-span-12 md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={[
          ...(contact?.phone
            ? [{ id: 'phone', label: contact.phone.replace(/^\+33\s?/, '0'), href: contact.phoneHref || `tel:${contact.phone.replace(/\s/g, '')}`, showArrow: false, className: 'hidden sm:flex' }]
            : []),
          { id: 'contact', label: common.contactUs[lang], onClick: () => goto('contact'), className: 'hidden md:flex' },
          { id: 'legal', label: 'Legal', onClick: () => goto('legal'), showArrow: false, className: 'hidden md:flex' },
          { id: 'etouch', label: 'Etouch', href: 'https://etouch.e-do.studio/', target: '_blank', rel: 'noopener noreferrer', variant: 'dark', showArrow: false, className: 'hidden sm:flex' },
        ]}
      />

      {/* ── Row 2: Social links (wrapped to 4-col grid) ── */}
      <SocialLinksRow className="col-span-2 md:col-start-1 md:col-end-5 md:row-start-2" />

      {/* ── Row 2: Marquee ── */}
      <div className="col-span-2 h-11 flex items-center overflow-hidden bg-white min-w-0 md:col-start-5 md:col-end-13 md:row-start-2">
        <MarqueeCell size={20} />
      </div>

      {/* ── Rows 3-4 left: E-commerce section ── */}
      <div className="col-span-2 min-h-72 flex flex-col overflow-hidden bg-edo-black md:col-start-1 md:col-end-7 md:row-start-3 md:row-end-5 md:min-h-0">
        <div className="flex flex-shrink-0 flex-col gap-3 px-5 pt-6 pb-5 md:px-7 md:pt-7 md:pb-6">
          <h2 className="m-0 text-balance text-[clamp(1.625rem,3vw,2.5rem)] font-light tracking-display leading-tight text-white">
            {homeMsg.studioHeadlineLead[lang]}{' '}
            <span className="italic text-primary">
              {homeMsg.studioHeadlineAccent[lang]}
            </span>
          </h2>
          <p className="m-0 text-balance text-detail leading-snug text-edo-gray-200">
            {homeMsg.studioSubtitleLead[lang]}
            <strong className="font-semibold text-white">
              {homeMsg.studioSubtitleStrong[lang]}
            </strong>
          </p>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden bg-edo-black">
          <div className="grid flex-1 grid-cols-3 content-end bg-edo-black md:grid-cols-4">
            {ecomMachines.map((m, i) => (
              <button
                key={m.slug}
                onClick={() => goto('plateau-' + m.slug)}
                className={cn(
                  'edo-focus-ring group flex aspect-[4/3] min-w-0 cursor-pointer flex-col justify-between bg-edo-black px-3 py-3 text-left text-white transition-colors duration-150 hover:bg-edo-dark md:aspect-square md:px-4 md:py-4',
                  // Hairline gray rules: top edge separates the card row from
                  // the empty area above, left edge separates adjacent cards.
                  'border-t border-l border-edo-gray-600',
                  // First card has no left border.
                  i === 0 && 'border-l-0',
                  // 4 items in a 3-col mobile grid would leave the 4th alone
                  // on row 2; let it span the row to avoid an awkward gap.
                  // Mobile: starts a new row (no left border). Desktop: col 4
                  // (left border restored).
                  i === 3 && 'col-span-3 aspect-auto border-l-0 md:col-span-1 md:aspect-square md:border-l',
                )}
              >
                <span className="font-mono text-micro text-edo-gray-500 tracking-meta">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div className="truncate text-cell font-medium tracking-headline leading-tight text-white">{m[lang].t}</div>
                  <div className="truncate mt-1 text-micro font-mono uppercase tracking-caption text-edo-gray-500">{m[lang].sub}</div>
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
        className="edo-focus-ring group relative col-span-2 min-h-48 flex flex-col items-stretch justify-end overflow-hidden border-0 bg-edo-dark p-6 text-white transition-all duration-150 hover:brightness-75 md:col-start-7 md:col-end-13 md:row-start-3 md:row-end-5"
      >
        {galleryUseCrossfade ? (
          <ImageCrossfade images={heroPosters} priority />
        ) : galleryHasCmsPosters ? (
          <img
            src={heroPosters[0].url}
            alt={heroPosters[0].alt}
            fetchPriority="high"
            decoding="async"
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

      {/* ── Row 5 left: Video / showreel ── */}
      <div className="col-span-2 min-h-56 flex overflow-hidden bg-black md:col-span-3 md:col-start-1 md:col-end-4 md:row-start-5 md:min-h-0">
        <button
          onClick={() => goto('gallery')}
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

      {/* ── Rows 5-6 middle: Cyclorama ── */}
      <button
        onClick={() => goto('cyclorama')}
        className="edo-focus-ring group col-span-2 min-h-32 flex cursor-pointer flex-col justify-between border-0 bg-white p-5 text-left text-foreground transition-colors duration-150 hover:bg-muted md:col-span-3 md:col-start-4 md:col-end-7 md:row-start-5 md:row-end-7 md:min-h-0"
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

      {/* ── Row 5 right: Book CTA ── */}
      <button
        onClick={() => goto('book')}
        className="edo-focus-ring group col-span-2 h-20 flex cursor-pointer items-center justify-between gap-3 border-0 bg-primary px-5 py-3 text-left text-white transition-colors duration-150 hover:bg-foreground hover:text-white md:col-start-7 md:col-end-10 md:row-start-5 md:h-21"
      >
        <div className="flex min-w-0 flex-col gap-1 transition-transform duration-150 group-hover:scale-102">
          <span className="font-mono text-label uppercase tracking-label text-white">
            {homeMsg.requestQuoteOr[lang]}
          </span>
          <span className="text-tile-title font-normal tracking-headline leading-tight text-white">
            {common.book[lang]}
          </span>
        </div>
        <IconArrowRight
          className="flex-shrink-0 transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5 group-hover:scale-110"
          width="16" height="16"        />
      </button>

      {/* ── Row 6 left: Discovery CTA ── */}
      <button
        onClick={() => goto('discovery')}
        className="edo-focus-ring group relative col-span-1 h-20 flex cursor-pointer items-center justify-between gap-3 border-0 bg-foreground px-4 py-3 text-left text-white transition-all duration-150 hover:brightness-110 md:col-start-1 md:col-end-4 md:row-start-6 md:h-21"
      >
        <svg viewBox="0 0 200 84" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-20">
          {[...Array(7)].map((_, i) => (<line key={'h' + i} x1="0" y1={i * 14} x2="200" y2={i * 14} stroke="currentColor" strokeWidth="0.3" />))}
          {[...Array(14)].map((_, i) => (<line key={'v' + i} x1={i * 14} y1="0" x2={i * 14} y2="84" stroke="currentColor" strokeWidth="0.3" />))}
        </svg>
        <div className="relative flex min-w-0 flex-col gap-1 transition-transform duration-150 group-hover:scale-102">
          <CellLabel className="text-white/70">Discovery</CellLabel>
          <div className="text-tile-title font-normal tracking-headline leading-tight text-white">
            {homeMsg.tellMeMore[lang]}
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <IconArrowRight
            className="transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5 group-hover:scale-110"
            width="16" height="16"          />
        </div>
      </button>

      {/* ── Rows 5-6 right: Post-production ── */}
      <button
        onClick={() => goto('postprod')}
        className="edo-focus-ring group col-span-1 h-20 flex cursor-pointer flex-col justify-between border-0 bg-white p-5 text-left text-foreground transition-colors duration-150 hover:bg-muted md:col-start-7 md:col-end-10 md:row-start-5 md:row-end-7 md:mt-home-offset md:h-home-offset"
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

      {/* ── Rows 5-6 far right: Assistant chat (desktop only; mobile uses FAB) ── */}
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

      {/* ── Mobile chat FAB + sheet ── */}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        aria-label={cellsMsg.assistant[lang]}
        className="edo-focus-ring fixed bottom-4 right-4 z-overlay flex h-14 w-14 cursor-pointer items-center justify-center border border-foreground bg-primary text-white shadow-lg transition-transform duration-150 hover:scale-105 md:hidden"
      >
        <IconChat width="22" height="22" />
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={cellsMsg.assistant[lang]}
        aria-hidden={chatOpen ? undefined : true}
        {...({ inert: chatOpen ? undefined : '' } as Record<string, unknown>)}
        className={cn(
          'fixed inset-0 z-sheet flex flex-col bg-white transition-opacity duration-200 md:hidden',
          chatOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-foreground px-4 py-3">
          <CellLabel>{cellsMsg.assistant[lang]}</CellLabel>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            aria-label={common.close[lang]}
            className="edo-focus-ring flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent text-foreground transition-colors hover:bg-muted"
          >
            <IconX width="20" height="20" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<div aria-hidden className="flex-1 bg-white" />}>
            {chatOpen && <AssistantChat lang={lang} className="h-full w-full" />}
          </Suspense>
        </div>
      </div>

    </div>
  );
};

export { DirectionA };
