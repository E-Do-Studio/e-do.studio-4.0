import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Le groupe de segments : choisir un élément parmi N, tous visibles à la fois.
// Onglets de session, pastilles de sous-date, grille des heures d'arrivée,
// types d'articles, stepper mobile.
//
// Cinq écritures pour ce geste, et surtout cinq façons de dire « celui-ci est
// choisi » : portée `dark` sur un wrapper, `bg-primary`, `dark
// border-foreground bg-background`, et un ternaire à quatre branches dans le
// stepper mobile. Seule la première inverse aussi les enfants ; les autres
// obligent à recolorier chaque descendant à la main.
//
// Ici l'état vit dans `aria-pressed` et le visuel dans la portée `dark`, comme
// partout ailleurs dans le système.

interface SegmentGroupProps {
  /** Nom accessible du groupe — il n'a pas d'intitulé visible. */
  label: string;
  children: ReactNode;
  /**
   * `row` — les segments se répartissent en ligne et se replient (le défaut).
   * `grid` — grille régulière ; les COLONNES viennent du `className`
   * (`grid-cols-5 sm:grid-cols-10`).
   *
   * Un `columns={n}` posant `gridTemplateColumns` en style inline a existé
   * ici. Il ne pouvait pas servir : la seule grille de segments du site passe
   * de 5 à 10 colonnes au point d'arrêt `sm`, et un style inline ne se
   * surcharge pas au point d'arrêt. Le reste du dépôt écrit ses grilles en
   * classes Tailwind — celle-ci n'a pas de raison d'y échapper.
   */
  layout?: 'row' | 'grid';
  className?: string;
}

export const SegmentGroup = ({
  label,
  children,
  layout = 'row',
  className,
}: SegmentGroupProps) => (
  <div
    role="group"
    aria-label={label}
    // La gouttière, pas la bordure : le conteneur est noir, les segments
    // peignent leur fond, le pixel noir transparaît. C'est le seul mécanisme
    // qui s'aligne sur les grilles de page.
    className={cn(
      'gap-px bg-border',
      layout === 'grid' ? 'grid' : 'flex flex-wrap',
      className,
    )}
  >
    {children}
  </div>
);

interface SegmentItemProps {
  children: ReactNode;
  selected: boolean;
  onSelect: () => void;
  /**
   * Indisponible — mais toujours focalisable.
   *
   * `aria-disabled` et non l'attribut `disabled` : un segment vraiment
   * désactivé sort de l'ordre de tabulation, et le motif du blocage devient
   * inatteignable au clavier. La grille des heures de `step-date` avait déjà
   * fait cette correction dans son coin, avec trois raisons bien écrites
   * (« créneau déjà réservé », « dépasse la fermeture ») qu'un `disabled`
   * aurait rendues muettes. C'est cette version-là qui devient la règle.
   *
   * Le clic est neutralisé ici, une fois, plutôt qu'au site d'appel.
   */
  unavailable?: boolean;
  /** Nom accessible, quand le contenu visible ne suffit pas à lui seul. */
  label?: string;
  /**
   * Le segment marque une POSITION plutôt qu'un choix — une étape dans un
   * tunnel, une page dans une pagination.
   *
   * Il pose alors `aria-current` et non `aria-pressed` : on ne « presse » pas
   * l'étape où l'on se trouve, on y est. Les deux attributs sont exclusifs,
   * sans quoi un lecteur d'écran annonce la même cellule deux fois, de deux
   * façons contradictoires.
   */
  current?: 'step' | 'page';
  className?: string;
}

export const SegmentItem = ({
  children,
  selected,
  onSelect,
  unavailable,
  label,
  current,
  className,
}: SegmentItemProps) => (
  <Button
    type="button"
    onClick={() => {
      if (unavailable) return;
      onSelect();
    }}
    aria-disabled={unavailable || undefined}
    aria-pressed={current ? undefined : selected}
    aria-current={current && selected ? current : undefined}
    aria-label={label}
    variant="cell"
    size="cell"
    className={cn(
      'min-h-tap items-center justify-center px-3.5 py-3 text-center',
      selected && 'dark bg-background',
      // Hachuré, comme les jours fermés du calendrier : un aplat gris dit
      // « secondaire » partout ailleurs dans le site, pas « fermé ». Le motif
      // vient de `@utility stripes` (`styles.css`) et vaut pour les deux, sinon
      // le même écran désigne un état indisponible de deux façons.
      //
      // `bg-background` explicite : `stripes` ne pose qu'un `background-image`,
      // il laisserait voir le fond de la variante en dessous.
      unavailable &&
        'stripes cursor-not-allowed bg-background text-muted-foreground',
      className,
    )}
  >
    {children}
  </Button>
);
