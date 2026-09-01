import { useEffect, useRef } from 'react';
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
// preload="metadata" + play() gated on viewport visibility, off-screen videos fetch
// only metadata and the poster covers the paint until playback actually starts.
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
    observer.observe(el);

    return () => observer.disconnect();
  }, [src, paused]);

  return (
    <video
      ref={ref}
      src={mime ? undefined : src}
      poster={poster}
      loop
      muted
      playsInline
      preload="metadata"
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
