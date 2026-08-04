import { useCallback, useEffect, useRef, useState } from 'react';
import { plateauLabel as displayPlateau } from './lib/plateau-labels';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft as ArrowLeft,
  ArrowRight as ArrowRight,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import type { GalleryProject } from './lib/strapi';
import type { Lang } from './types';
import { useT } from './i18n/use-t';
import { cn } from '@/lib/utils';

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
  const t = useT();
  const total = project.media.length;
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0)),
  );
  const hasMultiple = total > 1;
  const item = project.media[index];
  const isVideo = !!item && item.kind === 'video';
  const isEmbed = !!item && item.kind === 'embed';
  // Only still images support pan/zoom; videos and iframe embeds are excluded.
  const zoomable = !!item && !isVideo && !isEmbed;
  const plateauLabel = displayPlateau(project.plateau);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total],
  );
  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total]);

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

  useEffect(
    () => () => {
      if (animateTimer.current) window.clearTimeout(animateTimer.current);
    },
    [],
  );

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
    if (!zoomable) return;
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
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [applyZoomAt, zoomable]);

  const onSurfaceClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!zoomable) return;
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
    [applyZoomAt, zoomable, resetTransform, scale, triggerAnimation],
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

  // Échap, le verrou de scroll et le piège à focus sont fournis par Dialog —
  // seules restent les touches propres au visionneur.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hasMultiple && e.key === 'ArrowLeft') {
        prev();
        return;
      }
      if (hasMultiple && e.key === 'ArrowRight') {
        next();
        return;
      }
      if (!zoomable) return;
      if (e.key === '+' || e.key === '=') zoomIn();
      else if (e.key === '-' || e.key === '_') zoomOut();
      else if (e.key === '0') zoomReset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasMultiple, zoomable, next, prev, zoomIn, zoomOut, zoomReset]);

  const zoomBtn =
    'edo-focus-ring flex h-8 w-8 items-center justify-center cursor-pointer text-white transition-[background-color,opacity] duration-150 ease-edo-out hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent active:scale-[0.96]';

  const canReset = scale !== MIN_SCALE || tx !== 0 || ty !== 0;

  return (
    <Dialog
      open
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        variant="fullscreen"
        showCloseButton={false}
        // En plein écran le popup couvre toute la fenêtre : le fond du Dialog
        // n'est plus cliquable, on ferme donc sur un clic tombant sur le popup
        // lui-même (hors du panneau).
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <DialogTitle className="sr-only">
          {`${project.brand} — ${plateauLabel}`}
        </DialogTitle>
        <div
          // Gabarit fixe. Il tirait auparavant son ratio des dimensions
          // naturelles de chaque média : le panneau repassait à 4/5 à chaque
          // changement d'image puis sautait au ratio réel une fois chargée,
          // soit deux sauts par navigation. Le cadre ne bouge plus et les
          // médias s'y inscrivent en `object-contain`.
          className="relative flex flex-col edo-hairline border border-hairline overflow-hidden bg-background h-full max-h-[900px] max-w-full aspect-[4/5] shadow-2xl"
        >
        <div className="group relative flex-1 min-h-0 overflow-hidden bg-background">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="edo-focus-ring absolute right-3 top-3 z-30 flex h-8 w-8 cursor-pointer items-center justify-center text-white mix-blend-exclusion transition-opacity duration-200 ease-edo-out md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
          <div
            ref={surfaceRef}
            onClick={onSurfaceClick}
            className={cn(
              'absolute inset-0 select-none',
              !zoomable
                ? 'cursor-default'
                : scale > MIN_SCALE
                  ? 'cursor-zoom-out'
                  : 'cursor-zoom-in',
            )}
          >
            {item ? (
              isEmbed ? (
                <iframe
                  key={item.url}
                  src={item.url}
                  title={item.alt || `${project.brand} — ${index + 1}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allow="accelerometer; gyroscope; fullscreen; xr-spatial-tracking"
                  allowFullScreen
                  className="pointer-events-auto absolute inset-0 h-full w-full border-0"
                />
              ) : isVideo ? (
                <video
                  key={item.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  preload="metadata"
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
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  style={{
                    transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                    transformOrigin: 'center',
                    transition: animate ? 'transform 200ms ease-out' : 'none',
                  }}
                />
              )
            ) : null}
          </div>

          {zoomable && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 bg-black/35 backdrop-blur-md border border-border px-1.5 py-1">
              <button
                type="button"
                onClick={zoomOut}
                disabled={scale <= MIN_SCALE}
                aria-label={t('common.zoomOut')}
                className={zoomBtn}
              >
                <Minus size={16} strokeWidth={1.5} />
              </button>
              <span className="min-w-11 text-center font-mono text-label tracking-code tabular-nums text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={scale >= MAX_SCALE}
                aria-label={t('common.zoomIn')}
                className={zoomBtn}
              >
                <Plus size={16} strokeWidth={1.5} />
              </button>
              <span className="mx-1 h-4 w-px bg-muted" aria-hidden="true" />
              <button
                type="button"
                onClick={zoomReset}
                disabled={!canReset}
                aria-label={t('common.resetZoom')}
                className={zoomBtn}
              >
                <RotateCcw size={16} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        <div
          className="grid shrink-0 edo-hairline bg-background"
          style={{ gridTemplateColumns: 'auto 1fr 1fr auto' }}
        >
          <button
            type="button"
            onClick={prev}
            disabled={!hasMultiple}
            aria-label={t('common.prevImage')}
            className="edo-focus-ring flex h-14 w-14 md:h-16 md:w-16 cursor-pointer items-center justify-center bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-background"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onContact}
            className="edo-focus-ring flex h-14 md:h-16 cursor-pointer items-center justify-center gap-2 bg-background font-mono uppercase text-detail tracking-code text-foreground transition-colors hover:bg-muted"
          >
            {t('common.contactUs')}
            <ArrowRight size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onBook}
            className="edo-focus-ring flex h-14 md:h-16 cursor-pointer items-center justify-center gap-2 bg-primary font-mono uppercase text-detail tracking-code text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t('common.book')}
            <ArrowRight size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!hasMultiple}
            aria-label={t('common.nextImage')}
            className="edo-focus-ring flex h-14 w-14 md:h-16 md:w-16 cursor-pointer items-center justify-center bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-background"
          >
            <ArrowRight size={20} strokeWidth={1.5} />
          </button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
