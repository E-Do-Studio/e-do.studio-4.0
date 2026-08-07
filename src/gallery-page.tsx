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
import { Rail, RailCell, RailHeader } from './ui/rail-cell';
import { HoverMarquee } from './ui/hover-marquee';
import {
  PLATEAU_LABELS,
  plateauLabel as displayPlateau,
} from './lib/plateau-labels';
import { MobileNavStrip } from './ui/mobile-nav-strip';
import { PageShell } from './ui/page-shell';
import { MAIN_ID } from './ui/skip-link';
import { ResponsiveImage } from './ui/responsive-image';
import { MediaFrame } from './ui/media-frame';
import { VideoLoop } from './ui/video-loop';
import { usePrefersReducedMotion } from './ui/use-media-query';
import type { StripGroup } from './ui/mobile-nav-strip';
import { cn } from '@/lib/utils';
import { useT } from './i18n/use-t';
import { GalleryLightbox } from './gallery-lightbox';
import { MonoLabel, monoLabelVariants } from './ui/mono-label';

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
    <Rail>
      <RailHeader label={t('galleryPage.categories')} />
      <RailCell
        density="compact"
        label={t('common.all')}
        active={cat === 'all'}
        onSelect={() => setCat('all')}
      />
      {categories.map((category) => {
        const dimmed =
          plateau !== 'all' &&
          !(plateauToCats[plateau] ?? []).includes(category.k);
        return (
          <RailCell
            density="compact"
            key={category.k}
            label={category[lang]}
            active={cat === category.k}
            dimmed={dimmed}
            onSelect={() => {
              if (dimmed) setPlateau('all');
              setCat(category.k);
            }}
          />
        );
      })}

      <RailHeader label={t('common.stages')} />
      <RailCell
        density="compact"
        label={t('common.all')}
        active={plateau === 'all'}
        onSelect={() => setPlateau('all')}
      />
      {plateauOptions.map((option) => {
        const dimmed =
          cat !== 'all' && !(catToPlateaux[cat] ?? []).includes(option.k);
        return (
          <RailCell
            density="compact"
            key={option.k}
            label={option.label}
            active={plateau === option.k}
            dimmed={dimmed}
            onSelect={() => {
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
    </Rail>
  );
};

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
    <div className="min-h-0 overflow-y-auto bg-background gap-px bg-border app:col-start-2 app:col-span-3">
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
    // La galerie n'était qu'un mur de boutons frères : un seul titre pour tout
    // le document, et 225 cellules sans structure au-dessus d'elles. Un titre
    // par projet rend la page parcourable de marque en marque. Il est en
    // `sr-only` parce que le nom est déjà là, à la verticale, dans la cellule
    // de gauche — c'est le repère qui manquait, pas le texte.
    <section
      aria-labelledby={`project-${project.id}`}
      // La colonne du nom passe à 80px dès `md` et non au palier : au-dessus du
      // palier elle DOIT valoir 80 pour s'aligner sur la deuxième piste de la
      // grille de page, mais en dessous rien ne l'y oblige — et 48px laissaient
      // « LIVE » tronqué en « LI… » sur toute la bande tablette.
      className="group grid grid-cols-[48px_repeat(3,minmax(0,1fr))] md:grid-cols-[80px_repeat(3,minmax(0,1fr))] [&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-border"
      style={style}
    >
      <h2 id={`project-${project.id}`} className="sr-only">
        {ariaLabel}
      </h2>
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
    </section>
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
    'outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground relative flex cursor-pointer flex-col items-center justify-between overflow-hidden  bg-background px-2 py-2 md:px-2.5 md:py-3.5 text-left font-sans no-underline text-inherit';
  const content = (
    <>
      <HoverMarquee
        className={cn(
          monoLabelVariants({ tone: 'muted' }),
          'max-w-full self-start transition-colors group-hover:text-primary',
        )}
      >
        {plateauLabel}
      </HoverMarquee>
      {/* Retrait et corps suivent la colonne, donc `md` comme elle : posés au
          palier, ils auraient laissé du `text-xs` dans une colonne déjà large
          de 80. */}
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden py-1 md:py-2 [writing-mode:vertical-rl] rotate-180">
        <span className="block max-h-full overflow-hidden text-ellipsis whitespace-nowrap text-xs md:text-2xl leading-snug tracking-tight text-foreground">
          {project.brand}
        </span>
      </div>
      <MonoLabel tone="muted" className="self-start">
        {project.year}
      </MonoLabel>
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
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const item = project.media[imageIndex];

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
    // `alt=""` : le bouton qui l'enveloppe porte déjà le nom. Un alt en plus
    // faisait annoncer la même chose deux fois, et « COPERNI — 2 » n'est de
    // toute façon pas une description, c'est un numéro d'ordre.
    inner = (
      <ResponsiveImage
        src={item.previewUrl ?? item.url}
        alt=""
        // La rangée d'un projet vaut trois colonnes souples, la colonne du logo
        // et celle du numéro déduites : une vignette mesure le quart de
        // l'écran, pas le tiers que ce `sizes` annonçait.
        sizes="(min-width: 768px) 25vw, 30vw"
        className="pointer-events-none"
      />
    );
  }

  if (item) {
    return (
      <MediaFrame
        className="p-0"
        render={
          <Button
            type="button"
            onClick={onOpen}
            // Les trois vignettes d'un projet portaient le même nom — « MARQUE
            // — Plateau » — donc trois boutons indistinguables à la suite. Le
            // verbe dit ce que fait le bouton, l'index dit laquelle des trois.
            aria-label={t('galleryPage.enlargeImage', {
              name: ariaLabel,
              index: imageIndex + 1,
            })}
            variant="cell"
            size="cell"
          />
        }
      >
        {inner}
      </MediaFrame>
    );
  }
  return <MediaFrame>{inner}</MediaFrame>;
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
    /* `<main class="contents">` : la grille bento exige que l'en-tête et le
       contenu soient frères, le `<header>` se retrouvait donc dans le `<main>`
       où il perd son rôle `banner`. Sans boîte, le placement des cellules ne
       bouge pas. */
    /* Pas de `app:grid-cols` sur la coquille : ses deux seules cellules sont la
       bande d'en-tête et la grille ci-dessous, toutes deux en `col-span-full`.
       Le gabarit y était recopié de la sous-grille sans que rien ne s'y place. */
    <PageShell className="app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
      <main id={MAIN_ID} className="contents">
        <h1 className="sr-only">{t('common.gallery')} — E-Do Studio Paris</h1>

        {/* Quatre pistes et non cinq. La deuxième valait 80px et personne ne s'y
            plaçait seul : le contenu l'enjambait avec les trois autres, ce qui
            lui donnait exactement la même largeur qu'en son absence. La piste de
            80px qui compte est celle de `ProjectRow`, à l'intérieur — c'est là
            que le nom vertical de la marque se pose. */}
        <div className="grid grid-cols-1 gap-px bg-border app:col-span-full app:row-start-2 app:min-h-0 app:overflow-hidden app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))]">
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
          <div className="hidden bg-background app:block app:overflow-y-auto">
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
    </PageShell>
  );
};

export { GalleryPageV3 };
