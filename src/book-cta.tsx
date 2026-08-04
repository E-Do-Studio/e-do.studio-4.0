import { useT } from './i18n/use-t';
import { cn } from '@/lib/utils';
import { IconArrowRight } from './ui/icons';

interface BookCTAProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

// The orange "Réserver" tile. Single definition of the booking CTA, used at
// two render sites: the mobile social row (SocialClientsBar) and the desktop
// bento at row 5 (DirectionA). Same DOM, same brand language in both.
const BookCTATile = ({ onClick, className, label }: BookCTAProps) => {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'edo-focus-ring group h-12 flex cursor-pointer items-center justify-between gap-3 border-0 bg-primary px-4 py-2 text-left text-white transition-[color,background-color,opacity] duration-150 ease-edo-out hover:opacity-90 md:h-21 md:px-5 md:py-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1 transition-transform duration-150 group-hover:scale-102">
        <span className="hidden font-mono text-label uppercase tracking-label text-white md:block">
          {t('home.requestQuoteOr')}
        </span>
        <span className="text-base font-normal tracking-headline leading-tight text-white md:text-tile-title">
          {label ?? t('common.book')}
        </span>
      </div>
      <IconArrowRight
        className="flex-shrink-0 transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5 group-hover:scale-110"
        width="16"
        height="16"
      />
    </button>
  );
};

export { BookCTATile };
export type { BookCTAProps };
