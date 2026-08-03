import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useRouterState,
  useNavigate,
  redirect,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { useState } from 'react';
import type { Lang } from './types';
import { NavMenu } from './nav-menu';
import { CookieBanner } from './cookie-banner';
import { PreviewBanner } from './preview-banner';
import { useGoogleAnalytics } from './lib/use-google-analytics';
import { useGoogleTagManager } from './lib/use-google-tag-manager';
import { DirectionA } from './direction-editorial';
import { NotFoundPage } from './not-found-page';
import { PageContext, type PageContextValue, type SiteData } from './lib/page-context';
import {
  fetchAnnouncement,
  fetchContact,
  fetchDiscoveryCategories,
  fetchDiscoveryPost,
  fetchDiscoveryPosts,
  fetchGalleryCategories,
  fetchGalleryProjects,
  fetchHomeHero,
  fetchLegalDocuments,
  fetchLegalSectionsByDocument,
  fetchMachines,
  fetchPlateaux,
  fetchPostProdTypes,
  fetchSiteBusinessInfo,
  fetchSiteDefaults,
  fetchSocialLinks,
  fetchStudioHours,
  fetchTeamMembers,
  LEGAL_DOCUMENT_KEYS,
  type LegalDocumentKey,
} from './lib/strapi';

export { usePageContext } from './lib/page-context';

const VALID_LANGS: Lang[] = ['fr', 'en'];
const DEFAULT_LANG: Lang = 'fr';

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem('edo-lang');
    if (stored === 'fr' || stored === 'en') return stored;
  } catch {}
  return DEFAULT_LANG;
}

function persistLang(lang: Lang) {
  try {
    localStorage.setItem('edo-lang', lang);
  } catch {}
}

export const SCREEN_TO_PATH: Record<string, (lang: Lang) => string> = {
  home: (l) => `/${l}`,
  cyclorama: (l) => `/${l}/cyclorama`,
  'plateau-horizontal': (l) => `/${l}/plateau/horizontal`,
  'plateau-vertical': (l) => `/${l}/plateau/vertical`,
  'plateau-eclipse': (l) => `/${l}/plateau/eclipse`,
  'plateau-live': (l) => `/${l}/plateau/live`,
  discovery: (l) => `/${l}/discovery`,
  postprod: (l) => `/${l}/post-production`,
  gallery: (l) => `/${l}/${l === 'fr' ? 'galerie' : 'gallery'}`,
  contact: (l) => `/${l}/contact`,
  book: (l) => `/${l}/${l === 'fr' ? 'reserver' : 'book'}`,
  legal: (l) => `/${l}/legal`,
};

function LangLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const siteData = rootRoute.useLoaderData();
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

// Une panne Strapi ne doit pas faire tomber le site : chaque source est résolue
// indépendamment et retombe sur null, comme le faisaient les hooks qu'elle
// remplace. Le prerender, lui, vérifiera la présence du contenu au build.
const settle = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

const rootRoute = createRootRoute({
  component: LangLayout,
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

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/$lang', params: { lang: detectLang() } });
  },
  component: () => null,
});

const langRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$lang',
  beforeLoad: ({ params }) => {
    if (!VALID_LANGS.includes(params.lang as Lang)) {
      throw redirect({ to: '/$lang', params: { lang: DEFAULT_LANG } });
    }
  },
});

// Chaque loader résout les données de la page avant son rendu. C'est ce qui rend
// le contenu disponible pour un rendu côté Node — et donc présent dans le HTML
// livré — là où un `useEffect` ne s'exécute que dans un navigateur.
// `?cat=` est une cible de redirection 301 depuis les URLs v3 (/galerie?category=…
// → /fr/galerie?cat=…, cf. Caddyfile). « all » est l'état par défaut : il n'est
// jamais écrit dans l'URL.
const galleryValidateSearch = (
  search: Record<string, unknown>,
): { cat?: string; plateau?: string } => {
  const keep = (v: unknown) => (typeof v === 'string' && v && v !== 'all' ? v : undefined);
  const cat = keep(search.cat);
  const plateau = keep(search.plateau);
  return { ...(cat ? { cat } : {}), ...(plateau ? { plateau } : {}) };
};

const galleryLoader = async () => {
  const [projects, categories] = await Promise.all([
    settle(fetchGalleryProjects()),
    settle(fetchGalleryCategories()),
  ]);
  return { projects, categories };
};

const teamLoader = async () => ({ teamMembers: await settle(fetchTeamMembers()) });

const homeRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/',
  loader: async () => {
    const [announcement, homeHero] = await Promise.all([
      settle(fetchAnnouncement()),
      settle(fetchHomeHero()),
    ]);
    return { announcement, homeHero };
  },
  component: DirectionA,
});

const cycloramaRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/cyclorama',
  loader: async () => ({ plateaux: await settle(fetchPlateaux()) }),
  component: lazyRouteComponent(() => import('./plateau-page'), 'CycloramaPage'),
});

const plateauRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/plateau/$slug',
  loader: async () => ({ plateaux: await settle(fetchPlateaux()) }),
  component: lazyRouteComponent(() => import('./plateau-page'), 'PlateauSlugPage'),
});

const discoveryRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/discovery',
  loader: async () => {
    const [posts, categories] = await Promise.all([
      settle(fetchDiscoveryPosts()),
      settle(fetchDiscoveryCategories()),
    ]);
    return { posts, categories };
  },
  component: lazyRouteComponent(() => import('./discovery-pages'), 'DiscoveryVariants'),
});

const discoveryPostRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/discovery/$slug',
  loader: async ({ params }) => {
    const [post, posts] = await Promise.all([
      settle(fetchDiscoveryPost(params.slug)),
      settle(fetchDiscoveryPosts()),
    ]);
    return { post, posts };
  },
  component: lazyRouteComponent(() => import('./discovery-post-page'), 'DiscoveryPostPage'),
});

const postprodRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/post-production',
  // `?type=` est une cible de redirection 301 depuis les URLs v3
  // (/post-production/lookbook → /fr/post-production?type=lookbook, cf.
  // Caddyfile) : le paramètre absent équivaut à la catégorie par défaut, et
  // n'est jamais écrit dans l'URL.
  validateSearch: (search: Record<string, unknown>): { type?: string } =>
    typeof search.type === 'string' && search.type ? { type: search.type } : {},
  loader: async () => ({ postProdTypes: await settle(fetchPostProdTypes()) }),
  component: lazyRouteComponent(() => import('./postprod-page'), 'PostprodPage'),
});

const galleryRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/galerie',
  validateSearch: galleryValidateSearch,
  loader: galleryLoader,
  component: lazyRouteComponent(() => import('./gallery-page'), 'GalleryPageV3'),
});

const galleryEnRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/gallery',
  validateSearch: galleryValidateSearch,
  loader: galleryLoader,
  component: lazyRouteComponent(() => import('./gallery-page'), 'GalleryPageV3'),
});

const contactRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/contact',
  loader: teamLoader,
  component: lazyRouteComponent(() => import('./contact-page'), 'ContactPage'),
});

const bookPickerFrRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver',
  loader: teamLoader,
  component: lazyRouteComponent(() => import('./book/book-picker'), 'BookPicker'),
});

const bookPickerEnRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/book',
  loader: teamLoader,
  component: lazyRouteComponent(() => import('./book/book-picker'), 'BookPicker'),
});

const ConfigStep0 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep0');
const ConfigStep2 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep2');
const ConfigStep3 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep3');
const ConfigStep5 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep5');
const ConfigStep6 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep6');
const ManualBook = lazyRouteComponent(() => import('./book/book-step-routes'), 'ManualBook');

// Le mode manuel garde une seule URL et suit l'étape courante via `?step=N`
// (le configurateur, lui, a une route par étape et ignore ce paramètre).
const manualStepSearch = (search: Record<string, unknown>): { step?: number } => {
  const step = Number(search.step);
  return Number.isInteger(step) ? { step } : {};
};
const BookConfirmation = lazyRouteComponent(() => import('./book/book-confirmation'), 'BookConfirmation');

const bookContactRedirect = (lang: Lang) => () => {
  throw redirect({ to: '/$lang/contact', params: { lang } });
};

const configFrRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver/configurateur',
  component: ConfigStep0,
});
const configFrPlateauRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver/configurateur/plateau',
  component: ConfigStep2,
});
const configFrEquipeRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver/configurateur/equipe',
  component: ConfigStep3,
});
const configFrCoordonneesRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver/configurateur/coordonnees',
  component: ConfigStep5,
});
const configFrDatesRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver/configurateur/dates',
  component: ConfigStep6,
});
const manualFrRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver/manuel',
  validateSearch: manualStepSearch,
  component: ManualBook,
});
const bookFrContactRedirect = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver/contact',
  beforeLoad: bookContactRedirect('fr'),
  component: () => null,
});
const confirmationFrRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver/confirmation',
  component: BookConfirmation,
});

const configEnRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/book/configurator',
  component: ConfigStep0,
});
const configEnStageRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/book/configurator/stage',
  component: ConfigStep2,
});
const configEnTeamRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/book/configurator/team',
  component: ConfigStep3,
});
const configEnDetailsRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/book/configurator/details',
  component: ConfigStep5,
});
const configEnDatesRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/book/configurator/dates',
  component: ConfigStep6,
});
const manualEnRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/book/manual',
  validateSearch: manualStepSearch,
  component: ManualBook,
});
const bookEnContactRedirect = createRoute({
  getParentRoute: () => langRoute,
  path: '/book/contact',
  beforeLoad: bookContactRedirect('en'),
  component: () => null,
});
const confirmationEnRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/book/confirmation',
  component: BookConfirmation,
});

const legalRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/legal',
  // `?doc=` sélectionne le document affiché ; « mentions » est le défaut et
  // n'est jamais écrit dans l'URL.
  validateSearch: (search: Record<string, unknown>): { doc?: LegalDocumentKey } =>
    LEGAL_DOCUMENT_KEYS.includes(search.doc as LegalDocumentKey) && search.doc !== 'mentions'
      ? { doc: search.doc as LegalDocumentKey }
      : {},
  loader: async () => {
    const [documents, sections] = await Promise.all([
      settle(fetchLegalDocuments()),
      settle(fetchLegalSectionsByDocument()),
    ]);
    return { documents, sections };
  },
  component: lazyRouteComponent(() => import('./legal-page'), 'LegalPage'),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  langRoute.addChildren([
    homeRoute,
    cycloramaRoute,
    plateauRoute,
    discoveryRoute,
    discoveryPostRoute,
    postprodRoute,
    galleryRoute,
    galleryEnRoute,
    contactRoute,
    configFrRoute,
    configFrPlateauRoute,
    configFrEquipeRoute,
    configFrCoordonneesRoute,
    configFrDatesRoute,
    manualFrRoute,
    bookFrContactRedirect,
    confirmationFrRoute,
    bookPickerFrRoute,
    configEnRoute,
    configEnStageRoute,
    configEnTeamRoute,
    configEnDetailsRoute,
    configEnDatesRoute,
    manualEnRoute,
    bookEnContactRedirect,
    confirmationEnRoute,
    bookPickerEnRoute,
    legalRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
