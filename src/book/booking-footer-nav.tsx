import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useT } from '../i18n/use-t';
import { STEP, type StepDef } from './booking-steps';
import type { SubmitMode } from './use-booking-submit';

// Les actions de bas de tunnel du mode manuel : jusqu'à TROIS dans une même
// barre, d'où une barre et non un pavé. Le configurateur, lui, n'en a qu'une et
// passe par `CtaCell`, le pavé d'action du site.
//
// Tout le reste — mono capitales, anneau de focus, curseur, état désactivé,
// cible tactile — vient des variantes de `Button` : `variant="cell"` pour les
// actions sur fond de page, la variante par défaut pour l'action principale,
// `size="touch"` pour les 44px.
//
// `border-t` sur la barre, et RIEN sous le dernier bloc de l'étape : c'est cette
// barre, et elle seule, qui possède la couture du bas. Les deux ont coexisté, au
// prétexte que l'une fermait la grille et l'autre ouvrait la barre. Ça ne tenait
// que tant que le contenu restait plus court que sa zone : depuis que le dernier
// bloc de chaque étape prend la hauteur disponible, les deux filets se touchent
// TOUJOURS, et le trait sort à 2px. Une couture, un propriétaire — celui qui
// sait qu'il y a un après.
//
// `min-h-cta` (84px) : `--spacing-cta` existe pour les bandeaux d'action en bas
// de page, ce qu'est exactement cette barre. `min-h-tap` la réduisait à la
// hauteur d'une cible tactile.
//
// Cette barre était restée à l'écart de tout ce que la bande de mode a unifié,
// et l'écart se voyait dans la même page :
//
//   — DEUX mécanismes de flèche. Un caractère `←` posé dans le texte à gauche,
//     un `<ArrowRight>` de lucide à droite. Ni la même graisse, ni la même
//     taille, ni le même alignement optique.
//
//   — `data-icon` absent des deux côtés. C'est lui qui fait compenser le
//     padding par la base du bouton ; sans lui la flèche colle au bord de
//     l'aplat, ce que `cta-cell.tsx` documente déjà.
//
//   — `min-h-11` écrit en dur, alors que `--spacing-tap` existe et que
//     `size="touch"` le porte.
//
//   — aucun filet vertical, dans un site entièrement structuré par des filets :
//     le blanc courait sans couture du « Retour » jusqu'à l'aplat orange.
//
// `max-md:whitespace-normal` et `max-md:flex-1`, posés sur les actions : c'est
// en dessous de `md`, et là seulement, qu'elles doivent se partager la largeur.
//
// Au-delà, elles prennent celle de leur libellé et c'est « Retour » qui absorbe
// le reste. Les trois étaient en `flex-1`, donc à un tiers de la barre chacun :
// « Valider, plateau suivant » y débordait des deux côtés — d'où aussi le
// raccourcissement du libellé, une virgule dans un bouton annonçant deux
// actions là où le clic n'en déclenche qu'une.
//
// `px-pad-cell` : `size="touch"` pose `px-2.5`, soit 10px, quand toute la
// colonne du tunnel est à 20px — « Retour » collait au bord gauche.

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
    <div className="flex shrink-0 flex-col border-t border-border bg-background md:min-h-cta md:flex-row md:items-stretch">
      <Button
        type="button"
        variant="cell"
        size="touch"
        onClick={goBack}
        disabled={idx <= 0 && onFirstSub}
        className="min-w-0 justify-start px-pad-cell md:flex-1"
      >
        <ArrowLeft data-icon="inline-start" />
        {t('booking.back')}
      </Button>
      {/* Le filet entre les actions vient de `*+*` : posé sur chaque bouton, le
          premier en porterait un contre le bord gauche de l'écran en mobile.
          `md:border-l` sépare le groupe du « Retour », et seulement à partir du
          moment où ils partagent une ligne. */}
      <div className="flex items-stretch border-t border-border md:w-fit md:border-l md:border-t-0 [&>*+*]:border-l [&>*+*]:border-border">
        {/* Le cyclorama se facture sur devis : pas de demande de devis séparée. */}
        {step >= STEP.CONTACT && !isCyclo && (
          // Volontairement cliquable même quand le contact est incomplet :
          // la soumission renvoie alors sur l'étape contact pour montrer ce
          // qui manque. Sans ça, le bouton semblerait ne rien faire.
          // L'atténuation dit qu'il reste quelque chose à remplir.
          <Button
            type="button"
            variant="cell"
            size="touch"
            onClick={() => onSubmit('quote')}
            disabled={saving}
            title={t('booking.noDateHeld')}
            className={cn(
              'min-w-0 px-pad-cell max-md:flex-1 max-md:whitespace-normal',
              !contactValid && 'opacity-30',
            )}
          >
            {saving ? t('booking.sending') : t('booking.receiveMyQuote')}
            <ArrowRight data-icon="inline-end" />
          </Button>
        )}
        <Button
          type="button"
          size="touch"
          onClick={primary.onClick}
          disabled={primary.disabled}
          className="min-w-0 px-pad-cell max-md:flex-1 max-md:whitespace-normal"
        >
          {primary.label}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
};

export { BookingFooterNav };
export type { BookingFooterNavProps };
