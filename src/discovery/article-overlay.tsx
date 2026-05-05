import React, { useMemo } from 'react';
import type { DiscoveryPost, Lang } from '../types';
import { DiscoveryCover } from './discovery-cover';
import { useEscapeKey } from './hooks';
import { ArticleMeta, ArrowIcon } from './shared';
import { renderMarkdown } from '../lib/render-markdown';

interface ArticleOverlayProps {
  post: DiscoveryPost;
  lang: Lang;
  onClose: () => void;
}

export const ArticleOverlay: React.FC<ArticleOverlayProps> = ({ post, lang, onClose }) => {
  useEscapeKey(onClose);
  const bodyHtml = useMemo(() => renderMarkdown(post.body[lang]), [post.body, lang]);

  return (
    <div className="fixed inset-0 z-50 grid grid-rows-page gap-px overflow-hidden bg-black">
      <div className="row-start-1 flex gap-px bg-black">
        <button onClick={onClose} className="edo-focus-ring flex flex-none cursor-pointer items-center gap-2.5 border-0 bg-white px-4 text-foreground transition-colors hover:bg-muted md:px-cell-lg">
          <span className="inline-block rotate-180"><ArrowIcon width="14" height="14" /></span>
          <span className="hidden font-mono text-caption uppercase tracking-label text-foreground sm:inline">
            {lang === 'fr' ? 'Retour journal' : 'Back to journal'}
          </span>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3.5 bg-white px-4 md:px-6">
          <span className="edo-cell-label text-primary">{post.tag[lang]}</span>
          <span className="truncate font-mono text-label tracking-ui text-muted-foreground">
            {post.read} · {post.author} · {post.date[lang]}
          </span>
        </div>
        <button onClick={onClose} className="edo-focus-ring flex basis-header-sm cursor-pointer items-center justify-center border-0 bg-white transition-colors hover:bg-muted">
          <span className="text-cell font-light text-foreground">×</span>
        </button>
      </div>

      <div className="row-start-2 grid min-h-0 grid-cols-1 gap-px overflow-y-auto bg-black md:grid-cols-overlay md:overflow-hidden">
        <div className="relative min-h-64 bg-black md:min-h-0">
          {post.coverUrl ? (
            <img src={post.coverUrl} alt={post.title[lang]} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <DiscoveryCover tone={post.tone} seed={post.id + 1} />
          )}
        </div>
        <article className="flex min-h-0 flex-col gap-5 overflow-y-auto bg-white px-6 py-8 md:px-12 md:py-10">
          <ArticleMeta post={post} lang={lang} />
          <h1 className="m-0 text-balance text-hero font-light leading-none tracking-display text-foreground">
            {post.title[lang]}
          </h1>
          <p className="m-0 text-pretty text-cell font-normal leading-copy text-foreground">
            {post.sub[lang]}
          </p>
          {bodyHtml ? (
            <div
              className="prose prose-sm m-0 max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-medium [&_hr]:my-6 [&_hr]:border-border [&_img]:my-4 [&_img]:rounded [&_li]:ml-4 [&_p]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <p className="m-0 text-pretty text-detail leading-relaxed text-muted-foreground">
              {post.sub[lang]}
            </p>
          )}
          <footer className="mt-auto flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-label uppercase tracking-code text-muted-foreground">
              {post.author} · {post.date[lang]}
            </span>
            <button onClick={onClose} className="edo-focus-ring h-10 cursor-pointer border-0 bg-foreground px-cell-lg font-mono text-caption uppercase tracking-label text-white transition-all hover:brightness-110">
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
};
