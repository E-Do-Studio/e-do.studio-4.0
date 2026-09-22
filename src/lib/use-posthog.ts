import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useCookieConsent } from './use-cookie-consent';
import { isPreviewActive } from './preview-mode';
import {
  capturePageview,
  isPostHogEnabled,
  optInPostHog,
  startPostHog,
  stopPostHog,
} from './analytics';

export function usePostHog() {
  const { consent } = useCookieConsent();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isPostHogEnabled()) return;
    if (isPreviewActive()) return;
    if (consent === 'accepted') {
      startPostHog();
      optInPostHog();
      return;
    }
    if (consent === 'rejected') stopPostHog();
  }, [consent]);

  useEffect(() => {
    if (!isPostHogEnabled()) return;
    if (consent !== 'accepted') return;
    if (!pathname) return;
    if (isPreviewActive()) return;
    capturePageview(pathname + window.location.search);
  }, [consent, pathname]);
}
