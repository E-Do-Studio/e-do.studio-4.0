import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PageShell } from './ui/page-shell';
import { MAIN_ID } from './ui/skip-link';
import { Rail, RailCell } from './ui/rail-cell';
import { SelectionDrawer } from './ui/selection-drawer';
import { ordinal } from './lib/format';
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
import { MonoLabel } from './ui/mono-label';
import { KeyValueList, KeyValueRow } from './ui/key-value-row';
import { StepHeading } from '@/ui/step-heading';
import { SectionIntro } from './ui/section-intro';
import type { ReactNode } from 'react';

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

// Le corps d'un article juridique : du HTML produit par Strapi, dont on ne
// maîtrise que les sélecteurs enfants. C'est un composant, pas une chaîne de
// classes — la mesure de 3xl et le rythme des paragraphes appartiennent au
// bloc, et personne d'autre ne doit avoir à les recopier pour l'obtenir.
const Prose = ({ children }: { children: ReactNode }) => (
  <div className="max-w-3xl text-sm leading-relaxed text-muted-foreground [&_p]:m-0 [&_p]:mb-3 last:[&_p]:mb-0 [&_a]:text-foreground [&_a]:underline [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_video]:my-4 [&_video]:block [&_video]:aspect-video [&_video]:w-full [&_video]:object-cover">
    {children}
  </div>
);

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
            <MonoLabel tone="primary" className="pt-1">
              Art. {article.n}
            </MonoLabel>
            <div>
              {/* Le corps juste dessous est `text-sm` ET `text-muted-foreground` :
                  deux pixels d'écart, mais aussi un écart de couleur et de
                  graisse. Le gras n'est plus nécessaire pour les séparer — c'est
                  le même cran que l'article, dont le corps est passé en 300 et
                  les titres en 400. */}
              <h4 className="m-0 mb-2 text-base font-normal tracking-tight text-foreground">
                {article.t}
              </h4>
              <Prose>{renderStrapiBlocks(s.body[lang])}</Prose>
            </div>
          </article>
        );
      }
      const rows = tryParseDefList(s.body[lang]);
      return (
        <section key={s.slug} className="py-6 border-b border-border">
          {/* Même cran que le `h4` ci-dessus. Ce titre coiffe soit un corps
              `text-sm` atténué, soit une liste de définitions : quatre pixels
              d'écart et une couleur, la graisse n'a plus à s'en charger. */}
          <h3 className="mb-3.5 text-xl font-normal tracking-tight text-foreground">
            {s.title[lang]}
          </h3>
          {rows ? (
            // `pad="none"` : le retrait vient déjà du conteneur de la page
            // (`px-5 md:px-10`), commun à la prose et à cette liste.
            <KeyValueList pad="none">
              {rows.map((r, i) => (
                <KeyValueRow
                  key={i}
                  orientation="columns"
                  label={r.k}
                  value={<span className="tracking-tight">{r.v}</span>}
                />
              ))}
            </KeyValueList>
          ) : (
            <Prose>{renderStrapiBlocks(s.body[lang])}</Prose>
          )}
        </section>
      );
    })}
  </>
);

