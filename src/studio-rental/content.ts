import type { TFunction } from 'i18next';
import { BOOK_PLATEAUX, type BookRates } from '../lib/booking-engine';
import { fmtEUR } from '../lib/format';
import type { FaqEntry, StudioRentalOffer } from '../lib/structured-data';
import type { Lang } from '../types';

// Les deux seuls tarifs que la page cite (#422, règle #428) : ceux que le
// tunnel facture, lus dans le moteur et non recopiés dans le texte. Si le
// barème change, la page, la FAQ et le JSON-LD suivent ensemble.
const rateOf = (k: string, unit: keyof BookRates): number => {
  const value = BOOK_PLATEAUX.find((p) => p.k === k)?.rates[unit];
  if (value == null) throw new Error(`Tarif absent du moteur : ${k} ${unit}`);
  return value;
};

const CYCLO_5H = rateOf('cyclorama', 'halfH');
const LIVE_HOUR = rateOf('live', 'hour');

export function studioRentalRates(t: TFunction): StudioRentalOffer[] {
  return [
    { name: t('studioRental.rates.cyclorama'), price: CYCLO_5H },
    { name: t('studioRental.rates.live'), price: LIVE_HOUR },
  ];
}

/** Les montants formatés, pour l'interpolation dans le texte. */
export const studioRentalPrices = (lang: Lang) => ({
  cyclo: `${fmtEUR(CYCLO_5H, lang)} €`,
  live: `${fmtEUR(LIVE_HOUR, lang)} €`,
});

// Ordre d'affichage. La cellule et le JSON-LD FAQPage lisent tous deux cette
// liste : Google exige que chaque Q/R balisée soit visible.
const FAQ_IDS = ['where', 'price', 'photographer', 'visit', 'book'] as const;

export function studioRentalFaq(t: TFunction, lang: Lang): FaqEntry[] {
  const prices = studioRentalPrices(lang);
  return FAQ_IDS.map((id) => ({
    question: t(`studioRental.faq.${id}.question`),
    answer: t(`studioRental.faq.${id}.answer`, prices),
  }));
}
