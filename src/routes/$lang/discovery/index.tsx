import { createFileRoute } from '@tanstack/react-router';
import { DiscoveryPage } from '../../../discovery-pages';
import { settle } from '../../../lib/route-data';
import {
  fetchDiscoveryCategories,
  fetchDiscoveryPosts,
} from '../../../lib/strapi';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';
import {
  buildBlogSchema,
  buildPageBreadcrumb,
} from '../../../lib/structured-data';

export const Route = createFileRoute('/$lang/discovery/')({
  head: ({ params, loaderData }) => {
    const lang = params.lang as Lang;
    return buildSeoHead({
      metaKey: 'discovery',
      lang,
      pathname: '/discovery',
      jsonLd: [
        buildBlogSchema(loaderData?.posts ?? [], lang, '/discovery'),
        buildPageBreadcrumb(lang, [
          { name: 'Discovery', pathname: '/discovery' },
        ]),
      ],
    });
  },
  loader: async () => {
    const [posts, categories] = await Promise.all([
      settle(fetchDiscoveryPosts()),
      settle(fetchDiscoveryCategories()),
    ]);
    return { posts, categories };
  },
  component: DiscoveryPage,
});
