import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { CellLabel, IconArrowRight, PageHeader } from './ui';
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

interface CoverCarouselProps {
  items: MediaItem[];
  lang: Lang;
  plateauName: string;
  className?: string;
}

// Cover carousel — renders one media item full-cell with prev/next arrows
// overlaid inside the image. Wraps around at the ends so the controls never
// appear "dead" sitting on top of the artwork; arrows are hidden entirely
// when the entry only has one media item.
const CoverCarousel = ({ items, lang, plateauName, className }: CoverCarouselProps) => {
  const [index, setIndex] = useState(0);
  if (items.length === 0) return null;
  const safeIndex = ((index % items.length) + items.length) % items.length;
  const item = items[safeIndex];
  const hasMultiple = items.length > 1;

  const go = (delta: 1 | -1) => setIndex((i) => i + delta);

  const arrowBtn =
    'edo-focus-ring absolute top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-white/90 text-foreground backdrop-blur-sm transition-colors duration-150 hover:bg-white';

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
          alt={item.alt[lang] || `${plateauName} — ${safeIndex + 1}`}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={common.prevImage[lang]}
            className={cn(arrowBtn, 'left-3 md:left-4')}
          >
            <IconArrowRight width="18" height="18" className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={common.nextImage[lang]}
            className={cn(arrowBtn, 'right-3 md:right-4')}
          >
            <IconArrowRight width="18" height="18" />
          </button>
          <span aria-live="polite" className="sr-only">
            {`${safeIndex + 1} / ${items.length}`}
          </span>
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
  if (loading || !plateaux) return null;
  const p = plateaux[slug] || plateaux.cyclorama;
  const order = ['live','eclipse','horizontal','vertical','cyclorama'];
  // Cover = first item of the media list. The legacy `machineImage` field is
  // kept as a fallback so entries that still set it (instead of seeding `media`)
  // continue to render — when both exist, `machineImage` is prepended unless it
  // already matches the first media URL.
  const legacyCover = p.machineImage;
  const coverItems: MediaItem[] =
    legacyCover && p.media[0]?.url !== legacyCover.url
      ? [legacyCover, ...p.media]
      : p.media.length > 0
        ? p.media
        : legacyCover
          ? [legacyCover]
          : [];

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

      {/* Cover — one big media item spanning the hero + demo region.
          Arrows overlaid inside the image cycle prev/next through the media
          list, replacing the hero / thumbnail-strip split that lived here. */}
      {coverItems.length > 0 && (
        <CoverCarousel
          items={coverItems}
          lang={lang}
          plateauName={p.name}
          className="md:col-start-2 md:col-span-2 md:row-start-2 md:row-span-3 md:min-h-0"
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
