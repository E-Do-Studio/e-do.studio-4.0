import React from 'react';
import type { DiscoveryPost, Lang } from '../types';
import { DiscoveryCover } from './discovery-cover';
import { ArticleMeta, CellBadge } from './shared';
import { cn } from '../ui/cn';
import { EmptyState } from '../ui';
import { cellBase, labelBase } from './styles';
import { discoveryPage } from '../i18n/messages';
import { renderInlineMarkdown } from '../lib/render-markdown';

interface ArticleCardProps {
  post: DiscoveryPost;
  lang: Lang;
  onOpen?: () => void;
  headline?: boolean;
  className?: string;
  badge?: number;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ post, lang, onOpen, headline = false, className, badge }) => (
  <button
    onClick={onOpen}
    className={cn(
      cellBase,
      'edo-focus-ring group order-1 grid min-h-80 cursor-pointer border-0 bg-white p-0 text-left transition-opacity hover:opacity-90 lg:min-h-0',
      headline ? 'grid-rows-article-headline lg:grid-rows-article-headline-lg' : 'grid-rows-article-auto',
      className
    )}
  >
    {badge != null && <CellBadge n={badge} />}
    <div className="relative min-h-0 border-b border-border">
      {post.coverUrl ? (
        <img src={post.coverUrl} alt={post.title[lang]} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <DiscoveryCover tone={post.tone} seed={post.id + 1} />
      )}
    </div>

    {headline ? (
      <div className="flex min-h-0 min-w-0 origin-left flex-col justify-between gap-3.5 overflow-hidden px-7 py-6 transition-transform duration-200 ease-edo-out group-hover:scale-102">
        <span className={cn(labelBase, 'text-primary')}>
          {post.tag[lang]} · {post.read}
        </span>
        <div className="flex min-w-0 flex-col gap-2.5">
          <h3 className="m-0 edo-line-clamp-3 text-balance text-page-title font-light leading-tight tracking-headline text-foreground">
            {post.title[lang]}
          </h3>
          {post.sub?.[lang] && (
            <p
              className="edo-line-clamp-3 m-0 text-detail leading-normal text-muted-foreground [&_a]:text-primary [&_em]:italic [&_strong]:font-semibold [&_strong]:text-foreground"
              dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(post.sub[lang]) }}
            />
          )}
        </div>
        <span className="inline-flex items-center gap-2 font-mono text-label uppercase tracking-label text-foreground">
          {discoveryPage.readArticle[lang]} <span className="text-detail">→</span>
        </span>
      </div>
    ) : (
      <div className="flex min-w-0 origin-left flex-col gap-1 overflow-hidden px-cell pb-4 pt-3.5 transition-transform duration-200 ease-edo-out group-hover:scale-102">
        <ArticleMeta post={post} lang={lang} />
        <h3 className="m-0 edo-line-clamp-2 text-balance text-cell font-normal leading-snug tracking-copy-tight text-foreground">
          {post.title[lang]}
        </h3>
        <span className="font-mono text-micro tracking-ui text-muted-foreground">
          {post.author} · {post.date[lang]}
        </span>
      </div>
    )}
  </button>
);

interface ArticleEmptyCardProps {
  lang: Lang;
  headline?: boolean;
  className?: string;
  badge?: number;
}

export const ArticleEmptyCard: React.FC<ArticleEmptyCardProps> = ({ lang, headline = false, className, badge }) => (
  <section
    aria-label={discoveryPage.noFeaturedPost[lang]}
    className={cn(
      cellBase,
      'order-1 grid min-h-80 grid-rows-article-auto bg-white lg:min-h-0',
      headline && 'lg:grid-rows-article-headline-lg',
      className,
    )}
  >
    {badge != null && <CellBadge n={badge} />}
    <div className="relative min-h-0 border-b border-border bg-muted">
      <span className={cn(labelBase, 'absolute left-cell top-3 text-muted-foreground')}>
        {discoveryPage.noFeaturedPost[lang]}
      </span>
    </div>
    <EmptyState
      size="compact"
      label={discoveryPage.noPosts[lang]}
      description={discoveryPage.noFeaturedPostHint[lang]}
    />
  </section>
);
