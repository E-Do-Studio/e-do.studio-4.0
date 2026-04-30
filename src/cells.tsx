import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { CellLabel, CellTitle, IconArrowRight, IconPlay, IconMenu, Wordmark, LangSwitch, cn } from './ui';
import { MACHINES } from './data/plateaux';
import { BRANDS } from './data/site';
import type { Lang } from './types';

const KEYWORDS = {
  fr: [
    { key: 'food', fr: 'Food', en: 'Food' },
    { key: 'access', fr: 'Accessoires', en: 'Accessories' },
    { key: 'spirits', fr: 'Spiritueux', en: 'Spirits' },
    { key: 'cosmetic', fr: 'Cosmétique', en: 'Cosmetics' },
    { key: 'luxury', fr: 'Luxe', en: 'Luxury' },
    { key: 'fashion', fr: 'Mode', en: 'Fashion' },
  ],
};
const KW = KEYWORDS.fr;

const tile = (seed: number, palette: string = 'warm'): string => {
  const palettes: Record<string, number[][]> = {
    warm: [[32, 14, 78], [28, 10, 62], [24, 8, 48], [36, 16, 72], [20, 6, 40]],
    cool: [[210, 12, 80], [220, 10, 64], [230, 8, 46], [200, 14, 72], [240, 6, 38]],
    mono: [[0, 0, 92], [0, 0, 78], [0, 0, 62], [0, 0, 48], [0, 0, 32]],
    editorial: [[28, 10, 82], [32, 14, 70], [18, 6, 42], [38, 18, 88], [8, 4, 22]],
  };
  const pal = palettes[palette];
  const a = pal[seed % pal.length];
  const b = pal[(seed + 2) % pal.length];
  return `linear-gradient(${135 + (seed * 37) % 90}deg, oklch(${a[2]}% ${a[1] / 100} ${a[0]}) 0%, oklch(${b[2]}% ${b[1] / 100} ${b[0]}) 100%)`;
};

interface NavigationCellProps {
  lang: Lang;
  onMenu: () => void;
  onLogo: () => void;
  compact?: boolean;
}

const NavigationCell = ({ lang, onMenu, onLogo, compact = false }: NavigationCellProps) => (
  <div className="grid h-full bg-white" style={{ gridTemplateColumns: `${compact ? 48 : 60}px 1fr` }}>
    <button
      onClick={onMenu}
      aria-label="Menu"
      className="edo-focus-ring group flex items-center justify-center border-0 bg-white transition-colors duration-150 hover:bg-muted"
    >
      <IconMenu width="20" height="20" />
    </button>
    <button
      onClick={onLogo}
      className="edo-focus-ring group flex items-center justify-center border-0 bg-white px-4 transition-colors duration-150 hover:bg-muted"
    >
      <Wordmark size={32} />
    </button>
  </div>
);

interface CycloramaCellProps {
  lang: Lang;
  onOpen: () => void;
  variant?: string;
}

