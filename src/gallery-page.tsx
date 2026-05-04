import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { usePageContext } from "./router";
import type { Lang } from "./types";
import { Button, PageHeader, IconArrowRight, IconMenu, CellLabel, Wordmark } from "./ui";
import { cn } from "./ui/cn";

/* =================================================================
   GALLERY V3 — same editorial grid, modern React + Tailwind.
   ================================================================= */

const CATEGORIES_GAL = [
  { k: "pap", fr: "Prêt-à-porter", en: "Ready-to-wear" },
  { k: "accessoires", fr: "Accessoires", en: "Accessories" },
  { k: "eyewear", fr: "Eyewear", en: "Eyewear" },
  { k: "bijoux", fr: "Bijoux", en: "Jewelry" },
  { k: "cosmetique", fr: "Cosmétique", en: "Cosmetics" },
  { k: "food", fr: "Food & Spiritueux", en: "Food & Spirits" },
];

const PROJECTS = [
  {
    id: 1,
    title: "Maison Ortho",
    cat: "pap",
    plateau: "cyclorama",
    year: 2026,
    refs: 48,
    tone: "mono",
  },
  {
    id: 2,
    title: "Le Monde Béryl",
    cat: "accessoires",
    plateau: "horizontal",
    year: 2026,
    refs: 32,
    tone: "mono",
  },
  {
    id: 3,
    title: "Atelier Soie",
    cat: "pap",
    plateau: "vertical",
    year: 2026,
    refs: 24,
    tone: "warm",
  },
  {
    id: 4,
    title: "Kôji — Chapter 3",
    cat: "eyewear",
    plateau: "eclipse",
    year: 2025,
    refs: 18,
    tone: "mono",
  },
  {
    id: 5,
    title: "Rue Saint-Honoré",
    cat: "cosmetique",
    plateau: "horizontal",
    year: 2025,
    refs: 40,
    tone: "warm",
  },
  {
    id: 6,
    title: "Ganymède",
    cat: "bijoux",
    plateau: "eclipse",
    year: 2025,
    refs: 22,
    tone: "dark",
  },
  {
    id: 7,
    title: "Moa Studio FW26",
    cat: "pap",
    plateau: "live",
    year: 2026,
    refs: 56,
    tone: "dark",
  },
  {
    id: 8,
    title: "Maison Margin",
    cat: "pap",
    plateau: "vertical",
    year: 2025,
    refs: 30,
    tone: "mono",
  },
  {
    id: 9,
    title: "Toby Ombré",
    cat: "food",
    plateau: "horizontal",
    year: 2026,
    refs: 14,
    tone: "warm",
  },
  {
    id: 10,
    title: "Noir Étoilé",
    cat: "cosmetique",
    plateau: "cyclorama",
    year: 2025,
    refs: 28,
    tone: "dark",
  },
  {
    id: 11,
    title: "Orbite",
    cat: "eyewear",
    plateau: "eclipse",
    year: 2025,
    refs: 16,
    tone: "mono",
  },
  {
    id: 12,
    title: "Studio 11",
    cat: "accessoires",
    plateau: "horizontal",
    year: 2026,
    refs: 36,
    tone: "warm",
  },
  {
    id: 13,
    title: "Parure",
    cat: "bijoux",
    plateau: "eclipse",
    year: 2026,
    refs: 20,
    tone: "mono",
  },
  {
    id: 14,
    title: "Rue Cadet",
    cat: "pap",
    plateau: "cyclorama",
    year: 2025,
    refs: 44,
    tone: "dark",
  },
  {
    id: 15,
    title: "Atelier Bois",
    cat: "food",
    plateau: "horizontal",
    year: 2025,
    refs: 12,
    tone: "warm",
  },
  {
    id: 16,
    title: "Maison Ardent",
    cat: "pap",
    plateau: "vertical",
    year: 2026,
    refs: 26,
    tone: "mono",
  },
  {
    id: 17,
    title: "Saar Paris",
    cat: "accessoires",
    plateau: "eclipse",
    year: 2026,
    refs: 34,
    tone: "dark",
  },
  {
    id: 18,
    title: "Solène",
    cat: "bijoux",
    plateau: "cyclorama",
    year: 2025,
    refs: 18,
    tone: "warm",
  },
];

const PLATEAU_OPTIONS = [
  { k: "cyclorama", fr: "Cyclorama", en: "Cyclorama" },
  { k: "horizontal", fr: "Horizontal", en: "Horizontal" },
  { k: "vertical", fr: "Vertical", en: "Vertical" },
  { k: "eclipse", fr: "Eclipse", en: "Eclipse" },
  { k: "live", fr: "Live", en: "Live" },
];

const CAT_PLATEAU_MAP = {
  pap: ["cyclorama", "horizontal", "vertical", "live"],
  accessoires: ["cyclorama", "eclipse"],
  eyewear: ["cyclorama", "eclipse"],
  bijoux: ["cyclorama", "eclipse"],
  cosmetique: ["cyclorama", "eclipse"],
  food: ["cyclorama", "eclipse"],
};

