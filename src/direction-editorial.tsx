import { lazy, Suspense, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryState, parseAsStringEnum } from 'nuqs';
import { CellLabel, IconArrowRight, PageHeader, SocialIcon, VideoLoop, cn } from './ui';
import { MarqueeCell } from './cells';

const AssistantChat = lazy(() => import('./assistant-chat'));
import { useSocialLinks, useGalleryCategories, useMachines, useContact, useHomeHero } from './lib/use-strapi';
import { useDocumentMeta } from './lib/use-document-meta';
import type { Lang } from './types';
import { usePageContext } from './router';
import { common, home as homeMsg } from './i18n/messages';

interface CatIconProps {
  kind: string;
  size?: number;
}

const CatIcon = ({ kind, size = 22 }: CatIconProps) => {
  const p = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'cosmetique') return (<svg viewBox="0 0 24 24" {...p}><rect x="8" y="10" width="8" height="11" rx="1" /><path d="M10 10V6h4v4M12 3v3" /></svg>);
  if (kind === 'bijoux') return (<svg viewBox="0 0 24 24" {...p}><path d="M4 10l3-4h10l3 4-8 10z" /><path d="M4 10h16M9 10l3-4 3 4M9 10l3 10M15 10l-3 10" /></svg>);
  if (kind === 'pap') return (<svg viewBox="0 0 24 24" {...p}><path d="M6 8l3-3h6l3 3 2 2-3 2v9H4v-9L1 10z" transform="translate(1 1)" /></svg>);
  if (kind === 'accessoires') return (<svg viewBox="0 0 24 24" {...p}><path d="M5 9 L19 9 L18 20 Q18 21 17 21 L7 21 Q6 21 6 20 Z" /><path d="M9 9 V7 Q9 4 12 4 Q15 4 15 7 V9" /></svg>);
  if (kind === 'food') return (<svg viewBox="0 0 24 24" {...p}><path d="M8 3v6a2 2 0 0 0 2 2h0v10M10 11a2 2 0 0 0 2-2V3M16 3v9c0 1 .5 1.5 1 2v7" /></svg>);
  if (kind === 'eyewear') return (<svg viewBox="0 0 24 24" {...p}><circle cx="7" cy="14" r="3.5" /><circle cx="17" cy="14" r="3.5" /><path d="M10.5 14h3M3.5 12L6 7h3M20.5 12L18 7h-3" /></svg>);
  return null;
};

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

const ECOM_VIEWS = ['categorie', 'machine'] as const;
type EcomView = (typeof ECOM_VIEWS)[number];

