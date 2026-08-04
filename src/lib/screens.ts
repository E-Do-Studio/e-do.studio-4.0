import type { Bilingual, Lang } from '../types';

// Source de vérité des URLs du site.
//
// Vit hors de router.tsx pour que les pages puissent l'importer sans dépendre du
// routeur : avec l'arbre de routes généré (src/routes/), un import page → router
// créerait un cycle, le routeur important déjà les pages.
//
// Toute modification ici change une URL publique — vérifier le sitemap et les
// redirections du Caddyfile avant d'y toucher.

/**
 * Chemins dont le slug diffère selon la langue, sans le préfixe de langue.
 * Tout chemin absent de cette table est identique dans les deux langues.
 *
 * Une table chemin par chemin, et non segment par segment : `plateau` est à la
 * fois un segment partagé (`/xx/plateau/live`) et un segment traduit
 * (`/fr/reserver/configurateur/plateau` ↔ `…/configurator/stage`). Une table de
 * segments réécrirait `/en/plateau/live` en `/en/stage/live`.
 */
const LOCALIZED = {
  gallery: { fr: '/galerie', en: '/gallery' },
  bookPicker: { fr: '/reserver', en: '/book' },
  configurator: { fr: '/reserver/configurateur', en: '/book/configurator' },
  configStage: {
    fr: '/reserver/configurateur/plateau',
    en: '/book/configurator/stage',
  },
  configTeam: {
    fr: '/reserver/configurateur/equipe',
    en: '/book/configurator/team',
  },
  configDetails: {
    fr: '/reserver/configurateur/coordonnees',
    en: '/book/configurator/details',
  },
  configDates: {
    fr: '/reserver/configurateur/dates',
    en: '/book/configurator/dates',
  },
  bookManual: { fr: '/reserver/manuel', en: '/book/manual' },
  bookConfirmation: { fr: '/reserver/confirmation', en: '/book/confirmation' },
  bookContact: { fr: '/reserver/contact', en: '/book/contact' },
} satisfies Record<string, Bilingual<string>>;

type LocalizedKey = keyof typeof LOCALIZED;

/** Chemin complet, préfixe de langue compris. */
const at = (key: LocalizedKey, lang: Lang) => `/${lang}${LOCALIZED[key][lang]}`;

// Le plus long d'abord : `/reserver/configurateur/plateau` doit l'emporter sur
// `/reserver` lors de la recherche de préfixe.
const BY_LENGTH = Object.values(LOCALIZED).sort(
  (a, b) => b.fr.length - a.fr.length,
);

/**
 * Traduit un chemin complet d'une langue vers l'autre, slug compris.
 *
 * `/fr/reserver/configurateur/plateau` → `/en/book/configurator/stage`, là où un
 * simple échange de préfixe produisait `/en/reserver/configurateur/plateau` :
 * une URL servie dans la mauvaise langue, et un doublon de contenu pour le SEO.
 */
export function translatePathname(pathname: string, to: Lang): string {
  const from: Lang = pathname.startsWith('/en') ? 'en' : 'fr';
  const rest = pathname.replace(/^\/(fr|en)/, '');
  if (from === to) return `/${to}${rest}`;
  const hit = BY_LENGTH.find(
    (p) => rest === p[from] || rest.startsWith(`${p[from]}/`),
  );
  const translated = hit ? hit[to] + rest.slice(hit[from].length) : rest;
  return `/${to}${translated}`;
}

export const SCREEN_TO_PATH: Record<string, (lang: Lang) => string> = {
  home: (l) => `/${l}`,
  cyclorama: (l) => `/${l}/cyclorama`,
  'plateau-horizontal': (l) => `/${l}/plateau/horizontal`,
  'plateau-vertical': (l) => `/${l}/plateau/vertical`,
  'plateau-eclipse': (l) => `/${l}/plateau/eclipse`,
  'plateau-live': (l) => `/${l}/plateau/live`,
  discovery: (l) => `/${l}/discovery`,
  postprod: (l) => `/${l}/post-production`,
  gallery: (l) => at('gallery', l),
  contact: (l) => `/${l}/contact`,
  book: (l) => at('bookPicker', l),
  legal: (l) => `/${l}/legal`,
};

/** Chemins du tunnel de réservation, dérivés de la même table. */
export const BOOK_PATHS = {
  picker: (l: Lang) => at('bookPicker', l),
  configurator: (l: Lang) => at('configurator', l),
  stage: (l: Lang) => at('configStage', l),
  team: (l: Lang) => at('configTeam', l),
  details: (l: Lang) => at('configDetails', l),
  dates: (l: Lang) => at('configDates', l),
  manual: (l: Lang) => at('bookManual', l),
  confirmation: (l: Lang) => at('bookConfirmation', l),
} as const;
