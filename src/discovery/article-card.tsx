import React from 'react';
import type { DiscoveryPost, Lang } from '../types';
import { DiscoveryCover } from './discovery-cover';
import { ArticleMeta, CellBadge } from './shared';
import { cn } from '../ui/cn';
import { EmptyState } from '../ui';
import { cellBase, labelBase } from './styles';
import { discoveryPage } from '../i18n/messages';

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

    <div className={cn(
      'flex min-w-0 origin-left flex-col overflow-hidden transition-transform duration-200 ease-edo-out group-hover:scale-102',
      headline ? 'gap-1 px-cell pb-3 pt-2.5' : 'gap-1 px-cell pb-4 pt-3.5'
    )}>
      <ArticleMeta post={post} lang={lang} />
      <h3 className={cn(
        'm-0 edo-line-clamp-2 text-balance text-foreground',
        headline
          ? 'edo-line-clamp-3 text-tile-title font-light leading-tight tracking-headline'
          : 'text-cell font-normal leading-snug tracking-copy-tight'
      )}>
        {post.title[lang]}
      </h3>
      <span className="font-mono text-micro tracking-ui text-muted-foreground">
        {post.author} · {post.date[lang]}
      </span>
    </div>
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
