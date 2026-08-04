import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface CellLabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

const CellLabel = ({ children, className, ...props }: CellLabelProps) => (
  <span className={cn('edo-cell-label', className)} {...props}>
    {children}
  </span>
);

interface CellTitleProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

const CellTitle = ({ children, className, ...props }: CellTitleProps) => (
  <span className={cn('edo-cell-title', className)} {...props}>
    {children}
  </span>
);

interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

const Eyebrow = ({ children, className, ...props }: EyebrowProps) => (
  <span className={cn('edo-eyebrow', className)} {...props}>
    {children}
  </span>
);

export { CellLabel, CellTitle, Eyebrow };
export type { CellLabelProps, CellTitleProps, EyebrowProps };
