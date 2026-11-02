import { cn } from '@/lib/utils';
import { usePageContext } from './lib/page-context';
import { MarqueeCell } from './ui/marquee-cell';
import { PhoneCell } from './ui/phone-cell';
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
          ? 'app:grid-cols-[minmax(0,1fr)_2fr_auto]'
          : 'app:grid-cols-[minmax(0,1fr)_2fr]',
        className,
      )}
    >
      <SocialLinksRow layout="row" className="h-12 app:h-11" />
      <div className="flex h-11 min-w-0 items-center overflow-hidden bg-background">
        <MarqueeCell size={20} />
      </div>
      {phone && phoneHref && (
        // `order-first` en mobile : empilé, un numéro de téléphone se compose
        // d'un pouce, il passe donc avant le bandeau de marques.
        <PhoneCell
          phone={phone}
          phoneHref={phoneHref}
          className="order-first app:order-none"
        />
      )}
    </div>
  );
};

export { SocialClientsBar };
export type { SocialClientsBarProps };
