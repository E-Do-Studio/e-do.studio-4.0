import { common, home as homeMsg } from './i18n/messages';
import type { Lang } from './types';
import { IconArrowRight, cn } from './ui';

interface BookCTAProps {
  lang: Lang;
  onClick: () => void;
  className?: string;
}

// The orange "Réserver" tile. Single definition of the booking CTA, used at
// two render sites: the mobile social row (SocialClientsBar) and the desktop
// bento at row 5 (DirectionA). Same DOM, same brand language in both.
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

export { BookCTATile };
export type { BookCTAProps };
