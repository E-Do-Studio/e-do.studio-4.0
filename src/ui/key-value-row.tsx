import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { cellPadVariants } from './labelled-cell';
import { MonoLabel } from './mono-label';

// La ligne « libellé à gauche, valeur à droite » : horaires d'ouverture,
// caractéristiques d'un plateau, grille tarifaire, récapitulatif de
// confirmation, liste de définitions légale, équipe, récap du chatbot.
//
// Huit écritures, dont deux à trois lignes d'écart dans `plateau-page.tsx` —
// les caractéristiques portaient `gap-3` et `line-clamp-2`, les tarifs juste en
// dessous ne les avaient pas, et rien ne justifiait l'écart.
//
// `<dl>` plutôt qu'une pile de `<div>` : ce sont des paires nom / valeur, et
// c'est ce que la sémantique HTML nomme. Aucune des huit copies ne le disait.

// Le retrait horizontal appartient à la LIGNE, pas à la cellule qui l'accueille.
// C'est l'inverse de ce qui était écrit, et c'est ce qui faisait flotter le
// filet : la cellule portait `px-4`, le `<dl>` vivait dans ce retrait, et son
// `border-b` s'arrêtait donc à 16px des deux bords. Un filet qui ne touche pas
// les bords de sa cellule ne sépare rien — il dessine une boîte de plus.
//
// La variable est déclarée par la liste et consommée par la ligne, comme
// `--tile-pad` dans `select-tile.tsx`. La cellule appelante, elle, ne garde qu'un
// retrait VERTICAL.
//
// Le barème lui-même vit dans `labelled-cell.tsx` : il sert les deux composants,
// et une valeur écrite deux fois est un token.

// L'orientation empilée existe pour une raison précise, et pas seulement
// esthétique : le récapitulatif de confirmation écrivait ce libellé mono huit
// fois de suite dans le même fichier, au-dessus de sa valeur. Même paire nom /
// valeur, même sémantique — seul l'axe change.
//
// Elle ne porte JAMAIS de filet, quoi que demande l'appelant : ces cellules
// vivent dans une grille en `gap-px bg-border`, qui dessine déjà toutes les
// coutures. Un `border-b` posé ici viendrait s'ajouter à la gouttière, pas la
// remplacer. C'est le défaut rencontré quatre fois dans cette migration — une
// couture, un propriétaire.
//
// `columns` est la liste de définitions : la valeur reste alignée à GAUCHE dans
// sa colonne, c'est ce qui rend une suite de mentions légales scannable. Elle
// s'empile sous `md` — 224px de colonne de libellé sur un écran de 390 ne
// laissent pas de place à la valeur.
//
// La hauteur vient des paliers de rail de `styles.css`, pas d'un `py-*` inventé
// ici : c'est la même question de densité, déjà arbitrée là-bas en trois crans.
// `columns` en est exempte — une mention légale fait deux ou six lignes, un
// plancher n'y décrit rien.
const keyValueRowVariants = cva('', {
  variants: {
    orientation: {
      // `items-center` et non `items-baseline` : sous un plancher de hauteur, un
      // alignement par la ligne de base colle le contenu en haut et laisse le
      // vide en dessous. Le centrage n'est optiquement juste que si les deux
      // côtés partagent leur interligne — d'où le `leading-snug` de la valeur et
      // le `lines="multi"` du libellé, plus bas.
      row: 'flex items-center justify-between gap-3 px-[var(--cell-pad)]',
      columns:
        'flex flex-col gap-1 px-[var(--cell-pad)] md:grid md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-baseline md:gap-5',
      stacked: 'flex flex-col gap-1',
    },
    density: {
      tight: 'text-xs',
      default: 'text-sm',
    },
    rule: {
      true: 'border-b border-border last:border-b-0',
      false: '',
    },
  },
  compoundVariants: [
    { orientation: 'row', density: 'tight', className: 'py-1.5' },
    { orientation: 'row', density: 'default', className: 'py-2' },
    { orientation: 'columns', density: 'tight', className: 'py-2' },
    { orientation: 'columns', density: 'default', className: 'py-2.5' },
    // Le plancher vient AVEC le filet, et seulement avec lui : il existe pour
    // que les traits tombent sur un rythme régulier et que la ligne reste
    // atteignable au doigt. Une ligne sans filet ne rythme rien et n'est pas une
    // cible — dans une carte de conversation, le plancher la ferait bâiller.
    //
    // Le `py-*` accompagne le plancher, il ne le remplace pas : une valeur qui
    // passe à deux lignes dépasse les 32px et viendrait toucher le trait.
    {
      orientation: 'row',
      density: 'tight',
      rule: true,
      className: 'min-h-rail-compact',
    },
    {
      orientation: 'row',
      density: 'default',
      rule: true,
      className: 'min-h-rail-default',
    },
  ],
  defaultVariants: { orientation: 'row', density: 'default', rule: true },
});

