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
import { PageContext, type PageContextValue } from './lib/page-context';

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
  gallery: (l) => `/${l}/galerie`,
  contact: (l) => `/${l}/contact`,
  book: (l) => `/${l}/${l === 'fr' ? 'reserver' : 'book'}`,
  legal: (l) => `/${l}/legal`,
};

function LangLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname ?? '' });
  const langSegment = pathname.split('/')[1];
  const lang: Lang = VALID_LANGS.includes(langSegment as Lang) ? (langSegment as Lang) : DEFAULT_LANG;
  useGoogleAnalytics();
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

const rootRoute = createRootRoute({ component: LangLayout });

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

const homeRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/',
  component: DirectionA,
});

const cycloramaRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/cyclorama',
  component: lazyRouteComponent(() => import('./plateau-page'), 'CycloramaPage'),
});

const plateauRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/plateau/$slug',
  component: lazyRouteComponent(() => import('./plateau-page'), 'PlateauSlugPage'),
});

const discoveryRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/discovery',
  component: lazyRouteComponent(() => import('./discovery-pages'), 'DiscoveryVariants'),
});

const postprodRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/post-production',
  component: lazyRouteComponent(() => import('./postprod-page'), 'PostprodPage'),
});

const galleryRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/galerie',
  component: lazyRouteComponent(() => import('./gallery-page'), 'GalleryPageV3'),
});

const contactRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/contact',
  component: lazyRouteComponent(() => import('./contact-page'), 'ContactPage'),
});

const bookPickerFrRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/reserver',
  component: lazyRouteComponent(() => import('./book/book-picker'), 'BookPicker'),
});

const bookPickerEnRoute = createRoute({
  getParentRoute: () => langRoute,
  path: '/book',
  component: lazyRouteComponent(() => import('./book/book-picker'), 'BookPicker'),
});

const ConfigStep0 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep0');
const ConfigStep2 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep2');
const ConfigStep3 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep3');
const ConfigStep5 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep5');
const ConfigStep6 = lazyRouteComponent(() => import('./book/book-step-routes'), 'ConfigStep6');
const ManualBook = lazyRouteComponent(() => import('./book/book-step-routes'), 'ManualBook');
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
  component: lazyRouteComponent(() => import('./legal-page'), 'LegalPage'),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  langRoute.addChildren([
    homeRoute,
    cycloramaRoute,
    plateauRoute,
    discoveryRoute,
    postprodRoute,
    galleryRoute,
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
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
