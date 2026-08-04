import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { matchesMedia } from './use-media-query';

interface HoverMarqueeProps {
  children: ReactNode;
  className?: string;
}

const SCROLL_SPEED_PX_PER_SEC = 28;
const PAUSE_AT_END_MS = 1600;
const PAUSE_AT_START_MS = 350;
const START_DELAY_MS = 200;
const RETURN_MS = 300;

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

const TRIGGER_SELECTOR = 'button, a, [role="button"], [data-marquee-trigger]';

// Lues à chaque survol, pas au rendu : `matches` est une lecture live, donc
// toujours à jour. `matchesMedia` partage le cache de MediaQueryList du module
// use-media-query au lieu d'en recréer une à chaque entrée du pointeur.
const supportsHover = () => matchesMedia('(hover: hover) and (pointer: fine)');

const prefersReducedMotion = () =>
  matchesMedia('(prefers-reduced-motion: reduce)');

const HoverMarquee = ({ children, className }: HoverMarqueeProps) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<Animation | null>(null);

  const handleEnter = useCallback(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    if (!wrapper || !track) return;
    if (!supportsHover() || prefersReducedMotion()) return;

    const overflow = wrapper.scrollWidth - wrapper.clientWidth;
    if (overflow <= 0) return;

    animationRef.current?.cancel();

    track.style.display = 'inline-block';
    track.style.willChange = 'transform';
    wrapper.style.textOverflow = 'clip';

    const travel = (overflow / SCROLL_SPEED_PX_PER_SEC) * 1000;
    const startupDuration = START_DELAY_MS + travel;

    const startup = track.animate(
      [
        { transform: 'translateX(0)', offset: 0 },
        {
          transform: 'translateX(0)',
          offset: START_DELAY_MS / startupDuration,
        },
        { transform: `translateX(-${overflow}px)`, offset: 1 },
      ],
      { duration: startupDuration, easing: 'linear', fill: 'forwards' },
    );
    animationRef.current = startup;

    startup.onfinish = () => {
      if (animationRef.current !== startup) return;

      const cycle = PAUSE_AT_END_MS + travel + PAUSE_AT_START_MS + travel;
      const at = (ms: number) => ms / cycle;
      const pingPong = track.animate(
        [
          { transform: `translateX(-${overflow}px)`, offset: 0 },
          {
            transform: `translateX(-${overflow}px)`,
            offset: at(PAUSE_AT_END_MS),
          },
          { transform: 'translateX(0)', offset: at(PAUSE_AT_END_MS + travel) },
          {
            transform: 'translateX(0)',
            offset: at(PAUSE_AT_END_MS + travel + PAUSE_AT_START_MS),
          },
          { transform: `translateX(-${overflow}px)`, offset: 1 },
        ],
        { duration: cycle, iterations: Infinity, easing: 'linear' },
      );
      animationRef.current = pingPong;
    };
  }, []);

  const handleLeave = useCallback(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    if (!wrapper || !track) return;
    if (!animationRef.current) return;

    const currentTransform = getComputedStyle(track).transform;
    animationRef.current.cancel();

    const back = track.animate(
      [{ transform: currentTransform }, { transform: 'translateX(0)' }],
      { duration: RETURN_MS, easing: EASE_OUT, fill: 'forwards' },
    );
    animationRef.current = back;
    back.onfinish = () => {
      if (animationRef.current !== back) return;
      track.style.display = '';
      track.style.willChange = '';
      track.style.transform = '';
      wrapper.style.textOverflow = '';
      animationRef.current = null;
    };
  }, []);

  // Trigger on the closest interactive ancestor (button, link, role=button or
  // any element marked with data-marquee-trigger). Falls back to the wrapper
  // itself when no interactive ancestor exists.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const trigger =
      (wrapper.closest(TRIGGER_SELECTOR) as HTMLElement | null) ?? wrapper;

    trigger.addEventListener('pointerenter', handleEnter);
    trigger.addEventListener('pointerleave', handleLeave);
    return () => {
      trigger.removeEventListener('pointerenter', handleEnter);
      trigger.removeEventListener('pointerleave', handleLeave);
    };
  }, [handleEnter, handleLeave]);

  return (
    <span
      ref={wrapperRef}
      className={cn(
        'block overflow-hidden text-ellipsis whitespace-nowrap',
        className,
      )}
    >
      <span ref={trackRef}>{children}</span>
    </span>
  );
};

export { HoverMarquee };
export type { HoverMarqueeProps };
