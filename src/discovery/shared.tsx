import type { DiscoveryPost, Lang } from '../types';
import { MonoLabel } from '../ui/mono-label';

interface ArticleMetaProps {
  post: DiscoveryPost;
  lang: Lang;
  muted?: boolean;
  read?: boolean;
}

// Deux valeurs, deux éléments, séparés par la gouttière du flex — pas par un
// « · » collé dans la chaîne. Le point médian empêchait aussi le retour à la
// ligne de tomber entre les deux valeurs plutôt qu'au milieu de l'une d'elles.
export const ArticleMeta = ({
  post,
  lang,
  muted = false,
  read = true,
}: ArticleMetaProps) => (
  <span className="flex min-w-0 items-baseline gap-2.5">
    <MonoLabel tone={muted ? 'muted' : 'primary'}>{post.tag[lang]}</MonoLabel>
    {read && <MonoLabel tone="muted">{post.read}</MonoLabel>}
  </span>
);
