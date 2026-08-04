import {
  fetchGalleryCategories,
  fetchGalleryProjects,
  fetchTeamMembers,
} from './strapi';

// Une panne Strapi ne doit pas faire tomber le site : chaque source est résolue
// indépendamment et retombe sur null, comme le faisaient les hooks qu'elle
// remplace. Le prerender, lui, vérifiera la présence du contenu au build.
export const settle = <T>(p: Promise<T>): Promise<T | null> =>
  p.catch(() => null);

// Loaders partagés par deux routes chacun (FR/EN), d'où leur extraction ici
// plutôt qu'une duplication dans les deux fichiers de route.
export const galleryLoader = async () => {
  const [projects, categories] = await Promise.all([
    settle(fetchGalleryProjects()),
    settle(fetchGalleryCategories()),
  ]);
  return { projects, categories };
};

export const teamLoader = async () => ({
  teamMembers: await settle(fetchTeamMembers()),
});

// `?cat=` est une cible de redirection 301 depuis les URLs v3
// (/galerie?category=… → /fr/galerie?cat=…, cf. Caddyfile). « all » est l'état
// par défaut : il n'est jamais écrit dans l'URL.
export const galleryValidateSearch = (
  search: Record<string, unknown>,
): { cat?: string; plateau?: string } => {
  const keep = (v: unknown) =>
    typeof v === 'string' && v && v !== 'all' ? v : undefined;
  const cat = keep(search.cat);
  const plateau = keep(search.plateau);
  return { ...(cat ? { cat } : {}), ...(plateau ? { plateau } : {}) };
};

// Le mode manuel garde une seule URL et suit l'étape courante via `?step=N`
// (le configurateur, lui, a une route par étape et ignore ce paramètre).
export const manualStepSearch = (
  search: Record<string, unknown>,
): { step?: number } => {
  const step = Number(search.step);
  return Number.isInteger(step) ? { step } : {};
};
