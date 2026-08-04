import { MarqueeCell } from './ui/marquee-cell';
import { cn } from './ui/cn';
import { SocialLinksRow } from './ui/social-links-row';

interface SocialClientsBarProps {
  className?: string;
}

const SocialClientsBar = ({ className }: SocialClientsBarProps) => (
  <div
    className={cn(
      'grid grid-cols-1 edo-hairline md:grid-cols-[minmax(0,1fr)_2fr]',
      className,
    )}
  >
    <SocialLinksRow layout="row" className="h-12 md:h-11 md:border-b" />
    <div className="flex h-11 min-w-0 items-center overflow-hidden bg-white">
      <MarqueeCell size={20} />
    </div>
  </div>
);

export { SocialClientsBar };
export type { SocialClientsBarProps };
