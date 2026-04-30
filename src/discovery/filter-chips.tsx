import React from 'react';
import type { DiscoveryCategory, Lang } from '../types';
import { DISCOVERY_CATEGORIES } from './data';
import { Chip } from '../ui/chip';
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
    {cats.map((cat) => (
      <Chip
        key={cat.k}
        active={value === cat.k}
        onClick={() => onChange(cat.k)}
        className={
          compact
            ? 'min-h-11 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-2.5 text-nano tracking-caption'
            : 'min-h-11 px-2.5 py-2.5 text-label tracking-caption'
        }
      >
        {cat[lang]}
      </Chip>
    ))}
  </div>
);
