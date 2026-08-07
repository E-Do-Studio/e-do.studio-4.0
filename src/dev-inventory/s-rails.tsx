import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Rail, RailCell } from '@/ui/rail-cell';
import { cn } from '@/lib/utils';
import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';

// Le motif signature du site, et le plus dupliqué : une colonne de cellules,
// filet 1px, cellule active à fond gris et liseré orange à gauche. Treize
// implémentations. Le liseré et le fond actif viennent bien de
// `variant="cell"` — c'est la seule chose qui soit partagée. Tout le reste
// (hauteur, padding, gap, typographie, présence du filet) est réécrit à chaque
// site d'appel.
//
// Les échantillons sont rendus à largeur égale : c'est la seule façon de voir
// que ce sont cinq hauteurs de ligne.

// Le variant `rail` de `button.tsx`, tel qu'il était avant la migration : un
// liseré orange de 2px sur le bord gauche, et un fond `bg-muted` identique à
// celui du survol. Reproduit ici par ses classes littérales, comme les douze
// autres copies de cette page — le variant lui-même a été supprimé.
const LEGACY_RAIL =
  'border-l-2 border-l-transparent bg-background text-foreground hover:bg-muted aria-pressed:border-l-primary aria-pressed:bg-muted';

const PLATEAUX = [
  { n: '01', name: 'Live', tag: 'Shooting porté' },
  { n: '02', name: 'Eclipse', tag: 'Photo & vidéo 360°' },
  { n: '03', name: 'Horizontal', tag: 'Packshots à plat' },
  { n: '04', name: 'Vertical', tag: 'Mannequin ghost' },
];

const PRESTATIONS = [
  { n: '01', name: 'On model', price: 'À partir de 7,90€' },
  { n: '02', name: 'Ghost', price: 'À partir de 5,40€' },
  { n: '03', name: 'Flat', price: 'À partir de 5,40€' },
  { n: '04', name: 'Accessoires', price: 'À partir de 5,40€' },
];

const ETAPES = [
  { n: '01', label: 'Plateau', done: true },
  { n: '02', label: 'Créneau', done: false },
  { n: '03', label: 'Équipe', done: false },
  { n: '04', label: 'Post-prod', done: false },
];

// Les trois tiroirs mobiles portent la MÊME chaîne de classes, copiée telle
// quelle dans trois fichiers, avec trois arrangements internes différents.
const DRAWER_CELL =
  'min-h-14 w-full gap-4 border-b border-border px-4 py-3 text-left';

