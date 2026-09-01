import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MonoLabel } from './mono-label';

// Le pavé d'action : « Réserver », « Envoyer », « Demander un devis ». Sept
// traitements coexistaient pour une seule et même intention.
//
// Sept hauteurs (32, 44, 44, 44, 56, 80, 84px), trois paddings, trois hovers
// (`opacity-90`, `bg-primary/90`, `bg-primary/85`), et un sur-titre à `/75`
// ici, `/80` là — un écart de cinq pour cent que rien ne justifiait. Celui de
// post-prod demandait `py-3.5` sur un `size="default"` qui impose `h-8` : le
// padding était ignoré et le CTA rendait à 32px, soit 38 % de la hauteur de
// celui de l'accueil.
//
// Deux hauteurs suffisent, et elles sont déjà tokenisées :
//   `band` (44px, `--spacing-band`)  action en pied de formulaire ou de bande
//   `cta`  (84px, `--spacing-cta`)   pavé de bas de page, avec sur-titre
//
// `cta` porte ses trois paliers lui-même. L'accueil lui passait `h-36 md:h-auto`
// depuis la page : la hauteur du pavé se décidait donc au site d'appel, et rien
// ne la tenait dans la pile élargie, où une cellule de 84px sur 500px de large
// n'est plus un pavé mais un trait. 84px est la mesure du BENTO, où c'est le
// gabarit de rangée qui commande ; empilée, la cellule a besoin de sa propre.

const ctaCellVariants = cva('group w-full justify-between gap-3.5 text-left', {
  variants: {
    tone: {
      // L'orange de marque. `hover:opacity-90` vient de `variant="default"` —
      // une seule convention de survol, pas trois.
      primary: '',
      // La cellule inversée : `dark` retourne les tokens, y compris pour les
      // enfants, au lieu des ternaires de couleur que portait chaque copie.
      dark: 'dark bg-background text-foreground hover:opacity-90',
      surface: '',
    },
    size: {
      // `py-3` et non le `p-5` que `size="cell"` impose : 12px de part et
      // d'autre d'un titre en `text-xl leading-none` font exactement les 44px du
      // palier. Avec `p-5` la cellule en demandait 60 — le plancher qu'elle
      // annonçait n'était donc jamais celui qu'elle rendait, et là où une piste
      // de grille valait vraiment 44 (le pied du formulaire de contact) le
      // bouton était rogné de 16px. Le padding d'une densité se calcule POUR
      // atteindre son palier, il ne s'y ajoute pas.
      band: 'min-h-band py-3',
      cta: 'min-h-36 md:min-h-44 app:min-h-cta',
    },
  },
  defaultVariants: { tone: 'primary', size: 'band' },
});

