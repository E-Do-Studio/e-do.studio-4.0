import { useEffect } from 'react';
import { useSiteDefaults } from './use-strapi';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const SCRIPT_ID = 'edo-ga-script';
const INLINE_ID = 'edo-ga-inline';

export function useGoogleAnalytics() {
  const { data } = useSiteDefaults();
  const gaId = data?.googleAnalyticsId?.trim();

  useEffect(() => {
    if (!gaId) return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);

    const inline = document.createElement('script');
    inline.id = INLINE_ID;
    inline.text = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js', new Date());gtag('config', ${JSON.stringify(gaId)});`;
    document.head.appendChild(inline);
  }, [gaId]);
}
