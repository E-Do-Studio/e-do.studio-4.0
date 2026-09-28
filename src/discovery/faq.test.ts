import { describe, expect, it } from 'vitest';
import { getT } from '../i18n';
import { buildFaqSchema } from '../lib/structured-data';
import { discoveryFaq } from './faq';

describe('discoveryFaq', () => {
  // `t` rend la clé brute quand elle n'existe pas : une Q/R dont le texte est
  // son propre chemin partirait telle quelle dans la page et dans le JSON-LD.
  it.each(['fr', 'en'] as const)('résout les cinq Q/R en %s', (lang) => {
    const entries = discoveryFaq(getT(lang));
    expect(entries).toHaveLength(5);
    for (const e of entries) {
      expect(e.question).not.toContain('discoveryPage.');
      expect(e.answer).not.toContain('discoveryPage.');
    }
  });

  it('n’enchaîne aucune valeur au point médian', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const e of discoveryFaq(getT(lang))) {
        expect(`${e.question} ${e.answer}`).not.toContain('·');
      }
    }
  });

  it('alimente le FAQPage avec les mêmes textes que la page', () => {
    const entries = discoveryFaq(getT('fr'));
    const s = buildFaqSchema(entries, 'fr', '/discovery');
    const questions = s?.mainEntity as { name: string }[] | undefined;
    expect(questions?.map((q) => q.name)).toEqual(
      entries.map((e) => e.question),
    );
  });
});
