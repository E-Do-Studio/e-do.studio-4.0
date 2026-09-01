import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageHeader, type PageHeaderProps } from './page-header';

interface PageShellProps extends Pick<PageHeaderProps, 'note' | 'aside'> {
  /**
   * Le gabarit du bento, et rien d'autre : `app:grid-cols-[…]`,
   * `app:grid-rows-[…]`, et le gabarit sous le palier quand la page en a un.
   * Chaque cellule porte son propre placement.
   *
   * Il reste ici, dans la page, et pas dans une variante `cva` de ce fichier.
   * Un `columns="rail"` obligerait contact-page à savoir qu'il existe une
   * quatrième piste pour que son `app:col-start-4` se lise : le gabarit et les
   * placements sont une seule phrase, la couper en deux fichiers rend les deux
   * moitiés illisibles. Et la duplication ne coûte rien puisque les gabarits
   * sont écrits en tokens partagés — le jour où l'alignement bouge, c'est
   * `--spacing-logo` qui bouge et les cinq copies suivent.
   */
  className?: string;
  children: ReactNode;
}

/**
 * La coquille commune aux douze pages : une grille dont les filets sont des
 * gouttières, verrouillée sur le viewport à partir d'`app`, coiffée de la bande
 * d'en-tête.
 *
 * Le `<div>` rendu EST la grille de la page — pas une boîte de plus. Sans quoi
 * `display:contents`, `col-span-full` et tous les `app:col-start-*` des cellules
 * viseraient la mauvaise grille.
 *
 * Elle ne rend PAS le `<main>` : huit pages le posent en `contents` (la grille
 * exige que l'en-tête et le contenu soient frères, cf. home-page), deux en font
 * une vraie cellule, deux n'en avaient aucun. Un booléen ferait dépendre la
 * position d'un repère d'accessibilité d'une prop ; la page pose le sien.
 */
export const PageShell = ({
  note,
  aside,
  className,
  children,
}: PageShellProps) => (
  <div
    className={cn(
      // `gap-px bg-border` : le conteneur est noir, les cellules peignent leur
      // fond. Le verrou est gardé par `app:` seul — sous le palier, __root.tsx
      // rend la main au défilement et la page s'empile.
      //
      // `grid-cols-[minmax(0,1fr)]` sans palier : la colonne unique de la pile
      // mobile. Ce n'est pas la réécriture du défaut implicite — une piste
      // `auto` prend la taille minimale de son contenu et déborde donc en
      // largeur dès qu'une cellule ne peut pas se réduire, quand `minmax(0,1fr)`
      // la force à céder. Huit pages s'en remettaient à l'implicite, une seule
      // écrivait cette ligne ; c'est un invariant, il appartient à la coquille.
      // Une page qui veut autre chose l'écrase (l'accueil pose `grid-cols-2`).
      'grid w-full grid-cols-[minmax(0,1fr)] gap-px bg-border app:h-full app:overflow-hidden',
      className,
    )}
  >
    {/* Placement en dur : onze appelants en écrivaient dix copies littérales et
        une divergente — `app:col-start-1 app:col-span-2` sur la confirmation,
        qui disait déjà `col-span-full` deux classes plus tôt. */}
    <PageHeader
      note={note}
      aside={aside}
      className="col-span-full app:row-start-1"
    />
    {children}
  </div>
);
