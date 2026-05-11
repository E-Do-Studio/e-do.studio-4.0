import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type EmptyStateSize = 'default' | 'compact' | 'page';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  description?: ReactNode;
  action?: EmptyStateAction;
  size?: EmptyStateSize;
}

const sizeMap: Record<EmptyStateSize, string> = {
  /** Smaller padding, no min-height — for use inside narrow cells/lists */
  compact: 'px-cell py-8',
  /** Standard block-level empty state */
  default: 'min-h-96 px-6 py-20',
  /** Full viewport — mirrors Loader `page` variant for route-level emptiness */
  page: 'min-h-screen px-6 py-20',
};

const EmptyState = ({
  label,
  description,
  action,
  size = 'default',
  className,
  ...props
}: EmptyStateProps) => (
  <div
    className={cn(
      'flex w-full flex-col items-center justify-center gap-2.5 bg-background text-center text-muted-foreground',
      sizeMap[size],
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

export { EmptyState };
export type { EmptyStateProps, EmptyStateAction, EmptyStateSize };
