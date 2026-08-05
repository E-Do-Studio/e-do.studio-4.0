import type React from 'react';

interface DiscoveryShellProps {
  children: React.ReactNode;
}

export const DiscoveryShell = ({ children }: DiscoveryShellProps) => (
  <div className="animate-in fade-in duration-300 relative grid w-full gap-px bg-border md:h-full md:grid-rows-[var(--spacing-header)_44px_minmax(0,1fr)] md:overflow-hidden">
    {children}
  </div>
);
