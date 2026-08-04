import { DiscoveryBentoGrid } from './discovery/discovery-bento-grid';
import { DiscoveryHeader } from './discovery/discovery-header';
import { DiscoveryShell } from './discovery/discovery-shell';
import { usePageContext } from './lib/page-context';
import { SocialClientsBar } from './social-clients-bar';

const DiscoveryV2 = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  return (
    <DiscoveryShell>
      <h1 className="sr-only">
        {lang === 'fr'
          ? 'Discovery — Blog & actualités'
          : 'Discovery — Blog & news'}{' '}
        — E-Do Studio
      </h1>
      <DiscoveryHeader
        lang={lang}
        setLang={setLang}
        openMenu={openMenu}
        goto={goto}
      />
      <SocialClientsBar className="row-start-2" />
      <DiscoveryBentoGrid lang={lang} goto={goto} />
    </DiscoveryShell>
  );
};

const DiscoveryVariants = () => <DiscoveryV2 />;

export { DiscoveryV2, DiscoveryVariants };
