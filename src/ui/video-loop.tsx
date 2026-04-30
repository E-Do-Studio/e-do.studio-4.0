import { useEffect, useRef } from 'react';
import { cn } from './cn';

interface VideoLoopProps {
  src: string;
  poster?: string;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

const VideoLoop = ({ src, poster, className, objectFit = 'cover' }: VideoLoopProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.play().catch(() => {});
  }, [src]);

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
