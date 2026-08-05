import { useT } from '../../i18n/use-t';
import type { BookPlateau } from '../../lib/booking-engine';
import { BentoSlotTile, StepIntro, StepperBtn } from '../shared';

interface StepDurationProps {
  plateau: BookPlateau;
  slotType: string;
  setSlotType: (value: string) => void;
  hours: number;
  setHours: (value: number) => void;
  cycloMode: string;
  setCycloMode: (value: string) => void;
}

const DurationRow = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) => (
  <div className="grid grid-cols-1 gap-px bg-background border-b border-border w-full">
    <div className="bg-background px-5 md:px-12 py-5 flex items-center justify-between gap-5 flex-wrap">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-xs tracking-wide text-muted-foreground leading-normal">
          {hint}
        </span>
      </div>
      <div className="flex items-center gap-3.5">{children}</div>
    </div>
  </div>
);

const StepDuration = ({
  plateau: p,
  slotType,
  setSlotType,
  hours,
  setHours,
  cycloMode,
  setCycloMode,
}: StepDurationProps) => {
  const t = useT();

  if (p.isCyclo) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border w-full auto-rows-[minmax(180px,auto)]">
        <BentoSlotTile
          idx={1}
          on={cycloMode === 'halfH'}
          onClick={() => setCycloMode('halfH')}
          label={t('booking.halfDay')}
          sub={t('booking.hoursCount', { count: 5 })}
          desc={t('booking.HourBlockPerfectFor')}
          price={`${p.rates.halfH} €`}
        />
        <BentoSlotTile
          idx={2}
          on={cycloMode === 'fullH'}
          onClick={() => setCycloMode('fullH')}
          label={t('booking.fullDay')}
          sub={t('booking.hoursCount', { count: 10 })}
          desc={t('booking.HourBlockECommerce')}
          price={`${p.rates.fullH} €`}
        />
        <BentoSlotTile
          idx={3}
          on={cycloMode === 'editorial'}
          onClick={() => setCycloMode('editorial')}
          label={t('booking.editorial')}
          sub={t('booking.hoursCount', { count: 10 })}
          desc={t('booking.reducedRateForPressPersonal')}
          price={t('common.onRequest')}
          hint={t('booking.pressPersonal')}
        />
      </div>
    );
  }

  if (p.isVisite) {
    return (
      <div>
        <div className="px-5 md:px-12">
          <StepIntro
            num="02"
            title={t('booking.studioVisit')}
            subtitle={t('booking.studioVisitIsFreeAnd')}
          />
        </div>
        <div className="grid grid-cols-1 gap-px bg-background border-t border-b border-border w-full">
          <div className="bg-background px-5 md:px-12 py-6 md:py-8 flex flex-wrap items-baseline gap-3 md:gap-5">
            <span className="text-5xl font-light tracking-tighter leading-none">
              0 €
            </span>
            <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
              {t('booking.freeByAppointment')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Les paliers ne sont pas trois cases indépendantes : le compteur fait
  // basculer le type de créneau dès qu'il franchit 4 h (demi-journée) ou 8 h
  // (journée), et l'inverse en descendant. D'où l'écriture en `setSlotType` +
  // `setHours` couplés plutôt qu'un simple incrément.
  const decrementBelowFullDay = () => {
    if (slotType === 'hour') {
      setHours(Math.max(1, hours - 1));
      return;
    }
    const next = hours - 1;
    if (next < 4) {
      setSlotType('hour');
      setHours(3);
    } else {
      setHours(next);
    }
  };

  const incrementBelowFullDay = () => {
    const next = hours + 1;
    if (next >= 8) {
      setSlotType('full');
      setHours(8);
    } else if (slotType === 'hour' && next >= 4) {
      setSlotType('half');
      setHours(next);
    } else {
      setHours(next);
    }
  };

  const decrementFullDay = () => {
    const next = hours - 1;
    if (next < 8) {
      setSlotType('half');
      setHours(7);
    } else {
      setHours(next);
    }
  };

  const fullDayTotal = () => {
    const fullDays = Math.floor(hours / 8);
    const extraH = hours - fullDays * 8;
    const unit = t('booking.fullDayUnit', { count: fullDays });
    if (extraH === 0) {
      return t('booking.fullDaysTotal', {
        days: fullDays,
        unit,
        hours,
        amount: ((p.rates.full ?? 0) * fullDays).toFixed(0),
      });
    }
    const extraAmt = +(((p.rates.full ?? 0) / 8) * extraH).toFixed(2);
    return t('booking.fullDaysPlusExtra', {
      days: fullDays,
      unit,
      baseHours: fullDays * 8,
      extraHours: extraH,
      amount: ((p.rates.full ?? 0) * fullDays + extraAmt).toFixed(0),
    });
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border w-full auto-rows-[minmax(180px,auto)]">
        <BentoSlotTile
          idx={1}
          on={slotType === 'hour'}
          onClick={() => {
            setSlotType('hour');
            setHours(1);
          }}
          label={t('booking.hourly2')}
          sub={t('booking.To3Hours')}
          desc={t('booking.idealForATestOr')}
          price={`${p.rates.hour} €/h`}
        />
        <BentoSlotTile
          idx={2}
          on={slotType === 'half'}
          onClick={() => {
            setSlotType('half');
            setHours(4);
          }}
          label={t('booking.halfDay')}
          sub={t('booking.To7Hours')}
          desc={t('booking.HourBlockProRata')}
          price={`${p.rates.half} €`}
        />
        <BentoSlotTile
          idx={3}
          on={slotType === 'full'}
          onClick={() => {
            setSlotType('full');
            setHours(8);
          }}
          label={t('booking.fullDay')}
          sub={t('booking.Hours')}
          desc={t('booking.fullDayBestRate')}
          price={`${p.rates.full} €`}
        />
      </div>
      {(slotType === 'hour' || slotType === 'half') && (
        <DurationRow
          label={
            slotType === 'hour'
              ? t('booking.numberOfHours')
              : t('booking.hoursHalfDay')
          }
          hint={
            slotType === 'hour'
              ? t('booking.from4hSwitchesToHalf')
              : t('booking.proRataHint', { price: p.rates.half })
          }
        >
          <StepperBtn onClick={decrementBelowFullDay}>−</StepperBtn>
          <span className="text-3xl font-light tracking-tight min-w-10 text-center">
            {hours}
          </span>
          <StepperBtn onClick={incrementBelowFullDay}>+</StepperBtn>
        </DurationRow>
      )}
      {slotType === 'full' && (
        <DurationRow label={t('booking.totalDuration')} hint={fullDayTotal()}>
          <StepperBtn onClick={decrementFullDay}>−</StepperBtn>
          <span className="text-3xl font-light tracking-tight min-w-16 text-center">
            {hours}h
          </span>
          <StepperBtn onClick={() => setHours(hours + 1)}>+</StepperBtn>
        </DurationRow>
      )}
    </div>
  );
};

export { StepDuration };
export type { StepDurationProps };
