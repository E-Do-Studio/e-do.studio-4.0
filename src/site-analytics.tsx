import { useGoogleAnalytics } from './lib/use-google-analytics';
import { useGoogleTagManager } from './lib/use-google-tag-manager';
import { usePostHog } from './lib/use-posthog';
import type { Lang } from './types';

interface SiteAnalyticsProps {
  lang: Lang;
  googleAnalyticsId: string | undefined;
}

// Les hooks de mesure, dans une feuille qui ne rend rien.
//
// Ils vivaient dans `LangLayout`, et deux d'entre eux lisent le consentement :
// un clic sur « Accepter » re-rendait donc la racine, et avec elle la page
// entière, dans la tâche même du clic — du temps compté par l'INP pour faire
// disparaître un bandeau (issue #401). Ici, seul ce composant se re-rend.
export const SiteAnalytics = ({
  lang,
  googleAnalyticsId,
}: SiteAnalyticsProps) => {
  useGoogleAnalytics(googleAnalyticsId);
  useGoogleTagManager();
  usePostHog(lang);
  return null;
};
