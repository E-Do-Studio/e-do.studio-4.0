import React from 'react';
import { MarqueeCell } from '../cells';
import { SocialLinksRow } from '../ui';

export const DiscoveryFooter: React.FC = () => (
  <footer className="row-start-3 grid min-h-0 grid-cols-1 gap-px overflow-hidden bg-white md:grid-cols-[minmax(0,1fr)_2fr]">
    <SocialLinksRow className="h-full" />
    <div className="hidden min-w-0 items-center overflow-hidden bg-white md:flex">
      <MarqueeCell size={20} />
    </div>
  </footer>
);
