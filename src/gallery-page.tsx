import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearch,
} from '@tanstack/react-router';
import { usePageContext } from './lib/page-context';
import { SCREEN_TO_PATH } from './lib/screens';
import type { GalleryCategory, GalleryProject } from './lib/strapi';
import type { Lang } from './types';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { HoverMarquee } from './ui/hover-marquee';
import {
  PLATEAU_LABELS,
  plateauLabel as displayPlateau,
} from './lib/plateau-labels';
import { MobileNavStrip } from './ui/mobile-nav-strip';
import { PageHeader } from './ui/page-header';
import { ResponsiveImage } from './ui/responsive-image';
import { VideoLoop } from './ui/video-loop';
import { usePrefersReducedMotion } from './ui/use-media-query';
import type { StripGroup } from './ui/mobile-nav-strip';
import { cn } from '@/lib/utils';
import { useT } from './i18n/use-t';
import { GalleryLightbox } from './gallery-lightbox';

const PLATEAU_TO_SCREEN: Record<string, string> = {
  cyclorama: 'cyclorama',
  horizontal: 'plateau-horizontal',
  vertical: 'plateau-vertical',
  eclipse: 'plateau-eclipse',
  live: 'plateau-live',
};

function resolvePlateauPath(
  plateau: string | undefined,
  lang: Lang,
): string | null {
  if (!plateau) return null;
  const screen = PLATEAU_TO_SCREEN[plateau];
  if (!screen) return null;
  const resolver = SCREEN_TO_PATH[screen];
  return resolver ? resolver(lang) : null;
}

const PROJECT_PALETTES: Record<
  string,
  { bgClass: string; accent: string; soft: string }
> = {
  mono: { bgClass: 'bg-muted', accent: '#141414', soft: '#bfbfbf' },
  dark: { bgClass: 'bg-foreground', accent: '#f5f5f5', soft: '#2a2a2a' },
  warm: {
    bgClass: 'bg-[oklch(0.91_0.03_82)]',
    accent: '#141414',
    soft: '#b8ad94',
  },
};

function buildCrossFilterMaps(projects: GalleryProject[]) {
  const catToPlateaux: Record<string, Set<string>> = {};
  const plateauToCats: Record<string, Set<string>> = {};

  for (const p of projects) {
    if (!catToPlateaux[p.cat]) catToPlateaux[p.cat] = new Set();
    catToPlateaux[p.cat].add(p.plateau);

    if (!plateauToCats[p.plateau]) plateauToCats[p.plateau] = new Set();
    plateauToCats[p.plateau].add(p.cat);
  }

  return {
    catToPlateaux: Object.fromEntries(
      Object.entries(catToPlateaux).map(([k, v]) => [k, [...v]]),
    ),
    plateauToCats: Object.fromEntries(
      Object.entries(plateauToCats).map(([k, v]) => [k, [...v]]),
    ),
  };
}

interface GalleryFiltersProps {
  lang: Lang;
  cat: string;
  plateau: string;
  setCat: (c: string) => void;
  setPlateau: (p: string) => void;
  categories: { k: string; fr: string; en: string }[];
  plateauOptions: { k: string; label: string }[];
  catToPlateaux: Record<string, string[]>;
  plateauToCats: Record<string, string[]>;
}

