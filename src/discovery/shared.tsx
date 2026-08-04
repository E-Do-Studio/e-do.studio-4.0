import { cn } from '@/lib/utils';
import { labelBase } from './styles';

interface CellBadgeProps {
  n?: number;
}

// Badge volontairement neutralisé : conserve son type de props pour que les
// appelants continuent de compiler.
export const CellBadge = (_: CellBadgeProps) => null;

interface ArticleMetaProps {
  post: import('../types').DiscoveryPost;
  lang: import('../types').Lang;
  muted?: boolean;
  read?: boolean;
}

export const ArticleMeta = ({
  post,
  lang,
  muted = false,
  read = true,
}: ArticleMetaProps) => (
  <span
    className={cn(labelBase, muted ? 'text-muted-foreground' : 'text-primary')}
  >
    {post.tag[lang]}
    {read ? ` · ${post.read}` : ''}
  </span>
);
