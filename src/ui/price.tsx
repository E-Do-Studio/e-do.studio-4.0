import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { MonoLabel } from './mono-label';

// Le montant. Six signatures typographiques coexistaient pour le même rôle, et
// elles divergeaient sur le seul point qui compte vraiment : `tabular-nums`
// manquait aux DEUX plus gros chiffres du site (`postprod-page.tsx:547` et
// `step-duration.tsx:97`), ceux qu'on lit en colonne et qui sautent d'un cran
// à chaque changement de chiffre.
//
// `tabular-nums` fait partie de la définition, pas des options. Un prix qui
// danse pendant qu'on incrémente une quantité est un prix qu'on relit.

// L'échelle sautait de `text-base` à `text-3xl` : rien entre 16 et 30px, alors
// que c'est exactement la mesure d'un prix dans une tuile de choix — assez fort
// pour porter la décision, pas assez pour écraser le titre de la section qui
// contient la tuile.
//
// L'échelle est CONTINUE, sans trou, mais les noms ne désignent plus une classe
// Tailwind : elle a été descendue d'un cran au-dessus de 24px, la précédente
// écrasant tout ce qui l'entourait. Lire les valeurs ci-dessous, pas le nom.
const priceVariants = cva('tabular-nums', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-xl font-light leading-none tracking-tighter',
      xl: 'text-2xl font-light leading-none tracking-tighter',
      '2xl': 'text-4xl font-light leading-none tracking-tighter',
    },
  },
  defaultVariants: { size: 'md' },
});

interface PriceProps extends VariantProps<typeof priceVariants> {
  /**
   * Montant déjà formaté, symbole compris — `` `${fmtEUR(n, lang)} €` ``.
   *
   * Le « € » appartient à la valeur et se lit à sa taille : c'est ce que font
   * déjà tous les sites du tunnel, et un euro rapetissé sous un montant en
   * `text-3xl` ne ressemble plus à un prix.
   */
  value: string;
  /** « À partir de », rendu en mono capitale avant le montant. */
  from?: string;
  /**
   * Le QUALIFICATIF, pas le symbole : « / image », « par jour », « HT ». Il
   * vient souvent du CMS (`PPPrice.unit`, bilingue) et se lit comme une
   * mention — d'où sa taille propre, indépendante de celle du montant.
   */
  unit?: string;
  className?: string;
}

export const Price = ({ value, from, unit, size, className }: PriceProps) => (
  // `gap-2.5` : la même gouttière que les autres compositions du système
  // (`StepHeading`, `CtaCell`). `flex-wrap` parce que « À partir de 1 250 € par
  // jour » ne tient pas sur une ligne dans une cellule étroite.
  <span
    className={cn('inline-flex flex-wrap items-baseline gap-2.5', className)}
  >
    {from && <MonoLabel tone="muted">{from}</MonoLabel>}
    <span className={priceVariants({ size })}>{value}</span>
    {unit && <span className="text-sm opacity-70">{unit}</span>}
  </span>
);
