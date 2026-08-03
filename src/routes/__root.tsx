import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { Lang } from '../types';
import { initPreviewMode } from '../lib/preview-mode';
import { NavMenu } from '../nav-menu';
import { CookieBanner } from '../cookie-banner';
import { PreviewBanner } from '../preview-banner';
import { NotFoundPage } from '../not-found-page';
import { useGoogleAnalytics } from '../lib/use-google-analytics';
import { useGoogleTagManager } from '../lib/use-google-tag-manager';
import { PageContext, type PageContextValue, type SiteData } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
import { META } from '../lib/seo-meta';
import { settle } from '../lib/route-data';
import {
  fetchContact,
  fetchMachines,
  fetchSiteBusinessInfo,
  fetchSiteDefaults,
  fetchSocialLinks,
  fetchStudioHours,
} from '../lib/strapi';
import appCss from '../styles.css?url';

const VALID_LANGS: Lang[] = ['fr', 'en'];
const DEFAULT_LANG: Lang = 'fr';

const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;

// Organization + WebSite : socle identitaire présent sur toutes les pages. Les
// schémas spécifiques (LocalBusiness, Service, BlogPosting…) sont ajoutés par
// le head() de chaque route via buildSeoHead.
const BASELINE_JSONLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://e-do.studio/#organization',
      name: 'E-Do Studio',
      url: 'https://e-do.studio',
      logo: 'https://e-do.studio/brand/logo-full.webp',
      description:
        'Studio photo et vidéo professionnel à Paris. Location de plateaux, cyclorama et services de post-production.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Paris',
        addressCountry: 'FR',
      },
      knowsAbout: ['photographie', 'vidéo', 'post-production', 'cyclorama', 'studio photo'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://e-do.studio/#website',
      url: 'https://e-do.studio',
      name: 'E-Do Studio',
      inLanguage: 'fr-FR',
      publisher: { '@id': 'https://e-do.studio/#organization' },
    },
  ],
});

// Évite un reflow piloté par le swap de police sur le premier rendu.
const CRITICAL_CSS =
  'html,body,#root{margin:0;padding:0;height:100%;background:#fff;font-family:var(--font-sans);color:#141414;overflow:hidden}';

// Doit précéder le premier fetch Strapi pour que celui-ci voie le drapeau
// preview. Côté Node (prerender), getPreviewState() retombe sur « inactif » :
// le HTML prérendu contient donc toujours le contenu publié, jamais un brouillon.
if (typeof window !== 'undefined') initPreviewMode();

// Clic droit et glisser-déposer désactivés sur les médias — les visuels sont
// ceux des clients du studio.
const MEDIA_TAGS = new Set(['IMG', 'PICTURE', 'VIDEO', 'SOURCE', 'SVG']);
const isMedia = (target: EventTarget | null) =>
  target instanceof Element && MEDIA_TAGS.has(target.tagName.toUpperCase());

function useMediaGuards() {
  useEffect(() => {
    const block = (event: Event) => {
      if (isMedia(event.target)) event.preventDefault();
    };
    window.addEventListener('contextmenu', block);
    window.addEventListener('dragstart', block);
    return () => {
      window.removeEventListener('contextmenu', block);
      window.removeEventListener('dragstart', block);
    };
  }, []);
}

function persistLang(lang: Lang) {
  try {
    localStorage.setItem('edo-lang', lang);
  } catch {}
}

function LangLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const siteData = Route.useLoaderData();
  useMediaGuards();
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
    <html lang={lang}>
      <head>
        <HeadContent />
      </head>
      <body>
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(GTM_ID)}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <div id="root">
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
        </div>
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  component: LangLayout,
  notFoundComponent: NotFoundPage,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width,initial-scale=1' },
      // Repli pour toute vue sans head() propre — au premier chef la 404, qui
      // n'est pas une route. Chaque route indexable les écrase via buildSeoHead.
      { title: META.home.fr.title },
      { name: 'description', content: META.home.fr.description },
      { name: 'theme-color', content: '#ffffff' },
      { name: 'color-scheme', content: 'light' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'E-Do Studio' },
      { property: 'og:image', content: 'https://e-do.studio/og-image.png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: 'E-Do Studio — Studio photo & vidéo professionnel à Paris',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: 'https://e-do.studio/twitter-card.png' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://cms.e-do.studio', crossOrigin: '' },
      { rel: 'dns-prefetch', href: 'https://cms.e-do.studio' },
      // Coupes critiques : Light (titres), Regular (corps) et Mono Book
      // (eyebrows). Les autres graisses ABC Favorit chargent à la demande.
      { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/ABCFavorit-Light.woff2', crossOrigin: '' },
      { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/ABCFavorit-Regular_1.woff2', crossOrigin: '' },
      { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/ABCFavoritMono-Book.woff2', crossOrigin: '' },
      { rel: 'shortcut icon', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
    // Passe par head() et non par un <style> dans le JSX : HeadContent gère
    // lui-même le contenu du <head>, et un nœud posé à la main à côté de lui
    // fait échouer l'hydratation (React bascule alors tout en rendu client).
    styles: [{ children: CRITICAL_CSS }],
    scripts: [
      { type: 'application/ld+json', children: BASELINE_JSONLD },
      ...(GTM_ID
        ? [{
            children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID.replace(/'/g, "")}');`,
          }]
        : []),
    ],
  }),
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
