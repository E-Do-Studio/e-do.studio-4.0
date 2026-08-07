import { ArrowRight } from 'lucide-react';
import type { DiscoveryPost, Lang } from '../types';
import { Button } from '@/components/ui/button';
import { DiscoveryCoverMedia } from './discovery-cover';
import { hasCover } from './cover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { MonoLabel } from '../ui/mono-label';
import { useT } from '../i18n/use-t';

interface ArticleCardProps {
  post: DiscoveryPost;
  lang: Lang;
  onOpen: () => void;
  className?: string;
}

// L'article à la une : la plus grande cellule de la page, et la seule carte
// d'article de l'index — le reste passe par la liste.
//
// Le filet sous la cover est un `Separator` et non la gouttière de la grille :
// il sépare deux zones À L'INTÉRIEUR d'une cellule, quand la gouttière ne vaut
// qu'ENTRE cellules. Un enfant peignant son fond masquerait par ailleurs le
// `hover:bg-muted` que `variant="cell"` pose sur la cellule entière — un filet
// de 1px, lui, ne masque rien.
export const ArticleCard = ({
  post,
  lang,
  onOpen,
  className,
}: ArticleCardProps) => {
  const t = useT();
  const cover = hasCover(post);
  return (
    <Button
      variant="cell"
      size="cell"
      onClick={onOpen}
      className={cn(
        // `grid-cols-1` n'est pas décoratif, c'est la correction du défaut qui
        // rendait cette carte de travers : `size="cell"` pose `justify-start`,
        // et une piste `auto` ne s'étire à la largeur du conteneur QUE si
        // `justify-content` vaut `normal` ou `stretch`. Sans colonne déclarée,
        // la grille se réduisait donc au max-content du titre — la cover, en
        // `absolute inset-0`, remplissait fidèlement une colonne de 288px au
        // milieu d'une cellule de 800, et laissait le reste en aplat.
        'group grid grid-cols-1 min-h-96 gap-0 p-0 app:min-h-0',
        cover ? 'grid-rows-[minmax(0,1fr)_auto_auto]' : 'grid-rows-1',
        className,
      )}
    >
      {cover && (
        <>
          <div className="relative min-h-0">
            <DiscoveryCoverMedia
              post={post}
              lang={lang}
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <Separator />
        </>
      )}

      <div
        className={cn(
          'flex min-w-0 flex-col gap-2 overflow-hidden px-5 py-4',
          !cover && 'justify-center',
        )}
      >
        <h2 className="m-0 line-clamp-3 text-balance text-2xl font-light leading-snug tracking-tight text-foreground">
          {post.title[lang]}
        </h2>
        <MonoLabel className="inline-flex items-center gap-2">
          {t('discoveryPage.readArticle')}
          <ArrowRight data-icon="inline-end" />
        </MonoLabel>
      </div>
    </Button>
  );
};

interface ArticleEmptyCardProps {
  className?: string;
}

export const ArticleEmptyCard = ({ className }: ArticleEmptyCardProps) => {
  const t = useT();
  return (
    <section
      aria-label={t('discoveryPage.noFeaturedPost')}
      className={cn(
        'grid min-h-96 min-w-0 grid-rows-[minmax(0,1fr)_auto_auto] overflow-hidden bg-background app:min-h-0',
        className,
      )}
    >
      <div className="relative min-h-0 bg-muted">
        <MonoLabel tone="muted" className="absolute left-5 top-5">
          {t('discoveryPage.noFeaturedPost')}
        </MonoLabel>
      </div>
      <Separator />
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
