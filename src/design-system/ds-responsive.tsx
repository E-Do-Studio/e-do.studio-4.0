import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled } from './block';

// Les paliers. C'est la seule section du design system qui ne montre pas un
// composant : elle décrit une règle que tous les autres appliquent.

const PALIERS = [
  {
    name: 'md',
    value: '768px',
    means: 'Il y a plus de place.',
    carries:
      'Retraits, corps de texte, ordre des cellules, ratios de la pile élargie. Rien qui décide de la mise en page.',
    count: '154 classes',
  },
  {
    name: 'app',
    value: '1024px',
    means: 'La grille bento plein écran s’applique.',
    carries:
      'Aires de grille, gabarits de colonnes et de rangées, h-full, overflow-hidden, min-h-0 — et le verrou de viewport qui va avec.',
    count: '291 classes',
  },
];

// Ce qui doit franchir le palier EN MÊME TEMPS. Un seul de ceux-là resté en
// arrière et la bande entre les deux perd sa navigation ou son assistant. Le
// dernier de la liste l'a prouvé une seconde fois.
const CONSUMERS = [
  ['src/styles.css', '--breakpoint-app', 'la variante `app:` elle-même'],
  [
    'src/routes/__root.tsx',
    '@media(max-width:1023px)',
    'le verrou height/overflow — recopié, une media query ne lit pas de custom property',
  ],
  [
    'src/ui/use-media-query.ts',
    'useIsDesktop = 1024px',
    'le pendant JS : ce qui est monté doit l’être là où sa cellule est peinte',
  ],
  [
    'src/ui/mobile-assistant-fab.tsx',
    'app:hidden',
    'le bouton flottant, qui disparaît là où la cellule apparaît',
  ],
  [
    'src/ui/mobile-nav-strip.tsx',
    'app:hidden',
    'la bande de filtres, remplacée par le rail du bento',
  ],
  [
    'src/ui/selection-drawer.tsx',
    'app:hidden',
    'le tiroir de sélection — il était resté en md:hidden, donc plateaux, post-prod et juridique n’avaient plus aucune navigation entre 768 et 1023',
  ],
];

