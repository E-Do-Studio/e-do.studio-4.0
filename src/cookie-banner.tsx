import { useCallback, useRef, useState } from 'react';
import { Button, cn } from './ui';
import { useCookieConsent } from './lib/use-cookie-consent';
import { cookieBanner } from './i18n/messages';
import type { Lang } from './types';

interface CookieBannerProps {
  lang: Lang;
  onLegalClick: () => void;
}

const CookieBanner = ({ lang, onLegalClick }: CookieBannerProps) => {
  const { consent, accept, reject } = useCookieConsent();
  // The chosen action is deferred until the exit animation finishes, otherwise
  // writing consent flips `consent` and unmounts the card before it animates out.
  const pendingRef = useRef<(() => void) | null>(null);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback((action: () => void) => {
    pendingRef.current = action;
    setLeaving(true);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    if (!leaving) return;
    const action = pendingRef.current;
    pendingRef.current = null;
    action?.();
  }, [leaving]);

  if (consent !== null) return null;

  return (
    <div
      role="region"
      aria-label={cookieBanner.ariaLabel[lang]}
      onAnimationEnd={handleAnimationEnd}
      className={cn(
        'fixed inset-x-3 bottom-3 z-modal flex flex-col',
        'md:inset-x-auto md:bottom-6 md:right-6 md:w-96',
        'border border-hairline bg-background text-foreground',
        'shadow-[0_12px_40px_-12px_rgb(0_0_0/0.25)]',
        leaving ? 'edo-cookie-pop-out' : 'edo-cookie-pop-in',
      )}
    >
      <div className="flex flex-col gap-2 px-5 py-4 md:px-6 md:py-5">
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
      <div className="grid grid-cols-2 border-t border-hairline">
        <Button
          variant="outline"
          onClick={() => dismiss(reject)}
          className="h-auto! border-0! border-r! border-hairline! py-4!"
        >
          {cookieBanner.reject[lang]}
        </Button>
        <Button
          variant="default"
          onClick={() => dismiss(accept)}
          className="h-auto! py-4!"
        >
          {cookieBanner.accept[lang]}
        </Button>
      </div>
    </div>
  );
};

export { CookieBanner };
export type { CookieBannerProps };
