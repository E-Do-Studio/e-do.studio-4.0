import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { IconArrowRight, IconPlay } from './icons';
import { cn } from './cn';
import type { MediaItem } from '../lib/strapi';

interface PlateauMediaCarouselProps {
  media: MediaItem[];
  fallback: ReactNode;
  lang: 'fr' | 'en';
}

const SWIPE_THRESHOLD = 40;

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
};

interface VideoSlideProps {
  url: string;
  poster?: string;
  alt: string;
  active: boolean;
  shouldMount: boolean;
  reducedMotion: boolean;
  manualPlay: boolean;
  onManualPlay: () => void;
}

const VideoSlide = ({ url, poster, alt, active, shouldMount, reducedMotion, manualPlay, onManualPlay }: VideoSlideProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const shouldAutoplay = !reducedMotion || manualPlay;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active && shouldAutoplay) {
      el.play().catch(() => {});
    } else {
      el.pause();
      if (!active) {
        try { el.currentTime = 0; } catch { /* no-op */ }
      }
    }
  }, [active, shouldAutoplay, url]);

  if (!shouldMount) {
    return poster ? (
      <img src={poster} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
    ) : (
      <div className="absolute inset-0 bg-gradient-to-b from-edo-cream to-edo-sand" aria-hidden="true" />
    );
  }

  return (
    <>
      <video
        ref={ref}
        src={url}
        poster={poster}
        autoPlay={shouldAutoplay}
        loop
        muted
        playsInline
        preload={active ? 'auto' : 'metadata'}
        disablePictureInPicture
        aria-label={alt || undefined}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
      />
      {reducedMotion && !manualPlay && (
        <button
          type="button"
          onClick={onManualPlay}
          className="edo-focus-ring absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer border-0"
          aria-label={alt ? `${alt} — play` : 'Play video'}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm">
            <IconPlay width={18} height={18} />
          </span>
        </button>
      )}
    </>
  );
};

const PlateauMediaCarousel = ({ media, fallback, lang }: PlateauMediaCarouselProps) => {
  const [index, setIndex] = useState(0);
  const [manualPlay, setManualPlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const count = media.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setIndex((i) => (i + delta + count) % count);
      setManualPlay(false);
    },
    [count],
  );

  const goTo = useCallback(
    (i: number) => {
      if (count === 0) return;
      setIndex(((i % count) + count) % count);
      setManualPlay(false);
    },
    [count],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    }
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX;
    if (end == null) return;
    const dx = end - start;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    go(dx < 0 ? 1 : -1);
  };

  if (count === 0) {
    return <>{fallback}</>;
  }

  const labels = {
    prev: lang === 'fr' ? 'Précédent' : 'Previous',
    next: lang === 'fr' ? 'Suivant' : 'Next',
    slide: lang === 'fr' ? 'Diapositive' : 'Slide',
    of: lang === 'fr' ? 'sur' : 'of',
    carousel: lang === 'fr' ? 'Médias du plateau' : 'Stage media',
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.carousel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {media.map((item, i) => {
        const active = i === safeIndex;
        const shouldMount = item.kind === 'image' || active || i === (safeIndex + 1) % count;
        return (
          <div
            key={`${item.kind}-${item.url}-${i}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${labels.slide} ${i + 1} ${labels.of} ${count}`}
            aria-hidden={!active}
            className={cn(
              'absolute inset-0 transition-opacity duration-300 ease-out',
              active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none',
            )}
          >
            {item.kind === 'image' ? (
              <img
                src={item.url}
                alt={item.alt[lang] || ''}
                loading={active ? 'eager' : 'lazy'}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <VideoSlide
                url={item.url}
                poster={item.poster}
                alt={item.alt[lang] || ''}
                active={active}
                shouldMount={shouldMount}
                reducedMotion={reducedMotion}
                manualPlay={manualPlay && active}
                onManualPlay={() => setManualPlay(true)}
              />
            )}
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={labels.prev}
            className="edo-focus-ring absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border-0 bg-white/85 text-foreground shadow-sm transition-colors hover:bg-white cursor-pointer"
          >
            <span className="inline-block rotate-180">
              <IconArrowRight width={14} height={14} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={labels.next}
            className="edo-focus-ring absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border-0 bg-white/85 text-foreground shadow-sm transition-colors hover:bg-white cursor-pointer"
          >
            <IconArrowRight width={14} height={14} />
          </button>

          <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${labels.slide} ${i + 1}`}
                aria-current={i === safeIndex}
                className={cn(
                  'edo-focus-ring h-1.5 rounded-full border-0 cursor-pointer transition-all',
                  i === safeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-white/70 hover:bg-white',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export { PlateauMediaCarousel };
export type { PlateauMediaCarouselProps };