const CycloramaCell = ({ lang, onOpen, variant = 'full' }: CycloramaCellProps) => (
  <button
    onClick={onOpen}
    className="edo-focus-ring group flex h-full w-full cursor-pointer flex-col justify-between border-0 bg-edo-cream p-4 text-left"
  >
    <svg viewBox="0 0 500 300" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={`cy-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#e2d6c0" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d="M40 280 Q40 60 250 60 Q460 60 460 280 Z" fill={`url(#cy-${variant})`} stroke="#000" strokeWidth="0.5" />
      <ellipse cx="250" cy="280" rx="170" ry="10" fill="rgba(0,0,0,0.08)" />
    </svg>
    <div className="relative">
      <CellLabel>{lang === 'fr' ? 'Production libre · Studio cyclorama' : 'Free production · Cyclorama studio'}</CellLabel>
    </div>
    <div className="relative flex items-end justify-between gap-2">
      <div>
        <div className={cn(
          "font-light tracking-display leading-solid text-foreground",
          variant === 'full' ? "text-[2.5rem]" : "text-tile-large"
        )}>
          Cyclorama
        </div>
        <div className="mt-1.5 font-mono text-label uppercase tracking-label text-muted-foreground">
          30 M² · 6×5×4,7M · BRONCOLOR
        </div>
      </div>
      <IconArrowRight width="18" height="18" />
    </div>
  </button>
);

interface ServiceTileProps {
  label: string;
  lang: Lang;
  seed: number;
  palette?: string;
  sublabel?: string;
  onClick?: () => void;
}

const ServiceTile = ({ label, seed, palette = 'warm', sublabel, onClick }: ServiceTileProps) => (
  <button
    onClick={onClick}
    className="edo-focus-ring group relative flex h-full w-full cursor-pointer items-end border-0 p-3 text-left transition-transform duration-300 hover:scale-102"
    style={{ background: tile(seed, palette) }}
  >
    <div className="absolute inset-0 flex flex-col justify-between p-3 text-white mix-blend-difference">
      {sublabel ? <CellLabel className="text-white/90">{sublabel}</CellLabel> : <span />}
      <span className="text-cell font-medium tracking-copy-tight">{label}</span>
    </div>
  </button>
);

interface EcommerceKeywordsCellProps {
  lang: Lang;
  onOpenService?: (service: string) => void;
}

const EcommerceKeywordsCell = ({ lang, onOpenService }: EcommerceKeywordsCellProps) => (
  <div className="grid h-full grid-rows-3 gap-px bg-black">
    {[0, 2, 4].map((start, r) => (
      <div key={r} className="grid grid-cols-2 gap-px bg-black">
        {KW.slice(start, start + 2).map((kw, i) => (
          <ServiceTile
            key={kw.key}
            label={kw[lang]}
            lang={lang}
            seed={start + i + 1}
            palette={['editorial', 'mono', 'warm'][r]}
            onClick={() => onOpenService?.('ecommerce')}
          />
        ))}
      </div>
    ))}
  </div>
);

interface PostProdCellProps {
  lang: Lang;
  onOpen: () => void;
}

const PostProdCell = ({ lang, onOpen }: PostProdCellProps) => (
  <button
    onClick={onOpen}
    className="edo-focus-ring group relative flex h-full w-full cursor-pointer flex-col justify-between border-0 bg-edo-dark p-4 text-left text-white"
  >
    <div className="pointer-events-none absolute inset-0 opacity-35">
      <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="h-full w-full">
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={i} x1="0" x2="400" y1={i * 20} y2={i * 20} stroke="#fff" strokeWidth="0.4" />
        ))}
        <rect x="40" y="80" width="280" height="140" fill="none" stroke="var(--edo-orange)" strokeWidth="1" />
        <line x1="40" y1="150" x2="320" y2="150" stroke="var(--edo-orange)" strokeWidth="0.8" strokeDasharray="2 2" />
        <circle cx="180" cy="150" r="30" fill="none" stroke="#fff" strokeWidth="1" />
      </svg>
    </div>
    <CellLabel className="relative text-white/70">02 · Service</CellLabel>
    <div className="relative flex items-end justify-between gap-2">
      <div>
        <div className="text-tile-large font-light tracking-headline leading-none">Post-production</div>
        <div className="mt-2 font-mono text-label uppercase tracking-label text-white/55">
          {lang === 'fr' ? 'Retouche · colorimétrie · détourage' : 'Retouching · color · clipping path'}
        </div>
      </div>
      <IconArrowRight width="18" height="18" className="text-white" />
    </div>
  </button>
);

interface EtouchCellProps {
  lang: Lang;
}

const EtouchCell = ({ lang }: EtouchCellProps) => (
  <a
    href="https://etouch.e-do.studio"
    target="_blank"
    rel="noopener noreferrer"
    className="edo-focus-ring group flex h-full flex-col justify-between border-0 bg-white p-4 no-underline text-inherit transition-colors duration-150 hover:bg-muted"
  >
    <CellLabel>etouch</CellLabel>
    <div className="flex items-end justify-between">
      <div>
        <div className="text-tile-title font-light tracking-headline leading-none">{lang === 'fr' ? 'Espace client' : 'Client portal'}</div>
        <div className="mt-2 font-mono text-label uppercase tracking-label text-muted-foreground">
          {lang === 'fr' ? 'Livrables · validation · archive' : 'Deliverables · review · archive'}
        </div>
      </div>
      <IconArrowRight width="18" height="18" />
    </div>
  </a>
);

interface MachineListCellProps {
  lang: Lang;
  onSelect?: (machine: typeof MACHINES[number]) => void;
}

