import { cva, type VariantProps } from 'class-variance-authority';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/utils';
import { monoLabelVariants } from './mono-label';

// La pastille d'état : « Nouveau », « Confirmé », « Vidéo », un compteur de
// filtres actifs.
//
// Sept étaient dessinées à la main pour deux usages du `Badge` de shadcn — et
// `Badge` n'était pas le bon outil : ses `badgeVariants` posent `h-5
// rounded-4xl border px-2 py-0.5 font-medium`, dont il faut neutraliser six
// classes pour retomber sur la pastille carrée du site. `font-medium` est en
// plus une graisse qu'ABC Favorit ne livre pas.
//
// L'une des sept, `assistant-chat.tsx:977`, portait `rounded-sm shadow-md` :
// le seul rayon effectif et la seule ombre d'un design dont `--radius` vaut 0
// et qui n'a pas d'ombre.

// La typographie vient de `monoLabelVariants`, elle n'est pas réécrite : une
// pastille est un libellé mono capitale posé sur un fond. La recopier ici aurait
// fait une seizième signature — exactement ce que ce composant existe pour
// éviter.
const statusBadgeVariants = cva(
  cn(
    monoLabelVariants({ tone: 'inherit' }),
    // `whitespace-nowrap` : une pastille qui passe à la ligne paraît cassée —
    // son fond se scinde en deux blocs décalés. « 1 message », « En attente »
    // ou un libellé traduit plus long y étaient exposés.
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap',
  ),
  {
    variants: {
      tone: {
        primary: 'bg-primary text-primary-foreground',
        // Contour noir, pas orange. L'orange est réservé aux surfaces pleines —
        // le pavé d'action, la pastille d'état. En contour il redevient un
        // liseré d'accent, c'est-à-dire le motif qu'on vient de retirer partout
        // ailleurs.
        outline: 'border border-foreground text-foreground',
        muted: 'bg-muted text-muted-foreground',
        /** Surimpression sur un média : le fond doit laisser voir l'image. */
        overlay: 'bg-background/55 text-foreground',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-3 py-1.5 text-xs',
        /** Compteur : carré, largeur minimale égale à la hauteur. */
        count: 'h-5 min-w-5 px-1 text-xs',
      },
    },
    defaultVariants: { tone: 'primary', size: 'sm' },
  },
);

type StatusBadgeProps = useRender.ComponentProps<'span'> &
  VariantProps<typeof statusBadgeVariants>;

// `render` suit l'idiome du dépôt (`MonoLabel`, `DrawerClose`, `SocialLinksRow`)
// : la pastille peut devenir un `<output>` ou porter `role="status"` sans
// dupliquer sa typographie.
export const StatusBadge = ({
  className,
  tone,
  size,
  render,
  ...props
}: StatusBadgeProps) =>
  useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      { className: cn(statusBadgeVariants({ tone, size, className })) },
      props,
    ),
    render,
  });
