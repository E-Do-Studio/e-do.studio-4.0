import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Fragment } from 'react';
import { useT } from '../i18n/use-t';
import type { StepProgress } from './booking-steps';

interface StepperProps {
  progress: StepProgress[];
  goToStep: (n: number) => void;
}

/** Fil d'étapes en tête d'écran, sous le palier `md`. */
const BookingStepperMobile = ({ progress, goToStep }: StepperProps) => {
  const t = useT();
  const current = progress.find((s) => s.active);
  return (
    <nav
      aria-label={t('booking.bookingSteps')}
      className="md:hidden bg-background border-b border-border"
    >
      <ol className="flex items-center px-5 pt-4">
        {progress.map(({ n, label, index, active, done, clickable }) => (
          <Fragment key={n}>
            <li className="flex-none">
              <Button
                type="button"
                onClick={() => clickable && goToStep(n)}
                aria-current={active ? 'step' : undefined}
                aria-disabled={!clickable}
                aria-label={`${index + 1}. ${label}`}
                className={cn(
                  'h-7 w-7 -m-2 p-2 aria-disabled:cursor-not-allowed',
                  active && 'bg-primary text-primary-foreground',
                  !active && done && 'dark bg-background text-foreground',
                  !active &&
                    !done &&
                    clickable &&
                    'bg-background text-foreground border border-foreground',
                  !active &&
                    !done &&
                    !clickable &&
                    'bg-background text-muted-foreground border border-border opacity-50',
                )}
              >
                {done ? '✓' : String(index + 1).padStart(2, '0')}
              </Button>
            </li>
            {index < progress.length - 1 && (
              <li
                aria-hidden
                className={cn(
                  'flex-1 h-px mx-2',
                  done ? 'bg-foreground' : 'bg-border',
                )}
              />
            )}
          </Fragment>
        ))}
      </ol>
      <div className="px-5 pb-4 pt-3 font-mono text-xs tracking-wider uppercase">
        <span className="text-muted-foreground">
          {String((current?.index ?? 0) + 1).padStart(2, '0')} ·{' '}
        </span>
        <span className="text-foreground">{current?.label}</span>
      </div>
    </nav>
  );
};

/** Rail vertical dans la première colonne, à partir de `md`. */
const BookingStepperRail = ({ progress, goToStep }: StepperProps) => (
  <div className="hidden md:flex md:col-start-1 md:row-start-2 md:flex-col md:overflow-y-auto md:min-h-0 bg-background">
    {progress.map(({ n, label, index, active, done, clickable }) => (
      <Button
        type="button"
        key={n}
        onClick={() => clickable && goToStep(n)}
        variant="rail"
        aria-pressed={active}
        aria-disabled={!clickable}
        // Le conteneur est `hidden md:flex` : toute classe sans préfixe `md:`
        // ne s'appliquerait qu'en dessous du palier, où l'élément n'existe pas.
        // Le filet entre étapes est porté par tous et retiré au dernier, plutôt
        // que calculé depuis l'index. `aria-disabled` est déjà posé : les
        // classes de l'état inaccessible le lisent plutôt que de le recalculer.
        className="group h-11 flex-none justify-start gap-3.5 border-b border-b-border px-6 text-left last:border-b-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-35"
      >
        <span
          className={cn(
            'min-w-5.5 font-mono text-xs tracking-widest group-aria-pressed:text-primary',
            // « Franchie » reste un ternaire : c'est de l'arithmétique d'index,
            // sans sémantique ARIA à porter. Le liseré et l'étape courante, eux,
            // viennent de `aria-pressed`.
            done ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {done ? '✓' : String(index + 1).padStart(2, '0')}
        </span>
        <span className="text-sm tracking-tight text-foreground group-aria-pressed:font-medium">
          {label}
        </span>
      </Button>
    ))}
  </div>
);

export { BookingStepperMobile, BookingStepperRail };
