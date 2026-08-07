import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';
import { usePageContext } from '../lib/page-context';
import { MonoLabel } from '../ui/mono-label';

interface BookCtaCellProps {
  className?: string;
}

// La seule cellule orange de la page, donc la seule qui garde `variant="default"`
// — `bg-primary text-primary-foreground` est ici demandé, pas subi.
//
// `size="cell"` en revanche est indispensable : sans lui la cellule héritait le
// `h-8` d'un bouton d'une ligne, et surtout le `uppercase whitespace-nowrap` de
// la base, qui descendait dans les enfants.
//
// `goto` vient du contexte et non d'une prop : c'est la règle que
// `social-clients-bar.tsx` énonce et que `PageHeader` applique depuis onze
// appelants — la page n'a rien à faire descendre.
export const BookCtaCell = ({ className }: BookCtaCellProps) => {
  const t = useT();
  const { goto } = usePageContext();
  return (
    <Button
      type="button"
      onClick={() => goto('book')}
      size="cell"
      className={cn(
        'flex-row items-center justify-between gap-4 px-6 py-4',
        className,
      )}
    >
      <ItemContent className="min-w-0 gap-1">
        <MonoLabel className="text-primary-foreground/75">
          {t('discoveryPage.studioOpen')}
        </MonoLabel>
        {/* Même voix typographique que le pavé RÉSERVER de l'accueil :
            sans, léger, très resserré — pas la mono capitale de la base. */}
        <ItemTitle className="block w-auto text-2xl font-light leading-none tracking-tighter text-primary-foreground">
          {t('common.book')}
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        {/* `size-6` comme le pavé de `CtaCell` : même titre en `text-2xl`,
            donc même flèche. Les 16px de base y étaient perdus. */}
        <ArrowRight className="size-6 text-primary-foreground" />
      </ItemActions>
    </Button>
  );
};
