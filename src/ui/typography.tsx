import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CellLabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

const CellLabel = ({ children, className, ...props }: CellLabelProps) => (
  <span
    className={cn(
      'font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground',
      className,
    )}
    {...props}
  >
    {children}
  </span>
);

interface CellTitleProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

const CellTitle = ({ children, className, ...props }: CellTitleProps) => (
  <span
    className={cn('font-sans text-xs font-medium text-foreground', className)}
    {...props}
  >
    {children}
  </span>
);

interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

const Eyebrow = ({ children, className, ...props }: EyebrowProps) => (
  <span
    className={cn(
      'font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground',
      className,
    )}
    {...props}
  >
    {children}
  </span>
);

export { CellLabel, CellTitle, Eyebrow };
export type { CellLabelProps, CellTitleProps, EyebrowProps };
