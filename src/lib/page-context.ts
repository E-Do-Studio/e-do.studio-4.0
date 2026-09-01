import { createContext, useContext } from 'react';
import type { Lang, MachineInfo, SocialLink } from '../types';
import type {
  ContactInfo,
  SiteBusinessInfo,
  SiteDefaults,
  StudioHours,
} from './strapi';

// Données Strapi partagées par plusieurs pages ou consommées par des composants
// profonds (cellules, pied de page, meta). Chargées une fois par le loader de la
// route racine, elles descendent par le contexte plutôt que par un hook et un
// fetch par composant — c'est ce qui permet au rendu côté Node de disposer du
// contenu, un `useEffect` ne s'y exécutant jamais.
//
// Chaque champ peut être null : le loader tolère une panne Strapi et laisse la
// page se dégrader (cellules vides) au lieu de faire tomber tout le site.
export interface SiteData {
  contact: ContactInfo | null;
  socialLinks: SocialLink[] | null;
  studioHours: StudioHours | null;
  businessInfo: SiteBusinessInfo | null;
  machines: MachineInfo[] | null;
  siteDefaults: SiteDefaults | null;
}

export interface PageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  openMenu: () => void;
  goto: (screen: string) => void;
  siteData: SiteData;
}

export const PageContext = createContext<PageContextValue | null>(null);

export function usePageContext(): PageContextValue {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePageContext must be used inside LangLayout');
  return ctx;
}