const PLATEAU_CAT_MAP: Record<string, string[]> = PLATEAU_OPTIONS.reduce<
  Record<string, string[]>
>((acc, plateau) => {
  acc[plateau.k] = Object.entries(CAT_PLATEAU_MAP)
    .filter(([, plateaus]) => plateaus.includes(plateau.k))
    .map(([category]) => category);
  return acc;
}, {});

const PROJECT_PALETTES: Record<
  string,
  { bgClass: string; accent: string; soft: string }
> = {
  mono: { bgClass: "bg-muted", accent: "#141414", soft: "#bfbfbf" },
  dark: { bgClass: "bg-foreground", accent: "#f5f5f5", soft: "#2a2a2a" },
  warm: { bgClass: "bg-edo-warm", accent: "#141414", soft: "#b8ad94" },
};

interface GalleryFiltersProps {
  lang: Lang;
  cat: string;
  plateau: string;
  setCat: (c: string) => void;
  setPlateau: (p: string) => void;
}

const GalleryFilters = ({
  lang,
  cat,
  plateau,
  setCat,
  setPlateau,
}: GalleryFiltersProps) => {
  const countCat = (key: string) =>
    key === "all"
      ? PROJECTS.length
      : PROJECTS.filter((project) => project.cat === key).length;
  const countPlateau = (key: string) =>
    key === "all"
      ? PROJECTS.length
      : PROJECTS.filter((project) => project.plateau === key).length;
  const hasFilters = cat !== "all" || plateau !== "all";

  return (
    <aside className="flex flex-col bg-white">
      <FilterHeader label={lang === "fr" ? "Catégories" : "Categories"} />
      <FilterCell
        label={lang === "fr" ? "Tout" : "All"}
        active={cat === "all"}
        count={countCat("all")}
        onClick={() => setCat("all")}
      />
      {CATEGORIES_GAL.map((category) => {
        const dimmed =
          plateau !== "all" &&
          !(PLATEAU_CAT_MAP[plateau] || []).includes(category.k);
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

      <FilterHeader label={lang === "fr" ? "Plateaux" : "Stages"} />
      <FilterCell
        label={lang === "fr" ? "Tout" : "All"}
        active={plateau === "all"}
        count={countPlateau("all")}
        onClick={() => setPlateau("all")}
      />
      {PLATEAU_OPTIONS.map((option) => {
        const dimmed =
          cat !== "all" &&
          !(
            CAT_PLATEAU_MAP[cat as keyof typeof CAT_PLATEAU_MAP] || []
          ).includes(option.k);
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
          ↺ {lang === "fr" ? "Réinitialiser" : "Reset"}
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
  filtered: typeof PROJECTS;
  resetFilters: () => void;
}

const GalleryContent = ({
  lang,
  filtered,
  resetFilters,
}: GalleryContentProps) => (
  <div className="min-h-0 overflow-y-auto bg-black">
    <div className="flex flex-col gap-px bg-black">
      {filtered.length === 0 ? (
        <GalleryEmptyState lang={lang} onReset={resetFilters} />
      ) : (
        filtered.map((project, idx) => (
          <ProjectRow
            key={project.id}
            project={project}
            style={{ transitionDelay: `${Math.min(idx * 40, 200)}ms` }}
          />
        ))
      )}
    </div>
  </div>
);

const GalleryEmptyState = ({
  lang,
  onReset,
}: {
  lang: Lang;
  onReset: () => void;
}) => (
  <div className="flex min-h-96 flex-col items-center justify-center gap-2.5 bg-white px-6 py-20 text-muted-foreground">
    <span className="edo-cell-label">
      {lang === "fr" ? "Aucun résultat" : "No results"}
    </span>
    <span className="text-detail">
      {lang === "fr" ? "Essayez un autre filtre." : "Try another filter."}
    </span>
    <Button
      variant="outline"
      size="sm"
      onClick={onReset}
      className="mt-2.5"
    >
      {lang === "fr" ? "Réinitialiser" : "Reset"}
    </Button>
  </div>
);

type Project = (typeof PROJECTS)[number];

const ProjectRow = ({ project, style }: { project: Project; style?: CSSProperties }) => (
  <div className="edo-list-row grid gap-px bg-black grid-cols-2 md:grid-cols-gallery-row" style={style}>
    <ProjectLabel project={project} />
    {[0, 1, 2].map((imageIndex) => (
      <ProjectImage
        key={imageIndex}
        project={{ ...project, id: project.id * 3 + imageIndex }}
        hidden={imageIndex === 2}
      />
    ))}
  </div>
);

const ProjectLabel = ({ project }: { project: Project }) => (
  <button className="edo-focus-ring relative flex cursor-pointer flex-col items-center justify-between overflow-hidden border-0 bg-white px-2.5 py-3.5 text-left font-sans">
    <span className="self-start font-mono text-micro tracking-code text-muted-foreground">
      {String(project.id).padStart(2, "0")}
    </span>
    <div className="flex min-h-0 flex-1 items-center justify-center py-2 edo-writing-vertical rotate-180">
      <span className="whitespace-nowrap text-tile-large font-medium leading-none tracking-headline text-foreground">
        {project.title}
      </span>
    </div>
    <span className="self-start font-mono text-micro tracking-code text-muted-foreground">
      {project.year}
    </span>
  </button>
);

const ProjectImage = ({ project, hidden }: { project: Project; hidden?: boolean }) => (
  <div className={`relative aspect-portrait overflow-hidden bg-white ${hidden ? 'hidden md:block' : ''}`}>
    <ProjectCover project={project} />
  </div>
);

const ProjectCover = ({ project }: { project: Project }) => {
  const palette = PROJECT_PALETTES[project.tone] || PROJECT_PALETTES.mono;
  const layout = project.id % 4;

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

const GalleryPageV3 = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const [cat, setCat] = useState("all");
  const [plateau, setPlateau] = useState("all");

  const filtered = useMemo(
    () =>
      PROJECTS.filter(
        (project) =>
          (cat === "all" || project.cat === cat) &&
          (plateau === "all" || project.plateau === plateau),
      ),
    [cat, plateau],
  );
  const resetFilters = () => {
    setCat("all");
    setPlateau("all");
  };

  return (
    <div className="edo-page-enter grid w-full gap-px bg-black overflow-y-auto md:h-full md:grid-cols-gallery-shell md:grid-rows-page md:overflow-hidden">

      {/* Mobile header (hidden on desktop) */}
      <PageHeader
        lang={lang}
        title={lang === "fr" ? "Galerie" : "Gallery"}
        className="col-span-full h-14 md:hidden"
        onMenuClick={openMenu}
        onLogoClick={() => goto("home")}
        onLangToggle={() => setLang(lang === "fr" ? "en" : "fr")}
        actions={[
          { id: "book", label: lang === "fr" ? "Réserver" : "Book", onClick: () => goto("book"), variant: "primary" },
        ]}
      />

      {/* Desktop header col 1 – logo (hidden on mobile) */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-1 md:row-start-1">
        <button onClick={openMenu} aria-label="Open menu" className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background text-foreground transition-colors hover:bg-muted">
          <IconMenu width="18" height="18" />
        </button>
        <button onClick={() => goto("home")} aria-label="E-Do Studio home" className="edo-focus-ring flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-background p-2 transition-colors hover:bg-muted">
          <Wordmark size={32} />
        </button>
      </div>

      {/* Desktop header col 2 – title + nav (hidden on mobile) */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-2 md:row-start-1">
        <div className="flex flex-1 min-w-0 items-center bg-background px-6">
          <CellLabel className="shrink-0 text-primary">{lang === "fr" ? "Galerie" : "Gallery"}</CellLabel>
        </div>
        <button onClick={() => goto("plateau-live")} className="edo-focus-ring flex h-full flex-none cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted">
          <span className="whitespace-nowrap">{lang === "fr" ? "Plateaux" : "Stages"}</span>
          <IconArrowRight width={12} height={12} />
        </button>
        <button onClick={() => goto("postprod")} className="edo-focus-ring flex h-full flex-none cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted">
          <span className="whitespace-nowrap">Post-prod</span>
          <IconArrowRight width={12} height={12} />
        </button>
        <button onClick={() => goto("book")} className="edo-focus-ring flex h-full flex-none cursor-pointer items-center justify-center gap-2 border-0 bg-primary px-5 font-mono text-label tracking-ui uppercase text-white no-underline transition-colors hover:bg-foreground">
          <span className="whitespace-nowrap">{lang === "fr" ? "Réserver" : "Book"}</span>
          <IconArrowRight width={12} height={12} className="text-white" />
        </button>
        <button onClick={() => setLang(lang === "fr" ? "en" : "fr")} className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background p-0 transition-colors hover:bg-muted">
          <span className="font-mono text-label tracking-meta text-foreground">{lang === "fr" ? "EN" : "FR"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-px bg-black md:col-span-2 md:row-start-2 md:min-h-0 md:overflow-hidden md:grid-cols-gallery-shell">
        {/* Filters: horizontal scroll on mobile, vertical sidebar on desktop */}
        <div className="bg-white overflow-x-auto md:overflow-x-hidden md:overflow-y-auto">
          <div className="flex flex-row md:flex-col min-w-max md:min-w-0">
            <GalleryFilters
              lang={lang}
              cat={cat}
              plateau={plateau}
              setCat={setCat}
              setPlateau={setPlateau}
            />
          </div>
        </div>
        <GalleryContent
          lang={lang}
          filtered={filtered}
          resetFilters={resetFilters}
        />
      </div>
    </div>
  );
};

export { GalleryPageV3 };
