import { useEffect, useRef } from 'react';
import { afterLoad } from '@/lib/after-load';
import { cn } from '@/lib/utils';

interface VideoLoopProps {
  src: string;
  poster?: string;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  paused?: boolean;
  /** Type MIME explicite quand la source ne se devine pas depuis l'extension. */
  mime?: string;
  ariaLabel?: string;
}

// Background loops play imperatively, never via the `autoPlay` attribute: autoplay
// would eagerly download the whole source on mount (these clips are 20–50 MB). With
// preload="none" + play() gated on viewport visibility, off-screen videos fetch
// nothing and the poster covers the paint until playback actually starts.
//
// `preload="none"` et non `metadata` : « metadata » téléchargeait déjà ~190 Ko
// dès l'analyse du HTML, en concurrence avec l'image LCP. Et la première
// lecture attend l'événement `load` (afterLoad) : une vidéo visible au
// chargement ne part qu'une fois la page affichée.
const VideoLoop = ({
  src,
  poster,
  className,
  objectFit = 'cover',
  paused = false,
  mime,
  ariaLabel,
}: VideoLoopProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true; // required for programmatic playback; the attribute alone isn't always reflected

    const sync = () => {
      if (visibleRef.current && !paused) el.play().catch(() => {});
      else el.pause();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? false;
        sync();
      },
      { threshold: 0.1 },
    );
    const cancel = afterLoad(() => observer.observe(el));

    return () => {
      cancel();
      observer.disconnect();
    };
  }, [src, paused]);

  return (
    <video
      ref={ref}
      src={mime ? undefined : src}
      poster={poster}
      loop
      muted
      playsInline
      preload="none"
      disablePictureInPicture
      aria-label={ariaLabel}
      className={cn('pointer-events-none select-none', className)}
      style={{ objectFit }}
    >
      {mime ? <source src={src} type={mime} /> : null}
    </video>
  );
};

export { VideoLoop };
export type { VideoLoopProps };