export const DsResponsive = () => (
  <Section
    id="paliers"
    title="Paliers"
    count="2 paliers · 1 règle de conteneur"
    intro="Le site n’a que deux seuils, et ils ne disent pas la même chose. Il en a eu trois, qui disaient tous la même chose à des largeurs différentes : le tunnel basculait à sm, Discovery à lg, tout le reste à md, et le seul seuil JS valait md. L’inventaire les recensait sous le titre « 3 seuils pour une seule transformation »."
  >
    <Subsection
      title="Deux noms, deux décisions"
      note="Un palier unique portait les deux : « il y a plus de place », vrai à 768px, et « le bento s’applique », faux à 768px. Parce que la seconde décision était accrochée au seuil de la première, toute tablette recevait une grille de 12 colonnes prévue pour 1280 — 96px par tuile, dans lesquels « Horizontal » et « Packshot à plat » ne rentrent pas. Et comme le verrou de viewport partait du même seuil, ce qui dépassait n’était pas défilable : il était rogné."
    >
      <Block
        name="--breakpoint-app"
        summary="1024 n’est pas un chiffre choisi : c’est la mesure déjà faite dans page-header.tsx, où la bande complète demande 976px en français. La bande d’en-tête y était montée seule, et les grilles ne l’avaient jamais suivie — d’où 768–1023px, une grille de bureau sous un en-tête mobile."
        file="src/styles.css — @theme"
        replaces="3 seuils → 2"
        api={`@theme {
  --breakpoint-app: 64rem; /* 1024px */
}

/* Tailwind v4 en dérive la variante, rien d'autre à déclarer */
<div className="grid-cols-2 app:grid-cols-12" />`}
      >
        <div className="flex flex-col gap-px bg-neutral-300">
          {PALIERS.map((p) => (
            <div key={p.name} className="flex flex-col gap-1 bg-neutral-50 p-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <code className="font-mono text-xs tracking-widest text-primary">
                  {p.name}:
                </code>
                <code className="font-mono text-[11px] text-neutral-500">
                  {p.value}
                </code>
                <span className="text-sm font-medium text-foreground">
                  {p.means}
                </span>
                <span className="ml-auto font-mono text-[11px] tracking-widest text-neutral-400">
                  {p.count}
                </span>
              </div>
              <p className="m-0 text-sm leading-snug text-neutral-600">
                {p.carries}
              </p>
            </div>
          ))}
        </div>
      </Block>

      <Block
        name="Les six consommateurs du palier"
        summary="Ils bougent ensemble ou pas du tout. Le décalage a déjà eu lieu deux fois : la cellule de chat de Discovery apparaissait à md pendant que sa grille basculait à lg, laissant 768–1024px sans cellule ET sans bouton flottant. Puis SelectionDrawer, resté en md:hidden quand les rails arrivent à app — trois pages sans aucune navigation dans exactement la même bande."
        file="src/styles.css · __root.tsx · use-media-query.ts"
      >
        <div className="flex flex-col gap-px bg-neutral-300">
          {CONSUMERS.map(([file, decl, why]) => (
            <div
              key={file}
              className="flex flex-col gap-0.5 bg-neutral-50 px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <code className="font-mono text-[11px] text-neutral-500">
                  {file}
                </code>
                <code className="font-mono text-[11px] text-primary">
                  {decl}
                </code>
              </div>
              <span className="text-sm leading-snug text-neutral-600">
                {why}
              </span>
            </div>
          ))}
        </div>
      </Block>
    </Subsection>

    <Subsection
      title="Une page ne passe que du placement"
      note="Jamais une hauteur, jamais un ratio, jamais un retrait. C’est la raison pour laquelle la bande tablette n’avait aucun propriétaire : la géométrie vivait dans les className des pages, donc aucun composant n’était en position de la corriger, et il aurait fallu la réparer autant de fois qu’il y avait de sites d’appel."
    >
      <Block
        name="Ce qu'une page a le droit d'écrire"
        summary="L'accueil passait à SelectTile un px-3 md:px-4 — deux valeurs plus petites que le canon de 20px que la tuile porte elle-même, pendant que --tile-pad restait à 20 : un footer y aurait tracé son filet au mauvais retrait. Il passait à CtaCell un h-36 md:h-auto, si bien que la hauteur du pavé se décidait au site d'appel et que rien ne la tenait dans la pile élargie."
        file="src/ui/select-tile.tsx · src/ui/cta-cell.tsx"
        replaces="18 overrides → placement seul"
        api={`{/* ✗ la page redessine le composant */}
<SelectTile className="aspect-[4/3] px-3 py-3 md:px-4 md:py-4" />
<CtaCell className="h-36 md:h-auto md:min-h-0" />

{/* ✓ la page place, le composant se dessine */}
<SelectTile className="h-full w-full" />
<CtaCell className="col-span-1 app:col-start-4 app:row-start-5" />`}
      >
        <div className="flex flex-col gap-2">
          <Labelled label="au composant">
            <span className="text-sm leading-snug text-neutral-600">
              hauteurs, ratios, retraits, typographie — et leurs paliers. Une
              size cva les porte tous les trois d’un coup :{' '}
              <code className="font-mono text-[11px] text-primary">
                min-h-36 md:min-h-44 app:min-h-cta
              </code>
              .
            </span>
          </Labelled>
          <Labelled label="à la page">
            <span className="text-sm leading-snug text-neutral-600">
              l’aire de grille, et rien d’autre :{' '}
              <code className="font-mono text-[11px] text-primary">
                col-start / row-start / col-span
              </code>
              .
            </span>
          </Labelled>
          <Labelled label="à la page, aussi">
            <span className="text-sm leading-snug text-neutral-600">
              son propre gabarit de grille, sur{' '}
              <code className="font-mono text-[11px] text-primary">
                PageShell
              </code>
              . Ce n’est pas de la géométrie passée à un composant, c’est la
              page qui se déclare — et c’est la même phrase que les{' '}
              <code className="font-mono text-[11px] text-primary">
                col-start
              </code>{' '}
              de ses cellules. Elle l’écrit en tokens, donc elle ne peut pas
              dériver de la bande d’en-tête.
            </span>
          </Labelled>
        </div>
      </Block>
    </Subsection>

    <Subsection
      title="Le conteneur plutôt que la fenêtre"
      note="Une grille imbriquée dont la largeur ne suit pas celle de la fenêtre se mesure au conteneur. Le tunnel le faisait déjà — sa colonne de contenu et la fenêtre divergent dès que le panneau de devis entre en scène ; la rangée de machines de l'accueil, elle, vit dans une sous-colonne de 6/12 et se réglait pourtant sur le viewport."
    >
      <Block
        name="@container"
        summary="Réglée sur md:grid-cols-4, la rangée passait à quatre de front dès 768px, quelle que soit la largeur réelle de la colonne qui la contient. Elle mesure maintenant ce qui la contient : deux de front en dessous de 512px de conteneur, quatre au-dessus — la même règle vaut à 1024 dans le bento et à 900 dans la pile."
        file="src/home-page.tsx · src/book/steps/*"
        api={`<div className="@container/machines">
  <div className="grid grid-cols-2 @lg/machines:grid-cols-4">…</div>
</div>`}
      >
        <span className="text-sm leading-snug text-neutral-600">
          Le viewport reste le bon outil pour ce qui EST plein écran — la bande
          d’en-tête, le verrou de hauteur, la grille de page elle-même. Le
          conteneur prend le relais dès qu’on descend d’un niveau.
        </span>
      </Block>
    </Subsection>

    <Subsection
      title="Ne pas tronquer"
      note="Un texte coupé par une ellipse ne se répare pas au palier suivant : il ment à toutes les largeurs. Les tuiles de l'accueil passaient titre et sous-titre par HoverMarquee, ce qui posait whitespace-nowrap et annulait le break-words du titre comme le lines=&quot;multi&quot; du sous-titre. Et HoverMarquee ne défile que derrière (hover: hover) and (pointer: fine) : sur une tablette tactile — précisément la largeur où ça se produisait — le texte restait tronqué sans aucun moyen de le révéler."
    >
      <Block
        name="break-words plutôt que text-ellipsis"
        summary="En dernier recours le mot se coupe, ce qui est moins mauvais qu'un texte tronqué. Un titre qui se replie se lit sans qu'on ait à le survoler."
        file="src/ui/select-tile.tsx"
        replaces="2 branches → 1"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled label="✗ tronqué — 96px de colonne">
            <div className="w-24 border border-neutral-300 bg-background p-2">
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-base leading-tight">
                Horizontal
              </span>
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Packshot à plat
              </span>
            </div>
          </Labelled>
          <Labelled label="✓ replié — même 96px">
            <div className="w-24 border border-neutral-300 bg-background p-2">
              <span className="block text-balance break-words text-base leading-tight">
                Horizontal
              </span>
              <span className="block text-pretty font-mono text-xs uppercase leading-snug tracking-widest text-muted-foreground">
                Packshot à plat
              </span>
            </div>
          </Labelled>
        </div>
      </Block>
    </Subsection>
  </Section>
);