const MachineListCell = ({ lang, onSelect }: MachineListCellProps) => (
  <div className="flex h-full flex-col bg-white">
    <div className="border-b border-input px-4 py-3">
      <CellLabel>Machines · 05</CellLabel>
    </div>
    {MACHINES.map((m, i) => (
      <button
        key={m.slug}
        onClick={() => onSelect?.(m)}
        className="edo-focus-ring group flex flex-1 cursor-pointer items-center gap-3 border-0 border-b border-input bg-white px-4 py-2.5 text-left transition-colors duration-150 hover:bg-muted last:border-b-0"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-mono text-label text-edo-gray-500 tracking-label">{String(i + 1).padStart(2, '0')}</span>
          <div className="min-w-0">
            <div className="truncate text-detail font-medium tracking-copy-tight text-foreground">{m[lang].t}</div>
            <div className="truncate text-caption text-muted-foreground">{m[lang].sub}</div>
          </div>
        </div>
        <IconArrowRight className="flex-shrink-0 text-muted-foreground" width="14" height="14" />
      </button>
    ))}
  </div>
);

interface ContactCellProps {
  lang: Lang;
}

const ContactCell = ({ lang }: ContactCellProps) => (
  <div className="flex h-full flex-col bg-white">
    <div className="flex flex-1 flex-col justify-between p-4">
      <CellLabel>Contact</CellLabel>
      <div>
        <a href="tel:+33144041149" className="block py-1.5 text-caption text-muted-foreground no-underline">+33 1 44 04 11 49</a>
        <a href="mailto:contact@e-do.studio" className="block py-1.5 text-caption text-muted-foreground no-underline">contact@e-do.studio</a>
        <span className="block py-1.5 text-caption text-muted-foreground">69 bd Victor Hugo · Bât. 6.7<br />93400 Saint-Ouen</span>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-px border-t border-foreground bg-black">
      {[
        { label: lang === 'fr' ? 'Nous contacter' : 'Contact us', href: '/contact' },
        { label: lang === 'fr' ? 'Légal' : 'Legal', href: '/legal' },
      ].map((link, i) => (
        <a
          key={i}
          href={link.href}
          className="group bg-white px-3 py-3 text-left text-caption text-muted-foreground transition-colors duration-150 hover:bg-muted"
        >
          {link.label}
        </a>
      ))}
    </div>
  </div>
);

const chatWelcome: Record<string, string> = {
  fr: "Bonjour ! Je peux vous renseigner sur nos services, le cyclorama, la post-production ou un devis.",
  en: "Hello! I can help you with our services, the cyclorama, post-production or a quote.",
};
const chatResp: Record<string, Record<string, string>> = {
  fr: {
    prix: "Nos tarifs démarrent à 15 € / photo en packshot e-commerce. Demandez un devis pour un plan précis.",
    tarif: "Nos tarifs démarrent à 15 € / photo en packshot e-commerce.",
    devis: "Pour un devis, précisez volume de références, type de produit et délai.",
    cyclorama: "Cyclorama 30 m² avec éclairage Broncolor Para 222, disponible en production libre.",
    horaire: "Studio ouvert du lundi au vendredi, 10 h – 18 h. Samedi et dimanche sur demande.",
    adresse: "69 bd Victor Hugo, Bâtiment 6.7, 93400 Saint-Ouen — M° Garibaldi L13 ou Mairie de Saint-Ouen L14.",
    retouche: "Notre post-production couvre retouche, colorimétrie, détourage et CGI.",
    default: "Posez-moi une question sur nos services, tarifs ou le studio.",
  },
  en: {
    price: "Our rates start at €15 / photo for e-commerce packshots. Ask for a custom quote.",
    quote: "For a quote, please share your volume, product type and deadline.",
    cyclorama: "30 m² cyclorama with Broncolor Para 222 lighting — available as free production.",
    hours: "Studio open Monday to Friday, 10 am – 6 pm. Weekends on request.",
    address: "69 bd Victor Hugo, Building 6.7, 93400 Saint-Ouen — M° Garibaldi L13 or Mairie de Saint-Ouen L14.",
    retouch: "Our post-production covers retouching, color grading, clipping and CGI.",
    default: "Ask me about our services, rates or the studio.",
  },
};

