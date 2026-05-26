import { MarqueeCell } from './cells';
import { SocialLinksRow, cn } from './ui';

interface SocialClientsBarProps {
  className?: string;
}

const SocialClientsBar = ({ className }: SocialClientsBarProps) => (
  <div
    className={cn(
      'grid grid-cols-1 gap-px bg-edo-pure-black md:grid-cols-[minmax(0,1fr)_2fr]',
      className,
    )}
  >
    <SocialLinksRow />
    <div className="flex h-11 min-w-0 items-center overflow-hidden bg-white">
      <MarqueeCell size={20} />
    </div>
  </div>
);

export { SocialClientsBar };
export type { SocialClientsBarProps };
