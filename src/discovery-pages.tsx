import { useMemo, useState } from 'react';
import { DiscoveryBentoGrid } from './discovery/discovery-bento-grid';
import { DiscoveryHeader } from './discovery/discovery-header';
import { DiscoveryShell } from './discovery/discovery-shell';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { buildBlogSchema, buildBreadcrumbSchema } from './lib/structured-data';
import { useDiscoveryCategories, useDiscoveryPosts } from './lib/use-strapi';
import { usePageContext } from './router';
import { SocialClientsBar } from './social-clients-bar';
import { MobileNavStrip } from './ui';
import type { StripGroup } from './ui';
import { common, discoveryPage } from './i18n/messages';

const DiscoveryV2 = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('discovery', lang);
  const { data: posts } = useDiscoveryPosts();
  const { data: cats } = useDiscoveryCategories();
  const [cat, setCat] = useState('all');

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

  const catOptions = useMemo(
    () => (cats ?? []).map((c) => ({ k: c.k, label: c[lang] })),
    [cats, lang],
  );

  const groups: StripGroup[] = useMemo(
    () => [
      {
        key: 'cat',
        label: discoveryPage.categories[lang],
        options: catOptions,
        value: cat,
        onSelect: setCat,
      },
    ],
    [catOptions, cat, lang],
  );

  const summary = useMemo(() => {
    if (cat === 'all') return common.all[lang];
    return (cats ?? []).find((c) => c.k === cat)?.[lang];
  }, [cat, cats, lang]);

  return (
    <DiscoveryShell>
      <DiscoveryHeader lang={lang} setLang={setLang} openMenu={openMenu} goto={goto} />
      <SocialClientsBar lang={lang} onBook={() => goto('book')} className="row-start-2" />
      <MobileNavStrip
        triggerLabel={discoveryPage.categories[lang]}
        groups={groups}
        hasActive={cat !== 'all'}
        activeCount={cat !== 'all' ? 1 : 0}
        summary={summary}
        ariaLabel={discoveryPage.filterCategoriesAria[lang]}
        lang={lang}
        onReset={() => setCat('all')}
      />
      <DiscoveryBentoGrid lang={lang} goto={goto} cat={cat} setCat={setCat} cats={cats ?? undefined} />
    </DiscoveryShell>
  );
};

const DiscoveryVariants = () => <DiscoveryV2 />;

export { DiscoveryV2, DiscoveryVariants };
