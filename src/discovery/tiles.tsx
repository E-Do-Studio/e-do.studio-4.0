import React from 'react';
import type { DiscoveryPost, Lang } from '../types';
import { DiscoveryCover } from './discovery-cover';
import { ArrowIcon, CellBadge } from './shared';
import { cn } from '../ui/cn';
import { EmptyState } from '../ui';
import { cellBase, labelBase } from './styles';
import { common, discoveryPage } from '../i18n/messages';

interface VisualTileProps {
  tone?: string;
  seed?: number;
  label?: string;
  className?: string;
  badge?: number;
}

export const VisualTile: React.FC<VisualTileProps> = ({ tone = 'warm', seed = 0, label, className, badge }) => (
  <div className={cn(cellBase, 'order-3 min-h-56 bg-black lg:min-h-0', className)}>
    {badge != null && <CellBadge n={badge} />}
    <DiscoveryCover tone={tone} seed={seed} />
    {label && (
      <span className="absolute bottom-3 left-3.5 z-local font-mono text-micro uppercase tracking-label text-white/85">
        {label}
      </span>
    )}
  </div>
);

interface QuoteTileProps {
  lang: Lang;
  className?: string;
}

export const QuoteTile: React.FC<QuoteTileProps> = ({ lang, className }) => (
  <div className={cn(cellBase, 'order-4 flex min-h-48 items-center justify-center bg-foreground px-cell-lg py-6 text-white lg:min-h-0', className)}>
    <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-20">
      {Array.from({ length: 9 }).map((_, index) => <line key={`h-${index}`} x1="0" y1={index * 14} x2="200" y2={index * 14} stroke="currentColor" strokeWidth="0.3" />)}
      {Array.from({ length: 16 }).map((_, index) => <line key={`v-${index}`} x1={index * 14} y1="0" x2={index * 14} y2="100" stroke="currentColor" strokeWidth="0.3" />)}
    </svg>
    <p className="relative m-0 text-balance text-center text-page-title font-bold italic leading-tight tracking-headline text-white">
      {discoveryPage.quote[lang]}
    </p>
  </div>
);

interface NewsletterCardProps {
  lang: Lang;
  className?: string;
  badge?: number;
}

export const NewsletterCard: React.FC<NewsletterCardProps> = ({ lang, className, badge }) => (
  <section className={cn(cellBase, 'order-5 flex min-h-36 flex-col justify-between gap-2.5 bg-white px-cell-lg py-cell text-foreground lg:min-h-0', className)}>
    {badge != null && <CellBadge n={badge} />}
    <span className={cn(labelBase, 'text-primary')}>Newsletter</span>
    <form onSubmit={(event) => event.preventDefault()} className="flex items-center gap-2 border-b border-hairline pb-1.5">
      <input
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

export const SplitArticleCard: React.FC<SplitArticleCardProps> = ({ post, lang, onOpen, className, badge }) => (
  <button
    onClick={onOpen}
    className={cn(cellBase, 'edo-focus-ring group order-6 grid min-h-104 cursor-pointer grid-cols-1 border-0 bg-white p-0 text-left transition-opacity hover:opacity-95 sm:grid-cols-2 lg:min-h-0', className)}
  >
    {badge != null && <CellBadge n={badge} />}
    <div className="relative min-h-56 overflow-hidden bg-foreground sm:min-h-0">
      {post.coverUrl ? (
        <img src={post.coverUrl} alt={post.title[lang]} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <DiscoveryCover tone={post.tone} seed={post.id + 10} />
      )}
    </div>
    <div className="flex min-h-0 min-w-0 origin-left flex-col justify-between gap-3.5 overflow-hidden px-7 py-6 transition-transform duration-200 ease-edo-out group-hover:scale-102">
      <span className={cn(labelBase, 'text-primary')}>
        {post.tag[lang]} · {post.read}
      </span>
      <div className="flex min-w-0 flex-col gap-2.5">
        <h3 className="m-0 text-balance text-page-title font-light leading-tight tracking-headline text-foreground">
          {post.title[lang]}
        </h3>
        <p className="edo-line-clamp-3 m-0 text-detail leading-normal text-muted-foreground">
          {post.sub?.[lang] || discoveryPage.readFallback[lang]}
        </p>
      </div>
      <span className="inline-flex items-center gap-2 font-mono text-label uppercase tracking-label text-foreground">
        {discoveryPage.readArticle[lang]} <span className="text-detail">→</span>
      </span>
    </div>
  </button>
);

interface SplitArticleEmptyCardProps {
  lang: Lang;
  className?: string;
  badge?: number;
}

export const SplitArticleEmptyCard: React.FC<SplitArticleEmptyCardProps> = ({ lang, className, badge }) => (
  <section
    aria-label={discoveryPage.noSecondaryPost[lang]}
    className={cn(cellBase, 'order-6 grid min-h-104 grid-cols-1 bg-white sm:grid-cols-2 lg:min-h-0', className)}
  >
    {badge != null && <CellBadge n={badge} />}
    <div className="relative min-h-56 bg-muted sm:min-h-0">
      <span className={cn(labelBase, 'absolute left-cell top-3 text-muted-foreground')}>
        {discoveryPage.noSecondaryPost[lang]}
      </span>
    </div>
    <div className="flex min-h-0 min-w-0 flex-col items-start justify-between gap-3.5 px-7 py-6">
      <span className={cn(labelBase, 'text-primary')}>
        {discoveryPage.morePosts[lang]}
      </span>
      <EmptyState
        size="compact"
        label={discoveryPage.noPosts[lang]}
        description={discoveryPage.noSecondaryPostHint[lang]}
        className="items-start px-0 py-0 text-left"
      />
      <span className="font-mono text-micro tracking-ui text-muted-foreground">
        {discoveryPage.studioOpen[lang]}
      </span>
    </div>
  </section>
);

interface BookCtaTileProps {
  lang: Lang;
  goto: (screen: string) => void;
}

export const BookCtaTile: React.FC<BookCtaTileProps> = ({ lang, goto }) => (
  <button
    onClick={() => goto('book')}
    className="edo-focus-ring group relative flex h-21 shrink-0 cursor-pointer items-center justify-between gap-3.5 overflow-hidden border-0 bg-primary px-cell-lg py-3.5 text-left text-white transition-[color,background-color,opacity] duration-150 ease-edo-out hover:opacity-90"
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

interface BookBackstageStackProps {
  lang: Lang;
  goto: (screen: string) => void;
  className?: string;
}

export const BookBackstageStack: React.FC<BookBackstageStackProps> = ({ lang, goto, className }) => (
  <div className={cn(cellBase, 'order-7 flex min-h-104 flex-col gap-hairline bg-white lg:min-h-0', className)}>
    <BookCtaTile lang={lang} goto={goto} />
    <VisualTile tone="warm" seed={9} label={discoveryPage.behindScenes[lang]} className="order-none flex-1" />
  </div>
);
