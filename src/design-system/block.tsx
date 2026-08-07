import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Le chrome de la page de référence. Volontairement distinct du `Specimen` de
// l'inventaire : celui-là porte des pastilles « copie » et « cassé » qui n'ont
// plus d'objet ici. Cette page ne montre que ce qui est retenu.

interface BlockProps {
  /** Nom du composant, tel qu'on l'importe. */
  name: string;
  /** Ce qu'il fait, en une phrase. */
  summary: string;
  /** Le fichier où il vit. */
  file: string;
  /** Ce qu'il remplace — la justification de son existence. */
  replaces?: string;
  /** L'appel type, en clair. */
  api?: string;
  children: ReactNode;
  /** Le rendu se fait sur fond blanc ; `p-0` pour les composants pleine largeur. */
  frameClassName?: string;
}

export const Block = ({
  name,
  summary,
  file,
  replaces,
  api,
  children,
  frameClassName,
}: BlockProps) => (
  <section className="flex min-w-0 flex-col border border-neutral-300">
    <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-neutral-300 bg-neutral-100 px-3 py-2">
      <h3 className="m-0 font-mono text-xs uppercase tracking-widest text-foreground">
        {name}
      </h3>
      <code className="font-mono text-[11px] text-neutral-500">{file}</code>
      {replaces && (
        <span className="ml-auto font-mono text-[11px] tracking-widest text-primary">
          {replaces}
        </span>
      )}
    </header>

    <p className="m-0 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-sm leading-snug text-neutral-700">
      {summary}
    </p>

    <div className={cn('min-w-0 bg-background p-4', frameClassName)}>
      {children}
    </div>

    {api && (
      <pre className="m-0 overflow-x-auto border-t border-neutral-300 bg-neutral-900 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-neutral-100">
        <code>{api}</code>
      </pre>
    )}
  </section>
);

interface VariantsProps {
  children: ReactNode;
  min?: string;
  className?: string;
}

// Les densités ou tonalités d'un même composant, rendues côte à côte. C'est le
// seul « côte à côte » de cette page : des variantes voulues, pas des copies.
export const Variants = ({
  children,
  min = '260px',
  className,
}: VariantsProps) => (
  <div
    className={cn('grid gap-4', className)}
    style={{
      gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))`,
    }}
  >
    {children}
  </div>
);

interface LabelledProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export const Labelled = ({ label, children, className }: LabelledProps) => (
  <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
    <code className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
      {label}
    </code>
    {children}
  </div>
);
