import { ArrowRight } from 'lucide-react';
import type { DiscoveryPost, Lang } from '../types';
import { Button } from '@/components/ui/button';
import { DiscoveryCoverMedia } from './discovery-cover';
import { hasCover } from './cover';
import { CellBadge } from './shared';
import { cn } from '@/lib/utils';
import { Empty, EmptyTitle } from '@/components/ui/empty';
import { cellBase, labelBase } from './styles';
import { useT } from '../i18n/use-t';
import { renderInlineMarkdown } from '../lib/render-markdown';

interface NewsletterCardProps {
  lang: Lang;
  className?: string;
  badge?: number;
}

export const NewsletterCard = ({
  lang,
  className,
  badge,
}: NewsletterCardProps) => {
  const t = useT();
  return (
    <section
      className={cn(
        cellBase,
        'order-5 flex min-h-36 flex-col justify-between gap-2.5 bg-background px-6 py-4.5 text-foreground lg:min-h-0',
        className,
      )}
    >
      {badge != null && <CellBadge n={badge} />}
      <span className={cn(labelBase, 'text-primary')}>Newsletter</span>
      <form
        name="newsletter"
        aria-label="Newsletter"
        onSubmit={(event) => event.preventDefault()}
        className="flex items-center gap-2 border-b border-border pb-1.5"
      >
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t('discoveryPage.emailPlaceholder')}
          className="min-w-0 flex-1  bg-transparent py-1 font-sans text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          variant="link"
          className="h-auto p-0 text-primary no-underline"
        >
          OK →
        </Button>
      </form>
    </section>
  );
};

interface SplitArticleCardProps {
  post: DiscoveryPost;
  lang: Lang;
  onOpen?: () => void;
  className?: string;
  badge?: number;
}

export const SplitArticleCard = ({
  post,
  lang,
  onOpen,
  className,
  badge,
}: SplitArticleCardProps) => {
  const t = useT();
  const cover = hasCover(post);
  return (
    <Button
      type="button"
      onClick={onOpen}
      className={cn(
        cellBase,
        'group order-6 grid min-h-104 grid-cols-1  bg-background p-0 text-left transition-opacity hover:opacity-95 lg:min-h-0',
        cover && 'sm:grid-cols-2',
        className,
      )}
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
      <div className="flex min-h-0 min-w-0 origin-left flex-col justify-between gap-3.5 overflow-hidden px-7 py-6 transition-transform duration-200 ease-out group-hover:scale-105">
        <div className="flex min-w-0 flex-col gap-2.5">
          <h3
            className={cn(
              'm-0 line-clamp-3 text-balance font-light leading-tight tracking-tight text-foreground',
              cover ? 'text-xl' : 'text-3xl',
            )}
          >
            {post.title[lang]}
          </h3>
          {post.sub?.[lang] && (
            <p
              className="line-clamp-3 m-0 text-sm leading-normal text-muted-foreground [&_a]:text-primary [&_em]:italic [&_strong]:font-semibold [&_strong]:text-foreground"
              dangerouslySetInnerHTML={{
                __html: renderInlineMarkdown(post.sub[lang]),
              }}
            />
          )}
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-foreground inline-flex items-center gap-2">
          {t('discoveryPage.readArticle')} <span className="text-sm">→</span>
        </span>
      </div>
    </Button>
  );
};

interface SplitArticleEmptyCardProps {
  lang: Lang;
  className?: string;
  badge?: number;
}

export const SplitArticleEmptyCard = ({
  lang,
  className,
  badge,
}: SplitArticleEmptyCardProps) => {
  const t = useT();
  return (
    <section
      aria-label={t('discoveryPage.noPosts')}
      className={cn(
        cellBase,
        'order-6 grid min-h-104 grid-cols-1 bg-background sm:grid-cols-2 lg:min-h-0',
        className,
      )}
    >
      {badge != null && <CellBadge n={badge} />}
      <div className="relative min-h-56 bg-muted sm:min-h-0" />
      <div className="flex min-h-0 min-w-0 flex-col items-start justify-center px-7 py-6">
        <Empty size="compact" className="items-start px-0 py-0 text-left">
          <EmptyTitle>{t('discoveryPage.noPosts')}</EmptyTitle>
        </Empty>
      </div>
    </section>
  );
};

interface BookCtaTileProps {
  lang: Lang;
  goto: (screen: string) => void;
  className?: string;
}

export const BookCtaTile = ({ lang, goto, className }: BookCtaTileProps) => {
  const t = useT();
  return (
    <Button
      type="button"
      onClick={() => goto('book')}
      className={cn(
        'group relative h-21 justify-between gap-3.5 overflow-hidden  px-6 py-3.5 text-left',
        className,
      )}
    >
      <span className="flex min-w-0 origin-left flex-col items-start gap-1 transition-transform duration-200 ease-out group-hover:scale-105">
        <span className="font-mono text-xs uppercase tracking-widest text-primary-foreground/75">
          {t('discoveryPage.studioOpen')}
        </span>
        <span className="text-xl font-normal leading-tight tracking-tight text-primary-foreground">
          {t('common.book')}
        </span>
      </span>
      <ArrowRight
        data-icon="inline-end"
        className="transition-transform duration-200 ease-out group-hover:translate-x-1.5 group-hover:scale-110"
      />
    </Button>
  );
};
