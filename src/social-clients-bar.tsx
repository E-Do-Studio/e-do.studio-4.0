import { BookCTATile } from './book-cta';
import { MarqueeCell } from './cells';
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
    {/* Mobile: the same BookCTATile that lives in the desktop bento row 5
        is rendered here at the right of the social icons — one component,
        two render sites. The social icons row matches the tile's mobile
        height (h-12) so the strip reads as a single mobile CTA band.
        Desktop: md:contents flattens this wrapper so SocialLinksRow lands
        in col 1 of the outer grid (back to h-11), and the tile is hidden
        here via md:hidden (its desktop instance lives in DirectionA). */}
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-px bg-edo-pure-black md:contents">
      <SocialLinksRow className="h-12 md:h-11" />
      <BookCTATile lang={lang} onClick={onBook} className="md:hidden" />
    </div>
    <div className="flex h-11 min-w-0 items-center overflow-hidden bg-white">
      <MarqueeCell size={20} />
    </div>
  </div>
);

export { SocialClientsBar };
export type { SocialClientsBarProps };
