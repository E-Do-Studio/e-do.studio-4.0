import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useCookieConsent } from './use-cookie-consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const SCRIPT_ID = 'edo-ga-script';
const INLINE_ID = 'edo-ga-inline';

// L'id GA vient du loader racine et descend en argument : ce hook est appelé
// dans LangLayout, au-dessus du PageContext.Provider, donc hors de portée du
// contexte.
export function useGoogleAnalytics(googleAnalyticsId: string | undefined) {
  const { consent } = useCookieConsent();
  const gaId = googleAnalyticsId?.trim();
  const pathname = useRouterState({
    select: (s) => s.resolvedLocation?.pathname ?? '',
  });

  useEffect(() => {
    if (!gaId) return;
    if (consent !== 'accepted') return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);

    const inline = document.createElement('script');
    inline.id = INLINE_ID;
    // send_page_view is disabled on bootstrap; per-route useEffect below
    // emits a page_view on every TanStack navigation, including the first.
    inline.text = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js', new Date());gtag('config', ${JSON.stringify(gaId)}, { send_page_view: false });`;
    document.head.appendChild(inline);
  }, [gaId, consent]);

  useEffect(() => {
    if (!gaId) return;
    if (consent !== 'accepted') return;
    if (typeof window === 'undefined' || typeof window.gtag !== 'function')
      return;
    if (!pathname) return;
    const search = typeof window !== 'undefined' ? window.location.search : '';
    window.gtag('event', 'page_view', {
      page_path: pathname + search,
      page_location:
        typeof window !== 'undefined' ? window.location.href : pathname,
      page_title: typeof document !== 'undefined' ? document.title : undefined,
    });
  }, [gaId, consent, pathname]);
}
