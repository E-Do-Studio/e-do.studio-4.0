import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChangeEvent, HTMLAttributes, ReactNode } from 'react';
import { useT } from '../i18n/use-t';

interface StepIntroProps {
  num: string;
  title: string;
  subtitle?: string;
  compact?: boolean;
}

const StepIntro = ({ num, title, subtitle, compact }: StepIntroProps) => (
  <div
    className={`${compact ? 'py-2.5 pb-2' : 'py-3 pb-2.5'} flex items-baseline gap-4 flex-wrap`}
  >
    <span className="font-mono text-xs font-normal uppercase tracking-widest text-primary shrink-0">
      {num} · {title}
    </span>
    {subtitle && (
      <span className="text-xs text-muted-foreground leading-snug flex-auto min-w-0">
        {subtitle}
      </span>
    )}
  </div>
);

interface CfgChoiceProps {
  idx?: number;
  on: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
  sub?: string;
}

// Tuile de configuration. `dark` sur l'état sélectionné inverse les tokens pour
// toute la tuile : les enfants gardent `text-muted-foreground` et rendent le
// gris clair adéquat, au lieu des cinq ternaires `on ? text-white/XX : …` que
// portait la version précédente.
const CfgChoice = ({ idx, on, onClick, label, desc, sub }: CfgChoiceProps) => (
  <Button
    variant="cell"
    size="cell"
    aria-pressed={on}
    onClick={onClick}
    className={cn(
      'group min-h-32 gap-1 p-5 sm:min-h-28 sm:p-3.5',
      on && 'dark bg-background',
    )}
  >
    <div className="flex w-full items-start justify-between">
      {idx != null && (
        <span className="font-mono text-xs tracking-widest text-muted-foreground">
          {String(idx).padStart(2, '0')}
        </span>
      )}
      {on ? (
        <span className="text-base leading-none text-primary">●</span>
      ) : (
        <span className="origin-right text-sm leading-none text-primary opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:scale-110 group-hover:opacity-100">
          →
        </span>
      )}
    </div>
    <div
      className={cn(
        'mt-0.5 origin-left text-balance text-base font-normal leading-tight tracking-tight transition-transform duration-200',
        !on && 'group-hover:scale-105',
      )}
    >
      {label}
    </div>
    {sub && (
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {sub}
      </div>
    )}
    {desc && (
      <div className="mt-auto text-pretty text-xs leading-normal text-muted-foreground">
        {desc}
      </div>
    )}
  </Button>
);

interface StepperBtnProps {
  onClick: () => void;
  children: ReactNode;
}

const StepperBtn = ({ onClick, children }: StepperBtnProps) => (
  <Button
    type="button"
    variant="outline"
    size="icon-sm"
    onClick={onClick}
    className="h-8 w-7.5 flex-none basis-8 border-border text-base normal-case tracking-normal transition-all hover:scale-105 hover:border-foreground"
  >
    {children}
  </Button>
);

interface BentoSlotTileProps {
  idx: number;
  on: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
  desc?: string;
  price: string;
  /** Remplace « Tarif HT » sous le montant. */
  hint?: string;
}

const BentoSlotTile = ({
  idx,
  on,
  onClick,
  label,
  sub,
  desc,
  price,
  hint,
}: BentoSlotTileProps) => {
  const t = useT();
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="cell"
      size="cell"
      aria-pressed={on}
      className={cn(
        'group min-h-44 min-w-0 gap-1.5',
        on && 'dark bg-background',
      )}
    >
      <div className="flex justify-between items-start">
        <span className="font-mono text-xs tracking-widest text-muted-foreground">
          {String(idx).padStart(2, '0')}
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
        {label}
      </div>
      {sub && (
        <div className="font-mono text-xs tracking-wider uppercase text-muted-foreground">
          {sub}
        </div>
      )}
      {desc && (
        <div className="text-sm text-muted-foreground leading-snug">{desc}</div>
      )}
      <div
        className={cn(
          'mt-auto pt-3 flex justify-between items-baseline border-t',
          on ? 'border-t-white/15' : 'border-t-border',
        )}
      >
        <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {hint || t('booking.rateExVat')}
        </span>
        <span className="text-base font-medium tabular-nums">{price}</span>
      </div>
    </Button>
  );
};

interface BentoFieldProps {
  label: string;
  children: ReactNode;
  /** Valeur de `grid-column`, pour les champs qui traversent la grille. */
  span?: string;
  error?: string;
}

// Cellule de formulaire du tunnel : le libellé coiffe le champ à l'intérieur
// de la cellule bento. `data-invalid` porte l'état d'erreur, que `Field` et
// `FieldError` savent lire — l'anneau rouge et le message sont posés par le
// composant, plus par des classes `ring-red-400` / `text-red-500` en ligne.
const BentoField = ({ label, children, span, error }: BentoFieldProps) => (
  <Field
    data-invalid={error ? true : undefined}
    className="min-h-11 gap-px bg-background px-4 py-2.5 data-[invalid=true]:ring-1 data-[invalid=true]:ring-destructive data-[invalid=true]:ring-inset sm:px-3 sm:py-1.5"
    {...(span ? { style: { gridColumn: span } } : {})}
  >
    <FieldLabel className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">
      {label}
    </FieldLabel>
    {children}
    {error && <FieldError>{error}</FieldError>}
  </Field>
);

interface BentoInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'number';
  name?: string;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  invalid?: boolean;
}

const BentoInput = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  name,
  autoComplete,
  inputMode,
  invalid,
}: BentoInputProps) => (
  <Input
    value={value || ''}
    onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    placeholder={placeholder}
    type={type}
    name={name}
    autoComplete={autoComplete}
    inputMode={inputMode}
    aria-invalid={invalid || undefined}
    className="h-auto w-full rounded-none bg-transparent p-0 font-sans text-sm tracking-tight focus-visible:ring-0"
  />
);

export {
  BentoField,
  BentoInput,
  BentoSlotTile,
  CfgChoice,
  StepIntro,
  StepperBtn,
};
