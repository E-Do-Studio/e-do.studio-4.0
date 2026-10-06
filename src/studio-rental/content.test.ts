import { describe, expect, it } from 'vitest';
import { getT } from '../i18n';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';
import { buildStudioRentalServiceSchema } from '../lib/structured-data';
import { studioRentalFaq, studioRentalRates } from './content';

const LANGS = ['fr', 'en'] as const;

describe('studioRentalRates', () => {
  // Les deux seuls tarifs que la page a le droit de citer (#422, #428). Un
  // changement du barème doit se voir ici, pas en production.
  it('lit les tarifs du moteur de réservation', () => {
    expect(studioRentalRates(getT('fr')).map((r) => r.price)).toEqual([
      650, 185,
    ]);
  });

  it('alimente les offres du Service avec les mêmes montants', () => {
    const offers = studioRentalRates(getT('en'));
    const s = buildStudioRentalServiceSchema(
      'en',
      '/photo-studio-rental-paris',
      offers,
    );
    expect(s['@id']).toBe(
      'https://e-do.studio/en/photo-studio-rental-paris#service',
    );
    expect(s.provider).toEqual({ '@id': 'https://e-do.studio/#organization' });
    expect((s.offers as { price: string }[]).map((o) => o.price)).toEqual([
      '650',
      '185',
    ]);
  });
});

describe('studioRentalFaq', () => {
  it.each(LANGS)('résout et interpole chaque Q/R en %s', (lang) => {
    for (const e of studioRentalFaq(getT(lang), lang)) {
      expect(e.question).not.toContain('studioRental.');
      expect(e.answer).not.toContain('studioRental.');
      expect(e.answer).not.toContain('{{');
    }
  });

  it('cite les tarifs du moteur dans la réponse sur le prix', () => {
    const answers = studioRentalFaq(getT('fr'), 'fr').map((e) => e.answer);
    expect(
      answers.some((a) => a.includes('650 €') && a.includes('185 €')),
    ).toBe(true);
  });

  it.each([
    ['fr', fr],
    ['en', en],
  ] as const)('n’a aucune Q/R orpheline en %s', (lang, locale) => {
    expect(Object.keys(locale.studioRental.faq)).toHaveLength(
      studioRentalFaq(getT(lang), lang).length,
    );
  });

  it.each([
    ['fr', fr],
    ['en', en],
  ] as const)('n’enchaîne aucune valeur au point médian en %s', (_, locale) => {
    expect(JSON.stringify(locale.studioRental)).not.toContain('·');
  });
});
