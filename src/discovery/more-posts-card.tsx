import { useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { DiscoveryCategory, DiscoveryPost, Lang } from '../types';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { Empty, EmptyTitle } from '@/components/ui/empty';
import { MonoLabel } from '../ui/mono-label';
import { SegmentGroup, SegmentItem } from '../ui/segment-group';
import { sectionTitleVariants } from '../ui/section-intro';
import { useT } from '../i18n/use-t';
import { discoveryPostPath } from '../lib/screens';

interface MorePostsCardProps {
  // Déjà filtrée par la page : l'état du filtre y vit, la cellule l'affiche.
  posts: DiscoveryPost[];
  // Vide quand il n'y a rien à choisir — voir `discovery-pages.tsx`.
  categories: DiscoveryCategory[];
  activeCategory: string;
  onSelectCategory: (key: string) => void;
  lang: Lang;
  className?: string;
}

export const MorePostsCard = ({
  posts,
  categories,
  activeCategory,
  onSelectCategory,
  lang,
  className,
}: MorePostsCardProps) => {
  const t = useT();
  const navigate = useNavigate();

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
        <MonoLabel tone="muted" className="tabular-nums">
          {posts.length}
        </MonoLabel>
      </div>

      {/* Le filtre au-dessus de la liste qu'il filtre. Il vivait dans la
          colonne du logo, trois cellules plus loin — et sur mobile, la FAQ
          s'intercalait entre lui et ses résultats. */}
      {categories.length > 0 && (
        <SegmentGroup
          label={t('discoveryPage.categories')}
          className="shrink-0 border-b border-border"
        >
          {categories.map((category) => (
            <SegmentItem
              key={category.k}
              selected={activeCategory === category.k}
              onSelect={() => onSelectCategory(category.k)}
              className="flex-1"
            >
              {category[lang]}
            </SegmentItem>
          ))}
        </SegmentGroup>
      )}

      {/* `ItemGroup` apporte le `role="list"`. `gap-0` annule son `gap-4` :
          les lignes sont jointives, séparées par un filet posé par le
          conteneur. La liste se ferme sur un filet, comme le rail — sans lui
          elle se perdait dans le blanc sous le dernier article. */}
      <ItemGroup className="min-h-0 flex-1 gap-0 overflow-y-auto [&>*]:border-b [&>*]:border-b-border">
        {posts.map((post) => {
          const href = discoveryPostPath(lang, post.slug);
          return (
            // `role="listitem"` sur une enveloppe : l'`Item` est rendu en
            // ancre (`render`), qui perdait le rôle.
            <div key={post.id} role="listitem">
              <Item
                // Une vraie ancre : c'est par cette liste que les moteurs
                // atteignent les articles, et elle est focusable et activable
                // au clavier sans rien ajouter.
                render={
                  <Button
                    variant="cell"
                    size="cell"
                    render={<a href={href} />}
                  />
                }
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  navigate({ to: href });
                }}
                // `flex-row` contre le `flex-col` de `size="cell"`, `flex-nowrap`
                // contre le `flex-wrap` d'`itemVariants` : la flèche reste au
                // bout de la ligne au lieu de passer dessous.
                className="group/post flex-row flex-nowrap items-start gap-4 px-5 py-4"
              >
                {/* Une liste de TITRES, sans vignettes. Trois articles sur sept
                    n'ont pas d'image exploitable : la colonne alternait
                    vignettes et cases vides, et la case de 48px ne montrait de
                    toute façon rien qu'on puisse reconnaître. L'image de la
                    page, c'est la une.

                    Et la date plutôt que la rubrique : « Tips » sur chaque
                    ligne n'informait personne — c'est le filtre qui dit la
                    rubrique, quand il y en a plusieurs. */}
                <ItemContent className="min-w-0 gap-2">
                  {post.date[lang] && (
                    <MonoLabel tone="muted" className="tabular-nums">
                      {post.date[lang]}
                    </MonoLabel>
                  )}
                  {/* `block w-auto` annule le `flex w-fit` d'`ItemTitle`, sans
                      quoi le `line-clamp` n'a plus de largeur à contraindre.
                      `leading-tight` après le registre : sur deux lignes,
                      `leading-none` colle les jambages aux capitales. */}
                  <ItemTitle
                    className={cn(
                      sectionTitleVariants({ size: 'xs' }),
                      'block w-auto line-clamp-2 leading-tight text-foreground',
                    )}
                  >
                    {post.title[lang]}
                  </ItemTitle>
                </ItemContent>
                <ArrowRight
                  aria-hidden
                  className="mt-6 size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-150 ease-out group-hover/post:translate-x-1 group-hover/post:text-foreground"
                />
              </Item>
            </div>
          );
        })}

        {posts.length === 0 && (
          <Empty size="compact">
            <EmptyTitle>{t('discoveryPage.noPosts')}</EmptyTitle>
          </Empty>
        )}
      </ItemGroup>
    </section>
  );
};
