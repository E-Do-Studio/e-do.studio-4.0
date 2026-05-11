import { useState } from 'react';
import { Button, CellLabel, IconArrowRight, PageHeader, Wordmark } from './ui';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { buildWebPageSchema, buildBreadcrumbSchema } from './lib/structured-data';
import type { Lang } from './types';
import { usePageContext } from './router';
import { common, legalPage } from './i18n/messages';
import { useLegalDocuments, useLegalSections } from './lib/use-strapi';
import type { LegalSectionContent, LegalDocumentKey } from './lib/strapi';
import { renderStrapiBlocks } from './lib/render-blocks';

interface StrapiSectionsRendererProps {
  sections: LegalSectionContent[];
  lang: Lang;
}

const StrapiSectionsRenderer = ({ sections, lang }: StrapiSectionsRendererProps) => (
  <>
    {sections.map((s) => (
      <section key={s.slug} className="py-6 border-b border-border">
        <h3 className="mb-3.5 text-tile-title font-medium tracking-headline text-foreground">{s.title[lang]}</h3>
        <div className="prose prose-sm max-w-3xl text-detail leading-relaxed text-muted-foreground">
          {renderStrapiBlocks(s.body[lang])}
        </div>
      </section>
    ))}
  </>
);

const LegalPage = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('legal', lang);
  useStructuredData('legal', [
    buildWebPageSchema({
      lang,
      pathname: '/legal',
      name: lang === 'fr' ? 'Mentions légales — E-Do Studio' : 'Legal — E-Do Studio',
      description:
        lang === 'fr'
          ? 'Mentions légales, politique de confidentialité et conditions générales d\'utilisation du site E-Do Studio.'
          : 'Legal notice, privacy policy and terms of use for the E-Do Studio website.',
    }),
    buildBreadcrumbSchema(
      [
        { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
        { name: common.legal[lang], pathname: '/legal' },
      ],
      lang,
    ),
  ]);
  const [sec, setSec] = useState<LegalDocumentKey>('mentions');
  const { data: legalDocs } = useLegalDocuments();
  const { data: legalSectionsByDoc } = useLegalSections();

  const sections = legalDocs ?? [];
  const active = sections.find((s) => s.k === sec) ?? sections[0];
  const strapiBody = legalSectionsByDoc?.[sec]?.filter((s) => s.body[lang]?.length > 0) ?? [];
  const hasStrapiBody = strapiBody.length > 0;

  return (
    <div className="edo-page-enter grid w-full gap-px bg-hairline md:grid-cols-contact-shell md:grid-rows-app md:h-full md:overflow-hidden">

      {/* Mobile header */}
      <PageHeader
        lang={lang}
        title={common.legal[lang]}
        className="col-span-full h-14 md:hidden"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={[
          { id: 'contact', label: common.contactUs[lang], onClick: () => goto('contact') },
        ]}
      />

      {/* Desktop col 1 – logo */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-1 md:row-start-1">
        <button onClick={() => goto('home')} aria-label="E-Do Studio home" className="edo-focus-ring flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-background p-2 transition-colors hover:bg-muted">
          <Wordmark size={32} />
        </button>
      </div>

      {/* Desktop col 2 – title */}
      <div className="hidden md:flex h-full min-w-0 items-center bg-background px-6 md:col-start-2 md:row-start-1">
        <CellLabel className="shrink-0 text-primary">{common.legal[lang]}</CellLabel>
      </div>

      {/* Desktop col 3 – contact + lang toggle */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-3 md:row-start-1">
        <button onClick={() => goto('contact')} className="edo-focus-ring flex h-full flex-1 cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted">
          <span className="whitespace-nowrap">{common.contactUs[lang]}</span>
          <IconArrowRight width={12} height={12} />
        </button>
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background p-0 transition-colors hover:bg-muted">
          <span className="font-mono text-label tracking-meta text-foreground">{common.langToggleLabel[lang]}</span>
        </button>
      </div>

      {/* Sidebar: horizontal tabs on mobile, vertical list on desktop */}
      <div className="bg-white overflow-auto flex flex-row md:col-start-1 md:row-start-2 md:flex-col">
        <div className="px-4 pt-4 pb-2.5 shrink-0">
          <span className="edo-cell-label">{legalPage.contents[lang]}</span>
        </div>
        {sections.map((s, i) => {
          const isActive = sec === s.k;
          return (
            <button key={s.k} onClick={() => setSec(s.k)} className={`edo-focus-ring flex-none py-3 px-4 border-0 cursor-pointer text-left flex flex-col gap-0.5 font-inherit transition-all duration-150 ${isActive ? 'bg-muted border-b-2 border-b-primary md:border-b-0 md:border-l-2 md:border-l-primary' : 'bg-transparent border-b-2 border-b-transparent md:border-b-0 md:border-l-2 md:border-l-transparent hover:bg-muted'}`}>
              <span className="font-mono text-micro tracking-label text-muted-foreground">0{i + 1}</span>
              <span className={`text-detail tracking-copy-tight whitespace-nowrap ${isActive ? 'font-medium text-foreground' : 'font-normal text-muted-foreground'}`}>
                {s[lang]}
              </span>
            </button>
          );
        })}

        <div className="px-4 py-cell-lg border-t border-border mt-3 hidden md:block">
          <span className="edo-cell-label mb-2.5 block">{legalPage.gotQuestion[lang]}</span>
          <p className="text-caption text-muted-foreground leading-normal mb-3">
            {legalPage.writeDirectly[lang]}
          </p>
          <a href="mailto:contact@e-do.studio" className="edo-focus-ring inline-flex items-center gap-2 text-caption text-foreground no-underline border-b border-foreground pb-0.5">contact@e-do.studio <IconArrowRight width="10" height="10" /></a>
        </div>
        <div className="flex-1" />
      </div>

      {/* Main content */}
      <div className="bg-muted overflow-auto md:col-start-2 md:col-span-2 md:row-start-2">

        <div className="bg-white pt-9 px-5 pb-7 border-b border-border grid grid-cols-fluid-auto gap-6 items-end md:px-10">
          <div>
            <span className="edo-cell-label text-primary">
              {String(sections.findIndex((s) => s.k === sec) + 1).padStart(2, '0')} · {common.legal[lang]}
            </span>
            <h1 className="mt-2.5 mb-3 text-page-title font-light tracking-display leading-none text-foreground">
              {active ? active[lang] : ''}<span className="text-primary">.</span>
            </h1>
          </div>
          <div className="text-right flex flex-col gap-1">
            <span className="font-mono text-label tracking-meta uppercase text-muted-foreground">
              {legalPage.lastUpdated[lang]}
            </span>
            <span className="font-mono text-detail tracking-caption text-foreground">{active?.updated ?? ''}</span>
          </div>
        </div>

        <div className="pt-2 px-5 pb-10 max-w-5xl md:px-10">

          {hasStrapiBody && (
            <StrapiSectionsRenderer sections={strapiBody} lang={lang} />
          )}

          {!hasStrapiBody && legalDocs && (
            <p className="py-12 text-center text-detail text-muted-foreground">
              {lang === 'fr' ? 'Contenu en cours de mise à jour.' : 'Content being updated.'}
            </p>
          )}

          {sec === 'cookies' && (
            <div className="mt-9 bg-foreground text-white py-7 px-8 grid grid-cols-fluid-auto gap-6 items-center">
              <div>
                <span className="font-mono text-label tracking-label uppercase text-primary">© GRW · E-Do Studio</span>
                <p className="mt-1.5 text-detail leading-copy opacity-75 max-w-xl">
                  {legalPage.allRightsReserved[lang]}
                </p>
              </div>
              <Button variant="default" size="lg" onClick={() => goto('home')}>{legalPage.backToHome[lang]} <IconArrowRight width="14" height="14" /></Button>
            </div>
          )}

          <div className="mt-8 flex justify-between items-center gap-5 font-mono text-label tracking-code uppercase text-muted-foreground">
            <span>{legalPage.viewPrintArchive[lang]}</span>
            <div className="flex gap-5">
              <button onClick={() => window.print()} className="edo-focus-ring bg-transparent border-0 cursor-pointer text-foreground font-inherit tracking-inherit text-transform-inherit">
                ↓ {legalPage.print[lang]}
              </button>
              <a href="mailto:contact@e-do.studio" className="edo-focus-ring text-foreground no-underline">
                contact@e-do.studio
              </a>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export { LegalPage };
