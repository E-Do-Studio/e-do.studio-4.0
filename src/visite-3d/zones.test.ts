import { describe, expect, it } from 'vitest';
import { activeNavId, pageLabelKey } from '../lib/nav';
import { SCREEN_TO_PATH } from '../lib/screens';
import { formatDim } from './format-dim';
import { parseZone, ZONES } from './zones';

describe('parseZone', () => {
  it('retient une zone connue', () => {
    expect(parseZone('live')).toBe('live');
  });

  it.each([undefined, '', 'atelier', 42])(
    'ne désigne aucune zone (%s)',
    (value) => {
      expect(parseZone(value)).toBeNull();
    },
  );

  it('ne déclare aucune zone deux fois', () => {
    const ids = ZONES.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('formatDim', () => {
  it('écrit une emprise selon la langue', () => {
    expect(formatDim({ key: 'width', meters: [12.42, 19.13] }, 'fr')).toBe(
      '12,42 × 19,13 m',
    );
    expect(formatDim({ key: 'width', meters: [12.42, 19.13] }, 'en')).toBe(
      '12.42 × 19.13 m',
    );
  });

  it('écrit une surface', () => {
    expect(formatDim({ key: 'surface', squareMeters: 240 }, 'fr')).toBe(
      '240 m²',
    );
  });
});

describe('navigation de la visite 3D', () => {
  // Les quatre URL : la page répond sous ses deux slugs dans les deux langues.
  it.each(['/fr/visite-3d', '/fr/3d-tour', '/en/visite-3d', '/en/3d-tour'])(
    'allume la visite (%s)',
    (path) => {
      expect(activeNavId(path)).toBe('tour');
      expect(pageLabelKey(path)).toBe('common.studioTour');
    },
  );

  it('résout le slug de chaque langue', () => {
    expect(SCREEN_TO_PATH['studio-tour']('fr')).toBe('/fr/visite-3d');
    expect(SCREEN_TO_PATH['studio-tour']('en')).toBe('/en/3d-tour');
  });
});
