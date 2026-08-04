export type Lang = 'fr' | 'en';

export type Bilingual<T = string> = { fr: T; en: T };

export interface NavItem {
  label: string;
  href: string;
}

export interface SocialLink {
  k: string;
  label: string;
  href: string;
}

export interface MachineInfo {
  slug: string;
  fr: { t: string; sub: string; label?: string };
  en: { t: string; sub: string; label?: string };
}

export interface DiscoveryPostSeo {
  title?: string;
  description?: string;
  imageUrl?: string;
  noIndex?: boolean;
}

export interface DiscoveryPost {
  id: number;
  slug: string;
  cat: string;
  tone: 'warm' | 'mono' | 'dark';
  tag: Bilingual;
  title: Bilingual;
  sub: Bilingual;
  body: Bilingual;
  date: Bilingual;
  read: string;
  author: string;
  coverUrl?: string;
  coverMime?: string;
  publishedAt?: string;
  featured?: boolean;
  kind?: string;
  seo?: Bilingual<DiscoveryPostSeo>;
}

export interface DiscoveryCategory {
  k: string;
  fr: string;
  en: string;
}

export interface PageProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  openMenu: () => void;
  goto: (screen: string) => void;
}

export interface ContactFormData {
  nom: string;
  email: string;
  telephone: string;
  societe: string;
  message: string;
  /** Honeypot: rendered hidden, only a bot fills it. */
  website?: string;
  /** Epoch ms stamped when the form mounts, to reject instant submissions. */
  formLoadedAt?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
