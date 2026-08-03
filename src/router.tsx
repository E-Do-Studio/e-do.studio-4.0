import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// L'arbre de routes est généré depuis src/routes/ par @tanstack/router-plugin
// (cf. vite.config.ts). Ne pas éditer routeTree.gen.ts à la main.
//
// Les pages n'importent plus rien d'ici : usePageContext vient de
// lib/page-context et SCREEN_TO_PATH de lib/screens, sans quoi le routeur et
// les pages formeraient un cycle d'imports.
export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
