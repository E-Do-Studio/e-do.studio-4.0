import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';

// La base de `Button` anime en 150ms. Les composants qui l'entourent animent en
// 200ms, huit fois. Une tuile dont la flèche apparaît en 200ms est posée dans
// un bouton dont le fond change en 150ms : le décalage se voit au survol.

const DURATIONS = [
  {
    cls: 'duration-150',
    n: 3,
    where: 'base de Button — la convention',
    tone: 'canon' as const,
  },
  {
    cls: 'duration-200',
    n: 8,
    where:
      'home-page:185 · shared:62,142 · gallery-lightbox:218 · step-date:293',
    tone: 'copie' as const,
  },
  {
    cls: 'duration-300',
    n: 3,
    where: 'sheet.tsx:30 · image-crossfade',
    tone: 'copie' as const,
  },
  { cls: 'duration-100', n: 3, where: 'dialog.tsx:36', tone: 'copie' as const },
  { cls: 'duration-450', n: 2, where: 'drawer.tsx:75', tone: 'copie' as const },
];

const EASINGS = [
  { cls: 'ease-out', n: 4, where: 'base de Button' },
  { cls: 'ease-in-out', n: 1, where: 'divers' },
  { cls: 'cubic-bezier(0.32,0.72,0,1)', n: 1, where: 'drawer.tsx:75' },
  { cls: 'cubic-bezier(0.22,1,0.36,1)', n: 1, where: 'out-quint, 1 site' },
  { cls: 'cubic-bezier(0.45,1.005,0,1.005)', n: 1, where: '1 site' },
];

const PROPERTIES = [
  {
    cls: 'transition-colors',
    n: 17,
    note: 'convention dominante hors boutons',
  },
  { cls: 'transition-opacity', n: 10, note: 'flèches de survol' },
  { cls: 'transition', n: 5, note: 'raccourci de « tout »' },
  {
    cls: 'transition-all',
    n: 3,
    note: 'base de Button — anime aussi l’outline',
  },
  { cls: 'transition-transform', n: 1, note: '' },
];

export const SectionMotion = () => (
  <Section
    id="animation"
    title="Animation"
    count="7 durées · 5 courbes · 7 propriétés"
    intro="Survolez les carrés : la première ligne est la durée de la base des boutons, les suivantes sont ce que font les composants posés dessus. Deux sites seulement respectent prefers-reduced-motion, sur plus de trente transitions."
  >
    <Subsection
      title="Durées — 7 valeurs concurrentes"
      note="Survolez chaque carré pour comparer."
    >
      <Specimen
        source="src/**"
        tone="copie"
        note="La base des boutons dit 150ms ; huit composants qui vivent DANS des boutons disent 200ms."
      >
        <div className="flex flex-col gap-2">
          {DURATIONS.map((d) => (
            <div key={d.cls} className="flex items-center gap-4">
              <span
                className={`block h-8 w-24 cursor-pointer bg-muted transition-colors ease-out hover:bg-primary ${d.cls}`}
              />
              <code className="w-28 shrink-0 font-mono text-[10px] text-neutral-700">
                {d.cls}
              </code>
              <code className="w-8 shrink-0 font-mono text-[10px] text-primary">
                {d.n}×
              </code>
              <code className="min-w-0 flex-1 font-mono text-[10px] text-neutral-500">
                {d.where}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Courbes — 3 Bézier arbitraires, chacune utilisée une fois"
      note="Aucune n'est tokenisée. Trois valeurs sur cinq n'existent qu'à un seul endroit du dépôt."
    >
      <Specimen source="src/**" tone="copie">
        <div className="flex flex-col gap-1">
          {EASINGS.map((e) => (
            <div
              key={e.cls}
              className="flex flex-wrap items-baseline gap-x-4 py-1"
            >
              <code className="w-64 shrink-0 font-mono text-[10px] text-neutral-700">
                {e.cls}
              </code>
              <code className="w-8 shrink-0 font-mono text-[10px] text-primary">
                {e.n}×
              </code>
              <code className="min-w-0 flex-1 font-mono text-[10px] text-neutral-500">
                {e.where}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Propriétés animées — 7 conventions"
      note="Un survol de cellule-bouton anime aussi son outline (transition-all) ; la même cellule écrite en <a> n'anime que sa couleur."
    >
      <SpecimenGrid min="240px">
        <Specimen source="src/**" tone="copie">
          <div className="flex flex-col gap-1">
            {PROPERTIES.map((p) => (
              <div
                key={p.cls}
                className="flex flex-wrap items-baseline gap-x-3 py-0.5"
              >
                <code className="w-40 shrink-0 font-mono text-[10px] text-neutral-700">
                  {p.cls}
                </code>
                <code className="w-8 shrink-0 font-mono text-[10px] text-primary">
                  {p.n}×
                </code>
                <code className="min-w-0 flex-1 font-mono text-[10px] text-neutral-500">
                  {p.note}
                </code>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="assistant-chat.tsx:478 · step-date.tsx:124"
          tone="casse"
          note="motion-safe: n'apparaît que 2 fois. Les 30+ autres transitions du site s'exécutent quelles que soient les préférences système de réduction d'animation."
        >
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-primary motion-safe:animate-pulse">
              motion-safe — respecte la préférence
            </span>
            <span className="animate-pulse font-mono text-xs uppercase tracking-widest text-muted-foreground">
              sans motion-safe — s’anime toujours
            </span>
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>
  </Section>
);
