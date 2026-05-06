import React from 'react';
import type { Lang } from '../types';
import { PageHeader } from '../ui';
import { common } from '../i18n/messages';

interface DiscoveryHeaderProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  openMenu: () => void;
  goto: (screen: string) => void;
}

export const DiscoveryHeader: React.FC<DiscoveryHeaderProps> = ({ lang, setLang, openMenu, goto }) => (
  <PageHeader
    lang={lang}
    title="Discovery"
    className="row-start-1"
    onMenuClick={openMenu}
    onLogoClick={() => goto('home')}
    onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
    actions={[
      { id: 'gallery', label: common.gallery[lang], onClick: () => goto('gallery'), className: 'hidden md:flex' },
      { id: 'plateaux', label: common.stages[lang], onClick: () => goto('plateau-live'), className: 'hidden md:flex' },
      { id: 'contact', label: common.contactUs[lang], onClick: () => goto('contact'), className: 'hidden lg:flex' },
    ]}
  />
);
