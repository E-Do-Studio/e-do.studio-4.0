// Formatage dépendant de la locale. Volontairement hors de i18next : les
// nombres et les dates ne transitent pas par des chaînes traduites ici (le code
// écrit `{fmtEUR(total)} €` en JSX), et `booking-engine.ts` — importé par les
// Edge Functions Deno — ne peut importer ni React ni i18next.

import type { Lang } from '../types';

/** Étiquette BCP-47. Pas une traduction : Intl, hreflang, JSON-LD `inLanguage`. */
export const bcp47 = (lang: Lang): string =>
  lang === 'fr' ? 'fr-FR' : 'en-US';

/** Étiquette Open Graph, qui utilise un tiret bas là où BCP-47 met un tiret. */
export const ogLocale = (lang: Lang): string =>
  lang === 'fr' ? 'fr_FR' : 'en_US';

// Tables littérales plutôt qu'`Intl.DateTimeFormat` : l'UI affiche « Janvier »
// avec une capitale, là où Intl rend « janvier ». Recapitaliser coûterait plus
// que de garder les deux tables.
export const MONTHS: Record<Lang, string[]> = {
  fr: [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

/** Initiales des jours, lundi en premier (la semaine commence le lundi). */
export const DAYS: Record<Lang, string[]> = {
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

// Montants sans symbole : les sites d'appel concatènent « € » eux-mêmes.
// Tronque plutôt qu'il n'arrondit — un prix affiché ne doit jamais dépasser le
// prix facturé. `booking-engine.ts` porte une copie de cette fonction, qu'il ne
// peut pas importer d'ici : elle doit rester synchronisée à la main.
export const fmtEUR = (n: unknown): string => {
  if (n == null || Number.isNaN(Number(n))) return '0';
  const num = Number(n);
  const truncated = Math.trunc(num * 100) / 100;
  const hasDecimals = truncated !== Math.trunc(truncated);
  return truncated.toLocaleString('fr-FR', {
    minimumFractionDigits: hasDecimals
      ? truncated * 10 !== Math.trunc(truncated * 10)
        ? 2
        : 1
      : 0,
    maximumFractionDigits: 2,
  });
};
