import type { Lang } from '../types';

// Mapping écran → chemin public, source de vérité des URLs du site.
//
// Vit hors de router.tsx pour que les pages puissent l'importer sans dépendre du
// routeur : avec l'arbre de routes généré (src/routes/), un import page → router
// créerait un cycle, le routeur important déjà les pages.
//
// Toute modification ici change une URL publique — vérifier le sitemap et les
// redirections du Caddyfile avant d'y toucher.
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
