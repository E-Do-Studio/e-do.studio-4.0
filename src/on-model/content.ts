import type { TFunction } from 'i18next';
import { BOOK_PLATEAUX } from '../lib/booking-engine';
import { fmtEUR } from '../lib/format';
import type { FaqEntry } from '../lib/structured-data';
import type { Lang } from '../types';

// Les tarifs du plateau Live, lus dans le moteur de réservation : ce sont ceux
// que le tunnel facture. Recopiés dans le texte, ils auraient dérivé au premier
// changement de grille — et un tarif affiché qui n'est plus le bon est
// exactement ce que #428 interdit.
const live = BOOK_PLATEAUX.find((p) => p.k === 'live');
if (!live) throw new Error('Plateau Live absent de BOOK_PLATEAUX');
const rate = (unit: 'hour' | 'half' | 'full'): number => {
  const value = live.rates[unit];
  if (value == null) throw new Error(`Tarif Live manquant : ${unit}`);
  return value;
};

export const LIVE_RATES = {
  hour: rate('hour'),
  half: rate('half'),
  full: rate('full'),
};

/** Montants formatés pour l'interpolation i18n, sans symbole. */
export const liveRates = (lang: Lang) => ({
  hour: fmtEUR(LIVE_RATES.hour, lang),
  half: fmtEUR(LIVE_RATES.half, lang),
  full: fmtEUR(LIVE_RATES.full, lang),
});

// Ordre d'affichage. La page et le JSON-LD FAQPage lisent tous deux cette
// liste : Google exige que chaque Q/R balisée soit visible.
//
// Trois Q/R sont celles de Discovery, reprises par leur clé et non recopiées :
// ce sont des faits déjà publiés, et une seule rédaction ne peut pas dériver.
const FAQ_KEYS = [
  'onModelPage.faq.price',
  'onModelPage.faq.equipment',
  'discoveryPage.faq.photographer',
  'discoveryPage.faq.formats',
  'onModelPage.faq.location',
  'discoveryPage.faq.visit',
] as const;

export function onModelFaq(t: TFunction, lang: Lang): FaqEntry[] {
  const rates = liveRates(lang);
  return FAQ_KEYS.map((key) => ({
    question: t(`${key}.question`),
    answer: t(`${key}.answer`, rates),
  }));
}
