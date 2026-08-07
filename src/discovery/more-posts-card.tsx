import type { DiscoveryPost, Lang } from '../types';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { ArticleMeta } from './shared';
import { DiscoveryCoverMedia } from './discovery-cover';
import { hasCover } from './cover';
import { cn } from '@/lib/utils';
import { Empty, EmptyTitle } from '@/components/ui/empty';
import { MonoLabel } from '../ui/mono-label';
import { useT } from '../i18n/use-t';

interface MorePostsCardProps {
  // Déjà filtrée par la page : le filtre vit dans le rail, pas ici.
  posts: DiscoveryPost[];
  total: number;
  lang: Lang;
  onOpen: (post: DiscoveryPost) => void;
  className?: string;
}

export const MorePostsCard = ({
  posts,
  total,
  lang,
  onOpen,
  className,
}: MorePostsCardProps) => {
  const t = useT();

  return (
    <section
      className={cn(
        'flex min-h-96 min-w-0 flex-col overflow-hidden bg-background app:min-h-0',
        className,
      )}
    >
      {/* Pas `ItemHeader` : sa cva porte `basis-full`, prévu pour une rangée
          d'un `Item` qui enveloppe. Dans cette colonne flex, `flex-basis: 100%`
          se lit sur la hauteur — l'en-tête prenait toute la cellule et la liste
          disparaissait sous le pli. Ce bandeau n'est pas l'en-tête d'un Item,
          c'est celui de la cellule. */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
        <MonoLabel tone="primary">{t('discoveryPage.morePosts')}</MonoLabel>
        <span className="font-mono text-xs tracking-widest text-muted-foreground">
          {posts.length}/{total}
        </span>
      </div>

      {/* `ItemGroup` apporte le `role="list"` qui manquait. Deux réglages contre
          ses défauts : `gap-0` annule son `gap-4` — les lignes sont jointives,
          séparées par un filet et non par un blanc —, et le filet est posé par
          le conteneur plutôt que par chaque ligne, sinon la dernière double la
          gouttière de la grille au bas de la cellule. */}
      <ItemGroup className="min-h-0 flex-1 gap-0 overflow-y-auto [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-b-border">
        {posts.map((post) => (
          <Item
            key={post.id}
            // La ligne reste un vrai `<button>` : `render` compose la cellule
            // cliquable du site avec la structure `Item`, au lieu de rendre un
            // `<div>` à `onClick` — qui ne serait ni focusable, ni activable au
            // clavier, ni annoncé comme une action.
            render={<Button variant="cell" size="cell" />}
            onClick={() => onOpen(post)}
            // Deux annulations, chacune contre une cva différente :
            // `flex-row` contre le `flex-col` de `size="cell"` — la cellule
            // bento empile, la ligne de liste juxtapose — et `flex-nowrap`
            // contre le `flex-wrap` d'`itemVariants`, sans quoi la vignette et
            // le texte passent à la ligne dans une colonne étroite.
            className="flex-row flex-nowrap items-center gap-3 px-5 py-3"
          >
            {hasCover(post) && (
              // `rounded-none` annule le `rounded-sm` d'`ItemMedia` : le rayon
              // du site est 0 (`--radius` dans styles.css).
              <ItemMedia
                variant="image"
                className="relative size-12 rounded-none"
              >
                <DiscoveryCoverMedia
                  post={post}
                  lang={lang}
                  sizes="48px"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </ItemMedia>
            )}
            <ItemContent className="min-w-0">
              <ArticleMeta post={post} lang={lang} muted />
              {/* `block w-auto` annule le `flex w-fit` d'`ItemTitle`, sans quoi
                  le titre se dimensionne à son contenu et le `line-clamp` n'a
                  plus de largeur à contraindre. */}
              <ItemTitle className="block w-auto line-clamp-2 text-sm font-normal leading-snug tracking-tight text-foreground">
                {post.title[lang]}
              </ItemTitle>
            </ItemContent>
          </Item>
        ))}

        {posts.length === 0 && (
          <Empty size="compact">
            <EmptyTitle>{t('discoveryPage.noPosts')}</EmptyTitle>
          </Empty>
        )}
      </ItemGroup>
    </section>
  );
};
