import type { Lang } from '../types';
import { PageHeader } from '../ui/page-header';
import { useT } from '../i18n/use-t';

interface DiscoveryHeaderProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  openMenu: () => void;
  goto: (screen: string) => void;
}

export const DiscoveryHeader = ({
  lang,
  setLang,
  openMenu,
  goto,
}: DiscoveryHeaderProps) => {
  const t = useT();
  return (
    <PageHeader
      lang={lang}
      title="Discovery"
      className="row-start-1"
      subgrid={false}
      onMenuClick={openMenu}
      onLogoClick={() => goto('home')}
      onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      actions={[
        {
          id: 'book',
          label: t('common.book'),
          onClick: () => goto('book'),
          variant: 'primary',
          className: 'md:hidden',
        },
        {
          id: 'gallery',
          label: t('common.gallery'),
          onClick: () => goto('gallery'),
          className: 'hidden md:flex',
        },
        {
          id: 'plateaux',
          label: t('common.stages'),
          onClick: () => goto('plateau-live'),
          className: 'hidden md:flex',
        },
        {
          id: 'contact',
          label: t('common.contactUs'),
          onClick: () => goto('contact'),
          className: 'hidden lg:flex',
        },
      ]}
    />
  );
};
