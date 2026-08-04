import { useCallback, useSyncExternalStore } from 'react';

export type CookieConsent = 'accepted' | 'rejected' | null;

const STORAGE_KEY = 'edo-cookie-consent';
const CHANGE_EVENT = 'edo-consent-change';

// Trois états, et non deux : « pas encore lu » n'est pas « aucun consentement ».
// Les confondre faisait rendre la bannière côté serveur puis disparaître à
// l'hydratation — un flash à chaque visite d'un visiteur ayant déjà répondu.
// C'est le store qui porte la distinction ; `getServerSnapshot` renvoie
// `unknown`, si bien que serveur et première passe client s'accordent.
type Snapshot = 'accepted' | 'rejected' | 'none' | 'unknown';

function readSnapshot(): Snapshot {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
  } catch {}
  return 'none';
}

// Défini au niveau du module : useSyncExternalStore se réabonne dès que la
// référence change.
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

const serverSnapshot = (): Snapshot => 'unknown';

function writeConsent(value: Exclude<CookieConsent, null>) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {}
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {}
}

export function useCookieConsent(): {
  consent: CookieConsent;
  /** Faux tant que le stockage n'a pas été lu. */
  ready: boolean;
  accept: () => void;
  reject: () => void;
} {
  const snapshot = useSyncExternalStore(
    subscribe,
    readSnapshot,
    serverSnapshot,
  );

  // `writeConsent` émet CHANGE_EVENT : l'abonnement ci-dessus rafraîchit le
  // snapshot, il n'y a donc aucun état local à tenir en parallèle.
  const accept = useCallback(() => writeConsent('accepted'), []);
  const reject = useCallback(() => writeConsent('rejected'), []);

  return {
    consent:
      snapshot === 'accepted' || snapshot === 'rejected' ? snapshot : null,
    ready: snapshot !== 'unknown',
    accept,
    reject,
  };
}

export const COOKIE_CONSENT_EVENT = CHANGE_EVENT;
export const COOKIE_CONSENT_STORAGE_KEY = STORAGE_KEY;
