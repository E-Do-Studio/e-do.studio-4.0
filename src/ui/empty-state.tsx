import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type EmptyStateSize = 'compact' | 'default' | 'page';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  description?: ReactNode;
  action?: EmptyStateAction;
  size?: EmptyStateSize;
  /** @deprecated use `size="compact"` */
  compact?: boolean;
}

const sizeMap: Record<EmptyStateSize, string> = {
  compact: 'px-cell py-8',
  default: 'min-h-96 px-6 py-20',
  page: 'min-h-screen px-6 py-20',
};

const EmptyState = ({
  label,
  description,
  action,
  size,
  compact = false,
  className,
  ...props
}: EmptyStateProps) => {
  const resolvedSize: EmptyStateSize = size ?? (compact ? 'compact' : 'default');
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2.5 bg-background text-center text-muted-foreground',
        sizeMap[resolvedSize],
        className,
      )}
      {...props}
    >
      <span className="edo-cell-label text-foreground">{label}</span>
      {description && (
        <span className="text-detail text-muted-foreground">{description}</span>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="edo-focus-ring mt-2.5 inline-flex h-8 cursor-pointer items-center justify-center border border-foreground bg-background px-3 font-mono text-caption uppercase tracking-button leading-none text-foreground transition-colors hover:bg-muted"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export { EmptyState };
export type { EmptyStateProps, EmptyStateAction, EmptyStateSize };
