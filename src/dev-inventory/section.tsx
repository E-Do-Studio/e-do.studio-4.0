import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Une section = un motif. Le chiffre du bandeau est le nombre
// d'implémentations concurrentes relevées dans `src/**` : c'est lui qu'on
// cherche à ramener à 1.

interface SectionProps {
  id: string;
  title: string;
  /** « 13 implémentations » — le constat, pas une décoration. */
  count?: string;
  intro?: ReactNode;
  children: ReactNode;
}

export const Section = ({
  id,
  title,
  count,
  intro,
  children,
}: SectionProps) => (
  // `scroll-mt-16` : l'en-tête de l'inventaire est collant, une ancre sans
  // marge poserait le titre dessous.
  <section id={id} className="scroll-mt-16 border-t border-neutral-300 pt-8">
    <header className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h2 className="font-mono text-sm uppercase tracking-widest text-foreground">
        {title}
      </h2>
      {count && (
        <span className="font-mono text-xs tracking-widest text-primary">
          {count}
        </span>
      )}
    </header>
    {intro && (
      <p className="mb-5 max-w-3xl text-sm leading-relaxed text-neutral-700">
        {intro}
      </p>
    )}
    <div className="flex flex-col gap-8">{children}</div>
  </section>
);

interface SubsectionProps {
  title: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Subsection = ({
  title,
  note,
  children,
  className,
}: SubsectionProps) => (
  <div className={cn('flex flex-col gap-3', className)}>
    <h3 className="font-mono text-xs uppercase tracking-widest text-neutral-500">
      {title}
    </h3>
    {note && (
      <p className="max-w-3xl text-sm leading-relaxed text-neutral-700">
        {note}
      </p>
    )}
    {children}
  </div>
);
