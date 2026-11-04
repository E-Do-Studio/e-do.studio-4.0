import type { TFunction } from 'i18next';
import { BOOK_PLATEAUX } from '../lib/booking-engine';
import { fmtEUR } from '../lib/format';
import type { FaqEntry } from '../lib/structured-data';
import type { Bilingual, Lang } from '../types';

// Les trois plateaux packshot et leurs tarifs, lus dans le moteur de
// réservation : ce sont ceux que le tunnel facture (#428). Recopiés dans le
// texte, ils dériveraient au premier changement de grille.
export const PACKSHOT_STAGES = ['horizontal', 'vertical', 'eclipse'] as const;
export type PackshotStage = (typeof PACKSHOT_STAGES)[number];

type Unit = 'hour' | 'half' | 'full';

interface StageRates {
  label: Bilingual<string>;
  hour: number;
  half: number;
  full: number;
}

const stageRates = (k: PackshotStage): StageRates => {
  const plateau = BOOK_PLATEAUX.find((p) => p.k === k);
  if (!plateau) throw new Error(`Plateau ${k} absent de BOOK_PLATEAUX`);
  const rate = (unit: Unit): number => {
    const value = plateau.rates[unit];
    if (value == null) throw new Error(`Tarif ${k} manquant : ${unit}`);
    return value;
  };
  return {
    label: { fr: plateau.fr, en: plateau.en },
    hour: rate('hour'),
    half: rate('half'),
    full: rate('full'),
  };
};

export const PACKSHOT_RATES: Record<PackshotStage, StageRates> = {
  horizontal: stageRates('horizontal'),
  vertical: stageRates('vertical'),
  eclipse: stageRates('eclipse'),
};

/** Montants formatés pour l'interpolation i18n, sans symbole. */
export const packshotRates = (lang: Lang) => {
  const f = (n: number) => fmtEUR(n, lang);
  const { horizontal: h, vertical: v, eclipse: e } = PACKSHOT_RATES;
  return {
    hHour: f(h.hour),
    hHalf: f(h.half),
    hFull: f(h.full),
    vHour: f(v.hour),
    vHalf: f(v.half),
    vFull: f(v.full),
    eHour: f(e.hour),
    eHalf: f(e.half),
    eFull: f(e.full),
  };
};

// Ordre d'affichage, partagé par la page et le JSON-LD FAQPage : Google exige
// que chaque Q/R balisée soit visible. Les Q/R déjà publiées ailleurs sont
// reprises par leur clé, jamais recopiées.
const FAQ_KEYS = [
  'packshotPage.faq.price',
  'packshotPage.faq.which',
  'packshotPage.faq.cutout',
  'discoveryPage.faq.photographer',
  'discoveryPage.faq.formats',
  'discoveryPage.faq.quote',
  'onModelPage.faq.location',
  'discoveryPage.faq.visit',
] as const;

export function packshotFaq(t: TFunction, lang: Lang): FaqEntry[] {
  const rates = packshotRates(lang);
  return FAQ_KEYS.map((key) => ({
    question: t(`${key}.question`),
    answer: t(`${key}.answer`, rates),
  }));
}
