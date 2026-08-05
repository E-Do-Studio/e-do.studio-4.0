import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Adaptation à l'identité e-do : mono capitales à fort interlettrage au lieu du
// `text-sm font-medium` de shadcn. `rounded-lg` est conservé tel quel — il résout
// vers `var(--radius)`, à 0 dans styles.css, donc le bouton sort carré sans
// override. Idem pour l'anneau de focus : `--ring` est l'orange de marque.
//
// Deux variantes propres au site s'ajoutent aux variantes shadcn :
//   `cell`   — la cellule bento cliquable, forme dominante du site. Son état
//              sélectionné passe par `aria-pressed`, pas par un ternaire au site
//              d'appel.
//   `header` — l'action pleine hauteur des en-têtes de page.
// Chacune a une taille homonyme : `variant` porte le rôle, `size` la géométrie.
const buttonVariants = cva(
  // `border border-transparent bg-clip-padding` a été retiré de la base.
  //
  // `bg-clip-padding` clippe le fond à la boîte de padding : l'anneau
  // transparent de 1px laissait donc voir ce qu'il y a DERRIÈRE le bouton. Sur
  // ce site, derrière un bouton il y a la gouttière `bg-border` — du noir. Le
  // défaut est apparu six fois (pavé BOOK, envoi du formulaire, nav mobile de
  // postprod, action d'en-tête, tuile plateau, barre du lightbox) et avait été
  // rustiné par 37 `border-0` disséminés.
  //
  // Preuve par l'absence : `badge.tsx` porte la même bordure transparente mais
  // sans `bg-clip-padding`, et n'a jamais eu le problème.
  //
  // Seule `outline` dessine réellement un contour : c'est elle qui porte
  // désormais `border`.
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-mono text-xs font-normal uppercase tracking-widest whitespace-nowrap transition-all duration-150 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        // L'état sélectionné n'est pas décrit ici : l'appelant pose `dark` et
        // les tokens s'inversent d'eux-mêmes, y compris pour les enfants
        // (`text-muted-foreground` devient le gris clair adéquat). `aria-pressed`
        // porte la sémantique.
        cell: "bg-background text-foreground hover:bg-muted",
        // `aria-current=page` marque la destination où l'on se trouve déjà.
        // Une couleur, et rien d'autre : ni gras, ni bordure, ni soulignement,
        // qui changeraient la largeur de la cellule — la bande d'en-tête n'a
        // que 48px de marge à 1024. Pas `bg-muted` non plus : `hover` l'occupe
        // déjà, une cellule courante grisée en permanence serait indistincte
        // d'une cellule survolée.
        header:
          "bg-background text-foreground hover:bg-muted aria-pressed:bg-muted aria-[current=page]:text-primary",
        outline:
          "border border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // Cellule bento : hauteur libre, contenu empilé, aligné à gauche.
        //
        // `items-stretch` et non `items-start` : sur l'axe transverse d'un
        // flex, `start` dimensionne les enfants à leur contenu, ce qui annule
        // l'`overflow-hidden` des libellés — ils n'ont alors plus de largeur à
        // déborder et passent par-dessus le filet voisin. L'alignement du
        // texte vient de `text-left`, pas de l'alignement flex.
        //
        // `whitespace-normal` annule le `nowrap` de la base, qui vaut pour un
        // bouton d'une ligne et non pour une cellule à contenu empilé.
        cell: "h-auto min-w-0 flex-col items-stretch justify-start gap-1.5 overflow-hidden p-5 text-left normal-case tracking-normal whitespace-normal",
        // Action d'en-tête : prend la hauteur de la bande qui la contient.
        header: "h-full gap-2 px-5",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
