import { useEffect } from 'react';
import { useCookieConsent } from './use-cookie-consent';
import { isPreviewActive } from './preview-mode';
import {
  isPostHogEnabled,
  registerSiteLang,
  startPostHog,
  syncConsent,
} from './analytics';

export function usePostHog(lang: string) {
  const { consent, ready } = useCookieConsent();

  // `ready` : avant la lecture du stockage, `consent` vaut null pour tout le
  // monde — démarrer là ferait passer un visiteur ayant accepté par le mode
  // cookieless le temps d'un rendu.
  useEffect(() => {
    if (!ready) return;
    if (!isPostHogEnabled()) return;
    if (isPreviewActive()) return;
    startPostHog();
    syncConsent(consent);
  }, [consent, ready]);

  useEffect(() => {
    if (!ready) return;
    registerSiteLang(lang);
  }, [lang, ready]);
}
