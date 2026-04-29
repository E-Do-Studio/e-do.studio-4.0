import { useNavigate } from '@tanstack/react-router';
import { CellLabel, IconX, cn } from './ui';
import { SOCIAL_LINKS } from './data/site';
import type { Lang } from './types';

interface NavItemDef {
  label: string;
  href: string;
}

const NAV_ITEMS: Record<Lang, NavItemDef[]> = {
  fr: [
    { label: "Accueil", href: "/fr" },
    { label: "Cyclorama", href: "/fr/cyclorama" },
    { label: "Galerie", href: "/fr/galerie" },
    { label: "Discovery", href: "/fr/discovery" },
    { label: "Post-production", href: "/fr/post-production" },
    { label: "Contact", href: "/fr/contact" },
    { label: "Légal", href: "/fr/legal" },
  ],
  en: [
    { label: "Home", href: "/en" },
    { label: "Cyclorama", href: "/en/cyclorama" },
    { label: "Gallery", href: "/en/galerie" },
    { label: "Discovery", href: "/en/discovery" },
    { label: "Post-production", href: "/en/post-production" },
    { label: "Contact", href: "/en/contact" },
    { label: "Legal", href: "/en/legal" },
  ],
};

interface NavOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const NavOverlay = ({ isOpen, onClose }: NavOverlayProps) => (
  <div
    onClick={onClose}
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
}

const NavHeader = ({ onClose }: NavHeaderProps) => (
  <div className="grid grid-cols-fluid-auto border-b border-foreground">
    <div className="flex items-center px-4 py-3.5">
      <CellLabel>Navigation</CellLabel>
    </div>
    <button
      onClick={onClose}
      aria-label="Close"
      className="edo-focus-ring flex h-12 w-12 cursor-pointer items-center justify-center border-0 border-l border-foreground bg-white transition-colors hover:bg-muted"
    >
      <IconX width="20" height="20" />
    </button>
  </div>
);

interface NavItemLinkProps {
  item: NavItemDef;
  index: number;
  onClose: () => void;
  navigate: (opts: { to: string }) => void;
}

const NavItemLink = ({ item, index, onClose, navigate }: NavItemLinkProps) => (
  <a
    href={item.href}
    onClick={(e) => {
      e.preventDefault();
      onClose();
      navigate({ to: item.href });
    }}
    className="edo-focus-ring relative flex min-h-18 cursor-pointer flex-col justify-between border-b border-foreground p-4 no-underline transition-colors hover:bg-muted"
  >
    <CellLabel>{String(index + 1).padStart(2, "0")}</CellLabel>
    <span className="mt-6 text-base font-medium text-muted-foreground">
      {item.label}
    </span>
  </a>
);

interface SocialLinkProps {
  item: typeof SOCIAL_LINKS[number];
  index: number;
}

const SocialLink = ({ item, index }: SocialLinkProps) => (
  <a
    href={item.href}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      "edo-focus-ring flex cursor-pointer items-center justify-center border-b border-foreground px-4 py-3 font-mono text-caption uppercase tracking-label text-muted-foreground no-underline transition-colors hover:bg-muted",
      index % 2 === 0 && "border-r border-foreground",
    )}
  >
    {item.label}
  </a>
);

const SocialGrid = () => (
  <div className="grid grid-cols-2">
    {SOCIAL_LINKS.map((item, index) => (
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
    <div className="grid grid-cols-auto-fluid border-t border-foreground">
      <button
        onClick={() => setLang(lang === "fr" ? "en" : "fr")}
        className="edo-focus-ring h-12 w-12 cursor-pointer border-0 border-r border-foreground bg-white font-mono text-caption uppercase tracking-label transition-colors hover:bg-muted"
      >
        {lang === "fr" ? "EN" : "FR"}
      </button>
      <a
        href={bookingHref}
        onClick={(e) => {
          e.preventDefault();
          onClose();
          navigate({ to: bookingHref });
        }}
        className="edo-focus-ring h-12 flex cursor-pointer items-center justify-center border-0 bg-primary font-mono text-xs uppercase tracking-label text-white no-underline transition-colors hover:bg-foreground hover:text-white"
      >
        {lang === "fr" ? "Réserver" : "Book now"}
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

  return (
    <>
      <NavOverlay isOpen={isOpen} onClose={onClose} />
      <aside
        className={cn(
          "fixed left-0 top-0 z-sheet flex h-full w-72 flex-col border-r border-foreground bg-white transition-transform duration-300 ease-edo-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <NavHeader onClose={onClose} />

        <nav className="flex flex-1 flex-col overflow-y-auto">
          {NAV_ITEMS[lang].map((item, index) => (
            <NavItemLink key={item.href} item={item} index={index} onClose={onClose} navigate={navigate} />
          ))}
          <SocialGrid />
        </nav>

        <NavFooter lang={lang} setLang={setLang} onClose={onClose} navigate={navigate} />
      </aside>
    </>
  );
};

export { NavMenu };