const GalleryFilters = ({
  lang,
  cat,
  plateau,
  setCat,
  setPlateau,
  categories,
  plateauOptions,
  catToPlateaux,
  plateauToCats,
}: GalleryFiltersProps) => {
  const t = useT();
  const hasFilters = cat !== 'all' || plateau !== 'all';

  return (
    <aside className="flex flex-col bg-background">
      <FilterHeader label={t('galleryPage.categories')} />
      <FilterCell
        label={t('common.all')}
        active={cat === 'all'}
        onClick={() => setCat('all')}
      />
      {categories.map((category) => {
        const dimmed =
          plateau !== 'all' &&
          !(plateauToCats[plateau] ?? []).includes(category.k);
        return (
          <FilterCell
            key={category.k}
            label={category[lang]}
            active={cat === category.k}
            dimmed={dimmed}
            onClick={() => {
              if (dimmed) setPlateau('all');
              setCat(category.k);
            }}
          />
        );
      })}

      <FilterHeader label={t('common.stages')} />
      <FilterCell
        label={t('common.all')}
        active={plateau === 'all'}
        onClick={() => setPlateau('all')}
      />
      {plateauOptions.map((option) => {
        const dimmed =
          cat !== 'all' && !(catToPlateaux[cat] ?? []).includes(option.k);
        return (
          <FilterCell
            key={option.k}
            label={option.label}
            active={plateau === option.k}
            dimmed={dimmed}
            onClick={() => {
              if (dimmed) setCat('all');
              setPlateau(option.k);
            }}
          />
        );
      })}

      {hasFilters && (
        <Button
          onClick={() => {
            setCat('all');
            setPlateau('all');
          }}
          variant="cell"
          size="cell"
          className="border-b border-border px-3.5 py-3 text-xs tracking-widest text-primary"
        >
          ↺ {t('common.reset')}
        </Button>
      )}
    </aside>
  );
};

const FilterHeader = ({ label }: { label: string }) => (
  <div className="flex shrink-0 items-center border-b border-border bg-background px-3.5 pb-1 pt-2">
    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
  </div>
);

const FilterCell = ({
  label,
  active,
  onClick,
  dimmed,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dimmed?: boolean;
}) => (
  <Button
    onClick={onClick}
    // Sans variante, cette cellule héritait de `variant="default"`, c'est-à-dire
    // du pavé orange, défait à la main — sauf son `hover:opacity-90`, qui lui
    // continuait de tirer sur chaque survol. Et sans état ARIA, sa sélection
    // était muette pour un lecteur d'écran.
    //
    // La taille reste celle par défaut : c'est `h-8` qui fixe la ligne à 32px,
    // pas le `py-2`.
    variant="rail"
    aria-pressed={active}
    className={cn(
      'w-full justify-between gap-2 border-b border-b-border px-3.5 py-2 text-left text-sm tracking-tight aria-pressed:font-medium',
      dimmed && 'opacity-30',
    )}
  >
    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
      {label}
    </span>
  </Button>
);

interface GalleryContentProps {
  lang: Lang;
  filtered: GalleryProject[];
  loaded: boolean;
  resetFilters: () => void;
  onOpenLightbox: (projectId: number, imageIndex: number) => void;
}

const GalleryContent = ({
  lang,
  filtered,
  loaded,
  resetFilters,
  onOpenLightbox,
}: GalleryContentProps) => {
  const t = useT();
  return (
    <div className="min-h-0 overflow-y-auto bg-background gap-px bg-border md:col-start-2 md:col-span-4">
      <div className="flex flex-col [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border">
        {loaded && filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t('galleryPage.noResults')}</EmptyTitle>
              <EmptyDescription>
                {t('galleryPage.tryAnotherFilter')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                {t('common.reset')}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          filtered.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              lang={lang}
              onOpenLightbox={onOpenLightbox}
            />
          ))
        )}
      </div>
    </div>
  );
};

const ProjectRow = ({
  project,
  lang,
  style,
  onOpenLightbox,
}: {
  project: GalleryProject;
  lang: Lang;
  style?: CSSProperties;
  onOpenLightbox: (projectId: number, imageIndex: number) => void;
}) => {
  const to = resolvePlateauPath(project.plateau, lang);
  const plateauLabel = displayPlateau(project.plateau);
  const ariaLabel = `${project.brand} — ${plateauLabel}`;
  return (
    <div
      className="group grid grid-cols-[48px_repeat(3,minmax(0,1fr))] md:grid-cols-[80px_repeat(3,minmax(0,1fr))] [&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-border"
      style={style}
    >
      <ProjectLabel
        project={project}
        lang={lang}
        to={to}
        ariaLabel={ariaLabel}
      />
      {[0, 1, 2].map((imageIndex) => (
        <ProjectImage
          key={imageIndex}
          project={project}
          imageIndex={imageIndex}
          ariaLabel={ariaLabel}
          onOpen={() => onOpenLightbox(project.id, imageIndex)}
        />
      ))}
    </div>
  );
};

