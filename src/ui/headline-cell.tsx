import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LabelledCell, type cellPadVariants } from './labelled-cell';
import { sectionTitleVariants } from './section-intro';
import type { VariantProps } from 'class-variance-authority';

// « Une cellule dit UNE chose, et la précise. »
//
// C'est la forme que les cellules du rail de contact avaient prise une par une :
// un libellé mono, la réponse au registre « titre de cellule », et sous elle des
// lignes de précision en gris. L'adresse et le contact l'écrivaient déjà, chacun
// avec sa copie de `sectionTitleVariants(...) + text-foreground` et de
// `text-sm leading-snug text-muted-foreground` — les horaires auraient été la
// troisième.
//
// Elle existe surtout parce qu'elle remplace un TABLEAU là où il n'a pas la place
// de fonctionner. Les horaires passaient par `KeyValueRow` : libellé collé au
// bord gauche, valeur poussée au bord droit, un vide au milieu. Dans les 192px
// utiles d'un rail de 240, l'œil fait du ping-pong entre deux bords pour
// rapprocher deux mots qui forment une seule phrase — et un filet entre les
// rangées découpait en deux enregistrements ce qui est un seul fait : l'horaire
// du studio. Une paire nom/valeur a besoin de largeur ; une réponse et ses
// nuances n'en ont pas besoin.
interface HeadlineCellProps extends VariantProps<typeof cellPadVariants> {
  /** Le libellé mono qui nomme la cellule. */
  label: string;
  /**
   * La seule chose que la cellule dit. Le registre vient du variant partagé, il
   * n'est pas recopié — un nœud passé ici hérite du corps, de la graisse et de
   * l'interlettrage, et peut n'imposer que sa couleur (le téléphone est un lien).
   */
  headline: ReactNode;
  /** `sm` (24px) pour un fait, `xs` (20px) pour une action. */
  size?: 'sm' | 'xs';
  /** Les nuances, sous la réponse : lignes d'adresse, plages secondaires. */
  details?: ReactNode;
  /** Ce qui suit encore, à son propre registre : les lignes de métro. */
  children?: ReactNode;
  className?: string;
}

// L'écart appartient à la CELLULE, et à elle seule : `gap-2` entre la réponse et
// ses nuances, dans les trois cellules du rail. Un contenu qui apporterait en
// plus sa propre hauteur — un plancher tactile, par exemple — s'ajouterait à cet
// écart au lieu de le remplacer, et la cellule afficherait un rythme différent
// de ses voisines. Le padding d'une densité se calcule POUR atteindre son
// palier, il ne s'y ajoute pas : une cible tactile passe donc par une zone de
// clic étendue (`after:-inset-*`, l'idiome de `switch.tsx`), qui ne déplace rien.
export const HeadlineCell = ({
  label,
  headline,
  size = 'sm',
  details,
  pad,
  children,
  className,
}: HeadlineCellProps) => (
  <LabelledCell label={label} pad={pad} className={className}>
    <div className="flex flex-col gap-2">
      <span className={cn(sectionTitleVariants({ size }), 'text-foreground')}>
        {headline}
      </span>
      {details && (
        <div className="text-sm leading-snug text-muted-foreground">
          {details}
        </div>
      )}
    </div>
    {children}
  </LabelledCell>
);
