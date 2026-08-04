import { Button } from '@/components/ui/button';
import { useCookieConsent } from './lib/use-cookie-consent';
import { Trans } from 'react-i18next';
import { useT } from './i18n/use-t';
import type { Lang } from './types';

interface CookieBannerProps {
  lang: Lang;
  onLegalClick: () => void;
}

const CookieBanner = ({ lang, onLegalClick }: CookieBannerProps) => {
  const t = useT();
  const { consent, ready, accept, reject } = useCookieConsent();

  // Rien tant que le stockage n'est pas lu : le serveur et le premier rendu
  // client s'accordent, et un visiteur ayant déjà répondu ne voit plus la
  // bannière apparaître puis disparaître.
  if (!ready || consent !== null) return null;

  return (
    <div
      role="region"
      aria-label={t('cookieBanner.ariaLabel')}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background text-foreground"
    >
      <div className="flex flex-col md:flex-row md:items-stretch">
        <div className="flex flex-1 flex-col gap-1.5 px-5 py-4 md:px-8 md:py-5">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            {t('cookieBanner.title')}
          </span>
          {/* Le lien vit dans la traduction : le séparer de la phrase figeait
              sa position en fin de texte, ce qui ne tient pas dans toutes les
              langues. Forme nommée — le bouton porte trop de props pour être
              référencé positionnellement. */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            <Trans
              i18nKey="cookieBanner.bodyWithLink"
              components={{
                legal: (
                  <Button
                    variant="link"
                    onClick={onLegalClick}
                    className="inline h-auto p-0 text-sm normal-case tracking-normal text-foreground underline underline-offset-2"
                  />
                ),
              }}
            />
          </p>
        </div>
        <div className="grid grid-cols-2 md:flex md:shrink-0">
          <Button
            variant="outline"
            onClick={reject}
            className="h-auto self-stretch  border-t border-l border-border px-6 md:border-t-0 md:px-8"
          >
            {t('cookieBanner.reject')}
          </Button>
          <Button
            variant="default"
            onClick={accept}
            className="h-auto self-stretch  border-t border-l border-border px-6 md:border-t-0 md:px-8"
          >
            {t('cookieBanner.accept')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { CookieBanner };
export type { CookieBannerProps };
