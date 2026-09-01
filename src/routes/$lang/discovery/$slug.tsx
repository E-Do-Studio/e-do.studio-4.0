import { createFileRoute } from '@tanstack/react-router';
import { DiscoveryPostPage } from '../../../discovery-post-page';
import { settle } from '../../../lib/route-data';
import { fetchDiscoveryPost, fetchDiscoveryPosts } from '../../../lib/strapi';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';
import {
  buildBlogPostingSchema,
  buildPageBreadcrumb,
} from '../../../lib/structured-data';

export const Route = createFileRoute('/$lang/discovery/$slug')({
  loader: async ({ params }) => {
    const [post, posts] = await Promise.all([
      settle(fetchDiscoveryPost(params.slug)),
      settle(fetchDiscoveryPosts()),
    ]);
    return { post, posts };
  },
  head: ({ params, loaderData }) => {
    const lang = params.lang as Lang;
    const pathname = `/discovery/${params.slug}`;
    const post = loaderData?.post;
    return buildSeoHead({
      metaKey: 'discovery',
      lang,
      pathname,
      title: post?.seo?.[lang]?.title || post?.title?.[lang],
      description: post?.seo?.[lang]?.description || post?.sub?.[lang],
      jsonLd: [
        post && buildBlogPostingSchema(post, lang, pathname),
        buildPageBreadcrumb(lang, [
          { name: 'Discovery', pathname: '/discovery' },
          { name: post?.title?.[lang] || params.slug, pathname },
        ]),
      ],
    });
  },
  component: DiscoveryPostPage,
});