interface KeyValueRowProps
  extends Omit<VariantProps<typeof keyValueRowVariants>, 'rule'> {
  /**
   * Une chaîne prend la typographie mono du système. Un nœud est rendu tel
   * quel : deux sites d'appel ont un libellé COMPOSITE — nom et rôle empilés
   * pour l'équipe, plateau, date et heure pour le récap du chatbot — et
   * l'enfermer dans un `MonoLabel` les mettrait en capitales. Le `<dt>`, le
   * filet, la hauteur et le retrait restent au composant dans les deux cas.
   */
  label: ReactNode;
  value: ReactNode;
  /** Valeur en chiffres : `tabular-nums` pour qu'elles s'alignent en colonne. */
  numeric?: boolean;
  /**
   * Le filet sous la ligne. À couper quand une bordure ou une gouttière voisine
   * dessine déjà la couture — une carte de conversation, la grille de dates du
   * panneau de devis.
   */
  rule?: boolean;
  className?: string;
}

export const KeyValueRow = ({
  label,
  value,
  orientation = 'row',
  density,
  numeric,
  rule = true,
  className,
}: KeyValueRowProps) => {
  const stacked = orientation === 'stacked';
  return (
    <div
      className={cn(
        keyValueRowVariants({
          orientation,
          density,
          rule: stacked ? false : rule,
        }),
        className,
      )}
    >
      {typeof label === 'string' ? (
        <MonoLabel
          render={<dt />}
          tone="muted"
          lines={stacked ? 'single' : 'multi'}
          className="min-w-0"
        >
          {label}
        </MonoLabel>
      ) : (
        <dt className="min-w-0">{label}</dt>
      )}
      <dd
        className={cn(
          'm-0 text-foreground',
          // Empilée ou en colonnes, la valeur occupe la largeur et s'aligne à
          // gauche ; en ligne, elle est poussée à droite et ne se comprime pas.
          orientation === 'row'
            ? 'shrink-0 text-right leading-snug'
            : 'min-w-0',
          numeric && 'tabular-nums',
        )}
      >
        {value}
      </dd>
    </div>
  );
};

interface KeyValueListProps extends VariantProps<typeof cellPadVariants> {
  /**
   * Le libellé qui coiffe la liste — « TARIFS HT », « HORAIRES ». Il appartient
   * au composant parce qu'il doit partager le retrait des lignes : laissé à
   * l'appelant, la mesure s'écrivait deux fois par cellule et pouvait dériver.
   */
  heading?: string;
  children: ReactNode;
  className?: string;
}

export const KeyValueList = ({
  heading,
  pad,
  children,
  className,
}: KeyValueListProps) => {
  // `<dl>` n'accepte que `dt`, `dd`, `div` et `template` : le libellé de tête
  // reste donc DEHORS, dans une boîte qui porte le retrait et que le `<dl>`
  // hérite. `className` va toujours à la racine du composant.
  if (!heading) {
    return (
      <dl
        className={cn('m-0 flex flex-col', cellPadVariants({ pad }), className)}
      >
        {children}
      </dl>
    );
  }
  return (
    <div
      className={cn('flex flex-col gap-3', cellPadVariants({ pad }), className)}
    >
      <MonoLabel tone="muted" lines="multi" className="px-[var(--cell-pad)]">
        {heading}
      </MonoLabel>
      <dl className="m-0 flex flex-col">{children}</dl>
    </div>
  );
};
