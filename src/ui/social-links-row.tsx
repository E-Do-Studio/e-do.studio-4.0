import { usePageContext } from '../lib/page-context';
import type { SocialLink } from '../types';
import { cn } from './cn';
import { SocialIcon } from './social-icon';

const ABBREV: Record<string, string> = {
  instagram: 'IG',
  linkedin: 'LI',
  facebook: 'FB',
  tiktok: 'TT',
};

const labelFor = (s: SocialLink) => ABBREV[s.k] ?? s.label;

interface SocialLinksRowProps {
  className?: string;
  layout?: 'auto' | 'row';
}

const LAYOUT_CLASSES: Record<'auto' | 'row', string> = {
  auto: 'grid grid-cols-2 gap-hairline bg-hairline',
  row: 'grid grid-cols-4 gap-hairline bg-hairline',
};

const SocialLinksRow = ({
  className,
  layout = 'auto',
}: SocialLinksRowProps) => {
  const { siteData } = usePageContext();
  const items: SocialLink[] = siteData.socialLinks ?? [];
  return (
    <div className={cn(LAYOUT_CLASSES[layout], className)}>
      {items.map((s) => (
        <a
          key={s.k}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="edo-focus-ring group flex items-center justify-between border-0 bg-white px-3 py-3 text-foreground no-underline transition-colors duration-150 hover:bg-muted"
        >
          <SocialIcon kind={s.k} size={12} />
          <span className="font-mono text-micro tracking-meta">
            {labelFor(s)}
          </span>
        </a>
      ))}
    </div>
  );
};

export { SocialLinksRow };
export type { SocialLinksRowProps };
