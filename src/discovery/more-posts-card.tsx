import React from 'react';
import type { DiscoveryPost, Lang } from '../types';
import { ArticleMeta, CellBadge } from './shared';
import { DiscoveryCover } from './discovery-cover';
import { FilterChips } from './filter-chips';
import { cn } from '../ui/cn';
import { cellBase, labelBase } from './styles';

interface MorePostsCardProps {
  posts: DiscoveryPost[];
  lang: Lang;
  onOpen: (post: DiscoveryPost) => void;
  cat: string;
  setCat: (cat: string) => void;
  className?: string;
  badge?: number;
}

export const MorePostsCard: React.FC<MorePostsCardProps> = ({ posts, lang, onOpen, cat, setCat, className, badge }) => {
  const filteredPosts = cat === 'all' ? posts : posts.filter((post) => post.cat === cat);

  return (
    <section className={cn(cellBase, 'order-2 flex min-h-108 flex-col bg-white lg:min-h-0', className)}>
      {badge != null && <CellBadge n={badge} />}

      <div className="flex shrink-0 flex-col gap-2.5 border-b border-border px-cell py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className={cn(labelBase, 'text-primary')}>
            {lang === 'fr' ? 'Plus d\u2019articles' : 'More posts'}
          </span>
          <span className="font-mono text-micro tracking-ui text-muted-foreground">
            {filteredPosts.length}/{posts.length}
          </span>
        </div>
        <FilterChips value={cat} onChange={setCat} lang={lang} compact />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredPosts.map((post) => (
          <button
            key={post.id}
            onClick={() => onOpen(post)}
            className="edo-focus-ring group grid w-full cursor-pointer grid-cols-thumb-row items-center gap-3 border-0 border-b border-border bg-white px-cell pb-3.5 pt-3 text-left transition-colors hover:bg-muted"
          >
            <div className="relative aspect-square overflow-hidden">
              <DiscoveryCover tone={post.tone} seed={post.id + 4} />
            </div>
            <div className="flex min-w-0 origin-left flex-col gap-1 transition-transform duration-200 group-hover:scale-102">
              <ArticleMeta post={post} lang={lang} muted />
              <span className="edo-line-clamp-2 text-detail font-normal leading-snug tracking-copy-tight text-foreground">
                {post.title[lang]}
              </span>
            </div>
          </button>
        ))}

        {filteredPosts.length === 0 && (
          <div className="px-cell py-8 text-center font-mono text-caption uppercase tracking-ui text-muted-foreground">
            {lang === 'fr' ? 'Aucun article' : 'No posts'}
          </div>
        )}
      </div>
    </section>
  );
};
