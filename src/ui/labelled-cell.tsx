import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MonoLabel } from './mono-label';

// Le retrait horizontal d'une cellule de contenu, déclaré ici et consommé par
// `LabelledCell` comme par `KeyValueRow`.
//
// Quatre paliers et pas un de plus, parce que les cellules voisines d'une même
// colonne ne sont pas au même retrait et qu'une cellule désalignée de sa voisine
// à la jonction se voit : la colonne du plateau est à 16 délibérément, celles de
// contact à 24, et `none` sert les conteneurs qui portent déjà leur propre
// retrait (une grille en `gap-px`, le corps d'une page légale).
//
// Le barème vit dans ce fichier plutôt que dans `key-value-row.tsx` parce qu'il
// sert désormais les deux, et qu'une valeur écrite deux fois est un token.
export const cellPadVariants = cva('', {
  variants: {
    pad: {
      tight: '[--cell-pad:var(--spacing-pad-tight)]',
      cell: '[--cell-pad:var(--spacing-pad-cell)]',
      section: '[--cell-pad:var(--spacing-pad-section)]',
      none: '[--cell-pad:0px]',
    },
  },
  defaultVariants: { pad: 'cell' },
});

// « Un libellé mono muet, et le contenu qu'il coiffe. » Le rail de contact
// écrivait cette paire quatre fois — `<MonoLabel tone="muted" className="mb-5
// block">` dans une cellule en `p-6` — pour l'adresse, les fermetures, le
// téléphone et le repli des horaires.
//
// L'écart vaut `gap-3` et non les 20px de ces copies : c'est celui que
// `KeyValueList` porte déjà pour la même paire, et la cellule des horaires en
// affichait donc DEUX selon que la donnée était là ou non.
//
// `lines="multi"` appartient à la définition. Un libellé de cellule passe à la
// ligne — « PARC D'ACTIVITÉS VICTOR HUGO, BÂT. 6.7 » en fait deux dans un rail
// de 240px — et à `leading-none` les capitales de la seconde touchent la
// première. Le composant n'a pas à compter sur l'appelant pour s'en souvenir.
interface LabelledCellProps extends VariantProps<typeof cellPadVariants> {
  label: string;
  children: ReactNode;
  className?: string;
}

export const LabelledCell = ({
  label,
  pad,
  children,
  className,
}: LabelledCellProps) => (
  <div
    className={cn(
      'flex flex-col gap-3 px-[var(--cell-pad)]',
      cellPadVariants({ pad }),
      className,
    )}
  >
    <MonoLabel tone="muted" lines="multi">
      {label}
    </MonoLabel>
    {children}
  </div>
);
