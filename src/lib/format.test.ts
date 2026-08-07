import { describe, expect, it } from 'vitest';
import { fmtEUR, hourLabel, ordinal } from './format';

describe('ordinal', () => {
  it('formate les neuf premiers index sur deux chiffres', () => {
    expect(ordinal(0)).toBe('01');
    expect(ordinal(8)).toBe('09');
  });

  // Le cas qui motive le helper : `legal-page.tsx` écrivait `0${i + 1}` et
  // rendait « 010 » ici. Le sommaire juridique n'a que quatre entrées, le bug
  // attendait le cinquième document ajouté au CMS.
  it('ne préfixe plus au-delà du dixième', () => {
    expect(ordinal(9)).toBe('10');
    expect(ordinal(41)).toBe('42');
  });
});

describe('hourLabel', () => {
  it('complète les heures du matin', () => {
    expect(hourLabel(0)).toBe('00:00');
    expect(hourLabel(9)).toBe('09:00');
  });

  it('laisse les heures à deux chiffres intactes', () => {
    expect(hourLabel(14)).toBe('14:00');
    expect(hourLabel(23)).toBe('23:00');
  });
});

// `fmtEUR` était jusqu'ici non testée alors que `booking-engine.ts` en porte une
// copie qui doit rester synchronisée à la main. Ces cas fixent le contrat avant
// toute tentative de fusion.
describe('fmtEUR', () => {
  it('tronque au lieu d’arrondir — un prix affiché ne dépasse jamais le prix facturé', () => {
    expect(fmtEUR(7.909, 'fr')).toBe('7,9');
    expect(fmtEUR(7.999, 'fr')).toBe('7,99');
  });

  it('n’affiche pas de décimale inutile', () => {
    expect(fmtEUR(590, 'fr')).toBe('590');
  });

  // Le séparateur de milliers rendu par Intl en français est U+202F, l'espace
  // fine insécable — pas l'espace ordinaire qu'on tape. L'attente ci-dessous
  // contient le vrai caractère : si ce test échoue un jour sur deux chaînes qui
  // paraissent identiques à l'œil, c'est celui-là qu'il faut aller regarder.
  it('suit la locale pour le séparateur décimal et le groupement', () => {
    expect(fmtEUR(1490.5, 'fr')).toBe('1 490,5');
    expect(fmtEUR(1490.5, 'en')).toBe('1,490.5');
  });

  it('retombe sur « 0 » plutôt que « NaN » sur une entrée non numérique', () => {
    expect(fmtEUR(null, 'fr')).toBe('0');
    expect(fmtEUR(undefined, 'fr')).toBe('0');
    expect(fmtEUR('abc', 'fr')).toBe('0');
  });
});
