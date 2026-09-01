import { describe, expect, it } from 'vitest';
import type { Lang } from '../types';
import {
  activeNavId,
  activeNavIn,
  MAIN_NAV,
  MENU_NAV,
  pageLabelKey,
} from './nav';
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

// Les crans de visibilité de la bande. Ils ne se voient qu'à l'écran, à une
// largeur précise, et une destination ajoutée sans son cran disparaîtrait sous
// 1024 sans que rien ne le signale.
describe('crans de visibilité de MAIN_NAV', () => {
  it("n'a qu'une cellule primaire, et elle n'est pas compacte", () => {
    const primaires = MAIN_NAV.filter((i) => i.primary);
    expect(primaires).toHaveLength(1);
    expect(primaires[0].compact).toBeUndefined();
  });

  // Deux compactes plus la primaire : la mesure qui fixe ce compte est dans le
  // commentaire de `compact`. Une troisième ne tiendrait pas à 768.
  it('rend trois cellules sous le palier app', () => {
    const sousApp = MAIN_NAV.filter((i) => i.primary || i.compact);
    expect(sousApp.map((i) => i.id)).toEqual(['stages', 'postprod', 'book']);
  });
});

describe('pageLabelKey', () => {
  // L'accueil ne se nomme pas : le sigle est juste à gauche de la cellule et le
  // dit déjà. C'est la seule page dans ce cas, et le tiroir garde son entrée.
  it.each([...both((l) => `/${l}`), ...both((l) => `/${l}/`)])(
    "ne nomme pas l'accueil (%s)",
    (path) => {
      expect(pageLabelKey(path)).toBeNull();
      expect(activeNavIn(MENU_NAV, path)).toBe('home');
    },
  );

  it.each([
    ...both(SCREEN_TO_PATH['plateau-live']),
    ...both(SCREEN_TO_PATH['plateau-eclipse']),
    ...both(SCREEN_TO_PATH.cyclorama),
  ])('nomme les cinq écrans plateau pareil (%s)', (path) => {
    expect(pageLabelKey(path)).toBe('common.stages');
  });

  // Les quatre URL, comme pour activeNavId : les routes galerie/gallery
  // répondent dans les deux langues.
  it.each(['/fr/galerie', '/fr/gallery', '/en/galerie', '/en/gallery'])(
    'nomme la galerie sous ses quatre URL (%s)',
    (path) => {
      expect(pageLabelKey(path)).toBe('common.gallery');
    },
  );

  // Le libellé long, et c'est tout l'objet de la dérivation : la cellule
  // affichait « Post-production » quand la bande disait « Post-prod ».
  it.each(both(SCREEN_TO_PATH.postprod))(
    'nomme la post-prod au long (%s)',
    (path) => {
      expect(pageLabelKey(path)).toBe('common.postProdLong');
    },
  );

  it.each(both(SCREEN_TO_PATH.contact))('nomme le contact (%s)', (path) => {
    expect(pageLabelKey(path)).toBe('common.contact');
  });

  it.each(['/fr/discovery', '/en/discovery', '/fr/discovery/un-slug'])(
    "nomme Discovery jusque sur l'article (%s)",
    (path) => {
      expect(pageLabelKey(path)).toBe('common.discovery');
    },
  );

  it.each(both(SCREEN_TO_PATH.legal))(
    'nomme les mentions légales (%s)',
    (p) => {
      expect(pageLabelKey(p)).toBe('common.legal');
    },
  );

  // Tout le tunnel porte le même nom : ses étapes sont des étapes, pas des
  // pages. `MENU_NAV` ne connaît pas la réservation, c'est le repli sur
  // `MAIN_NAV` qui les couvre — et par préfixe, donc `/reserver/contact` aussi.
  it.each([
    ...Object.values(BOOK_PATHS).flatMap(both),
    '/fr/reserver/contact',
    '/en/book/contact',
  ])('nomme tout le tunnel « réserver » (%s)', (path) => {
    expect(pageLabelKey(path)).toBe('common.book');
  });

  it.each(['/fr/inconnu', '/fr/plateaux-loues', '/fr/contacts'])(
    'ne nomme rien hors des chemins connus (%s)',
    (path) => {
      expect(pageLabelKey(path)).toBeNull();
    },
  );

  // Le test anti-oubli : une destination ajoutée sans entrée de nav rendrait
  // une cellule vide sur toute une page, en silence. L'accueil est écarté — sa
  // cellule est vide exprès, et le test juste au-dessus l'exige.
  it.each(
    Object.entries(SCREEN_TO_PATH)
      .filter(([screen]) => screen !== 'home')
      .flatMap(([screen, path]) =>
        LANGS.map((lang) => [screen, path(lang)] as const),
      ),
  )('%s a un nom de page (%s)', (_screen, path) => {
    expect(pageLabelKey(path)).not.toBeNull();
  });
});

// Les libellés ne sont pas testés ici : `labelKey` est typé `ParseKeys`, donc
// une clé inexistante ne compile pas, et le `satisfies` croisé de
// i18n/index.ts impose déjà que fr.json et en.json portent les mêmes.
