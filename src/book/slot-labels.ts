import type { BookPlateau, Lang, SlotState } from '../lib/booking-engine';
import { BOOK_PLATEAUX } from '../lib/booking-engine';

interface SlotLabel {
  id: string;
  plateauKey: string;
  plateau: BookPlateau | undefined;
  /** Nom du plateau dans la langue courante, sans suffixe. */
  name: string;
  /** Rang, à partir de 1, parmi les créneaux qui partagent le même plateau. */
  occurrence: number;
  /** Vrai si plusieurs créneaux occupent ce plateau. */
  duplicated: boolean;
  /** `name`, suffixé « 01 », « 02 »… quand le plateau est pris plusieurs fois. */
  label: string;
}

/**
 * Étiquette chaque créneau, en désambiguïsant les plateaux réservés plusieurs
 * fois dans un même projet. Le comptage puis le rang étaient recopiés dans
 * quatre composants, dont deux qui repartaient d'un compteur remis à zéro à
 * chaque rendu.
 */
function buildSlotLabels(
  slotIds: string[],
  slots: Record<string, SlotState>,
  lang: Lang,
): SlotLabel[] {
  const countByKey: Record<string, number> = {};
  for (const id of slotIds) {
    const key = slots[id]?.plateauKey || id;
    countByKey[key] = (countByKey[key] || 0) + 1;
  }
  const seenByKey: Record<string, number> = {};
  return slotIds.map((id) => {
    const plateauKey = slots[id]?.plateauKey || id;
    const plateau = BOOK_PLATEAUX.find((x) => x.k === plateauKey);
    const name = plateau ? plateau[lang] : plateauKey;
    seenByKey[plateauKey] = (seenByKey[plateauKey] || 0) + 1;
    const occurrence = seenByKey[plateauKey];
    const duplicated = countByKey[plateauKey] > 1;
    return {
      id,
      plateauKey,
      plateau,
      name,
      occurrence,
      duplicated,
      label: duplicated
        ? `${name} ${String(occurrence).padStart(2, '0')}`
        : name,
    };
  });
}

export { buildSlotLabels };
export type { SlotLabel };
