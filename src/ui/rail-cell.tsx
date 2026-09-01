import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MonoLabel } from './mono-label';

// Le rail : la colonne de cellules qui commande le panneau voisin. Filtres de
// galerie, catégories Discovery, plateaux, prestations post-prod, sections
// juridiques, étapes du tunnel, questions du configurateur.
//
// Le site en comptait treize implémentations : cinq hauteurs de ligne, quatre
// paddings, trois tailles de titre, un rail sans aucun filet, et un numéro
// écrit `` `0${i+1}` `` qui casse au dixième élément.
//
// Ce composant remplace `FilterRailCell`, qui n'acceptait ni numéro ni
// sous-libellé alors que quatre des six rails en ont un. C'est ce qui
// garantissait que les quatre autres ne migreraient jamais.
//
// `variant="rail"` de `button.tsx` a été supprimé avec la migration : il posait
// un liseré orange là où l'état choisi passe par l'inversion (voir le site
// d'application plus bas). Cette cellule emploie `variant="cell"`, comme les
// tuiles et les segments.
//
// `border-b-border` et non `border-border` : la couleur d'UN SEUL côté. Les
// quatre côtés peindraient aussi le bord gauche, qui doit rester nu — c'est le
// filet de la grille qui l'occupe.
//
// Pas de `last:border-b-0` : le rail se ferme, comme toutes les grilles du
// site. La colonne est plus haute que sa liste — sous la dernière cellule il
// reste du blanc, et sans ce filet la liste s'y perdait au lieu de s'arrêter.
// Le modificateur ne tenait d'ailleurs que sur la moitié des rails : dès qu'un
// bloc suit les cellules (la note de contact du juridique, le « réinitialiser »
// de la galerie), la dernière cellule n'est plus `:last-child` et gardait son
// trait. Deux rails côte à côte ne se terminaient pas pareil.

const railCellVariants = cva(
  'group w-full flex-none border-b border-b-border text-left',
  {
    variants: {
      // Trois paliers, choisis par ce que la cellule contient — pas par le
      // padding qu'on lui donne. Les cinq hauteurs précédentes (32, 44, 62, 72,
      // 76px) naissaient de `py-2` ici et `py-3.5` là, sur des contenus à deux
      // ou trois lignes.
      //
      // Le padding vertical est calculé POUR atteindre le palier, il ne s'y
      // ajoute pas : une ligne de `text-sm` fait 20px, donc `py-1.5` (12px)
      // donne 32 et `py-3` (24px) donne 44. Un `py` plus généreux ferait
      // dépasser la cellule et le `min-h` ne servirait plus à rien — c'est
      // exactement comme ça que les cinq hauteurs précédentes sont nées.
      // Seul `tall` laisse le `min-h` gouverner : ses deux lignes ne suffisent
      // pas à remplir 72px.
      density: {
        compact: 'min-h-rail-compact gap-2 py-1.5',
        default: 'min-h-rail-default gap-2 py-3',
        tall: 'min-h-rail-tall gap-1 py-3',
      },
      // Le retrait horizontal a quitté la densité, qui décide d'une HAUTEUR.
      //
      // `rail` (16px) est la mesure d'une colonne étroite — la galerie, le
      // juridique, le tunnel. `cell` (20px) est `--spacing-pad-cell`, le canon
      // du site, et c'est celui qu'il faut dès que la cellule vit dans la
      // colonne de contenu au lieu du rail : les questions repliées du
      // configurateur y côtoient des `StepBand`, et 4px d'écart sur le bord
      // gauche courent alors sur toute la hauteur de l'accordéon.
      pad: {
        rail: 'px-4',
        cell: 'px-pad-cell',
      },
    },
    defaultVariants: { density: 'default', pad: 'rail' },
  },
);

