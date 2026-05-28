import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryProject } from "./lib/strapi";
import type { Lang } from "./types";
import { common } from "./i18n/messages";
import { BookCTATile } from "./book-cta";

const PLATEAU_LABELS: Record<string, { fr: string; en: string }> = {
  cyclorama: { fr: "Cyclorama", en: "Cyclorama" },
  horizontal: { fr: "Horizontal", en: "Horizontal" },
  vertical: { fr: "Vertical", en: "Vertical" },
  eclipse: { fr: "Eclipse", en: "Eclipse" },
  live: { fr: "Live", en: "Live" },
};

interface GalleryLightboxProps {
  project: GalleryProject;
  initialIndex: number;
  lang: Lang;
  onClose: () => void;
  onBook: () => void;
}

export const GalleryLightbox = ({
  project,
  initialIndex,
  lang,
  onClose,
  onBook,
}: GalleryLightboxProps) => {
  const total = project.media.length;
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0)),
  );
  const hasMultiple = total > 1;
  const item = project.media[index];
  const plateauLabel = PLATEAU_LABELS[project.plateau]?.[lang] ?? project.plateau;

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasMultiple) prev();
      else if (e.key === "ArrowRight" && hasMultiple) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, hasMultiple, total]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const ctrlBtn =
    "edo-focus-ring absolute z-10 flex h-9 w-9 items-center justify-center cursor-pointer bg-black/35 backdrop-blur-md border border-white/20 text-white transition-[transform,background-color] duration-150 ease-edo-out hover:bg-black/50 active:scale-[0.96]";

  return (
    <div
      className="fixed inset-0 z-50 bg-background/70 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.brand} — ${plateauLabel}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        aria-label={common.close[lang]}
        onClick={onClose}
        className={`${ctrlBtn} right-3 top-3`}
      >
        <X size={18} strokeWidth={1.5} />
      </button>

      <div className="pointer-events-none flex h-full w-full items-center justify-center px-4 py-16 md:px-16 md:py-20">
        {item ? (
          item.mime.startsWith("video/") ? (
            <video
              key={item.url}
              autoPlay
              loop
              muted
              playsInline
              controls
              className="pointer-events-auto max-h-full max-w-full object-contain"
              aria-label={item.alt || `${project.brand} — ${index + 1}`}
            >
              <source src={item.url} type={item.mime} />
            </video>
          ) : (
            <img
              src={item.url}
              alt={item.alt || `${project.brand} — ${index + 1}`}
              className="pointer-events-auto max-h-full max-w-full object-contain"
            />
          )
        ) : null}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label={common.prevImage[lang]}
            onClick={prev}
            className={`${ctrlBtn} left-3 top-1/2 -translate-y-1/2`}
          >
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label={common.nextImage[lang]}
            onClick={next}
            className={`${ctrlBtn} right-3 top-1/2 -translate-y-1/2`}
          >
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        </>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-4 pb-4 md:px-6 md:pb-6">
        <span className="font-mono text-micro uppercase tracking-code text-muted-foreground">
          {project.brand} · {plateauLabel} · {project.year}
          {hasMultiple ? ` · ${index + 1}/${total}` : ""}
        </span>
        <BookCTATile
          lang={lang}
          onClick={onBook}
          label={common.bookThisStage[lang]}
          className="pointer-events-auto"
        />
      </div>
    </div>
  );
};
