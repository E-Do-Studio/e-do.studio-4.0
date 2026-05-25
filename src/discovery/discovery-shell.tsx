import React from 'react';

interface DiscoveryShellProps {
  children: React.ReactNode;
}

export const DiscoveryShell: React.FC<DiscoveryShellProps> = ({ children }) => (
  <div className="edo-page-enter relative grid w-full gap-px bg-background md:h-full md:grid-rows-discovery-shell md:overflow-hidden">
    {children}
  </div>
);
