import type { DiscoveryCategory, Lang } from '../types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

interface FilterChipsProps {
  cats: DiscoveryCategory[];
  value: string;
  onChange: (k: string) => void;
  lang: Lang;
  compact?: boolean;
}

export const FilterChips = ({
  cats,
  value,
  onChange,
  lang,
  compact = false,
}: FilterChipsProps) => (
  <ToggleGroup
    variant="outline"
    // Un filtre est toujours actif : Base UI rend `[]` quand on re-clique
    // l'élément déjà pressé, on ignore ce cas plutôt que de retomber sur un
    // état sans catégorie.
    value={[value]}
    onValueChange={(next: string[]) => {
      if (next.length > 0) onChange(next[0]);
    }}
    spacing={compact ? 1 : 1.5}
    className={cn('w-full flex-wrap', compact && 'flex-nowrap')}
  >
    {cats.map((cat) => (
      <ToggleGroupItem
        key={cat.k}
        value={cat.k}
        aria-label={cat[lang]}
        className={cn(
          'min-h-11',
          compact ? 'min-w-0 flex-1 truncate px-1' : 'px-2.5',
        )}
      >
        {cat[lang]}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);
