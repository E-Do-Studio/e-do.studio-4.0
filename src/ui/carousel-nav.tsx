import { useT } from '../i18n/use-t';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface CarouselNavProps {
  onPrev: () => void;
  onNext: () => void;
  size?: number;
  className?: string;
}

const baseBtn =
  'edo-focus-ring absolute z-10 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center cursor-pointer text-white mix-blend-difference transition-transform duration-200 ease-edo-out active:scale-95';

const CarouselNav = ({
  onPrev,
  onNext,
  size = 22,
  className,
}: CarouselNavProps) => {
  const t = useT();
  return (
    <>
      <Button
        type="button"
        onClick={onPrev}
        aria-label={t('common.prevImage')}
        variant="ghost"
        size="icon"
        className={cn(baseBtn, 'left-3 md:hover:-translate-x-[3px]', className)}
      >
        <ArrowLeft width={size} height={size} />
      </Button>
      <Button
        type="button"
        onClick={onNext}
        aria-label={t('common.nextImage')}
        variant="ghost"
        size="icon"
        className={cn(baseBtn, 'right-3 md:hover:translate-x-[3px]', className)}
      >
        <ArrowRight width={size} height={size} />
      </Button>
    </>
  );
};

export { CarouselNav };
export type { CarouselNavProps };
