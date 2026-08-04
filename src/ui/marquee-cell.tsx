import { useState, useEffect, useRef } from 'react';
import { BRANDS } from '../lib/brands';

interface MarqueeCellProps {
  items?: string[];
  pxPerSecond?: number;
  size?: number;
}

const MarqueeCell = ({
  items,
  pxPerSecond = 50,
  size = 18,
}: MarqueeCellProps) => {
  const list = items ?? BRANDS;
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(40);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || list.length === 0) return;
    const measure = () => {
      // Track contains the list duplicated once, so half its width is one loop's distance.
      const half = track.scrollWidth / 2;
      if (half > 0) setDuration(half / pxPerSecond);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    if (document.fonts?.ready)
      document.fonts.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [list, pxPerSecond, size]);

  if (list.length === 0)
    return <div className="flex h-full items-center bg-white" />;
  return (
    <div className="relative flex h-full items-center overflow-hidden bg-white">
      <div
        ref={trackRef}
        className="inline-flex whitespace-nowrap pl-5"
        style={{ animation: `mq ${duration}s linear infinite` }}
      >
        {[...list, ...list].map((x, i) => (
          <span
            key={i}
            className="font-sans text-foreground pr-10"
            style={{
              fontSize: size,
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            {x}
          </span>
        ))}
      </div>
      <style>{`@keyframes mq { to { transform: translateX(-50%) } }`}</style>
    </div>
  );
};

export { MarqueeCell };
export type { MarqueeCellProps };
