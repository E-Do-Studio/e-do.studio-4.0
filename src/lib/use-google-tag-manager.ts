import { useEffect } from 'react';
import { afterNextPaint } from './after-next-paint';
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

// Injecte le conteneur s'il n'est pas déjà là — l'amorçage en ligne l'a posé
// pour un visiteur ayant accepté lors d'une visite précédente.
function loadContainer(gtmId: string) {
  if (document.getElementById(GTM_SCRIPT_ID)) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}

/**
 * Le Consent Mode par défaut est amorcé en ligne dans le <head> (cf.
 * gtmBootstrap dans __root), qui n'injecte le conteneur que si le consentement
 * est déjà acquis. Ce hook relaie les changements ultérieurs, et charge le
 * conteneur au premier « Accepter ».
 */
export function useGoogleTagManager() {
  const gtmId = import.meta.env.VITE_GTM_ID?.trim();

  useEffect(() => {
    if (!gtmId) return;
    // Après la peinture : `consent update` réveille GTM, qui déclenche dans la
    // foulée tous les tags jusque-là bloqués (Ads, GA, HubSpot). Poussé dans
    // le gestionnaire du clic « Accepter », tout ce travail retardait la
    // disparition du bandeau — c'est ce délai que l'INP mesure (issue #401).
    const onConsentChange = () =>
      afterNextPaint(() => {
        const next = readStoredConsent();
        if (!next) return;
        pushConsentUpdate(next);
        if (next === 'granted') loadContainer(gtmId);
      });
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    window.addEventListener('storage', onConsentChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
      window.removeEventListener('storage', onConsentChange);
    };
  }, [gtmId]);
}
