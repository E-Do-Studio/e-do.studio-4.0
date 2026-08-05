import { describe, expect, it } from 'vitest';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';
import type { Lang } from '../types';
import { activeNavId, activeNavIn, MAIN_NAV, MENU_NAV } from './nav';
import { BOOK_PATHS, SCREEN_TO_PATH } from './screens';

const LANGS: Lang[] = ['fr', 'en'];

/** Les deux langues d'un même chemin, pour les cas symétriques. */
const both = (path: (l: Lang) => string) => LANGS.map(path);

describe('activeNavId', () => {
  it.each(['/fr', '/en', '/fr/', '/en/'])(
    "n'allume rien sur l'accueil (%s)",
    (path) => {
      expect(activeNavId(path)).toBeNull();
    },
  );

  it.each([
    ...both(SCREEN_TO_PATH['plateau-live']),
    ...both(SCREEN_TO_PATH['plateau-horizontal']),
    ...both(SCREEN_TO_PATH['plateau-vertical']),
    ...both(SCREEN_TO_PATH['plateau-eclipse']),
    ...both(SCREEN_TO_PATH.cyclorama),
  ])('range les cinq écrans plateau sous stages (%s)', (path) => {
    expect(activeNavId(path)).toBe('stages');
  });

  // Les quatre URL, pas les deux : les routes galerie/gallery répondent dans les
  // deux langues. Un matcher bâti sur SCREEN_TO_PATH en raterait la moitié.
  it.each(['/fr/galerie', '/fr/gallery', '/en/galerie', '/en/gallery'])(
    'reconnaît la galerie sous ses quatre URL (%s)',
    (path) => {
      expect(activeNavId(path)).toBe('gallery');
    },
  );

  it.each(both(SCREEN_TO_PATH.postprod))('reconnaît la post-prod (%s)', (p) => {
    expect(activeNavId(p)).toBe('postprod');
  });

  it.each(both(SCREEN_TO_PATH.contact))('reconnaît le contact (%s)', (p) => {
    expect(activeNavId(p)).toBe('contact');
  });

  it.each(Object.values(BOOK_PATHS).flatMap(both))(
    'range tout le tunnel de réservation sous book (%s)',
    (path) => {
      expect(activeNavId(path)).toBe('book');
    },
  );

  // Absent de BOOK_PATHS, mais routes/$lang/reserver/contact.tsx existe. C'est
  // la raison pour laquelle le tunnel se reconnaît par préfixe.
  it.each(['/fr/reserver/contact', '/en/book/contact'])(
    'couvre la route de contact du tunnel, absente de BOOK_PATHS (%s)',
    (path) => {
      expect(activeNavId(path)).toBe('book');
    },
  );

  it.each([
    '/fr/reserver/configurateur/plateau',
    '/en/book/configurator/stage',
  ])("n'allume pas stages depuis l'étape plateau du tunnel (%s)", (path) => {
    expect(activeNavId(path)).toBe('book');
  });

  it.each(['/fr/legal', '/en/legal', '/fr/discovery', '/fr/discovery/un-slug'])(
    'laisse la bande éteinte hors de ses destinations (%s)',
    (path) => {
      expect(activeNavId(path)).toBeNull();
    },
  );

  // Garde-fou contre un `startsWith` nu : sans comparaison par segment, ces
  // chemins allumeraient stages et contact.
  it.each(['/fr/plateaux-loues', '/fr/contacts', '/fr/post-production-2'])(
    'ne déborde pas sur un chemin qui commence pareil (%s)',
    (path) => {
      expect(activeNavId(path)).toBeNull();
    },
  );

  it('ignore la chaîne de requête, absente de location.pathname', () => {
    expect(activeNavId('/fr/post-production')).toBe('postprod');
  });

  // Le test anti-dérive : ajouter une destination sans son `match` le fait
  // tomber, quand bien même la cellule s'afficherait correctement.
  it.each(
    MAIN_NAV.flatMap((item) =>
      LANGS.map((lang) => [item.id, SCREEN_TO_PATH[item.screen](lang)]),
    ),
  )('%s est allumé par son propre écran (%s)', (id, path) => {
    expect(activeNavId(path)).toBe(id);
  });
});

describe('activeNavIn(MENU_NAV)', () => {
  it.each([
    ['/fr', 'home'],
    ['/en', 'home'],
    ['/fr/contact', 'contact'],
    ['/fr/legal', 'legal'],
    ['/fr/discovery', 'discovery'],
    ['/fr/discovery/un-slug', 'discovery'],
    ['/fr/plateau/live', 'stages'],
  ] as const)('allume %s sur %s', (path, id) => {
    expect(activeNavIn(MENU_NAV, path)).toBe(id);
  });

  it("n'allume pas l'accueil ailleurs qu'à la racine", () => {
    const hors = ['/fr/contact', '/fr/legal', '/fr/galerie', '/fr/reserver'];
    for (const path of hors) {
      expect(activeNavIn(MENU_NAV, path)).not.toBe('home');
    }
  });
});

describe('libellés', () => {
  const resolve = (dict: object, key: string): unknown =>
    key
      .split('.')
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === 'object'
            ? (node as Record<string, unknown>)[part]
            : undefined,
        dict,
      );

  const clés = [...MAIN_NAV, ...MENU_NAV].flatMap((it) =>
    it.menuLabelKey ? [it.labelKey, it.menuLabelKey] : [it.labelKey],
  );

  // Complément au `satisfies` croisé de i18n/index.ts : celui-ci garantit que
  // fr.json et en.json ont les mêmes clés, pas que la table en pointe qui
  // existent. `t()` rend la clé brute quand elle manque, sans rien signaler.
  it.each([...new Set(clés)])('%s se résout dans les deux langues', (clé) => {
    expect(typeof resolve(fr, clé)).toBe('string');
    expect(typeof resolve(en, clé)).toBe('string');
  });
});
