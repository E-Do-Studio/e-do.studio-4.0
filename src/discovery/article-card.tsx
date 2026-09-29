import { useNavigate } from '@tanstack/react-router';
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
import { sectionTitleVariants } from '../ui/section-intro';
import { useT } from '../i18n/use-t';
import { discoveryPostPath } from '../lib/screens';

interface ArticleCardProps {
  post: DiscoveryPost;
  lang: Lang;
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
//
// Une vraie ancre et non un `<button>` : l'index était la seule porte des
// articles, et il n'en exposait aucun lien — les moteurs ne les atteignaient
// que par le JSON-LD.
export const ArticleCard = ({ post, lang, className }: ArticleCardProps) => {
  const t = useT();
  const navigate = useNavigate();
  const cover = hasCover(post);
  const href = discoveryPostPath(lang, post.slug);
  return (
    <Button
      variant="cell"
      size="cell"
      render={<a href={href} />}
      onClick={(e) => {
        e.preventDefault();
        navigate({ to: href });
      }}
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
          {/* Sous `app`, la carte n'a plus de rangée de grille pour la
              dimensionner : sans ratio, la cover recevait ce que le titre
              laissait de `min-h-96` — 180px de vidéo sur un téléphone. */}
          <div className="relative aspect-video min-h-0 app:aspect-auto">
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

      {/* Le registre « titre de page » : c'est la plus grande cellule de la
          page, et le seul article qu'elle met en avant. À 24px sous 600px de
          vidéo, le titre se lisait comme une légende — rien sur l'écran n'y
          était plus grand qu'un titre de la liste voisine.

          Sans cover, `justify-between` : le titre tient alors seul la
          cellule, et un aplat gris de 900px ne remplacerait pas une image, il
          annoncerait qu'il en manque une. */}
      <div
        className={cn(
          'flex min-w-0 flex-col gap-5 overflow-hidden px-5 py-6 md:px-8 md:py-7',
          !cover && 'justify-between',
        )}
      >
        {/* Deux valeurs, deux éléments : la rubrique à gauche, la date en
            face — jamais une chaîne à point médian. */}
        <div className="flex items-baseline justify-between gap-4">
          <MonoLabel tone="primary">{post.tag[lang]}</MonoLabel>
          {post.date[lang] && (
            <MonoLabel tone="muted" className="tabular-nums">
              {post.date[lang]}
            </MonoLabel>
          )}
        </div>
        <h2
          className={cn(
            sectionTitleVariants({ size: 'lg' }),
            'line-clamp-3 text-foreground app:text-5xl',
          )}
        >
          {post.title[lang]}
        </h2>
        <MonoLabel className="inline-flex items-center gap-2">
          {t('discoveryPage.readArticle')}
          <ArrowRight
            data-icon="inline-end"
            className="transition-transform duration-150 ease-out group-hover:translate-x-1"
          />
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
