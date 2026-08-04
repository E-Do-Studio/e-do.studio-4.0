import { ArrowRight } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLoaderData, useNavigate } from '@tanstack/react-router';
import { renderMarkdown } from './lib/render-markdown';
import { DiscoveryCoverMedia } from './discovery/discovery-cover';
import { SplitArticleCard } from './discovery/tiles';
import { GalleryLightbox } from './gallery-lightbox';
import type { GalleryMedia } from './lib/strapi';
import { ArticleMeta } from './discovery/shared';
import { HoverMarquee } from './ui/hover-marquee';
import { useT } from './i18n/use-t';
import { usePageContext } from './lib/page-context';
import { NotFoundPage } from './not-found-page';

export const DiscoveryPostPage = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  const navigate = useNavigate();
  const { post, posts } = useLoaderData({ from: '/$lang/discovery/$slug' });

  const bodyHtml = useMemo(
    () => (post ? renderMarkdown(post.body[lang]) : ''),
    [post, lang],
  );

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
  const [lightbox, setLightbox] = useState<{
    media: GalleryMedia[];
    index: number;
  } | null>(null);

  const openLightboxFor = (img: Element) => {
    if (!bodyRef.current) return;
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
      return {
        kind: 'image',
        url: image.currentSrc || image.src,
        alt: image.alt,
      };
    });
    setLightbox({ media, index: Math.max(0, els.indexOf(img)) });
  };

  const onBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = (e.target as HTMLElement).closest('img');
    if (!img || !bodyRef.current?.contains(img)) return;
    e.preventDefault();
    openLightboxFor(img);
  };

  // Body images carry tabindex+role from renderMarkdown, so keyboard users reach
  // them; delegation here gives them the same activation as a click.
  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const img = (e.target as HTMLElement).closest('img');
    if (!img || !bodyRef.current?.contains(img)) return;
    e.preventDefault();
    openLightboxFor(img);
  };

  if (!post) {
    return <NotFoundPage />;
  }

  const backToIndex = () =>
    navigate({ to: '/$lang/discovery', params: { lang } });

  return (
    <>
      <main className="animate-in fade-in duration-300 grid w-full grid-rows-[52px_minmax(0,1fr)] md:h-full gap-px bg-border overflow-hidden">
        <div className="row-start-1 flex gap-px bg-border">
          <Button
            onClick={backToIndex}
            variant="header"
            className="flex-none gap-2.5 px-4 md:px-6"
          >
            <span className="inline-block rotate-180">
              <ArrowRight data-icon="inline-end" />
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-foreground hidden sm:inline">
              {t('discoveryPage.backToJournal')}
            </span>
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-3.5 bg-background px-4 md:px-6">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              {post.tag[lang]}
            </span>
            <HoverMarquee className="font-mono text-xs tracking-widest text-muted-foreground">
              {post.read} · {post.author} · {post.date[lang]}
            </HoverMarquee>
          </div>
        </div>

        <div className="row-start-2 grid min-h-0 grid-cols-1 gap-px bg-border overflow-y-auto md:grid-cols-[1.1fr_1fr] md:overflow-hidden">
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
          <article className="flex min-h-0 flex-col gap-5 overflow-y-auto bg-background px-6 py-8 md:px-12 md:py-10">
            <ArticleMeta post={post} lang={lang} />
            <h1 className="m-0 text-balance text-5xl font-light leading-none tracking-tighter text-foreground">
              {post.title[lang]}
            </h1>
            {post.sub[lang] && (
              <p className="m-0 text-pretty text-base font-normal leading-relaxed text-foreground">
                {post.sub[lang]}
              </p>
            )}
            {bodyHtml && (
              <div
                ref={bodyRef}
                onClick={onBodyClick}
                onKeyDown={onBodyKeyDown}
                className="prose prose-sm m-0 max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-medium [&_hr]:my-6 [&_hr]:border-border [&_figure]:my-4 [&_figure_img]:block [&_figure_img]:w-full [&_figure_img]:cursor-zoom-in [&_figure_img:focus-visible]:[outline:1.5px_solid_var(--ring)] [&_figure_img:focus-visible]:[outline-offset:2px] [&_figure_video]:block [&_figure_video]:w-full [&_figure_video]:h-auto [&_figcaption]:mt-1.5 [&_figcaption]:text-xs [&_figcaption]:leading-snug [&_figcaption]:text-muted-foreground [&_li]:ml-4 [&_p]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            )}
            {nextPost && (
              <aside className="mt-auto flex flex-col gap-2.5 border-t border-border pt-6">
                <span className="font-mono text-xs uppercase tracking-widest text-primary">
                  {t('discoveryPage.nextArticle')}
                </span>
                <div className="border border-border">
                  <SplitArticleCard
                    post={nextPost}
                    lang={lang}
                    onOpen={() =>
                      navigate({
                        to: '/$lang/discovery/$slug',
                        params: { lang, slug: nextPost.slug },
                      })
                    }
                  />
                </div>
              </aside>
            )}
            <footer className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {post.author} · {post.date[lang]}
              </span>
              <Button
                onClick={backToIndex}
                variant="cell"
                className="dark h-10 bg-background px-6 hover:text-primary"
              >
                {t('discoveryPage.close')}
              </Button>
            </footer>
          </article>
        </div>
      </main>
      {lightbox && lightbox.media.length > 0 && (
        <GalleryLightbox
          project={{
            id: post.id,
            brand: post.title[lang],
            cat: post.cat,
            plateau: '',
            year: '',
            tone: 'mono',
            media: lightbox.media,
          }}
          initialIndex={lightbox.index}
          lang={lang}
          onClose={() => setLightbox(null)}
          onBook={() => {
            setLightbox(null);
            goto('book');
          }}
          onContact={() => {
            setLightbox(null);
            goto('contact');
          }}
        />
      )}
    </>
  );
};
