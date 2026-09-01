import { MonoLabel } from '@/ui/mono-label';
import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled, Variants } from './block';

// Les fondations : ce que tout le reste consomme. Chaque valeur ici est un
// token — c'est la règle qui gouverne le système : toute mesure écrite deux
// fois devient un nom.

const BRAND = [
  ['--background', 'Le fond du site, et celui de chaque cellule.'],
  ['--foreground', 'Le texte, et les filets de la grille.'],
  ['--primary', "L'orange du studio. La seule couleur d'accent."],
  ['--muted', 'Le fond des états survolés et sélectionnés.'],
  ['--muted-foreground', 'Le texte secondaire.'],
  [
    '--border',
    'Noir pur — des séparateurs suisses francs, pas un gris de preset.',
  ],
  ['--destructive', "L'erreur. Nulle part ailleurs."],
];

const SAND = [
  ['--sand', 'oklch(0.91 0.03 82)', 'survol d’un jour partiellement libre'],
  [
    '--sand-strong',
    'oklch(0.86 0.045 82)',
    'fond d’un jour partiellement libre',
  ],
  [
    '--sand-border',
    'oklch(0.72 0.045 82)',
    'sa bordure, sa pastille de légende',
  ],
];

const SPACING = [
  ['--spacing-header', 'var(--spacing-header)', '56px — la bande d’en-tête'],
  ['--spacing-logo', 'var(--spacing-logo)', '240px — la colonne du logo'],
  [
    '--spacing-band',
    'var(--spacing-band)',
    '44px — bande sociale, retour d’article',
  ],
  [
    '--spacing-cta',
    'var(--spacing-cta)',
    '84px — pavé d’action de bas de page',
  ],
  ['--spacing-tap', 'var(--spacing-tap)', '44px — cible tactile'],
  [
    '--spacing-col-head',
    'var(--spacing-col-head)',
    '96px — bande d’en-tête de colonne',
  ],
  [
    '--spacing-col-row',
    'var(--spacing-col-row)',
    '64px — rangée de champ, le module partagé entre colonnes',
  ],
  [
    '--spacing-rail-compact',
    'var(--spacing-rail-compact)',
    '32px — libellé seul',
  ],
  [
    '--spacing-rail-default',
    'var(--spacing-rail-default)',
    '44px — numéro + libellé',
  ],
  ['--spacing-rail-tall', 'var(--spacing-rail-tall)', '72px — + 3e ligne'],
  [
    '--spacing-pad-tight',
    'var(--spacing-pad-tight)',
    '16px — colonne serrée (plateau)',
  ],
  [
    '--spacing-pad-cell',
    'var(--spacing-pad-cell)',
    '20px — le canon, porté par size="cell"',
  ],
  [
    '--spacing-pad-section',
    'var(--spacing-pad-section)',
    '24px — cellule de section (contact)',
  ],
];

const TYPE_SCALE = [
  [
    'text-5xl font-light tracking-tighter leading-none',
    'Titre de page',
    'Post-production',
  ],
  // Le barreau que la table taisait : c'est ce que `SectionIntro` rend pour
  // `lg` et `flow` — titre d'article, en-tête du picker de réservation, de la
  // confirmation, du formulaire de contact. Il existait dans le composant
  // depuis le début ; la doc était en retard sur lui, pas l'inverse.
  [
    'text-4xl font-light tracking-tighter leading-none',
    "Titre de tunnel, d'article",
    'Post-production',
  ],
  [
    'text-3xl font-light tracking-tighter leading-none',
    'Titre de section',
    'Post-production',
  ],
  [
    'text-2xl font-light tracking-tighter leading-none',
    'Titre de cellule',
    'Post-production',
  ],
  ['text-base', 'Corps', 'Le studio ouvre à 9 h, du lundi au vendredi.'],
  ['text-sm', 'Corps dense, cellules', 'Le studio ouvre à 9 h.'],
  ['text-xs', 'Mention, légende', 'Tarif hors taxes'],
];

