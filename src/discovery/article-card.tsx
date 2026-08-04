import type { DiscoveryPost, Lang } from '../types';
import { Button } from '@/components/ui/button';
import { DiscoveryCoverMedia } from './discovery-cover';
import { hasCover } from './cover';
import { CellBadge } from './shared';
import { cn } from '@/lib/utils';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { cellBase, labelBase } from './styles';
import { useT } from '../i18n/use-t';

interface ArticleCardProps {
  post: DiscoveryPost;
  lang: Lang;
  onOpen?: () => void;
  headline?: boolean;
  className?: string;
  badge?: number;
}

export const ArticleCard = ({
  post,
  lang,
  onOpen,
  headline = false,
  className,
  badge,
}: ArticleCardProps) => {
  const t = useT();
  const cover = hasCover(post);
  return (
    <Button
      variant="cell"
      size="cell"
      onClick={onOpen}
      className={cn(
        cellBase,
        'group order-1 grid min-h-80 p-0 transition-opacity hover:opacity-90 lg:min-h-0',
        cover
          ? headline
            ? 'grid-rows-[1fr_96px] lg:grid-rows-[1fr_84px]'
            : 'grid-rows-[1fr_auto]'
          : 'grid-rows-1',
        className,
      )}
    >
      {badge != null && <CellBadge n={badge} />}
      {cover && (
        <div className="relative min-h-0 border-b border-border">
          <DiscoveryCoverMedia
            post={post}
            lang={lang}
            sizes={
              headline
                ? '(min-width: 1024px) 50vw, 100vw'
                : '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'
            }
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}

      <div
        className={cn(
          'flex min-w-0 origin-left flex-col overflow-hidden transition-transform duration-200 ease-out group-hover:scale-105',
          !cover && 'justify-center',
          headline ? 'gap-1 px-4.5 pb-3 pt-2.5' : 'gap-1 px-4.5 pb-4 pt-3.5',
        )}
      >
        <h3
          className={cn(
            'm-0 line-clamp-2 text-balance text-foreground',
            headline
              ? 'line-clamp-3 text-xl font-light leading-snug tracking-tight'
              : 'text-base font-normal leading-snug tracking-tight',
          )}
        >
          {post.title[lang]}
        </h3>
        {headline && (
          <span className="font-mono text-xs uppercase tracking-widest text-foreground mt-1 inline-flex items-center gap-2">
            {t('discoveryPage.readArticle')} <span className="text-sm">→</span>
          </span>
        )}
      </div>
    </Button>
  );
};

interface ArticleEmptyCardProps {
  lang: Lang;
  headline?: boolean;
  className?: string;
  badge?: number;
}

export const ArticleEmptyCard = ({
  lang,
  headline = false,
  className,
  badge,
}: ArticleEmptyCardProps) => {
  const t = useT();
  return (
    <section
      aria-label={t('discoveryPage.noFeaturedPost')}
      className={cn(
        cellBase,
        'order-1 grid min-h-80 grid-rows-[1fr_auto] bg-background lg:min-h-0',
        headline && 'lg:grid-rows-[1fr_84px]',
        className,
      )}
    >
      {badge != null && <CellBadge n={badge} />}
      <div className="relative min-h-0 border-b border-border bg-muted">
        <span
          className={cn(
            labelBase,
            'absolute left-cell top-3 text-muted-foreground',
          )}
        >
          {t('discoveryPage.noFeaturedPost')}
        </span>
      </div>
      <Empty size="compact">
        <EmptyHeader>
          <EmptyTitle>{t('discoveryPage.noPosts')}</EmptyTitle>
          <EmptyDescription>
            {t('discoveryPage.noFeaturedPostHint')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </section>
  );
};
