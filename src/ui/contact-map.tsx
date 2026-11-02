import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';
import type { ContactInfo } from '../lib/strapi';
import { UnavailableNote } from './unavailable-note';
import { useAfterLoad } from './use-after-load';

function buildMapsEmbedFallback(
  fullAddress?: string,
  street?: string,
  postalCode?: string,
  city?: string,
): string {
  const q =
    fullAddress || [street, postalCode, city].filter(Boolean).join(', ');
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=17&output=embed`;
}

// Le type de carte est encodé dans le token `!5eN` d'un embed Google Maps
// (0 = plan, 1 = satellite, 2 = relief). On force la vue plan quel que soit
// l'embed copié dans Strapi.
function forceMapPlanView(url: string): string {
  return url.replace(/!5e[12]/, '!5e0');
}

interface ContactMapProps {
  contact: ContactInfo | null;
  className?: string;
}

const ContactMap = ({ contact, className }: ContactMapProps) => {
  const t = useT();
  const mapReady = useAfterLoad();
  const c = contact;
  const showFallback = !c;
  const embedUrl = forceMapPlanView(
    c?.mapsEmbedUrl ||
      buildMapsEmbedFallback(
        c?.fullAddress,
        c?.address.street,
        c?.address.postalCode,
        c?.address.city,
      ),
  );
  return (
    <section
      className={cn(
        'relative overflow-hidden bg-[oklch(0.91_0.03_82)]',
        className,
      )}
    >
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <UnavailableNote />
        </div>
      ) : mapReady ? (
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full "
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={t('contact.mapTitle')}
        />
      ) : null}
    </section>
  );
};

export { ContactMap };
