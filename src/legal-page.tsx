import { useState } from 'react';
import { BottomSheet, Button, IconArrowRight, IconSelector, PageHeader, buildMainNav, cn } from './ui';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { buildWebPageSchema, buildBreadcrumbSchema } from './lib/structured-data';
import type { Lang } from './types';
import { usePageContext } from './router';
import { common, legalPage } from './i18n/messages';
import { useLegalDocuments, useLegalSections } from './lib/use-strapi';
import type { LegalSectionContent, LegalDocumentKey } from './lib/strapi';
import { renderStrapiBlocks, type BlockNode, type InlineNode } from './lib/render-blocks';

function inlineText(children: InlineNode[]): string {
  return children
    .map((c) => (c.type === 'text' ? c.text : inlineText(c.children)))
    .join('');
}

function blockToPlainText(block: BlockNode): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
    case 'code':
      return inlineText(block.children);
    case 'list':
      return block.children.map((li) => inlineText(li.children)).join('\n');
    default:
      return '';
  }
}

function blocksToPlainText(blocks: BlockNode[]): string {
  return blocks.map(blockToPlainText).join('\n\n').trim();
}

interface DefRow {
  k: string;
  v: string;
}

// Detects a section authored as "Label : Value" lines (one per line in a
// single paragraph, or one per paragraph). Returns null when the content does
// not match the definition-list shape — the section then renders as prose.
function tryParseDefList(blocks: BlockNode[]): DefRow[] | null {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.type !== 'paragraph') return null;
    for (const part of inlineText(b.children).split(/\n+/)) {
      const trimmed = part.trim();
      if (trimmed) lines.push(trimmed);
    }
  }
  if (lines.length < 2) return null;
  const rows: DefRow[] = [];
  for (const line of lines) {
    const m = line.match(/^([^:—–]{1,40}?)\s*:\s*(.+?)\.?$/);
    if (!m) return null;
    rows.push({ k: m[1].trim(), v: m[2].trim() });
  }
  return rows;
}

// Article sections are seeded as "Art. NN — Title" so the article number can
// be lifted out into a dedicated column matching the previous composition.
function tryParseArticle(title: string): { n: string; t: string } | null {
  const m = title.match(/^Art\.\s*(\d+)\s*[—–-]\s*(.+)$/);
  return m ? { n: m[1], t: m[2].trim() } : null;
}

interface SectionRendererProps {
  sections: LegalSectionContent[];
  lang: Lang;
}

const PROSE_CLASS =
  'max-w-3xl text-detail leading-relaxed text-muted-foreground ' +
  '[&_p]:m-0 [&_p]:mb-3 last:[&_p]:mb-0 ' +
  '[&_a]:text-foreground [&_a]:underline ' +
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 ' +
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 ' +
  '[&_li]:my-1';

