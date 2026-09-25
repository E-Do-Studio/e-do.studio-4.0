import { createFileRoute, notFound } from '@tanstack/react-router';
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
  // `null` veut dire que Strapi a répondu et que l'article n'existe pas : vrai
  // 404. Tout slug répondait 200, indexable et canonique vers lui-même. Une
  // panne (`undefined` ici) garde le rendu dégradé, pour ne pas faire
  // désindexer un article qui existe.
  loader: async ({ params }) => {
    const [post, posts] = await Promise.all([
      fetchDiscoveryPost(params.slug).catch(() => undefined),
      settle(fetchDiscoveryPosts()),
    ]);
    if (post === null) throw notFound();
    return { post: post ?? null, posts };
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
      noIndex: post?.seo?.[lang]?.noIndex,
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
