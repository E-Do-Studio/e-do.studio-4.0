import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { settle } from '../../../lib/route-data';
import { fetchDiscoveryCategories, fetchDiscoveryPosts } from '../../../lib/strapi';

export const Route = createFileRoute('/$lang/discovery/')({
  loader: async () => {
    const [posts, categories] = await Promise.all([
      settle(fetchDiscoveryPosts()),
      settle(fetchDiscoveryCategories()),
    ]);
    return { posts, categories };
  },
  component: lazyRouteComponent(() => import('../../../discovery-pages'), 'DiscoveryVariants'),
});
