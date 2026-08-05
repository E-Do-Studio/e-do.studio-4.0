import { Empty, EmptyTitle } from '@/components/ui/empty';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useT } from '../i18n/use-t';
import type { BookPlateau, Lang, SlotState } from '../lib/booking-engine';
import { buildSlotLabels } from './slot-labels';

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
    <div>
      {topBanner}
      {buildSlotLabels(slotIds, slots, lang).map(
        ({ id, plateau, name, occurrence, duplicated }, idx) => {
          if (!plateau) return null;
          const label = duplicated
            ? `${name} · ${t('booking.session')} ${String(occurrence).padStart(2, '0')}`
            : name;
          return (
            <div key={id}>
              {slotIds.length > 1 && (
                <div className="px-5 md:px-6 border-b border-border flex items-center min-h-11 py-3 md:py-0 md:h-11 box-border gap-3 bg-background flex-wrap">
                  <span className="font-mono text-xs font-normal uppercase tracking-widest text-primary whitespace-nowrap">
                    {t('booking.stageFallback')}{' '}
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-normal tracking-tight text-foreground">
                    {label}
                  </span>
                  <span className="font-mono text-xs tracking-wide text-muted-foreground">
                    {plateau.desc[lang]}
                  </span>
                </div>
              )}
              {renderOne(plateau, slots[id] || {}, (patch) =>
                patchSlot(id, patch),
              )}
            </div>
          );
        },
      )}
    </div>
  );
};

export { MultiPlateauStep };
export type { MultiPlateauStepProps };
