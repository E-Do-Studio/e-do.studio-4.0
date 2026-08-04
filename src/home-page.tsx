import { Button } from '@/components/ui/button';
import { useLoaderData } from '@tanstack/react-router';
import { ArrowRight, Lock } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Trans } from 'react-i18next';
import { BookCTATile } from './book-cta';
import { useT } from './i18n/use-t';
import { usePageContext } from './lib/page-context';
import { SocialClientsBar } from './social-clients-bar';
import type { Bilingual } from './types';
import { fetchPriority } from './ui/fetch-priority';
import { HoverMarquee } from './ui/hover-marquee';
import { ImageCrossfade } from './ui/image-crossfade';
import { MobileAssistantFab } from './ui/mobile-assistant-fab';
import { PageHeader } from './ui/page-header';
import { ResponsiveImage } from './ui/responsive-image';
import { useIsDesktop } from './ui/use-is-desktop';
import { VideoLoop } from './ui/video-loop';

const AssistantChat = lazy(() => import('./assistant-chat'));

interface MachineRowItem {
  slug: string;
  fr: { t: string; sub: string };
  en: { t: string; sub: string };
}

// Sous-titres imposés aux machines servies par Strapi. Ce n'est pas de l'UI
// traduite mais un override de contenu CMS, consommé bilingue des deux côtés à
// la fois (cf. ecomMachines) : il reste donc en Bilingual, hors i18next.
const MACHINE_SUB_OVERRIDES: Record<string, Bilingual> = {
  horizontal: { fr: 'Packshot à plat', en: 'Flat packshot' },
  vertical: { fr: 'Packshot ghost / piqué', en: 'Ghost / pinned packshot' },
  eclipse: {
    fr: 'Photo et vidéo objets et access',
    en: 'Object & accessory photo / video',
  },
  live: { fr: 'Photo et vidéo Porté', en: 'On-model photo & video' },
};

// Rendered before Strapi resolves so the four ecommerce cells don't flash
// empty on first refresh. Titles match the Strapi `machines` collection and
// subs mirror MACHINE_SUB_OVERRIDES (the same overrides we apply at runtime).
const HOME_FALLBACK_MACHINES: MachineRowItem[] = [
  {
    slug: 'horizontal',
    fr: { t: 'Horizontal', sub: 'Packshot à plat' },
    en: { t: 'Horizontal', sub: 'Flat packshot' },
  },
  {
    slug: 'vertical',
    fr: { t: 'Vertical', sub: 'Packshot ghost / piqué' },
    en: { t: 'Vertical', sub: 'Ghost / pinned packshot' },
  },
  {
    slug: 'eclipse',
    fr: { t: 'Éclipse', sub: 'Photo et vidéo objets et access' },
    en: { t: 'Eclipse', sub: 'Object & accessory photo / video' },
  },
  {
    slug: 'live',
    fr: { t: 'Live', sub: 'Photo et vidéo Porté' },
    en: { t: 'Live', sub: 'On-model photo & video' },
  },
];

