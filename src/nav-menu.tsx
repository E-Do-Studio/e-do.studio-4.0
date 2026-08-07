import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { Lock, X } from 'lucide-react';
import { SocialLinksRow } from './ui/social-links-row';
import { useT } from './i18n/use-t';
import { MENU_NAV, activeNavIn } from './lib/nav';
import { SCREEN_TO_PATH } from './lib/screens';
import { useRoutePreload } from './lib/use-route-preload';
import type { Lang } from './types';
import { ordinal } from './lib/format';
import { MonoLabel } from './ui/mono-label';

interface NavItemDef {
  label: string;
  href: string;
  disabled?: boolean;
  current?: boolean;
}

const NavHeader = () => {
  const t = useT();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b border-border">
      <div className="flex items-center px-4 py-3.5">
        <SheetTitle>Navigation</SheetTitle>
      </div>
      <SheetClose
        aria-label={t('common.close')}
        render={
          <Button
            variant="header"
            size="icon"
            className="size-12 border-l border-border"
          />
        }
      >
        <X aria-hidden="true" />
      </SheetClose>
    </div>
  );
};

interface NavItemLinkProps {
  item: NavItemDef;
  index: number;
  onClose: () => void;
  navigate: (opts: { to: string }) => void;
}

const NavItemLink = ({ item, index, onClose, navigate }: NavItemLinkProps) => {
  const t = useT();
  // Avant le `if` : un hook ne se saute pas. La destination désactivée n'a de
  // toute façon rien à précharger, et le hook ne fait rien sans survol.
  const preload = useRoutePreload(item.href);
  if (item.disabled) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${item.label} — ${t('home.comingSoon')}`}
        className="relative flex min-h-13 cursor-not-allowed flex-col justify-between gap-1 border-b border-border px-4 py-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <MonoLabel tone="muted">{ordinal(index)}</MonoLabel>
          <MonoLabel tone="muted" className="inline-flex items-center gap-1">
            <Lock width="9" height="9" aria-hidden="true" />
            {t('home.comingSoon')}
          </MonoLabel>
        </div>
        <span className="mt-auto text-base text-muted-foreground">
          {item.label}
        </span>
      </div>
    );
  }
  return (
    <a
      href={item.href}
      onClick={(e) => {
        e.preventDefault();
        onClose();
        navigate({ to: item.href });
      }}
      // Le loader part au survol. Sous `lg` le tiroir est la seule navigation,
      // c'est donc ici que le gain compte le plus — au toucher il n'y a pas de
      // survol, mais `onFocus` couvre le clavier.
      {...preload}
      // Même repère que dans la bande d'en-tête, et il compte davantage ici :
      // sous `lg` le tiroir est la seule navigation, donc le seul endroit où
      // « vous êtes ici » puisse se lire.
      aria-current={item.current ? 'page' : undefined}
      className="outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground relative flex min-h-13 cursor-pointer flex-col justify-between gap-1 border-b border-border px-4 py-2.5 text-foreground no-underline transition-colors hover:bg-muted aria-[current=page]:text-primary"
    >
      <MonoLabel tone="muted">{ordinal(index)}</MonoLabel>
      <span className="mt-auto text-base text-current">{item.label}</span>
    </a>
  );
};

interface NavExternalLinkProps {
  href: string;
  label: string;
  index: number;
}

const NavExternalLink = ({ href, label, index }: NavExternalLinkProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground relative flex min-h-13 cursor-pointer flex-col justify-between gap-1 border-b border-border px-4 py-2.5 no-underline transition-colors hover:bg-muted"
  >
    <MonoLabel tone="muted">{ordinal(index)}</MonoLabel>
    <span className="mt-auto flex items-baseline gap-1.5 text-base text-foreground">
      {label}
      <span
        aria-hidden="true"
        className="font-mono text-xs tracking-widest text-muted-foreground"
      >
        ↗
      </span>
    </span>
  </a>
);

interface NavFooterProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  onClose: () => void;
  navigate: (opts: { to: string }) => void;
}

const NavFooter = ({ lang, setLang, onClose, navigate }: NavFooterProps) => {
  const t = useT();
  const bookingHref = SCREEN_TO_PATH.book(lang);
  const preload = useRoutePreload(bookingHref);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] border-t border-border">
      <Button
        variant="header"
        onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        className="size-12 border-r border-border px-0"
      >
        {t('common.langToggleLabel')}
      </Button>
      <Button
        render={<a href={bookingHref} {...preload} />}
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          onClose();
          navigate({ to: bookingHref });
        }}
        className="h-12 no-underline"
      >
        {t('common.bookNow')}
      </Button>
    </div>
  );
};

interface NavMenuProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NavMenu = ({ lang, isOpen, onClose, setLang }: NavMenuProps) => {
  const navigate = useNavigate();
  const t = useT();
  // Même dérivation que la bande d'en-tête, sur la même table de chemins.
  // `location` et non `resolvedLocation` : cf. le commentaire de __root.tsx.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = activeNavIn(MENU_NAV, pathname);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="left"
        showCloseButton={false}
        aria-label={t('common.menu')}
        className="w-72 border-r border-border sm:max-w-72"
      >
        <NavHeader />

        <nav
          className="flex flex-1 flex-col overflow-y-auto"
          aria-label={t('common.menu')}
        >
          {MENU_NAV.map((entry, index) => (
            <NavItemLink
              key={entry.id}
              item={{
                label: t(entry.labelKey),
                href: SCREEN_TO_PATH[entry.screen](lang),
                disabled: entry.disabled,
                current: entry.id === current,
              }}
              index={index}
              onClose={onClose}
              navigate={navigate}
            />
          ))}
          <NavExternalLink
            href="https://etouch.e-do.studio"
            label="Etouch"
            index={MENU_NAV.length}
          />
          <SocialLinksRow className="mt-auto border-t border-border" />
        </nav>

        <NavFooter
          lang={lang}
          setLang={setLang}
          onClose={onClose}
          navigate={navigate}
        />
      </SheetContent>
    </Sheet>
  );
};

export { NavMenu };
