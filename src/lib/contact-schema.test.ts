import { describe, expect, it } from 'vitest';
import { CONTACT_MESSAGE_MIN, validateContactForm } from './contact-schema';

const valid = {
  nom: 'Camille Martin',
  email: 'camille@votremarque.fr',
  telephone: '06 12 34 56 78',
  societe: 'Votre Marque',
  message: 'Un shooting packshot pour 40 références en octobre.',
};

describe('validateContactForm', () => {
  it('accepte un formulaire complet', () => {
    expect(validateContactForm(valid, 'fr')).toEqual({});
  });

  // Régression #396 : ces champs partaient vides, et `send-email` répondait
  // `invalid_payload` sans que le visiteur sache lequel corriger.
  it.each(['nom', 'telephone', 'societe'] as const)(
    'refuse %s vide, espaces compris',
    (field) => {
      const errors = validateContactForm({ ...valid, [field]: '   ' }, 'fr');
      expect(Object.keys(errors)).toEqual([field]);
    },
  );

  it('refuse un e-mail sans domaine', () => {
    expect(
      validateContactForm({ ...valid, email: 'camille@' }, 'fr').email,
    ).toBeDefined();
  });

  // La borne de `contactSchema` côté fonction Edge : elle doit rester la même.
  it('refuse un message de moins de dix caractères', () => {
    expect(CONTACT_MESSAGE_MIN).toBe(10);
    const errors = validateContactForm({ ...valid, message: 'Bonjour' }, 'fr');
    expect(errors.message).toContain('10');
  });

  it('traduit les messages', () => {
    const fr = validateContactForm({ ...valid, nom: '' }, 'fr').nom;
    const en = validateContactForm({ ...valid, nom: '' }, 'en').nom;
    expect(fr).not.toBe(en);
  });
});
