import { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { useDiscoveryPost, useDiscoveryPosts } from './lib/use-strapi';
import { buildBlogPostingSchema, buildBreadcrumbSchema } from './lib/structured-data';
import { renderMarkdown } from './lib/render-markdown';
import { DiscoveryCoverMedia } from './discovery/discovery-cover';
import { SplitArticleCard } from './discovery/tiles';
import { GalleryLightbox } from './gallery-lightbox';
import type { GalleryMedia } from './lib/strapi';
import { ArticleMeta, ArrowIcon } from './discovery/shared';
import { Loader, HoverMarquee } from './ui';
import { discoveryPage } from './i18n/messages';
import { usePageContext } from './router';
import { NotFoundPage } from './not-found-page';

export const DiscoveryPostPage = () => {
  const { lang, goto } = usePageContext();
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const navigate = useNavigate();
  const { data: post, loading } = useDiscoveryPost(slug);
  const { data: posts } = useDiscoveryPosts();

  const bodyHtml = useMemo(() => (post ? renderMarkdown(post.body[lang]) : ''), [post, lang]);

  // Suggestion at the end of the article: the next post in chronological order,
  // wrapping to the newest once the oldest is reached.
  const nextPost = useMemo(() => {
    if (!post || !posts || posts.length < 2) return null;
    const i = posts.findIndex((p) => p.slug === post.slug);
    return i === -1 ? posts[0] : posts[(i + 1) % posts.length];
  }, [posts, post]);

  // Body images open the shared GalleryLightbox (carousel + zoom/preview);
  // videos keep their inline native controls. The cover is NOT included — it is
  // never enlarged on click. Clicking a body image collects every body media in
  // document order and opens the lightbox at its index.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{ media: GalleryMedia[]; index: number } | null>(null);

  const onBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = (e.target as HTMLElement).closest('img');
    if (!img || !bodyRef.current?.contains(img)) return;
    e.preventDefault();
    const els = Array.from(bodyRef.current.querySelectorAll('img, video'));
    const media: GalleryMedia[] = els.map((el) => {
      if (el instanceof HTMLVideoElement) {
        const source = el.querySelector('source');
        return {
          kind: 'video',
          url: el.getAttribute('src') || source?.getAttribute('src') || '',
          alt: el.getAttribute('aria-label') || '',
          mime: source?.getAttribute('type') || undefined,
        };
      }
      const image = el as HTMLImageElement;
      return { kind: 'image', url: image.currentSrc || image.src, alt: image.alt };
    });
    setLightbox({ media, index: Math.max(0, els.indexOf(img)) });
  };

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
    <>
    <main className="edo-page-enter grid w-full grid-rows-page md:h-full edo-hairline overflow-hidden">
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
            controls
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
              ref={bodyRef}
              onClick={onBodyClick}
              className="prose prose-sm m-0 max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-medium [&_hr]:my-6 [&_hr]:border-border [&_figure]:my-4 [&_figure_img]:block [&_figure_img]:w-full [&_figure_img]:cursor-zoom-in [&_figure_video]:block [&_figure_video]:w-full [&_figure_video]:h-auto [&_figcaption]:mt-1.5 [&_figcaption]:text-micro [&_figcaption]:leading-snug [&_figcaption]:text-muted-foreground [&_li]:ml-4 [&_p]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
          {nextPost && (
            <aside className="mt-auto flex flex-col gap-2.5 border-t border-border pt-6">
              <span className="font-mono text-label uppercase tracking-label text-primary">
                {discoveryPage.nextArticle[lang]}
              </span>
              <div className="border border-border">
                <SplitArticleCard
                  post={nextPost}
                  lang={lang}
                  onOpen={() => navigate({ to: '/$lang/discovery/$slug', params: { lang, slug: nextPost.slug } })}
                />
              </div>
            </aside>
          )}
          <footer className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
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
    {lightbox && lightbox.media.length > 0 && (
      <GalleryLightbox
        project={{ id: post.id, brand: post.title[lang], cat: post.cat, plateau: '', year: '', tone: 'mono', media: lightbox.media }}
        initialIndex={lightbox.index}
        lang={lang}
        onClose={() => setLightbox(null)}
        onBook={() => { setLightbox(null); goto('book'); }}
        onContact={() => { setLightbox(null); goto('contact'); }}
      />
    )}
    </>
  );
};
