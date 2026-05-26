import { common, home as homeMsg } from './i18n/messages';
import type { Lang } from './types';
import { IconArrowRight, cn } from './ui';

interface BookCTAProps {
  lang: Lang;
  onClick: () => void;
  className?: string;
}

// Inline variant — sits in the mobile social row at the right of the social
// icons (white cell, orange mono label). Matches the cell height and styling
// of SocialLinksRow so the row reads as IG | LI | FB | TT | Réserver.
const BookCTAInline = ({ lang, onClick, className }: BookCTAProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'edo-focus-ring flex h-11 cursor-pointer items-center justify-center border-0 bg-white px-4 font-mono text-micro uppercase tracking-meta text-primary transition-colors duration-150 hover:bg-muted',
      className,
    )}
  >
    {common.book[lang]}
  </button>
);

// Tile variant — the orange CTA tile in the desktop bento, with the two-line
// "Demander un devis ou / Réserver" copy and the trailing arrow.
const BookCTATile = ({ lang, onClick, className }: BookCTAProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'edo-focus-ring group h-20 flex cursor-pointer items-center justify-between gap-3 border-0 bg-primary px-5 py-3 text-left text-white transition-[color,background-color,opacity] duration-150 ease-edo-out hover:opacity-90 md:h-21',
      className,
    )}
  >
    <div className="flex min-w-0 flex-col gap-1 transition-transform duration-150 group-hover:scale-102">
      <span className="font-mono text-label uppercase tracking-label text-white">
        {homeMsg.requestQuoteOr[lang]}
      </span>
      <span className="text-tile-title font-normal tracking-headline leading-tight text-white">
        {common.book[lang]}
      </span>
    </div>
    <IconArrowRight
      className="flex-shrink-0 transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5 group-hover:scale-110"
      width="16"
      height="16"
    />
  </button>
);

export { BookCTAInline, BookCTATile };
export type { BookCTAProps };
