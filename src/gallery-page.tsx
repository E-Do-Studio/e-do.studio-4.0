import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { usePageContext } from "./router";
import { useDocumentMeta } from "./lib/use-document-meta";
import { useGalleryProjects, useGalleryCategories } from "./lib/use-strapi";
import type { GalleryProject } from "./lib/strapi";
import type { Lang } from "./types";
import { EmptyState, Loader, PageHeader, IconArrowRight, CellLabel, Wordmark } from "./ui";
import { cn } from "./ui/cn";
import { common, galleryPage } from "./i18n/messages";

const PLATEAU_LABELS: Record<string, { fr: string; en: string }> = {
  cyclorama: { fr: "Cyclorama", en: "Cyclorama" },
  horizontal: { fr: "Horizontal", en: "Horizontal" },
  vertical: { fr: "Vertical", en: "Vertical" },
  eclipse: { fr: "Eclipse", en: "Eclipse" },
  live: { fr: "Live", en: "Live" },
};

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
  loading?: boolean;
}

const GalleryContent = ({
  lang,
  filtered,
  resetFilters,
  loading,
}: GalleryContentProps) => (
  <div className="min-h-0 overflow-y-auto bg-edo-pure-black">
    <div className="flex flex-col gap-px bg-edo-pure-black">
      {loading ? (
        <Loader lang={lang} size="block" className="bg-background py-24" />
      ) : filtered.length === 0 ? (
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
          />
        ))
      )}
    </div>
  </div>
);

const ProjectRow = ({ project, lang, style }: { project: GalleryProject; lang: Lang; style?: CSSProperties }) => (
  <div className="edo-list-row grid gap-px bg-edo-pure-black grid-cols-2 md:grid-cols-gallery-row" style={style}>
    <ProjectLabel project={project} lang={lang} />
    {[0, 1, 2].map((imageIndex) => (
      <ProjectImage
        key={imageIndex}
        project={project}
        imageIndex={imageIndex}
        // Mobile only fits 2 cells per row (label + one image). Hide image[1] and image[2]
        // below md so the grid never leaves an empty cell that exposes the black backdrop.
        hidden={imageIndex !== 0}
      />
    ))}
  </div>
);

const ProjectLabel = ({ project, lang }: { project: GalleryProject; lang: Lang }) => {
  const plateauLabel = PLATEAU_LABELS[project.plateau]?.[lang] ?? project.plateau;
  return (
    <button className="edo-focus-ring relative flex cursor-pointer flex-col items-center justify-between overflow-hidden border-0 bg-white px-2.5 py-3.5 text-left font-sans">
      <span className="max-w-full self-start truncate font-mono text-micro uppercase tracking-code text-muted-foreground">
        {plateauLabel}
      </span>
      <div className="flex min-h-0 flex-1 items-center justify-center py-2 edo-writing-vertical rotate-180">
        <span className="whitespace-nowrap text-tile-large font-medium leading-none tracking-headline text-foreground">
          {project.brand}
        </span>
      </div>
      <span className="self-start font-mono text-micro tracking-code text-muted-foreground">
        {project.year}
      </span>
    </button>
  );
};

const ProjectImage = ({
  project,
  imageIndex,
  hidden,
}: {
  project: GalleryProject;
  imageIndex: number;
  hidden?: boolean;
}) => {
  const imageUrl = project.imageUrls[imageIndex];

  return (
    <div className={`relative aspect-portrait overflow-hidden bg-white ${hidden ? 'hidden md:block' : ''}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${project.brand} — ${imageIndex + 1}`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <ProjectCoverFallback project={project} seed={project.id * 3 + imageIndex} />
      )}
    </div>
  );
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

const GalleryPageV3 = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('gallery', lang);
  const [cat, setCat] = useState("all");
  const [plateau, setPlateau] = useState("all");

  const { data: strapiProjects, loading: projectsLoading } = useGalleryProjects();
  const { data: strapiCategories } = useGalleryCategories();

  const projects = strapiProjects ?? [];
  const categories = strapiCategories ?? [];

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
    setCat("all");
    setPlateau("all");
  };

  return (
    <div className="edo-page-enter grid w-full gap-px bg-edo-pure-black overflow-y-auto md:h-full md:grid-cols-gallery-full md:grid-rows-page md:overflow-hidden">

      <PageHeader
        lang={lang}
        title={common.gallery[lang]}
        className="col-span-full h-14 md:hidden"
        onMenuClick={openMenu}
        onLogoClick={() => goto("home")}
        onLangToggle={() => setLang(lang === "fr" ? "en" : "fr")}
        actions={[
          { id: "book", label: common.book[lang], onClick: () => goto("book"), variant: "primary" },
        ]}
      />

      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-1 md:row-start-1">
        <button onClick={() => goto("home")} aria-label="E-Do Studio home" className="edo-focus-ring flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-background p-2 transition-colors hover:bg-muted">
          <Wordmark size={32} />
        </button>
      </div>

      <div className="hidden md:flex h-full min-w-0 items-center bg-background px-2 md:col-start-2 md:row-start-1">
        <CellLabel className="shrink-0 text-primary truncate">{common.gallery[lang]}</CellLabel>
      </div>

      <button onClick={() => goto("postprod")} className="edo-focus-ring hidden md:flex h-full cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted md:col-start-3 md:row-start-1">
        <span className="whitespace-nowrap">Post-prod</span>
        <IconArrowRight width={12} height={12} />
      </button>

      <button onClick={() => goto("plateau-live")} className="edo-focus-ring hidden md:flex h-full cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted md:col-start-4 md:row-start-1">
        <span className="whitespace-nowrap">{common.stages[lang]}</span>
        <IconArrowRight width={12} height={12} />
      </button>

      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-5 md:row-start-1">
        <button onClick={() => goto("book")} className="edo-focus-ring flex h-full flex-1 cursor-pointer items-center justify-center gap-2 border-0 bg-primary px-5 font-mono text-label tracking-ui uppercase text-white no-underline transition-colors hover:bg-foreground">
          <span className="whitespace-nowrap">{common.book[lang]}</span>
          <IconArrowRight width={12} height={12} className="text-white" />
        </button>
        <button onClick={() => setLang(lang === "fr" ? "en" : "fr")} className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background p-0 transition-colors hover:bg-muted">
          <span className="font-mono text-label tracking-meta text-foreground">{common.langToggleLabel[lang]}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-px bg-edo-pure-black md:col-span-full md:row-start-2 md:min-h-0 md:overflow-hidden md:grid-cols-gallery-shell">
        <div className="bg-white overflow-x-auto md:overflow-x-hidden md:overflow-y-auto">
          <div className="flex flex-row md:flex-col min-w-max md:min-w-0">
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
        </div>
        <GalleryContent
          lang={lang}
          filtered={filtered}
          resetFilters={resetFilters}
          loading={projectsLoading}
        />
      </div>
    </div>
  );
};

export { GalleryPageV3 };
