import type { ReactNode } from 'react';
import type { Lang } from '../types';
import { CellLabel } from './typography';
import { cn } from './cn';
import { Wordmark } from './brand';
import { HoverMarquee } from './hover-marquee';
import { IconArrowRight, IconMenu } from './icons';
import { common } from '../i18n/messages';

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
    'edo-focus-ring flex h-full cursor-pointer items-center justify-center gap-2 border-0 font-mono uppercase no-underline transition-[color,background-color,opacity] duration-150 ease-edo-out',
    expand ? 'flex-1' : 'flex-none',
    isPrimary
      ? 'bg-primary px-4 md:px-6 text-label tracking-caption text-white hover:opacity-90'
      : isDark
        ? 'bg-foreground px-4 md:px-5 text-label tracking-label text-white hover:text-primary'
        : 'bg-background px-4 md:px-5 text-label tracking-ui text-foreground hover:bg-muted',
    className,
  );
  const content = (
    <>
      <HoverMarquee className="min-w-0">{label}</HoverMarquee>
      {showArrow && (
        <IconArrowRight
          width={isPrimary ? 14 : 12}
          height={isPrimary ? 14 : 12}
          className={cn(
            'shrink-0',
            isPrimary || isDark ? 'text-white' : undefined,
          )}
        />
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={actionClassName}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={actionClassName}>
      {content}
    </button>
  );
};

const DEFAULT_TITLE_CLASS = 'lg:col-start-2';
const DEFAULT_RIGHT_BLOCK_CLASS = 'lg:col-start-3 lg:col-span-2';
const RIGHT_BLOCK_BASE_CLASS =
  'flex min-w-0 [&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-hairline';

const LangButton = ({
  lang,
  onLangToggle,
  className,
}: {
  lang: Lang;
  onLangToggle: () => void;
  className?: string;
}) => (
  <button
    onClick={onLangToggle}
    style={{ width: '3.375rem', flex: '0 0 3.375rem' }}
    className={cn(
      'edo-focus-ring flex h-full cursor-pointer items-center justify-center border-0 bg-background p-0 transition-colors hover:bg-muted',
      className,
    )}
  >
    <span className="font-mono text-label tracking-meta text-foreground">
      {common.langToggleLabel[lang]}
    </span>
  </button>
);

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
        subgrid && 'lg:!border-r-0',
        subgrid && (titleClassName ?? DEFAULT_TITLE_CLASS),
      )}
    >
      <div
        className={cn(
          'flex min-w-0 items-baseline overflow-hidden',
          subtitle ? 'gap-3.5' : 'gap-0',
        )}
      >
        <CellLabel className="min-w-0 text-primary md:shrink-0">
          <HoverMarquee>{title}</HoverMarquee>
        </CellLabel>
        {subtitle && (
          <HoverMarquee className="font-mono text-label tracking-ui text-muted-foreground">
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
        subgrid && 'lg:grid lg:grid-cols-subgrid',
        '[&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-hairline',
        className,
      )}
    >
      <div className="flex h-full flex-none basis-44 md:basis-nav lg:col-start-1 [&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-hairline">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background text-foreground transition-colors hover:bg-muted md:hidden"
        >
          <IconMenu width="18" height="18" />
        </button>
        <button
          onClick={onLogoClick}
          aria-label="E-Do Studio home"
          className="edo-focus-ring flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-background p-2 transition-colors hover:bg-muted"
        >
          <Wordmark size={32} />
        </button>
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
            'lg:justify-end lg:[&>*:first-child]:border-l lg:[&>*:first-child]:border-hairline',
            hasMobileAction && 'flex-1 md:flex-initial',
            rightBlockClassName ?? DEFAULT_RIGHT_BLOCK_CLASS,
          )}
        >
          {actions.map((action) => (
            <PageHeaderActionButton
              key={action.id}
              {...action}
              className={cn(action.className, '!flex-1 md:!flex-none')}
            />
          ))}
          <LangButton lang={lang} onLangToggle={onLangToggle} />
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
              className={cn(action.className, '!flex-1 md:!flex-none')}
            />
          ))}
          <LangButton lang={lang} onLangToggle={onLangToggle} />
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
  const items: {
    id: MainNavId;
    label: string;
    screen: string;
    primary?: boolean;
  }[] = [
    { id: 'stages', label: common.stages[lang], screen: 'plateau-live' },
    { id: 'postprod', label: common.postProd[lang], screen: 'postprod' },
    { id: 'gallery', label: common.gallery[lang], screen: 'gallery' },
    { id: 'contact', label: common.contactUs[lang], screen: 'contact' },
    { id: 'book', label: common.book[lang], screen: 'book', primary: true },
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