const getResp = (input: string, lang: string): string => {
  const l = input.toLowerCase();
  const r = chatResp[lang] || chatResp.fr;
  for (const k of Object.keys(r)) { if (k !== 'default' && l.includes(k)) return r[k]; }
  return r.default;
};

interface ChatCellProps {
  lang: string;
}

const ChatCell = ({ lang }: ChatCellProps) => {
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [shown, setShown] = useState(0);
  const iRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const type = (text: string) => {
    clearInterval(iRef.current);
    setMsg(text);
    setShown(0);
    let i = 0;
    iRef.current = setInterval(() => {
      i++;
      setShown(i);
      if (i >= text.length) clearInterval(iRef.current);
    }, 22);
  };
  useEffect(() => {
    const t = setTimeout(() => type(chatWelcome[lang] || chatWelcome.fr), 300);
    return () => { clearTimeout(t); clearInterval(iRef.current); };
  }, [lang]);
  const submit = (e: FormEvent) => { e.preventDefault(); if (!input.trim()) return; type(getResp(input, lang)); setInput(''); };
  return (
    <div className="flex h-full flex-col justify-between bg-white p-4">
      <CellLabel>{lang === 'fr' ? 'Assistant E-Do' : 'E-Do assistant'}</CellLabel>
      <div className="flex flex-1 items-start py-2">
        <p className="m-0 text-detail leading-copy text-muted-foreground">
          {msg.slice(0, shown)}{shown < msg.length && <span className="animate-pulse">|</span>}
        </p>
      </div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={lang === 'fr' ? 'prix, devis, cyclorama…' : 'price, quote, cyclorama…'}
          className="flex-1 border-b border-foreground bg-transparent pb-1 text-detail text-foreground outline-none"
        />
        <button type="submit" aria-label="send" className="edo-focus-ring cursor-pointer border-0 bg-transparent text-muted-foreground">
          <IconArrowRight width="16" height="16" />
        </button>
      </form>
    </div>
  );
};

interface GalleryCellProps {
  columns?: number;
  rows?: number;
  onOpen?: (index: number | string) => void;
  seeds?: number[] | null;
  palette?: string;
  showViewAll?: boolean;
  lang?: string;
}

const GalleryCell = ({ columns = 3, rows = 1, onOpen, seeds = null, palette = 'editorial', showViewAll = false, lang = 'fr' }: GalleryCellProps) => {
  const total = columns * rows - (showViewAll ? 1 : 0);
  const actualSeeds = seeds || Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div
      className="grid h-full gap-px bg-black"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {actualSeeds.slice(0, total).map((s, i) => (
        <button
          key={i}
          onClick={() => onOpen?.(i)}
          className="edo-focus-ring group relative cursor-pointer overflow-hidden border-0 transition-transform duration-300 hover:scale-102"
          style={{ background: tile(s, palette) }}
        >
          <span className="absolute bottom-2 left-2 font-mono text-micro uppercase tracking-label text-white mix-blend-difference">
            {String(i + 1).padStart(2, '0')} · {BRANDS[i % BRANDS.length].split(' ')[0]}
          </span>
        </button>
      ))}
      {showViewAll && (
        <button
          onClick={() => onOpen?.('all')}
          className="edo-focus-ring group flex cursor-pointer items-center justify-center border-0 bg-white font-mono text-label uppercase tracking-label text-muted-foreground transition-colors duration-150 hover:bg-muted"
        >
          {lang === 'fr' ? 'Galerie →' : 'Gallery →'}
        </button>
      )}
    </div>
  );
};

