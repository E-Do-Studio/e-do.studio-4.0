import { useEffect } from 'react';
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_STORAGE_KEY } from './use-cookie-consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const SCRIPT_ID = 'edo-gtm-script';

type ConsentState = 'granted' | 'denied';

const CONSENT_CATEGORIES = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
] as const;

function pushConsent(command: 'default' | 'update', state: ConsentState) {
  window.dataLayer = window.dataLayer || [];
  const payload: Record<string, ConsentState> = {};
  for (const c of CONSENT_CATEGORIES) payload[c] = state;
  window.dataLayer.push(['consent', command, payload]);
}

function loadGtm(id: string) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

function readStoredConsent(): ConsentState | null {
  try {
    const v = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (v === 'accepted') return 'granted';
    if (v === 'rejected') return 'denied';
  } catch {}
  return null;
}

export function useGoogleTagManager() {
  const gtmId = import.meta.env.VITE_GTM_ID?.trim();

  useEffect(() => {
    if (!gtmId) return;
    if (document.getElementById(SCRIPT_ID)) return;

    pushConsent('default', 'denied');
    const stored = readStoredConsent();
    if (stored === 'granted') pushConsent('update', 'granted');

    loadGtm(gtmId);

    const onConsentChange = () => {
      const next = readStoredConsent();
      if (next) pushConsent('update', next);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    window.addEventListener('storage', onConsentChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
      window.removeEventListener('storage', onConsentChange);
    };
  }, [gtmId]);
}
