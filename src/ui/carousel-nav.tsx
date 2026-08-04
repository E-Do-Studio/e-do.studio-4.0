import { common } from '../i18n/messages';
import type { Lang } from '../types';
import { cn } from './cn';
import { IconArrowLeft, IconArrowRight } from './icons';

interface CarouselNavProps {
  lang: Lang;
  onPrev: () => void;
  onNext: () => void;
  size?: number;
  className?: string;
}

const baseBtn =
  'edo-focus-ring absolute z-10 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center cursor-pointer text-white mix-blend-difference transition-transform duration-200 ease-edo-out active:scale-95';

const CarouselNav = ({
  lang,
  onPrev,
  onNext,
  size = 22,
  className,
}: CarouselNavProps) => (
  <>
    <button
      type="button"
      onClick={onPrev}
      aria-label={common.prevImage[lang]}
      className={cn(baseBtn, 'left-3 md:hover:-translate-x-[3px]', className)}
    >
      <IconArrowLeft width={size} height={size} />
    </button>
    <button
      type="button"
      onClick={onNext}
      aria-label={common.nextImage[lang]}
      className={cn(baseBtn, 'right-3 md:hover:translate-x-[3px]', className)}
    >
      <IconArrowRight width={size} height={size} />
    </button>
  </>
);

export { CarouselNav };
export type { CarouselNavProps };
