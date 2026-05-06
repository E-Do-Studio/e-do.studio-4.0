import type { ReactNode } from 'react';
import type { Lang } from '../types';
import { CellLabel } from './typography';
import { cn } from './cn';
import { Wordmark } from './brand';
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
  actions?: PageHeaderAction[];
  className?: string;
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
    'edo-focus-ring flex h-full cursor-pointer items-center justify-center gap-2 border-0 font-mono uppercase no-underline transition-colors',
    expand ? 'flex-1' : 'flex-none',
    isPrimary
      ? 'bg-primary px-6 text-label tracking-caption text-white hover:bg-foreground hover:text-white'
      : isDark
        ? 'bg-foreground px-5 text-label tracking-label text-white hover:brightness-110'
        : 'bg-background px-5 text-label tracking-ui text-foreground hover:bg-muted',
    className,
  );
  const content = (
    <>
      <span className="whitespace-nowrap">{label}</span>
      {showArrow && (
        <IconArrowRight
          width={isPrimary ? 14 : 12}
          height={isPrimary ? 14 : 12}
          className={isPrimary || isDark ? 'text-white' : undefined}
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
    <button
      type="button"
      onClick={onClick}
      className={actionClassName}
    >
      {content}
    </button>
  );
};

const PageHeader = ({
  lang,
  title,
  subtitle,
  actions = EMPTY_PAGE_HEADER_ACTIONS,
  className,
  onMenuClick,
  onLogoClick,
  onLangToggle,
}: PageHeaderProps) => (
  <header className={cn('sticky top-0 z-10 flex min-w-0 gap-px bg-foreground', className)}>
    <div className="flex h-full flex-none basis-36 gap-px bg-foreground md:basis-nav">
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

    <div className="flex min-w-0 flex-1 items-center bg-background px-4 md:px-6">
      <div className="flex min-w-0 items-baseline gap-3.5 overflow-hidden">
        <CellLabel className="shrink-0 text-primary">{title}</CellLabel>
        {subtitle && (
          <span className="truncate font-mono text-label tracking-ui text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
    </div>

    {actions.map((action) => (
      <PageHeaderActionButton key={action.id} {...action} />
    ))}

    <button
      onClick={onLangToggle}
      className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background p-0 transition-colors hover:bg-muted"
    >
      <span className="font-mono text-label tracking-meta text-foreground">
        {common.langToggleLabel[lang]}
      </span>
    </button>
  </header>
);

export { PageHeader };
export type { PageHeaderAction, PageHeaderProps };
