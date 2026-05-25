import type { SocialLink } from '../types';
import { useSocialLinks } from '../lib/use-strapi';
import { SocialIcon } from './social-icon';
import { cn } from './cn';

interface SocialLinksRowProps {
  className?: string;
  links?: SocialLink[];
}

const ABBREV: Record<string, string> = {
  instagram: 'IG',
  linkedin: 'LI',
  facebook: 'FB',
  tiktok: 'TT',
};

const SocialLinksRow = ({ className, links }: SocialLinksRowProps) => {
  const { data: fetched } = useSocialLinks();
  const items = links ?? fetched ?? [];
  return (
    <div className={cn('grid h-11 grid-cols-4 gap-px', className)}>
      {items.map((s) => (
        <a
          key={s.k}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="edo-focus-ring group flex items-center justify-between border-0 bg-white px-3 no-underline text-foreground transition-colors duration-150 hover:bg-muted"
        >
          <SocialIcon kind={s.k} size={12} />
          <span className="font-mono text-micro tracking-meta">{ABBREV[s.k] ?? s.label}</span>
        </a>
      ))}
    </div>
  );
};

export { SocialLinksRow };
export type { SocialLinksRowProps };
