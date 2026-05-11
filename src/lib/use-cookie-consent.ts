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
  accept: () => void;
  reject: () => void;
} {
  const [consent, setConsent] = useState<CookieConsent>(() => readConsent());

  useEffect(() => {
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

  return { consent, accept, reject };
}

export const COOKIE_CONSENT_EVENT = CHANGE_EVENT;
export const COOKIE_CONSENT_STORAGE_KEY = STORAGE_KEY;
