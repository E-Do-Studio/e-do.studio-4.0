import { useEffect, useState } from "react";
import type { GalleryProject } from "./lib/strapi";
import type { Lang } from "./types";
import { IconArrowRight, IconX } from "./ui";
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
        className="edo-focus-ring absolute right-4 top-4 z-10 cursor-pointer border-0 bg-transparent p-1 text-foreground opacity-60 transition-opacity hover:opacity-100"
      >
        <IconX width={18} height={18} />
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
            className="edo-focus-ring absolute left-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-foreground opacity-60 transition-opacity hover:opacity-100"
          >
            <span className="inline-block rotate-180">
              <IconArrowRight width={20} height={20} />
            </span>
          </button>
          <button
            type="button"
            aria-label={common.nextImage[lang]}
            onClick={next}
            className="edo-focus-ring absolute right-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-foreground opacity-60 transition-opacity hover:opacity-100"
          >
            <IconArrowRight width={20} height={20} />
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
