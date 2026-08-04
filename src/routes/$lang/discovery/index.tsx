import { createFileRoute } from '@tanstack/react-router';
import { DiscoveryVariants } from '../../../discovery-pages';
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
  // noIndex depuis EDO/#366 : le JSON-LD ci-dessous est donc inerte tant que la
  // section reste hors index — il est en place pour que lever le noindex soit
  // une seule ligne à changer, sans oublier le balisage.
  head: ({ params, loaderData }) => {
    const lang = params.lang as Lang;
    return buildSeoHead({
      metaKey: 'discovery',
      lang,
      pathname: '/discovery',
      noIndex: true,
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
  component: DiscoveryVariants,
});
