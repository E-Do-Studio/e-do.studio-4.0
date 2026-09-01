import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from './use-media-query';
import { ResponsiveImage } from './responsive-image';

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

const DEFAULT_SLIDE_MS = 5000;
const DEFAULT_FADE_MS = 900;

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
      <ResponsiveImage
        src={only.url}
        alt={only.alt}
        sizes="100vw"
        priority={priority}
        className={cn('pointer-events-none', className)}
      />
    );
  }

  return (
    <div
      className={cn('pointer-events-none absolute inset-0', className)}
      aria-hidden={false}
    >
      {images.map((img, i) => {
        const isFirst = i === 0;
        const active = i === index;
        return (
          // L'opacité de diapositive vit sur l'enveloppe, pas sur l'image.
          // Posée en style inline sur l'`<img>`, elle l'emporterait sur le
          // `img[data-loading]` du fondu de chargement (`styles.css`) : la
          // diapositive active apparaîtrait avant d'être peinte, texte alt
          // compris. Deux fondus, deux éléments.
          <div
            key={`${i}-${img.url}`}
            aria-hidden={!active}
            className="absolute inset-0"
            style={{
              opacity: active ? 1 : 0,
              transition: `opacity ${fadeMs}ms var(--ease-in-out)`,
              willChange: 'opacity',
            }}
          >
            <ResponsiveImage
              src={img.url}
              alt={active ? img.alt : ''}
              sizes="100vw"
              priority={priority && isFirst}
            />
          </div>
        );
      })}
    </div>
  );
};

export { ImageCrossfade };
export type { ImageCrossfadeProps, ImageCrossfadeSlide };
