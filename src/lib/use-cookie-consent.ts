import { useCallback, useEffect, useState } from 'react';

export type CookieConsent = 'accepted' | 'rejected' | null;

const STORAGE_KEY = 'edo-cookie-consent';
const CHANGE_EVENT = 'edo-consent-change';

function readConsent(): CookieConsent {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
  } catch {}
  return null;
}

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
  /** Faux tant que le stockage n'a pas été lu — voir la note ci-dessous. */
  ready: boolean;
  accept: () => void;
  reject: () => void;
} {
  // L'état ne peut pas être amorcé depuis localStorage : le serveur n'y a pas
  // accès et rendait donc toujours la bannière, quand le client la retirait
  // aussitôt. Résultat, un flash de bannière à chaque visite d'un visiteur ayant
  // déjà répondu, plus une incohérence d'hydratation.
  //
  // `ready` distingue « stockage pas encore lu » de « aucun consentement
  // enregistré ». Sans lui, le premier rendu client afficherait la bannière puis
  // la retirerait : on aurait juste déplacé le flash.
  const [consent, setConsent] = useState<CookieConsent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
    const onChange = () => setConsent(readConsent());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const accept = useCallback(() => {
    writeConsent('accepted');
    setConsent('accepted');
  }, []);

  const reject = useCallback(() => {
    writeConsent('rejected');
    setConsent('rejected');
  }, []);

  return { consent, ready, accept, reject };
}

export const COOKIE_CONSENT_EVENT = CHANGE_EVENT;
export const COOKIE_CONSENT_STORAGE_KEY = STORAGE_KEY;