const LegalPage = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  const { doc } = useSearch({ from: '/$lang/legal' });
  const sec = doc ?? 'mentions';
  const navigate = useNavigate();
  const setSec = (next: LegalDocumentKey) =>
    navigate({ to: '.', search: next === 'mentions' ? {} : { doc: next } });
  const { documents: legalDocs, sections: legalSectionsByDoc } = useLoaderData({
    from: '/$lang/legal',
  });

  const sections = legalDocs ?? [];
  const active = sections.find((s) => s.k === sec) ?? sections[0];
  const navigateToSection = (next: LegalDocumentKey) => {
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
    /* `<main class="contents">` : voir home-page. */
    /* Deux pistes et non quatre. Le gabarit en déclarait trois à droite du
       rail, que le texte enjambait toutes : aucun filet ne tombait sur leurs
       frontières, et la largeur rendue est identique — trois pistes plus leurs
       deux gouttières valent exactement la piste unique qui les remplace. Un
       gabarit qui annonce des pistes que personne n'occupe fait chercher une
       colonne qui n'existe pas. */
    <PageShell className="app:grid-cols-[var(--spacing-logo)_minmax(0,1fr)] app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
      <main id={MAIN_ID} className="contents">
        {/* La barre collante et son tiroir : `SelectionDrawer` rend les mêmes
            `RailCell` que la colonne desktop juste en dessous. Trois pages
            portaient une copie de ce bloc, à la chaîne de classes près. */}
        <SelectionDrawer
          title={t('legalPage.contents')}
          items={sections.map((s) => ({ key: s.k, label: s[lang] }))}
          activeKey={sec}
          onSelect={(k) => navigateToSection(k as LegalDocumentKey)}
          closeLabel={t('common.close')}
        />

        {/* Desktop sidebar — vertical list, hidden on mobile (replaced by trigger + sheet above). */}
        <Rail
          label={t('legalPage.contents')}
          className="hidden app:col-start-1 app:row-start-2 app:flex"
        >
          {sections.map((s, i) => (
            <RailCell
              key={s.k}
              number={ordinal(i)}
              label={s[lang]}
              active={sec === s.k}
              onSelect={() => setSec(s.k)}
            />
          ))}

          <div className="px-4 py-6 border-t border-border mt-3">
            <MonoLabel tone="muted" className="mb-2.5 block">
              {t('legalPage.gotQuestion')}
            </MonoLabel>
            <p className="text-xs text-muted-foreground leading-normal mb-3">
              {t('legalPage.writeDirectly')}
            </p>
            <Button
              variant="ghost"
              render={<a href="mailto:contact@e-do.studio" />}
              className="h-auto gap-2 self-start border-b border-border px-0 pb-0.5 no-underline"
            >
              contact@e-do.studio <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="flex-1" />
        </Rail>

        {/* Main content */}
        <div className="bg-muted overflow-auto app:col-start-2 app:row-start-2">
          {/* La date de mise à jour passe par `meta`, qui l'aligne sur la ligne
              de base du titre — la grille à deux colonnes qui la tenait à
              droite faisait exactement cela, à la main. */}
          <SectionIntro
            size="sm"
            kicker={
              <StepHeading
                number={ordinal(sections.findIndex((s) => s.k === sec))}
                title={t('common.legal')}
              />
            }
            title={active ? active[lang] : ''}
            subtitle={intro}
            meta={
              active?.updated ? (
                // `items-end` seulement à partir de md : en dessous, le bloc
                // passe à la ligne sous le titre, et l'aligner à droite le
                // détacherait du titre qu'il qualifie.
                <span className="flex flex-col gap-1 md:items-end">
                  {t('legalPage.lastUpdated')}
                  <span className="text-sm text-foreground">
                    {active.updated}
                  </span>
                </span>
              ) : undefined
            }
            className="border-b border-border bg-background pt-9 pb-7 md:px-10"
          />

          <div className="pt-2 px-5 pb-10 max-w-5xl md:px-10">
            {hasStrapiBody && articleCount > 0 && (
              // Le filet appartient à la LISTE et non à la ligne : seule de sa
              // liste, elle tombe sous `last:border-b-0` et le trait qui la
              // sépare des articles disparaîtrait.
              <KeyValueList pad="none" className="border-b border-border">
                {/* La valeur reste en mono muet : les deux moitiés de cette
                    ligne sont des méta-données du document, pas une paire
                    libellé / contenu. */}
                <KeyValueRow
                  rule={false}
                  density="tight"
                  label={`${articleCount} articles`}
                  value={
                    <MonoLabel tone="muted">
                      Version {active?.updated ?? ''}
                    </MonoLabel>
                  }
                />
              </KeyValueList>
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
                  <MonoLabel tone="primary">© GRW — E-Do Studio</MonoLabel>
                  <p className="mt-1.5 text-sm leading-relaxed opacity-75 max-w-xl">
                    {t('legalPage.allRightsReserved')}
                  </p>
                </div>
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => goto('home')}
                >
                  {t('legalPage.backToHome')}{' '}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            )}

            <MonoLabel
              tone="muted"
              className="mt-8 flex items-center justify-end gap-5"
            >
              <Button
                onClick={() => window.print()}
                variant="link"
                className="h-auto p-0 normal-case tracking-[inherit] text-foreground no-underline"
              >
                ↓ {t('legalPage.print')}
              </Button>
              <Button
                variant="ghost"
                render={<a href="mailto:contact@e-do.studio" />}
                className="h-auto p-0 text-foreground no-underline"
              >
                contact@e-do.studio
              </Button>
            </MonoLabel>
          </div>
        </div>
      </main>
    </PageShell>
  );
};

export { LegalPage };
