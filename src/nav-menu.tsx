import { useNavigate } from '@tanstack/react-router';
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
import { SCREEN_TO_PATH } from './lib/screens';
import type { Lang } from './types';

// Libellés dans les locales, chemins résolus par SCREEN_TO_PATH. L'ancien
// `nav.items` portait des `href` en dur par langue : une troisième copie de la
// table d'URLs, à côté de screens.ts et book-routes.ts.
const NAV_SCREENS = [
  { screen: 'home', label: 'nav.home' },
  { screen: 'plateau-live', label: 'nav.stages' },
  { screen: 'gallery', label: 'nav.gallery' },
  { screen: 'discovery', label: 'nav.discovery', disabled: true },
  { screen: 'postprod', label: 'nav.postprod' },
  { screen: 'contact', label: 'nav.contact' },
  { screen: 'legal', label: 'nav.legal' },
] as const;

interface NavItemDef {
  label: string;
  href: string;
  disabled?: boolean;
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
  if (item.disabled) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${item.label} — ${t('home.comingSoon')}`}
        className="relative flex min-h-13 cursor-not-allowed flex-col justify-between gap-1 border-b border-border px-4 py-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground leading-none">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1 leading-none">
            <Lock width="9" height="9" aria-hidden="true" />
            {t('home.comingSoon')}
          </span>
        </div>
        <span className="mt-auto text-base font-light text-muted-foreground">
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
      className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 relative flex min-h-13 cursor-pointer flex-col justify-between gap-1 border-b border-border px-4 py-2.5 no-underline transition-colors hover:bg-muted"
    >
      <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="mt-auto text-base font-light text-foreground">
        {item.label}
      </span>
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
    className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 relative flex min-h-13 cursor-pointer flex-col justify-between gap-1 border-b border-border px-4 py-2.5 no-underline transition-colors hover:bg-muted"
  >
    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
      {String(index + 1).padStart(2, '0')}
    </span>
    <span className="mt-auto flex items-baseline gap-1.5 text-base font-light text-foreground">
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
        render={<a href={bookingHref} />}
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          onClose();
          navigate({ to: bookingHref });
        }}
        className="h-12  no-underline"
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
          {NAV_SCREENS.map((entry, index) => (
            <NavItemLink
              key={entry.screen}
              item={{
                label: t(entry.label),
                href: SCREEN_TO_PATH[entry.screen](lang),
                disabled: 'disabled' in entry ? entry.disabled : undefined,
              }}
              index={index}
              onClose={onClose}
              navigate={navigate}
            />
          ))}
          <NavExternalLink
            href="https://etouch.e-do.studio"
            label="Etouch"
            index={NAV_SCREENS.length}
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
