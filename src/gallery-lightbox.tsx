import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft as IconArrowLeft,
  ArrowRight as IconArrowRight,
  Maximize2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import type { GalleryProject } from "./lib/strapi";
import type { Lang } from "./types";
import { common } from "./i18n/messages";
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
  onContact: () => void;
}

export const GalleryLightbox = ({
  project,
  initialIndex,
  lang,
  onClose,
  onBook,
  onContact,
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
  const [aspect, setAspect] = useState<number | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const animateTimer = useRef<number | null>(null);

  useEffect(() => {
    setAspect(null);
  }, [item?.url]);

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

  const onBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const zoomBtn =
    "edo-focus-ring flex h-8 w-8 items-center justify-center cursor-pointer text-white transition-[background-color,opacity] duration-150 ease-edo-out hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent active:scale-[0.96]";

  const canReset = scale !== MIN_SCALE || tx !== 0 || ty !== 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${project.brand} — ${plateauLabel}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 md:p-6 lg:p-8"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="relative flex flex-col edo-hairline border border-hairline overflow-hidden bg-white h-full max-h-[900px] max-w-full shadow-2xl"
        style={{ aspectRatio: aspect ? `${aspect}` : "4 / 5" }}
      >
        <div className="group relative flex-1 min-h-0 overflow-hidden bg-background">
          <button
            type="button"
            onClick={onClose}
            aria-label={common.close[lang]}
            className="edo-focus-ring absolute right-3 top-3 z-30 flex h-8 w-8 cursor-pointer items-center justify-center text-white opacity-0 mix-blend-exclusion transition-opacity duration-200 ease-edo-out group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
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
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth && v.videoHeight)
                      setAspect(v.videoWidth / v.videoHeight);
                  }}
                  className="pointer-events-auto absolute inset-0 h-full w-full object-cover"
                  aria-label={item.alt || `${project.brand} — ${index + 1}`}
                >
                  <source src={item.url} type={item.mime} />
                </video>
              ) : (
                <img
                  src={item.url}
                  alt={item.alt || `${project.brand} — ${index + 1}`}
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight)
                      setAspect(img.naturalWidth / img.naturalHeight);
                  }}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  style={{
                    transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                    transformOrigin: "center",
                    transition: animate ? "transform 200ms ease-out" : "none",
                  }}
                />
              )
            ) : null}
          </div>

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

        <div
          className="grid shrink-0 edo-hairline bg-white"
          style={{ gridTemplateColumns: "auto 1fr 1fr auto" }}
        >
          <button
            type="button"
            onClick={prev}
            disabled={!hasMultiple}
            aria-label={common.prevImage[lang]}
            className="edo-focus-ring flex h-14 w-14 md:h-16 md:w-16 cursor-pointer items-center justify-center bg-white text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white"
          >
            <IconArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onContact}
            className="edo-focus-ring flex h-14 md:h-16 cursor-pointer items-center justify-center gap-2 bg-white font-mono uppercase text-detail tracking-code text-foreground transition-colors hover:bg-muted"
          >
            {common.contactUs[lang]}
            <IconArrowRight size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onBook}
            className="edo-focus-ring flex h-14 md:h-16 cursor-pointer items-center justify-center gap-2 bg-primary font-mono uppercase text-detail tracking-code text-primary-foreground transition-opacity hover:opacity-90"
          >
            {common.book[lang]}
            <IconArrowRight size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!hasMultiple}
            aria-label={common.nextImage[lang]}
            className="edo-focus-ring flex h-14 w-14 md:h-16 md:w-16 cursor-pointer items-center justify-center bg-white text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white"
          >
            <IconArrowRight size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
