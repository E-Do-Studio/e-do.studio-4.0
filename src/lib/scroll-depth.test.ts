import { describe, expect, it } from 'vitest';
import type { ScrollDepth } from './analytics-events';
import { depthRatio, newDepths } from './scroll-depth';

describe('depthRatio', () => {
  it('mesure le bas de l’écran rapporté au contenu', () => {
    expect(
      depthRatio({ scrollTop: 0, clientHeight: 500, scrollHeight: 2000 }),
    ).toBe(0.25);
  });

  // Au bas d'un conteneur, l'arrondi laisse souvent un pixel d'écart.
  it('compte le bas atteint à 2px près', () => {
    expect(
      depthRatio({ scrollTop: 1499, clientHeight: 500, scrollHeight: 2000 }),
    ).toBe(1);
  });

  // Article sous la ligne de flottaison : sa position est positive.
  it('borne à 0 un contenu pas encore atteint', () => {
    expect(
      depthRatio({ scrollTop: -900, clientHeight: 800, scrollHeight: 2000 }),
    ).toBe(0);
  });

  it('vaut 0 sur un contenu vide', () => {
    expect(depthRatio({ scrollTop: 0, clientHeight: 0, scrollHeight: 0 })).toBe(
      0,
    );
  });
});

describe('newDepths', () => {
  it('rend chaque palier franchi, une seule fois', () => {
    const reached = new Set<ScrollDepth>();
    expect(newDepths(0.6, reached)).toEqual([25, 50]);
    reached.add(25).add(50);
    expect(newDepths(0.6, reached)).toEqual([]);
    expect(newDepths(1, reached)).toEqual([75, 100]);
  });

  it('ne rend rien sous 25 %', () => {
    expect(newDepths(0.2, new Set())).toEqual([]);
  });
});