const HomePage = () => {
  const t = useT();
  const { lang, setLang, openMenu, goto, siteData } = usePageContext();
  const isDesktop = useIsDesktop();
  const { machines, contact } = siteData;
  const { announcement, homeHero } = useLoaderData({ from: '/$lang/' });
  const announcementText = announcement?.[lang]?.trim() ?? '';
  // SHOWREEL cell (small video tile): always video, as it was before EDO-176.
  // The multi-image rotation lives on the GALERIE cell (see below).
  const heroCmsVideo = homeHero?.videoUrl;
  const heroPosters = homeHero?.posters ?? [];
  const galleryHasCmsPosters = heroPosters.length > 0;
  const galleryUseCrossfade = heroPosters.length >= 2;
  const heroUseFallback = !heroCmsVideo;
  const heroVideo =
    heroCmsVideo ?? (heroUseFallback ? '/videos/showreel.mp4' : undefined);
  const heroVideoPoster = heroUseFallback
    ? '/showreel-preview.webp'
    : undefined;
  // Aperçu statique en couche de base de la cellule showreel ; quand le CMS
  // fournit une vidéo, VideoLoop apparaît par-dessus en fondu.
  const heroShowStaticPicture = !heroCmsVideo;
  // Subtitles for the homepage machine grid are pinned in the codebase so
  // marketing wording stays consistent regardless of Strapi content.
  const ecomMachines: MachineRowItem[] = machines
    ? machines
        .filter((m) => m.slug !== 'cyclorama')
        .map((m) => {
          const override = MACHINE_SUB_OVERRIDES[m.slug];
          return {
            slug: m.slug,
            fr: { t: m.fr.t, sub: override?.fr ?? m.fr.sub },
            en: { t: m.en.t, sub: override?.en ?? m.en.sub },
          };
        })
    : HOME_FALLBACK_MACHINES;

  return (
    /* Mobile: 2-col grid, vertical scroll. Desktop (md+): 12-col bento, fixed viewport */
    <main className="animate-in fade-in duration-300 grid w-full grid-cols-2 gap-px bg-border md:h-full md:grid-cols-12 md:grid-rows-[54px_44px_84px_1.1fr_1.25fr_84px] md:overflow-hidden">
      <h1 className="sr-only">E-Do Studio — {t('home.srTitle')}</h1>

      {/* ── Row 1: Header ── */}
      <PageHeader
        lang={lang}
        title={t('home.monSatHours')}
        titleAside={
          announcementText ? (
            <span className="flex min-w-0 items-center gap-2 font-mono text-base font-medium text-foreground">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              />
              <span className="truncate uppercase">{announcementText}</span>
            </span>
          ) : undefined
        }
        className="col-span-2 h-14 md:col-start-1 md:col-span-12 md:row-start-1 md:h-full"
        subgrid={false}
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={[
          {
            id: 'book',
            label: t('common.book'),
            onClick: () => goto('book'),
            variant: 'primary',
            className: 'md:hidden',
          },
          ...(contact?.phone
            ? [
                {
                  id: 'phone',
                  label: contact.phone.replace(/^\+33\s?/, '0'),
                  href:
                    contact.phoneHref ||
                    `tel:${contact.phone.replace(/\s/g, '')}`,
                  showArrow: false,
                  className: 'hidden sm:flex',
                },
              ]
            : []),
          {
            id: 'contact',
            label: t('common.contactUs'),
            onClick: () => goto('contact'),
            className: 'hidden md:flex',
          },
          {
            id: 'legal',
            label: 'Legal',
            onClick: () => goto('legal'),
            showArrow: false,
            className: 'hidden md:flex',
          },
          {
            id: 'etouch',
            label: 'Etouch',
            href: 'https://etouch.e-do.studio',
            target: '_blank',
            rel: 'noopener noreferrer',
            variant: 'dark',
            showArrow: false,
            className: 'hidden sm:flex',
          },
        ]}
      />

      {/* ── Row 2: Social links + clients marquee ── */}
      <SocialClientsBar className="col-span-2 md:col-start-1 md:col-end-13 md:row-start-2" />

      {/* ── Rows 3-4 left: E-commerce section ── */}
      <div className="col-span-2 min-h-72 flex flex-col overflow-hidden bg-background md:col-start-1 md:col-end-7 md:row-start-3 md:row-end-5 md:min-h-0">
        <div className="flex flex-shrink-0 flex-col gap-4 px-5 pt-6 pb-5 md:flex-1 md:min-h-0 md:px-7 md:pt-5 md:pb-4">
          {/* Une seule clé par phrase, le fragment stylé étant balisé dans la
 traduction : découper la phrase en deux clés figeait l'ordre des
 mots et la ponctuation finale. */}
          <h2 className="m-0 text-balance text-[clamp(1.5rem,2.2vw,2rem)] font-light tracking-tighter leading-tight text-foreground">
            <Trans
              i18nKey="home.studioHeadline"
              components={{ accent: <span className="italic text-primary" /> }}
            />
          </h2>
          <p className="m-0 text-pretty font-mono text-sm leading-relaxed text-muted-foreground">
            <Trans
              i18nKey="home.studioSubtitle"
              components={{ strong: <span className="text-foreground" /> }}
            />
          </p>
        </div>

        {/* Les filets entre tuiles sont la gouttière de la grille, pas des
            bordures posées sur chaque tuile : plus de calcul de bordure selon
            l'index, et plus de doublon là où le parent dessine déjà un filet.
            Seul le trait supérieur, qui sépare cette rangée du bloc de texte,
            appartient à la grille elle-même. */}
        <div className="flex min-h-0 flex-1 overflow-hidden md:max-h-full md:w-full md:flex-none md:aspect-[4/1]">
          <div className="grid flex-1 grid-cols-2 content-end gap-px border-t border-border bg-border md:grid-cols-4 md:content-stretch">
            {ecomMachines.map((m, i) => (
              <div key={m.slug} className="flex bg-background">
                <Button
                  variant="cell"
                  size="cell"
                  onClick={() => goto('plateau-' + m.slug)}
                  className="group aspect-[4/3] h-full w-full justify-between px-3 py-3 md:aspect-auto md:px-4 md:py-4"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-xs tracking-widest text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <ArrowRight
                      className="text-muted-foreground transition-all duration-200 ease-out group-hover:translate-x-1 group-hover:text-foreground"
                      width="14"
                      height="14"
                    />
                  </div>
                  <div className="w-full min-w-0 transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
                    <HoverMarquee className="text-base font-medium leading-tight tracking-tight text-foreground">
                      {m[lang].t}
                    </HoverMarquee>
                    <HoverMarquee className="mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
                      {m[lang].sub}
                    </HoverMarquee>
                  </div>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rows 3-4 right: Gallery hero ── */}
      <Button
        onClick={() => goto('gallery')}
        aria-label={t('common.gallery')}
        variant="cell"
        size="cell"
        className="dark group relative col-span-2 aspect-[6/5] items-stretch justify-end overflow-hidden bg-background p-6 transition-all hover:brightness-75 hover:bg-background md:col-start-7 md:col-end-13 md:row-start-3 md:row-end-5 md:aspect-auto"
      >
        {galleryUseCrossfade ? (
          <ImageCrossfade
            images={heroPosters.map((p, i) => ({
              url: p.url,
              alt: p.alt || `${t('common.gallery')} — ${i + 1}`,
            }))}
            priority
          />
        ) : galleryHasCmsPosters ? (
          <ResponsiveImage
            src={heroPosters[0].url}
            alt={heroPosters[0].alt || t('common.gallery')}
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
              {...fetchPriority(true)}
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
            <div className="text-5xl font-light tracking-tighter leading-none text-foreground transition-transform duration-300 group-hover:scale-105">
              {t('common.gallery')}
            </div>
          </div>
          <div className="flex-shrink-0">
            <ArrowRight
              className="transition-transform duration-200 ease-out group-hover:translate-x-1.5 group-hover:scale-110"
              width="16"
              height="16"
            />
          </div>
        </div>
      </Button>

      {/*
       * Mobile JSX order below mirrors the requested mobile stack:
       * Post-production + Cyclorama (50/50) → Video → Book CTA → Discovery (full-width).
       * Desktop positions are pinned by md:col-start-* / md:row-start-* so JSX order
       * doesn't affect the bento layout above the md breakpoint.
       */}

      {/* ── Rows 5-6 middle (desktop) / mobile row A left: Cyclorama ── */}
      <Button
        onClick={() => goto('cyclorama')}
        variant="cell"
        size="cell"
        className="group col-span-1 h-36 justify-between p-5 md:col-span-3 md:col-start-4 md:col-end-7 md:row-start-5 md:row-end-7 md:h-auto md:min-h-0"
      >
        <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">Espace</span>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="whitespace-nowrap text-3xl font-light tracking-tighter leading-none text-foreground">
              Cyclorama
            </div>
            <div className="mt-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {t('home.freeProductionPhotovideo')}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center justify-center">
            <ArrowRight
              className="transition-transform duration-200 ease-out group-hover:translate-x-1.5"
              width="16"
              height="16"
            />
          </div>
        </div>
      </Button>

      {/* ── Rows 5-6 right (desktop) / mobile row A right: Post-production ── */}
      <Button
        onClick={() => goto('postprod')}
        variant="cell"
        size="cell"
        className="group col-span-1 h-36 justify-between p-5 md:col-start-7 md:col-end-10 md:row-start-5 md:row-end-7 md:mt-[85px] md:h-[calc(100%-85px)]"
      >
        <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">Service</span>
        <div className="flex items-end justify-between gap-2.5">
          <div className="min-w-0">
            <div className="whitespace-nowrap text-3xl font-light tracking-tighter leading-none text-foreground">
              Post-production
            </div>
            <div className="mt-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {t('home.retouchPhotoVideo')}
            </div>
          </div>
          <ArrowRight
            className="flex-shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1.5"
            width="16"
            height="16"
          />
        </div>
      </Button>

      {/* ── Row 5 left (desktop) / mobile row B: Video / showreel ──
 Mobile uses a 5:4 aspect ratio so the showreel renders at a similar
 relative size to its desktop tile (~360×284 on a 1440×900 viewport),
 instead of being shrunk to a short banner. md+ reverts to the grid
 row sizing via aspect-auto. */}
      <div className="col-span-2 aspect-[5/4] flex overflow-hidden bg-black md:col-span-3 md:col-start-1 md:col-end-4 md:row-start-5 md:aspect-auto md:min-h-0">
        <Button
          onClick={() => goto('gallery')}
          aria-label={t('common.gallery')}
          className="group relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden border-0 bg-foreground p-0 text-left transition-all duration-150 hover:brightness-75"
        >
          {heroShowStaticPicture ? (
            <picture>
              <source srcSet="/showreel-preview.avif" type="image/avif" />
              <source srcSet="/showreel-preview.webp" type="image/webp" />
              <img
                src="/showreel-preview.webp"
                alt=""
                {...fetchPriority(true)}
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
        </Button>
      </div>

      {/* ── Row 5 right (desktop only): Book CTA.
 On mobile, the Book CTA lives in the header as a primary action
 (md:hidden), so this tile is desktop-only via `hidden md:flex`. */}
      <BookCTATile
        onClick={() => goto('book')}
        className="col-span-2 hidden md:col-start-7 md:col-end-10 md:row-start-5 md:flex"
      />

      {/* ── Row 6 left: Discovery CTA (Coming soon) ── */}
      <Button
        type="button"
        disabled
        aria-disabled="true"
        tabIndex={-1}
        className="pointer-events-none cursor-not-allowed group relative col-span-2 h-20 flex items-center justify-between gap-3 border-0 dark bg-background px-4 py-3 text-left text-foreground md:col-span-3 md:col-start-1 md:col-end-4 md:row-start-6 md:h-21"
      >
        <svg
          viewBox="0 0 200 84"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full opacity-20"
        >
          {[...Array(7)].map((_, i) => (
            <line
              key={'h' + i}
              x1="0"
              y1={i * 14}
              x2="200"
              y2={i * 14}
              stroke="currentColor"
              strokeWidth="0.3"
            />
          ))}
          {[...Array(14)].map((_, i) => (
            <line
              key={'v' + i}
              x1={i * 14}
              y1="0"
              x2={i * 14}
              y2="84"
              stroke="currentColor"
              strokeWidth="0.3"
            />
          ))}
        </svg>
        <div className="relative flex min-w-0 flex-col gap-1">
          <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">Discovery</span>
          <div className="text-xl font-normal tracking-tight leading-tight text-muted-foreground">
            {t('home.tellMeMore')}
          </div>
        </div>
        <div className="relative flex flex-shrink-0 items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <Lock width="11" height="11" />
            {t('home.comingSoon')}
          </span>
          <span
            className="sm:hidden inline-flex items-center justify-center rounded-full border border-border bg-muted p-1.5 text-muted-foreground"
            aria-hidden="true"
          >
            <Lock width="12" height="12" />
          </span>
        </div>
      </Button>

      {/* ── Rows 5-6 far right: Assistant chat (desktop only; mobile uses FAB) ──
 Mounted only above md so phones never download the chat chunk
 (and its Supabase dependency) for an offscreen widget. */}
      {isDesktop ? (
        <Suspense
          fallback={
            <div
              aria-hidden
              className="hidden bg-background md:flex md:col-start-10 md:col-end-13 md:row-start-5 md:row-end-7 md:min-h-0"
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
          className="hidden bg-background md:flex md:col-start-10 md:col-end-13 md:row-start-5 md:row-end-7 md:min-h-0"
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

export { HomePage };
