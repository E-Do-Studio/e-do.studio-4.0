import { Empty, EmptyTitle } from '@/components/ui/empty';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useT } from '../i18n/use-t';
import type { BookPlateau, Lang, SlotState } from '../lib/booking-engine';
import { buildSlotLabels } from './slot-labels';
import { ordinal } from '@/lib/format';
import { MonoLabel } from '../ui/mono-label';
import { StepBand } from '../ui/step-band';

interface MultiPlateauStepProps {
  lang: Lang;
  slotIds: string[];
  slots: Record<string, SlotState>;
  setSlots: Dispatch<SetStateAction<Record<string, SlotState>>>;
  /** Bandeau collant au-dessus de la liste, propre à l'étape. */
  topBanner?: ReactNode;
  renderOne: (
    plateau: BookPlateau,
    slot: SlotState,
    patchSlot: (patch: Partial<SlotState>) => void,
  ) => ReactNode;
}

/**
 * Répète le corps d'une étape pour chaque créneau du projet. Un seul créneau et
 * les en-têtes disparaissent : la page redevient l'étape simple.
 */
const MultiPlateauStep = ({
  lang,
  slotIds,
  slots,
  setSlots,
  topBanner,
  renderOne,
}: MultiPlateauStepProps) => {
  const t = useT();
  if (slotIds.length === 0) {
    return (
      <Empty size="compact">
        <EmptyTitle>{t('booking.noStageSelected')}</EmptyTitle>
      </Empty>
    );
  }

  const patchSlot = (id: string, patch: Partial<SlotState>) => {
    setSlots((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        plateauKey: prev[id]?.plateauKey || id,
        ...patch,
      },
    }));
  };

  return (
    // `min-h-full` + `flex-col`, et `last:flex-1` sur le dernier plateau : la
    // zone de contenu est plus haute que la liste, et le reste tombait en blanc
    // sous le dernier bloc. C'est lui qui le récupère — même mécanisme qu'à
    // l'étape Plateau, où une seule grille occupe toute la hauteur.
    <div className="flex min-h-full flex-col">
      {topBanner}
      {/* `divide-y` : le filet entre deux plateaux appartient à CE conteneur,
          qui seul sait qu'il y a un plateau suivant. Chaque étape le posait
          elle-même en `border-b` sur son dernier bloc — un filet qui existait
          donc aussi sous le DERNIER plateau, où il se doublait avec le
          `border-t` de la barre d'actions. `divide-y` ne coud qu'entre deux
          enfants, jamais aux extrémités. */}
      <div className="flex flex-1 flex-col divide-y divide-border">
        {buildSlotLabels(slotIds, slots, lang).map(
          ({ id, plateau, name, occurrence, duplicated }) => {
            if (!plateau) return null;
            // Le rang ne rentre plus dans le titre : « Eclipse Session 01 » et
            // « Eclipse Session 02 » répétaient deux mots sur trois d'un bloc au
            // suivant, pour une seule information distinctive.
            const rank = duplicated ? ordinal(occurrence - 1) : undefined;
            return (
              <div key={id} className="flex flex-col last:flex-1">
                {/* Le nom du plateau EST le titre de sa section. Il tenait sur
                  la même ligne que son numéro et sa description, tous les trois
                  au même poids — la seule chose qui distinguait un bloc du
                  suivant était la plus petite de son propre bloc.
                  
                  Pas de numéro d'ordre : le rail de gauche et le stepper mobile
                  numérotent déjà les étapes, et ces sections-ci se suivent dans
                  l'ordre où l'on a choisi les plateaux. Le nom suffit à les
                  distinguer. */}
                {slotIds.length > 1 && (
                  <StepBand>
                    <h2 className="m-0 text-base font-normal tracking-tight">
                      {name}
                    </h2>
                    {rank && (
                      <MonoLabel tone="muted" className="tabular-nums">
                        {rank}
                      </MonoLabel>
                    )}
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {plateau.desc[lang]}
                    </span>
                  </StepBand>
                )}
                {renderOne(plateau, slots[id] || {}, (patch) =>
                  patchSlot(id, patch),
                )}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
};

export { MultiPlateauStep };
export type { MultiPlateauStepProps };
