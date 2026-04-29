import React from 'react';
import type { DiscoveryCategory, Lang } from '../types';
import { DISCOVERY_CATEGORIES } from './data';
import { cn } from '../ui/cn';

interface FilterChipsProps {
  cats?: DiscoveryCategory[];
  value: string;
  onChange: (k: string) => void;
  lang: Lang;
  compact?: boolean;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ cats = DISCOVERY_CATEGORIES, value, onChange, lang, compact = false }) => (
  <div className={cn('flex flex-wrap', compact ? 'gap-1' : 'gap-1.5')}>
    {cats.map((cat) => {
      const active = value === cat.k;

      return (
        <button
          key={cat.k}
          onClick={() => onChange(cat.k)}
          className={cn(
            'cursor-pointer border font-mono uppercase transition-colors',
            active
              ? 'border-foreground bg-foreground text-white'
              : 'border-border bg-transparent text-foreground hover:bg-muted',
            compact
              ? 'min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-1 text-nano tracking-caption'
              : 'px-2.5 py-1.5 text-label tracking-caption'
          )}
        >
          {cat[lang]}
        </button>
      );
    })}
  </div>
);