export const SectionRails = () => (
  <Section
    id="rails"
    title="Rails de cellules"
    count="13 implémentations · 1 composant"
    intro="Le liseré orange et le fond actif sont partagés — c'est variant=&quot;rail&quot; qui les pose. Rien d'autre ne l'est : cinq hauteurs de ligne, quatre paddings, trois tailles de titre, un rail sans filet, un numéro qui casse à 10."
  >
    <Subsection
      title="Desktop — 5 hauteurs pour un même rail"
      note="Tous les échantillons ont la même largeur. Le second item est actif partout."
    >
      <SpecimenGrid min="250px">
        <Specimen
          source="src/ui/rail-cell.tsx — MIGRÉ"
          tone="canon"
          note="Les six rails desktop passent désormais par ce composant. L'état choisi n'est plus un liseré orange mais l'inversion — le liseré masquait que `hover` et `aria-pressed` posaient tous deux `bg-muted`, donc que survol et sélection étaient identiques."
          frameClassName="p-0"
        >
          <Rail label="Catégories">
            <RailCell
              label="Tout"
              density="compact"
              active
              onSelect={() => {}}
            />
            <RailCell
              label="Prêt-à-porter"
              density="compact"
              active={false}
              onSelect={() => {}}
            />
            <RailCell
              label="Accessoires"
              density="compact"
              active={false}
              onSelect={() => {}}
            />
            <RailCell
              label="Eyewear"
              density="compact"
              active={false}
              onSelect={() => {}}
              dimmed
            />
          </Rail>
        </Specimen>

        <Specimen
          source="postprod-page.tsx:459-478"
          tone="copie"
          note="72px (min-h-18) · px-4 py-3 · gap-1 · titre text-sm toujours foreground · 3e ligne de prix poussée par mt-auto."
          frameClassName="p-0"
        >
          <div className="flex flex-col bg-background">
            {PRESTATIONS.map((p, i) => (
              <Button
                key={p.n}
                variant="cell"
                size="cell"
                aria-pressed={i === 0}
                className={cn(
                  LEGACY_RAIL,
                  'group min-h-18 flex-none gap-1 border-b border-b-border px-4 py-3',
                )}
              >
                <span className="font-mono text-xs tracking-widest text-muted-foreground group-aria-pressed:text-primary">
                  {p.n}
                </span>
                <span className="truncate text-sm font-normal leading-snug tracking-tight text-foreground">
                  {p.name}
                </span>
                <span className="mt-auto overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {p.price}
                </span>
              </Button>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="plateau-page.tsx:357-379"
          tone="copie"
          note="≈76px (aucune hauteur, le contenu décide) · px-4 py-3.5 — un 4e padding vertical · titre text-base, seule taille de titre différente du site."
          frameClassName="p-0"
        >
          <div className="flex flex-col bg-background">
            {PLATEAUX.map((p, i) => (
              <Button
                key={p.n}
                variant="cell"
                size="cell"
                aria-pressed={i === 0}
                className={cn(
                  LEGACY_RAIL,
                  'group flex-none gap-1 border-b border-b-border px-4 py-3.5',
                )}
              >
                <span className="font-mono text-xs tracking-widest text-muted-foreground group-aria-pressed:text-primary">
                  {p.n}
                </span>
                <span className="whitespace-nowrap text-base font-normal tracking-tight text-muted-foreground group-aria-pressed:text-foreground">
                  {p.name}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {p.tag}
                </span>
              </Button>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="legal-page.tsx:284-298"
          tone="casse"
          note="≈62px · gap-0.5 · AUCUN filet — c'est le seul rail du site sans border-b, les cellules se touchent. Et le numéro est écrit `0${i+1}` : au 10e document il affiche « 010 »."
          frameClassName="p-0"
        >
          <div className="flex flex-col bg-background">
            {['Mentions légales', 'CGV', 'Confidentialité', 'Cookies'].map(
              (label, i) => (
                <Button
                  key={label}
                  variant="cell"
                  size="cell"
                  aria-pressed={i === 0}
                  className={cn(
                    LEGACY_RAIL,
                    'group flex-none gap-0.5 px-4 py-3',
                  )}
                >
                  <span className="font-mono text-xs tracking-widest text-muted-foreground">
                    0{i + 1}
                  </span>
                  <span className="whitespace-nowrap text-sm font-normal tracking-tight text-muted-foreground group-aria-pressed:text-foreground">
                    {label}
                  </span>
                </Button>
              ),
            )}
            {/* La 10e entrée, telle qu'elle rendrait. */}
            <Button
              variant="cell"
              size="cell"
              aria-pressed={false}
              className={cn(LEGACY_RAIL, 'group flex-none gap-0.5 px-4 py-3')}
            >
              <span className="font-mono text-xs tracking-widest text-primary">
                0{10}
              </span>
              <span className="whitespace-nowrap text-sm font-normal tracking-tight text-muted-foreground">
                Le 10e document
              </span>
            </Button>
          </div>
        </Specimen>

        <Specimen
          source="booking-stepper.tsx:84-134"
          tone="copie"
          note="44px (h-11) · px-6 — un 3e padding horizontal · gap-3.5 · last:border-b-0 · le seul rail dont le libellé actif passe en font-bold, graisse que la fonte ne livre pas."
          frameClassName="p-0"
        >
          <nav className="flex flex-col bg-background">
            {ETAPES.map((e, i) => (
              <Button
                key={e.n}
                variant="cell"
                aria-current={i === 0 ? 'step' : undefined}
                aria-pressed={i === 0}
                aria-disabled={i > 1}
                className={cn(
                  LEGACY_RAIL,
                  'group h-11 flex-none justify-start gap-3.5 border-b border-b-border px-6 text-left last:border-b-0 aria-disabled:cursor-not-allowed',
                )}
              >
                <span
                  className={`min-w-5.5 font-mono text-xs tracking-widest group-aria-pressed:text-primary ${
                    e.done ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <span aria-hidden>{e.done ? '✓' : e.n}</span>
                </span>
                <span className="text-sm tracking-tight text-foreground group-aria-pressed:font-bold">
                  {e.label}
                </span>
              </Button>
            ))}
          </nav>
        </Specimen>

        <Specimen
          source="step-configurator.tsx:90-110"
          tone="casse"
          note="44px · px-5 py-3 md:px-6 md:py-0 — un 5e padding · border-b-FOREGROUND : le seul filet noir pur sur une cellule de rail, tous les autres sont border-border · numéro orange au repos, avec w-7 en dur · et text-muted-foreground écrit deux fois de suite sur deux spans."
          frameClassName="p-0"
        >
          <div className="flex flex-col bg-background">
            {[
              { num: '01', label: 'Plateau', summary: 'Live · journée' },
              { num: '02', label: 'Vues', summary: '120 produits' },
            ].map((q) => (
              <Button
                key={q.num}
                variant="cell"
                size="cell"
                className="min-h-11 w-full flex-row items-center gap-3 border-b border-b-foreground px-5 py-3 md:gap-3.5 md:px-6 md:py-0"
              >
                <span className="w-7 shrink-0 font-mono text-xs font-normal uppercase tracking-widest text-primary">
                  {q.num}
                </span>
                <span className="shrink-0 font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">
                  {q.label}
                </span>
                <span className="min-w-0 flex-1 text-balance text-right font-mono text-xs tracking-tight text-foreground">
                  {q.summary}
                </span>
                <span className="shrink-0 font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">
                  Modifier
                </span>
              </Button>
            ))}
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Mobile — la même chaîne de classes copiée trois fois"
      note="min-h-14 w-full gap-4 border-b border-border px-4 py-3 text-left : identique au caractère près dans postprod, plateau et legal. Trois arrangements internes différents, et un quatrième rail mobile qui fait le même travail dans une typographie opposée."
    >
      <SpecimenGrid min="250px">
        <Specimen
          source="postprod-page.tsx:413-439"
          tone="copie"
          note="Colonne : titre au-dessus de la tagline (gap-0.5)."
          frameClassName="p-0"
        >
          <div className="flex flex-col bg-background">
            {PRESTATIONS.slice(0, 3).map((p, i) => (
              <Button
                key={p.n}
                variant="cell"
                size="cell"
                aria-current={i === 0 ? 'page' : undefined}
                className={`${DRAWER_CELL} ${i === 0 ? 'dark' : ''} flex-row items-center`}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-base tracking-tight">{p.name}</span>
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {p.price}
                  </span>
                </span>
                <ArrowRight className="ml-auto" />
              </Button>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="plateau-page.tsx:318-342"
          tone="copie"
          note="À plat : tagline poussée par ml-auto. Mêmes classes de cellule."
          frameClassName="p-0"
        >
          <div className="flex flex-col bg-background">
            {PLATEAUX.slice(0, 3).map((p, i) => (
              <Button
                key={p.n}
                variant="cell"
                size="cell"
                aria-current={i === 0 ? 'page' : undefined}
                className={`${DRAWER_CELL} ${i === 0 ? 'dark' : ''} flex-row items-center`}
              >
                <span className="text-base tracking-tight">{p.name}</span>
                <span className="ml-auto font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {p.tag}
                </span>
                <ArrowRight />
              </Button>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="ui/mobile-nav-strip.tsx:212-256"
          tone="copie"
          note="Même rôle, typographie opposée : font-mono text-sm uppercase tracking-widest au lieu de text-base sans. border-T au lieu de border-b. Marqueur carré dessiné à la main, aucun aria-current, et un vrai <input type=radio sr-only> — le seul radio du site."
          frameClassName="p-0"
        >
          <fieldset className="flex flex-col border-0 bg-background p-0">
            {['Tout', 'Cyclorama', 'Horizontal'].map((label, i) => (
              <label
                key={label}
                className={`flex min-h-11 cursor-pointer items-center gap-3 border-t border-border px-4 py-3 transition-colors duration-150 hover:bg-muted ${
                  i === 0 ? 'dark' : ''
                } ${i === 2 ? 'opacity-40' : ''}`}
              >
                <input
                  type="radio"
                  name="inv-strip"
                  className="sr-only"
                  defaultChecked={i === 0}
                />
                <span className="grid size-4 shrink-0 place-items-center border border-foreground bg-background">
                  {i === 0 && <span className="size-1.5 bg-foreground" />}
                </span>
                <span className="font-mono text-sm uppercase tracking-widest">
                  {label}
                </span>
                <span className="ml-auto font-mono text-xs tracking-widest text-muted-foreground">
                  {12 - i * 4}
                </span>
              </label>
            ))}
          </fieldset>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Rails hors gabarit"
      note="Deux listes qui font le même travail sans passer par variant=&quot;rail&quot; : elles n'ont donc ni le liseré orange ni la portée dark."
    >
      <SpecimenGrid min="250px">
        <Specimen
          source="assistant-chat.tsx:262-275"
          tone="copie"
          note="Actif = bg-muted seul : pas de liseré orange, pas de portée dark. Une 6e écriture de la sélection."
          frameClassName="p-0"
        >
          <div className="flex flex-col bg-background">
            {[
              'Devis packshot 120 réf.',
              'Dispo cyclorama juin',
              'Tarif vidéo',
            ].map((label, i) => (
              <Button
                key={label}
                variant="ghost"
                size="cell"
                className={`w-full gap-1 px-4.5 py-3 text-left ${i === 0 ? 'bg-muted' : ''}`}
              >
                <span className="truncate text-sm">{label}</span>
                <span className="font-mono text-xs tracking-wide text-muted-foreground">
                  12 févr.
                </span>
              </Button>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="nav-menu.tsx:53-98"
          tone="copie"
          note="min-h-13 (52px), une 6e hauteur. Actif = aria-[current=page]:text-primary seul, sans fond ni liseré. Écrit en <a> brut plutôt qu'en variant=&quot;header&quot;."
          frameClassName="p-0"
        >
          <div className="flex flex-col bg-background">
            {['Galerie', 'Plateaux', 'Post-production'].map((label, i) => (
              <a
                key={label}
                href="#rails"
                aria-current={i === 0 ? 'page' : undefined}
                className="relative flex min-h-13 cursor-pointer flex-col justify-between gap-1 border-b border-border px-4 py-2.5 text-foreground no-underline outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground aria-[current=page]:text-primary"
              >
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  0{i + 1}
                </span>
                <span className="mt-auto text-base text-current">{label}</span>
              </a>
            ))}
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>
  </Section>
);
