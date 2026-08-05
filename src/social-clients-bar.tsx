import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Phone } from 'lucide-react';
import { usePageContext } from './lib/page-context';
import { MarqueeCell } from './ui/marquee-cell';
import { SocialLinksRow } from './ui/social-links-row';

interface SocialClientsBarProps {
  className?: string;
}

/**
 * Bande sociale : réseaux, marques clientes, et le numéro du studio.
 *
 * Le téléphone occupait une cellule de la bande de navigation sur l'accueil.
 * C'est le seul élément de conversion de la page : l'enterrer dans le tiroir
 * aurait coûté un appui de plus sur celui des liens qui en mérite le moins. Il
 * descend d'une rangée, dans la bande qui dit déjà comment nous joindre, et
 * gagne au passage Discovery, qui rend la même bande.
 *
 * Le contexte est lu ici et non par les pages : ni l'accueil ni Discovery n'ont
 * de prop à faire descendre, exactement comme pour SocialLinksRow.
 */
const SocialClientsBar = ({ className }: SocialClientsBarProps) => {
  const { siteData } = usePageContext();
  const phone = siteData.contact?.phone;
  const phoneHref =
    siteData.contact?.phoneHref ??
    (phone ? `tel:${phone.replace(/\s/g, '')}` : undefined);

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-px bg-border',
        // Le gabarit suit la présence du numéro : une troisième piste vide
        // laisserait quand même son filet de séparation au bord de la bande.
        phone
          ? 'md:grid-cols-[minmax(0,1fr)_2fr_auto]'
          : 'md:grid-cols-[minmax(0,1fr)_2fr]',
        className,
      )}
    >
      <SocialLinksRow layout="row" className="h-12 md:h-11" />
      <div className="flex h-11 min-w-0 items-center overflow-hidden bg-background">
        <MarqueeCell size={20} />
      </div>
      {phone && (
        <Button
          variant="cell"
          render={<a href={phoneHref} />}
          // `order-first` en mobile : empilé, un numéro de téléphone se compose
          // d'un pouce, il passe donc avant le bandeau de marques.
          className="order-first h-11 flex-row items-center justify-center gap-2 px-4 font-mono text-xs tracking-widest whitespace-nowrap no-underline md:order-none"
        >
          <Phone />
          {phone.replace(/^\+33\s?/, '0')}
        </Button>
      )}
    </div>
  );
};

export { SocialClientsBar };
export type { SocialClientsBarProps };
