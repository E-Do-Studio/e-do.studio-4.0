import { cva, type VariantProps } from 'class-variance-authority';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/utils';

// Le libellé mono capitale du site : catégories, méta d'article, intitulés de
// cellule, en-têtes de section. Il apparaît en clair dans plus de quatre-vingts
// fichiers, et Discovery en gardait sa propre constante privée.
//
// `leading-none` fait partie de la définition : ces libellés sont posés dans des
// cellules serrées où l'interligne par défaut décale la ligne de base. C'est
// aussi la seule différence avec le littéral employé ailleurs — une migration
// site par site demande donc un coup d'œil, pas un `sed`.
//
// Pas `Badge` : `badgeVariants` pose `h-5 rounded-4xl border px-2 py-0.5
// font-medium`, il faudrait en neutraliser neuf classes pour retomber sur du
// texte nu. Ces libellés sont du texte, pas des pastilles — `Badge` reste pour
// les vraies pastilles (`home-page.tsx`).
const monoLabelVariants = cva(
  'font-mono text-xs font-normal uppercase tracking-widest',
  {
    variants: {
      tone: {
        primary: 'text-primary',
        muted: 'text-muted-foreground',
        foreground: 'text-foreground',
        inherit: '',
      },
      // `leading-none` était dans la base, et c'est juste pour UN libellé d'une
      // ligne : l'interligne par défaut décalerait la ligne de base dans les
      // cellules serrées où ces libellés vivent.
      //
      // Ça ne l'est plus dès que le texte passe à la ligne — une mention légale,
      // un hint sous un intitulé, un sous-libellé de tuile étroite. À interligne
      // 1.0, les capitales de la seconde ligne touchent la première. Le composant
      // servait deux rôles avec la valeur d'un seul.
      lines: {
        single: 'leading-none',
        multi: 'leading-snug text-pretty',
      },
    },
    defaultVariants: {
      tone: 'foreground',
      lines: 'single',
    },
  },
);

// `render` suit l'idiome du dépôt (`DrawerClose`, `SocialLinksRow`,
// `MobileNavStrip`…) : le libellé peut devenir un `<dt>`, un `<legend>` ou un
// `<span>` selon le contexte sans dupliquer la typographie.
function MonoLabel({
  className,
  tone,
  lines,
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof monoLabelVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      { className: cn(monoLabelVariants({ tone, lines, className })) },
      props,
    ),
    render,
  });
}

export { MonoLabel, monoLabelVariants };
