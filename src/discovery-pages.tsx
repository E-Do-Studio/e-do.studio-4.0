import { DiscoveryBentoGrid } from './discovery/discovery-bento-grid';
import { DiscoveryFooter } from './discovery/discovery-footer';
import { DiscoveryHeader } from './discovery/discovery-header';
import { DiscoveryShell } from './discovery/discovery-shell';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { buildBlogSchema, buildBreadcrumbSchema } from './lib/structured-data';
import { useDiscoveryPosts } from './lib/use-strapi';
import { usePageContext } from './router';

const DiscoveryV2 = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('discovery', lang);
  const { data: posts } = useDiscoveryPosts();
  useStructuredData('discovery', [
    buildBlogSchema(posts ?? [], lang, '/discovery'),
    buildBreadcrumbSchema(
      [
        { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
        { name: 'Discovery', pathname: '/discovery' },
      ],
      lang,
    ),
  ]);
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
