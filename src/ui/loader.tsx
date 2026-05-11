import type { HTMLAttributes } from 'react';
import { cn } from './cn';
import type { Lang } from '../types';
import { common } from '../i18n/messages';

type LoaderSize = 'inline' | 'block' | 'page';

interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  lang?: Lang;
  size?: LoaderSize;
  label?: string;
}

const sizeMap: Record<LoaderSize, string> = {
  inline: 'inline-flex items-center gap-2',
  block: 'flex w-full items-center justify-center gap-2.5 py-12',
  page: 'flex min-h-screen w-full items-center justify-center gap-2.5 bg-background',
};

const Loader = ({ lang = 'fr', size = 'block', label, className, ...props }: LoaderProps) => {
  const text = label ?? common.loading[lang];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(sizeMap[size], 'text-muted-foreground', className)}
      {...props}
    >
      <span className="flex h-2 items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="edo-typing-dot h-1 w-1 rounded-full bg-foreground" />
        ))}
      </span>
      <span className="edo-cell-label">{text}</span>
    </div>
  );
};

export { Loader };
export type { LoaderProps, LoaderSize };
