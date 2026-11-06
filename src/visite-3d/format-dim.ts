import type { Lang } from '../types';
import { bcp47 } from '../lib/format';
import type { ZoneDim } from './zones';

// Mise en forme d'une caractéristique de zone, hors de React : la fiche desktop
// et la feuille mobile l'emploient toutes les deux.

const number = (lang: Lang, digits: number) =>
  new Intl.NumberFormat(bcp47(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** La valeur seule : « 12,42 × 19,13 m », « 240 m² », « 5,60 m ». */
export const formatDim = (dim: ZoneDim, lang: Lang): string => {
  if (dim.squareMeters != null)
    return `${number(lang, 0).format(dim.squareMeters)} m²`;
  const m = number(lang, 2);
  if (Array.isArray(dim.meters))
    return `${m.format(dim.meters[0])} × ${m.format(dim.meters[1])} m`;
  if (typeof dim.meters === 'number') return `${m.format(dim.meters)} m`;
  throw new Error(`Caractéristique sans valeur : ${dim.key}`);
};
