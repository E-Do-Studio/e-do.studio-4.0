import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';

// Le site a UN mécanisme de filet documenté — la gouttière — et l'emploie
// partout en même temps que l'autre. `page-header.tsx:109-124` explique
// pourquoi la gouttière est la seule qui puisse s'aligner sur les grilles de
// page ; trois conteneurs du configurateur posent les deux à la fois.

const BORDER_COLORS = [
  {
    cls: 'border-border',
    n: 128,
    v: 'oklch(0 0 0) — noir pur',
    where: 'partout',
  },
  {
    cls: 'border-input',
    n: 9,
    v: 'oklch(0.922 0 0) — gris clair',
    where: 'primitives + la grille du calendrier',
  },
  {
    cls: 'border-foreground',
    n: 10,
    v: 'noir',
    where: 'mobile-nav-strip:246 · step-contact:177',
  },
  { cls: 'border-primary', n: 8, v: 'orange', where: 'états sélectionnés' },
  {
    cls: 'border-t-white/15',
    n: 2,
    v: 'blanc 15 %',
    where: 'book/shared.tsx:159',
  },
];

const THICKNESS = [
  'border',
  'border-2',
  'border-l-2',
  'border-l-4',
  'border-t-2',
  'border-b-3',
];

const PADDINGS = [
  { cls: 'px-3', n: 16 },
  { cls: 'px-3.5', n: 10 },
  { cls: 'px-4', n: 38 },
  { cls: 'px-4.5', n: 6 },
  { cls: 'px-5', n: 69 },
  { cls: 'px-6', n: 46 },
  { cls: 'px-8', n: 5 },
  { cls: 'px-12', n: 11 },
];

const HEIGHTS = [
  { cls: 'h-7', px: 28, n: 4 },
  { cls: 'h-8', px: 32, n: 8 },
  { cls: 'h-9', px: 36, n: 1 },
  { cls: 'h-10', px: 40, n: 4 },
  { cls: 'min-h-11', px: 44, n: 38 },
  { cls: 'h-11', px: 44, n: 14 },
  { cls: 'h-12', px: 48, n: 2 },
  { cls: 'min-h-13', px: 52, n: 3 },
  { cls: 'h-14', px: 56, n: 10 },
  { cls: 'h-header', px: 56, n: 2 },
  { cls: 'h-16', px: 64, n: 3 },
];

