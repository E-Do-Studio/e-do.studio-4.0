import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import fr from '../i18n/locales/fr.json';
import {
  ACCESS_SUBS,
  ARTICLE_TYPES,
  MEDIA_OPTIONS,
  PACKSHOT_VIEWS,
  PAP_METHODS,
  PAP_PACKSHOT_SUBS,
  PRODUCTS,
  PROJECT_TYPES,
  catDesc,
  catLabel,
  findEntry,
} from './catalog';

const CATALOGS = {
  PROJECT_TYPES,
  PRODUCTS,
  PAP_METHODS,
  PAP_PACKSHOT_SUBS,
  ACCESS_SUBS,
  MEDIA_OPTIONS,
  PACKSHOT_VIEWS,
  ARTICLE_TYPES,
};

// Résout une clé pointée contre le JSON français, sans passer par i18next :
// le but est de vérifier que la clé EXISTE, pas de tester la traduction.
const resolve = (key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, fr);

const t = ((key: string) => key) as unknown as TFunction;

describe('catalogues du tunnel', () => {
  it.each(Object.entries(CATALOGS))(
    '%s : toutes les clés i18n existent',
    (_name, catalog) => {
      for (const entry of catalog) {
        expect(resolve(entry.label), `label ${entry.label}`).toBeTypeOf(
          'string',
        );
        if (entry.descKey) {
          expect(resolve(entry.descKey), `descKey ${entry.descKey}`).toBeTypeOf(
            'string',
          );
        }
      }
    },
  );

  it.each(Object.entries(CATALOGS))(
    '%s : clés `k` uniques',
    (_name, catalog) => {
      const keys = catalog.map((e) => e.k);
      expect(new Set(keys).size).toBe(keys.length);
    },
  );

  it('les entrées ne portent plus de champs fr/en', () => {
    // La régression corrigée : ces catalogues ont été migrés vers des clés i18n
    // mais six sites les lisaient encore en `entry[lang]`, rendant du vide.
    for (const catalog of Object.values(CATALOGS)) {
      for (const entry of catalog) {
        expect(Object.keys(entry).sort()).toEqual(
          entry.descKey ? ['descKey', 'k', 'label'] : ['k', 'label'],
        );
      }
    }
  });
});

describe('catLabel / catDesc / findEntry', () => {
  it('résolvent la clé de l’entrée', () => {
    const pap = findEntry(PRODUCTS, 'pap');
    expect(catLabel(t, pap)).toBe('booking.readyToWear');
    expect(catDesc(t, pap)).toBe('booking.clothingWornTextileDesc');
  });

  it('rendent une chaîne vide sur entrée absente ou sans description', () => {
    expect(catLabel(t, undefined)).toBe('');
    expect(catDesc(t, undefined)).toBe('');
    expect(catDesc(t, findEntry(MEDIA_OPTIONS, 'photo'))).toBe('');
  });

  it('findEntry tolère une sélection nulle', () => {
    expect(findEntry(PRODUCTS, null)).toBeUndefined();
    expect(findEntry(PRODUCTS, '')).toBeUndefined();
    expect(findEntry(PRODUCTS, 'inconnu')).toBeUndefined();
  });
});
