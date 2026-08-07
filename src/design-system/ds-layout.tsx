import { MonoLabel } from '@/ui/mono-label';
import { PageHeader } from '@/ui/page-header';
import { SectionIntro } from '@/ui/section-intro';
import { StatusBadge } from '@/ui/status-badge';
import { StepHeading } from '@/ui/step-heading';
import { cn } from '@/lib/utils';
import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled, Variants } from './block';
import { PageMap } from './page-map';

// Les douze coquilles, chacune telle qu'elle est écrite dans sa page — gabarits
// et placements repris mot pour mot, pas retranscrits. `PageMap` les rend à
// l'échelle : c'est le moteur de grille qui calcule les vignettes, donc aucune
// ne peut diverger de la page qu'elle montre.
//
// Les mettre côte à côte est ce qu'aucun fichier de page ne peut faire. On y
// voit d'un coup que cinq pages partagent le gabarit du rail, que sept
// partagent `header + 1fr`, et que les valeurs restées singulières — les 78px
// de plateaux, les 300px du tunnel, les fractions décimales — n'ont personne à
// qui se comparer.
//
// Les gabarits sont réécrits en clair d'une entrée à l'autre, jamais extraits en
// constante partagée : c'est la répétition qui EST l'information. Cinq
// `var(--spacing-logo) repeat(3,minmax(0,1fr))` identiques se voient ; cinq
// `RAIL_3` ne se voient plus.
const COQUILLES = [
  {
    title: 'accueil',
    cols: 'repeat(12,minmax(0,1fr))',
    rows: 'var(--spacing-header) var(--spacing-band) var(--spacing-cta) 1.1fr 1.25fr var(--spacing-cta)',
    regions: [
      { label: 'bande', area: '1/1/2/13', tone: 'band' as const },
      { label: 'réseaux & clients', area: '2/1/3/13', tone: 'aside' as const },
      { label: 'e-commerce', area: '3/1/5/7' },
      { label: 'galerie', area: '3/7/5/13' },
      { label: 'showreel', area: '5/1/6/4' },
      { label: 'discovery', area: '6/1/7/4', tone: 'aside' as const },
      { label: 'cyclorama', area: '5/4/7/7' },
      {
        label: 'réserver puis post-prod',
        area: '5/7/7/10',
        tone: 'cta' as const,
      },
      { label: 'assistant', area: '5/10/7/13', tone: 'aside' as const },
    ],
    note: 'La seule page à 12 colonnes, et la seule à déclarer un gabarit sous le palier. La cellule d’action est elle-même une sous-grille à deux rangées : « Réserver » à la hauteur d’un pavé, « Post-production » sur le reste.',
  },
  {
    title: 'plateaux',
    cols: 'var(--spacing-logo) repeat(3,minmax(0,1fr))',
    rows: 'var(--spacing-header) 78px minmax(0,1.58fr) minmax(0,0.5fr) minmax(0,0.52fr)',
    regions: [
      { label: 'bande', area: '1/1/2/5', tone: 'band' as const },
      { label: 'rail', area: '2/1/6/2', tone: 'rail' as const },
      { label: 'visuel', area: '2/2/4/4' },
      { label: 'vignettes', area: '4/2/5/4' },
      { label: 'description', area: '5/2/6/4' },
      { label: 'nom', area: '2/4/3/5', tone: 'aside' as const },
      { label: 'caractéristiques', area: '3/4/4/5', tone: 'aside' as const },
      { label: 'tarifs', area: '4/4/5/5', tone: 'aside' as const },
      { label: 'réserver', area: '5/4/6/5', tone: 'cta' as const },
    ],
    note: 'Les seules fractions décimales du site, et le seul 78px. Rien ne leur répond ailleurs.',
  },
  {
    title: 'post-production',
    cols: 'var(--spacing-logo) minmax(0,1fr) auto',
    rows: 'var(--spacing-header) minmax(0,1fr) auto',
    regions: [
      { label: 'bande', area: '1/1/2/4', tone: 'band' as const },
      { label: 'rail', area: '2/1/3/2', tone: 'rail' as const },
      { label: 'note', area: '3/1/4/2', tone: 'aside' as const },
      { label: 'panneau', area: '2/2/3/3' },
      { label: 'devis', area: '3/2/4/3', tone: 'cta' as const },
      {
        label: 'mosaïque',
        area: '2/3/4/4',
        // La piste est en `auto` : sa largeur vient de la cellule, qui la déduit
        // de la hauteur d'écran. Ici la hauteur de la vignette de référence.
        width: 'calc((900px - var(--spacing-header) - 1px) * 8 / 15)',
      },
    ],
    note: 'Trois rangées : la note du rail et le pavé de devis partagent la rangée de pied, sans quoi leurs deux filets tombent à 7px l’un de l’autre.',
  },
  {
    title: 'galerie',
    cols: 'var(--spacing-logo) repeat(3,minmax(0,1fr))',
    rows: 'var(--spacing-header) minmax(0,1fr)',
    regions: [
      { label: 'bande', area: '1/1/2/5', tone: 'band' as const },
      { label: 'filtres', area: '2/1/3/2', tone: 'rail' as const },
      { label: 'projets', area: '2/2/3/5' },
    ],
    note: 'La coquille elle-même ne déclare aucune colonne : ses deux cellules enjambent tout. Le gabarit dessiné ici est celui de la grille intérieure.',
  },
  {
    title: 'contact',
    cols: 'var(--spacing-logo) repeat(3,minmax(0,1fr))',
    rows: 'var(--spacing-header) minmax(0,1fr)',
    regions: [
      { label: 'bande', area: '1/1/2/5', tone: 'band' as const },
      { label: 'coordonnées', area: '2/1/3/2', tone: 'rail' as const },
      { label: 'formulaire', area: '2/2/3/4' },
      { label: 'plan & équipe', area: '2/4/3/5', tone: 'aside' as const },
    ],
    note: 'Sa colonne de gauche n’est pas un rail : elle peint ses gouttières entre blocs, là où le rail peint un fond continu.',
  },
  {
    title: 'mentions légales',
    cols: 'var(--spacing-logo) repeat(3,minmax(0,1fr))',
    rows: 'var(--spacing-header) minmax(0,1fr)',
    regions: [
      { label: 'bande', area: '1/1/2/5', tone: 'band' as const },
      { label: 'sommaire', area: '2/1/3/2', tone: 'rail' as const },
      { label: 'texte', area: '2/2/3/5' },
    ],
    note: 'Déclare quatre pistes et n’en distingue que deux : le contenu fusionne les trois dernières. Le gabarit garde l’alignement des filets avec ses voisines.',
  },
  {
    title: 'discovery',
    cols: 'var(--spacing-logo) repeat(3,minmax(0,1fr))',
    rows: 'var(--spacing-header) var(--spacing-band) minmax(0,1.6fr) minmax(0,1fr) var(--spacing-cta)',
    regions: [
      { label: 'bande', area: '1/1/2/5', tone: 'band' as const },
      { label: 'réseaux & clients', area: '2/1/3/5', tone: 'aside' as const },
      { label: 'rail', area: '3/1/5/2', tone: 'rail' as const },
      { label: 'article en une', area: '3/2/5/4' },
      { label: 'autres articles', area: '3/4/4/5' },
      { label: 'assistant', area: '4/4/5/5', tone: 'aside' as const },
      { label: 'newsletter', area: '5/1/6/3' },
      { label: 'réserver', area: '5/3/6/5', tone: 'cta' as const },
    ],
    note: 'Écrite dans l’ordre de lecture mobile : pas une classe `order-*` n’est nécessaire, le placement fait tout.',
  },
  {
    title: 'article',
    rows: 'var(--spacing-header) var(--spacing-band) minmax(0,1fr)',
    regions: [
      { label: 'bande', area: '1/1/2/2', tone: 'band' as const },
      { label: 'retour au journal', area: '2/1/3/2', tone: 'aside' as const },
      { label: 'article', area: '3/1/4/2' },
    ],
    note: 'Seule page dont le gabarit de rangées n’est pas gardé par palier : le même rythme à toutes les largeurs. Le verrou de défilement, lui, l’est.',
  },
  {
    title: 'réserver',
    cols: 'var(--spacing-logo) repeat(3,minmax(0,1fr))',
    rows: 'var(--spacing-header) minmax(0,1fr)',
    regions: [
      { label: 'bande', area: '1/1/2/5', tone: 'band' as const },
      { label: 'coordonnées', area: '2/1/3/2', tone: 'rail' as const },
      { label: 'deux voies', area: '2/2/3/4' },
      { label: 'plan & équipe', area: '2/4/3/5', tone: 'aside' as const },
    ],
    note: 'Reprend les deux cellules de contact telles quelles — même gabarit, mêmes composants.',
  },
  {
    title: 'tunnel',
    cols: 'var(--spacing-logo) minmax(0,1fr) minmax(0,1fr) 300px',
    rows: 'var(--spacing-header) minmax(0,1fr)',
    regions: [
      { label: 'bande', area: '1/1/2/5', tone: 'band' as const },
      { label: 'étapes', area: '2/1/3/2', tone: 'rail' as const },
      { label: 'configurateur', area: '2/2/3/4' },
      { label: 'devis', area: '2/4/3/5', tone: 'aside' as const },
    ],
    note: 'La quatrième piste est le seul 300px du site. Son rail est un `<nav>` nommé, pas un `<aside>`.',
  },
  {
    title: 'confirmation',
    cols: 'var(--spacing-logo) minmax(0,1fr)',
    rows: 'var(--spacing-header) minmax(0,1fr)',
    regions: [
      { label: 'bande', area: '1/1/2/3', tone: 'band' as const },
      { label: 'récapitulatif', area: '2/1/3/3' },
    ],
    note: 'Deux pistes déclarées, une seule cellule qui les enjambe : la colonne du sigle n’y sert qu’à aligner le filet de la bande.',
  },
  {
    title: 'confirmation — repli',
    rows: 'var(--spacing-header) minmax(0,1fr)',
    regions: [
      { label: 'bande', area: '1/1/2/2', tone: 'band' as const },
      { label: 'reprendre', area: '2/1/3/2' },
    ],
    note: 'La branche sans réservation en mémoire. Elle posait `h-full` sans son verrou de défilement, et n’avait aucun repère de contenu.',
  },
];

