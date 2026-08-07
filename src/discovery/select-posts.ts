import type { DiscoveryPost } from '../types';

export interface DiscoverySelection {
  // L'article qui porte la page. Le dernier « backstage » s'il existe, sinon le
  // dernier épinglé, sinon le plus récent — la page a toujours une une tant
  // qu'il reste un article.
  headline: DiscoveryPost | null;
  // Tout le reste, épinglés en tête. Un article n'est jamais dans les deux :
  // c'est ce qui garantit qu'aucun ne paraît deux fois sur l'écran.
  rest: DiscoveryPost[];
}

// Hors React et hors i18n, donc couvert par `select-posts.test.ts` — un
// `.test.tsx` ne serait jamais exécuté (`vitest.config.ts` n'inclut que
// `src/**/*.test.ts`).
export const selectPosts = (posts: DiscoveryPost[]): DiscoverySelection => {
  const headline =
    posts.find((p) => p.cat === 'backstage') ??
    posts.find((p) => p.featured) ??
    posts[0] ??
    null;

  const rest = posts.filter((p) => p !== headline);

  // `sort` mute son receveur : `filter` a déjà rendu un tableau neuf, mais on
  // ne trie pas celui du loader.
  const pinnedFirst = [...rest].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
  );

  return { headline, rest: pinnedFirst };
};

export const filterByCategory = (posts: DiscoveryPost[], cat: string) =>
  cat === 'all' ? posts : posts.filter((post) => post.cat === cat);
