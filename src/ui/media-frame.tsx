import { cva, type VariantProps } from 'class-variance-authority';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/utils';

// Le cadre d'un média : sa boîte positionnée, son ratio, son fond de réserve.
//
// Six appelants écrivaient les trois mêmes lignes — `relative overflow-hidden`
// sur un parent, `aspect-[…]` en valeur arbitraire, `absolute inset-0 h-full
// w-full object-cover` sur l'image — et aucun ne les écrivait tout à fait
// pareil : `bg-background` ici, `bg-muted` là, `min-h-0` sur deux d'entre eux,
// et cinq fractions de ratio différentes. `ResponsiveImage` absorbe désormais la
// troisième ligne, ce composant les deux premières.
//
// Il accepte n'importe quel enfant : `ResponsiveImage`, `VideoLoop`, l'`iframe`
// des embeds plateau, le SVG de repli des vignettes. Tous se posent déjà en
// `absolute inset-0` — c'est ce cadre qui leur donne la référence.
// `overflow-clip` et non `overflow-hidden`, et c'est mesuré.
//
// `hidden` fait du cadre un conteneur de défilement, dont la taille minimale
// automatique est zéro : la grille qui le contient cesse alors de compter sa
// hauteur déduite du ratio pour dimensionner sa rangée. Sur la couverture
// plateau à 1440×900, la rangée sortait à 583px pour une photo de 599 — 16px
// repeints par la bande de vignettes en dessous, et un ratio rendu à 1,37 au
// lieu de 1,33. Avec `clip`, la rangée mesure 599,25 et le ratio est exact.
//
// `clip` rogne exactement pareil et ne crée pas de conteneur de défilement.
const mediaFrameVariants = cva('relative overflow-clip', {
  variants: {
    // Les fractions vivent dans `styles.css` (`--aspect-*`), pas ici : une
    // grille de page a besoin de la même mesure que le cadre, et seul un token
    // se partage.
    // Le ratio d'un cadre qui REMPLIT une aire de grille suit forcément la
    // fenêtre : il vaut (rangées/colonnes) × (largeur de l'aire / sa hauteur).
    // Ces paliers valent donc pour le cadre qui se dimensionne lui-même — la
    // vignette de galerie, la cellule sous le palier `app` — et servent de base
    // que la page surcharge en `app:aspect-auto` là où elle remplit.
    ratio: {
      /** Portrait 4/5 — la vignette du site : galerie, mosaïque post-prod. */
      portrait: 'aspect-portrait',
      /** Paysage 4/3 — la couverture plateau. */
      photo: 'aspect-photo',
      /** Le cadre prend la hauteur de sa cellule, pour les bandes dont la
       *  hauteur est elle-même mesurée — la bande de vignettes du plateau. */
      fill: 'h-full min-h-0',
    },
    // Ce qui se voit avant que l'image ne peigne, et autour d'elle en
    // `fit="contain"`.
    tone: {
      /** Le gris de chargement. Une boîte vide se lit comme un trou. */
      muted: 'bg-muted',
      /** Le fond de la page : pour les cadres dont le vide reste visible une
       *  fois l'image chargée — un `contain`, un embed au ratio libre. */
      background: 'bg-background',
    },
  },
  defaultVariants: { ratio: 'portrait', tone: 'muted' },
});

type MediaFrameProps = useRender.ComponentProps<'div'> &
  VariantProps<typeof mediaFrameVariants>;

// `render` suit l'idiome du dépôt (`MonoLabel`, `StatusBadge`, `PageHeader`) :
// là où le cadre est lui-même cliquable — les vignettes de galerie et de
// post-prod ouvrent le lightbox — il devient le `Button variant="cell"` au lieu
// de s'imbriquer dedans. Une cellule cliquable et son cadre sont la même boîte.
export const MediaFrame = ({
  className,
  ratio,
  tone,
  render,
  ...props
}: MediaFrameProps) =>
  useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      { className: cn(mediaFrameVariants({ ratio, tone, className })) },
      props,
    ),
    render,
  });

export { mediaFrameVariants };
