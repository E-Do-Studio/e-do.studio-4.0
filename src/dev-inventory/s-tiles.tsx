import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonoLabel } from '@/ui/mono-label';
import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';
import { cn } from '@/lib/utils';

// Les tuiles sélectionnables partagent toutes le même squelette — numéro en
// haut à gauche, marqueur ●/→ en haut à droite, titre, pied séparé par un
// filet — et aucune n'est le même composant. `step-plateau.tsx:46-93` est une
// recopie ligne à ligne de `BentoSlotTile`, `border-t-white/15` compris.

const Marker = ({ on, size }: { on: boolean; size: 'sm' | 'base' }) =>
  on ? (
    <span
      className={`leading-none text-primary ${size === 'sm' ? 'text-sm' : 'text-base'}`}
    >
      ●
    </span>
  ) : (
    <span
      className={`leading-none text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
        size === 'sm' ? 'text-sm' : 'text-base'
      }`}
    >
      →
    </span>
  );

export const SectionTiles = () => (
  <Section
    id="tuiles"
    title="Tuiles & cartes"
    count="5 tuiles sélectionnables · 3 CTA « Réserver »"
    intro="Même squelette partout, cinq composants distincts. Survolez les tuiles non sélectionnées : la flèche apparaît — sauf que sa taille change d'une tuile à l'autre, alors que la pastille du même marqueur, elle, ne change pas."
  >
    <Subsection
      title="Tuiles sélectionnables"
      note="La première est sélectionnée dans chaque paire."
    >
      <SpecimenGrid min="290px">
        <Specimen
          source="book/shared.tsx:42 (CfgChoice)"
          tone="canon"
          note="min-h-32 sm:min-h-28 · p-5 sm:p-3.5 · titre text-base · marqueur asymétrique : ● en text-base, → en text-sm."
          frameClassName="bg-border p-px"
        >
          <div className="grid grid-cols-2 gap-px">
            {[true, false].map((on) => (
              <Button
                key={String(on)}
                variant="cell"
                size="cell"
                aria-pressed={on}
                className={cn(
                  'group min-h-32 gap-1 p-5 sm:min-h-28 sm:p-3.5',
                  on && 'dark bg-background',
                )}
              >
                <div className="flex w-full items-start justify-between">
                  <span className="font-mono text-xs tracking-widest text-muted-foreground">
                    01
                  </span>
                  <Marker on={on} size={on ? 'base' : 'sm'} />
                </div>
                <div className="mt-0.5 text-balance text-base font-normal leading-tight tracking-tight">
                  Demi-journée
                </div>
                <div className="mt-auto text-pretty text-xs leading-normal text-muted-foreground">
                  4 heures consécutives
                </div>
              </Button>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="book/shared.tsx:112 (BentoSlotTile)"
          tone="canon"
          note="min-h-44 · p-5 (size cell) · titre text-3xl · marqueur symétrique en text-base · pied border-t-white/15 en portée dark — devrait être border-t-foreground/15, puisque foreground EST déjà blanc sous dark."
          frameClassName="bg-border p-px"
        >
          <div className="grid grid-cols-2 gap-px">
            {[true, false].map((on) => (
              <Button
                key={String(on)}
                variant="cell"
                size="cell"
                aria-pressed={on}
                className={cn(
                  'group min-h-44 min-w-0 gap-1.5',
                  on && 'dark bg-background',
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs tracking-widest text-muted-foreground">
                    01
                  </span>
                  <Marker on={on} size="base" />
                </div>
                <div className="mt-1 text-3xl font-light tracking-tight">
                  Live
                </div>
                <div className="text-sm leading-snug text-muted-foreground">
                  Shooting porté
                </div>
                <div
                  className={cn(
                    'mt-auto flex items-baseline justify-between border-t pt-3',
                    on ? 'border-t-white/15' : 'border-t-border',
                  )}
                >
                  <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    Tarif HT
                  </span>
                  <span className="text-base tabular-nums">590 €</span>
                </div>
              </Button>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="step-plateau.tsx:46-93"
          tone="casse"
          note="Recopie ligne à ligne de BentoSlotTile : même marqueur, même titre text-3xl mt-1, même pied, même border-t-white/15. Seules différences réelles : px-4.5 py-4 au lieu de p-5, pas de min-h, et une LISTE de prix au pied. Une prop priceRows aurait suffi."
          frameClassName="bg-border p-px"
        >
          <div className="grid grid-cols-2 gap-px">
            {[true, false].map((on) => (
              <Button
                key={String(on)}
                variant="cell"
                size="cell"
                aria-pressed={on}
                className={cn('group px-4.5 py-4', on && 'dark bg-background')}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs tracking-widest text-muted-foreground">
                    01
                  </span>
                  <Marker on={on} size="base" />
                </div>
                <div className="mt-1 text-3xl font-light tracking-tight">
                  Live
                </div>
                <div className="text-sm leading-snug text-muted-foreground">
                  Shooting porté
                </div>
                <div
                  className={cn(
                    'mt-auto flex flex-col gap-1 border-t pt-3',
                    on ? 'border-t-white/15' : 'border-t-border',
                  )}
                >
                  {[
                    ['½ journée', '390 €'],
                    ['Journée 8h', '590 €'],
                  ].map(([lbl, val]) => (
                    <div
                      key={lbl}
                      className="flex items-baseline justify-between gap-2 whitespace-nowrap"
                    >
                      <span className="overflow-hidden text-ellipsis font-mono text-xs uppercase tracking-wide text-muted-foreground">
                        {lbl}
                      </span>
                      <span className="text-sm tabular-nums">{val}</span>
                    </div>
                  ))}
                </div>
              </Button>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="book-picker.tsx:22-80 (PickerTile)"
          tone="copie"
          note="min-h-40 · px-6 py-7 md:px-8 md:py-8 — un 4e padding · titre text-xl · pas de numéro, pas de pastille : la flèche seule."
          frameClassName="bg-border p-px"
        >
          <Button
            variant="cell"
            size="cell"
            className="group min-h-40 justify-between px-6 py-7 md:px-8 md:py-8"
          >
            <span className="text-xl font-light tracking-tight">
              Configurateur
            </span>
            <span className="flex items-end justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Devis immédiat en six étapes
              </span>
              <ArrowRight />
            </span>
          </Button>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Deux tuiles d'accueil strictement identiques"
      note="Même structure, mêmes classes, à 50 lignes d'écart. Seuls le libellé et le placement dans la grille changent."
    >
      <Specimen
        source="home-page.tsx:260-282 et :311-331"
        tone="copie"
        note="h-36 · size=&quot;cell&quot; · kicker + titre text-3xl font-light tracking-tighter + sub mt-1.5 + ArrowRight. Doublon strict."
        frameClassName="bg-border p-px"
      >
        <div className="grid grid-cols-2 gap-px">
          {['Cyclorama', 'Post-production'].map((label) => (
            <Button
              key={label}
              variant="cell"
              size="cell"
              className="group h-36 justify-between"
            >
              <MonoLabel tone="muted">Découvrir</MonoLabel>
              <span className="flex items-end justify-between gap-2.5">
                <span className="min-w-0">
                  <span className="block text-3xl font-light leading-none tracking-tighter">
                    {label}
                  </span>
                  <span className="mt-1.5 block text-sm text-muted-foreground">
                    Production libre
                  </span>
                </span>
                <ArrowRight data-icon="inline-end" />
              </span>
            </Button>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Cartes d'article — la partie saine"
      note="Discovery est le seul dossier où la consolidation est allée au bout : trois cartes, trois composants, tous utilisant MonoLabel et Item."
    >
      <SpecimenGrid min="260px">
        <Specimen
          source="discovery/article-card.tsx:32"
          tone="canon"
          note="min-h-96 · px-5 py-4 · titre text-2xl font-light leading-snug tracking-tight line-clamp-3."
          frameClassName="bg-border p-px"
        >
          <div className="flex min-h-64 flex-col justify-between bg-background px-5 py-4">
            <MonoLabel tone="primary">Coulisses</MonoLabel>
            <div>
              <p className="m-0 line-clamp-3 text-2xl font-light leading-snug tracking-tight">
                Comment nous éclairons un packshot 360°
              </p>
              <div className="mt-4 flex items-center justify-between">
                <MonoLabel tone="muted">12 févr. 2026</MonoLabel>
                <ArrowRight className="size-4" />
              </div>
            </div>
          </div>
        </Specimen>

        <Specimen
          source="discovery/article-teaser-cell.tsx:31"
          tone="canon"
          note="px-5 py-4 · titre text-base line-clamp-2 — la déclinaison compacte de la précédente."
          frameClassName="bg-border p-px"
        >
          <div className="flex flex-col gap-2 bg-background px-5 py-4">
            <MonoLabel tone="primary">Coulisses</MonoLabel>
            <p className="m-0 line-clamp-2 text-base font-normal">
              Comment nous éclairons un packshot 360°
            </p>
            <div className="flex items-center justify-between">
              <MonoLabel tone="muted">12 févr. 2026</MonoLabel>
              <ArrowRight className="size-4" />
            </div>
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>
  </Section>
);
