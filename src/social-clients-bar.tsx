import { MarqueeCell } from './cells';
import { common } from './i18n/messages';
import type { Lang } from './types';
import { SocialLinksRow, cn } from './ui';

interface SocialClientsBarProps {
  className?: string;
  lang: Lang;
  onBook: () => void;
}

const SocialClientsBar = ({ className, lang, onBook }: SocialClientsBarProps) => (
  <div
    className={cn(
      'grid grid-cols-1 gap-px bg-edo-pure-black md:grid-cols-[minmax(0,1fr)_2fr]',
      className,
    )}
  >
    {/* Mobile: social icons + Réserver CTA share one row, marquee below.
        Desktop: md:contents flattens this wrapper so SocialLinksRow lands
        in col 1 of the outer grid and the Réserver button is removed via
        md:hidden, restoring the original [social | marquee] layout. */}
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-px bg-edo-pure-black md:contents">
      <SocialLinksRow />
      <button
        type="button"
        onClick={onBook}
        className="edo-focus-ring flex h-11 cursor-pointer items-center justify-center border-0 bg-white px-4 font-mono text-micro uppercase tracking-meta text-primary transition-colors duration-150 hover:bg-muted md:hidden"
      >
        {common.book[lang]}
      </button>
    </div>
    <div className="flex h-11 min-w-0 items-center overflow-hidden bg-white">
      <MarqueeCell size={20} />
    </div>
  </div>
);

export { SocialClientsBar };
export type { SocialClientsBarProps };