interface CtaCellProps extends VariantProps<typeof ctaCellVariants> {
  /**
   * Sur-titre mono capitale. Absent, le titre occupe seul la cellule.
   *
   * `ReactNode` et non `string` : plusieurs sur-titres portent DEUX valeurs — un
   * numéro d'ordre et un intitulé. C'est la gouttière du flex qui les sépare,
   * jamais un point médian collé dans la chaîne.
   */
  kicker?: ReactNode;
  title: string;
  /**
   * Phrase sous le titre, en mono capitale atténuée.
   *
   * Deux cartes de la page d'accueil — Cyclorama et Post-production — étaient
   * redessinées à la main pour l'avoir : même sur-titre, même titre, même
   * flèche, plus une ligne. Le composant coûtait une prop, la copie coûtait
   * deux cellules qui dérivent.
   */
  subtitle?: string;
  onClick?: () => void;
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export const CtaCell = ({
  kicker,
  title,
  subtitle,
  // La valeur par défaut est répétée ici, et pas seulement dans
  // `defaultVariants` : cva la résout pour SES classes, mais le JSX ci-dessous
  // teste `tone` directement. Sans ce défaut, `tone` valait `undefined` et le
  // sur-titre tombait sur `text-muted-foreground` — du gris sur de l'orange.
  tone = 'primary',
  size,
  onClick,
  href,
  type = 'button',
  disabled,
  className,
}: CtaCellProps) => {
  const isLink = href != null;
  const isBand = size !== 'cta';

  return (
    <Button
      render={
        isLink ? (
          // biome-ignore lint/a11y/useAnchorContent: Base UI clone cette ancre avec les enfants du bouton — elle n'est vide qu'à la lecture statique
          <a href={href} />
        ) : undefined
      }
      type={isLink ? undefined : type}
      onClick={onClick}
      disabled={isLink ? undefined : disabled}
      variant={tone === 'surface' ? 'cell' : 'default'}
      size="cell"
      className={cn(ctaCellVariants({ tone, size }), className)}
    >
      {kicker && (
        // `/75` partout. `plateau-page.tsx` disait `/80` sans raison — deux
        // opacités pour le même sur-titre, sur deux pages voisines.
        //
        // `tone="dark"` porte la portée `dark` : ses enfants lisent les tokens
        // inversés, `text-muted-foreground` y rend donc le gris clair adéquat.
        // Seul `surface` reste sur fond blanc.
        <MonoLabel
          tone={tone === 'primary' ? 'inherit' : 'muted'}
          className={cn(
            'flex items-baseline gap-2.5',
            tone === 'primary' && 'text-primary-foreground/75',
          )}
        >
          {kicker}
        </MonoLabel>
      )}
      <span className="flex w-full items-end justify-between gap-2.5">
        {/* Une seule typographie de titre de CTA. Les copies oscillaient entre
            `text-3xl font-light tracking-tighter leading-none` et un
            `text-2xl tracking-tight` sans graisse ni interligne. */}
        <span className="flex min-w-0 flex-col gap-1.5">
          {/* `leading-none` APRÈS le corps, jamais avant : `text-xl` porte sa
              propre interligne, et `tailwind-merge` arbitre les deux comme un
              conflit — écrit dans l'autre ordre, il supprimait purement et
              simplement `leading-none` de la classe rendue. Le titre tombait
              donc à 28px de hauteur de ligne pour 20px de corps, et les 8px de
              vide sous la ligne de base repoussaient la flèche, alignée sur le
              bas, sous le texte. */}
          <span
            className={cn(
              isBand ? 'text-xl' : 'text-2xl',
              'font-light leading-none tracking-tighter',
            )}
          >
            {title}
          </span>
          {/* `min-h-[2lh]` : deux lignes réservées, remplies ou non.
              
              Sans elle, deux cartes voisines dont les sous-titres n'ont pas le
              même nombre de lignes voient leurs titres — et leurs flèches, qui
              s'alignent sur le bas — à deux hauteurs différentes. Le bloc étant
              poussé au pied, c'est la hauteur du sous-titre qui décide de celle
              du titre. La réserver aligne les deux.
              
              `lh` et non une valeur en rem : l'unité suit l'interligne réel du
              texte, donc `lines="multi"` peut changer sans casser la réserve.
              `book-picker` l'emploie déjà pour la même raison. */}
          {subtitle && (
            <MonoLabel
              tone={tone === 'primary' ? 'inherit' : 'muted'}
              lines="multi"
              className={cn(
                'md:min-h-[2lh]',
                tone === 'primary' && 'text-primary-foreground/75',
              )}
            >
              {subtitle}
            </MonoLabel>
          )}
        </span>
        {/* La flèche prend le corps du titre — 16px de base la laissaient
            perdue à côté d'un texte de 20 ou 24. Elle vaut aussi l'alignement :
            à hauteur égale avec la boîte de ligne du titre, `items-end` la pose
            exactement dessus, sans écart à rattraper.

            Pas de `data-icon="inline-end"` : la compensation de padding qu'il
            déclenche n'existe que sur les tailles d'une ligne, `size="cell"`
            n'en a pas. Le `p-5` de la cellule fait déjà les deux bords. */}
        <ArrowRight className={isBand ? 'size-5' : 'size-6'} />
      </span>
    </Button>
  );
};
