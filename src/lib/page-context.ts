import { createContext, useContext } from 'react';
import type { Lang } from '../types';

export interface PageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  openMenu: () => void;
  goto: (screen: string) => void;
}

export const PageContext = createContext<PageContextValue | null>(null);

export function usePageContext(): PageContextValue {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePageContext must be used inside LangLayout');
  return ctx;
}
