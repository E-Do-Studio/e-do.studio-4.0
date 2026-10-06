import { describe, expect, it } from 'vitest';
import { getT } from '../i18n';
import { BOOK_PLATEAUX } from '../lib/booking-engine';
import { buildFaqSchema } from '../lib/structured-data';
import { LIVE_RATES, onModelFaq } from './content';

describe('onModelFaq', () => {
  // `t` rend la clé brute quand elle n'existe pas : elle partirait telle
  // quelle dans la page et dans le JSON-LD.
  it.each(['fr', 'en'] as const)('résout toutes les Q/R en %s', (lang) => {
    for (const e of onModelFaq(getT(lang), lang)) {
      expect(e.question).not.toMatch(/onModelPage\.|discoveryPage\./);
      expect(e.answer).not.toMatch(/onModelPage\.|discoveryPage\.|\{\{/);
    }
  });

  it('annonce les tarifs que le tunnel facture', () => {
    const live = BOOK_PLATEAUX.find((p) => p.k === 'live');
    expect(LIVE_RATES).toEqual({
      hour: live?.rates.hour,
      half: live?.rates.half,
      full: live?.rates.full,
    });
    const price = onModelFaq(getT('fr'), 'fr')[0].answer;
    expect(price).toContain(`${LIVE_RATES.hour}\u00a0€`);
  });

  it('n’enchaîne aucune valeur au point médian', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const e of onModelFaq(getT(lang), lang)) {
        expect(`${e.question} ${e.answer}`).not.toContain('·');
      }
    }
  });

  it('alimente le FAQPage avec les mêmes textes que la page', () => {
    const entries = onModelFaq(getT('en'), 'en');
    const s = buildFaqSchema(entries, 'en', '/on-model-photo-studio');
    const questions = s?.mainEntity as { name: string }[] | undefined;
    expect(questions?.map((q) => q.name)).toEqual(
      entries.map((e) => e.question),
    );
  });
});
