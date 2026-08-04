import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HeaderActionProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

const HeaderAction = ({ children, onClick, className }: HeaderActionProps) => (
  <button
    onClick={onClick}
    className={cn(
      'edo-focus-ring flex h-full flex-none cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 text-foreground transition-colors hover:bg-muted',
      className,
    )}
  >
    {children}
  </button>
);

interface HeaderActionTextProps {
  children: ReactNode;
}

const HeaderActionText = ({ children }: HeaderActionTextProps) => (
  <span className="whitespace-nowrap font-mono text-caption uppercase tracking-ui text-foreground">
    {children}
  </span>
);

export { HeaderAction, HeaderActionText };
export type { HeaderActionProps, HeaderActionTextProps };