// Le titre suit la densité, parce que la densité dit s'il a quelque chose en
// face de lui.
//
// À une ligne il est seul, `text-sm` suffit. À deux lignes il affronte un
// `MonoLabel`, et il perdait : mesuré sur le rail post-prod, le titre fait 14px
// contre 12px au sous-titre — il est bien le plus grand — mais le sous-titre est
// en CAPITALES (chaque glyphe à hauteur de capitale, quand « On model » vit à
// hauteur d'x), interlettré à +1.2px contre -0.35px, et il s'étale sur 208px
// contre 59px. Sur une ligne non choisie les deux portaient en plus exactement
// la même couleur. Le titre n'avait plus que ses 2px pour se défendre, et il les
// perdait : la mention se lisait comme le titre.
//
// D'où deux registres au lieu d'un — `text-base` et la couleur pleine, contre
// `text-xs` muet.
//
// La couleur pleine ne dépend plus de l'état, à aucune densité. Le libellé
// portait `text-muted-foreground` et ne passait au noir que sous
// `aria-pressed` : le contenu du rail était donc gris tant qu'on ne l'avait pas
// choisi — 4.6:1 sur blanc, AA d'un cheveu, pour ce qui EST la liste. Ce gris
// était le signal « choisi », et l'inversion le porte déjà tout entier ; garder
// les deux revenait à dire une fois la sélection et une fois l'absence de
// sélection. Ne reste que `dimmed`, qui dit autre chose : cette option-là ne
// donnerait aucun résultat.
const railLabelVariants = cva(
  'truncate tracking-tight transition-colors duration-150 ease-out',
  {
    variants: {
      density: {
        compact: 'text-sm',
        default: 'text-sm',
        tall: 'text-base',
      },
    },
    defaultVariants: { density: 'default' },
  },
);

interface RailCellProps extends VariantProps<typeof railCellVariants> {
  /** Numéro d'ordre déjà formaté — passer `ordinal(i)` de `lib/format`. */
  number?: string;
  label: string;
  /** Troisième ligne : tarif, tagline, résumé. Impose `density="tall"`. */
  sub?: string;
  /** Compteur ou marqueur poussé à droite par `justify-between`. */
  trailing?: ReactNode;
  active: boolean;
  /** Option sans résultat sous le filtre voisin : atténuée, pas désactivée. */
  dimmed?: boolean;
  onSelect?: () => void;
  /** Une destination plutôt qu'une bascule : `aria-current` au lieu d'`aria-pressed`. */
  href?: string;
  className?: string;
}

export const RailCell = ({
  number,
  label,
  sub,
  trailing,
  active,
  dimmed,
  density,
  pad,
  onSelect,
  href,
  className,
}: RailCellProps) => {
  // Une destination et une bascule ne portent pas le même état. `aria-pressed`
  // sur un lien de navigation annoncerait « bouton enfoncé » là où l'utilisateur
  // a changé de page ; `aria-current="page"` dit « vous êtes ici ». Le variant
  // `rail` lit les deux, mais il faut encore poser le bon.
  const isLink = href != null;

  return (
    <Button
      render={
        isLink ? (
          // biome-ignore lint/a11y/useAnchorContent: Base UI clone cette ancre avec les enfants du bouton — elle n'est vide qu'à la lecture statique
          <a href={href} />
        ) : undefined
      }
      type={isLink ? undefined : 'button'}
      onClick={onSelect}
      aria-current={isLink && active ? 'page' : undefined}
      aria-pressed={isLink ? undefined : active}
      variant="cell"
      size="cell"
      className={cn(
        railCellVariants({ density, pad }),
        // L'inversion, et non un liseré. L'ancien `variant="rail"` posait une
        // barre orange de 2px sur le bord gauche — une seconde ligne, d'une
        // seconde épaisseur et d'une seconde couleur, sur un bord que le filet
        // noir de la grille occupe déjà. Elle flottait sans s'aligner sur rien.
        //
        // Elle masquait surtout un défaut : `hover` et `aria-pressed` posaient
        // TOUS DEUX `bg-muted`. Une cellule survolée et une cellule choisie
        // étaient donc identiques, et la barre était le seul distinguo. La
        // retirer imposait de toute façon de trouver un vrai signal.
        //
        // L'inversion est celui que le système emploie déjà partout ailleurs —
        // `SelectTile`, `SegmentItem`, les onglets de session. Le rail cesse
        // d'être un cas particulier, et l'orange retrouve un emploi qui veut
        // dire quelque chose : le numéro, à 6.24:1 sur le fond sombre.
        active && 'dark bg-background',
        dimmed && 'opacity-30',
        className,
      )}
    >
      <span className="flex w-full min-w-0 items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-2">
          {number && (
            // `tabular-nums` : les numéros s'alignent d'eux-mêmes en colonne.
            // Deux rails posaient une largeur fixe arbitraire (`w-7`,
            // `min-w-5.5`) pour obtenir ce que la fonte fait gratuitement.
            //
            // Pas de couleur d'accent sur l'état choisi : l'inversion suffit à
            // le dire. Un chiffre orange par-dessus un fond déjà inversé, c'est
            // un second signal pour une seule information.
            //
            // `transition-colors` : le fond de la cellule s'estompe déjà sur
            // 150ms (base de `Button`), mais les deux libellés n'avaient aucune
            // transition et claquaient par-dessus. Ce n'est pas une animation
            // qu'on ajoute, c'est celle qui existe qu'on termine.
            <MonoLabel
              tone="muted"
              className="shrink-0 tabular-nums transition-colors duration-150 ease-out"
            >
              {number}
            </MonoLabel>
          )}
          <span className={cn(railLabelVariants({ density }))}>{label}</span>
        </span>
        {trailing}
      </span>
      {sub && (
        <MonoLabel tone="muted" className="mt-auto truncate">
          {sub}
        </MonoLabel>
      )}
    </Button>
  );
};

