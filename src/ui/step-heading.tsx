import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MonoLabel } from './mono-label';

// L'en-tête d'une étape ou d'une section : un numéro d'ordre, un intitulé.
//
// Dix-sept sites écrivaient la même chaîne — le tunnel de réservation, le
// configurateur, le sommaire juridique, la post-production. L'audit initial ne
// l'avait pas relevé : il comptait les libellés mono un par un, et celui-ci en
// contient DEUX, ce qui le rendait invisible au dénombrement. C'est la
// migration qui l'a fait apparaître, en butant dessus fichier après fichier.
//
// Le numéro et l'intitulé sont deux valeurs distinctes, séparées par la
// gouttière du flex — jamais par un point médian collé dans la chaîne. C'est la
// règle du dépôt, et c'est aussi la seule mise en forme qu'une grille puisse
// reprendre à son compte.
//
// `whitespace-nowrap` : l'en-tête vit dans une bande collante à hauteur fixe.
// Un intitulé qui se replie la fait grandir et décale tout ce qui suit.

interface StepHeadingProps {
  /** Numéro déjà formaté — passer `ordinal(i)` de `lib/format`. */
  number: string;
  title: string;
  /**
   * `primary` — l'étape en cours (le défaut).
   * `muted` — une étape repliée, qu'on peut rouvrir.
   *
   * Le configurateur repliait ses étapes en peignant le numéro en orange et
   * l'intitulé en gris, alors que la version ouverte du MÊME en-tête les met
   * tous les deux en orange. Un en-tête ne se lit pas à moitié actif : le ton
   * porte sur la paire entière.
   */
  tone?: 'primary' | 'muted';
  /** Phrase d'accompagnement, posée à côté sur la même ligne de base. */
  subtitle?: ReactNode;
  className?: string;
}

export const StepHeading = ({
  number,
  title,
  tone = 'primary',
  subtitle,
  className,
}: StepHeadingProps) => {
  const label = (
    <MonoLabel
      tone={tone}
      className="flex shrink-0 items-baseline gap-2.5 whitespace-nowrap"
    >
      <span className="tabular-nums">{number}</span>
      <span>{title}</span>
    </MonoLabel>
  );

  if (!subtitle) return <span className={className}>{label}</span>;

  return (
    <div className={cn('flex flex-wrap items-baseline gap-4', className)}>
      {label}
      <span className="min-w-0 flex-auto text-xs leading-snug text-muted-foreground">
        {subtitle}
      </span>
    </div>
  );
};
