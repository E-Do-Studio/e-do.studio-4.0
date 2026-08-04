import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { CookieBanner } from '../cookie-banner';
import { getI18n } from '../i18n';
import {
  PageContext,
  type PageContextValue,
  type SiteData,
} from '../lib/page-context';
import { initPreviewMode, isPreviewActive } from '../lib/preview-mode';
import { settle } from '../lib/route-data';
import { SCREEN_TO_PATH } from '../lib/screens';
import { serializeJsonLd } from '../lib/seo-head';
import { META } from '../lib/seo-meta';
import {
  fetchContact,
  fetchMachines,
  fetchSiteBusinessInfo,
  fetchSiteDefaults,
  fetchSocialLinks,
  fetchStudioHours,
} from '../lib/strapi';
import {
  buildLocalBusinessSchema,
  buildWebSiteSchema,
} from '../lib/structured-data';
import { COOKIE_CONSENT_STORAGE_KEY } from '../lib/use-cookie-consent';
import { useGoogleAnalytics } from '../lib/use-google-analytics';
import {
  GTM_CONSENT_CATEGORIES,
  GTM_SCRIPT_ID,
  useGoogleTagManager,
} from '../lib/use-google-tag-manager';
import { NavMenu } from '../nav-menu';
import { NotFoundPage } from '../not-found-page';
import { PreviewBanner } from '../preview-banner';
import type { Lang } from '../types';
// Import à effet de bord, et non `?url` : ce dernier était résolu dans
// l'environnement serveur, qui calcule son propre hash de fichier. Le href posé
// dans le head() ne correspondait donc pas à la feuille réellement émise par le
// build client — 404, page peinte sans style, puis restylée par le JS.
import '../styles.css';

const VALID_LANGS: Lang[] = ['fr', 'en'];
const DEFAULT_LANG: Lang = 'fr';

const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;

// Socle identitaire présent sur toutes les pages : c'est le nœud que tous les
// autres schémas référencent via `@id`. Construit depuis le CMS plutôt qu'écrit
// en dur — l'adresse, le téléphone, les horaires et les réseaux viennent du
// loader ci-dessous. Les schémas spécifiques (Service, BlogPosting…) sont
// ajoutés par le head() de chaque route via buildSeoHead.
function baselineJsonLd(lang: Lang, site: Partial<SiteData> | undefined) {
  return serializeJsonLd([
    buildLocalBusinessSchema({
      lang,
      contact: site?.contact,
      hours: site?.studioHours,
      business: site?.businessInfo,
      socials: site?.socialLinks,
    }),
    buildWebSiteSchema(lang),
  ]);
}

// Amorçage GTM, en ligne dans le <head>.
//
// Deux corrections par rapport à la version précédente :
//
// 1. Le script créé porte désormais l'`id` que useGoogleTagManager cherche pour
//    savoir si le conteneur est déjà là. Sans lui, le garde-fou du hook ne
//    matchait jamais et GTM était chargé deux fois par page.
// 2. Le Consent Mode par défaut est poussé ICI, avant le conteneur. Il vivait
//    dans un useEffect, donc après l'amorçage : le conteneur démarrait sans
//    consentement déclaré.
//
// La forme `gtag()` (push de `arguments`, pas d'un tableau littéral) est celle
// que documente Google pour le Consent Mode.
function gtmBootstrap(id: string): string {
  const safeId = id.replace(/[^\w-]/g, '');
  const denied = GTM_CONSENT_CATEGORIES.map((c) => `${c}:'denied'`).join(',');
  const granted = GTM_CONSENT_CATEGORIES.map((c) => `${c}:'granted'`).join(',');
  return [
    `(function(w,d,s,l,i){w[l]=w[l]||[];function g(){w[l].push(arguments)}`,
    `g('consent','default',{${denied}});`,
    `try{if(localStorage.getItem('${COOKIE_CONSENT_STORAGE_KEY}')==='accepted')g('consent','update',{${granted}})}catch(e){}`,
    `w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});`,
    `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';`,
    `j.id='${GTM_SCRIPT_ID}';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;`,
    `f.parentNode.insertBefore(j,f);`,
    `})(window,document,'script','dataLayer','${safeId}');`,
  ].join('');
}

// Évite un reflow piloté par le swap de police sur le premier rendu.
const CRITICAL_CSS =
  'html,body,#root{margin:0;padding:0;height:100%;background:#fff;font-family:var(--font-sans);color:#141414;overflow:hidden}';

// Doit précéder le premier fetch Strapi côté client pour qu'il voie le drapeau
// preview. Côté Node, getPreviewState() retombe toujours sur « inactif » — le
// drapeau vit dans sessionStorage, inaccessible au serveur. Aucun risque de
// servir un brouillon à un visiteur, mais le rendu serveur d'une entrée preview
// contient le contenu publié : d'où l'invalidation ci-dessous.
if (typeof window !== 'undefined') initPreviewMode();

