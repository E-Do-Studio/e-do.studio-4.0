import { useT } from '../../i18n/use-t';
import type { BookPlateau } from '../../lib/booking-engine';
import { StepHeading } from '@/ui/step-heading';
import { Price } from '@/ui/price';
import { SelectTile } from '@/ui/select-tile';
import { Stepper } from '@/ui/stepper';
import { ordinal } from '@/lib/format';
import { MonoLabel } from '@/ui/mono-label';

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
  // `border-t` et non `border-b` : le filet appartient à ce qui COMMENCE, pas à
  // ce qui finit. Porté par le bas de la grille de tuiles, il n'existait qu'en
  // dessous d'elle — et se doublait avec le `border-t` de la barre d'actions
  // dès que la ligne devenait le dernier élément de l'étape.
  <div className="grid w-full grid-cols-1 gap-px border-t border-border bg-background">
    <div className="flex flex-wrap items-center justify-between gap-5 bg-background px-pad-cell py-5">
      <div className="flex min-w-0 flex-col gap-1">
        <MonoLabel tone="muted">{label}</MonoLabel>
        {/* L'explication était un second `MonoLabel` : même corps, même
            couleur, même casse que l'intitulé qu'elle explique — rien ne les
            distinguait, et soixante caractères en capitales espacées ne se
            lisent pas. C'est une phrase, elle garde sa casse. */}
        <span className="text-pretty text-xs leading-normal text-muted-foreground">
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
      // Une colonne ou trois, jamais deux : il y a toujours exactement trois
      // tuiles, et une grille à deux colonnes laisserait la quatrième cellule
      // vide — le `bg-border` du conteneur, du noir pur, y transparaîtrait.
      <div className="grid w-full flex-1 auto-rows-fr grid-cols-1 gap-px bg-border @xl:grid-cols-3">
        <SelectTile
          size="md"
          number={ordinal(0)}
          title={t('booking.halfDay')}
          sub={t('booking.hoursCount', { count: 5 })}
          desc={t('booking.HourBlockPerfectFor')}
          price={<Price size="lg" value={`${p.rates.halfH} €`} />}
          selected={cycloMode === 'halfH'}
          onSelect={() => setCycloMode('halfH')}
        />
        <SelectTile
          size="md"
          number={ordinal(1)}
          title={t('booking.fullDay')}
          sub={t('booking.hoursCount', { count: 10 })}
          desc={t('booking.HourBlockECommerce')}
          price={<Price size="lg" value={`${p.rates.fullH} €`} />}
          selected={cycloMode === 'fullH'}
          onSelect={() => setCycloMode('fullH')}
        />
        <SelectTile
          size="md"
          number={ordinal(2)}
          title={t('booking.editorial')}
          sub={t('booking.hoursCount', { count: 10 })}
          desc={t('booking.reducedRateForPressPersonal')}
          price={<MonoLabel tone="muted">{t('common.onRequest')}</MonoLabel>}
          selected={cycloMode === 'editorial'}
          onSelect={() => setCycloMode('editorial')}
        />
      </div>
    );
  }

  if (p.isVisite) {
    return (
      <div>
        <div className="px-pad-cell">
          <StepHeading
            number="02"
            title={t('booking.studioVisit')}
            subtitle={t('booking.studioVisitIsFreeAnd')}
            className="py-3 pb-2.5"
          />
        </div>
        <div className="grid grid-cols-1 gap-px bg-background border-t border-border w-full">
          <div className="bg-background px-pad-cell py-6 md:py-8 flex flex-wrap items-baseline gap-3 md:gap-5">
            <Price size="2xl" value="0 €" />
            <MonoLabel tone="muted">{t('booking.freeByAppointment')}</MonoLabel>
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

  const hoursLabel =
    slotType === 'hour'
      ? t('booking.numberOfHours')
      : t('booking.hoursHalfDay');

  return (
    // `flex-col` + `flex-1` sur la grille : quand ce bloc est le dernier de
    // la liste, `MultiPlateauStep` lui donne la hauteur restante et la grille
    // la consomme, au lieu de laisser du blanc sous elle.
    <div className="flex flex-1 flex-col">
      <div className="grid w-full flex-1 auto-rows-fr grid-cols-1 gap-px bg-border @xl:grid-cols-3">
        <SelectTile
          size="md"
          number={ordinal(0)}
          title={t('booking.hourly2')}
          sub={t('booking.To3Hours')}
          desc={t('booking.idealForATestOr')}
          price={<Price size="lg" value={`${p.rates.hour} €/h`} />}
          selected={slotType === 'hour'}
          onSelect={() => {
            setSlotType('hour');
            setHours(1);
          }}
        />
        <SelectTile
          size="md"
          number={ordinal(1)}
          title={t('booking.halfDay')}
          sub={t('booking.To7Hours')}
          desc={t('booking.HourBlockProRata')}
          price={<Price size="lg" value={`${p.rates.half} €`} />}
          selected={slotType === 'half'}
          onSelect={() => {
            setSlotType('half');
            setHours(4);
          }}
        />
        <SelectTile
          size="md"
          number={ordinal(2)}
          title={t('booking.fullDay')}
          sub={t('booking.Hours')}
          desc={t('booking.fullDayBestRate')}
          price={<Price size="lg" value={`${p.rates.full} €`} />}
          selected={slotType === 'full'}
          onSelect={() => {
            setSlotType('full');
            setHours(8);
          }}
        />
      </div>
      {(slotType === 'hour' || slotType === 'half') && (
        <DurationRow
          label={hoursLabel}
          hint={
            slotType === 'hour'
              ? t('booking.from4hSwitchesToHalf')
              : t('booking.proRataHint', { price: p.rates.half })
          }
        >
          {/* `${hours}h` et non `hours` : franchir 8h fait passer le compteur à
              la ligne « journée » ci-dessous, qui affichait déjà l'unité. Le
              même geste sur le même contrôle faisait donc apparaître un « h »
              venu de nulle part entre 7 et 8, et la valeur changeait de largeur
              avec lui. L'unité est constante des deux côtés du seuil — et elle
              porte du sens sur la ligne « Durée totale », dont l'intitulé, lui,
              ne dit pas des heures.

              `min-w-16` des deux côtés pour la même raison : c'est ce qui tient
              les boutons en place, et deux largeurs différentes les décalaient
              au passage du seuil. */}
          <Stepper
            label={hoursLabel}
            value={`${hours}h`}
            valueClassName="min-w-16"
            onDecrement={decrementBelowFullDay}
            onIncrement={incrementBelowFullDay}
          />
        </DurationRow>
      )}
      {slotType === 'full' && (
        <DurationRow label={t('booking.totalDuration')} hint={fullDayTotal()}>
          <Stepper
            label={t('booking.totalDuration')}
            value={`${hours}h`}
            valueClassName="min-w-16"
            onDecrement={decrementFullDay}
            onIncrement={() => setHours(hours + 1)}
          />
        </DurationRow>
      )}
    </div>
  );
};

export { StepDuration };
export type { StepDurationProps };
