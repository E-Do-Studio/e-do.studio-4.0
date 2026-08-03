import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { settle } from '../../../lib/route-data';
import { fetchDiscoveryCategories, fetchDiscoveryPosts } from '../../../lib/strapi';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';

export const Route = createFileRoute('/$lang/discovery/')({
  head: ({ params }) =>
    buildSeoHead({
      metaKey: 'discovery',
      lang: params.lang as Lang,
      pathname: '/discovery',
      noIndex: true,
    }),
  loader: async () => {
    const [posts, categories] = await Promise.all([
      settle(fetchDiscoveryPosts()),
      settle(fetchDiscoveryCategories()),
    ]);
    return { posts, categories };
  },
  component: lazyRouteComponent(() => import('../../../discovery-pages'), 'DiscoveryVariants'),
});
