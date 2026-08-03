import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import type { Lang } from '../types';
import { NavMenu } from '../nav-menu';
import { CookieBanner } from '../cookie-banner';
import { PreviewBanner } from '../preview-banner';
import { NotFoundPage } from '../not-found-page';
import { useGoogleAnalytics } from '../lib/use-google-analytics';
import { useGoogleTagManager } from '../lib/use-google-tag-manager';
import { PageContext, type PageContextValue, type SiteData } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
import { settle } from '../lib/route-data';
import {
  fetchContact,
  fetchMachines,
  fetchSiteBusinessInfo,
  fetchSiteDefaults,
  fetchSocialLinks,
  fetchStudioHours,
} from '../lib/strapi';

const VALID_LANGS: Lang[] = ['fr', 'en'];
const DEFAULT_LANG: Lang = 'fr';

function persistLang(lang: Lang) {
  try {
    localStorage.setItem('edo-lang', lang);
  } catch {}
}

function LangLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const siteData = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname ?? '' });
  const langSegment = pathname.split('/')[1];
  const lang: Lang = VALID_LANGS.includes(langSegment as Lang) ? (langSegment as Lang) : DEFAULT_LANG;
  useGoogleAnalytics(siteData.siteDefaults?.googleAnalyticsId);
  useGoogleTagManager();

  const setLang = (newLang: Lang) => {
    persistLang(newLang);
    const rest = pathname.replace(/^\/(fr|en)/, '');
    navigate({ to: `/${newLang}${rest}` });
  };

  const goto = (screen: string) => {
    setMenuOpen(false);
    const resolver = SCREEN_TO_PATH[screen];
    if (resolver) navigate({ to: resolver(lang) });
  };

  const pageContext: PageContextValue = {
    lang,
    setLang,
    openMenu: () => setMenuOpen(true),
    goto,
    siteData,
  };

  return (
    <PageContext.Provider value={pageContext}>
      <Outlet />
      <NavMenu
        lang={lang}
        setLang={setLang}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <CookieBanner lang={lang} onLegalClick={() => goto('legal')} />
      <PreviewBanner lang={lang} />
    </PageContext.Provider>
  );
}

export const Route = createRootRoute({
  component: LangLayout,
  notFoundComponent: NotFoundPage,
  loader: async (): Promise<SiteData> => {
    const [contact, socialLinks, studioHours, businessInfo, machines, siteDefaults] =
      await Promise.all([
        settle(fetchContact()),
        settle(fetchSocialLinks()),
        settle(fetchStudioHours()),
        settle(fetchSiteBusinessInfo()),
        settle(fetchMachines()),
        settle(fetchSiteDefaults()),
      ]);
    return { contact, socialLinks, studioHours, businessInfo, machines, siteDefaults };
  },
});
