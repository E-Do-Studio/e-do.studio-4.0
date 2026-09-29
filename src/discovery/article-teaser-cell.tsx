import { useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { DiscoveryPost, Lang } from '../types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MonoLabel } from '../ui/mono-label';
import { sectionTitleVariants } from '../ui/section-intro';
import { useT } from '../i18n/use-t';
import { discoveryPostPath } from '../lib/screens';

interface ArticleTeaserCellProps {
  post: DiscoveryPost;
  lang: Lang;
  className?: string;
}

// Le renvoi vers l'article suivant, en tête de la colonne de gauche de
// l'article : un libellé, un titre, une flèche. La cellule entière est le lien.
//
// C'était une carte encadrée au bout du texte, avec vignette, rubrique, titre
// en 16px et « Lire l'article » — quatre éléments pour dire « la suite est
// là », qu'on ne voyait qu'après 2300px de lecture.
//
// Une ancre : c'est le seul lien d'un article vers un autre.
export const ArticleTeaserCell = ({
  post,
  lang,
  className,
}: ArticleTeaserCellProps) => {
  const t = useT();
  const navigate = useNavigate();
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
      className={cn('group gap-3', className)}
    >
      <MonoLabel tone="primary">{t('discoveryPage.nextArticle')}</MonoLabel>
      {/* `leading-tight` après le registre : sur trois lignes, `leading-none`
          colle les jambages aux capitales. */}
      <span
        className={cn(
          sectionTitleVariants({ size: 'xs' }),
          'line-clamp-3 leading-tight text-foreground',
        )}
      >
        {post.title[lang]}
      </span>
      <ArrowRight
        aria-hidden
        className="mt-1 size-4 text-muted-foreground transition-[translate,color] duration-150 ease-out group-hover:translate-x-1 group-hover:text-foreground"
      />
    </Button>
  );
};