export const SectionGrid = () => (
  <Section
    id="filets"
    title="Filets & espacements"
    count="2 mécanismes · 5 couleurs · 8 paddings · 15 hauteurs"
    intro="La gouttière — conteneur noir, cellules à fond opaque, gap-px qui laisse voir le noir — est le mécanisme documenté, et le seul qui s'aligne sur les grilles de page. La bordure est employée en même temps, parfois sur le même conteneur."
  >
    <Subsection
      title="Les deux mécanismes de filet"
      note="Regardez les jonctions : la gouttière produit un trait continu d'une cellule à l'autre, la bordure double au point de contact si les deux se rencontrent."
    >
      <SpecimenGrid min="290px">
        <Specimen
          source="page-header.tsx:109-124 (CELL_GUTTERS)"
          tone="canon"
          note="gap-px bg-border · 26 fichiers, 60+ occurrences. Documenté : « le seul mécanisme qui puisse s'aligner sur les grilles de page »."
          frameClassName="p-0"
        >
          <div className="grid grid-cols-2 gap-px bg-border">
            {['A', 'B', 'C', 'D'].map((c) => (
              <div
                key={c}
                className="bg-background px-5 py-6 text-center text-sm"
              >
                {c}
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="border-b × 91 · border-t × 35 · border × 35"
          tone="copie"
          note="Convention concurrente. Fonctionne seule ; le problème est la cohabitation."
          frameClassName="p-0"
        >
          <div className="grid grid-cols-2">
            {['A', 'B', 'C', 'D'].map((c, i) => (
              <div
                key={c}
                className={`bg-background px-5 py-6 text-center text-sm ${
                  i % 2 === 0 ? 'border-r border-border' : ''
                } ${i < 2 ? 'border-b border-border' : ''}`}
              >
                {c}
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="step-configurator.tsx:339,378,436"
          tone="casse"
          note="Les deux sur le MÊME conteneur : gap-px bg-border border-b border-border. Le filet du bas est peint par un mécanisme, les filets internes par l'autre — exactement le désalignement d'un pixel que page-header.tsx:116 documente comme résolu."
          frameClassName="p-0"
        >
          <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
            {['A', 'B'].map((c) => (
              <div
                key={c}
                className="bg-background px-5 py-6 text-center text-sm"
              >
                {c}
              </div>
            ))}
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Couleurs de filet — 5 concurrentes"
      note="Le calendrier du tunnel dessine sa grille en border-input, gris clair, au milieu d'un site dont tous les filets sont noirs. Un seul écran diverge."
    >
      <Specimen source="src/**" tone="copie">
        <div className="flex flex-col divide-y divide-neutral-200">
          {BORDER_COLORS.map((b) => (
            <div
              key={b.cls}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2"
            >
              <span className={`h-6 w-16 shrink-0 border-2 ${b.cls}`} />
              <code className="w-40 shrink-0 font-mono text-[10px] text-neutral-700">
                {b.cls}
              </code>
              <code className="w-10 shrink-0 font-mono text-[10px] text-primary">
                {b.n}×
              </code>
              <code className="min-w-0 flex-1 font-mono text-[10px] text-neutral-500">
                {b.v} — {b.where}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Épaisseurs — 6 valeurs"
      note="border-l-2 est le liseré de sélection canonique (variant rail). border-l-4 en est une seconde épaisseur, pour le même rôle, dans step-postprod.tsx."
    >
      <Specimen source="src/**" tone="copie">
        <div className="flex flex-wrap gap-4">
          {THICKNESS.map((cls) => (
            <div key={cls} className="flex flex-col items-center gap-1">
              <span
                className={`block h-10 w-16 border-border bg-muted ${cls}`}
              />
              <code className="font-mono text-[9px] text-neutral-500">
                {cls}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Paddings horizontaux — 8 valeurs, aucune échelle"
      note="px-5 est le canon (size cell et size header). px-6 le suit de près. Dans la bande d'en-tête, la cellule de titre est en md:px-6 et ses boutons voisins en px-5 : deux cellules côte à côte, deux retraits."
    >
      <Specimen source="src/**" tone="copie">
        <div className="flex flex-col gap-1">
          {PADDINGS.map((p) => (
            <div key={p.cls} className="flex items-center gap-3">
              <span className={`block bg-muted py-1 ${p.cls}`}>
                <span className="block h-3 w-8 bg-foreground/20" />
              </span>
              <code className="font-mono text-[10px] text-neutral-600">
                {p.cls} — {p.n}×
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Hauteurs de ligne — 15 valeurs"
      note="min-h-11 est écrit 38 fois : c'est la cible tactile de 44px, ajoutée à la main parce qu'aucune size de Button ne l'atteint. h-header et h-14 sont la même mesure, l'une par le token, l'autre en littéral."
    >
      <Specimen
        source="src/**"
        tone="copie"
        note="La mesure devrait être une size du bouton, pas 38 classes ajoutées après coup."
      >
        <div className="flex flex-wrap items-end gap-3">
          {HEIGHTS.map((h) => (
            <div key={h.cls} className="flex flex-col items-center gap-1">
              <span className={`block w-14 bg-muted ${h.cls}`} />
              <code className="font-mono text-[9px] text-neutral-600">
                {h.cls}
              </code>
              <code className="font-mono text-[9px] text-neutral-400">
                {h.px}px · {h.n}×
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Paliers de bascule — résolu, 2 seuils qui disent deux choses"
      note="Le tunnel basculait à sm (640px), Discovery à lg (1024px), tout le reste à md (768px), et le seul seuil JS valait md — le configurateur et Discovery étaient donc désynchronisés de leur propre hook. Trois seuils pour une seule transformation. Il en reste deux, et ils ne décrivent plus la même : `md` dit qu'il y a plus de place, `app` (1024px, --breakpoint-app) dit que la grille bento s'applique. La règle est rendue dans le design system, section « Paliers »."
    >
      <Specimen
        source="use-media-query.ts · 291 app: · 154 md: · 82 sm:"
        tone="canon"
      >
        <div className="flex flex-col gap-2 font-mono text-[11px] text-neutral-600">
          <span className="text-foreground">
            app: — 291× — la géométrie bento, sur les 13 pages qui la portent
          </span>
          <span>md: — 154× — retraits, corps, ratios de la pile élargie</span>
          <span>sm: — 82× — densités de formulaire</span>
          <span>
            lg: — 11× hors components/ui — booking-mode-banner (mesuré : 278px
            de bande contre 318 de libellés) et le chrome des deux pages /dev
          </span>
          <span>
            @container — 20× — tunnel, rangée de machines de l’accueil
          </span>
          <span className="mt-2 text-foreground">
            useIsDesktop() = matchMedia(&apos;(min-width: 1024px)&apos;) —
            aligné sur --breakpoint-app
          </span>
        </div>
      </Specimen>
    </Subsection>
  </Section>
);
