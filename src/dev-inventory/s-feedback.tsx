import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';

// Badge existe et sert deux fois. Sept pastilles sont dessinées à la main
// ailleurs. Aucun Skeleton n'existe — il a été supprimé par le dernier commit,
// pendant que postprod-page.tsx continuait d'en réimplémenter un.

const BADGES = [
  {
    source: 'src/components/ui/badge.tsx',
    tone: 'canon' as const,
    note: '2 usages, tous deux dans home-page.tsx.',
    render: <Badge>Bientôt</Badge>,
  },
  {
    source: 'postprod-page.tsx:506',
    tone: 'copie' as const,
    note: 'bg-primary px-2 py-0.5',
    render: (
      <span className="bg-primary px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-primary-foreground">
        Nouveau
      </span>
    ),
  },
  {
    source: 'postprod-page.tsx:218',
    tone: 'copie' as const,
    note: 'bg-background/55 px-1.5 py-0.5 — surimpression sur média',
    render: (
      <span className="bg-background/55 px-1.5 py-0.5 font-mono text-xs uppercase tracking-widest">
        Vidéo
      </span>
    ),
  },
  {
    source: 'book-confirmation.tsx:108',
    tone: 'copie' as const,
    note: 'bg-primary py-1.5 px-3 + role="status" — 2e padding pour la même pastille orange',
    render: (
      <span className="bg-primary px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-primary-foreground">
        Confirmé
      </span>
    ),
  },
  {
    source: 'step-team.tsx:114',
    tone: 'copie' as const,
    note: 'border border-primary px-1.5 py-0.5 — contour au lieu de fond',
    render: (
      <span className="border border-primary px-1.5 py-0.5 font-mono text-xs uppercase tracking-widest text-primary">
        Inclus
      </span>
    ),
  },
  {
    source: 'mobile-nav-strip.tsx:166',
    tone: 'copie' as const,
    note: 'h-5 min-w-5 px-1 — compteur circulaire carré',
    render: (
      <span className="inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1 font-mono text-xs uppercase tracking-widest text-primary-foreground">
        3
      </span>
    ),
  },
  {
    source: 'assistant-chat.tsx:977',
    tone: 'casse' as const,
    note: 'rounded-sm shadow-md — le seul rounded-* effectif du site alors que --radius vaut 0, et une ombre dans un design plat.',
    render: (
      <span className="rounded-sm bg-primary px-2 py-1 font-mono text-xs uppercase tracking-widest text-primary-foreground shadow-md">
        1 message
      </span>
    ),
  },
];

const FOCUS = [
  {
    cls: 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground',
    source: 'button.tsx:47 — canon',
    tone: 'canon' as const,
    note: 'Décalage NÉGATIF : tracé à l’intérieur, pour ne pas être recouvert par la cellule bento voisine. 19.8:1 sur blanc.',
  },
  {
    cls: 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
    source: 'checkbox.tsx:11 · switch.tsx:17',
    tone: 'copie' as const,
    note: 'Décalage POSITIF. Ces deux contrôles vivent dans des cellules bento : leur anneau est partiellement recouvert — exactement le défaut que button.tsx documente comme résolu.',
  },
  {
    cls: 'focus-within:border-foreground',
    source: 'newsletter-cell.tsx:43',
    tone: 'copie' as const,
    note: 'Une bordure et non un outline : le champ se décale d’un pixel au focus.',
  },
];

