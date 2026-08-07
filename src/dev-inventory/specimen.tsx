import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// L'unique primitive de l'inventaire. Chaque échantillon de la page passe par
// elle : si le catalogue qui dénonce la duplication se met à dupliquer son
// propre cadre, il ne vaut plus rien.
//
// `tone` porte le verdict, et c'est ce qui rend la page utilisable : sans lui
// on voit treize rails, avec lui on voit UN rail de référence et douze copies.

export type SpecimenTone = 'canon' | 'copie' | 'casse';

const TONE_LABEL: Record<SpecimenTone, string> = {
  canon: 'référence',
  copie: 'copie',
  casse: 'cassé',
};

const TONE_PILL: Record<SpecimenTone, string> = {
  canon: 'bg-foreground text-background',
  copie: 'bg-neutral-200 text-neutral-700',
  casse: 'bg-primary text-primary-foreground',
};

interface SpecimenProps {
  /** `fichier:ligne` d'où l'échantillon est tiré. C'est la légende. */
  source: string;
  /** L'écart constaté, chiffré. Vide pour la référence. */
  note?: string;
  tone?: SpecimenTone;
  children: ReactNode;
  /** Contraint la largeur du rendu — les rails se comparent à largeur égale. */
  frameClassName?: string;
  className?: string;
}

export const Specimen = ({
  source,
  note,
  tone = 'copie',
  children,
  frameClassName,
  className,
}: SpecimenProps) => (
  <figure
    className={cn('flex min-w-0 flex-col border border-neutral-300', className)}
  >
    <figcaption className="flex flex-wrap items-center gap-2 border-b border-neutral-300 bg-neutral-100 px-2 py-1.5">
      <span
        className={cn(
          'px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest',
          TONE_PILL[tone],
        )}
      >
        {TONE_LABEL[tone]}
      </span>
      <code className="font-mono text-[11px] text-neutral-600">{source}</code>
    </figcaption>

    {/* Fond blanc explicite : les échantillons supposent le fond du site, pas
        le gris de la page d'inventaire. */}
    <div className={cn('min-w-0 bg-background p-4', frameClassName)}>
      {children}
    </div>

    {note && (
      <p className="border-t border-neutral-300 bg-neutral-50 px-2 py-1.5 font-mono text-[11px] leading-snug text-neutral-700">
        {note}
      </p>
    )}
  </figure>
);

interface SpecimenGridProps {
  children: ReactNode;
  /** Largeur mini d'une colonne : les rails veulent 240px, les CTA 340px. */
  min?: string;
  className?: string;
}

// `auto-fit` plutôt qu'un nombre de colonnes : le nombre d'échantillons varie
// de 2 à 19 selon le motif, et la comparaison n'a de sens que si les cadres
// gardent la même largeur d'une ligne à l'autre.
export const SpecimenGrid = ({
  children,
  min = '260px',
  className,
}: SpecimenGridProps) => (
  <div
    className={cn('grid gap-4', className)}
    style={{
      gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))`,
    }}
  >
    {children}
  </div>
);
