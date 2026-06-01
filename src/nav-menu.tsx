import { useNavigate } from '@tanstack/react-router';
import { CellLabel, IconLock, IconX, cn } from './ui';
import { useSocialLinks } from './lib/use-strapi';
import { nav, common, home as homeMsg } from './i18n/messages';
import type { Lang, SocialLink } from './types';

interface NavItemDef {
  label: string;
  href: string;
  disabled?: boolean;
}

interface NavOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const NavOverlay = ({ isOpen, onClose }: NavOverlayProps) => (
  <div
    onClick={onClose}
    aria-hidden="true"
    className={cn(
      "fixed inset-0 z-overlay bg-black/40 backdrop-blur-sm transition-opacity duration-300",
      isOpen
        ? "pointer-events-auto opacity-100"
        : "pointer-events-none opacity-0",
    )}
  />
);

interface NavHeaderProps {
  onClose: () => void;
  lang: Lang;
}

const NavHeader = ({ onClose, lang }: NavHeaderProps) => (
  <div className="grid grid-cols-fluid-auto border-b border-hairline">
    <div className="flex items-center px-4 py-3.5">
      <CellLabel>Navigation</CellLabel>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label={common.close[lang]}
      className="edo-focus-ring flex h-12 w-12 cursor-pointer items-center justify-center border-0 border-l border-hairline bg-white transition-colors hover:bg-muted"
    >
      <IconX width="20" height="20" aria-hidden="true" />
    </button>
  </div>
);

interface NavItemLinkProps {
  item: NavItemDef;
  index: number;
  lang: Lang;
  onClose: () => void;
  navigate: (opts: { to: string }) => void;
}

const NavItemLink = ({ item, index, lang, onClose, navigate }: NavItemLinkProps) => {
  if (item.disabled) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${item.label} — ${homeMsg.comingSoon[lang]}`}
        className="relative flex min-h-13 cursor-not-allowed flex-col justify-between gap-1 border-b border-hairline px-4 py-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <CellLabel>{String(index + 1).padStart(2, "0")}</CellLabel>
          <span className="inline-flex items-center gap-1 font-mono text-micro uppercase tracking-meta text-muted-foreground">
            <IconLock width="9" height="9" aria-hidden="true" />
            {homeMsg.comingSoon[lang]}
          </span>
        </div>
        <span className="mt-auto text-cell font-light text-muted-foreground">
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
      className="edo-focus-ring relative flex min-h-13 cursor-pointer flex-col justify-between gap-1 border-b border-hairline px-4 py-2.5 no-underline transition-colors hover:bg-muted"
    >
      <CellLabel>{String(index + 1).padStart(2, "0")}</CellLabel>
      <span className="mt-auto text-cell font-light text-foreground">
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
    className="edo-focus-ring relative flex min-h-13 cursor-pointer flex-col justify-between gap-1 border-b border-hairline px-4 py-2.5 no-underline transition-colors hover:bg-muted"
  >
    <CellLabel>{String(index + 1).padStart(2, "0")}</CellLabel>
    <span className="mt-auto flex items-baseline gap-1.5 text-cell font-light text-foreground">
      {label}
      <span aria-hidden="true" className="font-mono text-micro tracking-meta text-muted-foreground">↗</span>
    </span>
  </a>
);

interface SocialLinkProps {
  item: SocialLink;
  index: number;
}

const SocialLink = ({ item, index }: SocialLinkProps) => (
  <a
    href={item.href}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      "edo-focus-ring flex cursor-pointer items-center justify-center border-b border-hairline px-4 py-3 font-mono text-caption uppercase tracking-label text-muted-foreground no-underline transition-colors hover:bg-muted",
      index % 2 === 0 && "border-r border-hairline",
    )}
  >
    {item.label}
  </a>
);

const SocialGrid = ({ links }: { links: SocialLink[] }) => (
  <div className="grid grid-cols-2">
    {links.map((item, index) => (
      <SocialLink key={item.k} item={item} index={index} />
    ))}
  </div>
);

interface NavFooterProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  onClose: () => void;
  navigate: (opts: { to: string }) => void;
}

const NavFooter = ({ lang, setLang, onClose, navigate }: NavFooterProps) => {
  const bookingHref = lang === "fr" ? "/fr/reserver" : "/en/book";

  return (
    <div className="grid grid-cols-auto-fluid border-t border-hairline">
      <button
        onClick={() => setLang(lang === "fr" ? "en" : "fr")}
        className="edo-focus-ring h-12 w-12 cursor-pointer border-0 border-r border-hairline bg-white font-mono text-caption uppercase tracking-label transition-colors hover:bg-muted"
      >
        {common.langToggleLabel[lang]}
      </button>
      <a
        href={bookingHref}
        onClick={(e) => {
          e.preventDefault();
          onClose();
          navigate({ to: bookingHref });
        }}
        className="edo-focus-ring h-12 flex cursor-pointer items-center justify-center border-0 bg-primary font-mono text-caption uppercase tracking-label text-white no-underline transition-[color,background-color,opacity] duration-150 ease-edo-out hover:opacity-90"
      >
        {common.bookNow[lang]}
      </a>
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
  const { data: socialLinks } = useSocialLinks();

  return (
    <>
      <NavOverlay isOpen={isOpen} onClose={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={common.menu[lang]}
        aria-hidden={isOpen ? undefined : true}
        {...({ inert: isOpen ? undefined : '' } as Record<string, unknown>)}
        className={cn(
          "fixed left-0 top-0 z-sheet flex h-full w-72 flex-col border-r border-hairline bg-white transition-transform duration-300 ease-edo-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <NavHeader onClose={onClose} lang={lang} />

        <nav className="flex flex-1 flex-col overflow-y-auto" aria-label={common.menu[lang]}>
          {nav.items[lang].map((item, index) => (
            <NavItemLink key={item.href} item={item} index={index} lang={lang} onClose={onClose} navigate={navigate} />
          ))}
          <NavExternalLink
            href="https://etouch.e-do.studio"
            label="Etouch"
            index={nav.items[lang].length}
          />
          <SocialGrid links={socialLinks ?? []} />
        </nav>

        <NavFooter lang={lang} setLang={setLang} onClose={onClose} navigate={navigate} />
      </aside>
    </>
  );
};

export { NavMenu };
