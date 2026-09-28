import { describe, expect, it } from 'vitest';
import { questionForAnalytics } from './chat-question';

describe('questionForAnalytics', () => {
  it('garde une question courte telle quelle', () => {
    expect(questionForAnalytics('Quel plateau pour des bijoux ?')).toBe(
      'Quel plateau pour des bijoux ?',
    );
  });

  it('coupe à 80 caractères', () => {
    expect(questionForAnalytics('a'.repeat(200))).toHaveLength(80);
  });

  it('masque un e-mail', () => {
    expect(
      questionForAnalytics('Rappelez-moi à camille.durand@marque.fr svp'),
    ).toBe('Rappelez-moi à [email] svp');
  });

  it('masque un numéro de téléphone, quelle que soit sa ponctuation', () => {
    for (const phone of [
      '06 12 34 56 78',
      '+33 6 12 34 56 78',
      '06.12.34.56.78',
    ]) {
      expect(questionForAnalytics(`Mon numéro ${phone}`)).toBe(
        'Mon numéro [numéro]',
      );
    }
  });

  it('masque un SIREN', () => {
    expect(questionForAnalytics('SIREN 891710857')).toBe('SIREN [numéro]');
  });

  // Couper d'abord laisserait un e-mail tronqué que le motif ne voit plus.
  it('masque avant de couper', () => {
    const q = `${'x'.repeat(70)} camille@marque.fr`;
    expect(questionForAnalytics(q)).not.toContain('camille');
  });

  it('laisse passer une date ou une quantité', () => {
    expect(questionForAnalytics('Dispo le 12/10 pour 150 produits ?')).toBe(
      'Dispo le 12/10 pour 150 produits ?',
    );
  });
});
