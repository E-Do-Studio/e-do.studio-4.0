import type { TFunction } from 'i18next';
import type {
  BookingSession,
  DateSelection,
  SlotState,
} from '../lib/booking-engine';
import { isSessionValid } from '../lib/booking-engine';
import type { BookMode } from './book-routes';

/**
 * Les étapes du tunnel, nommées. Les composants correspondants portaient une
 * numérotation décorrélée (`Step3Slot` rendait l'étape 2, `Step2Date` l'étape
 * 6) — les indices ne circulent plus qu'à travers ces constantes.
 *
 * `PLATEAU` et `POSTPROD` n'ont pas de route dédiée : ils n'existent que dans
 * le flux manuel (cf. `pathForStep` dans book-routes.ts).
 */
const STEP = {
  CONFIG: 0,
  PLATEAU: 1,
  DURATION: 2,
  TEAM: 3,
  POSTPROD: 4,
  CONTACT: 5,
  DATE: 6,
} as const;

interface StepDef {
  n: number;
  label: string;
}

function stepsFor(mode: BookMode, t: TFunction): StepDef[] {
  if (mode === 'config') {
    return [
      { n: STEP.CONFIG, label: t('bookPicker.configuratorLabel') },
      { n: STEP.DURATION, label: t('booking.stepSlot') },
      { n: STEP.TEAM, label: t('booking.stepTeam') },
      { n: STEP.CONTACT, label: t('booking.stepContact') },
      { n: STEP.DATE, label: t('booking.date') },
    ];
  }
  return [
    { n: STEP.PLATEAU, label: t('booking.stage') },
    { n: STEP.DURATION, label: t('booking.stepSlot') },
    { n: STEP.TEAM, label: t('booking.stepTeam') },
    { n: STEP.POSTPROD, label: t('common.postProd') },
    { n: STEP.CONTACT, label: t('booking.stepContact') },
    { n: STEP.DATE, label: t('booking.date') },
  ];
}

/**
 * Les créneaux à traiter. Avant qu'un plateau soit ajouté par `togglePlateau`,
 * `slotIds` est vide et c'est `plateau` seul qui porte la sélection — d'où le
 * repli, qui était recopié six fois dans la page.
 */
function resolveSlotList(
  slotIds: string[] | null | undefined,
  plateau: string | null,
): string[] {
  if (slotIds && slotIds.length > 0) return slotIds;
  return plateau ? [plateau] : [];
}

interface CanGoNextArgs {
  step: number;
  configSessions: BookingSession[];
  slotIds: string[];
  plateau: string | null;
  slots: Record<string, SlotState>;
  selected: DateSelection | null;
  /** Résultat de `validateContact` — passé calculé pour garder la fonction pure. */
  contactValid: boolean;
}

function canGoNext({
  step,
  configSessions,
  slotIds,
  plateau,
  slots,
  selected,
  contactValid,
}: CanGoNextArgs): boolean {
  if (step === STEP.CONFIG) {
    return configSessions.length > 0 && configSessions.every(isSessionValid);
  }
  if (step === STEP.PLATEAU) return slotIds.length > 0 || !!plateau;
  if (step === STEP.CONTACT) return contactValid;
  if (step === STEP.DATE) {
    const list = resolveSlotList(slotIds, plateau);
    if (list.length <= 1) return !!selected;
    return list.every(
      (id) => !!slots[id]?.date && slots[id]?.arrivalHour != null,
    );
  }
  return true;
}

interface StepProgress extends StepDef {
  index: number;
  active: boolean;
  /** Étape antérieure à la courante, donc franchie. */
  done: boolean;
  /** Atteignable d'un clic depuis l'étape courante. */
  clickable: boolean;
}

/**
 * L'avancement, étape par étape. Le rail de gauche et la nav mobile en font
 * deux lectures différentes ; ils partaient chacun du même calcul recopié.
 *
 * Le configurateur reste toujours atteignable : c'est le retour en arrière du
 * tunnel, pas une étape à franchir.
 */
function stepProgress(
  steps: StepDef[],
  current: number,
  canNext: boolean,
): StepProgress[] {
  const currentIdx = steps.findIndex((s) => s.n === current);
  return steps.map((s, index) => {
    const active = s.n === current;
    const done = currentIdx > -1 && index < currentIdx;
    return {
      ...s,
      index,
      active,
      done,
      clickable:
        done ||
        active ||
        (index === currentIdx + 1 && canNext) ||
        s.n === STEP.CONFIG,
    };
  });
}

export { STEP, canGoNext, resolveSlotList, stepProgress, stepsFor };
export type { CanGoNextArgs, StepDef, StepProgress };