export const DsFoundations = () => (
  <Section
    id="fondations"
    title="Fondations"
    count="1 échelle par rôle"
    intro="Deux familles de police, sept couleurs de marque, une échelle typographique, huit mesures nommées. Rien d'autre n'est autorisé : une valeur écrite deux fois devient un token."
  >
    <Subsection title="Couleurs de marque">
      <Block
        name="Palette"
        summary="Sept tokens portent tout le site. L'orange est la seule couleur d'accent ; le noir pur des filets est un choix de marque, pas le gris du preset."
        file="src/styles.css"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BRAND.map(([name, role]) => (
            <div key={name} className="flex min-w-0 flex-col gap-1.5">
              <div
                className="h-14 w-full border border-neutral-300"
                style={{ background: `var(${name})` }}
              />
              <code className="font-mono text-[10px] text-foreground">
                {name}
              </code>
              <span className="text-xs leading-snug text-neutral-600">
                {role}
              </span>
            </div>
          ))}
        </div>
      </Block>
    </Subsection>

    <Subsection title="Sable — la quatrième couleur">
      <Block
        name="--sand"
        summary="Une famille de trois teintes (H=82) qui porte un sens : « partiellement disponible » sur le calendrier du tunnel. Elle vivait en littéral dans trois fichiers, sans nom."
        file="src/styles.css"
        replaces="3 littéraux oklch"
      >
        <div className="grid grid-cols-3 gap-4">
          {SAND.map(([name, value, role]) => (
            <div key={name} className="flex min-w-0 flex-col gap-1.5">
              <div
                className="h-14 w-full border border-neutral-300"
                style={{ background: `var(${name})` }}
              />
              <code className="font-mono text-[10px] text-foreground">
                {name}
              </code>
              <code className="font-mono text-[10px] text-neutral-500">
                {value}
              </code>
              <span className="text-xs leading-snug text-neutral-600">
                {role}
              </span>
            </div>
          ))}
        </div>
      </Block>
    </Subsection>

    <Subsection title="Mesures">
      <Block
        name="Espacements nommés"
        summary="Huit mesures, à l'échelle. Les densités de rail remplacent cinq hauteurs accidentelles ; la cible tactile remplace 38 min-h-11 posés à la main."
        file="src/styles.css — @theme"
        replaces="5 hauteurs → 3 paliers"
      >
        <div className="flex flex-col gap-2">
          {SPACING.map(([name, value, role]) => (
            <div key={name} className="flex items-center gap-3">
              <span
                className="h-3 shrink-0 bg-foreground"
                style={{ width: value }}
              />
              <code className="shrink-0 font-mono text-[10px] text-foreground">
                {name}
              </code>
              <span className="min-w-0 truncate text-xs text-neutral-600">
                {role}
              </span>
            </div>
          ))}
        </div>
      </Block>
    </Subsection>

    <Subsection title="Typographie">
      <Variants min="320px">
        <Block
          name="Échelle"
          summary="Un rôle, une signature. Les titres partagent tous font-light tracking-tighter leading-none — c'est ce qui fait l'identité, et c'était écrit quatorze fois à la main. SectionIntro en a repris quatre ; les dix restantes sont des chiffres et des phrases d'accroche, pas des titres de page."
          file="src/styles.css"
        >
          <div className="flex flex-col gap-4">
            {TYPE_SCALE.map(([cls, role, sample]) => (
              <div key={cls} className="flex flex-col gap-1">
                <code className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  {role}
                </code>
                <span className={cls}>{sample}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block
          name="MonoLabel"
          summary="Le libellé mono capitale : catégories, méta d'article, intitulés de cellule, en-têtes de section. L'atome le plus fréquent du site."
          file="src/ui/mono-label.tsx"
          replaces="19 signatures → 1"
          api={`<MonoLabel tone="primary">Coulisses</MonoLabel>
<MonoLabel tone="muted">12 févr. 2026</MonoLabel>
<MonoLabel render={<dt />}>Durée</MonoLabel>`}
        >
          <div className="flex flex-col gap-3">
            <Labelled label='tone="foreground" — défaut'>
              <MonoLabel>Post-production</MonoLabel>
            </Labelled>
            <Labelled label='tone="primary"'>
              <MonoLabel tone="primary">Post-production</MonoLabel>
            </Labelled>
            <Labelled label='tone="muted"'>
              <MonoLabel tone="muted">Post-production</MonoLabel>
            </Labelled>
          </div>
        </Block>
      </Variants>
    </Subsection>
  </Section>
);