const ProjectLabel = ({
  project,
  lang,
  to,
  ariaLabel,
}: {
  project: GalleryProject;
  lang: Lang;
  to: string | null;
  ariaLabel: string;
}) => {
  const plateauLabel = displayPlateau(project.plateau);
  const className =
    'outline-none focus-visible:ring-3 focus-visible:ring-ring/50 relative flex cursor-pointer flex-col items-center justify-between overflow-hidden  bg-background px-2 py-2 md:px-2.5 md:py-3.5 text-left font-sans no-underline text-inherit';
  const content = (
    <>
      <HoverMarquee className="font-mono text-xs uppercase tracking-widest text-muted-foreground max-w-full self-start transition-colors group-hover:text-primary">
        {plateauLabel}
      </HoverMarquee>
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden py-1 md:py-2 [writing-mode:vertical-rl] rotate-180">
        <span className="block max-h-full overflow-hidden text-ellipsis whitespace-nowrap text-xs md:text-2xl font-medium leading-[1.4] tracking-tight text-foreground">
          {project.brand}
        </span>
      </div>
      <span className="self-start font-mono text-xs tracking-widest text-muted-foreground">
        {project.year}
      </span>
    </>
  );
  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <div className={className.replace('cursor-pointer ', '')}>{content}</div>
  );
};

const ProjectImage = ({
  project,
  imageIndex,
  ariaLabel,
  onOpen,
}: {
  project: GalleryProject;
  imageIndex: number;
  ariaLabel: string;
  onOpen: () => void;
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const item = project.media[imageIndex];

  const wrapperClass =
    'relative block aspect-[4/5] overflow-hidden bg-background no-underline text-inherit';

  let inner: ReactNode;
  if (!item) {
    inner = (
      <ProjectCoverFallback
        project={project}
        seed={project.id * 3 + imageIndex}
      />
    );
  } else if (item.kind === 'embed') {
    const altText = item.alt || `${project.brand} — ${imageIndex + 1}`;
    // pointer-events-none so the click reaches the wrapping button (opens the
    // lightbox, where the iframe becomes interactive).
    inner = (
      <iframe
        key={item.url}
        src={item.url}
        title={altText}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allow="accelerometer; gyroscope; fullscreen; xr-spatial-tracking"
        allowFullScreen
        className="absolute inset-0 h-full w-full  pointer-events-none select-none"
      />
    );
  } else if (item.kind === 'video') {
    const altText = item.alt || `${project.brand} — ${imageIndex + 1}`;
    // VideoLoop plutôt qu'un <video autoPlay> : l'attribut déclenchait le
    // téléchargement et la lecture de chaque tuile présente dans le DOM, même
    // hors écran. La lecture est ici conditionnée à la visibilité réelle.
    inner = (
      <VideoLoop
        key={item.url}
        src={item.url}
        mime={item.mime}
        paused={reducedMotion}
        ariaLabel={altText}
        className="absolute inset-0 h-full w-full"
      />
    );
  } else {
    const altText = item.alt || `${project.brand} — ${imageIndex + 1}`;
    inner = (
      <ResponsiveImage
        src={item.previewUrl ?? item.url}
        alt={altText}
        sizes="33vw"
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      />
    );
  }

  if (item) {
    return (
      <Button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel}
        variant="cell"
        size="cell"
        className={cn(wrapperClass, 'p-0')}
      >
        {inner}
      </Button>
    );
  }
  return <div className={wrapperClass}>{inner}</div>;
};

