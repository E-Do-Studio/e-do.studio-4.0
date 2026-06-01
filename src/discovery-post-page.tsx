import { useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { useDiscoveryPost } from './lib/use-strapi';
import { buildBlogPostingSchema, buildBreadcrumbSchema } from './lib/structured-data';
import { renderMarkdown } from './lib/render-markdown';
import { DiscoveryCoverMedia } from './discovery/discovery-cover';
import { ArticleMeta, ArrowIcon } from './discovery/shared';
import { Loader, HoverMarquee } from './ui';
import { discoveryPage } from './i18n/messages';
import { usePageContext } from './router';
import { NotFoundPage } from './not-found-page';

export const DiscoveryPostPage = () => {
  const { lang } = usePageContext();
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const navigate = useNavigate();
  const { data: post, loading } = useDiscoveryPost(slug);

  const bodyHtml = useMemo(() => (post ? renderMarkdown(post.body[lang]) : ''), [post, lang]);

  const seoOverride = post?.seo?.[lang]
    ? {
        title: post.seo[lang].title,
        description: post.seo[lang].description,
        imageUrl: post.seo[lang].imageUrl ?? post.coverUrl,
        noIndex: post.seo[lang].noIndex,
      }
    : post
      ? { title: post.title[lang], description: post.sub[lang], imageUrl: post.coverUrl }
      : undefined;

  useDocumentMeta('discovery', lang, seoOverride);
  useStructuredData(
    post ? `post-${post.slug}` : 'post-loading',
    post
      ? [
          buildBlogPostingSchema(post, lang, `/discovery/${post.slug}`),
          buildBreadcrumbSchema(
            [
              { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
              { name: 'Discovery', pathname: '/discovery' },
              { name: post.title[lang], pathname: `/discovery/${post.slug}` },
            ],
            lang,
          ),
        ]
      : [],
  );

  if (loading) {
    return <Loader lang={lang} size="page" />;
  }
  if (!post) {
    return <NotFoundPage />;
  }

  const backToIndex = () => navigate({ to: '/$lang/discovery', params: { lang } });

  return (
    <main className="edo-page-enter grid w-full grid-rows-page min-h-screen edo-hairline overflow-hidden">
      <div className="row-start-1 flex edo-hairline">
        <button
          onClick={backToIndex}
          className="edo-focus-ring flex flex-none cursor-pointer items-center gap-2.5 border-0 bg-white px-4 text-foreground transition-colors hover:bg-muted md:px-cell-lg"
        >
          <span className="inline-block rotate-180"><ArrowIcon width="14" height="14" /></span>
          <span className="hidden font-mono text-caption uppercase tracking-label text-foreground sm:inline">
            {discoveryPage.backToJournal[lang]}
          </span>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3.5 bg-white px-4 md:px-6">
          <span className="edo-cell-label text-primary">{post.tag[lang]}</span>
          <HoverMarquee className="font-mono text-label tracking-ui text-muted-foreground">
            {post.read} · {post.author} · {post.date[lang]}
          </HoverMarquee>
        </div>
      </div>

      <div className="row-start-2 grid min-h-0 grid-cols-1 edo-hairline overflow-y-auto md:grid-cols-overlay md:overflow-hidden">
        <div className="relative min-h-64 bg-foreground md:min-h-0">
          <DiscoveryCoverMedia
            post={post}
            lang={lang}
            sizes="(min-width: 768px) 55vw, 100vw"
            priority
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <article className="flex min-h-0 flex-col gap-5 overflow-y-auto bg-white px-6 py-8 md:px-12 md:py-10">
          <ArticleMeta post={post} lang={lang} />
          <h1 className="m-0 text-balance text-hero font-light leading-none tracking-display text-foreground">
            {post.title[lang]}
          </h1>
          {post.sub[lang] && (
            <p className="m-0 text-pretty text-cell font-normal leading-copy text-foreground">
              {post.sub[lang]}
            </p>
          )}
          {bodyHtml && (
            <div
              className="prose prose-sm m-0 max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-medium [&_hr]:my-6 [&_hr]:border-border [&_img]:my-4 [&_img]:rounded [&_video]:my-4 [&_video]:block [&_video]:w-full [&_video]:h-auto [&_video]:rounded [&_li]:ml-4 [&_p]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
          <footer className="mt-auto flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-label uppercase tracking-code text-muted-foreground">
              {post.author} · {post.date[lang]}
            </span>
            <button
              onClick={backToIndex}
              className="edo-focus-ring h-10 cursor-pointer border-0 bg-foreground px-cell-lg font-mono text-caption uppercase tracking-label text-white transition-[color,background-color,opacity] duration-150 ease-edo-out hover:text-primary"
            >
              {discoveryPage.close[lang]}
            </button>
          </footer>
        </article>
      </div>
    </main>
  );
};
