import type { DiscoveryCategory, DiscoveryPost, Lang } from '../types';
import { Button } from '@/components/ui/button';
import { ArticleMeta, CellBadge } from './shared';
import { DiscoveryCoverMedia } from './discovery-cover';
import { hasCover } from './cover';
import { FilterChips } from './filter-chips';
import { cn } from '@/lib/utils';
import { Empty, EmptyTitle } from '@/components/ui/empty';
import { cellBase, labelBase } from './styles';
import { useT } from '../i18n/use-t';

interface MorePostsCardProps {
  posts: DiscoveryPost[];
  cats: DiscoveryCategory[];
  lang: Lang;
  onOpen: (post: DiscoveryPost) => void;
  cat: string;
  setCat: (cat: string) => void;
  className?: string;
  badge?: number;
}

export const MorePostsCard = ({
  posts,
  cats,
  lang,
  onOpen,
  cat,
  setCat,
  className,
  badge,
}: MorePostsCardProps) => {
  const t = useT();
  const filteredPosts =
    cat === 'all' ? posts : posts.filter((post) => post.cat === cat);

  return (
    <section
      className={cn(
        cellBase,
        'order-2 flex min-h-108 flex-col bg-background lg:min-h-0',
        className,
      )}
    >
      {badge != null && <CellBadge n={badge} />}

      <div className="flex shrink-0 flex-col gap-2.5 border-b border-border px-cell py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className={cn(labelBase, 'text-primary')}>
            {t('discoveryPage.morePosts')}
          </span>
          <span className="font-mono text-micro tracking-ui text-muted-foreground">
            {filteredPosts.length}/{posts.length}
          </span>
        </div>
        <FilterChips
          cats={cats}
          value={cat}
          onChange={setCat}
          lang={lang}
          compact
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredPosts.map((post) => {
          const cover = hasCover(post);
          return (
            <Button
              key={post.id}
              variant="cell"
              size="cell"
              onClick={() => onOpen(post)}
              className={cn(
                'group grid w-full items-center gap-3 border-b border-border px-cell pb-3.5 pt-3',
                cover ? 'grid-cols-thumb-row' : 'grid-cols-1',
              )}
            >
              {cover && (
                <div className="relative aspect-square overflow-hidden">
                  <DiscoveryCoverMedia
                    post={post}
                    lang={lang}
                    sizes="80px"
                    seedOffset={4}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex min-w-0 origin-left flex-col gap-1 transition-transform duration-200 ease-edo-out group-hover:scale-102">
                <ArticleMeta post={post} lang={lang} muted />
                <span className="edo-line-clamp-2 text-detail font-normal leading-snug tracking-copy-tight text-foreground">
                  {post.title[lang]}
                </span>
              </div>
            </Button>
          );
        })}

        {filteredPosts.length === 0 && (
          <Empty size="compact">
            <EmptyTitle>{t('discoveryPage.noPosts')}</EmptyTitle>
          </Empty>
        )}
      </div>
    </section>
  );
};
