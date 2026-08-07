import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Adaptation à l'identité e-do : mono capitales à fort interlettrage au lieu du
// `text-sm font-medium` de shadcn. `rounded-lg` est conservé tel quel — il résout
// vers `var(--radius)`, à 0 dans styles.css, donc le bouton sort carré sans
// override.
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
  //
  // Le focus est un `outline` opaque en `foreground`, à décalage NÉGATIF —
  // c'est-à-dire tracé À L'INTÉRIEUR de la cellule. Les deux choix sont
  // mesurés, pas esthétiques :
  //
  //   couleur — l'ancien `ring-ring/50` (orange de marque à 50 %) donnait
  //   1.84:1 sur fond blanc et 1.00:1 sur la cellule orange, où il était donc
  //   littéralement invisible : la cellule RÉSERVER, action principale du site,
  //   n'avait aucun indicateur au clavier. WCAG 1.4.11 exige 3:1. `foreground`
  //   donne 19.8:1 sur blanc et 6.24:1 sur l'orange.
  //
  //   décalage — un anneau tracé vers l'extérieur déborde sur les cellules
  //   voisines de la grille bento, qui peignent chacune leur propre fond
  //   opaque et le recouvrent : dans la bande d'en-tête il n'en restait qu'un
  //   liseré au point de jonction. Vers l'intérieur, rien ne peut le rogner.
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-mono text-xs font-normal uppercase tracking-widest whitespace-nowrap transition-all duration-150 ease-out select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
        // qu'une poignée de pixels de marge à 1024. Pas `bg-muted` non plus :
        // `hover` l'occupe déjà, une cellule courante grisée en permanence
        // serait indistincte d'une cellule survolée.
        //
        // Aucun `aria-pressed` ici : la bande ne porte que des destinations,
        // jamais de bascule. La règle qui s'y trouvait ne s'est jamais
        // déclenchée, et disait le contraire du paragraphe ci-dessus.
        header:
          "bg-background text-foreground hover:bg-muted aria-[current=page]:text-primary",
        // `text-foreground` fait partie de la variante, au même titre que
        // `bg-background`. Sans lui, le bouton posait un fond sans poser sa
        // couleur de texte, laissant celle-ci héritée du parent DOM.
        //
        // Invisible tant que le parent est clair — et illisible dès qu'on pose
        // la portée `dark` dessus pour marquer la sélection : `--background`
        // s'inverse en noir, le texte reste le gris foncé du parent resté clair.
        // C'est le cas du choix « Type d'articles » de l'étape contact, dont le
        // libellé sélectionné devenait gris sur noir. `variant="cell"` porte les
        // deux depuis toujours, ce qui explique que `SelectTile` et
        // `SegmentItem` s'inversent, eux, correctement.
        outline:
          "border border-border bg-background text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:outline-destructive dark:bg-destructive/20 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 gap-1 px-2.5 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // Cible tactile. Aucune des tailles ci-dessus n'atteint 44px — `lg`
        // plafonne à 36 — d'où les trente-huit `min-h-11` que le site ajoutait
        // à la main, un par site d'appel. `min-h` et non `h` : la cellule doit
        // pouvoir grandir avec son contenu, c'est le plancher qui compte.
        touch:
          "min-h-tap gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
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
        //
        // `font-sans normal-case tracking-normal` : une cellule bento porte du
        // TEXTE, par définition. La base de `Button` parle mono capitales — ce
        // qui est juste pour une action — et la cellule n'en défaisait que la
        // casse et l'interlettrage. La police restait, donc tous les titres de
        // carte du site étaient en monospace sans l'avoir demandé : à corps
        // égal, chaque glyphe y a la même chasse, et « Horizontal » y occupe
        // dix chasses pleines. Réduire le corps n'y changeait presque rien.
        //
        // Le mono VOULU passe par `MonoLabel`, qui pose `font-mono` lui-même :
        // les numéros, sous-titres et libellés de pied ne bougent pas.
        cell: "h-auto min-w-0 flex-col items-stretch justify-start gap-1.5 overflow-hidden p-5 text-left font-sans normal-case tracking-normal whitespace-normal",
        // Action d'en-tête : prend la hauteur de la bande qui la contient.
        header: "h-full gap-2 px-5",
        icon: "size-8",
        "icon-xs":
          "size-6 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
        // Le pendant carré de `touch` : aucune des tailles ci-dessus n'atteint
        // 44px, `icon-lg` plafonne à 36. Et l'icône y passe à 20px — dans un
        // bouton de 44 de côté, les 16px de la base laissent un glyphe perdu au
        // milieu du vide, ce qui donnait au stepper des `−` et `+` minuscules.
        "icon-touch": "size-tap [&_svg:not([class*='size-'])]:size-5",
      },
      // La base parle mono capitale à fort interlettrage — c'est l'identité du
      // site, et c'est juste pour une action. Ça ne l'est pas pour un bouton qui
      // porte une phrase : « en savoir plus », le nom d'une catégorie, le
      // libellé d'un onglet. Sept sites écrivaient `normal-case tracking-normal`
      // pour défaire la base, chacun à sa façon, parfois en y ajoutant
      // `font-[inherit]` pour reprendre aussi la famille.
      casing: {
        mono: "",
        plain: "font-sans normal-case tracking-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      casing: "mono",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  casing = "mono",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, casing, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
