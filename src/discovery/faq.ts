import type { TFunction } from 'i18next';
import type { FaqEntry } from '../lib/structured-data';

// Ordre d'affichage. La cellule et le JSON-LD lisent tous deux cette liste :
// Google exige que chaque Q/R balisée soit visible, et une seule source
// empêche le balisage de dériver de la page.
const FAQ_IDS = [
  'photographer',
  'formats',
  'turnaround',
  'visit',
  'delivery',
] as const;

export function discoveryFaq(t: TFunction): FaqEntry[] {
  return FAQ_IDS.map((id) => ({
    question: t(`discoveryPage.faq.${id}.question`),
    answer: t(`discoveryPage.faq.${id}.answer`),
  }));
}
