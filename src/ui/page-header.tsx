import type { ReactNode } from 'react';
import type { Lang } from '../types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Wordmark } from './brand';
import { HoverMarquee } from './hover-marquee';
import { ArrowRight, Menu } from 'lucide-react';
import { getT } from '../i18n';
import { useT } from '../i18n/use-t';

interface PageHeaderAction {
  id: string;
  label: ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
  rel?: string;
  variant?: 'default' | 'primary' | 'dark';
  showArrow?: boolean;
  className?: string;
  expand?: boolean;
}

interface PageHeaderProps {
  lang: Lang;
  title: ReactNode;
  subtitle?: ReactNode;
  // Rendered as its own header cell (with a hairline divider) immediately to
  // the right of the title cell. Used on the home page for the CMS announcement.
  titleAside?: ReactNode;
  actions?: PageHeaderAction[];
  className?: string;
  // md+ subgrid placement overrides. Defaults match the plateau/contact
  // layout: title spans cols 2-3 (= the wide content area), right block sits
  // in col 4 (= the narrow descrip-like col). Pages where the body proportions
  // are inverted (e.g. postprod with samples on the right spanning cols 3-4)
  // pass their own classes. Set `subgrid={false}` to skip the grid layout
  // entirely (header stays flex on every breakpoint).
  titleClassName?: string;
  rightBlockClassName?: string;
  subgrid?: boolean;
  onMenuClick: () => void;
  onLogoClick: () => void;
  onLangToggle: () => void;
}

const EMPTY_PAGE_HEADER_ACTIONS: PageHeaderAction[] = [];

const PageHeaderActionButton = ({
  label,
  onClick,
  href,
  target,
  rel,
  variant = 'default',
  showArrow = true,
  className,
  expand,
}: PageHeaderAction) => {
  const isPrimary = variant === 'primary';
  const isDark = variant === 'dark';
  const actionClassName = cn(
    // Le filet entre deux actions vient du conteneur, jamais du bouton.
    'h-full gap-2 no-underline',
    expand ? 'flex-1' : 'flex-none',
    isPrimary
      ? 'px-4 text-xs tracking-wide md:px-6'
      : isDark
        ? 'dark bg-background px-4 text-xs tracking-widest hover:text-primary md:px-5'
        : 'px-4 text-xs tracking-wider md:px-5',
    className,
  );
  const actionVariant = isPrimary ? 'default' : 'header';
  const content = (
    <>
      <HoverMarquee className="min-w-0">{label}</HoverMarquee>
      {/* Aucune couleur ici : la flèche hérite de celle du bouton. Elle se
          voyait forcer `text-foreground` sur les variantes primaire et sombre,
          c'est-à-dire du noir sur le pavé orange, à côté d'un libellé blanc.
          Aucune dimension non plus : la base contraint l'icône par CSS, ce qui
          l'emporte sur les attributs `width` et `height`. */}
      {showArrow && <ArrowRight data-icon="inline-end" />}
    </>
  );

  if (href) {
    return (
      <Button
        variant={actionVariant}
        render={<a href={href} target={target} rel={rel} />}
        className={actionClassName}
      >
        {content}
      </Button>
    );
  }

  return (
    <Button
      variant={actionVariant}
      onClick={onClick}
      className={actionClassName}
    >
      {content}
    </Button>
  );
};

const DEFAULT_TITLE_CLASS = 'lg:col-start-2';
const DEFAULT_RIGHT_BLOCK_CLASS = 'lg:col-start-3 lg:col-span-2';
// Le filet entre deux cellules du header appartient au conteneur.
//
// Prudence avec `divide-x` : Tailwind l'émet dans `:where(…)`, donc à
// spécificité nulle. Il a déjà fait disparaître ces filets en silence — sans
// rien casser au typecheck ni au build — le jour où une variante posait
// `border-0`. Le sélecteur ci-dessous compile en `.classe > *:not(:last-child)`,
// soit 0,2,0 : il ne dépend d'aucune hypothèse sur les variantes.
const CELL_DIVIDERS =
  '[&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-border';

const RIGHT_BLOCK_BASE_CLASS = `flex min-w-0 ${CELL_DIVIDERS}`;

const LangButton = ({
  onLangToggle,
  className,
}: {
  onLangToggle: () => void;
  className?: string;
}) => {
  const t = useT();
  return (
    <Button
      variant="header"
      onClick={onLangToggle}
      // `w-*` et non `basis-*` : `flex-none` est le raccourci `flex: 0 0 auto`,
      // qui remet `flex-basis` à `auto`. La base ne tenait que parce que
      // Tailwind émet `basis-14` après `flex-none` — un ordre sur lequel on ne
      // veut pas parier. Une largeur, elle, n'est pas touchée par le raccourci.
      className={cn('h-full w-14 flex-none px-0 md:w-18', className)}
    >
      <span className="font-mono text-xs tracking-widest text-foreground">
        {t('common.langToggleLabel')}
      </span>
    </Button>
  );
};

