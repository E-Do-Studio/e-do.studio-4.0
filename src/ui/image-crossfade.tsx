import { useEffect, useState } from 'react';
import { cn } from './cn';

interface ImageCrossfadeSlide {
  url: string;
  alt: string;
}

interface ImageCrossfadeProps {
  images: ImageCrossfadeSlide[];
  className?: string;
  slideMs?: number;
  fadeMs?: number;
  priority?: boolean;
}

const DEFAULT_SLIDE_MS = 10000;
const DEFAULT_FADE_MS = 900;

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

const ImageCrossfade = ({
  images,
  className,
  slideMs = DEFAULT_SLIDE_MS,
  fadeMs = DEFAULT_FADE_MS,
  priority = false,
}: ImageCrossfadeProps) => {
  const [index, setIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const count = images.length;

  useEffect(() => {
    if (count < 2 || reducedMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, slideMs);
    return () => window.clearInterval(id);
  }, [count, slideMs, reducedMotion]);

  if (count === 0) return null;

  if (count === 1) {
    const only = images[0];
    return (
      <img
        src={only.url}
        alt={only.alt}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn('pointer-events-none absolute inset-0 h-full w-full object-cover', className)}
      />
    );
  }

  return (
    <div className={cn('pointer-events-none absolute inset-0', className)} aria-hidden={false}>
      {images.map((img, i) => {
        const isFirst = i === 0;
        const active = i === index;
        return (
          <img
            key={`${i}-${img.url}`}
            src={img.url}
            alt={active ? img.alt : ''}
            fetchPriority={priority && isFirst ? 'high' : 'auto'}
            loading={isFirst ? 'eager' : 'lazy'}
            decoding="async"
            aria-hidden={!active}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: active ? 1 : 0,
              transition: `opacity ${fadeMs}ms var(--ease-in-out)`,
              willChange: 'opacity',
            }}
          />
        );
      })}
    </div>
  );
};

export { ImageCrossfade };
export type { ImageCrossfadeProps, ImageCrossfadeSlide };
