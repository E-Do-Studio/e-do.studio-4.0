import { useEffect } from 'react';
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
} from './use-cookie-consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/** Id posé sur le <script> par l'amorçage en ligne (cf. routes/__root.tsx). */
export const GTM_SCRIPT_ID = 'edo-gtm-script';

export const GTM_CONSENT_CATEGORIES = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
] as const;

type ConsentState = 'granted' | 'denied';

// L'API Consent de GTM attend la forme de l'objet `arguments` du shim gtag()
// — un objet indexé numériquement avec `length` — et non un tableau littéral.
// Le rest param de TypeScript ne donne pas accès à `arguments`, on reconstruit
// donc cette forme explicitement.
function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  const argumentsLike: Record<string, unknown> = { length: args.length };
  args.forEach((a, i) => {
    argumentsLike[i] = a;
  });
  window.dataLayer.push(argumentsLike);
}

function pushConsentUpdate(state: ConsentState) {
  const payload: Record<string, ConsentState> = {};
  for (const c of GTM_CONSENT_CATEGORIES) payload[c] = state;
  gtag('consent', 'update', payload);
}

function readStoredConsent(): ConsentState | null {
  try {
    const v = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (v === 'accepted') return 'granted';
    if (v === 'rejected') return 'denied';
  } catch {}
  return null;
}

/**
 * Ne charge PAS GTM : le conteneur et le Consent Mode par défaut sont amorcés en
 * ligne dans le <head>, avant l'hydratation (cf. gtmBootstrap dans __root).
 * Ce hook ne fait que relayer les changements de consentement ultérieurs.
 */
export function useGoogleTagManager() {
  const gtmId = import.meta.env.VITE_GTM_ID?.trim();

  useEffect(() => {
    if (!gtmId) return;
    const onConsentChange = () => {
      const next = readStoredConsent();
      if (next) pushConsentUpdate(next);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    window.addEventListener('storage', onConsentChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
      window.removeEventListener('storage', onConsentChange);
    };
  }, [gtmId]);
}
