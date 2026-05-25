import React from 'react';
import { MarqueeCell } from '../cells';
import { SocialLinksRow } from '../ui';

export const DiscoveryFooter: React.FC = () => {
  return (
    <footer className="row-start-3 grid min-h-0 grid-cols-4 gap-px overflow-hidden bg-white md:grid-cols-12">
      <SocialLinksRow className="col-span-4 md:col-span-4" />
      <div className="hidden min-w-0 items-center overflow-hidden bg-white md:col-span-8 md:flex">
        <MarqueeCell size={20} />
      </div>
    </footer>
  );
};
