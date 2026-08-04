import { describe, expect, it } from 'vitest';
import { validateContact, validateIdentity } from './booking-schema';

const complet = {
  marque: 'ACME',
  societe: 'ACME SAS',
  siren: '732829320',
  adresseFacturation: '1 rue de Test, 75001 Paris',
  nom: 'Dupont',
  prenom: 'Marie',
  email: 'marie@example.com',
  tel: '01 44 04 11 49',
  typesArticles: ['chaussures'],
  quantiteArticles: '10',
  vuesParArticle: '3',
  autresInfos: '',
  cgvAccepted: true as const,
};

// Ne renvoie que la carte d'erreurs, `{}` quand tout passe — ça rend les
// assertions lisibles.
const errs = (
  over: Record<string, unknown> = {},
  requireProductFields = true,
) => {
  const r = validateContact({ ...complet, ...over }, 'fr', {
    requireProductFields,
  });
  return r.success ? {} : r.errors;
};

describe('validateContact', () => {
  it('accepte un formulaire complet', () => {
    expect(errs()).toEqual({});
  });

  it.each(['societe', 'adresseFacturation', 'nom', 'prenom'])(
    'exige %s',
    (champ) => {
      expect(errs({ [champ]: '' })).toHaveProperty(champ);
    },
  );

  it('exige une adresse e-mail bien formée', () => {
    expect(errs({ email: 'pas-un-email' })).toHaveProperty('email');
    expect(errs({ email: '' })).toHaveProperty('email');
  });

  it('exige un téléphone plausible', () => {
    expect(errs({ tel: '123' })).toHaveProperty('tel');
    expect(errs({ tel: 'abcdefgh' })).toHaveProperty('tel');
  });

  it('exige l’acceptation des CGV', () => {
    expect(errs({ cgvAccepted: false })).toHaveProperty('cgvAccepted');
  });

  it('n’exige les champs produit que si demandé', () => {
    const sansProduit = {
      typesArticles: [],
      quantiteArticles: '',
      vuesParArticle: '',
    };
    expect(errs(sansProduit, true)).toHaveProperty('typesArticles');
    expect(errs(sansProduit, false)).toEqual({});
  });

  // Le tunnel ne vérifie que la FORME du SIREN (9 chiffres), alors que le chat
  // applique en plus la clé de Luhn via isValidSiren. Ce test fige l'écart
  // constaté — il échouera si les deux chemins sont un jour alignés.
  it('accepte un SIREN de 9 chiffres même sans clé de Luhn valide', () => {
    expect(errs({ siren: '123456789' })).toEqual({});
    expect(errs({ siren: '12345678' })).toHaveProperty('siren');
  });
});

// Le formulaire de l'assistant portait sa propre regex email et ses propres
// contrôles de présence. Ces cas verrouillent le partage des règles avec le
// tunnel de réservation.
describe('validateIdentity', () => {
  const identity = (over: Record<string, unknown> = {}) => ({
    prenom: 'Ada',
    nom: 'Lovelace',
    email: 'ada@example.com',
    tel: '+33 6 12 34 56 78',
    societe: 'Analytical Engines',
    adresseFacturation: '1 rue de la Machine, Paris',
    ...over,
  });

  it('accepte une identité complète sans SIREN', () => {
    expect(validateIdentity(identity(), 'fr').success).toBe(true);
  });

  it('applique la même règle email que le tunnel', () => {
    const r = validateIdentity(identity({ email: 'ada@example' }), 'fr');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors.email).toBeTruthy();
  });

  it('exige les champs de contact', () => {
    for (const k of [
      'prenom',
      'nom',
      'societe',
      'adresseFacturation',
    ] as const) {
      const r = validateIdentity(identity({ [k]: '' }), 'fr');
      expect(r.success).toBe(false);
      if (!r.success) expect(r.errors[k]).toBeTruthy();
    }
  });

  it('rejette un téléphone trop court', () => {
    expect(validateIdentity(identity({ tel: '12' }), 'fr').success).toBe(false);
  });

  it('laisse passer un SIREN absent mais vérifie la clé de Luhn sinon', () => {
    expect(validateIdentity(identity({ siren: '' }), 'fr').success).toBe(true);
    expect(validateIdentity(identity({ siren: '552100554' }), 'fr').success).toBe(
      true,
    );
    expect(validateIdentity(identity({ siren: '123456789' }), 'fr').success).toBe(
      false,
    );
  });
});