const DirectionA = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const navigate = useNavigate();
  useDocumentMeta('home', lang);
  const { data: socialLinks } = useSocialLinks();
  const { data: galleryCategories } = useGalleryCategories();
  const { data: machines } = useMachines();
  const { data: contact } = useContact();
  const { data: homeHero, loading: homeHeroLoading, error: homeHeroError } = useHomeHero();
  // Only commit to a fallback once we know Strapi returned nothing — avoids the
  // brief flash of the static poster on first paint while the CMS request is
  // still in flight.
  const heroResolved = !homeHeroLoading;
  const heroCmsVideo = homeHero?.videoUrl;
  const heroCmsPoster = homeHero?.posterUrl;
  const heroUseFallback = heroResolved && !heroCmsVideo && !heroCmsPoster;
  const heroVideo = heroCmsVideo ?? (heroUseFallback ? '/videos/showreel.mp4' : undefined);
  const heroPoster = heroCmsPoster ?? (heroUseFallback ? '/showreel-preview.webp' : undefined);
  const heroHasCmsPoster = !!heroCmsPoster;
  const heroShowStaticPicture = heroUseFallback || (!!homeHeroError && !heroCmsPoster);
  const [ecomMode, setEcomMode] = useState<EcomView>('categorie');
  const categories = galleryCategories ?? [];
  const ecomMachines: MachineRowItem[] = (machines ?? [])
    .filter((m) => m.slug !== 'cyclorama')
    .map((m) => ({
      slug: m.slug,
      fr: { t: m.fr.t, sub: m.fr.sub },
      en: { t: m.en.t, sub: m.en.sub },
    }));

  return (
    /* Mobile: 2-col grid, vertical scroll. Desktop (md+): 12-col bento, fixed viewport */
    <div className="edo-page-enter grid w-full grid-cols-2 gap-px bg-edo-pure-black overflow-y-auto md:h-full md:grid-cols-12 md:grid-rows-home md:overflow-hidden">
      <h1 className="sr-only">E-Do Studio — {homeMsg.srTitle[lang]}</h1>

      {/* ── Row 1: Header ── */}
      <PageHeader
        lang={lang}
        title={homeMsg.monSatHours[lang]}
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

      {/* ── Rows 2-3 left: E-commerce section ── */}
      <div className="col-span-2 min-h-72 flex flex-col overflow-hidden bg-white md:col-start-1 md:col-end-7 md:row-start-2 md:row-end-4 md:min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-6">
          <h2 className="m-0 min-w-0 flex-1 truncate whitespace-nowrap text-page-title font-light tracking-display leading-none text-foreground">
            {homeMsg.ecommShooting[lang]}
          </h2>
          <button
            onClick={() => setEcomMode(ecomMode === 'categorie' ? 'machine' : 'categorie')}
            aria-label={homeMsg.toggleMode[lang]}
            className="edo-focus-ring relative grid grid-cols-2 gap-1 border border-foreground bg-white p-1 font-mono flex-shrink-0"
          >
            <span
              className="pointer-events-none absolute top-1 bottom-1 w-toggle-half bg-foreground transition-all duration-300"
              style={{ left: ecomMode === 'categorie' ? 3 : 'calc(50% + 1.5px)' }}
            />
            {[
              { v: 'categorie', fr: 'Par catégorie', en: 'By category' },
              { v: 'machine', fr: 'Par machine', en: 'By machine' },
            ].map(o => {
              const active = ecomMode === o.v;
              return (
                <span
                  key={o.v}
                  className={`relative z-10 whitespace-nowrap px-3 py-2 text-center font-mono text-caption uppercase tracking-meta transition-colors duration-150 ${active ? 'text-white' : 'text-foreground'}`}
                >
                  {o[lang]}
                </span>
              );
            })}
          </button>
        </div>

        <div className="px-4 pb-3.5">
          <div className="font-mono text-caption uppercase tracking-ui text-muted-foreground">
            {homeMsg.smartSolutions[lang]}
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
          {ecomMode === 'categorie' ? (
            <div className="grid flex-1 grid-cols-3 content-end gap-px bg-white md:grid-cols-6">
              {categories.map((c) => (
                <button
                  key={c.k}
                  onClick={() => navigate({ to: `/${lang}/galerie`, search: { cat: c.k } })}
                  className="edo-focus-ring group flex aspect-square min-w-0 cursor-pointer flex-col justify-between border-0 border-t border-l border-border bg-white px-3 py-3 text-left text-foreground transition-colors duration-150 hover:bg-muted"
                >
                  <CatIcon kind={c.k} size={20} />
                  <div className="truncate text-caption font-medium tracking-copy-tight leading-snug">
                    {c[lang]}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid flex-1 grid-cols-2 content-end gap-px bg-white md:grid-cols-4">
              {ecomMachines.map((m, i) => (
                <button
                  key={m.slug}
                  onClick={() => goto('plateau-' + m.slug)}
                  className="edo-focus-ring group flex aspect-square min-w-0 cursor-pointer flex-col justify-between border-0 border-t border-l border-border bg-white px-4 py-4 text-left text-foreground transition-colors duration-150 hover:bg-muted"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-micro text-muted-foreground tracking-meta">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <IconArrowRight className="text-muted-foreground" width="14" height="14" />
                  </div>
                  <div>
                    <div className="truncate text-cell font-medium tracking-headline leading-tight">{m[lang].t}</div>
                    <div className="truncate mt-1 text-micro font-mono uppercase tracking-caption text-muted-foreground">{m[lang].sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Rows 2-3 right: Gallery hero ── */}
      <button
        onClick={() => goto('gallery')}
        aria-label={common.gallery[lang]}
        className="edo-focus-ring group relative col-span-2 min-h-48 flex flex-col items-stretch justify-end overflow-hidden border-0 bg-edo-dark p-6 text-white transition-all duration-150 hover:brightness-75 md:col-start-7 md:col-end-13 md:row-start-2 md:row-end-4"
      >
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

      {/* ── Row 4 left: Video / showreel ── */}
      <div className="col-span-1 min-h-36 flex overflow-hidden bg-black md:col-start-1 md:col-end-4 md:row-start-4 md:min-h-0">
        <button
          onClick={() => goto('gallery')}
          className="edo-focus-ring group relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden border-0 bg-edo-dark p-0 text-left transition-all duration-150 hover:brightness-75"
        >
          {heroHasCmsPoster ? (
            <img
              src={heroPoster}
              alt={homeHero?.posterAlt ?? ''}
              fetchPriority="high"
              decoding="async"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          ) : heroShowStaticPicture ? (
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
              poster={heroPoster}
              className="absolute inset-0 h-full w-full"
            />
          )}
          <div className="absolute inset-0 bg-home-media-gradient" />
        </button>
      </div>

      {/* ── Rows 4-5 middle: Cyclorama ── */}
      <button
        onClick={() => goto('cyclorama')}
        className="edo-focus-ring group col-span-1 min-h-36 flex cursor-pointer flex-col justify-between border-0 bg-white p-5 text-left text-foreground transition-colors duration-150 hover:bg-muted md:col-start-4 md:col-end-7 md:row-start-4 md:row-end-6 md:min-h-0"
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

      {/* ── Row 4 right: Book CTA ── */}
      <button
        onClick={() => goto('book')}
        className="edo-focus-ring group col-span-2 h-20 flex cursor-pointer items-center justify-between gap-3 border-0 bg-primary px-5 py-3 text-left text-white transition-colors duration-150 hover:bg-foreground hover:text-white sm:col-span-1 md:col-start-7 md:col-end-10 md:row-start-4 md:h-21"
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

      {/* ── Row 5 left: Discovery CTA ── */}
      <button
        onClick={() => goto('discovery')}
        className="edo-focus-ring group relative col-span-2 h-20 flex cursor-pointer items-center justify-between gap-3 border-0 bg-foreground px-4 py-3 text-left text-white transition-all duration-150 hover:brightness-110 sm:col-span-1 md:col-start-1 md:col-end-4 md:row-start-5 md:h-21"
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

      {/* ── Rows 4-5 right: Post-production ── */}
      <button
        onClick={() => goto('postprod')}
        className="edo-focus-ring group col-span-2 h-20 flex cursor-pointer flex-col justify-between border-0 bg-white p-5 text-left text-foreground transition-colors duration-150 hover:bg-muted sm:col-span-1 md:col-start-7 md:col-end-10 md:row-start-4 md:row-end-6 md:mt-home-offset md:h-home-offset"
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

      {/* ── Rows 4-5 far right: Assistant chat ── */}
      <Suspense
        fallback={
          <div
            aria-hidden
            className="col-span-2 min-h-52 bg-white md:col-start-10 md:col-end-13 md:row-start-4 md:row-end-6 md:min-h-0"
          />
        }
      >
        <AssistantChat
          lang={lang}
          className="col-span-2 min-h-52 md:col-start-10 md:col-end-13 md:row-start-4 md:row-end-6 md:min-h-0"
        />
      </Suspense>

      {/* ── Row 6: Social links (wrapped to 4-col grid) ── */}
      <div className="col-span-2 grid grid-cols-4 h-11 gap-px md:col-start-1 md:col-end-5 md:row-start-6">
        {(socialLinks ?? []).map((s) => (
          <a
            key={s.k}
            href={s.href}
            target="_blank"
            rel="noopener"
            className="edo-focus-ring group flex items-center justify-between border-0 bg-white px-3 no-underline text-foreground transition-colors duration-150 hover:bg-muted"
          >
            <SocialIcon kind={s.k} size={12} />
            <span className="font-mono text-micro tracking-meta">{s.k === 'instagram' ? 'IG' : s.k === 'linkedin' ? 'LI' : s.k === 'facebook' ? 'FB' : 'TT'}</span>
          </a>
        ))}
      </div>

      {/* ── Row 6: Marquee ── */}
      <div className="col-span-2 h-11 flex items-center overflow-hidden bg-white min-w-0 md:col-start-5 md:col-end-13 md:row-start-6">
        <MarqueeCell size={20} />
      </div>

    </div>
  );
};

export { DirectionA };
