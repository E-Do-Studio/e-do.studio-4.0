import { Button } from '@/components/ui/button';
import { useT } from '../i18n/use-t';

interface BookingModeBannerProps {
  onReset: () => void;
  onConfigurator: () => void;
}

/**
 * Bandeau du flux manuel : rappelle que le configurateur existe, et offre de
 * repartir de zéro. Le configurateur porte son bandeau symétrique.
 */
const BookingModeBanner = ({
  onReset,
  onConfigurator,
}: BookingModeBannerProps) => {
  const t = useT();
  return (
    <div className="flex flex-col md:flex-row md:items-stretch md:min-h-11 bg-muted box-border shrink-0 border-b border-border">
      <span className="font-mono text-xs tracking-wider uppercase text-muted-foreground px-5 py-3 md:py-0 md:self-center md:pl-5 md:pr-3 flex-1 min-w-0 leading-relaxed">
        {t('booking.manualOr')}
        <span className="text-foreground">{t('booking.letUsGuide')}</span>
      </span>
      <div className="flex items-stretch border-t border-border md:border-t-0 md:flex-none md:w-1/2">
        <Button
          type="button"
          variant="ghost"
          onClick={onReset}
          className="h-auto flex-1 border-l border-border px-5 py-3 tracking-wider leading-normal hover:bg-background md:py-0"
        >
          ↻ {t('common.reset')}
        </Button>
        <Button
          type="button"
          onClick={onConfigurator}
          className="h-auto flex-1 border-l border-border px-5 py-3 font-semibold tracking-wider md:py-0"
        >
          ← {t('booking.configurator')}
        </Button>
      </div>
    </div>
  );
};

export { BookingModeBanner };
export type { BookingModeBannerProps };
