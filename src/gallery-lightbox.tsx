import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import type { GalleryProject } from "./lib/strapi";
import type { Lang } from "./types";
import { common } from "./i18n/messages";
import { BookCTATile } from "./book-cta";
import { cn } from "./ui";

const PLATEAU_LABELS: Record<string, { fr: string; en: string }> = {
  cyclorama: { fr: "Cyclorama", en: "Cyclorama" },
  horizontal: { fr: "Horizontal", en: "Horizontal" },
  vertical: { fr: "Vertical", en: "Vertical" },
  eclipse: { fr: "Eclipse", en: "Eclipse" },
  live: { fr: "Live", en: "Live" },
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 1.5;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

interface GalleryLightboxProps {
  project: GalleryProject;
  initialIndex: number;
  lang: Lang;
  onClose: () => void;
  onBook: () => void;
  relatedProjects?: GalleryProject[];
  onSelectProject?: (projectId: number) => void;
}

export const GalleryLightbox = ({
  project,
  initialIndex,
  lang,
  onClose,
  onBook,
  relatedProjects = [],
  onSelectProject,
}: GalleryLightboxProps) => {
  const total = project.media.length;
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0)),
  );
  const hasMultiple = total > 1;
  const item = project.media[index];
  const isVideo = !!item && item.mime.startsWith("video/");
  const plateauLabel = PLATEAU_LABELS[project.plateau]?.[lang] ?? project.plateau;

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % total),
    [total],
  );

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [animate, setAnimate] = useState(false);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const animateTimer = useRef<number | null>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const triggerAnimation = useCallback(() => {
    setAnimate(true);
    if (animateTimer.current) window.clearTimeout(animateTimer.current);
    animateTimer.current = window.setTimeout(() => setAnimate(false), 220);
  }, []);

  useEffect(() => {
    resetTransform();
    setAnimate(false);
  }, [index, resetTransform]);

  useEffect(() => () => {
    if (animateTimer.current) window.clearTimeout(animateTimer.current);
  }, []);

  const applyZoomAt = useCallback(
    (factor: number, cursorX: number, cursorY: number) => {
      setScale((s) => {
        const next = clamp(s * factor, MIN_SCALE, MAX_SCALE);
        if (next === s) return s;
        const ratio = next / s;
        setTx((prevTx) =>
          next === MIN_SCALE ? 0 : cursorX + (prevTx - cursorX) * ratio,
        );
        setTy((prevTy) =>
          next === MIN_SCALE ? 0 : cursorY + (prevTy - cursorY) * ratio,
        );
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (isVideo) return;
    const el = surfaceRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;
      const delta = Math.max(-80, Math.min(80, e.deltaY));
      const factor = Math.exp(-delta * 0.0025);
      applyZoomAt(factor, cursorX, cursorY);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyZoomAt, isVideo]);

  const onSurfaceClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isVideo) return;
      const el = surfaceRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;
      triggerAnimation();
      if (scale === MIN_SCALE) {
        applyZoomAt(2, cursorX, cursorY);
      } else {
        resetTransform();
      }
    },
    [applyZoomAt, isVideo, resetTransform, scale, triggerAnimation],
  );

  const zoomCentered = useCallback(
    (factor: number) => {
      triggerAnimation();
      applyZoomAt(factor, 0, 0);
    },
    [applyZoomAt, triggerAnimation],
  );

  const zoomIn = useCallback(() => zoomCentered(STEP), [zoomCentered]);
  const zoomOut = useCallback(() => zoomCentered(1 / STEP), [zoomCentered]);
  const zoomReset = useCallback(() => {
    triggerAnimation();
    resetTransform();
  }, [resetTransform, triggerAnimation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (hasMultiple && e.key === "ArrowLeft") {
        prev();
        return;
      }
      if (hasMultiple && e.key === "ArrowRight") {
        next();
        return;
      }
      if (isVideo) return;
      if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
      else if (e.key === "0") zoomReset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMultiple, isVideo, next, onClose, prev, zoomIn, zoomOut, zoomReset]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const arrowBtn =
    "edo-focus-ring absolute z-10 flex h-9 w-9 items-center justify-center cursor-pointer bg-black/35 backdrop-blur-md border border-white/20 text-white transition-[transform,background-color] duration-150 ease-edo-out hover:bg-black/50 active:scale-[0.96]";

  const zoomBtn =
    "edo-focus-ring flex h-8 w-8 items-center justify-center cursor-pointer text-white transition-[background-color,opacity] duration-150 ease-edo-out hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent active:scale-[0.96]";

  const thumbsLabel =
    lang === "fr" ? `Médias · ${total}` : `Media · ${total}`;

  const related = relatedProjects.slice(0, 3);
  const hasRelated = related.length > 0 && !!onSelectProject;

  const gridRowsClass =
    hasMultiple && hasRelated
      ? "grid-rows-[auto_auto_auto_auto_auto_1fr_auto]"
      : hasMultiple
        ? "grid-rows-[auto_auto_auto_1fr_auto]"
        : hasRelated
          ? "grid-rows-[auto_auto_auto_1fr_auto]"
          : "grid-rows-[auto_1fr_auto]";

  const canReset = scale !== MIN_SCALE || tx !== 0 || ty !== 0;

  return (
    <div
      className="fixed inset-0 z-50 grid grid-rows-page edo-hairline overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.brand} — ${plateauLabel}`}
    >
      <div className="row-start-1 flex edo-hairline">
        <div className="min-w-0 flex-1 bg-white" aria-hidden="true" />
        <button
          type="button"
          onClick={onClose}
          aria-label={common.close[lang]}
          className="edo-focus-ring flex basis-header-sm cursor-pointer items-center justify-center border-0 bg-white transition-colors hover:bg-muted"
        >
          <X size={18} strokeWidth={1.5} className="text-foreground" />
        </button>
      </div>

      <div className="row-start-2 grid min-h-0 grid-cols-1 grid-rows-[1fr_auto] edo-hairline overflow-hidden md:grid-cols-gallery-overlay md:grid-rows-1">
        <div className="relative min-h-0 overflow-hidden bg-background">
          <div
            ref={surfaceRef}
            onClick={onSurfaceClick}
            className={cn(
              "absolute inset-0 select-none",
              isVideo
                ? "cursor-default"
                : scale > MIN_SCALE
                  ? "cursor-zoom-out"
                  : "cursor-zoom-in",
            )}
          >
            {item ? (
              isVideo ? (
                <video
                  key={item.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="pointer-events-auto absolute inset-0 h-full w-full object-contain"
                  aria-label={item.alt || `${project.brand} — ${index + 1}`}
                >
                  <source src={item.url} type={item.mime} />
                </video>
              ) : (
                <img
                  src={item.url}
                  alt={item.alt || `${project.brand} — ${index + 1}`}
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-h-full max-w-full object-contain"
                  style={{
                    transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
                    transformOrigin: "center",
                    transition: animate
                      ? "transform 200ms ease-out"
                      : "none",
                  }}
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
                className={`${arrowBtn} left-3 top-1/2 -translate-y-1/2`}
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label={common.nextImage[lang]}
                onClick={next}
                className={`${arrowBtn} right-3 top-1/2 -translate-y-1/2`}
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </>
          )}

          {!isVideo && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 bg-black/35 backdrop-blur-md border border-white/20 px-1.5 py-1">
              <button
                type="button"
                onClick={zoomOut}
                disabled={scale <= MIN_SCALE}
                aria-label={common.zoomOut[lang]}
                className={zoomBtn}
              >
                <Minus size={16} strokeWidth={1.5} />
              </button>
              <span className="min-w-11 text-center font-mono text-label tracking-code tabular-nums text-white/80">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={scale >= MAX_SCALE}
                aria-label={common.zoomIn[lang]}
                className={zoomBtn}
              >
                <Plus size={16} strokeWidth={1.5} />
              </button>
              <span className="mx-1 h-4 w-px bg-white/20" aria-hidden="true" />
              <button
                type="button"
                onClick={zoomReset}
                disabled={!canReset}
                aria-label={common.resetZoom[lang]}
                className={zoomBtn}
              >
                <Maximize2 size={16} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        <aside
          className={cn(
            "hidden min-h-0 overflow-y-auto bg-white edo-hairline md:grid",
            gridRowsClass,
          )}
        >
          <div className="flex flex-col gap-2 bg-white px-6 py-7 md:px-cell-lg md:py-8">
            <span className="edo-cell-label text-primary">
              {plateauLabel} · {project.year}
            </span>
            <h2 className="m-0 text-balance text-hero font-light leading-none tracking-display text-foreground">
              {project.brand}
            </h2>
          </div>

          {hasMultiple && (
            <>
              <div className="bg-white px-6 py-3 md:px-cell-lg">
                <span className="edo-cell-label text-muted-foreground">
                  {thumbsLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 bg-white edo-hairline">
                {project.media.map((m, i) => (
                  <button
                    key={m.url}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`${project.brand} — ${i + 1}/${total}`}
                    aria-current={i === index}
                    className={cn(
                      "edo-focus-ring relative aspect-square cursor-pointer overflow-hidden bg-muted transition-opacity duration-200 ease-edo-out",
                      i === index
                        ? "opacity-100"
                        : "opacity-40 hover:opacity-100",
                    )}
                  >
                    {m.mime.startsWith("video/") ? (
                      <video
                        src={m.url}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span className="absolute left-1.5 top-1.5 font-mono text-micro uppercase tracking-code text-white mix-blend-difference">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {hasRelated && (
            <>
              <div className="bg-muted px-6 py-3 md:px-cell-lg">
                <span className="edo-cell-label text-muted-foreground">
                  {common.alsoOnPlateau[lang]}
                </span>
              </div>
              <div className="grid grid-cols-3 bg-muted edo-hairline">
                {related.map((p) => {
                  const cover = p.media[0];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectProject?.(p.id)}
                      aria-label={`${p.brand} — ${plateauLabel}`}
                      className="edo-focus-ring group flex cursor-pointer flex-col bg-white text-left transition-colors duration-200 ease-edo-out hover:bg-muted/60"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                        {cover ? (
                          cover.mime.startsWith("video/") ? (
                            <video
                              src={cover.url}
                              muted
                              playsInline
                              className="h-full w-full object-cover transition-transform duration-300 ease-edo-out group-hover:scale-[1.02]"
                            />
                          ) : (
                            <img
                              src={cover.url}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 ease-edo-out group-hover:scale-[1.02]"
                            />
                          )
                        ) : null}
                      </div>
                      <div className="flex items-baseline justify-between gap-2 border-t border-border px-2.5 py-1.5">
                        <span className="truncate font-mono text-micro uppercase tracking-label text-foreground">
                          {p.brand}
                        </span>
                        <span className="shrink-0 font-mono text-micro uppercase tracking-code text-muted-foreground">
                          {p.year}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="bg-white" aria-hidden="true" />

          <BookCTATile
            lang={lang}
            onClick={onBook}
            label={common.bookThisStage[lang]}
            className="w-full"
          />
        </aside>

        <div className="grid bg-white edo-hairline md:hidden">
          <div className="flex flex-col gap-1.5 bg-white px-4 py-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="edo-cell-label text-primary">
                {plateauLabel} · {project.year}
              </span>
              {hasMultiple && (
                <span className="edo-cell-label text-muted-foreground">
                  {index + 1}/{total}
                </span>
              )}
            </div>
            <h2 className="m-0 truncate text-balance text-hero font-light leading-none tracking-display text-foreground">
              {project.brand}
            </h2>
          </div>

          {hasMultiple && (
            <div className="flex gap-0 overflow-x-auto bg-white edo-hairline [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {project.media.map((m, i) => (
                <button
                  key={m.url}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${project.brand} — ${i + 1}/${total}`}
                  aria-current={i === index}
                  className={cn(
                    "edo-focus-ring relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden bg-muted transition-opacity duration-200 ease-edo-out",
                    i === index ? "opacity-100" : "opacity-40",
                  )}
                >
                  {m.mime.startsWith("video/") ? (
                    <video
                      src={m.url}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={m.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          <BookCTATile
            lang={lang}
            onClick={onBook}
            label={common.bookThisStage[lang]}
            className="h-auto w-full py-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] [&_span:first-child]:block"
          />
        </div>
      </div>
    </div>
  );
};
