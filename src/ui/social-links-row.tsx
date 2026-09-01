import { usePageContext } from '../lib/page-context';
import type { SocialLink } from '../types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SocialIcon } from './social-icon';

const ABBREV: Record<string, string> = {
  instagram: 'IG',
  linkedin: 'LI',
  facebook: 'FB',
  tiktok: 'TT',
};

const labelFor = (s: SocialLink) => ABBREV[s.k] ?? s.label;

interface SocialLinksRowProps {
  className?: string;
  layout?: 'auto' | 'row';
}

const LAYOUT_CLASSES: Record<'auto' | 'row', string> = {
  auto: 'grid grid-cols-2 gap-px bg-border',
  row: 'grid grid-cols-4 gap-px bg-border',
};

const SocialLinksRow = ({
  className,
  layout = 'auto',
}: SocialLinksRowProps) => {
  const { siteData } = usePageContext();
  const items: SocialLink[] = siteData.socialLinks ?? [];
  return (
    <div className={cn(LAYOUT_CLASSES[layout], className)}>
      {items.map((s) => (
        <Button
          key={s.k}
          variant="cell"
          render={<a href={s.href} target="_blank" rel="noopener noreferrer" />}
          // `justify-center gap-2` et non `justify-between` : le sigle et son
          // libellé sont UNE étiquette. Écartés aux deux bords, ils tenaient
          // dans les 100px de la piste du bento, mais la même cellule fait 225px
          // dans la pile élargie — l'icône et son libellé s'y lisaient comme
          // deux éléments sans rapport, aux deux bouts d'une case vide.
          className="h-auto justify-center gap-2 px-3 py-3 no-underline"
        >
          <SocialIcon kind={s.k} size={12} />
          <span className="font-mono text-xs tracking-widest">
            {labelFor(s)}
          </span>
        </Button>
      ))}
    </div>
  );
};

export { SocialLinksRow };
export type { SocialLinksRowProps };
