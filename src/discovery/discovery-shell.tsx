import React from 'react';

interface DiscoveryShellProps {
  children: React.ReactNode;
}

export const DiscoveryShell: React.FC<DiscoveryShellProps> = ({ children }) => (
  <div className="relative grid h-full w-full grid-rows-discovery-shell gap-px overflow-hidden bg-black">
    {children}
  </div>
);
