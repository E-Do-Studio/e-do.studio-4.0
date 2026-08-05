import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useT } from '../i18n/use-t';
import { STEP, type StepDef } from './booking-steps';
import type { SubmitMode } from './use-booking-submit';

// Géométrie des actions de bas de tunnel — pleine hauteur de bande, empilées
// sous `md`. Tout le reste (mono capitales, anneau de focus, curseur, état
// désactivé) vient des variantes de `Button` : `variant="cell"` pour les
// actions sur fond de page, la variante par défaut pour l'action principale.
const FOOTER_ACTION =
  'h-auto min-h-11 flex-1 whitespace-normal border-t border-border px-5 py-3 md:min-h-0 md:border-t-0 md:border-l md:py-0';
const FOOTER_BACK =
  'h-auto min-h-11 justify-start whitespace-normal px-5 py-3 md:min-h-0 md:flex-1 md:py-0';

interface BookingFooterNavProps {
  step: number;
  steps: StepDef[];
  /** Un créneau par date à choisir ; plus d'un ⇒ l'étape date se sous-divise. */
  dateSlots: { id: string; hasDate: boolean }[];
  dateIdx: number;
  setDateIdx: (idx: number) => void;
  canNext: boolean;
  contactValid: boolean;
  saving: boolean;
  isCyclo: boolean;
  goToStep: (n: number) => void;
  onContactNext: (nextN: number | null) => void;
  onSubmit: (mode: SubmitMode) => void;
}

/**
 * Barre d'actions du tunnel. Elle ne s'affiche qu'au-delà du configurateur, qui
 * porte sa propre action.
 *
 * L'étape date se sous-divise quand le projet compte plusieurs créneaux : le
 * « suivant » avance alors d'un créneau à l'autre avant de soumettre.
 */
const BookingFooterNav = ({
  step,
  steps,
  dateSlots,
  dateIdx,
  setDateIdx,
  canNext,
  contactValid,
  saving,
  isCyclo,
  goToStep,
  onContactNext,
  onSubmit,
}: BookingFooterNavProps) => {
  const t = useT();
  const idx = steps.findIndex((s) => s.n === step);
  const prevN = idx > 0 ? steps[idx - 1].n : null;
  const nextN = idx > -1 && idx < steps.length - 1 ? steps[idx + 1].n : null;

  const isMultiDate = step === STEP.DATE && dateSlots.length > 1;
  const subIdx = Math.max(0, Math.min(dateIdx, dateSlots.length - 1));
  const onFirstSub = !isMultiDate || subIdx <= 0;
  const onLastSub = !isMultiDate || subIdx >= dateSlots.length - 1;
  const currentDateValid = !isMultiDate || !!dateSlots[subIdx]?.hasDate;

  const goBack = () => {
    if (isMultiDate && !onFirstSub) return setDateIdx(subIdx - 1);
    if (prevN !== null) goToStep(prevN);
  };

  // Une seule description de l'action principale : les deux variantes du
  // tunnel — cyclorama (demande) et plateau (réservation) — ne diffèrent que
  // par son libellé et son mode d'envoi.
  const primary = (() => {
    if (step < STEP.CONTACT) {
      return {
        label: t('booking.continue'),
        onClick: () => nextN !== null && goToStep(nextN),
        disabled: !canNext,
      };
    }
    if (step === STEP.CONTACT) {
      return {
        label: isCyclo ? t('booking.continue') : t('booking.pickADate'),
        onClick: () => onContactNext(nextN),
        disabled: false,
      };
    }
    if (isMultiDate && !onLastSub) {
      return {
        label: t('booking.validateNextStage'),
        onClick: () => setDateIdx(subIdx + 1),
        disabled: !currentDateValid,
      };
    }
    return isCyclo
      ? {
          label: saving ? t('booking.sending') : t('booking.submitRequest'),
          onClick: () => onSubmit('request'),
          disabled: !canNext || saving,
        }
      : {
          label: saving ? t('booking.booking') : t('common.bookNow'),
          onClick: () => onSubmit('booking'),
          disabled: !canNext || saving,
        };
  })();

  return (
    <div className="border-t border-border flex flex-col md:flex-row md:items-stretch shrink-0 bg-background md:min-h-11">
      <Button
        type="button"
        variant="cell"
        onClick={goBack}
        disabled={idx <= 0 && onFirstSub}
        className={FOOTER_BACK}
      >
        ← {t('booking.back')}
      </Button>
      <div className="flex items-stretch md:flex-none md:w-1/2">
        {/* Le cyclorama se facture sur devis : pas de demande de devis séparée. */}
        {step >= STEP.CONTACT && !isCyclo && (
          // Volontairement cliquable même quand le contact est incomplet :
          // la soumission renvoie alors sur l'étape contact pour montrer ce
          // qui manque. Sans ça, le bouton semblerait ne rien faire.
          // L'atténuation dit qu'il reste quelque chose à remplir.
          <Button
            type="button"
            variant="cell"
            onClick={() => onSubmit('quote')}
            disabled={saving}
            title={t('booking.noDateHeld')}
            className={cn(FOOTER_ACTION, !contactValid && 'opacity-30')}
          >
            {saving ? t('booking.sending') : t('booking.receiveMyQuote')}{' '}
            <ArrowRight />
          </Button>
        )}
        <Button
          type="button"
          onClick={primary.onClick}
          disabled={primary.disabled}
          className={FOOTER_ACTION}
        >
          {primary.label} <ArrowRight />
        </Button>
      </div>
    </div>
  );
};

export { BookingFooterNav };
export type { BookingFooterNavProps };
