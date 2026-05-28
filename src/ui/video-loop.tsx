import { useEffect, useRef } from 'react';
import { cn } from './cn';

interface VideoLoopProps {
  src: string;
  poster?: string;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  paused?: boolean;
}

const VideoLoop = ({ src, poster, className, objectFit = 'cover', paused = false }: VideoLoopProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (paused) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
  }, [src, paused]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      className={cn('pointer-events-none select-none', className)}
      style={{ objectFit }}
    />
  );
};

export { VideoLoop };
export type { VideoLoopProps };
