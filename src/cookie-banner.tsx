import { Button } from './ui';
import { useCookieConsent } from './lib/use-cookie-consent';
import { cookieBanner } from './i18n/messages';
import type { Lang } from './types';

interface CookieBannerProps {
  lang: Lang;
  onLegalClick: () => void;
}

const CookieBanner = ({ lang, onLegalClick }: CookieBannerProps) => {
  const { consent, accept, reject } = useCookieConsent();

  if (consent !== null) return null;

  return (
    <div
      role="region"
      aria-label={cookieBanner.ariaLabel[lang]}
      className="fixed inset-x-0 bottom-0 z-modal border-t border-hairline bg-background text-foreground"
    >
      <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-8 md:py-5">
        <div className="flex flex-col gap-1.5 md:max-w-3xl">
          <span className="font-mono text-label tracking-meta uppercase text-primary">
            {cookieBanner.title[lang]}
          </span>
          <p className="text-detail leading-copy text-muted-foreground">
            {cookieBanner.body[lang]}{' '}
            <button
              type="button"
              onClick={onLegalClick}
              className="edo-focus-ring inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-detail text-foreground underline underline-offset-2"
            >
              {cookieBanner.legalLink[lang]}
            </button>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
          <Button variant="outline" size="default" onClick={reject}>
            {cookieBanner.reject[lang]}
          </Button>
          <Button variant="default" size="default" onClick={accept}>
            {cookieBanner.accept[lang]}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { CookieBanner };
export type { CookieBannerProps };
