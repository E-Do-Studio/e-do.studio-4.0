import { createFileRoute } from '@tanstack/react-router';
import { SectionTokens } from '../../dev-inventory/s-tokens';
import { SectionTypography } from '../../dev-inventory/s-typography';
import { SectionButtons } from '../../dev-inventory/s-buttons';
import { SectionRails } from '../../dev-inventory/s-rails';
import { SectionForms } from '../../dev-inventory/s-forms';
import { SectionTiles } from '../../dev-inventory/s-tiles';
import { SectionNav } from '../../dev-inventory/s-nav';
import { SectionOverlays } from '../../dev-inventory/s-overlays';
import { SectionFeedback } from '../../dev-inventory/s-feedback';
import { SectionIcons } from '../../dev-inventory/s-icons';
import { SectionGrid } from '../../dev-inventory/s-grid';
import { SectionMotion } from '../../dev-inventory/s-motion';

// Inventaire visuel de tous les composants du site : la version de référence
// d'un motif et TOUTES ses copies divergentes, côte à côte, chacune légendée
// par son `fichier:ligne`.
//
// Outil interne, délibérément hors du système public :
//   — absent de `SCREEN_TO_PATH` (`lib/screens.ts`), de `sitemap.xml` et de la
//     nav. Ce n'est pas une page du site, ajouter son entrée en ferait une.
//   — `robots: noindex, nofollow`, pas de canonical, pas d'alternates.
//   — libellés en dur, sans i18n : ce sont des chaînes techniques
//     (`postprod-page.tsx:462`, « 5 hauteurs pour un même rail »), pas de
//     l'interface. Exception assumée à la règle i18n du CLAUDE.md.
//
// Le segment statique `dev/` passe avant `$lang`, dont le garde renvoie 404 sur
// une langue inconnue (`routes/$lang/route.tsx`) : `/dev/inventaire` ne peut pas
// être capté par lui.
//
// Aucun loader : la page doit s'ouvrir sans `.env` valide. Les composants qui
// attendent des données CMS reçoivent des props factices définies dans leur
// section.

const SECTIONS = [
  { id: 'tokens', label: 'Couleurs & mesures' },
  { id: 'typo', label: 'Typographie' },
  { id: 'boutons', label: 'Boutons & CTA' },
  { id: 'rails', label: 'Rails de cellules' },
  { id: 'formulaires', label: 'Formulaires' },
  { id: 'tuiles', label: 'Tuiles & cartes' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'feedback', label: 'États & feedback' },
  { id: 'icones', label: 'Icônes' },
  { id: 'filets', label: 'Filets & espacements' },
  { id: 'animation', label: 'Animation' },
];

function InventairePage() {
  return (
    // `h-full overflow-y-auto` et non `min-h-screen` : le CSS critique de
    // `__root.tsx:117` pose `overflow:hidden` sur html/body/#root au-dessus de
    // 768px — le site est une application à viewport fixe, où ce sont les
    // panneaux internes qui défilent. Un document long y serait simplement
    // rogné, sans molette. Sous le palier, la même règle repasse en
    // `height:auto; overflow:visible` : `h-full` retombe alors sur `auto` et la
    // page défile normalement avec le corps.
    <div className="h-full overflow-y-auto bg-neutral-50 text-foreground">
      <header className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-50/95 px-5 py-3 backdrop-blur md:px-8">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="font-mono text-sm uppercase tracking-widest">
            Inventaire des composants
          </h1>
          <p className="font-mono text-[11px] tracking-widest text-neutral-500">
            page interne — hors sitemap, noindex
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-5 py-8 md:px-8 lg:flex-row lg:gap-12">
        {/* Sommaire collant : douze sections, on ne veut pas remonter à chaque
            comparaison. Masqué sous `lg` où il volerait la largeur des
            échantillons — c'est précisément la largeur qui rend les écarts
            visibles. */}
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
          {/* Cette page est un CONSTAT daté, pas un état courant. Ses comptes
              décrivent le dépôt avant la migration vers le design system, et ils
              deviennent faux au fur et à mesure qu'elle avance. Le dire ici
              plutôt que de les laisser mentir : la valeur de la page est
              d'avoir figé le point de départ. */}
          <p className="border border-primary bg-primary/5 px-4 py-3 text-sm leading-relaxed text-neutral-800">
            <strong className="font-normal text-primary">
              Constat daté, avant migration.
            </strong>{' '}
            Les comptes ci-dessous décrivent le dépôt tel qu'il était au moment
            de l'audit. Plusieurs motifs ont depuis été migrés — les rails, les
            cellules de formulaire, les pavés d'action, les pastilles, les
            tiroirs mobiles. Le système retenu se lit sur{' '}
            <a
              href="/dev/design-system"
              className="text-primary underline underline-offset-2"
            >
              la page du design system
            </a>
            .
          </p>

          <p className="max-w-3xl text-sm leading-relaxed text-neutral-700">
            Chaque motif est rendu avec les vrais composants du dépôt. Les
            copies en JSX inline — qui ne sont pas des composants et ne peuvent
            donc pas être importées — sont reproduites par leur chaîne de
            classes exacte, relevée à la ligne indiquée. Une pastille{' '}
            <span className="bg-foreground px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-background">
              référence
            </span>{' '}
            marque la version qui devrait faire foi,{' '}
            <span className="bg-primary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary-foreground">
              cassé
            </span>{' '}
            un rendu qui ne fonctionne pas.
          </p>

          <SectionTokens />
          <SectionTypography />
          <SectionButtons />
          <SectionRails />
          <SectionForms />
          <SectionTiles />
          <SectionNav />
          <SectionOverlays />
          <SectionFeedback />
          <SectionIcons />
          <SectionGrid />
          <SectionMotion />
        </main>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/dev/inventaire')({
  head: () => ({
    meta: [
      { title: 'Inventaire des composants — e-do.studio' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: InventairePage,
});
