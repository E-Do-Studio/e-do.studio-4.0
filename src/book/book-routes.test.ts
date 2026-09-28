import { describe, expect, it } from 'vitest';
import { manualStepSearch } from '../lib/route-data';
import { bookPlateauParam } from './book-routes';

describe('bookPlateauParam', () => {
  // Le slug d'une page plateau est la clé du plateau dans le tunnel.
  it.each(['live', 'eclipse', 'horizontal', 'vertical', 'cyclorama'])(
    'accepte le plateau %s',
    (slug) => {
      expect(bookPlateauParam(slug)).toBe(slug);
    },
  );

  it('ignore un plateau inconnu ou une valeur qui n’est pas un texte', () => {
    expect(bookPlateauParam('studio-b')).toBeNull();
    expect(bookPlateauParam('')).toBeNull();
    expect(bookPlateauParam(undefined)).toBeNull();
    expect(bookPlateauParam(['eclipse'])).toBeNull();
  });
});

describe('manualStepSearch', () => {
  it('lit l’étape et le plateau', () => {
    expect(manualStepSearch({ step: '3', plateau: 'eclipse' })).toEqual({
      step: 3,
      plateau: 'eclipse',
    });
  });

  it('écarte un plateau inconnu sans perdre l’étape', () => {
    expect(manualStepSearch({ step: 2, plateau: 'nope' })).toEqual({
      step: 2,
    });
  });

  it('rend une query vide sans paramètre', () => {
    expect(manualStepSearch({})).toEqual({});
  });
});