interface CtaCellProps {
  label: string;
  sub: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const CtaCell = ({ label, sub, onClick, variant = 'primary', size = 'md' }: CtaCellProps) => (
  <button
    onClick={onClick}
    className={[
      'edo-focus-ring group flex h-full w-full cursor-pointer flex-col justify-between border-0 p-4 text-left transition-colors duration-150',
      variant === 'primary' ? 'bg-primary text-white hover:bg-foreground hover:text-white' : 'bg-white text-foreground hover:bg-muted',
    ].join(' ')}
  >
    <span className={['edo-cell-label', variant === 'primary' ? 'text-white/70' : ''].join(' ')}>{sub}</span>
    <div className="flex items-end justify-between gap-2">
      <span style={{ fontSize: size === 'lg' ? 26 : 18, fontWeight: variant === 'primary' ? 500 : 400, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {label}
      </span>
      <IconArrowRight className="transition-transform duration-150 group-hover:translate-x-1" width="20" height="20" />
    </div>
  </button>
);

interface MarqueeCellProps {
  items?: string[];
  speed?: number;
  size?: number;
}

const MarqueeCell = ({ items = BRANDS, speed = 40, size = 18 }: MarqueeCellProps) => (
  <div className="relative flex h-full items-center overflow-hidden bg-white">
    <div className="inline-flex gap-10 whitespace-nowrap pl-5" style={{ animation: `mq ${speed}s linear infinite` }}>
      {[...items, ...items, ...items].map((x, i) => (
        <span key={i} className="font-sans text-foreground" style={{ fontSize: size, fontWeight: 700, letterSpacing: '-0.01em' }}>{x}</span>
      ))}
    </div>
    <style>{`@keyframes mq { to { transform: translateX(-50%) } }`}</style>
  </div>
);

interface AboutCellProps {
  lang: string;
  size?: 'sm' | 'lg';
}

const AboutCell = ({ lang, size = 'sm' }: AboutCellProps) => (
  <div className="flex h-full flex-col justify-between bg-white p-4">
    <CellLabel>{lang === 'fr' ? 'À propos' : 'About'}</CellLabel>
    <p className={['m-0 text-wrap pretty font-normal leading-normal text-foreground', size === 'lg' ? 'text-cell' : 'text-caption'].join(' ')}>
      {lang === 'fr'
        ? "E-Do Studio est un espace hybride dédié à la production d'images haut de gamme pour les marques de mode et de luxe."
        : "E-Do Studio is a hybrid space dedicated to premium image production for fashion and luxury brands."}
    </p>
  </div>
);

interface BrandStackCellProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  onMenu: () => void;
  onLogo: () => void;
  onVideo?: () => void;
}

const BrandStackCell = ({ lang, setLang, onMenu, onLogo, onVideo }: BrandStackCellProps) => (
  <div className="grid h-full grid-rows-subgrid gap-px bg-black" style={{ gridRow: '1 / -1' }}>
    <div className="grid grid-cols-brand-stack gap-px bg-black">
      <button
        onClick={onMenu}
        aria-label="Menu"
        className="edo-focus-ring group flex items-center justify-center border-0 bg-white transition-colors duration-150 hover:bg-muted"
      >
        <IconMenu width="18" height="18" />
      </button>
      <button
        onClick={onLogo}
        className="edo-focus-ring group flex items-center justify-center border-0 bg-white p-2 transition-colors duration-150 hover:bg-muted"
      >
        <Wordmark size={32} />
      </button>
      <LangSwitch lang={lang} onToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')} />
    </div>
    <EtouchCell lang={lang} />
    <div
      className="group relative flex cursor-pointer items-center justify-center overflow-hidden bg-black"
      style={{ gridRow: '3 / span 2' }}
      onClick={onVideo}
    >
      <div className="relative flex w-full max-w-full items-center overflow-hidden bg-edo-dark" style={{ aspectRatio: '16 / 9' }}>
        <div className="absolute inset-0 bg-reel-gradient" />
        <div className="absolute left-2.5 top-2.5 font-mono text-label uppercase tracking-label text-edo-gray-500">Studio · Reel · 16:9</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white">
            <IconPlay width="18" height="18" className="text-white" />
          </div>
        </div>
      </div>
    </div>
    <button
      className="edo-focus-ring group flex cursor-pointer flex-col justify-between border-0 bg-white p-4 text-left transition-colors duration-150 hover:bg-muted"
    >
      <CellLabel>E-Do Studio</CellLabel>
      <div className="flex w-full items-center justify-between">
        <CellTitle className="text-detail">{lang === 'fr' ? 'Découverte' : 'Discovery'}</CellTitle>
        <IconArrowRight width="14" height="14" />
      </div>
    </button>
  </div>
);

export {
  KW, tile,
  NavigationCell, CycloramaCell, ServiceTile, EcommerceKeywordsCell,
  PostProdCell, EtouchCell, MachineListCell, ContactCell, ChatCell,
  GalleryCell, CtaCell, MarqueeCell, AboutCell, BrandStackCell
};
