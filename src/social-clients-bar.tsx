import { BookCTAInline } from './book-cta';
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
    {/* Mobile: social icons + orange Réserver CTA share one row, marquee
        below. The 2:1 column ratio gives the booking CTA roughly a third of
        the row width so it reads as a primary action rather than a label.
        Desktop: md:contents flattens this wrapper so SocialLinksRow lands
        in col 1 of the outer grid and the inline button is removed via
        md:hidden, restoring the original [social | marquee] layout. The
        desktop instance of the same brand CTA lives in DirectionA at its
        bento position; see BookCTATile in book-cta.tsx. */}
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-px bg-edo-pure-black md:contents">
      <SocialLinksRow />
      <BookCTAInline lang={lang} onClick={onBook} className="md:hidden" />
    </div>
    <div className="flex h-11 min-w-0 items-center overflow-hidden bg-white">
      <MarqueeCell size={20} />
    </div>
  </div>
);

export { SocialClientsBar };
export type { SocialClientsBarProps };