const ProjectCoverFallback = ({
  project,
  seed,
}: {
  project: GalleryProject;
  seed: number;
}) => {
  const palette = PROJECT_PALETTES[project.tone] || PROJECT_PALETTES.mono;
  const layout = seed % 4;

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', palette.bgClass)}
    >
      <svg
        viewBox="0 0 300 380"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        {layout === 0 && (
          <>
            <rect x="60" y="80" width="180" height="240" fill={palette.soft} />
            <circle cx="150" cy="180" r="60" fill={palette.accent} />
          </>
        )}
        {layout === 1 && (
          <>
            <rect x="0" y="220" width="300" height="160" fill={palette.soft} />
            <rect
              x="100"
              y="110"
              width="100"
              height="210"
              fill={palette.accent}
            />
          </>
        )}
        {layout === 2 && (
          <>
            <circle cx="150" cy="220" r="120" fill={palette.soft} />
            <rect
              x="130"
              y="60"
              width="40"
              height="200"
              fill={palette.accent}
            />
          </>
        )}
        {layout === 3 && (
          <>
            <path d="M 0 380 Q 150 150 300 380 Z" fill={palette.soft} />
            <circle cx="150" cy="140" r="48" fill={palette.accent} />
          </>
        )}
      </svg>
    </div>
  );
};

type GalleryFilters = { cat?: string; plateau?: string };