export const SectionFeedback = () => (
  <Section
    id="feedback"
    title="États & feedback"
    count="7 badges faits main · 0 skeleton"
    intro="Empty couvre bien les états vides — cinq usages. Le chargement, lui, n'a aucun composant : la galerie, Discovery, post-prod et plateau rendent du vide pendant le chargement, et le Skeleton qui aurait servi a été supprimé au commit précédent."
  >
    <Subsection
      title="États vides"
      note="La primitive est adoptée à cinq endroits. Cinq autres écrivent leur propre état vide."
    >
      <SpecimenGrid min="290px">
        <Specimen
          source="src/components/ui/empty.tsx"
          tone="canon"
          note="Trois échelles : compact, default (min-h-96), page (min-h-screen)."
          frameClassName="p-0"
        >
          <Empty size="compact">
            <EmptyHeader>
              <EmptyTitle>Aucun projet</EmptyTitle>
              <EmptyDescription>
                Aucun résultat pour ces filtres.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Specimen>

        <Specimen
          source="legal-page.tsx:364"
          tone="copie"
          note="Un <p> centré. Devrait être Empty size=&quot;compact&quot;."
        >
          <p className="py-12 text-center text-sm text-muted-foreground">
            Document indisponible.
          </p>
        </Specimen>

        <Specimen
          source="book-confirmation.tsx:313-338"
          tone="copie"
          note="Une PAGE entière ad hoc — kicker, h1 text-5xl, paragraphe, bouton — là où Empty size=&quot;page&quot; existe."
        >
          <div className="flex flex-col items-start gap-3 px-5 py-10">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Réservation
            </span>
            <h3 className="m-0 text-5xl font-light leading-none tracking-tighter">
              Introuvable
            </h3>
            <p className="m-0 max-w-2xl text-sm text-muted-foreground">
              Cette réservation n’existe plus.
            </p>
            <Button className="mt-4 h-11 gap-2 px-6">Retour à l’accueil</Button>
          </div>
        </Specimen>

        <Specimen
          source="contact-page.tsx:318"
          tone="copie"
          note="Le repli « indisponible » est un <span> en opacity-50 avec un suffixe littéral « · offline »."
        >
          <span className="block font-mono text-xs uppercase tracking-widest opacity-50">
            Horaires · offline
          </span>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Chargement — aucun composant"
      note="Deux sites animent quelque chose. Partout ailleurs, un rectangle blanc tient lieu de repli, y compris dans les Suspense fallbacks de l'accueil et de Discovery."
    >
      <SpecimenGrid min="260px">
        <Specimen
          source="step-date.tsx:125"
          tone="copie"
          note="Le seul chargement qui se voie : une couleur pulsée, avec motion-safe."
        >
          <span className="font-mono text-xs uppercase tracking-widest text-primary motion-safe:animate-pulse">
            Chargement des disponibilités…
          </span>
        </Specimen>
        <Specimen
          source="home-page.tsx:447-451 · discovery-pages.tsx:132"
          tone="casse"
          note="Suspense fallback = <div aria-hidden className=&quot;… bg-background&quot;/>. Un rectangle blanc : rien n’indique qu’il se passe quelque chose."
        >
          <div
            aria-hidden
            className="h-24 w-full border border-dashed border-neutral-300 bg-background"
          />
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Pastilles — 7 faites main pour 1 primitive"
      note="Même rôle, sept géométries. Deux paddings pour la seule pastille orange pleine."
    >
      <Specimen
        source="7 fichiers"
        tone="copie"
        note="La dernière est la seule du site à porter un rayon effectif et une ombre — dans un design à --radius: 0 et sans ombre."
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {BADGES.map((b) => (
            <div key={b.source} className="flex flex-col items-start gap-1.5">
              {b.render}
              <code className="font-mono text-[10px] text-neutral-500">
                {b.source}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Focus — 5 traitements"
      note="Tabulez dans les échantillons. Le canon est réécrit à la main dans cinq fichiers qui n'utilisent pas Button."
    >
      <SpecimenGrid min="290px">
        {FOCUS.map((f) => (
          <Specimen
            key={f.source}
            source={f.source}
            tone={f.tone}
            note={f.note}
          >
            <button
              type="button"
              className={`bg-muted px-4 py-2 font-mono text-xs uppercase tracking-widest outline-none ${f.cls}`}
            >
              Tabulez ici
            </button>
          </Specimen>
        ))}
        <Specimen
          source="contact-page.tsx:496"
          tone="casse"
          note="Aucun focus-visible du tout : le lien e-mail de l’équipe est invisible au clavier."
        >
          <a
            href="#feedback"
            className="self-center font-mono text-xs tracking-widest text-primary no-underline"
          >
            Tabulez ici — rien ne se passe
          </a>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Sélection — 3 mécanismes"
      note="Le premier est le bon : aria-pressed porte la sémantique, la portée dark porte le visuel et inverse aussi les enfants. Trois composants du dossier book/ utilisent encore le deuxième, qui n'inverse rien."
    >
      <SpecimenGrid min="240px">
        <Specimen
          source="book/shared.tsx:38-41 — 21 sites"
          tone="canon"
          note="dark bg-background : les enfants gardent text-muted-foreground et rendent le gris clair adéquat."
        >
          <div className="dark flex flex-col gap-1 bg-background p-4">
            <span className="font-mono text-xs tracking-widest text-muted-foreground">
              01
            </span>
            <span className="text-base">Live</span>
          </div>
        </Specimen>
        <Specimen
          source="booking-stepper.tsx:33 · book-picker.tsx:36 · step-date.tsx:259"
          tone="copie"
          note="bg-primary : n’inverse pas les enfants, il faut donc recolorier chacun à la main."
        >
          <div className="flex flex-col gap-1 bg-primary p-4 text-primary-foreground">
            <span className="font-mono text-xs tracking-widest text-primary-foreground/75">
              01
            </span>
            <span className="text-base">Live</span>
          </div>
        </Specimen>
        <Specimen
          source="src/ui/rail-cell.tsx"
          tone="canon"
          note="aria-pressed porte l’état, l’inversion porte le visuel. Aucun ternaire de couleur au site d’appel."
        >
          <Button
            variant="cell"
            size="cell"
            aria-pressed
            className="dark w-full justify-start bg-background px-4 py-2"
          >
            Cyclorama
          </Button>
        </Specimen>
      </SpecimenGrid>
    </Subsection>
  </Section>
);
