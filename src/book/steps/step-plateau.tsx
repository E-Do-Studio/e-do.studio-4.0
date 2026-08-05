import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../i18n/use-t';
import type { Lang } from '../../lib/booking-engine';
import { BOOK_PLATEAUX } from '../../lib/booking-engine';

interface StepPlateauProps {
  lang: Lang;
  /** Clés des plateaux retenus. */
  selected: string[];
  togglePlateau: (plateauKey: string) => void;
}

const StepPlateau = ({ lang, selected, togglePlateau }: StepPlateauProps) => {
  const t = useT();
  return (
    <div>
      <div className="px-5 md:px-6 border-b border-border flex items-center min-h-11 py-3 md:py-0 md:h-11 box-border gap-3 bg-background flex-wrap sticky top-0 z-10">
        <span className="font-mono text-xs font-normal uppercase tracking-widest text-primary whitespace-nowrap">
          01 · {t('booking.stageFallback')}
        </span>
        <span className="font-mono text-xs tracking-wide text-muted-foreground">
          {t('booking.multiSelectPossible')}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border w-full auto-rows-[minmax(180px,auto)]">
        {BOOK_PLATEAUX.map((px, i) => {
          const on = selected.includes(px.k);
          const priceRows = px.isVisite
            ? [{ lbl: t('booking.visit'), val: t('booking.free') }]
            : px.isCyclo
              ? [
                  { lbl: t('booking.cyclo5h'), val: `${px.rates.halfH} €` },
                  { lbl: t('booking.cyclo10h'), val: `${px.rates.fullH} €` },
                  {
                    lbl: t('booking.editorial10h'),
                    val: t('common.onRequest'),
                  },
                ]
              : [
                  { lbl: t('booking.hourly'), val: `${px.rates.hour} €` },
                  { lbl: t('booking.halfDay4h'), val: `${px.rates.half} €` },
                  { lbl: t('booking.fullDay8h'), val: `${px.rates.full} €` },
                ];
          return (
            <Button
              type="button"
              key={px.k}
              variant="cell"
              size="cell"
              aria-pressed={on}
              onClick={() => togglePlateau(px.k)}
              className={cn('group px-4.5 py-4', on && 'dark bg-background')}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs tracking-widest text-muted-foreground">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {on ? (
                  <span className="text-primary text-base leading-none">●</span>
                ) : (
                  <span className="text-primary text-base leading-none transition-all duration-200 origin-right opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-110">
                    →
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'text-3xl font-light tracking-tight mt-1 transition-transform duration-200 origin-left',
                  !on && 'group-hover:scale-105',
                )}
              >
                {px[lang]}
              </div>
              <div className="text-sm text-muted-foreground leading-snug">
                {px.desc[lang]}
              </div>
              <div
                className={cn(
                  'mt-auto pt-3 flex flex-col gap-1 border-t',
                  on ? 'border-t-white/15' : 'border-t-border',
                )}
              >
                {priceRows.map((pr) => (
                  <div
                    key={pr.lbl}
                    className="flex justify-between items-baseline gap-2 whitespace-nowrap"
                  >
                    <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase overflow-hidden text-ellipsis">
                      {pr.lbl}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {pr.val}
                    </span>
                  </div>
                ))}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export { StepPlateau };
export type { StepPlateauProps };
