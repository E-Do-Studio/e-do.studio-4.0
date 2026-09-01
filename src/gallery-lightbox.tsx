import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from './i18n/use-t';
import { plateauLabel as displayPlateau } from './lib/plateau-labels';
import type { GalleryProject } from './lib/strapi';
import type { Lang } from './types';

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

  // Contrôles posés sur l'image : leur toile de fond n'est pas une surface du
  // thème mais la photo. Le scope `dark` porté par la barre fait résoudre les
  // tokens vers la palette sombre — même rendu qu'un blanc écrit en dur, mais
  // tokenisé.
  //
  // `variant="ghost"` est indispensable et manquait : sans lui les trois
  // boutons tombaient sur `default`, donc `bg-primary`. Trois pavés orange
  // posés sur la photo, dont deux à `opacity-30` quand ils sont désactivés —
  // soit deux carrés bruns et un orange vif, là où le `hover:bg-foreground/15`
  // écrit juste en dessous suppose un fond transparent au repos.
  //
  // La cible tactile passe par `icon-touch` (44px, la règle du dépôt) et se
  // resserre à 32 au pointeur. À `icon-sm`, les trois boutons faisaient 28px de
  // côté sur une barre qui est la SEULE façon de zoomer au doigt : le pincement
  // n'est pas implémenté.
  //
  // `opacity-40` et non 30 pour l'état désactivé : à l'ouverture, deux des trois
  // boutons le sont (on ne dézoome pas depuis 100 %, on ne réinitialise pas une
  // vue déjà initiale). À 30 % ils disparaissaient et la barre s'ouvrait sur ce
  // qui ressemblait à un contrôle cassé.
  // Les icônes portent leur taille en classe, pas via la prop `size` de lucide :
  // la base du bouton ne dimensionne que les `svg` SANS classe de taille
  // (`:not([class*='size-'])`), donc la déclarer ici évite d'avoir deux règles
  // qui se disputent le même glyphe.
  const zoomBtn =
    'size-tap md:size-8 text-foreground hover:bg-foreground/15 disabled:opacity-40 disabled:hover:bg-transparent';
  const zoomIcon = 'size-5 md:size-4';

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
          className="relative flex flex-col gap-px bg-border border border-border overflow-hidden bg-background h-full max-h-[900px] max-w-full aspect-[4/5] shadow-2xl"
        >
          <div className="group relative flex-1 min-h-0 overflow-hidden bg-background">
            <Button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              variant="ghost"
              size="icon-sm"
              className="dark absolute right-3 top-3 z-30 text-foreground mix-blend-exclusion transition-opacity duration-200 hover:bg-transparent md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <X size={18} strokeWidth={1.5} />
            </Button>
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
                    className="pointer-events-auto absolute inset-0 h-full w-full "
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

            {/* `select-none` : la surface au-dessus zoome au clic, et deux
                clics rapprochés près de la barre surlignaient le « 100 % » en
                bleu système. */}
            {zoomable && (
              // `bg-background/35` rendait la lisibilité de la barre dépendante
              // de la photo : sur un fond clair, le noir à 35 % donnait un gris
              // moyen sur lequel le `text-muted-foreground` du pourcentage
              // tombait à ~1,2:1 — illisible — et les boutons désactivés
              // disparaissaient. À 85 %, la barre est une surface à elle seule,
              // le flou d'arrière-plan reste visible, et le contraste ne dépend
              // plus de ce qu'il y a derrière. L'ombre remplace le filet dans
              // son rôle de détachement : le filet, lui, reste pour la structure.
              <div className="dark absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 select-none items-center gap-1 border border-border bg-background/85 px-1.5 py-1 shadow-lg backdrop-blur-md">
                <Button
                  type="button"
                  onClick={zoomOut}
                  disabled={scale <= MIN_SCALE}
                  aria-label={t('common.zoomOut')}
                  variant="ghost"
                  size="icon-sm"
                  className={zoomBtn}
                >
                  <Minus strokeWidth={1.5} className={zoomIcon} />
                </Button>
                {/* Le pourcentage est la valeur que le contrôle affiche, pas son
                    intitulé : il se lit en `foreground`. En `muted-foreground`
                    il était l'élément le moins lisible de la barre. */}
                <span className="min-w-11 text-center font-mono text-xs tracking-widest tabular-nums text-foreground">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  type="button"
                  onClick={zoomIn}
                  disabled={scale >= MAX_SCALE}
                  aria-label={t('common.zoomIn')}
                  variant="ghost"
                  size="icon-sm"
                  className={zoomBtn}
                >
                  <Plus strokeWidth={1.5} className={zoomIcon} />
                </Button>
                {/* `bg-muted` sous la portée `dark` vaut un gris sombre : un
                    trait presque noir sur une barre déjà sombre. `border` est
                    le token du filet, ici du blanc à 10 %. */}
                <span
                  className="mx-1 h-5 w-px bg-border md:h-4"
                  aria-hidden="true"
                />
                <Button
                  type="button"
                  onClick={zoomReset}
                  disabled={!canReset}
                  aria-label={t('common.resetZoom')}
                  variant="ghost"
                  size="icon-sm"
                  className={zoomBtn}
                >
                  <RotateCcw strokeWidth={1.5} className={zoomIcon} />
                </Button>
              </div>
            )}
          </div>

          <div
            className="grid shrink-0 gap-px bg-border bg-background"
            style={{ gridTemplateColumns: 'auto 1fr 1fr auto' }}
          >
            <Button
              type="button"
              onClick={prev}
              disabled={!hasMultiple}
              aria-label={t('common.prevImage')}
              variant="cell"
              className="size-14 rounded-none disabled:opacity-30 md:size-16"
            >
              <ArrowLeft data-icon="inline-start" />
            </Button>
            <Button
              type="button"
              onClick={onContact}
              variant="cell"
              className="h-14 flex-row gap-2 text-sm tracking-wider md:h-16"
            >
              {t('common.contactUs')}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              type="button"
              onClick={onBook}
              className="h-14 gap-2 text-sm tracking-wider md:h-16"
            >
              {t('common.book')}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              type="button"
              onClick={next}
              disabled={!hasMultiple}
              aria-label={t('common.nextImage')}
              variant="cell"
              className="size-14 rounded-none disabled:opacity-30 md:size-16"
            >
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
