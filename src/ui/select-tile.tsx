import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MonoLabel } from './mono-label';

// La tuile d'un choix exclusif : plateau, durée, formule, nombre de vues.
//
// Cinq composants distincts rendaient le même squelette — numéro en haut à
// gauche, marqueur en haut à droite, titre, puis un pied séparé par un filet.
// `step-plateau.tsx` portait une recopie ligne à ligne de `BentoSlotTile` :
// même marqueur, même `text-3xl font-light tracking-tight mt-1`, même pied,
// même `border-t-white/15`. La seule différence réelle tient dans son pied, qui
// liste plusieurs tarifs au lieu d'un seul — d'où la prop `footer`.
//
// Deux détails que les copies avaient perdus en route :
//
//   — le marqueur. `CfgChoice` rendait la pastille en `text-base` et la flèche
//     de survol en `text-sm` : l'un chassait l'autre d'un pixel au survol. Ici
//     les deux font la même taille et occupent la même boîte.
//
//   — `border-t-white/15` sur le pied de la tuile sélectionnée. Sous portée
//     `dark`, `--foreground` EST déjà blanc : le ternaire ne servait à rien
//     qu'à sortir du système de tokens. `border-t-foreground/15` suffit et suit
//     l'inversion.

// Le retrait horizontal passe par `--tile-pad` plutôt que par un `px-*` direct :
// le filet du pied doit courir d'un bord à l'autre de la tuile, donc reprendre
// ce retrait en marge négative. Les deux valeurs sont liées par construction —
// changer la densité ne peut plus désaligner le trait.
//
// Il est CONSTANT, et il a quitté le variant `size` pour la base. Trois raisons :
//
//   — le retrait est une propriété de la COLONNE, pas du gabarit. Une tuile
//     posée en tête de grille longe le bord de la page : son retrait interne
//     décide où commence le texte, et doit donc valoir celui de la bande qui la
//     coiffe. Trois gabarits, trois retraits, c'était trois désalignements.
//
//   — il DÉCROISSAIT au point d'arrêt `sm` (20px → 14px pour `md`, 16 → 12 pour
//     `sm`). Un retrait qui rétrécit quand l'écran grandit : l'inverse de ce que
//     tout le reste du site fait.
//
//   — `--spacing-pad-cell` existait déjà dans `styles.css`, décrit comme « le
//     canon, déjà porté par size=cell », et n'était branché nulle part.
const selectTileVariants = cva(
  'group min-w-0 gap-1.5 px-[var(--tile-pad)] [--tile-pad:var(--spacing-pad-cell)]',
  {
    variants: {
      size: {
        sm: 'min-h-22 py-4 sm:min-h-18 sm:py-2.5',
        // UN plancher, pas deux. `md` en portait un second à `sm:` (112px), et
        // un plancher sous point d'arrêt ne se neutralise pas : l'appelant
        // écrivait `min-h-0`, tailwind-merge tient compte des modificateurs,
        // le `min-h-32` nu tombait et le `sm:min-h-28` restait debout. Il
        // débordait alors d'une rangée plus courte que lui — et comme le titre
        // est poussé au pied par `mt-auto`, c'est le titre qui était rogné.
        md: 'min-h-32 gap-1 py-5',
        lg: 'min-h-44 py-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// `break-words` : `text-balance` répartit les lignes, il n'empêche pas un MOT
// plus large que sa colonne de sortir de la cellule. « Horizontal » et
// « Cyclorama » étaient coupés net dans une colonne étroite. En dernier
// recours le mot se coupe — c'est moins mauvais qu'un texte tronqué.
const tileTitleVariants = cva('mt-0.5 block text-balance break-words', {
  variants: {
    size: {
      sm: 'text-sm font-normal leading-tight',
      md: 'text-base font-normal leading-tight tracking-tight',
      lg: 'text-2xl font-light tracking-tight',
    },
  },
  defaultVariants: { size: 'md' },
});

// La description suivait la taille du plus petit gabarit, quelle que soit la
// tuile. Sur une tuile `lg` de 180px de haut — celles des plateaux — `text-xs`
// est la taille d'une mention, pas celle d'une phrase qu'on lit.
//
// `pushed` : `mt-auto` ne va qu'au PREMIER bloc poussé en bas. Il était posé en
// dur sur la description ET sur le pied ; deux `mt-auto` frères dans une
// colonne flex ne poussent pas l'un des deux, ils se partagent l'espace restant
// — la description décollait du titre et flottait au milieu de la tuile. Les
// six tuiles de `step-duration` déclenchent les deux depuis toujours.
const tileDescVariants = cva('block text-pretty text-muted-foreground', {
  variants: {
    size: {
      sm: 'text-xs leading-normal',
      md: 'text-xs leading-normal',
      lg: 'text-sm leading-snug',
    },
    pushed: { true: 'mt-auto', false: '' },
  },
  defaultVariants: { size: 'md', pushed: false },
});

export interface TileFooterRow {
  label: string;
  value: string;
}

interface SelectTileProps extends VariantProps<typeof selectTileVariants> {
  /** Numéro déjà formaté — passer `ordinal(i)` de `lib/format`. */
  number?: string;
  title: string;
  // Il y avait ici un `marquee` qui faisait passer titre et sous-titre par
  // `HoverMarquee`. Son seul appelant était la rangée de machines de l'accueil,
  // et il y défaisait précisément ce que cette tuile sait faire : `HoverMarquee`
  // pose `whitespace-nowrap` + ellipse, donc il annulait le `break-words` du
  // titre et le `lines="multi"` du sous-titre. D'où « Horizo… » et « PACKSH… ».
  //
  // Il n'animait même pas là où ça se voyait : `HoverMarquee` ne défile que
  // derrière `(hover: hover) and (pointer: fine)`. Sur une tablette tactile le
  // texte restait tronqué, sans aucun moyen de le révéler. Un titre qui se
  // replie se lit sans qu'on ait à le survoler.
  /** Ligne mono capitale sous le titre. */
  sub?: string;
  /** Phrase descriptive, poussée en bas de la tuile. */
  desc?: string;
  /** Pied séparé par un filet : une ou plusieurs lignes libellé / valeur. */
  footer?: TileFooterRow[];
  /**
   * Le montant, posé en pied de tuile.
   *
   * Distinct de `footer`, qui est une GRILLE tarifaire — trois lignes
   * libellé / valeur sous un filet, comme sur les tuiles de plateau. Quand la
   * tuile n'a qu'un seul tarif et que c'est lui le critère de choix, un libellé
   * « Tarif HT » n'apprend rien et le filet coupe la tuile en deux pour rien :
   * le montant se lit seul.
   */
  price?: ReactNode;
  /**
   * Choix exclusif : la tuile porte `aria-pressed`. Absent, elle NAVIGUE — voir
   * `href`.
   */
  selected?: boolean;
  onSelect?: () => void;
  /**
   * Destination. La tuile devient une vraie ancre : clic milieu, « ouvrir dans
   * un nouvel onglet », et plus d'`aria-pressed` — on ne « presse » pas un lien.
   *
   * Les tuiles de la page d'accueil et du sélecteur de mode étaient redessinées
   * à la main faute de cette prop : même numéro, même flèche, même titre, mais
   * sans le `font-sans` ni la cible tactile que `size="cell"` apporte. Ajouter
   * la prop coûtait moins cher que la copie, et profite à tous les appelants.
   */
  href?: string;
  className?: string;
  children?: ReactNode;
}

export const SelectTile = ({
  number,
  title,
  sub,
  desc,
  footer,
  price,
  selected,
  size = 'md',
  onSelect,
  href,
  className,
  children,
}: SelectTileProps) => {
  // Rien après le sous-titre : c'est lui, avec le titre, qui forme le pied.
  //
  // `!!sub` en fait partie, et ce n'est pas une précision cosmétique : un titre
  // SEUL ne ferme rien, il est tout le contenu de la tuile. Poussé au pied, il
  // laissait un trou de la hauteur du plancher sous le numéro — et surtout, dans
  // une grille où certaines tuiles ont une description et d'autres non, il
  // tombait à la hauteur des descriptions pendant que les titres voisins
  // restaient en tête. Le catalogue des accessoires est exactement ce cas.
  const titleClosesTile =
    !!sub && !desc && !children && !price && !footer?.length;
  return (
    <Button
      render={
        href ? (
          // biome-ignore lint/a11y/useAnchorContent: Base UI clone cette ancre avec les enfants du bouton — elle n'est vide qu'à la lecture statique
          <a href={href} />
        ) : undefined
      }
      type={href ? undefined : 'button'}
      onClick={onSelect}
      variant="cell"
      size="cell"
      aria-pressed={href ? undefined : selected}
      className={cn(
        selectTileVariants({ size }),
        // `aria-pressed` porte la sémantique, `dark` porte le visuel : les
        // enfants gardent `text-muted-foreground` et rendent le gris clair
        // adéquat, au lieu des cinq ternaires de couleur des versions
        // précédentes.
        selected && 'dark bg-background',
        className,
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        {number && (
          <MonoLabel tone="muted" className="tabular-nums">
            {number}
          </MonoLabel>
        )}
        {/* Plus de pastille sur l'état choisi : l'inversion le dit déjà, et un
          rond orange par-dessus un fond inversé est un second signal pour une
          seule information. Ne reste que la flèche de survol — une affordance,
          pas un état — et elle prend la couleur du texte. */}
        {/* Sur une tuile de SÉLECTION, la flèche est une affordance : elle
          apparaît au survol. Sur une tuile qui NAVIGUE, elle dit où l'on va —
          elle reste visible, et ne fait que s'assombrir au survol. */}
        <ArrowRight
          aria-hidden
          className={cn(
            'ml-auto size-4 shrink-0 transition-all duration-150',
            href
              ? 'text-muted-foreground group-hover:text-foreground'
              : 'opacity-0 group-hover:opacity-100',
          )}
        />
      </span>

      {/* `mt-auto` sur le TITRE quand il ouvre le dernier bloc : le titre et son
        sous-titre reposent alors au pied de la tuile, sous le numéro et la
        flèche qui la coiffent. Sans ça, ils flottent au milieu — c'est ce que
        `justify-between` produisait sur les tuiles de la page d'accueil. */}
      <span
        className={cn(
          tileTitleVariants({ size }),
          titleClosesTile && 'mt-auto',
        )}
      >
        {title}
      </span>

      {sub && (
        <MonoLabel
          tone="muted"
          lines="multi"
          className={cn(
            // Un cran sous le `text-xs` de `MonoLabel`, et c'est de l'optique,
            // pas du caprice : ce libellé est en capitales monospace interlettré
            // à `tracking-widest`. Aucune descendante, aucune variation de
            // hauteur d'x, un chasse fixe — à 12px il pesait autant que le titre
            // en 16px sans, et occupait plus de largeur que lui. La hiérarchie
            // se lisait à l'envers.
            //
            // Ici et non dans `MonoLabel` : sa base sert plus de quatre-vingts
            // fichiers, où le libellé est seul dans sa cellule et n'a personne
            // à qui céder le pas.
            'block text-[11px]',
            // Deux lignes réservées quand le sous-titre ferme la tuile.
            //
            // Le titre est alors collé au bas par `mt-auto`, donc c'est la
            // HAUTEUR DU SOUS-TITRE qui décide où tombe le titre : sur la rangée
            // de machines de l'accueil, « Packshot à plat » tient sur une ligne
            // quand les trois autres en prennent deux, et « Horizontal »
            // descendait d'une ligne sous ses voisins. Les bas s'alignaient, les
            // titres non — et ce sont les titres que l'œil lit en rangée.
            //
            // `min-h` et non une hauteur fixe : c'est un plancher, un sous-titre
            // de trois lignes pousse toujours. `2lh` et non une valeur en pixels
            // — l'unité vaut l'interligne calculée de CE libellé, donc elle suit
            // `lines="multi"` sans qu'on ait à recopier `leading-snug` ici.
            titleClosesTile && 'min-h-[2lh]',
          )}
        >
          {sub}
        </MonoLabel>
      )}

      {desc && (
        <span
          className={tileDescVariants({
            size,
            pushed: !footer?.length && !price,
          })}
        >
          {desc}
        </span>
      )}

      {children}

      {price && <span className="mt-auto block pt-2">{price}</span>}

      {footer && footer.length > 0 && (
        // `-mx-[var(--tile-pad)]` puis `px-[var(--tile-pad)]` : le filet touche
        // les deux bords, le contenu garde son retrait. Un `border-t` posé dans
        // le flux normal s'arrête au padding et laisse un trait flottant.
        <span
          className={cn(
            'mt-auto -mx-[var(--tile-pad)] flex flex-col gap-1 border-t px-[var(--tile-pad)] pt-3',
            selected ? 'border-t-foreground/15' : 'border-t-border',
          )}
        >
          {footer.map((row) => (
            <span
              key={row.label}
              className="flex items-baseline justify-between gap-2 whitespace-nowrap"
            >
              <MonoLabel tone="muted" className="overflow-hidden text-ellipsis">
                {row.label}
              </MonoLabel>
              <span className="text-sm tabular-nums">{row.value}</span>
            </span>
          ))}
        </span>
      )}
    </Button>
  );
};
