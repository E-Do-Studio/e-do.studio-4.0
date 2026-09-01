import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Le bandeau d'une hauteur de cran : le titre d'une étape du tunnel, le nom du
// plateau qu'on configure, le rappel du créneau en cours.
//
// Il vivait recopié six fois, à l'identique — la même chaîne de cent trente
// caractères dans `book-page` (trois fois), `step-plateau`, `step-contact`,
// `step-date`. Aucune n'était fausse le jour où elle a été écrite ; elles le
// deviennent le jour où l'une des six change.
//
// `min-h-11` n'est pas un padding choisi au jugé : c'est `--spacing-tap`, la
// MÊME mesure que `--spacing-rail-default`, la hauteur d'une cellule du rail de
// gauche. Les filets des deux colonnes tombent donc en face les uns des autres
// — c'est la seule raison pour laquelle ce composant impose une hauteur plutôt
// que de la laisser au contenu. Un bandeau qui s'en écarte casse la
// correspondance sur toute la hauteur de l'écran, et ça se voit.
//
// `py-3 md:py-0` : sous `md` le contenu se replie et a besoin de respirer ;
// au-delà, il tient sur une ligne et c'est `min-h-11` qui gouverne. Les deux
// donnent 44px pour une ligne unique.
interface StepBandProps {
  children: ReactNode;
  /**
   * Reste visible en tête de la zone qui défile.
   *
   * À poser sur le titre d'étape, jamais sur deux bandeaux à la fois : deux
   * `sticky top-0` se superposent, et c'est le plus loin dans le DOM qui gagne
   * — l'étape date avait perdu ainsi le nom du plateau, l'information la plus
   * utile des deux.
   */
  sticky?: boolean;
  className?: string;
}

export const StepBand = ({ children, sticky, className }: StepBandProps) => (
  <div
    className={cn(
      'box-border flex min-h-11 shrink-0 flex-wrap items-center gap-3 border-b border-border bg-background px-pad-cell py-3 md:min-h-11 md:py-0',
      sticky && 'sticky top-0 z-10',
      className,
    )}
  >
    {children}
  </div>
);
