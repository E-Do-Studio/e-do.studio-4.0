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

export interface DiscoveryPost {
  id: number;
  cat: string;
  tone: 'warm' | 'mono' | 'dark';
  tag: Bilingual;
  title: Bilingual;
  sub: Bilingual;
  date: Bilingual;
  read: string;
  author: string;
  featured?: boolean;
  kind?: string;
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
  sujet: string;
  message: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
