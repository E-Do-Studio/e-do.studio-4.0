import { useT } from '../i18n/use-t';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface CarouselNavProps {
  onPrev: () => void;
  onNext: () => void;
}

// Positionnement et fondu seulement ; le centrage, le curseur, l'anneau de
// focus et la transition viennent de la base de `Button`.
//
// `text-white` n'est pas ici une couleur de thème mais l'opérande du
// `mix-blend-difference` : le résultat est l'inverse exact du média qui passe
// derrière, quel qu'il soit. Le remplacer par un token changerait le calcul.
//
// Centrage par `inset-y-0 my-auto` et non par `-translate-y-1/2` : la base
// pose `active:translate-y-px`, qui écraserait la translation au moment du
// clic et ferait sauter la flèche d'une demi-hauteur.
const navBtn =
  'absolute inset-y-0 z-10 my-auto text-white mix-blend-difference active:scale-95';

const CarouselNav = ({ onPrev, onNext }: CarouselNavProps) => {
  const t = useT();
  return (
    <>
      <Button
        onClick={onPrev}
        aria-label={t('common.prevImage')}
        variant="ghost"
        size="icon-lg"
        className={cn(navBtn, 'left-3 md:hover:-translate-x-[3px]')}
      >
        {/* Sans classe `size-*`, la base contraint l'icône à `size-4` par CSS,
            ce qui l'emporte sur les attributs `width` et `height`. */}
        <ArrowLeft className="size-5" />
      </Button>
      <Button
        onClick={onNext}
        aria-label={t('common.nextImage')}
        variant="ghost"
        size="icon-lg"
        className={cn(navBtn, 'right-3 md:hover:translate-x-[3px]')}
      >
        <ArrowRight className="size-5" />
      </Button>
    </>
  );
};

export { CarouselNav };
export type { CarouselNavProps };