const GalleryPageV3 = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  // Page servie par deux routes (/galerie en FR, /gallery en EN), d'où l'accès
  // non strict aux search params comme aux données du loader.
  const search = useSearch({ strict: false }) as GalleryFilters;
  const cat = search.cat ?? 'all';
  const plateau = search.plateau ?? 'all';
  const navigate = useNavigate();

  // Mise à jour partielle : une clé absente de `next` garde sa valeur courante,
  // une clé à null est retirée de l'URL (« all » n'y est jamais écrit).
  const setFilters = (next: { cat?: string | null; plateau?: string | null }) =>
    navigate({
      to: '.',
      search: (prev: GalleryFilters) => {
        const merged: GalleryFilters = { ...prev };
        for (const key of ['cat', 'plateau'] as const) {
          if (!(key in next)) continue;
          const value = next[key];
          if (value) merged[key] = value;
          else delete merged[key];
        }
        return merged;
      },
    });

  const setCat = (c: string) => setFilters({ cat: c === 'all' ? null : c });
  const setPlateau = (p: string) =>
    setFilters({ plateau: p === 'all' ? null : p });

  // La page est servie par deux routes (/galerie en FR, /gallery en EN) qui
  // partagent le même loader, d'où l'accès non strict à ses données.
  const loaderData = useLoaderData({ strict: false }) as {
    projects: GalleryProject[] | null;
    categories: GalleryCategory[] | null;
  };

  const projects = loaderData.projects ?? [];
  const categories = loaderData.categories ?? [];

  const [lightbox, setLightbox] = useState<{
    projectId: number;
    imageIndex: number;
  } | null>(null);
  const lightboxProject = useMemo(
    () =>
      lightbox
        ? (projects.find((p) => p.id === lightbox.projectId) ?? null)
        : null,
    [lightbox, projects],
  );

  const plateauOptions = useMemo(() => {
    const slugs = new Set(projects.map((p) => p.plateau));
    return [...slugs]
      .map((slug) => ({ k: slug, label: displayPlateau(slug) }))
      .sort((a, b) => {
        const order = Object.keys(PLATEAU_LABELS);
        return order.indexOf(a.k) - order.indexOf(b.k);
      });
  }, [projects]);

  const { catToPlateaux, plateauToCats } = useMemo(
    () => buildCrossFilterMaps(projects),
    [projects],
  );

  const filtered = useMemo(
    () =>
      projects.filter(
        (project) =>
          (cat === 'all' || project.cat === cat) &&
          (plateau === 'all' || project.plateau === plateau),
      ),
    [projects, cat, plateau],
  );

  const resetFilters = () => {
    setFilters({ cat: null, plateau: null });
  };

  const catLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.k] = c[lang];
    return map;
  }, [categories, lang]);

  const plateauLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of plateauOptions) map[p.k] = p.label;
    return map;
  }, [plateauOptions, lang]);

  const mobileGroups: StripGroup[] = useMemo(() => {
    const allLabel = t('common.all');
    const catGroupOptions = [
      {
        k: 'all',
        label: allLabel,
      },
      ...categories.map((category) => ({
        k: category.k,
        label: category[lang],
        dimmed:
          plateau !== 'all' &&
          !(plateauToCats[plateau] ?? []).includes(category.k),
      })),
    ];

    const plateauGroupOptions = [
      {
        k: 'all',
        label: allLabel,
      },
      ...plateauOptions.map((option) => ({
        k: option.k,
        label: option.label,
        dimmed: cat !== 'all' && !(catToPlateaux[cat] ?? []).includes(option.k),
      })),
    ];

    return [
      {
        key: 'cat',
        label: t('galleryPage.categories'),
        options: catGroupOptions,
        value: cat,
        onSelect: setCat,
      },
      {
        key: 'plateau',
        label: t('common.stages'),
        options: plateauGroupOptions,
        value: plateau,
        onSelect: setPlateau,
      },
    ];
  }, [
    lang,
    categories,
    plateauOptions,
    cat,
    plateau,
    catToPlateaux,
    plateauToCats,
    setCat,
    setPlateau,
  ]);

  const activeFilterCount =
    (cat !== 'all' ? 1 : 0) + (plateau !== 'all' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (cat !== 'all') parts.push(catLabelMap[cat] ?? cat);
    if (plateau !== 'all') parts.push(plateauLabelMap[plateau] ?? plateau);
    return parts.length > 0 ? parts.join(', ') : t('common.all');
  }, [cat, plateau, catLabelMap, plateauLabelMap, lang]);

  const mobileCountFor = (draft: Record<string, string>) => {
    const draftCat = draft.cat ?? 'all';
    const draftPlateau = draft.plateau ?? 'all';
    return projects.filter(
      (project) =>
        (draftCat === 'all' || project.cat === draftCat) &&
        (draftPlateau === 'all' || project.plateau === draftPlateau),
    ).length;
  };

  const applyMobileFilters = (draft: Record<string, string>) => {
    const nextCat = draft.cat ?? 'all';
    const nextPlateau = draft.plateau ?? 'all';
    setFilters({
      cat: nextCat === 'all' ? null : nextCat,
      plateau: nextPlateau === 'all' ? null : nextPlateau,
    });
  };

  return (
    <main className="grid w-full gap-px bg-border md:h-full md:grid-cols-[var(--spacing-logo)_80px_repeat(3,minmax(0,1fr))] md:grid-rows-[var(--spacing-header)_minmax(0,1fr)] md:overflow-hidden">
      <h1 className="sr-only">{t('common.gallery')} — E-Do Studio Paris</h1>

      <PageHeader className="col-span-full md:row-start-1" />

      <div className="grid grid-cols-1 gap-px bg-border md:col-span-full md:row-start-2 md:min-h-0 md:overflow-hidden md:grid-cols-[var(--spacing-logo)_80px_repeat(3,minmax(0,1fr))]">
        <MobileNavStrip
          triggerLabel={t('mobileNav.filters').toUpperCase()}
          groups={mobileGroups}
          hasActive={hasActiveFilters}
          activeCount={activeFilterCount}
          summary={filterSummary}
          ariaLabel={t('galleryPage.filterAriaLabel')}
          lang={lang}
          countFor={mobileCountFor}
          onApply={applyMobileFilters}
        />
        <div className="hidden bg-background md:block md:overflow-y-auto">
          <GalleryFilters
            lang={lang}
            cat={cat}
            plateau={plateau}
            setCat={setCat}
            setPlateau={setPlateau}
            categories={categories}
            plateauOptions={plateauOptions}
            catToPlateaux={catToPlateaux}
            plateauToCats={plateauToCats}
          />
        </div>
        <GalleryContent
          lang={lang}
          filtered={filtered}
          loaded={loaderData.projects !== null}
          resetFilters={resetFilters}
          onOpenLightbox={(projectId, imageIndex) =>
            setLightbox({ projectId, imageIndex })
          }
        />
      </div>

      {lightboxProject && lightbox && (
        <GalleryLightbox
          project={lightboxProject}
          initialIndex={lightbox.imageIndex}
          lang={lang}
          onClose={() => setLightbox(null)}
          onBook={() => {
            setLightbox(null);
            goto('book');
          }}
          onContact={() => {
            setLightbox(null);
            goto('contact');
          }}
        />
      )}
    </main>
  );
};

export { GalleryPageV3 };