const PageHeader = ({
  lang,
  title,
  subtitle,
  titleAside,
  actions = EMPTY_PAGE_HEADER_ACTIONS,
  className,
  titleClassName,
  rightBlockClassName,
  subgrid = true,
  onMenuClick,
  onLogoClick,
  onLangToggle,
}: PageHeaderProps) => {
  const hasMobileAction = actions.some(
    (a) => !(a.className ?? '').split(' ').includes('hidden'),
  );
  const titleCell = (
    <div
      className={cn(
        'hidden min-w-0 items-center justify-start bg-background md:flex md:px-6',
        titleAside ? 'md:flex-none' : 'flex-1',
        subgrid && (titleClassName ?? DEFAULT_TITLE_CLASS),
      )}
    >
      <div
        className={cn(
          'flex min-w-0 items-baseline overflow-hidden',
          subtitle ? 'gap-3.5' : 'gap-0',
        )}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-primary min-w-0 md:shrink-0">
          <HoverMarquee>{title}</HoverMarquee>
        </span>
        {subtitle && (
          <HoverMarquee className="font-mono text-xs tracking-widest text-muted-foreground">
            {subtitle}
          </HoverMarquee>
        )}
      </div>
    </div>
  );

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex min-w-0 bg-background',
        CELL_DIVIDERS,
        subgrid && 'lg:grid lg:grid-cols-subgrid',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-full flex-none basis-44 md:basis-60 lg:col-start-1',
          CELL_DIVIDERS,
        )}
      >
        <Button
          variant="header"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="h-full basis-14 flex-none px-0 md:hidden"
        >
          <Menu />
        </Button>
        <Button
          variant="header"
          onClick={onLogoClick}
          aria-label="E-Do Studio home"
          className="h-full min-w-0 flex-1 p-2"
        >
          <Wordmark size={32} />
        </Button>
      </div>

      {titleCell}

      {titleAside && (
        <div className="hidden min-w-0 flex-1 items-center justify-start overflow-hidden bg-background md:flex md:px-6">
          {titleAside}
        </div>
      )}

      {subgrid ? (
        /* Subgrid mode — actions + lang are wrapped in a single right block
           grid cell whose width matches the body's rightmost column. On mobile,
           if a primary action is visible (e.g. Book CTA), the wrapper grows
           so the action fills the space between logo and the 54px LangButton. */
        <div
          className={cn(
            RIGHT_BLOCK_BASE_CLASS,
            'lg:justify-end',
            hasMobileAction && 'flex-1 md:flex-initial',
            rightBlockClassName ?? DEFAULT_RIGHT_BLOCK_CLASS,
          )}
        >
          {actions.map((action) => (
            <PageHeaderActionButton
              key={action.id}
              {...action}
              className={cn(action.className, 'flex-1 md:flex-none')}
            />
          ))}
          <LangButton onLangToggle={onLangToggle} />
        </div>
      ) : (
        /* Flex mode — actions + lang are wrapped in a single right block.
           Same mobile-grow behavior for the primary action if visible. */
        <div
          className={cn(
            RIGHT_BLOCK_BASE_CLASS,
            hasMobileAction && 'flex-1 md:flex-initial',
          )}
        >
          {actions.map((action) => (
            <PageHeaderActionButton
              key={action.id}
              {...action}
              className={cn(action.className, 'flex-1 md:flex-none')}
            />
          ))}
          <LangButton onLangToggle={onLangToggle} />
        </div>
      )}
    </header>
  );
};

type MainNavId = 'stages' | 'postprod' | 'gallery' | 'contact' | 'book';

interface BuildMainNavOpts {
  lang: Lang;
  goto: (screen: string) => void;
  exclude?: MainNavId;
}

const buildMainNav = ({
  lang,
  goto,
  exclude,
}: BuildMainNavOpts): PageHeaderAction[] => {
  const t = getT(lang);
  const items: {
    id: MainNavId;
    label: string;
    screen: string;
    primary?: boolean;
  }[] = [
    { id: 'stages', label: t('common.stages'), screen: 'plateau-live' },
    { id: 'postprod', label: t('common.postProd'), screen: 'postprod' },
    { id: 'gallery', label: t('common.gallery'), screen: 'gallery' },
    { id: 'contact', label: t('common.contactUs'), screen: 'contact' },
    { id: 'book', label: t('common.book'), screen: 'book', primary: true },
  ];
  return items
    .filter((it) => it.id !== exclude)
    .map((it) => ({
      id: it.id,
      label: it.label,
      onClick: () => goto(it.screen),
      variant: it.primary ? 'primary' : 'default',
      showArrow: !!it.primary,
      className: it.primary ? undefined : 'hidden md:flex',
    }));
};

export { PageHeader, buildMainNav };
export type { PageHeaderAction, PageHeaderProps, MainNavId };
