import { ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/ui/page-header';
import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';
import { cn } from '@/lib/utils';

// Le motif « onglet / segment » est réécrit cinq fois, et le déclencheur de
// navigation mobile quatre. Trois des quatre copies du déclencheur portent un
// commentaire qui reconnaît copier `MobileNavStrip` — sans jamais l'importer.

const SEGMENTS = [
  {
    source: 'steps/session-tabs.tsx:52-108',
    note: 'Actif = portée dark sur le wrapper. Grille repeat(n,1fr) en style inline. px-3.5 py-3 pr-9.',
    render: (
      <div className="grid grid-cols-2 gap-px border-y border-border bg-border">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={cn('relative min-w-0 bg-background', i === 0 && 'dark')}
          >
            <Button
              variant="cell"
              size="cell"
              aria-pressed={i === 0}
              className="w-full gap-1 bg-transparent px-3.5 py-3 pr-9 hover:bg-transparent"
            >
              <span
                className={cn(
                  'font-mono text-xs tracking-widest',
                  i === 0 ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                Session 0{i + 1}
              </span>
              <span className="text-sm font-normal tracking-tight">
                Prêt-à-porter
              </span>
              <span className="font-mono text-xs tracking-wide text-muted-foreground">
                120 produits
              </span>
            </Button>
          </div>
        ))}
      </div>
    ),
  },
  {
    source: 'book-page.tsx:465-488',
    note: 'variant="outline" · h-auto min-w-7 px-2.5 py-1 text-xs · deux états actifs concurrents : dark border-foreground OU rempli bg-primary.',
    render: (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="dark h-auto min-w-7 border-foreground bg-background px-2.5 py-1 text-xs"
        >
          01
        </Button>
        <Button
          variant="outline"
          className="h-auto min-w-7 border-primary bg-primary px-2.5 py-1 text-xs text-primary-foreground"
        >
          02
        </Button>
        <Button
          variant="outline"
          className="h-auto min-w-7 px-2.5 py-1 text-xs"
        >
          03
        </Button>
      </div>
    ),
  },
  {
    source: 'steps/step-date.tsx:348-367',
    note: 'variant="cell" · h-auto sm:aspect-[1.5] py-3 sm:py-0 · actif = dark bg-background.',
    render: (
      <div className="grid grid-cols-4 gap-px bg-border">
        {['08:00', '09:00', '10:00', '11:00'].map((h, i) => (
          <Button
            key={h}
            variant="cell"
            size="cell"
            aria-pressed={i === 1}
            className={cn(
              'h-auto items-center justify-center py-3 text-center',
              i === 1 && 'dark bg-background text-foreground',
            )}
          >
            <span className="w-full text-center font-mono text-xs tracking-widest">
              {h}
            </span>
          </Button>
        ))}
      </div>
    ),
  },
  {
    source: 'booking-stepper.tsx:25-46 (version mobile)',
    note: 'Aucun variant. Un ternaire à quatre branches décide de l’apparence : actif / franchi / cliquable / ni l’un ni l’autre. h-7 w-7 -m-2 p-2.',
    render: (
      <div className="flex items-center gap-2">
        {['01', '02', '03', '04'].map((n, i) => (
          <Button
            key={n}
            className={cn(
              'h-7 w-7 -m-0 p-2 text-[10px]',
              i === 0 && 'bg-primary text-primary-foreground',
              i === 1 && 'dark bg-background text-foreground',
              i > 1 && 'bg-muted text-muted-foreground',
            )}
          >
            {n}
          </Button>
        ))}
      </div>
    ),
  },
];

