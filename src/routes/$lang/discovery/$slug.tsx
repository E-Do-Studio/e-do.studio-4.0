import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { settle } from '../../../lib/route-data';
import { fetchDiscoveryPost, fetchDiscoveryPosts } from '../../../lib/strapi';

export const Route = createFileRoute('/$lang/discovery/$slug')({
  loader: async ({ params }) => {
    const [post, posts] = await Promise.all([
      settle(fetchDiscoveryPost(params.slug)),
      settle(fetchDiscoveryPosts()),
    ]);
    return { post, posts };
  },
  component: lazyRouteComponent(() => import('../../../discovery-post-page'), 'DiscoveryPostPage'),
});
