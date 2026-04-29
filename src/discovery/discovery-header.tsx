import React from 'react';
import type { Lang } from '../types';
import { PageHeader } from '../ui';

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
      { id: 'gallery', label: lang === 'fr' ? 'Galerie' : 'Gallery', onClick: () => goto('gallery'), className: 'hidden md:flex' },
      { id: 'plateaux', label: lang === 'fr' ? 'Plateaux' : 'Stages', onClick: () => goto('plateau-live'), className: 'hidden md:flex' },
      { id: 'contact', label: lang === 'fr' ? 'Nous contacter' : 'Contact us', onClick: () => goto('contact'), className: 'hidden lg:flex' },
    ]}
  />
);