// Le SSR ayant rendu le contenu publié, on rejoue les loaders côté client dès
// que le mode preview est actif, pour que l'éditeur voie ses brouillons sans
// avoir à naviguer.
function usePreviewRevalidation(router: ReturnType<typeof useRouter>) {
  useEffect(() => {
    if (isPreviewActive()) void router.invalidate();
  }, [router]);
}

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
  usePreviewRevalidation(useRouter());
  // `location` et non `resolvedLocation` : ce dernier est indéfini au premier
  // rendu, côté serveur comme côté client. La langue retombait alors sur `fr`,
  // et /en était servi avec <html lang="fr"> et une navigation en français —
  // d'où un échec d'hydratation sur toutes les routes anglaises.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const langSegment = pathname.split('/')[1];
  const lang: Lang = VALID_LANGS.includes(langSegment as Lang)
    ? (langSegment as Lang)
    : DEFAULT_LANG;
  useGoogleAnalytics(siteData.siteDefaults?.googleAnalyticsId);
  useGoogleTagManager();

  const setLang = useCallback(
    (newLang: Lang) => {
      persistLang(newLang);
      const rest = pathname.replace(/^\/(fr|en)/, '');
      navigate({ to: `/${newLang}${rest}` });
    },
    [pathname, navigate],
  );

  const goto = useCallback(
    (screen: string) => {
      setMenuOpen(false);
      const resolver = SCREEN_TO_PATH[screen];
      if (resolver) navigate({ to: resolver(lang) });
    },
    [lang, navigate],
  );

  const openMenu = useCallback(() => setMenuOpen(true), []);

  // Sans mémo, l'objet était recréé à chaque rendu de la racine : tout
  // consommateur de PageContext re-rendait à chaque changement de route, même
  // quand rien de ce qu'il lit n'avait bougé.
  const pageContext: PageContextValue = useMemo(
    () => ({ lang, setLang, openMenu, goto, siteData }),
    [lang, setLang, openMenu, goto, siteData],
  );

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
          {/* L'instance dérive du même `lang` que <html lang> ci-dessus : le
              provider ne peut pas diverger du document, ni au SSR ni à
              l'hydratation. Il ne sert qu'à <Trans> — `useT()` lit la langue
              directement dans PageContext. */}
          <I18nextProvider i18n={getI18n(lang)}>
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
          </I18nextProvider>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  component: LangLayout,
  notFoundComponent: NotFoundPage,
  // `params.lang` n'existe pas au niveau racine sur toutes les vues (la 404 n'est
  // pas une route) : on retombe sur le français, qui est aussi le x-default.
  head: ({ params, loaderData }) => ({
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
      {
        name: 'twitter:image',
        content: 'https://e-do.studio/twitter-card.png',
      },
    ],
    links: [
      // Pas de lien vers la feuille ici : Vite l'émet depuis son manifeste,
      // avec le hash réel.
      { rel: 'preconnect', href: 'https://cms.e-do.studio', crossOrigin: '' },
      { rel: 'dns-prefetch', href: 'https://cms.e-do.studio' },
      // Coupes critiques : Light (titres), Regular (corps) et Mono Book
      // (eyebrows). Les autres graisses ABC Favorit chargent à la demande.
      {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: '/fonts/ABCFavorit-Light.woff2',
        crossOrigin: '',
      },
      {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: '/fonts/ABCFavorit-Regular_1.woff2',
        crossOrigin: '',
      },
      {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: '/fonts/ABCFavoritMono-Book.woff2',
        crossOrigin: '',
      },
      { rel: 'shortcut icon', href: '/favicon.ico' },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
    // Passe par head() et non par un <style> dans le JSX : HeadContent gère
    // lui-même le contenu du <head>, et un nœud posé à la main à côté de lui
    // fait échouer l'hydratation (React bascule alors tout en rendu client).
    styles: [{ children: CRITICAL_CSS }],
    scripts: [
      {
        type: 'application/ld+json',
        children: baselineJsonLd(
          (params as { lang?: string }).lang === 'en' ? 'en' : DEFAULT_LANG,
          loaderData,
        ),
      },
      ...(GTM_ID ? [{ children: gtmBootstrap(GTM_ID) }] : []),
    ],
  }),
  loader: async (): Promise<SiteData> => {
    const [
      contact,
      socialLinks,
      studioHours,
      businessInfo,
      machines,
      siteDefaults,
    ] = await Promise.all([
      settle(fetchContact()),
      settle(fetchSocialLinks()),
      settle(fetchStudioHours()),
      settle(fetchSiteBusinessInfo()),
      settle(fetchMachines()),
      settle(fetchSiteDefaults()),
    ]);
    return {
      contact,
      socialLinks,
      studioHours,
      businessInfo,
      machines,
      siteDefaults,
    };
  },
});
