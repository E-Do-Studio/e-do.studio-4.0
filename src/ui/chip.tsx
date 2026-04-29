import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

const Chip = ({ active, className, children, ...props }: ChipProps) => (
  <button
    className={cn(
      'edo-focus-ring cursor-pointer border font-mono uppercase transition-colors',
      active
        ? 'border-foreground bg-foreground text-background'
        : 'border-border bg-transparent text-foreground hover:bg-muted',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export { Chip };
export type { ChipProps };
