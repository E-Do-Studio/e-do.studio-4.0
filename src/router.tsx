import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { NotFoundPage } from './not-found-page';

// TanStack Start impose une fabrique : une instance neuve par invocation, le
// rendu côté serveur ne pouvant pas partager un routeur entre requêtes.
//
// L'arbre est généré depuis src/routes/ (cf. vite.config.ts) — ne pas éditer
// routeTree.gen.ts à la main. Les pages n'importent rien d'ici : usePageContext
// vient de lib/page-context et SCREEN_TO_PATH de lib/screens, faute de quoi le
// routeur et les pages formeraient un cycle d'imports.
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFoundPage,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
