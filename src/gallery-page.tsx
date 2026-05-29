import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useQueryStates, parseAsString } from "nuqs";
import { Link } from "@tanstack/react-router";
import { usePageContext, SCREEN_TO_PATH } from "./router";
import { useDocumentMeta } from "./lib/use-document-meta";
import { useStructuredData } from "./lib/use-structured-data";
import { buildGalleryCollectionSchema, buildBreadcrumbSchema } from "./lib/structured-data";
import { useGalleryProjects, useGalleryCategories } from "./lib/use-strapi";
import type { GalleryProject } from "./lib/strapi";
import type { Lang } from "./types";
import { EmptyState, HoverMarquee, Loader, MobileNavStrip, PageHeader, buildMainNav } from "./ui";
import type { StripGroup } from "./ui";
import { cn } from "./ui/cn";
import { common, galleryPage, mobileNav } from "./i18n/messages";
import { GalleryLightbox } from "./gallery-lightbox";

const PLATEAU_LABELS: Record<string, { fr: string; en: string }> = {
  cyclorama: { fr: "Cyclorama", en: "Cyclorama" },
  horizontal: { fr: "Horizontal", en: "Horizontal" },
  vertical: { fr: "Vertical", en: "Vertical" },
  eclipse: { fr: "Eclipse", en: "Eclipse" },
  live: { fr: "Live", en: "Live" },
};

const PLATEAU_TO_SCREEN: Record<string, string> = {
  cyclorama: "cyclorama",
  horizontal: "plateau-horizontal",
  vertical: "plateau-vertical",
  eclipse: "plateau-eclipse",
  live: "plateau-live",
};

function resolvePlateauPath(plateau: string | undefined, lang: Lang): string | null {
  if (!plateau) return null;
  const screen = PLATEAU_TO_SCREEN[plateau];
  if (!screen) return null;
  const resolver = SCREEN_TO_PATH[screen];
  return resolver ? resolver(lang) : null;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROJECT_PALETTES: Record<
  string,
  { bgClass: string; accent: string; soft: string }
> = {
  mono: { bgClass: "bg-muted", accent: "#141414", soft: "#bfbfbf" },
  dark: { bgClass: "bg-foreground", accent: "#f5f5f5", soft: "#2a2a2a" },
  warm: { bgClass: "bg-edo-warm", accent: "#141414", soft: "#b8ad94" },
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
  plateauOptions: { k: string; fr: string; en: string }[];
  projects: GalleryProject[];
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
  projects,
  catToPlateaux,
  plateauToCats,
}: GalleryFiltersProps) => {
  const countCat = (key: string) =>
    key === "all"
      ? projects.length
      : projects.filter((p) => p.cat === key).length;
  const countPlateau = (key: string) =>
    key === "all"
      ? projects.length
      : projects.filter((p) => p.plateau === key).length;
  const hasFilters = cat !== "all" || plateau !== "all";

  return (
    <aside className="flex flex-col bg-white">
      <FilterHeader label={galleryPage.categories[lang]} />
      <FilterCell
        label={common.all[lang]}
        active={cat === "all"}
        count={countCat("all")}
        onClick={() => setCat("all")}
      />
      {categories.map((category) => {
        const dimmed =
          plateau !== "all" &&
          !(plateauToCats[plateau] ?? []).includes(category.k);
        return (
          <FilterCell
            key={category.k}
            label={category[lang]}
            active={cat === category.k}
            count={countCat(category.k)}
            dimmed={dimmed}
            onClick={() => {
              if (dimmed) setPlateau("all");
              setCat(category.k);
            }}
          />
        );
      })}

      <FilterHeader label={common.stages[lang]} />
      <FilterCell
        label={common.all[lang]}
        active={plateau === "all"}
        count={countPlateau("all")}
        onClick={() => setPlateau("all")}
      />
      {plateauOptions.map((option) => {
        const dimmed =
          cat !== "all" &&
          !(catToPlateaux[cat] ?? []).includes(option.k);
        return (
          <FilterCell
            key={option.k}
            label={option[lang]}
            active={plateau === option.k}
            count={countPlateau(option.k)}
            dimmed={dimmed}
            onClick={() => {
              if (dimmed) setCat("all");
              setPlateau(option.k);
            }}
          />
        );
      })}

      {hasFilters && (
        <button
          onClick={() => {
            setCat("all");
            setPlateau("all");
          }}
          className="edo-focus-ring shrink-0 cursor-pointer border-0 border-b border-border bg-white px-3.5 py-3 text-left font-mono text-label uppercase tracking-label text-primary transition-colors hover:bg-muted"
        >
          ↺ {common.reset[lang]}
        </button>
      )}
    </aside>
  );
};

