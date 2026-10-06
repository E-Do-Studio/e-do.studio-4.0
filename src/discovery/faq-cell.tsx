import { useId } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FaqEntry } from '../lib/structured-data';
import { MonoLabel } from '../ui/mono-label';

interface FaqCellProps {
  title: string;
  /** Les Q/R affichées — les mêmes que celles que la route balise en FAQPage. */
  entries: FaqEntry[];
  className?: string;
}

// `<details>` natif et non un accordéon piloté par un état : la réponse est
// dans le HTML serveur et s'ouvre sans JavaScript. Le JSON-LD FAQPage de la
// route la déclare visible, elle doit donc l'être avant l'hydratation.
export const FaqCell = ({ title, entries, className }: FaqCellProps) => {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn('flex min-w-0 flex-col bg-background', className)}
    >
      {/* Le bandeau de `MorePostsCard`, à l'identique : c'est l'en-tête d'une
          cellule de la même page. */}
      <div className="flex shrink-0 items-center border-b border-border px-4 py-3">
        <h2 id={titleId}>
          <MonoLabel tone="primary">{title}</MonoLabel>
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries.map((entry) => (
          <details
            key={entry.question}
            className="group border-b border-b-border"
          >
            {/* `list-none` et le pseudo-élément masquent le triangle natif :
                la croix le remplace, et pivote à l'ouverture. */}
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 text-sm tracking-tight transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 text-pretty">{entry.question}</span>
              <Plus
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-open:rotate-45"
              />
            </summary>
            <p className="px-4 pb-4 text-sm text-pretty text-muted-foreground">
              {entry.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
};
