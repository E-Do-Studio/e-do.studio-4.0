import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Circle,
  Lock,
  Menu,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { SocialIcon } from '@/ui/social-icon';
import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';

// `styles.css:199-201` pose `.lucide { stroke-width: 1.5 }` globalement : une
// seule règle couvre toutes les icônes, et les attributs de présentation
// perdent contre elle. Deux endroits l'ignorent, et quatorze utilisent un
// caractère typographique là où une icône déjà importée existe.

const LUCIDE = [
  { Icon: ArrowRight, name: 'ArrowRight', n: '14 fichiers' },
  { Icon: ArrowLeft, name: 'ArrowLeft', n: '3' },
  { Icon: X, name: 'X', n: '7' },
  { Icon: ChevronsUpDown, name: 'ChevronsUpDown', n: '3' },
  { Icon: ChevronDown, name: 'ChevronDown', n: '1' },
  { Icon: Lock, name: 'Lock', n: '2' },
  { Icon: Menu, name: 'Menu', n: '1' },
  { Icon: Plus, name: 'Plus', n: '1' },
  { Icon: Minus, name: 'Minus', n: '1' },
  { Icon: Trash2, name: 'Trash2', n: '1' },
  { Icon: RotateCcw, name: 'RotateCcw', n: '1' },
];

// Les glyphes utilisés comme icônes, et l'icône Lucide déjà présente dans le
// dépôt qui fait le même travail.
const GLYPHS: { g: string; where: string; Icon: typeof ArrowRight }[] = [
  {
    g: '→',
    where:
      'newsletter-cell.tsx:60 · step-configurator.tsx:153 · shared.tsx:63,143',
    Icon: ArrowRight,
  },
  {
    g: '←',
    where:
      'booking-mode-banner.tsx:54 · book-confirmation.tsx:277 · step-date.tsx:167',
    Icon: ArrowLeft,
  },
  {
    g: '✓',
    where: 'step-team.tsx:52 · booking-stepper.tsx:123 · contact-form.tsx:191',
    Icon: Check,
  },
  { g: '↺', where: 'ui/mobile-nav-strip.tsx:273', Icon: RotateCcw },
  {
    g: '●',
    where: 'book/shared.tsx:60,140 · step-configurator.tsx:394',
    Icon: Circle,
  },
  { g: '×', where: 'steps/session-tabs.tsx:104', Icon: X },
];

export const SectionIcons = () => (
  <Section
    id="icones"
    title="Icônes"
    count="1 librairie · 14 glyphes concurrents"
    intro="Lucide est la seule librairie, et son épaisseur de trait est imposée par une règle CSS unique. Quatorze endroits lui préfèrent un caractère typographique : il ne suit pas l'épaisseur, ne s'aligne pas optiquement sur les size-4 voisines, change de dessin selon la fonte de repli, et ne déclenche pas la compensation de padding de data-icon."
  >
    <Subsection title="Lucide — stroke-width 1.5 imposé par styles.css:199-201">
      <Specimen source="lucide-react — 21 fichiers" tone="canon">
        <div className="flex flex-wrap gap-5">
          {LUCIDE.map(({ Icon, name, n }) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <Icon className="size-5" />
              <code className="font-mono text-[9px] text-neutral-500">
                {name}
              </code>
              <code className="font-mono text-[9px] text-neutral-400">{n}</code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Glyphes utilisés comme icônes — 14 sites"
      note="À gauche le caractère, à droite l'icône Lucide déjà importée ailleurs dans le dépôt qui fait exactement le même travail. Regardez l'épaisseur de trait et l'alignement sur la ligne de base."
    >
      <Specimen
        source="6 formes sur 14 sites"
        tone="copie"
        note="Aucun ne suit stroke-width: 1.5, aucun ne réagit à data-icon=&quot;inline-end&quot;."
      >
        <div className="flex flex-col divide-y divide-neutral-200">
          {GLYPHS.map(({ g, where, Icon }) => (
            <div
              key={g}
              className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2.5"
            >
              <span className="flex w-24 shrink-0 items-center gap-4">
                <span className="w-6 text-center text-base leading-none">
                  {g}
                </span>
                <Icon className="size-4" />
              </span>
              <code className="min-w-0 flex-1 font-mono text-[10px] text-neutral-500">
                {where}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Dimensionnement — deux anomalies"
      note="Les attributs width/height sont des attributs de présentation : ils perdent contre le CSS."
    >
      <SpecimenGrid min="280px">
        <Specimen
          source="book-page.tsx:562"
          tone="casse"
          note="<ArrowRight width=&quot;14&quot; height=&quot;14&quot;/> dans un Button : la base pose [&_svg:not([class*='size-'])]:size-4. La flèche sort à 16px, la demande de 14 est ignorée en silence."
        >
          <span className="inline-flex items-center gap-3">
            <ArrowRight width="14" height="14" />
            <code className="font-mono text-[10px] text-neutral-500">
              demandé 14px → rendu 16px
            </code>
          </span>
        </Specimen>
        <Specimen
          source="nav-menu.tsx:65"
          tone="copie"
          note="<Lock width=&quot;9&quot; height=&quot;9&quot;/> hors bouton : là, l'attribut passe. 9px est la seule icône du site à cette taille — le reste est 12, 14 ou 16."
        >
          <span className="inline-flex items-center gap-3">
            <Lock width="9" height="9" />
            <code className="font-mono text-[10px] text-neutral-500">9px</code>
          </span>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="SVG dessinés à la main"
      note="Lucide a retiré les logos de marque en v1 : les redessiner est légitime. Leur épaisseur de trait, elle, ne l'est pas."
    >
      <Specimen
        source="ui/social-icon.tsx:26-47"
        tone="copie"
        note="strokeWidth: 1.4 au lieu de 1.5. L'écart se voit quand les icônes sociales côtoient une icône Lucide dans SocialLinksRow."
      >
        <div className="flex items-center gap-5">
          {['instagram', 'facebook', 'linkedin', 'tiktok'].map((n) => (
            <SocialIcon key={n} kind={n} size={20} />
          ))}
          <span className="ml-4 border-l border-neutral-300 pl-5">
            <ArrowRight className="size-5" />
          </span>
          <code className="font-mono text-[10px] text-neutral-500">
            1.4 · 1.4 · 1.4 · 1.4 | 1.5
          </code>
        </div>
      </Specimen>
    </Subsection>
  </Section>
);
