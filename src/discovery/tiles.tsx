import React from 'react';
import type { DiscoveryPost, Lang } from '../types';
import { DiscoveryCoverMedia } from './discovery-cover';
import { hasCover } from './cover';
import { ArrowIcon, CellBadge } from './shared';
import { cn } from '../ui/cn';
import { EmptyState } from '../ui';
import { cellBase, labelBase } from './styles';
import { common, discoveryPage } from '../i18n/messages';
import { renderInlineMarkdown } from '../lib/render-markdown';

interface NewsletterCardProps {
  lang: Lang;
  className?: string;
  badge?: number;
}

export const NewsletterCard: React.FC<NewsletterCardProps> = ({ lang, className, badge }) => (
  <section className={cn(cellBase, 'order-5 flex min-h-36 flex-col justify-between gap-2.5 bg-white px-cell-lg py-cell text-foreground lg:min-h-0', className)}>
    {badge != null && <CellBadge n={badge} />}
    <span className={cn(labelBase, 'text-primary')}>Newsletter</span>
    <form name="newsletter" aria-label="Newsletter" onSubmit={(event) => event.preventDefault()} className="flex items-center gap-2 border-b border-hairline pb-1.5">
      <input
        name="email"
        type="email"
        autoComplete="email"
        placeholder={discoveryPage.emailPlaceholder[lang]}
        className="edo-focus-ring min-w-0 flex-1 border-0 bg-transparent py-1 font-sans text-detail text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button type="submit" className="edo-focus-ring cursor-pointer border-0 bg-transparent p-0 font-mono text-label uppercase tracking-label text-primary">
        OK →
      </button>
    </form>
  </section>
);

interface SplitArticleCardProps {
  post: DiscoveryPost;
  lang: Lang;
  onOpen?: () => void;
  className?: string;
  badge?: number;
}

export const SplitArticleCard: React.FC<SplitArticleCardProps> = ({ post, lang, onOpen, className, badge }) => {
  const cover = hasCover(post);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(cellBase, 'edo-focus-ring group order-6 grid min-h-104 cursor-pointer grid-cols-1 border-0 bg-white p-0 text-left transition-opacity hover:opacity-95 lg:min-h-0', cover && 'sm:grid-cols-2', className)}
    >
      {badge != null && <CellBadge n={badge} />}
      {cover && (
        <div className="relative min-h-56 overflow-hidden bg-foreground sm:min-h-0">
          <DiscoveryCoverMedia
            post={post}
            lang={lang}
            sizes="(min-width: 640px) 50vw, 100vw"
            seedOffset={10}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex min-h-0 min-w-0 origin-left flex-col justify-between gap-3.5 overflow-hidden px-7 py-6 transition-transform duration-200 ease-edo-out group-hover:scale-102">
        <div className="flex min-w-0 flex-col gap-2.5">
          <h3 className={cn(
            'm-0 edo-line-clamp-3 text-balance font-light leading-tight tracking-headline text-foreground',
            cover ? 'text-tile-title' : 'text-page-title',
          )}>
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
    </button>
  );
};

interface SplitArticleEmptyCardProps {
  lang: Lang;
  className?: string;
  badge?: number;
}

export const SplitArticleEmptyCard: React.FC<SplitArticleEmptyCardProps> = ({ lang, className, badge }) => (
  <section
    aria-label={discoveryPage.noPosts[lang]}
    className={cn(cellBase, 'order-6 grid min-h-104 grid-cols-1 bg-white sm:grid-cols-2 lg:min-h-0', className)}
  >
    {badge != null && <CellBadge n={badge} />}
    <div className="relative min-h-56 bg-muted sm:min-h-0" />
    <div className="flex min-h-0 min-w-0 flex-col items-start justify-center px-7 py-6">
      <EmptyState
        size="compact"
        label={discoveryPage.noPosts[lang]}
        className="items-start px-0 py-0 text-left"
      />
    </div>
  </section>
);

interface BookCtaTileProps {
  lang: Lang;
  goto: (screen: string) => void;
  className?: string;
}

export const BookCtaTile: React.FC<BookCtaTileProps> = ({ lang, goto, className }) => (
  <button
    type="button"
    onClick={() => goto('book')}
    className={cn('edo-focus-ring group relative flex h-21 shrink-0 cursor-pointer items-center justify-between gap-3.5 overflow-hidden border-0 bg-primary px-cell-lg py-3.5 text-left text-white transition-[color,background-color,opacity] duration-150 ease-edo-out hover:opacity-90', className)}
  >
    <span className="flex min-w-0 origin-left flex-col items-start gap-1 transition-transform duration-200 ease-edo-out group-hover:scale-102">
      <span className="font-mono text-label uppercase tracking-label text-white/75">
        {discoveryPage.studioOpen[lang]}
      </span>
      <span className="text-tile-title font-normal leading-tight tracking-headline text-white">
        {common.book[lang]}
      </span>
    </span>
    <ArrowIcon width="16" height="16" className="shrink-0 text-white transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5 group-hover:scale-110" />
  </button>
);
