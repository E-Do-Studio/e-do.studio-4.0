import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';
import { cn } from '@/lib/utils';

// Les couleurs du thème sont peintes par `style={{ background: 'var(--x)' }}`
// et non par une classe : `bg-${name}` construit à l'exécution ne serait jamais
// généré par Tailwind. La valeur affichée est donc celle que le navigateur
// résout réellement.

const THEME_COLORS = [
  { name: '--background', value: 'oklch(1 0 0)' },
  { name: '--foreground', value: 'oklch(0.145 0 0)' },
  { name: '--card', value: 'oklch(1 0 0)' },
  { name: '--card-foreground', value: 'oklch(0.145 0 0)' },
  { name: '--popover', value: 'oklch(1 0 0)' },
  { name: '--popover-foreground', value: 'oklch(0.145 0 0)' },
  { name: '--primary', value: 'oklch(0.679 0.216 39)' },
  { name: '--primary-foreground', value: 'oklch(1 0 0)' },
  { name: '--secondary', value: 'oklch(0.97 0 0)' },
  { name: '--secondary-foreground', value: 'oklch(0.205 0 0)' },
  { name: '--muted', value: 'oklch(0.97 0 0)' },
  { name: '--muted-foreground', value: 'oklch(0.556 0 0)' },
  { name: '--destructive', value: 'oklch(0.577 0.245 27.325)' },
  { name: '--destructive-foreground', value: 'oklch(1 0 0)' },
  { name: '--border', value: 'oklch(0 0 0)' },
  { name: '--input', value: 'oklch(0.922 0 0)' },
  { name: '--ring', value: 'oklch(0.679 0.216 39)' },
];

const Swatch = ({
  value,
  name,
  sub,
}: {
  value: string;
  name: string;
  sub?: string;
}) => (
  <div className="flex min-w-0 flex-col gap-1">
    <div
      className="h-12 w-full border border-neutral-300"
      style={{ background: value }}
    />
    <code className="truncate font-mono text-[10px] text-neutral-700">
      {name}
    </code>
    {sub && (
      <code className="truncate font-mono text-[10px] text-neutral-500">
        {sub}
      </code>
    )}
  </div>
);

// Les 30 palettes de `postprod-page.tsx:63-93`, recopiées telles quelles : ce
// sont 90 hexadécimaux de données de design posés au milieu d'un composant de
// page, et le seul jeu de couleurs du site qu'aucun token ne couvre.
const POSTPROD_PALETTES: [string, string, string, string][] = [
  ['mono-a', '#f0f0f0', '#141414', '#bfbfbf'],
  ['mono-b', '#e8e8e8', '#2a2a2a', '#a8a8a8'],
  ['mono-c', '#dcdcdc', '#1a1a1a', '#8e8e8e'],
  ['mono-d', '#f5f5f5', '#141414', '#c8c8c8'],
  ['mono-e', '#c8c8c8', '#1a1a1a', '#7a7a7a'],
  ['warm-a', '#e8dfcf', '#2a241c', '#b8ad94'],
  ['warm-b', '#d9ccb0', '#3a2f20', '#a89674'],
  ['warm-c', '#f0e7d4', '#2a241c', '#c4b694'],
  ['warm-d', '#ddcfad', '#1f1a12', '#9e8a63'],
  ['warm-e', '#cab995', '#1a1610', '#8e7a52'],
  ['dark-a', '#1a1a1a', '#f0f0f0', '#3a3a3a'],
  ['dark-b', '#0f0f0f', '#e8e8e8', '#2a2a2a'],
  ['dark-c', '#141414', '#d8d8d8', '#333333'],
  ['dark-d', '#1f1f1f', '#f0f0f0', '#404040'],
  ['dark-e', '#0a0a0a', '#d0d0d0', '#262626'],
  ['mono-v-a', '#d8d8d8', '#141414', '#8a8a8a'],
  ['mono-v-b', '#ededed', '#2a2a2a', '#9e9e9e'],
  ['mono-v-c', '#c4c4c4', '#141414', '#7a7a7a'],
  ['mono-v-d', '#e0e0e0', '#1a1a1a', '#9a9a9a'],
  ['mono-v-e', '#b8b8b8', '#141414', '#707070'],
  ['warm-v-a', '#e0d2b4', '#2a241c', '#a8976e'],
  ['warm-v-b', '#cfbe9a', '#1f1a12', '#8e7a52'],
  ['warm-v-c', '#f2e7d0', '#2a241c', '#b8a47e'],
  ['warm-v-d', '#d4c5a2', '#1f1a12', '#9e8a63'],
  ['warm-v-e', '#c4b089', '#1a1610', '#7e6a42'],
  ['dark-v-a', '#111111', '#e8e8e8', '#2e2e2e'],
  ['dark-v-b', '#1c1c1c', '#f0f0f0', '#3e3e3e'],
  ['dark-v-c', '#0a0a0a', '#d0d0d0', '#262626'],
  ['dark-v-d', '#181818', '#e0e0e0', '#363636'],
  ['dark-v-e', '#050505', '#c8c8c8', '#1e1e1e'],
];

