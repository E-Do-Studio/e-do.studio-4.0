import React from 'react';
import { IconArrowRight, HeaderAction, HeaderActionText } from '../ui';
import { cn } from '../ui/cn';
import { microBase } from './styles';

interface ArrowIconProps extends React.SVGProps<SVGSVGElement> {}

export const ArrowIcon: React.FC<ArrowIconProps> = (props) => <IconArrowRight {...props} />;

interface CellBadgeProps {
  n?: number;
}

export const CellBadge: React.FC<CellBadgeProps> = () => null;

interface ArticleMetaProps {
  post: import('../types').DiscoveryPost;
  lang: import('../types').Lang;
  muted?: boolean;
  read?: boolean;
}

export const ArticleMeta: React.FC<ArticleMetaProps> = ({ post, lang, muted = false, read = true }) => (
  <span className={cn(microBase, muted ? 'text-muted-foreground' : 'text-primary')}>
    {post.tag[lang]}{read ? ` · ${post.read}` : ''}
  </span>
);

export { HeaderAction, HeaderActionText };
