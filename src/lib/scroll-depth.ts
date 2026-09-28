import type { ScrollDepth } from './analytics-events';

export const SCROLL_DEPTHS: readonly ScrollDepth[] = [25, 50, 75, 100];

export interface ScrollMetrics {
  /** Distance défilée dans le conteneur. */
  scrollTop: number;
  /** Hauteur visible du conteneur. */
  clientHeight: number;
  /** Hauteur totale de son contenu. */
  scrollHeight: number;
}

/**
 * Part du contenu vue, entre 0 et 1. Au bas du conteneur, l'arrondi du
 * navigateur laisse souvent un pixel d'écart : une marge de 2px compte le
 * bas comme atteint.
 */
export function depthRatio({
  scrollTop,
  clientHeight,
  scrollHeight,
}: ScrollMetrics): number {
  if (scrollHeight <= 0) return 0;
  if (scrollTop + clientHeight >= scrollHeight - 2) return 1;
  return Math.min(1, Math.max(0, (scrollTop + clientHeight) / scrollHeight));
}

/** Les paliers franchis par `ratio` que `reached` ne contient pas encore. */
export function newDepths(
  ratio: number,
  reached: ReadonlySet<ScrollDepth>,
): ScrollDepth[] {
  return SCROLL_DEPTHS.filter((d) => ratio * 100 >= d && !reached.has(d));
}
