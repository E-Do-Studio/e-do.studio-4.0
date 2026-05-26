import { useMemo, useState } from 'react';
import { MobileNavStrip } from '../ui/mobile-nav-strip';
import type { StripGroup } from '../ui/mobile-nav-strip';
import { usePageContext } from '../router';

// ── Single-group case (post-prod / plateau style) ──────────────
const TYPES = [
  { k: 'all', fr: 'Tout', en: 'All' },
  { k: 'on-model', fr: 'On model', en: 'On model' },
  { k: 'still', fr: 'Still life', en: 'Still life' },
  { k: 'video', fr: 'Vidéo', en: 'Video' },
];

// ── Two-group case (gallery style w/ cross-filter dim) ─────────
const CATS = [
  { k: 'all', fr: 'Tout', en: 'All' },
  { k: 'eyewear', fr: 'Eyewear', en: 'Eyewear' },
  { k: 'accessoires', fr: 'Accessoires', en: 'Accessories' },
  { k: 'cosmetique', fr: 'Cosmétique', en: 'Cosmetics' },
];

const PLATEAUX = [
  { k: 'all', fr: 'Tout', en: 'All' },
  { k: 'cyclorama', fr: 'Cyclorama', en: 'Cyclorama' },
  { k: 'horizontal', fr: 'Horizontal', en: 'Horizontal' },
  { k: 'vertical', fr: 'Vertical', en: 'Vertical' },
  { k: 'live', fr: 'Live', en: 'Live' },
];

// Compatibility map for cross-filter dim demo.
const CAT_TO_PLATEAUX: Record<string, string[]> = {
  eyewear: ['cyclorama', 'horizontal', 'live'],
  accessoires: ['horizontal', 'vertical'],
  cosmetique: ['horizontal', 'vertical', 'live'],
};

const PLATEAU_TO_CATS: Record<string, string[]> = {
  cyclorama: ['eyewear'],
  horizontal: ['eyewear', 'accessoires', 'cosmetique'],
  vertical: ['accessoires', 'cosmetique'],
  live: ['eyewear', 'cosmetique'],
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-b border-border">
    <div className="px-4 py-3">
      <h2 className="font-mono text-label uppercase tracking-label text-muted-foreground">
        {title}
      </h2>
    </div>
    {children}
  </section>
);

export const MobileNavStripDevPage = () => {
  const { lang } = usePageContext();
  // single-group state
  const [type, setType] = useState('all');
  // two-group state
  const [cat, setCat] = useState('all');
  const [plateau, setPlateau] = useState('all');

  const typeOptions = useMemo(
    () =>
      TYPES.map((t) => ({
        k: t.k,
        label: t[lang],
      })),
    [lang],
  );

  const catOptions = useMemo(
    () =>
      CATS.map((c) => {
        const dimmed =
          c.k !== 'all' &&
          plateau !== 'all' &&
          !(PLATEAU_TO_CATS[plateau] ?? []).includes(c.k);
        return { k: c.k, label: c[lang], dimmed };
      }),
    [lang, plateau],
  );

  const plateauOptions = useMemo(
    () =>
      PLATEAUX.map((p) => {
        const dimmed =
          p.k !== 'all' &&
          cat !== 'all' &&
          !(CAT_TO_PLATEAUX[cat] ?? []).includes(p.k);
        return { k: p.k, label: p[lang], dimmed };
      }),
    [lang, cat],
  );

  // Single-group groups
  const singleGroup: StripGroup[] = [
    {
      key: 'type',
      label: lang === 'fr' ? 'Types' : 'Types',
      options: typeOptions,
      value: type,
      onSelect: setType,
    },
  ];

  // Two-group groups
  const twoGroups: StripGroup[] = [
    {
      key: 'cat',
      label: lang === 'fr' ? 'Catégories' : 'Categories',
      options: catOptions,
      value: cat,
      onSelect: setCat,
    },
    {
      key: 'plateau',
      label: lang === 'fr' ? 'Plateaux' : 'Stages',
      options: plateauOptions,
      value: plateau,
      onSelect: setPlateau,
    },
  ];

  const typeSummary =
    type === 'all' ? (lang === 'fr' ? 'Tout' : 'All') : TYPES.find((t) => t.k === type)?.[lang];

  const twoSummaryParts = [
    cat !== 'all' ? CATS.find((c) => c.k === cat)?.[lang] : null,
    plateau !== 'all' ? PLATEAUX.find((p) => p.k === plateau)?.[lang] : null,
  ].filter(Boolean);
  const twoSummary =
    twoSummaryParts.length > 0
      ? twoSummaryParts.join(', ')
      : lang === 'fr'
        ? 'Tout'
        : 'All';

  const twoActiveCount = (cat !== 'all' ? 1 : 0) + (plateau !== 'all' ? 1 : 0);

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-white px-4">
        <h1 className="font-mono text-label uppercase tracking-label">
          /dev/mobile-nav-strip
        </h1>
      </header>

      <Section title="Case 1 — single group (post-prod / plateau style)">
        <MobileNavStrip
          triggerLabel={lang === 'fr' ? 'TYPES' : 'TYPES'}
          groups={singleGroup}
          hasActive={type !== 'all'}
          activeCount={type !== 'all' ? 1 : 0}
          summary={typeSummary ?? undefined}
          ariaLabel={lang === 'fr' ? 'Filtrer par type' : 'Filter by type'}
          lang={lang}
          onReset={() => setType('all')}
        />
        <div className="px-4 py-6 font-mono text-detail text-muted-foreground">
          <div>
            current type ={' '}
            <span className="text-foreground">{type}</span>
          </div>
        </div>
      </Section>

      <Section title="Case 2 — two groups, cross-filter dim (gallery style)">
        <MobileNavStrip
          triggerLabel={lang === 'fr' ? 'FILTRES' : 'FILTERS'}
          groups={twoGroups}
          hasActive={cat !== 'all' || plateau !== 'all'}
          activeCount={twoActiveCount}
          summary={twoSummary}
          ariaLabel={lang === 'fr' ? 'Filtrer la galerie' : 'Filter the gallery'}
          lang={lang}
          onReset={() => {
            setCat('all');
            setPlateau('all');
          }}
        />
        <div className="px-4 py-6 font-mono text-detail text-muted-foreground">
          <div>
            cat = <span className="text-foreground">{cat}</span>
          </div>
          <div>
            plateau = <span className="text-foreground">{plateau}</span>
          </div>
        </div>
      </Section>

      <Section title="Case 3 — onApply (batched commit, live count)">
        <MobileNavStripWithApply lang={lang} />
      </Section>

      <div className="px-4 py-10 font-mono text-micro uppercase tracking-label text-muted-foreground">
        Resize ≤ 768px to see the strip. Hidden on desktop.
      </div>
    </main>
  );
};

