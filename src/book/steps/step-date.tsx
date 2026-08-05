import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../i18n/use-t';
import { isHourBlocked, useAvailability } from '../../lib/availability';
import type { BookPlateau, DateSelection } from '../../lib/booking-engine';
import {
  STUDIO_CLOSE,
  STUDIO_OPEN,
  useArrivalHourGuard,
  useFirstFreeDay,
} from './use-calendar-defaults';

interface StepDateProps {
  plateau: BookPlateau | undefined;
  viewY: number;
  viewM: number;
  months: string[];
  days: string[];
  /** Cases du mois affiché, `null` pour le remplissage avant le 1er. */
  calCells: (number | null)[];
  selected: DateSelection | null;
  setSelected: (date: DateSelection) => void;
  arrivalHour: number;
  setArrivalHour: (hour: number) => void;
  /** Heures à trouver libres sur une même journée (≠ heures facturées). */
  rentalHours: number;
  isPast: (day: number | null) => boolean;
  nextMonth: () => void;
  prevMonth: () => void;
  /** Incrémenté après un 409 pour court-circuiter le cache d'availability. */
  refreshKey?: number;
}

const LEGEND_SWATCH = 'inline-block w-2.5 h-2.5';

const StepDate = ({
  plateau,
  viewY,
  viewM,
  months,
  days,
  calCells,
  selected,
  setSelected,
  arrivalHour,
  setArrivalHour,
  rentalHours,
  isPast,
  nextMonth,
  prevMonth,
  refreshKey = 0,
}: StepDateProps) => {
  const t = useT();
  const {
    availMap,
    bookedHoursMap,
    loading: availLoading,
  } = useAvailability(plateau?.k, viewY, viewM, rentalHours, refreshKey);

  const now = new Date();
  const today = {
    y: now.getFullYear(),
    m: now.getMonth(),
    d: now.getDate(),
  };
  const currentHour = now.getHours();

  const isSelected = (d: number) =>
    !!selected &&
    selected.y === viewY &&
    selected.m === viewM &&
    selected.d === d;
  const isToday = (d: number) =>
    viewY === today.y && viewM === today.m && d === today.d;
  const isSelectedToday =
    !!selected &&
    selected.y === today.y &&
    selected.m === today.m &&
    selected.d === today.d;
  const selectedDayBooked = selected ? bookedHoursMap[selected.d] : undefined;

  useArrivalHourGuard({
    selected,
    bookedHours: selectedDayBooked,
    isSelectedToday,
    currentHour,
    arrivalHour,
    rentalHours,
    setArrivalHour,
  });
  useFirstFreeDay({
    selected,
    availLoading,
    availMap,
    bookedHoursMap,
    viewY,
    viewM,
    today,
    currentHour,
    rentalHours,
    setSelected,
  });

  return (
    <div>
      <div className="px-5 md:px-6 border-b border-border flex items-center min-h-11 py-3 md:py-0 md:h-11 box-border gap-3 bg-background flex-wrap sticky top-0 z-10">
        <span className="font-mono text-xs font-normal uppercase tracking-widest text-primary whitespace-nowrap">
          06 · {t('booking.pickADate')}
        </span>
      </div>

      <div className="flex min-w-0 gap-px bg-border">
        <div className="flex min-w-0 flex-1 items-baseline gap-x-4 md:gap-x-6 gap-y-2 bg-background px-5 md:px-6 py-3 flex-wrap">
          <h2 className="m-0 text-3xl font-light tracking-tight shrink-0">
            {months[viewM]}{' '}
            <span className="text-muted-foreground">{viewY}</span>
          </h2>
          <div className="flex items-center gap-x-3 gap-y-1.5 font-mono text-xs tracking-wider uppercase text-muted-foreground flex-wrap">
            {availLoading && (
              <span className="text-primary animate-pulse">
                {t('booking.calLoading')}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className={`${LEGEND_SWATCH} bg-background border border-foreground`}
              />
              {t('booking.calFreeLegend')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className={`${LEGEND_SWATCH} bg-[oklch(0.86_0.045_82)] border border-[oklch(0.72_0.045_82)]`}
              />
              {t('booking.calPartialLegend')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className={`${LEGEND_SWATCH} bg-muted border border-input`}
              />
              {t('booking.calUnavailableLegend')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className={`${LEGEND_SWATCH} bg-primary border border-primary`}
              />
              {t('booking.calSelectedLegend')}
            </span>
          </div>
        </div>
        <Button
          type="button"
          onClick={prevMonth}
          aria-label={t('booking.calPrevMonth')}
          variant="cell"
          className="basis-14 flex-none flex-row items-center justify-center text-sm"
        >
          ←
        </Button>
        <Button
          type="button"
          onClick={nextMonth}
          aria-label={t('booking.calNextMonth')}
          variant="cell"
          className="basis-14 flex-none flex-row items-center justify-center text-sm"
        >
          →
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-border w-full">
        {days.map((d) => (
          <div
            key={d}
            className="bg-muted py-2.5 text-center font-mono text-xs tracking-widest uppercase text-muted-foreground border-r border-input last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className={cn(
          'grid grid-cols-7 border-b border-border w-full transition-opacity duration-200',
          availLoading && 'opacity-60',
        )}
      >
        {calCells.map((d, i) => {
          if (d === null)
            return (
              <div
                // Les cases de remplissage n'ont que leur position pour identité.
                // biome-ignore lint/suspicious/noArrayIndexKey: cellule vide sans donnée
                key={`pad-${i}`}
                className="bg-muted aspect-[1.6] border-r border-b border-input"
              />
            );
          const dow = new Date(viewY, viewM, d).getDay();
          const weekendBlocked = (dow === 0 || dow === 6) && rentalHours < 8;
          const av = weekendBlocked ? 'unavailable' : availMap[d] || 'free';
          const past = isPast(d);
          const sel = isSelected(d);
          const tdy = isToday(d);
          const partial =
            !sel &&
            !past &&
            av === 'free' &&
            !weekendBlocked &&
            (bookedHoursMap[d]?.size ?? 0) > 0;
          return (
            <Button
              type="button"
              key={d}
              disabled={past || av === 'unavailable'}
              onClick={() => setSelected({ y: viewY, m: viewM, d })}
              title={
                weekendBlocked
                  ? t('booking.weekendFullDayOnly')
                  : tdy
                    ? t('booking.today')
                    : ''
              }
              className={cn(
                'aspect-[1.6] h-auto border-r border-b border-input flex flex-col items-start justify-start text-left normal-case tracking-normal min-w-0 p-1.5 sm:p-2 relative',
                sel
                  ? 'bg-primary text-primary-foreground hover:bg-primary/85'
                  : past || av === 'unavailable'
                    ? 'bg-muted text-muted-foreground/40'
                    : partial
                      ? 'bg-[oklch(0.86_0.045_82)] text-foreground hover:bg-[oklch(0.91_0.03_82)]'
                      : tdy
                        ? 'bg-primary/8 text-foreground hover:bg-primary/15'
                        : 'bg-background text-foreground hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'text-sm sm:text-base tabular-nums leading-none',
                  sel
                    ? 'font-semibold text-primary-foreground'
                    : partial
                      ? 'font-medium text-foreground'
                      : tdy
                        ? 'font-bold text-primary'
                        : past
                          ? 'font-normal'
                          : 'font-medium',
                )}
              >
                {d}
              </span>
              {tdy && !sel && !partial && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
              {!past && av !== 'unavailable' && !weekendBlocked && (
                <span
                  className={cn(
                    'font-mono text-[10px] sm:text-xs tracking-wide uppercase mt-auto',
                    tdy && !sel && !partial
                      ? 'text-primary/70'
                      : 'text-muted-foreground',
                  )}
                >
                  {partial ? t('booking.calPartial') : t('booking.freeLower')}
                </span>
              )}
              {weekendBlocked && !past && (
                <span className="font-mono text-[10px] sm:text-xs tracking-wide uppercase mt-auto text-muted-foreground/50">
                  {t('booking.fullDayLower')}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="border-b border-border bg-background px-5 md:px-6 py-2.5 flex items-center gap-3 md:gap-5 flex-wrap">
        <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">
          {t('booking.arrivalTime')}
        </span>
        <span className="font-mono text-xs tracking-wider text-muted-foreground">
          {String(arrivalHour).padStart(2, '0')}:00 →{' '}
          {String(arrivalHour + rentalHours).padStart(2, '0')}:00 ·{' '}
          {rentalHours}h
        </span>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-px bg-background border-b border-border w-full">
        {Array.from(
          { length: STUDIO_CLOSE - STUDIO_OPEN },
          (_, i) => i + STUDIO_OPEN,
        ).map((h) => {
          const on = arrivalHour === h;
          const endsTooLate = h + rentalHours > STUDIO_CLOSE;
          const pastHour = isSelectedToday && h <= currentHour;
          const booked = isHourBlocked(selectedDayBooked, h, rentalHours);
          const disabled = endsTooLate || pastHour || booked;
          return (
            <Button
              type="button"
              key={h}
              variant="cell"
              disabled={disabled}
              onClick={() => setArrivalHour(h)}
              title={
                booked
                  ? t('booking.slotAlreadyBooked')
                  : pastHour
                    ? t('booking.pastTimeSlot')
                    : endsTooLate
                      ? t('booking.endsPastClosing', { hour: h + rentalHours })
                      : ''
              }
              className={cn(
                'h-auto flex-row items-center justify-center tracking-wide min-w-0 py-3 sm:py-0 sm:aspect-[1.5]',
                on && 'dark bg-background text-foreground',
                disabled && 'bg-muted text-muted-foreground',
                booked && 'line-through',
              )}
            >
              {String(h).padStart(2, '0')}:00
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export { StepDate };
export type { StepDateProps };