export const DsLayout = () => (
  <Section
    id="miseenpage"
    title="Mise en page"
    count="3 composants · 1 mécanisme de filet"
    intro="Le site est une application à viewport fixe : une bande d'en-tête, une grille bento, des panneaux qui défilent chacun de leur côté. Le filet entre deux cellules est une gouttière, jamais une bordure."
  >
    <Subsection title="La gouttière">
      <Block
        name="gap-px bg-border"
        summary="Le conteneur est noir, les cellules peignent leur propre fond, le gap-px laisse voir le noir. C'est le seul mécanisme qui s'aligne sur les grilles de page — une bordure tombe sur un pixel voisin et le trait double aux jonctions."
        file="src/ui/page-header.tsx — CELL_GUTTERS"
        replaces="2 conventions → 1"
        frameClassName="p-0"
        api={`<div className="grid grid-cols-3 gap-px bg-border">
  <div className="bg-background p-5">…</div>
</div>`}
      >
        <div className="grid grid-cols-3 gap-px bg-border">
          {['A', 'B', 'C', 'D', 'E', 'F'].map((c) => (
            <div
              key={c}
              className="bg-background px-5 py-8 text-center text-sm"
            >
              {c}
            </div>
          ))}
        </div>
      </Block>
    </Subsection>

    <Subsection
      title="PageShell"
      note="Douze pages redessinaient la même coquille à la main : la grille, le verrou de viewport, et la bande d'en-tête avec son placement recopié à l'identique dix fois — la onzième copie se contredisant elle-même. Les écarts qui restaient étaient exactement ceux qu'une coquille unique rend impossibles : un app:overflow-hidden oublié, un overflow-hidden posé sans palier qui coupait un article sur mobile, un <main> absent qui laissait le lien d'évitement sans cible."
    >
      <Block
        name="PageShell"
        summary="La grille de la page, son verrou de viewport à partir d'app, et la bande d'en-tête. Le div rendu EST la grille — pas une boîte de plus, sans quoi display:contents et les col-start des cellules viseraient la mauvaise. Elle ne rend pas le <main> : huit pages le posent en contents, deux en font une vraie cellule."
        file="src/ui/page-shell.tsx"
        replaces="12 coquilles → 1"
        api={`<PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))]
                      app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
  <main id={MAIN_ID} className="contents">
    <Rail className="hidden app:col-start-1 app:row-start-2 app:flex" />
    <Panel className="app:col-start-2 app:col-span-2 app:row-start-2" />
  </main>
</PageShell>`}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              ['bg-neutral-800', 'bande d’en-tête'],
              ['bg-neutral-500', 'rail'],
              ['bg-neutral-100 border border-neutral-300', 'panneau'],
              ['bg-neutral-300', 'cellule d’appoint'],
              ['bg-primary', 'action'],
            ].map(([swatch, label]) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-[11px] text-neutral-600"
              >
                <span className={cn('block size-3 shrink-0', swatch)} />
                {label}
              </span>
            ))}
          </div>

          <div className="grid gap-x-5 gap-y-7 [grid-template-columns:repeat(auto-fill,minmax(min(288px,100%),1fr))]">
            {COQUILLES.map((c) => (
              <PageMap key={c.title} {...c} />
            ))}
          </div>
        </div>
      </Block>

      <Block
        name="Le gabarit reste dans la page"
        summary="Il n'est pas une variante cva de la coquille, et c'est délibéré : ce serait treize valeurs pour douze sites d'appel, dont dix à un seul appelant — une table de correspondance déguisée en type. Surtout, un columns=&quot;rail&quot; obligerait contact-page à savoir qu'il existe une quatrième piste pour que son app:col-start-4 se lise. Le gabarit et les placements sont une seule phrase."
        file="src/ui/page-shell.tsx"
        api={`{/* ✗ le gabarit part dans une variante, le col-start-4 devient illisible */}
<PageShell columns="rail">
  <ContactRightColumn className="app:col-start-4" />

{/* ✓ le gabarit et les placements se lisent ensemble */}
<PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))]">
  <ContactRightColumn className="app:col-start-4" />`}
      >
        <span className="text-sm leading-snug text-neutral-600">
          La duplication ne coûte rien ici parce que les gabarits sont déjà
          écrits en tokens partagés :{' '}
          <code className="font-mono text-[11px] text-primary">
            --spacing-logo
          </code>{' '}
          est la mesure de la cellule du sigle dans la bande. Le jour où
          l’alignement bouge, c’est le token qui bouge et les cinq copies
          suivent. Ce qui dérive dans ce dépôt, ce sont les mesures non
          tokenisées — jamais les structures qui le sont.
        </span>
      </Block>
    </Subsection>

    <Subsection
      title="PageHeader"
      note="La bande nomme la destination, le corps nomme le contenu. Deux niveaux, deux règles, et aucune des deux ne se passe en prop : le nom de page vient de pageLabelKey (src/lib/nav.ts), qui lit la même table que la navigation et le tiroir. Deux pages ne se nomment pas : l'accueil, dont le sigle voisin le dit déjà, et la 404, qui n'est nulle part. La cellule est vide dans les deux rendus ci-dessous, /dev n'étant pas une page du site."
    >
      <Block
        name="PageHeader"
        summary="La bande d'en-tête : logo, nom de la page, navigation, bascule de langue. Elle lit PageContext et l'URL — douze pages sur treize l'utilisent, aucune ne lui dit comment s'appeler."
        file="src/ui/page-header.tsx"
        replaces="3 sémantiques → 1"
        frameClassName="p-0"
        api={`<PageHeader className="col-span-full app:row-start-1" />`}
      >
        <div className="overflow-hidden border border-border">
          <PageHeader />
        </div>
      </Block>

      <Block
        name="PageHeader — note"
        summary="La seule fente que la bande laisse aux appelants : une information page-locale, dans sa propre cellule à droite du nom. L'accueil y met l'annonce du CMS, ou les horaires à défaut. Elle attend xl — mesuré, l'accueil débordait de 127px à 1024."
        file="src/ui/page-header.tsx"
        frameClassName="p-0"
        api={`<PageHeader note={<MonoLabel tone="muted">Lun–Sam, 10—18</MonoLabel>} />`}
      >
        <div className="overflow-hidden border border-border">
          <PageHeader
            note={<MonoLabel tone="muted">Lun–Sam, 10—18</MonoLabel>}
          />
        </div>
      </Block>
    </Subsection>

    <Subsection title="SectionIntro">
      <Variants min="320px">
        <Block
          name="SectionIntro"
          summary="Sur-titre, titre, chapô. Neuf variantes le rendaient — trois tailles de titre, huit paddings, quatre traitements du sur-titre."
          file="src/ui/section-intro.tsx"
          replaces="9 variantes → 1"
          frameClassName="p-0"
          api={`<SectionIntro kicker="Légal" title="Mentions légales"
              subtitle="Éditeur, hébergeur et propriété intellectuelle." />`}
        >
          <SectionIntro
            kicker="Légal"
            title="Mentions légales"
            subtitle="Éditeur, hébergeur et propriété intellectuelle du site e-do.studio."
          />
        </Block>

        <Block
          name="SectionIntro — bandeau de section"
          summary="La taille sm, pour un en-tête à l'intérieur d'une page. Le niveau de titre suit : h2 et non h1."
          file="src/ui/section-intro.tsx"
          frameClassName="p-0"
          api={`<SectionIntro size="sm" as="h2" kickerTone="pill"
              kicker="Confirmé" title="Votre réservation" />`}
        >
          <SectionIntro
            size="sm"
            as="h2"
            kickerTone="pill"
            kicker="Confirmé"
            title="Votre réservation"
            subtitle="Un e-mail de confirmation vient de vous être envoyé."
          />
        </Block>
      </Variants>

      <Block
        name="SectionIntro — size=&quot;flow&quot;"
        summary="Le corps de lg sans son retrait, pour un titre posé dans une cellule qui porte déjà le sien : l'article Discovery et la confirmation de réservation. Le padding de lg s'y serait ajouté au lieu de le remplacer."
        file="src/ui/section-intro.tsx"
        api={`<SectionIntro size="flow" title="Votre réservation est confirmée" />`}
      >
        <SectionIntro
          size="flow"
          title="Votre réservation est confirmée"
          subtitle="Un e-mail de confirmation vient de vous être envoyé."
        />
      </Block>

      <Labelled label="kickerTone">
        <div className="flex flex-wrap gap-px bg-border">
          {(['primary', 'muted', 'pill'] as const).map((tone) => (
            <div key={tone} className="flex-1 bg-background">
              <SectionIntro
                size="sm"
                as="h2"
                kickerTone={tone}
                kicker={`kickerTone="${tone}"`}
                title="Post-production"
              />
            </div>
          ))}
        </div>
      </Labelled>

      <Labelled label="kicker en nœud">
        {/* Le sur-titre accepte un composant, et c'est ce qui permet aux
            mentions légales et à la confirmation de passer par SectionIntro :
            l'un y pose son rang de section, l'autre son état. Rendu nu — un
            nœud apporte sa typographie, `kickerTone` ne vaut que pour du
            texte. */}
        <div className="flex flex-wrap gap-px bg-border">
          <div className="flex-1 bg-background">
            <SectionIntro
              size="sm"
              as="h2"
              kicker={<StepHeading number="02" title="Légal" />}
              title="Confidentialité"
              meta="Mis à jour le 12 mars"
            />
          </div>
          <div className="flex-1 bg-background">
            <SectionIntro
              size="sm"
              as="h2"
              kicker={<StatusBadge size="md">Confirmé</StatusBadge>}
              title="Votre réservation"
            />
          </div>
        </div>
      </Labelled>
    </Subsection>
  </Section>
);
