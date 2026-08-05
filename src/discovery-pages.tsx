import { DiscoveryBentoGrid } from './discovery/discovery-bento-grid';
import { DiscoveryHeader } from './discovery/discovery-header';
import { DiscoveryShell } from './discovery/discovery-shell';
import { usePageContext } from './lib/page-context';
import { useT } from './i18n/use-t';
import { SocialClientsBar } from './social-clients-bar';

const DiscoveryPage = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  return (
    <DiscoveryShell>
      <h1 className="sr-only">{t('discoveryPage.srTitle')} — E-Do Studio</h1>
      <DiscoveryHeader />
      <SocialClientsBar className="row-start-2" />
      <DiscoveryBentoGrid lang={lang} goto={goto} />
    </DiscoveryShell>
  );
};

const DiscoveryVariants = () => <DiscoveryPage />;

export { DiscoveryPage, DiscoveryVariants };
