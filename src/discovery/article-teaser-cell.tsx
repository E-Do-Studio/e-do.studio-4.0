import { ArrowRight } from 'lucide-react';
import type { DiscoveryPost, Lang } from '../types';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { DiscoveryCoverMedia } from './discovery-cover';
import { hasCover } from './cover';
import { ArticleMeta } from './shared';
import { cn } from '@/lib/utils';
import { MonoLabel } from '../ui/mono-label';
import { useT } from '../i18n/use-t';

interface ArticleTeaserCellProps {
  post: DiscoveryPost;
  lang: Lang;
  onOpen: () => void;
  className?: string;
}

// Le renvoi vers l'article suivant, en bas d'un article. Il remplace un
// `SplitArticleCard` rendu sans `variant` ni `size` : le bouton héritait donc
// `variant="default"` — l'orange qu'il annulait ensuite à la main — et surtout
// le `uppercase whitespace-nowrap` de la base, que `size="cell"` est justement
// là pour annuler. Le titre sortait en capitales et le sous-titre ne pouvait
// pas revenir à la ligne.
//
// `Item variant="outline"` porte le contour : hors d'une grille bento il n'y a
// pas de gouttière dont hériter, et le `<div className="border border-border">`
// qui enrobait la carte était le seul endroit du site où un filet de cellule
// était dessiné par un élément d'enrobage.
export const ArticleTeaserCell = ({
  post,
  lang,
  onOpen,
  className,
}: ArticleTeaserCellProps) => {
  const t = useT();
  const cover = hasCover(post);
  return (
    <Item
      variant="outline"
      render={<Button type="button" variant="cell" size="cell" />}
      onClick={onOpen}
      // `flex-row` contre le `flex-col` de `size="cell"`, `flex-nowrap` contre
      // le `flex-wrap` d'`itemVariants`, `items-stretch` pour que la vignette
      // prenne toute la hauteur, `p-0` parce que les deux moitiés posent
      // elles-mêmes leur retrait.
      className={cn(
        'group w-full flex-row flex-nowrap items-stretch gap-0 p-0',
        className,
      )}
    >
      {cover && (
        <>
          <ItemMedia
            variant="image"
            className="relative w-28 self-stretch rounded-none"
          >
            <DiscoveryCoverMedia
              post={post}
              lang={lang}
              sizes="112px"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </ItemMedia>
          <Separator orientation="vertical" />
        </>
      )}
      <ItemContent className="min-w-0 gap-1.5 px-5 py-4">
        <ArticleMeta post={post} lang={lang} muted />
        <ItemTitle className="block w-auto line-clamp-2 text-balance text-base font-normal leading-snug tracking-tight text-foreground">
          {post.title[lang]}
        </ItemTitle>
        <MonoLabel className="mt-1 inline-flex items-center gap-2">
          {t('discoveryPage.readArticle')}
          <ArrowRight data-icon="inline-end" />
        </MonoLabel>
      </ItemContent>
    </Item>
  );
};
