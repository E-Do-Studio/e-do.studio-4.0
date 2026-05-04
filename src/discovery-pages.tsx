import { DiscoveryBentoGrid } from './discovery/discovery-bento-grid';
import { DiscoveryFooter } from './discovery/discovery-footer';
import { DiscoveryHeader } from './discovery/discovery-header';
import { DiscoveryShell } from './discovery/discovery-shell';
import { useDocumentMeta } from './lib/use-document-meta';
import { usePageContext } from './router';
import { useDocumentMeta } from './lib/use-document-meta';

const DiscoveryV2 = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('discovery', lang);
  return (
    <DiscoveryShell>
      <DiscoveryHeader lang={lang} setLang={setLang} openMenu={openMenu} goto={goto} />
      <DiscoveryBentoGrid lang={lang} goto={goto} />
      <DiscoveryFooter />
    </DiscoveryShell>
  );
};

const DiscoveryVariants = () => <DiscoveryV2 />;

export { DiscoveryV2, DiscoveryVariants };
