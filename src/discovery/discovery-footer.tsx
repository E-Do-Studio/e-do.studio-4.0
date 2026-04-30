import React from 'react';
import { MarqueeCell } from '../cells';
import { useSocialLinks } from '../lib/use-strapi';
import { SocialIcon } from './social-icon';

export const DiscoveryFooter: React.FC = () => {
  const { data: socialLinks } = useSocialLinks();
  return (
  <footer className="row-start-3 grid min-h-0 grid-cols-4 gap-px overflow-hidden bg-black md:grid-cols-12">
    {(socialLinks ?? []).map((social) => (
      <a
        key={social.k}
        href={social.href}
        target="_blank"
        rel="noopener noreferrer"
        className="edo-focus-ring group flex items-center justify-between bg-white px-3 text-foreground no-underline transition-colors hover:bg-muted"
      >
        <span className="transition-transform duration-200 ease-edo-out group-hover:scale-110"><SocialIcon kind={social.k} size={12} /></span>
        <span className="font-mono text-micro tracking-meta transition-transform duration-200 ease-edo-out group-hover:scale-110">{social.label}</span>
      </a>
    ))}
    <div className="hidden min-w-0 items-center overflow-hidden bg-white md:col-span-8 md:flex">
      <MarqueeCell size={20} />
    </div>
  </footer>
  );
};
