import { createFileRoute } from '@tanstack/react-router';
import { DsFoundations } from '../../design-system/ds-foundations';
import { DsActions } from '../../design-system/ds-actions';
import { DsLists } from '../../design-system/ds-lists';
import { DsSelection } from '../../design-system/ds-selection';
import { DsForms } from '../../design-system/ds-forms';
import { DsData } from '../../design-system/ds-data';
import { DsFeedback } from '../../design-system/ds-feedback';
import { DsLayout } from '../../design-system/ds-layout';
import { DsMedia } from '../../design-system/ds-media';
import { DsResponsive } from '../../design-system/ds-responsive';
import { ordinal } from '@/lib/format';

// Le design system du site : un composant par motif, ses densités légitimes
// rendues, son API en clair. Rien d'autre.
//
// Le pendant de `/dev/inventaire`, qui recense au contraire toutes les copies
// divergentes. Les deux pages se répondent : l'une constate, l'autre fait
// référence. Aucune copie n'est montrée ici — c'est le sens même de la page.
//
// Ces composants sont ceux du dépôt, importés depuis `src/ui/`. Une page qui
// les redessinerait en JSX local serait une copie de plus, ce qui est
// exactement le défaut qu'elle prétend corriger.
//
// Outil interne, hors du système public : absent de `SCREEN_TO_PATH`
// (`lib/screens.ts`) et de `sitemap.xml`, `robots: noindex, nofollow`, libellés
// techniques en dur — exception i18n assumée, ce ne sont pas des chaînes
// d'interface.

const SECTIONS = [
  { id: 'fondations', label: 'Fondations' },
  { id: 'actions', label: 'Actions' },
  { id: 'listes', label: 'Listes & nav' },
  { id: 'selection', label: 'Sélection' },
  { id: 'formulaires', label: 'Formulaires' },
  { id: 'donnees', label: 'Données' },
  { id: 'feedback', label: 'États & feedback' },
  { id: 'miseenpage', label: 'Mise en page' },
  { id: 'medias', label: 'Médias' },
  { id: 'paliers', label: 'Paliers' },
];

const PRINCIPLES = [
  {
    title: 'Un composant absorbe ses copies, ou il n’existe pas',
    body: 'Son API couvre tous les cas d’appel recensés. Un composant conçu pour deux appelants sur six garantit que les quatre autres ne migreront jamais.',
  },
  {
    title: 'La sémantique dans l’ARIA, le visuel dans la classe',
    body: 'aria-pressed porte l’état, la portée dark porte l’inversion — les enfants suivent d’eux-mêmes. Jamais on ? bg-primary : …',
  },
  {
    title: 'La gouttière, pas la bordure',
    body: 'gap-px bg-border : le conteneur est noir, les cellules peignent leur fond. Seul mécanisme qui s’aligne sur les grilles de page.',
  },
  {
    title: 'Toute valeur écrite deux fois est un token',
    body: 'Cinq hauteurs de rail et huit paddings n’étaient pas des choix, c’étaient des accidents. Trois paliers nommés qu’on ne peut pas improviser.',
  },
];

function DesignSystemPage() {
  return (
    // `h-full overflow-y-auto` et non `min-h-screen` : le CSS critique de
    // `__root.tsx` pose `overflow:hidden` sur html/body/#root au-dessus du
    // palier `app` — le site est une application à viewport fixe, où ce sont les
    // panneaux internes qui défilent. Un document long y serait rogné, sans
    // molette. Sous le palier, la règle repasse en `height:auto` et `h-full`
    // retombe sur `auto`.
    <div className="h-full overflow-y-auto bg-neutral-50 text-foreground">
      <header className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-50/95 px-5 py-3 backdrop-blur md:px-8">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="font-mono text-sm uppercase tracking-widest">
            Design system
          </h1>
          <p className="font-mono text-[11px] tracking-widest text-neutral-500">
            e-do.studio — page interne, hors sitemap, noindex
          </p>
          <a
            href="/dev/inventaire"
            className="ml-auto font-mono text-[11px] uppercase tracking-widest text-neutral-600 no-underline transition-colors hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
          >
            ← l’inventaire de l’existant
          </a>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-5 py-8 md:px-8 lg:flex-row lg:gap-12">
        <nav className="hidden shrink-0 lg:block lg:w-48">
          <ul className="sticky top-20 flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block py-1 font-mono text-[11px] uppercase tracking-widest text-neutral-600 no-underline transition-colors hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-12 pb-24">
          <section className="flex flex-col gap-4">
            <p className="max-w-3xl text-sm leading-relaxed text-neutral-700">
              Chaque composant ci-dessous est celui du dépôt, importé depuis{' '}
              <code className="font-mono text-[12px]">src/ui/</code>. Les
              variantes montrées sont ses densités et tonalités voulues — pas
              des copies. Le recensement de ce qu’il remplace vit dans{' '}
              <a
                href="/dev/inventaire"
                className="text-primary underline underline-offset-2"
              >
                l’inventaire
              </a>
              .
            </p>

            <div className="grid gap-px bg-neutral-300 sm:grid-cols-2">
              {PRINCIPLES.map((p, i) => (
                <div
                  key={p.title}
                  className="flex flex-col gap-1.5 bg-neutral-50 p-4"
                >
                  <span className="font-mono text-[11px] tabular-nums tracking-widest text-primary">
                    {ordinal(i)}
                  </span>
                  <h2 className="m-0 text-base font-normal leading-snug tracking-tight">
                    {p.title}
                  </h2>
                  <p className="m-0 text-sm leading-snug text-neutral-600">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <DsFoundations />
          <DsActions />
          <DsLists />
          <DsSelection />
          <DsForms />
          <DsData />
          <DsFeedback />
          <DsLayout />
          <DsMedia />
          <DsResponsive />
        </main>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/dev/design-system')({
  head: () => ({
    meta: [
      { title: 'Design system — e-do.studio' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: DesignSystemPage,
});
