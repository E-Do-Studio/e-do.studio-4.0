import { createFileRoute } from '@tanstack/react-router';
import { DiscoveryPostPage } from '../../../discovery-post-page';
import { settle } from '../../../lib/route-data';
import { fetchDiscoveryPost, fetchDiscoveryPosts } from '../../../lib/strapi';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';

export const Route = createFileRoute('/$lang/discovery/$slug')({
  loader: async ({ params }) => {
    const [post, posts] = await Promise.all([
      settle(fetchDiscoveryPost(params.slug)),
      settle(fetchDiscoveryPosts()),
    ]);
    return { post, posts };
  },
  head: ({ params, loaderData }) =>
    buildSeoHead({
      metaKey: 'discovery',
      lang: params.lang as Lang,
      pathname: `/discovery/${params.slug}`,
      title: loaderData?.post?.seo?.[params.lang as Lang]?.title || loaderData?.post?.title?.[params.lang as Lang],
      description: loaderData?.post?.seo?.[params.lang as Lang]?.description || loaderData?.post?.sub?.[params.lang as Lang],
      noIndex: true,
    }),
  component: DiscoveryPostPage,
});
