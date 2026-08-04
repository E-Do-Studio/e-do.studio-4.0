import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { HoverMarquee } from './ui/hover-marquee';
import { ArrowRight, ChevronsUpDown, X } from 'lucide-react';
import { PageHeader, buildMainNav } from './ui/page-header';
import type { Lang } from './types';
import { usePageContext } from './lib/page-context';
import { useT } from './i18n/use-t';
import { useLoaderData } from '@tanstack/react-router';
import type { LegalSectionContent, LegalDocumentKey } from './lib/strapi';
import {
  renderStrapiBlocks,
  type BlockNode,
  type InlineNode,
} from './lib/render-blocks';

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

// Detects a section authored as"Label : Value" lines (one per line in a
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

// Article sections are seeded as"Art. NN — Title" so the article number can
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
  'max-w-3xl text-sm leading-relaxed text-muted-foreground ' +
  '[&_p]:m-0 [&_p]:mb-3 last:[&_p]:mb-0 ' +
  '[&_a]:text-foreground [&_a]:underline ' +
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 ' +
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 ' +
  '[&_li]:my-1 ' +
  '[&_video]:my-4 [&_video]:block [&_video]:w-full [&_video]:aspect-video [&_video]:object-cover';

const StrapiSectionsRenderer = ({ sections, lang }: SectionRendererProps) => (
  <>
    {sections.map((s) => {
      const article = tryParseArticle(s.title[lang]);
      if (article) {
        return (
          <article
            key={s.slug}
            className="grid grid-cols-[70px_minmax(0,1fr)] gap-5 py-5 border-b border-border"
          >
            <span className="font-mono text-xs tracking-widest text-primary pt-1">
              Art. {article.n}
            </span>
            <div>
              <h4 className="m-0 mb-2 text-base font-medium tracking-tight text-foreground">
                {article.t}
              </h4>
              <div className={PROSE_CLASS}>
                {renderStrapiBlocks(s.body[lang])}
              </div>
            </div>
          </article>
        );
      }
      const rows = tryParseDefList(s.body[lang]);
      return (
        <section key={s.slug} className="py-6 border-b border-border">
          <h3 className="mb-3.5 text-xl font-medium tracking-tight text-foreground">
            {s.title[lang]}
          </h3>
          {rows ? (
            <div>
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[220px_minmax(0,1fr)] gap-5 py-2.5 border-b border-border last:border-b-0 text-sm items-baseline"
                >
                  <span className="font-mono text-xs tracking-wider uppercase text-muted-foreground">
                    {r.k}
                  </span>
                  <span className="text-foreground tracking-tight">{r.v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={PROSE_CLASS}>
              {renderStrapiBlocks(s.body[lang])}
            </div>
          )}
        </section>
      );
    })}
  </>
);

const LegalPage = () => {
  const t = useT();
  const { lang, setLang, openMenu, goto } = usePageContext();
  const { doc } = useSearch({ from: '/$lang/legal' });
  const sec = doc ?? 'mentions';
  const navigate = useNavigate();
  const setSec = (next: LegalDocumentKey) =>
    navigate({ to: '.', search: next === 'mentions' ? {} : { doc: next } });
  const [navSheetOpen, setNavSheetOpen] = useState(false);
  const { documents: legalDocs, sections: legalSectionsByDoc } = useLoaderData({
    from: '/$lang/legal',
  });

  const sections = legalDocs ?? [];
  const active = sections.find((s) => s.k === sec) ?? sections[0];
  const activeIndex = Math.max(
    0,
    sections.findIndex((s) => s.k === sec),
  );
  const currentNumber = String(activeIndex + 1).padStart(2, '0');
  const navigateToSection = (next: LegalDocumentKey) => {
    setNavSheetOpen(false);
    if (next !== sec) setSec(next);
  };
  const allSections =
    legalSectionsByDoc?.[sec]?.filter((s) => s.body[lang]?.length > 0) ?? [];
  const introSection = allSections.find((s) => s.slug === `${sec}-intro`);
  const strapiBody = allSections.filter((s) => s !== introSection);
  const intro = introSection ? blocksToPlainText(introSection.body[lang]) : '';
  const hasStrapiBody = strapiBody.length > 0;
  const articleCount = strapiBody.filter((s) =>
    tryParseArticle(s.title[lang]),
  ).length;

  return (
    <main className="animate-in fade-in duration-300 grid w-full gap-px bg-border md:grid-cols-[240px_repeat(3,minmax(0,1fr))] md:grid-rows-[54px_minmax(0,1fr)] md:h-full md:overflow-hidden">
      {/* Unified header — compact right-aligned actions on all breakpoints */}
      <PageHeader
        lang={lang}
        title={t('common.legal')}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={buildMainNav({ lang, goto })}
      />

      {/* Mobile navigation: sticky single-row trigger showing the current legal
 section. Tap opens a Drawer listing all sections; selecting a row
 in the sheet updates the section and closes the sheet immediately. */}
      {active && (
        <Button
          type="button"
          onClick={() => setNavSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={navSheetOpen}
          aria-controls="legal-nav-sheet"
          className="sticky top-14 z-30 md:hidden flex items-center gap-4 min-h-14 w-full px-4 py-3 bg-background border-b border-border text-left cursor-pointer"
        >
          <span className="font-mono text-xs tracking-widest text-muted-foreground">
            {currentNumber}
          </span>
          <HoverMarquee className="text-base tracking-tight font-medium text-foreground">
            {active[lang]}
          </HoverMarquee>
          <ChevronsUpDown
            width="16"
            height="16"
            className="ml-auto shrink-0 text-foreground"
          />
        </Button>
      )}

      <Drawer open={navSheetOpen} onOpenChange={setNavSheetOpen}>
        <DrawerContent id="legal-nav-sheet">
          <DrawerHeader>
            <DrawerTitle>{t('legalPage.contents')}</DrawerTitle>
            <DrawerClose
              aria-label={t('common.close')}
              render={<Button variant="ghost" size="icon" />}
            >
              <X />
            </DrawerClose>
          </DrawerHeader>
          <ul className="m-0 flex list-none flex-col overflow-y-auto p-0">
            {sections.map((s, i) => {
              const isActive = s.k === sec;
              const num = String(i + 1).padStart(2, '0');
              return (
                <li key={s.k}>
                  <Button
                    type="button"
                    onClick={() => navigateToSection(s.k)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'w-full flex items-center gap-4 min-h-14 px-4 py-3',
                      'border-b border-border text-left',
                      'cursor-pointer transition-colors duration-150 ease-out',
                      isActive
                        ? 'bg-foreground text-background'
                        : 'bg-background text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'font-mono text-xs tracking-widest',
                        isActive
                          ? 'text-background/70'
                          : 'text-muted-foreground',
                      )}
                    >
                      {num}
                    </span>
                    <HoverMarquee className="text-base tracking-tight font-medium">
                      {s[lang]}
                    </HoverMarquee>
                    <ArrowRight
                      width="16"
                      height="16"
                      className="ml-auto shrink-0"
                    />
                  </Button>
                </li>
              );
            })}
          </ul>
        </DrawerContent>
      </Drawer>

      {/* Desktop sidebar — vertical list, hidden on mobile (replaced by trigger + sheet above). */}
      <div className="hidden bg-background overflow-auto md:col-start-1 md:row-start-2 md:flex md:flex-col">
        <div className="px-4 pt-4 pb-2.5 shrink-0">
          <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">
            {t('legalPage.contents')}
          </span>
        </div>
        {sections.map((s, i) => {
          const isActive = sec === s.k;
          return (
            <Button
              key={s.k}
              onClick={() => setSec(s.k)}
              variant="cell"
              size="cell"
              aria-pressed={isActive}
              className={cn(
                'flex-none gap-0.5 border-l-2 px-4 py-3',
                isActive
                  ? 'border-l-primary bg-muted'
                  : 'border-l-transparent bg-transparent',
              )}
            >
              <span className="font-mono text-xs tracking-widest text-muted-foreground">
                0{i + 1}
              </span>
              <span
                className={`text-sm tracking-tight whitespace-nowrap ${isActive ? 'font-medium text-foreground' : 'font-normal text-muted-foreground'}`}
              >
                {s[lang]}
              </span>
            </Button>
          );
        })}

        <div className="px-4 py-6 border-t border-border mt-3">
          <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground mb-2.5 block">
            {t('legalPage.gotQuestion')}
          </span>
          <p className="text-xs text-muted-foreground leading-normal mb-3">
            {t('legalPage.writeDirectly')}
          </p>
          <a
            href="mailto:contact@e-do.studio"
            className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 inline-flex items-center gap-2 text-xs text-foreground no-underline border-b border-border pb-0.5"
          >
            contact@e-do.studio <ArrowRight width="10" height="10" />
          </a>
        </div>
        <div className="flex-1" />
      </div>

      {/* Main content */}
      <div className="bg-muted overflow-auto md:col-start-2 md:col-span-3 md:row-start-2">
        <div className="bg-background pt-9 px-5 pb-7 border-b border-border grid grid-cols-[minmax(0,1fr)_auto] gap-6 items-end md:px-10">
          <div>
            <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
              {String(sections.findIndex((s) => s.k === sec) + 1).padStart(
                2,
                '0',
              )}{' '}
              · {t('common.legal')}
            </span>
            <h1 className="mt-2.5 mb-3 text-3xl font-light tracking-tighter leading-none text-foreground">
              {active ? active[lang] : ''}
              <span className="text-primary">.</span>
            </h1>
            {intro && (
              <p className="m-0 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {intro}
              </p>
            )}
          </div>
          <div className="text-right flex flex-col gap-1">
            <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
              {t('legalPage.lastUpdated')}
            </span>
            <span className="font-mono text-sm tracking-wide text-foreground">
              {active?.updated ?? ''}
            </span>
          </div>
        </div>

        <div className="pt-2 px-5 pb-10 max-w-5xl md:px-10">
          {hasStrapiBody && articleCount > 0 && (
            <div className="pt-4 pb-2 border-b border-border flex justify-between font-mono text-xs tracking-widest uppercase text-muted-foreground">
              <span>{articleCount} articles</span>
              <span>Version {active?.updated ?? ''}</span>
            </div>
          )}

          {hasStrapiBody && (
            <StrapiSectionsRenderer sections={strapiBody} lang={lang} />
          )}

          {!hasStrapiBody && legalDocs && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t('legalPage.contentUpdating')}
            </p>
          )}

          {sec === 'cookies' && (
            <div className="mt-9 dark bg-background text-foreground py-7 px-8 grid grid-cols-[minmax(0,1fr)_auto] gap-6 items-center">
              <div>
                <span className="font-mono text-xs tracking-widest uppercase text-primary">
                  © GRW · E-Do Studio
                </span>
                <p className="mt-1.5 text-sm leading-relaxed opacity-75 max-w-xl">
                  {t('legalPage.allRightsReserved')}
                </p>
              </div>
              <Button variant="default" size="lg" onClick={() => goto('home')}>
                {t('legalPage.backToHome')}{' '}
                <ArrowRight width="14" height="14" />
              </Button>
            </div>
          )}

          <div className="mt-8 flex justify-end items-center gap-5 font-mono text-xs tracking-wider uppercase text-muted-foreground">
            <Button
              onClick={() => window.print()}
              variant="link"
              className="h-auto p-0 normal-case tracking-[inherit] text-foreground no-underline"
            >
              ↓ {t('legalPage.print')}
            </Button>
            <a
              href="mailto:contact@e-do.studio"
              className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 text-foreground no-underline"
            >
              contact@e-do.studio
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

export { LegalPage };
