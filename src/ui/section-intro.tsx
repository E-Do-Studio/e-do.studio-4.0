import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import { MonoLabel } from './mono-label';

// L'en-tête d'un contenu : sur-titre, titre, chapô. Neuf variantes le
// rendaient — trois tailles de `h1`, huit paddings, et quatre traitements du
// sur-titre (orange, gris, pastille pleine, absent).
//
// Deux pages, la galerie et le contact, n'ont carrément aucun titre visible :
// leur `h1` est en `sr-only`. Ce n'est pas un oubli à corriger ici — leur
// première cellule EST le titre — mais c'est la raison pour laquelle ce
// composant reste optionnel plutôt qu'imposé par la mise en page.
//
// `--radius: 0` vaut aussi pour le sur-titre : la « pastille » de la page de
// confirmation était un rectangle orange, pas un badge. C'est `tone="pill"`.

const sectionIntroVariants = cva('flex flex-col', {
  variants: {
    size: {
      /**
       * En-tête RÉPÉTÉ — un par plateau, un par session. `sm` et `lg` sont
       * taillées pour un en-tête unique en haut de page ; à la cinquième
       * répétition, leur padding et leur corps de titre écrasent le contenu
       * qu'ils annoncent.
       */
      xs: 'gap-1 px-pad-cell py-4',
      /** Bandeau de section à l'intérieur d'une page. */
      sm: 'gap-2 px-5 py-6 md:px-6',
      /** En-tête de page. */
      lg: 'gap-3 px-5 py-10 md:px-12 md:py-14',
      /**
       * Le corps de `lg`, sans son retrait — pour un titre posé dans une
       * cellule qui porte déjà le sien. L'article et la confirmation sont dans
       * ce cas : leur cellule a son propre padding, et celui de `lg` s'y
       * serait ajouté au lieu de le remplacer.
       */
      flow: 'gap-3',
    },
  },
  defaultVariants: { size: 'lg' },
});

// Exporté comme `monoLabelVariants` l'est pour `FormCell` et `StatusBadge` :
// une cellule qui porte un titre sans porter tout le bloc (le rail de contact
// pose une adresse, pas un en-tête de section) doit pouvoir reprendre la
// typographie sans recopier la chaîne — c'est par cette recopie que deux sites
// avaient dérivé en `tracking-tight` et `leading-snug`.
const sectionTitleVariants = cva(
  'm-0 text-balance font-light leading-none tracking-tighter',
  {
    variants: {
      size: {
        xs: 'text-xl',
        sm: 'text-2xl',
        lg: 'text-4xl',
        flow: 'text-4xl',
      },
    },
    defaultVariants: { size: 'lg' },
  },
);

interface SectionIntroProps extends VariantProps<typeof sectionIntroVariants> {
  /**
   * Sur-titre. `ReactNode` et non `string` : les mentions légales y posent un
   * `StepHeading` (le rang de la section et son nom), la confirmation un
   * `StatusBadge`. Les deux écrivaient tout le bloc à la main faute de pouvoir
   * les passer ici. `kickerTone` ne s'applique qu'au texte nu.
   */
  kicker?: ReactNode;
  /** `pill` rend le sur-titre en rectangle orange plein. */
  kickerTone?: 'primary' | 'muted' | 'pill';
  title: string;
  /**
   * Renvoyée sur le titre lui-même, pour lui donner le focus.
   *
   * La confirmation de réservation en a besoin : `navigate()` amène sur un
   * document neuf, focus sur `<body>`, et rien ne disait que la réservation
   * avait abouti. Sans cette ref, la migration vers ce composant aurait perdu
   * la reprise de lecture.
   *
   * Elle emporte `tabIndex={-1}` : sans lui, `focus()` sur un titre ne fait
   * rien du tout, et laisser l'appelant le poser serait un piège pour un
   * bénéfice nul — nul autre usage de cette ref n'a de sens.
   */
  titleRef?: Ref<HTMLHeadingElement>;
  /**
   * Précision posée à DROITE du titre, en mono capitales — un rang, un compte,
   * un état.
   *
   * Elle existe pour ne pas allonger le titre. Deux sessions du même plateau
   * s'intitulaient « Eclipse Session 01 » et « Eclipse Session 02 » : trois mots
   * pour dire « la première des deux », dont deux se répétaient d'un bloc à
   * l'autre. Le nom reste le titre, le rang devient une marque discrète.
   */
  meta?: ReactNode;
  subtitle?: string;
  /** Niveau de titre. La page en a un seul en `h1`, les sections suivent. */
  as?: 'h1' | 'h2';
  /**
   * Actions posées sous le chapô — un bouton de reprise, un lien de retour.
   * Elles appartiennent au bloc : sorties de là, elles perdent son retrait
   * horizontal et il faut le réécrire à la main sur un conteneur voisin.
   */
  children?: ReactNode;
  className?: string;
}

export { sectionTitleVariants };

export const SectionIntro = ({
  kicker,
  kickerTone = 'primary',
  title,
  titleRef,
  meta,
  subtitle,
  size = 'lg',
  as: Heading = 'h1',
  children,
  className,
}: SectionIntroProps) => {
  // `outline-none` n'accompagne que la ref : ce focus-là est donné par le code
  // pour replacer la lecture, jamais atteint au clavier — un anneau y
  // signalerait un arrêt de tabulation qui n'existe pas.
  const heading = (
    <Heading
      ref={titleRef}
      tabIndex={titleRef ? -1 : undefined}
      className={cn(sectionTitleVariants({ size }), titleRef && 'outline-none')}
    >
      {title}
    </Heading>
  );

  return (
    <div className={cn(sectionIntroVariants({ size }), className)}>
      {/* Un nœud est rendu nu : il apporte sa propre typographie — c'est bien
          pour ça qu'on le passe plutôt qu'une chaîne — et l'envelopper d'un
          `MonoLabel` lui imposerait une couleur qu'il redéfinirait aussitôt. */}
      {typeof kicker === 'string' ? (
        kickerTone === 'pill' ? (
          <MonoLabel className="w-fit bg-primary px-3 py-1.5 text-primary-foreground">
            {kicker}
          </MonoLabel>
        ) : (
          <MonoLabel tone={kickerTone}>{kicker}</MonoLabel>
        )
      ) : (
        kicker
      )}

      {/* Une seule typographie de titre : `font-light tracking-tighter
          leading-none`, écrite à la main partout dans le site, et dont deux
          sites s'écartaient en silence (`tracking-tight`, `leading-snug`). */}
      {meta ? (
        // `items-baseline` : le rang s'aligne sur la ligne de base du titre, pas
        // sur son centre optique — sinon il flotte au-dessus d'un `text-2xl`.
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {heading}
          <MonoLabel tone="muted" className="shrink-0 tabular-nums">
            {meta}
          </MonoLabel>
        </div>
      ) : (
        heading
      )}

      {subtitle && (
        <p className="m-0 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}

      {/* `mt-5` et non la gouttière du bloc : une action ne se lit pas au même
          rythme qu'une ligne de texte, elle a besoin d'un cran de plus. */}
      {children && <div className="mt-5 flex flex-wrap gap-px">{children}</div>}
    </div>
  );
};