const TRIGGERS = [
  {
    source: 'ui/mobile-nav-strip.tsx:144-178',
    tone: 'canon' as const,
    note: 'La version aboutie : wrapper h-14 + bouton min-h-11, HoverMarquee sur le résumé, badge de compte, ChevronDown. 300 lignes, un seul appelant — la galerie.',
    icon: (
      <ChevronDown
        width={16}
        height={16}
        aria-hidden
        className="text-muted-foreground"
      />
    ),
    body: (
      <>
        <span className="font-mono text-xs uppercase tracking-widest text-foreground">
          Filtres
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          · Prêt-à-porter
        </span>
      </>
    ),
    badge: true,
    wrapper: 'h-14',
  },
  {
    source: 'plateau-page.tsx:265-297',
    tone: 'copie' as const,
    note: 'Le commentaire du fichier reconnaît explicitement copier le gabarit de MobileNavStrip — « same sticky strip gabarit … h-14 wrapper with min-h-11 trigger ». Il le copie au lieu de l’importer. ChevronsUpDown au lieu de ChevronDown.',
    icon: (
      <ChevronsUpDown
        width="16"
        height="16"
        className="shrink-0 text-foreground"
      />
    ),
    body: (
      <>
        <span className="font-mono text-xs uppercase tracking-widest text-foreground">
          01
        </span>
        <span className="text-base tracking-tight text-foreground">Live</span>
      </>
    ),
    badge: false,
    wrapper: 'h-14',
  },
  {
    source: 'postprod-page.tsx:370-394',
    tone: 'copie' as const,
    note: 'Pas de wrapper h-14 : min-h-14 sur le bouton lui-même, py-2.5, contenu en colonne. Un 3e gabarit.',
    icon: (
      <ChevronsUpDown
        width="16"
        height="16"
        className="shrink-0 text-foreground"
      />
    ),
    body: (
      <span className="flex flex-col gap-0.5 text-left">
        <span className="text-base tracking-tight">On model</span>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          À partir de 7,90€
        </span>
      </span>
    ),
    badge: false,
    wrapper: '',
  },
  {
    source: 'legal-page.tsx:206-226',
    tone: 'copie' as const,
    note: 'min-h-14, py-3, à plat. Un 4e gabarit pour le même geste.',
    icon: (
      <ChevronsUpDown
        width="16"
        height="16"
        className="shrink-0 text-foreground"
      />
    ),
    body: <span className="text-base tracking-tight">Mentions légales</span>,
    badge: false,
    wrapper: '',
  },
];

export const SectionNav = () => (
  <Section
    id="navigation"
    title="Navigation"
    count="5 segments · 4 déclencheurs mobiles"
    intro="PageHeader est le seul organisme de navigation réellement partagé — douze pages sur treize l'utilisent. Tout ce qui est en dessous est réécrit page par page."
  >
    <Subsection
      title="PageHeader — la partie saine"
      note="12 pages sur 13. Seule la 404 s'en passe : elle est hors du système de grille du site, sans PageHeader, sans --spacing-*."
    >
      <Specimen
        source="src/ui/page-header.tsx"
        tone="canon"
        note="Le composant réel, rendu ici hors de son contexte de page."
        frameClassName="p-0"
      >
        <div className="overflow-hidden border border-border">
          <PageHeader />
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Le motif onglet / segment — 5 écritures"
      note="Même geste — choisir un élément dans un groupe exclusif — et cinq expressions de l'état sélectionné : portée dark, bg-primary, dark border-foreground, un ternaire à quatre branches."
    >
      <SpecimenGrid min="290px">
        {SEGMENTS.map((s) => (
          <Specimen key={s.source} source={s.source} tone="copie" note={s.note}>
            {s.render}
          </Specimen>
        ))}
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Le déclencheur de navigation mobile — 4 copies"
      note="Ouvrir un tiroir listant les entrées. Quatre gabarits, deux icônes de chevron, trois arrangements internes."
    >
      <SpecimenGrid min="290px">
        {TRIGGERS.map((tr) => (
          <Specimen
            key={tr.source}
            source={tr.source}
            tone={tr.tone}
            note={tr.note}
          >
            <div
              className={cn(
                'flex items-stretch border-b border-border bg-background',
                tr.wrapper,
              )}
            >
              <Button
                variant="cell"
                size="cell"
                aria-haspopup="dialog"
                className={cn(
                  'w-full flex-row items-center gap-2 bg-transparent px-4',
                  tr.wrapper ? 'min-h-11' : 'min-h-14 py-3',
                )}
              >
                {tr.body}
                <span className="ml-auto flex shrink-0 items-center gap-2">
                  {tr.badge && (
                    <span
                      aria-hidden
                      className="inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1 font-mono text-xs uppercase tracking-widest text-primary-foreground"
                    >
                      3
                    </span>
                  )}
                  {tr.icon}
                </span>
              </Button>
            </div>
          </Specimen>
        ))}
      </SpecimenGrid>
    </Subsection>
  </Section>
);