const FilterHeader = ({ label }: { label: string }) => (
  <div className="flex shrink-0 items-center border-b border-border bg-white px-3.5 pb-1 pt-2">
    <span className="font-mono text-micro uppercase tracking-label text-muted-foreground">
      {label}
    </span>
  </div>
);

const FilterCell = ({
  label,
  active,
  onClick,
  count,
  dimmed,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
  dimmed?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "edo-focus-ring flex w-full shrink-0 cursor-pointer items-center justify-between gap-2 border-0 border-b border-l-2 border-b-border px-3.5 py-2 text-left text-detail tracking-copy-tight text-foreground transition-colors",
      active
        ? "border-l-primary bg-muted font-medium"
        : "border-l-transparent bg-white font-normal hover:bg-muted",
      dimmed && "opacity-30",
    )}
  >
    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
      {label}
    </span>
    {count != null && (
      <span
        className={cn(
          "shrink-0 font-mono text-label tracking-caption",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    )}
  </button>
);

interface GalleryContentProps {
  lang: Lang;
  filtered: GalleryProject[];
  resetFilters: () => void;
  onOpenLightbox: (projectId: number, imageIndex: number) => void;
}

const GalleryContent = ({
  lang,
  filtered,
  resetFilters,
  onOpenLightbox,
}: GalleryContentProps) => (
  <div className="min-h-0 overflow-y-auto bg-white edo-hairline md:col-start-2 md:col-span-4">
    <div className="flex flex-col [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-hairline">
      {filtered.length === 0 ? (
        <EmptyState
          label={galleryPage.noResults[lang]}
          description={galleryPage.tryAnotherFilter[lang]}
          action={{ label: common.reset[lang], onClick: resetFilters }}
        />
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
  const plateauLabel = PLATEAU_LABELS[project.plateau]?.[lang] ?? project.plateau;
  const ariaLabel = `${project.brand} — ${plateauLabel}`;
  return (
    <div className="edo-list-row group grid grid-cols-gallery-row-mobile md:grid-cols-gallery-row [&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-hairline" style={style}>
      <ProjectLabel project={project} lang={lang} to={to} ariaLabel={ariaLabel} />
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

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
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
  const plateauLabel = PLATEAU_LABELS[project.plateau]?.[lang] ?? project.plateau;
  const className =
    "edo-focus-ring relative flex cursor-pointer flex-col items-center justify-between overflow-hidden border-0 bg-white px-2 py-2 md:px-2.5 md:py-3.5 text-left font-sans no-underline text-inherit";
  const content = (
    <>
      <HoverMarquee className="max-w-full self-start font-mono text-micro uppercase tracking-code text-muted-foreground transition-colors group-hover:text-primary">
        {plateauLabel}
      </HoverMarquee>
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden py-1 md:py-2 edo-writing-vertical rotate-180">
        <span className="block max-h-full overflow-hidden text-ellipsis whitespace-nowrap text-micro md:text-tile-large font-medium leading-none tracking-headline text-foreground">
          {project.brand}
        </span>
      </div>
      <span className="self-start font-mono text-micro tracking-code text-muted-foreground">
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
  return <div className={className.replace("cursor-pointer ", "")}>{content}</div>;
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
    "edo-focus-ring relative block aspect-portrait overflow-hidden bg-white no-underline text-inherit";

  let inner: ReactNode;
  if (!item) {
    inner = <ProjectCoverFallback project={project} seed={project.id * 3 + imageIndex} />;
  } else if (item.mime.startsWith("video/")) {
    const altText = item.alt || `${project.brand} — ${imageIndex + 1}`;
    inner = (
      <video
        key={item.url}
        autoPlay={!reducedMotion}
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-label={altText}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
      >
        <source src={item.url} type={item.mime} />
      </video>
    );
  } else {
    const altText = item.alt || `${project.brand} — ${imageIndex + 1}`;
    inner = (
      <img
        src={item.previewUrl ?? item.url}
        alt={altText}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        loading="lazy"
      />
    );
  }

  if (item) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel}
        className={cn(wrapperClass, "cursor-pointer border-0 p-0 text-left")}
      >
        {inner}
      </button>
    );
  }
  return <div className={wrapperClass}>{inner}</div>;
};

const ProjectCoverFallback = ({ project, seed }: { project: GalleryProject; seed: number }) => {
  const palette = PROJECT_PALETTES[project.tone] || PROJECT_PALETTES.mono;
  const layout = seed % 4;

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", palette.bgClass)}
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
            <rect x="100" y="110" width="100" height="210" fill={palette.accent} />
          </>
        )}
        {layout === 2 && (
          <>
            <circle cx="150" cy="220" r="120" fill={palette.soft} />
            <rect x="130" y="60" width="40" height="200" fill={palette.accent} />
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

const filterParser = parseAsString.withDefault("all").withOptions({ clearOnDefault: true });

const GalleryPageV3 = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('gallery', lang);
  const [{ cat, plateau }, setFilters] = useQueryStates(
    {
      cat: parseAsString.withDefault("all"),
      plateau: parseAsString.withDefault("all"),
    },
    { history: "push", clearOnDefault: true },
  );
  const setCat = (c: string) => setFilters({ cat: c === "all" ? null : c });
  const setPlateau = (p: string) =>
    setFilters({ plateau: p === "all" ? null : p });

  const { data: strapiProjects, loading: projectsLoading } = useGalleryProjects();
  const { data: strapiCategories } = useGalleryCategories();

  const projects = strapiProjects ?? [];
  const categories = strapiCategories ?? [];

  const [lightbox, setLightbox] = useState<{ projectId: number; imageIndex: number } | null>(null);
  const lightboxProject = useMemo(
    () => (lightbox ? projects.find((p) => p.id === lightbox.projectId) ?? null : null),
    [lightbox, projects],
  );
  const lightboxRelated = useMemo(() => {
    if (!lightboxProject) return [];
    const samePlateau = projects.filter(
      (p) => p.plateau === lightboxProject.plateau && p.id !== lightboxProject.id,
    );
    const rng = mulberry32(lightboxProject.id);
    const pool = [...samePlateau];
    if (pool.length < 3) {
      const sameCatFill = projects.filter(
        (p) =>
          p.cat === lightboxProject.cat &&
          p.id !== lightboxProject.id &&
          !pool.some((x) => x.id === p.id),
      );
      pool.push(...sameCatFill);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }, [lightboxProject, projects]);
  useStructuredData('gallery', [
    buildGalleryCollectionSchema(projects, categories, lang, '/galerie'),
    buildBreadcrumbSchema(
      [
        { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
        { name: common.gallery[lang], pathname: '/galerie' },
      ],
      lang,
    ),
  ]);

  const plateauOptions = useMemo(() => {
    const slugs = new Set(projects.map((p) => p.plateau));
    return [...slugs]
      .map((slug) => ({
        k: slug,
        ...(PLATEAU_LABELS[slug] ?? { fr: slug, en: slug }),
      }))
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
          (cat === "all" || project.cat === cat) &&
          (plateau === "all" || project.plateau === plateau),
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
    for (const p of plateauOptions) map[p.k] = p[lang];
    return map;
  }, [plateauOptions, lang]);

  const mobileGroups: StripGroup[] = useMemo(() => {
    const allLabel = common.all[lang];
    const catGroupOptions = [
      {
        k: "all",
        label: allLabel,
        count: projects.length,
      },
      ...categories.map((category) => ({
        k: category.k,
        label: category[lang],
        count: projects.filter((p) => p.cat === category.k).length,
        dimmed:
          plateau !== "all" &&
          !(plateauToCats[plateau] ?? []).includes(category.k),
      })),
    ];

    const plateauGroupOptions = [
      {
        k: "all",
        label: allLabel,
        count: projects.length,
      },
      ...plateauOptions.map((option) => ({
        k: option.k,
        label: option[lang],
        count: projects.filter((p) => p.plateau === option.k).length,
        dimmed:
          cat !== "all" && !(catToPlateaux[cat] ?? []).includes(option.k),
      })),
    ];

    return [
      {
        key: "cat",
        label: galleryPage.categories[lang],
        options: catGroupOptions,
        value: cat,
        onSelect: setCat,
      },
      {
        key: "plateau",
        label: common.stages[lang],
        options: plateauGroupOptions,
        value: plateau,
        onSelect: setPlateau,
      },
    ];
  }, [
    lang,
    projects,
    categories,
    plateauOptions,
    cat,
    plateau,
    catToPlateaux,
    plateauToCats,
  ]);

  const activeFilterCount =
    (cat !== "all" ? 1 : 0) + (plateau !== "all" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (cat !== "all") parts.push(catLabelMap[cat] ?? cat);
    if (plateau !== "all") parts.push(plateauLabelMap[plateau] ?? plateau);
    return parts.length > 0 ? parts.join(", ") : common.all[lang];
  }, [cat, plateau, catLabelMap, plateauLabelMap, lang]);

  const mobileCountFor = (draft: Record<string, string>) => {
    const draftCat = draft.cat ?? "all";
    const draftPlateau = draft.plateau ?? "all";
    return projects.filter(
      (project) =>
        (draftCat === "all" || project.cat === draftCat) &&
        (draftPlateau === "all" || project.plateau === draftPlateau),
    ).length;
  };

  const applyMobileFilters = (draft: Record<string, string>) => {
    const nextCat = draft.cat ?? "all";
    const nextPlateau = draft.plateau ?? "all";
    setFilters({
      cat: nextCat === "all" ? null : nextCat,
      plateau: nextPlateau === "all" ? null : nextPlateau,
    });
  };

  if (projectsLoading) {
    return <Loader lang={lang} size="page" />;
  }

  return (
    <div className="edo-page-enter grid w-full edo-hairline md:h-full md:grid-cols-gallery-shell md:grid-rows-page md:overflow-hidden">

      <PageHeader
        lang={lang}
        title={common.gallery[lang]}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        titleClassName="lg:col-start-2 lg:col-span-3"
        rightBlockClassName="lg:col-start-5"
        onMenuClick={openMenu}
        onLogoClick={() => goto("home")}
        onLangToggle={() => setLang(lang === "fr" ? "en" : "fr")}
        actions={buildMainNav({ lang, goto, exclude: "gallery" })}
      />

      <div className="grid grid-cols-1 edo-hairline md:col-span-full md:row-start-2 md:min-h-0 md:overflow-hidden md:grid-cols-gallery-shell">
        <MobileNavStrip
          triggerLabel={mobileNav.filters[lang].toUpperCase()}
          groups={mobileGroups}
          hasActive={hasActiveFilters}
          activeCount={activeFilterCount}
          summary={filterSummary}
          ariaLabel={lang === "fr" ? "Filtrer la galerie" : "Filter the gallery"}
          lang={lang}
          countFor={mobileCountFor}
          onApply={applyMobileFilters}
        />
        <div className="hidden bg-white md:block md:overflow-y-auto">
          <GalleryFilters
            lang={lang}
            cat={cat}
            plateau={plateau}
            setCat={setCat}
            setPlateau={setPlateau}
            categories={categories}
            plateauOptions={plateauOptions}
            projects={projects}
            catToPlateaux={catToPlateaux}
            plateauToCats={plateauToCats}
          />
        </div>
        <GalleryContent
          lang={lang}
          filtered={filtered}
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
            goto("book");
          }}
          relatedProjects={lightboxRelated}
          onSelectProject={(id) => setLightbox({ projectId: id, imageIndex: 0 })}
        />
      )}
    </div>
  );
};

export { GalleryPageV3 };
