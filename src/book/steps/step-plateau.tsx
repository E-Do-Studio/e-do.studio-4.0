import { useT } from '../../i18n/use-t';
import type { Lang } from '../../lib/booking-engine';
import { BOOK_PLATEAUX } from '../../lib/booking-engine';
import { ordinal } from '@/lib/format';
import { MonoLabel } from '../../ui/mono-label';
import { StepHeading } from '@/ui/step-heading';
import { SelectTile } from '@/ui/select-tile';
import { StepBand } from '@/ui/step-band';

interface StepPlateauProps {
  lang: Lang;
  /** Clés des plateaux retenus. */
  selected: string[];
  togglePlateau: (plateauKey: string) => void;
}

const StepPlateau = ({ lang, selected, togglePlateau }: StepPlateauProps) => {
  const t = useT();
  return (
    // `min-h-full` + `flex-col` : la zone de contenu est plus haute que ces six
    // tuiles, et le reste tombait en blanc sous elles. C'est la grille qui le
    // récupère — voir `flex-1` plus bas. Sans ça, il fallait DEUX traits (fermer
    // la grille, ouvrir la barre) et ils se collaient dès que le contenu
    // remplissait la zone, en mobile notamment.
    <div className="flex min-h-full flex-col">
      <StepBand sticky>
        <StepHeading number="01" title={t('booking.stageFallback')} />
        <MonoLabel tone="muted">{t('booking.multiSelectPossible')}</MonoLabel>
      </StepBand>
      {/* `border-b` : c'était la seule grille du tunnel à ne pas se fermer. Les
          onze grilles du configurateur la portent, celle-ci s'arrêtait dans le
          blanc. */}
      <div className="grid w-full flex-1 auto-rows-fr grid-cols-1 gap-px bg-border @md:grid-cols-2 @2xl:grid-cols-3">
        {BOOK_PLATEAUX.map((px, i) => {
          const on = selected.includes(px.k);
          const priceRows = px.isVisite
            ? [{ label: t('booking.visit'), value: t('booking.free') }]
            : px.isCyclo
              ? [
                  { label: t('booking.cyclo5h'), value: `${px.rates.halfH} €` },
                  {
                    label: t('booking.cyclo10h'),
                    value: `${px.rates.fullH} €`,
                  },
                  {
                    label: t('booking.editorial10h'),
                    value: t('common.onRequest'),
                  },
                ]
              : [
                  { label: t('booking.hourly'), value: `${px.rates.hour} €` },
                  {
                    label: t('booking.halfDay4h'),
                    value: `${px.rates.half} €`,
                  },
                  {
                    label: t('booking.fullDay8h'),
                    value: `${px.rates.full} €`,
                  },
                ];
          return (
            <SelectTile
              key={px.k}
              size="lg"
              number={ordinal(i)}
              title={px[lang]}
              desc={px.desc[lang]}
              footer={priceRows}
              selected={on}
              onSelect={() => togglePlateau(px.k)}
            />
          );
        })}
      </div>
    </div>
  );
};

export { StepPlateau };
export type { StepPlateauProps };