const StrapiSectionsRenderer = ({ sections, lang }: SectionRendererProps) => (
  <>
    {sections.map((s) => {
      const article = tryParseArticle(s.title[lang]);
      if (article) {
        return (
          <article
            key={s.slug}
            className="grid grid-cols-legal-article gap-5 py-5 border-b border-border"
          >
            <span className="font-mono text-caption tracking-label text-primary pt-1">
              Art. {article.n}
            </span>
            <div>
              <h4 className="m-0 mb-2 text-cell font-medium tracking-copy-tight text-foreground">
                {article.t}
              </h4>
              <div className={PROSE_CLASS}>{renderStrapiBlocks(s.body[lang])}</div>
            </div>
          </article>
        );
      }
      const rows = tryParseDefList(s.body[lang]);
      return (
        <section key={s.slug} className="py-6 border-b border-border">
          <h3 className="mb-3.5 text-tile-title font-medium tracking-headline text-foreground">
            {s.title[lang]}
          </h3>
          {rows ? (
            <div>
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-legal-row gap-5 py-2.5 border-b border-border last:border-b-0 text-detail items-baseline"
                >
                  <span className="font-mono text-label tracking-ui uppercase text-muted-foreground">
                    {r.k}
                  </span>
                  <span className="text-foreground tracking-copy-tight">{r.v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={PROSE_CLASS}>{renderStrapiBlocks(s.body[lang])}</div>
          )}
        </section>
      );
    })}
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
  const [navSheetOpen, setNavSheetOpen] = useState(false);
  const { data: legalDocs } = useLegalDocuments();
  const { data: legalSectionsByDoc } = useLegalSections();

  const sections = legalDocs ?? [];
  const active = sections.find((s) => s.k === sec) ?? sections[0];
  const activeIndex = Math.max(0, sections.findIndex((s) => s.k === sec));
  const currentNumber = String(activeIndex + 1).padStart(2, '0');
  const navigateToSection = (next: LegalDocumentKey) => {
    setNavSheetOpen(false);
    if (next !== sec) setSec(next);
  };
  const allSections = legalSectionsByDoc?.[sec]?.filter((s) => s.body[lang]?.length > 0) ?? [];
  const introSection = allSections.find((s) => s.slug === `${sec}-intro`);
  const strapiBody = allSections.filter((s) => s !== introSection);
  const intro = introSection ? blocksToPlainText(introSection.body[lang]) : '';
  const hasStrapiBody = strapiBody.length > 0;
  const articleCount = strapiBody.filter((s) => tryParseArticle(s.title[lang])).length;

  return (
    <div className="edo-page-enter grid w-full edo-hairline md:grid-cols-contact-shell md:grid-rows-app md:h-full md:overflow-hidden">

      {/* Unified header — compact right-aligned actions on all breakpoints */}
      <PageHeader
        lang={lang}
        title={common.legal[lang]}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={buildMainNav({ lang, goto })}
      />

      {/* Mobile navigation: sticky single-row trigger showing the current legal
          section. Tap opens a BottomSheet listing all sections; selecting a row
          in the sheet updates the section and closes the sheet immediately. */}
      {active && (
        <button
          type="button"
          onClick={() => setNavSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={navSheetOpen}
          aria-controls="legal-nav-sheet"
          className="sticky top-14 z-30 md:hidden flex items-center gap-4 min-h-14 w-full px-4 py-3 bg-white border-b border-border text-left edo-focus-ring cursor-pointer"
        >
          <span className="font-mono text-label tracking-label text-muted-foreground">
            {currentNumber}
          </span>
          <span className="text-cell tracking-copy-tight font-medium text-foreground truncate">
            {active[lang]}
          </span>
          <IconSelector width="16" height="16" className="ml-auto shrink-0 text-foreground" />
        </button>
      )}

      <BottomSheet
        id="legal-nav-sheet"
        open={navSheetOpen}
        onClose={() => setNavSheetOpen(false)}
        title={legalPage.contents[lang]}
        ariaLabel={legalPage.contents[lang]}
        closeLabel={common.close[lang]}
      >
        <ul className="list-none m-0 p-0 flex flex-col">
          {sections.map((s, i) => {
            const isActive = s.k === sec;
            const num = String(i + 1).padStart(2, '0');
            return (
              <li key={s.k}>
                <button
                  type="button"
                  onClick={() => navigateToSection(s.k)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center gap-4 min-h-14 px-4 py-3',
                    'border-b border-border text-left',
                    'edo-focus-ring cursor-pointer transition-colors duration-150 ease-edo-out',
                    isActive ? 'bg-foreground text-background' : 'bg-white text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-label tracking-label',
                      isActive ? 'text-background/70' : 'text-muted-foreground',
                    )}
                  >
                    {num}
                  </span>
                  <span className="text-cell tracking-copy-tight font-medium truncate">
                    {s[lang]}
                  </span>
                  <IconArrowRight width="16" height="16" className="ml-auto shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      {/* Desktop sidebar — vertical list, hidden on mobile (replaced by trigger + sheet above). */}
      <div className="hidden bg-white overflow-auto md:col-start-1 md:row-start-2 md:flex md:flex-col">
        <div className="px-4 pt-4 pb-2.5 shrink-0">
          <span className="edo-cell-label">{legalPage.contents[lang]}</span>
        </div>
        {sections.map((s, i) => {
          const isActive = sec === s.k;
          return (
            <button key={s.k} onClick={() => setSec(s.k)} className={`edo-focus-ring flex-none py-3 px-4 border-0 cursor-pointer text-left flex flex-col gap-0.5 font-inherit transition-all duration-150 ${isActive ? 'bg-muted border-l-2 border-l-primary' : 'bg-transparent border-l-2 border-l-transparent hover:bg-muted'}`}>
              <span className="font-mono text-micro tracking-label text-muted-foreground">0{i + 1}</span>
              <span className={`text-detail tracking-copy-tight whitespace-nowrap ${isActive ? 'font-medium text-foreground' : 'font-normal text-muted-foreground'}`}>
                {s[lang]}
              </span>
            </button>
          );
        })}

        <div className="px-4 py-cell-lg border-t border-border mt-3">
          <span className="edo-cell-label mb-2.5 block">{legalPage.gotQuestion[lang]}</span>
          <p className="text-caption text-muted-foreground leading-normal mb-3">
            {legalPage.writeDirectly[lang]}
          </p>
          <a href="mailto:contact@e-do.studio" className="edo-focus-ring inline-flex items-center gap-2 text-caption text-foreground no-underline border-b border-hairline pb-0.5">contact@e-do.studio <IconArrowRight width="10" height="10" /></a>
        </div>
        <div className="flex-1" />
      </div>

      {/* Main content */}
      <div className="bg-muted overflow-auto md:col-start-2 md:col-span-3 md:row-start-2">

        <div className="bg-white pt-9 px-5 pb-7 border-b border-border grid grid-cols-fluid-auto gap-6 items-end md:px-10">
          <div>
            <span className="edo-cell-label text-primary">
              {String(sections.findIndex((s) => s.k === sec) + 1).padStart(2, '0')} · {common.legal[lang]}
            </span>
            <h1 className="mt-2.5 mb-3 text-page-title font-light tracking-display leading-none text-foreground">
              {active ? active[lang] : ''}<span className="text-primary">.</span>
            </h1>
            {intro && (
              <p className="m-0 text-detail text-muted-foreground leading-relaxed max-w-2xl">
                {intro}
              </p>
            )}
          </div>
          <div className="text-right flex flex-col gap-1">
            <span className="font-mono text-label tracking-meta uppercase text-muted-foreground">
              {legalPage.lastUpdated[lang]}
            </span>
            <span className="font-mono text-detail tracking-caption text-foreground">{active?.updated ?? ''}</span>
          </div>
        </div>

        <div className="pt-2 px-5 pb-10 max-w-5xl md:px-10">

          {hasStrapiBody && articleCount > 0 && (
            <div className="pt-4 pb-2 border-b border-border flex justify-between font-mono text-label tracking-meta uppercase text-muted-foreground">
              <span>{articleCount} articles</span>
              <span>Version {active?.updated ?? ''}</span>
            </div>
          )}

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
