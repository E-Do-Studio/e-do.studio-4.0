import { useT } from './i18n/use-t';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

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
    <Button
      onClick={onClick}
      className={cn(
        'group h-12 justify-between gap-3 px-4 py-2 text-left md:h-21 md:px-5 md:py-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1 transition-transform duration-150 group-hover:scale-102">
        <span className="hidden font-mono text-label uppercase tracking-label text-primary-foreground/75 md:block">
          {t('home.requestQuoteOr')}
        </span>
        <span className="text-base font-normal tracking-headline leading-tight text-primary-foreground md:text-tile-title">
          {label ?? t('common.book')}
        </span>
      </div>
      <ArrowRight
        className="flex-shrink-0 transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5 group-hover:scale-110"
        width="16"
        height="16"
      />
    </Button>
  );
};

export { BookCTATile };
export type { BookCTAProps };