interface RailHeaderProps extends Pick<RailCellProps, 'pad'> {
  label: string;
}

// Exporté séparément parce qu'un rail peut porter PLUSIEURS sections : la
// galerie empile « Catégories » puis « Plateaux » dans une seule colonne. Un
// `label` unique sur le conteneur ne couvrirait que le cas à une section.
//
// La bande reprend le palier et le retrait de la cellule qu'elle coiffe. Elle
// portait `pb-1 pt-2` et aucun plancher : 25px de haut contre 33 aux cellules,
// et un libellé décentré vers le bas de 4px, dans une colonne dont tout le reste
// est réglé au token. Le rythme vertical du rail cassait à chaque section.
//
// Elle ne risque pas de se lire comme une rangée pour autant : capitales mono
// muettes contre `text-sm` pleine couleur, l'écart de registre est plus large
// depuis que le libellé a cessé d'être gris.
export const RailHeader = ({ label, pad }: RailHeaderProps) => (
  // La MÊME `cva` que la cellule qu'elle coiffe, et pas une recopie de ses
  // mesures : c'est ce qui garantit que la bande et les rangées partagent leur
  // palier et leur retrait, quel que soit le `pad`. Elle en portait sa propre
  // écriture, à `pb-1 pt-2` et sans plancher — 25px contre 33 aux cellules.
  <div
    className={cn(
      railCellVariants({ density: 'compact', pad }),
      'flex shrink-0 items-center bg-background',
    )}
  >
    <MonoLabel tone="muted">{label}</MonoLabel>
  </div>
);

type RailProps = useRender.ComponentProps<'aside'> & {
  /** Raccourci pour un rail à section unique. Sinon, poser des `RailHeader`. */
  label?: string;
};

// `render` suit l'idiome du dépôt (`MediaFrame`, `MonoLabel`, `StatusBadge`).
// Il existe pour le rail du tunnel, qui EST la navigation du tunnel : le rendre
// en `<aside>` le rétrograde de « navigation » à « complémentaire » et lui ôte
// son nom accessible. C'était la treizième implémentation restée dehors, et la
// seule raison qu'elle avait de le rester.
export const Rail = ({
  children,
  label,
  className,
  render,
  ...props
}: RailProps) =>
  useRender({
    defaultTagName: 'aside',
    props: mergeProps<'aside'>(
      {
        className: cn(
          'flex min-h-0 flex-col overflow-y-auto bg-background',
          className,
        ),
        children: (
          <>
            {label && <RailHeader label={label} />}
            {children}
          </>
        ),
      },
      props,
    ),
    render,
  });