const MobileNavStripWithApply = ({ lang }: { lang: 'fr' | 'en' }) => {
  const [committed, setCommitted] = useState({ cat: 'all', plateau: 'all' });

  const catOpts = useMemo(
    () =>
      CATS.map((c) => {
        const dimmed =
          c.k !== 'all' &&
          committed.plateau !== 'all' &&
          !(PLATEAU_TO_CATS[committed.plateau] ?? []).includes(c.k);
        return { k: c.k, label: c[lang], dimmed };
      }),
    [lang, committed.plateau],
  );

  const plateauOpts = useMemo(
    () =>
      PLATEAUX.map((p) => {
        const dimmed =
          p.k !== 'all' &&
          committed.cat !== 'all' &&
          !(CAT_TO_PLATEAUX[committed.cat] ?? []).includes(p.k);
        return { k: p.k, label: p[lang], dimmed };
      }),
    [lang, committed.cat],
  );

  const groups: StripGroup[] = [
    {
      key: 'cat',
      label: lang === 'fr' ? 'Catégories' : 'Categories',
      options: catOpts,
      value: committed.cat,
      onSelect: () => undefined,
    },
    {
      key: 'plateau',
      label: lang === 'fr' ? 'Plateaux' : 'Stages',
      options: plateauOpts,
      value: committed.plateau,
      onSelect: () => undefined,
    },
  ];

  const activeCount =
    (committed.cat !== 'all' ? 1 : 0) + (committed.plateau !== 'all' ? 1 : 0);

  return (
    <>
      <MobileNavStrip
        triggerLabel={lang === 'fr' ? 'FILTRES' : 'FILTERS'}
        groups={groups}
        hasActive={activeCount > 0}
        activeCount={activeCount}
        summary={
          activeCount === 0
            ? lang === 'fr'
              ? 'Tout'
              : 'All'
            : `${committed.cat} / ${committed.plateau}`
        }
        ariaLabel={
          lang === 'fr' ? 'Filtres galerie (batché)' : 'Gallery filters (batched)'
        }
        lang={lang}
        countFor={(draft) => {
          // Pretend each filter halves the result count.
          const total = 120;
          const factor =
            (draft.cat && draft.cat !== 'all' ? 0.5 : 1) *
            (draft.plateau && draft.plateau !== 'all' ? 0.5 : 1);
          return Math.max(1, Math.round(total * factor));
        }}
        onApply={(draft) =>
          setCommitted({ cat: draft.cat ?? 'all', plateau: draft.plateau ?? 'all' })
        }
      />
      <div className="px-4 py-6 font-mono text-detail text-muted-foreground">
        <div>
          committed.cat ={' '}
          <span className="text-foreground">{committed.cat}</span>
        </div>
        <div>
          committed.plateau ={' '}
          <span className="text-foreground">{committed.plateau}</span>
        </div>
      </div>
    </>
  );
};