const RADIUS_CLASSES = [
  'rounded-xs',
  'rounded-sm',
  'rounded-md',
  'rounded-lg',
  'rounded-xl',
  'rounded-2xl',
  'rounded-3xl',
  'rounded-4xl',
  'rounded-none',
];

const Z_LAYERS = [
  { cls: 'z-10', n: 13, who: 'divers' },
  { cls: 'z-30', n: 6, who: 'assistant-chat.tsx:977' },
  { cls: 'z-40', n: 2, who: 'page-header.tsx:240 (header collant)' },
  { cls: 'z-50', n: 10, who: 'overlays' },
];

export const SectionTokens = () => (
  <Section
    id="tokens"
    title="Couleurs & mesures"
    count="17 tokens · 60 valeurs hors thème"
    intro="Le thème tient en dix-sept couleurs, un rayon et deux familles de police. Tout ce qui est peint en dehors de ces tokens est listé ici — y compris deux classes qui n'existent nulle part et une échelle de rayons qui vaut zéro sur toute sa longueur."
  >
    <Subsection title="Le thème — styles.css:81-105">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
        {THEME_COLORS.map((c) => (
          <Swatch
            key={c.name}
            value={`var(${c.name})`}
            name={c.name}
            sub={c.value}
          />
        ))}
      </div>
    </Subsection>

    <Subsection
      title="Couleurs hors thème"
      note="Chacune de ces valeurs est écrite en littéral dans un composant. La famille « sable » est utilisée comme couleur sémantique — « disponibilité partielle » du calendrier, fond de la carte de contact — sans jamais avoir été nommée."
    >
      <SpecimenGrid min="280px">
        <Specimen
          source="step-date.tsx:140,263 · contact-page.tsx:437 · gallery-page.tsx:64"
          tone="copie"
          note="Famille sable (H=82), 3 teintes, 3 fichiers, aucun token. Devrait être --sand / --sand-strong / --sand-border."
        >
          <div className="grid grid-cols-3 gap-3">
            <Swatch
              value="oklch(0.91 0.03 82)"
              name="0.91 0.03 82"
              sub="fond clair"
            />
            <Swatch
              value="oklch(0.86 0.045 82)"
              name="0.86 0.045 82"
              sub="fond plein"
            />
            <Swatch
              value="oklch(0.72 0.045 82)"
              name="0.72 0.045 82"
              sub="bordure"
            />
          </div>
        </Specimen>

        <Specimen
          source="preview-banner.tsx:46-73"
          tone="copie"
          note="Amber-500 et emerald-500 de la palette Tailwind par défaut, injectés en style inline. Le site n'a aucun vert ni ambre ailleurs. Plus la seule ombre inline du dépôt."
        >
          <div className="grid grid-cols-3 gap-3">
            <Swatch value="#f59e0b" name="#f59e0b" sub="statut brouillon" />
            <Swatch value="#10b981" name="#10b981" sub="statut publié" />
            <Swatch
              value="rgba(0,0,0,0.85)"
              name="rgba(0,0,0,.85)"
              sub="fond du bandeau"
            />
          </div>
        </Specimen>

        <Specimen
          source="contact-page.tsx:22-23"
          tone="casse"
          note="bg-metro-13 et bg-metro-14 ne sont définies ni dans styles.css ni dans un tailwind.config — il n'y en a pas. Tailwind ne génère rien : les deux pastilles rendent sans fond, et le texte blanc de la ligne 14 est invisible."
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-metro-13 text-xs font-bold tracking-normal text-black">
                13
              </span>
              Guy Môquet
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-metro-14 text-xs font-bold tracking-normal text-white">
                14
              </span>
              Saint-Ouen
            </div>
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Les 30 palettes de vignettes"
      note="Données de design en dur au milieu d'un composant de page — 90 hexadécimaux. La galerie en redéclare trois pour son propre générateur de vignette, avec les mêmes valeurs sous d'autres noms de clés."
    >
      <SpecimenGrid min="320px">
        <Specimen
          source="postprod-page.tsx:63-93"
          tone="copie"
          note="30 palettes × 3 couleurs. Devraient vivre dans lib/, ou venir du CMS."
        >
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
            {POSTPROD_PALETTES.map(([name, bg, a, b]) => (
              <div key={name} className="flex flex-col gap-0.5">
                <div className="flex h-8 border border-neutral-300">
                  <span className="flex-1" style={{ background: bg }} />
                  <span className="w-1/4" style={{ background: a }} />
                  <span className="w-1/4" style={{ background: b }} />
                </div>
                <code className="truncate font-mono text-[9px] text-neutral-500">
                  {name}
                </code>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="gallery-page.tsx:57-68"
          tone="copie"
          note="Mêmes #141414 / #bfbfbf / #b8ad94 / #2a2a2a que mono-a, warm-a et dark-b ci-contre, réécrits avec d'autres noms de clés (bgClass/accent/soft au lieu de bg/a/b) pour un second générateur SVG parallèle."
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              ['mono', 'var(--muted)', '#141414', '#bfbfbf'],
              ['dark', 'var(--foreground)', '#f5f5f5', '#2a2a2a'],
              ['warm', 'oklch(0.91 0.03 82)', '#141414', '#b8ad94'],
            ].map(([name, bg, a, b]) => (
              <div key={name} className="flex flex-col gap-0.5">
                <div className="flex h-8 border border-neutral-300">
                  <span className="flex-1" style={{ background: bg }} />
                  <span className="w-1/4" style={{ background: a }} />
                  <span className="w-1/4" style={{ background: b }} />
                </div>
                <code className="truncate font-mono text-[9px] text-neutral-500">
                  {name}
                </code>
              </div>
            ))}
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Rayons — l'échelle est morte mais toujours écrite"
      note="--radius vaut 0, et les huit dérivés sont calculés dessus : rounded-xs à rounded-4xl valent tous zéro. Les carrés ci-dessous portent réellement ces classes."
    >
      <Specimen
        source="styles.css:104,153-160"
        tone="casse"
        note="~40 classes de rayon dans le dépôt, dont 9 seulement produisent un pixel (rounded-full). Les 14 rounded-none annulent un rayon qui n'existe pas. rounded-[min(var(--radius-md),10px)] de button.tsx calcule min(0,10px) = 0."
      >
        <div className="flex flex-wrap items-end gap-3">
          {RADIUS_CLASSES.map((cls) => (
            <div key={cls} className="flex flex-col items-center gap-1">
              <div className={cn('size-10 bg-foreground', cls)} />
              <code className="font-mono text-[9px] text-neutral-500">
                {cls}
              </code>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-full bg-primary" />
            <code className="font-mono text-[9px] text-primary">
              rounded-full
            </code>
          </div>
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Mesures — tokens face à leurs littéraux"
      note="Quatre mesures sont tokenisées. Trois d'entre elles cohabitent avec leur propre valeur écrite en dur, parfois dans le même gabarit de grille."
    >
      <SpecimenGrid min="300px">
        <Specimen
          source="styles.css:176-181"
          tone="canon"
          note="Les quatre mesures partagées, à l'échelle."
        >
          <div className="flex flex-col gap-2">
            {[
              ['--spacing-header', 'var(--spacing-header)', '3.5rem / 56px'],
              ['--spacing-logo', 'var(--spacing-logo)', '15rem / 240px'],
              ['--spacing-band', 'var(--spacing-band)', '2.75rem / 44px'],
              ['--spacing-cta', 'var(--spacing-cta)', '5.25rem / 84px'],
            ].map(([name, v, label]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="h-3 bg-foreground" style={{ width: v }} />
                <code className="font-mono text-[10px] text-neutral-600">
                  {name} — {label}
                </code>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen
          source="book-page.tsx · home-page.tsx:294 · contact-form.tsx:73"
          tone="copie"
          note="grid-rows-[var(--spacing-header)_44px_84px_…] — le token et sa valeur littérale dans le MÊME template. 44px est --spacing-band, 84px est --spacing-cta. 96px et 64px (contact) n'ont aucun token."
        >
          <div className="flex flex-col gap-2 font-mono text-[10px] text-neutral-600">
            <code className="block">
              grid-rows-[var(--spacing-header)_44px_84px_1.1fr_1.25fr_84px]
            </code>
            <code className="block">
              grid-rows-[96px_repeat(5,64px)_minmax(0,1fr)_auto]
            </code>
            <code className="block">
              grid-rows-[var(--spacing-header)_78px_minmax(0,1.58fr)_…]
            </code>
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Profondeur — 4 paliers, aucune échelle"
      note="Aucun token, aucun commentaire n'indique qui doit passer devant qui. z-20 est inutilisé."
    >
      <Specimen
        source="src/** (31 occurrences)"
        tone="copie"
        note="À tokeniser : --z-header, --z-overlay, --z-toast."
      >
        <div className="flex flex-wrap gap-4">
          {Z_LAYERS.map((z) => (
            <div key={z.cls} className="flex flex-col gap-1">
              <code className="font-mono text-xs text-foreground">{z.cls}</code>
              <code className="font-mono text-[10px] text-neutral-500">
                {z.n}× — {z.who}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Ombres — 4 occurrences, 4 valeurs"
      note="Le design est plat : filets 1px noirs, rayon zéro. Ces quatre ombres sont des corps étrangers."
    >
      <Specimen
        source="assistant-chat.tsx:977 · preview-banner.tsx:50 · 2 autres"
        tone="copie"
      >
        <div className="flex flex-wrap items-center gap-5 py-2">
          {['shadow-sm', 'shadow-md', 'shadow-2xl'].map((cls) => (
            <div key={cls} className="flex flex-col items-center gap-2">
              <div className={cn('size-12 bg-background', cls)} />
              <code className="font-mono text-[9px] text-neutral-500">
                {cls}
              </code>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <div
              className="size-12 bg-background"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
            />
            <code className="font-mono text-[9px] text-neutral-500">
              inline
            </code>
          </div>
        </div>
      </Specimen>
    </Subsection>
  </Section>
);
