import { DiscoveryBentoGrid } from './discovery/discovery-bento-grid';
import { DiscoveryShell } from './discovery/discovery-shell';
import { usePageContext } from './lib/page-context';
import { useT } from './i18n/use-t';
import { SocialClientsBar } from './social-clients-bar';
import { PageHeader } from './ui/page-header';

const DiscoveryPage = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  return (
    <DiscoveryShell>
      <h1 className="sr-only">{t('discoveryPage.srTitle')} — E-Do Studio</h1>
      <PageHeader title={t('common.discovery')} className="row-start-1" />
      <SocialClientsBar className="row-start-2" />
      <DiscoveryBentoGrid lang={lang} goto={goto} />
    </DiscoveryShell>
  );
};

const DiscoveryVariants = () => <DiscoveryPage />;

export { DiscoveryPage, DiscoveryVariants };
