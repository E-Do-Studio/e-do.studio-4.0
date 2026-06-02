import React, { useMemo } from 'react';
import type { DiscoveryPost, Lang } from '../types';
import { DiscoveryCoverMedia } from './discovery-cover';
import { useEscapeKey } from './hooks';
import { ArticleMeta, ArrowIcon } from './shared';
import { renderMarkdown } from '../lib/render-markdown';
import { EmptyState, HoverMarquee } from '../ui';
import { discoveryPage } from '../i18n/messages';
import { useStructuredData } from '../lib/use-structured-data';
import { buildBlogPostingSchema } from '../lib/structured-data';

interface ArticleOverlayProps {
  post: DiscoveryPost;
  lang: Lang;
  onClose: () => void;
}

export const ArticleOverlay: React.FC<ArticleOverlayProps> = ({ post, lang, onClose }) => {
  useEscapeKey(onClose);
  const bodyHtml = useMemo(() => renderMarkdown(post.body[lang]), [post.body, lang]);
  const hasSubtitle = Boolean(post.sub[lang]);
  const hasBody = Boolean(bodyHtml);
  useStructuredData(`article-${post.id}`, [
    buildBlogPostingSchema(post, lang, '/discovery'),
  ]);

  return (
    <div className="fixed inset-0 z-50 grid grid-rows-page edo-hairline overflow-hidden">
      <div className="row-start-1 flex edo-hairline">
        <button onClick={onClose} className="edo-focus-ring flex flex-none cursor-pointer items-center gap-2.5 border-0 bg-white px-4 text-foreground transition-colors hover:bg-muted md:px-cell-lg">
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
        <button onClick={onClose} className="edo-focus-ring flex basis-header-sm cursor-pointer items-center justify-center border-0 bg-white transition-colors hover:bg-muted">
          <span className="text-cell font-light text-foreground">×</span>
        </button>
      </div>

      <div className="row-start-2 grid min-h-0 grid-cols-1 edo-hairline overflow-y-auto md:grid-cols-overlay md:overflow-hidden">
        <div className="relative min-h-64 bg-foreground md:min-h-0">
          <DiscoveryCoverMedia
            post={post}
            lang={lang}
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <article className="flex min-h-0 flex-col gap-6 overflow-y-auto bg-white px-6 py-8 md:gap-7 md:px-12 md:py-10">
          <ArticleMeta post={post} lang={lang} />
          <h1 className="m-0 text-balance text-hero font-light leading-none tracking-display text-foreground">
            {post.title[lang]}
          </h1>
          <p className="edo-article-lede m-0">
            {post.sub[lang]}
          </p>
          {hasBody ? (
            <div
              className="edo-article-prose m-0"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : hasSubtitle ? (
            <p className="edo-article-lede m-0">
              {post.sub[lang]}
            </p>
          ) : (
            <EmptyState
              label={discoveryPage.noPosts[lang]}
              description={discoveryPage.noArticleBody[lang]}
              size="compact"
            />
          )}
          <footer className="mt-auto flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-label uppercase tracking-code text-muted-foreground">
              {post.author} · {post.date[lang]}
            </span>
            <button onClick={onClose} className="edo-focus-ring h-10 cursor-pointer border-0 bg-foreground px-cell-lg font-mono text-caption uppercase tracking-label text-white transition-[color,background-color,opacity] duration-150 ease-edo-out hover:text-primary">
              {discoveryPage.close[lang]}
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
};
