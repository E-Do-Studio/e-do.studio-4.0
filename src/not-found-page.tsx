import { useNavigate } from '@tanstack/react-router';
import { usePageContext } from './lib/page-context';
import { SCREEN_TO_PATH } from './lib/screens';
import type { Lang } from './types';
import { cn } from '@/lib/utils';
import { MonoLabel } from './ui/mono-label';
import { MAIN_ID } from './ui/skip-link';
import { Button } from '@/components/ui/button';

const COPY = {
  fr: {
    code: '404',
    title: 'Page introuvable',
    body: 'Cette page n’existe pas ou a été déplacée.',
    cta: 'Retour à l’accueil',
    explore: 'Sections principales',
    links: {
      gallery: 'Voir la galerie',
      cyclorama: 'Découvrir le cyclorama',
      book: 'Réserver un plateau',
      contact: 'Nous contacter',
    },
    breadcrumbHome: 'Accueil',
    breadcrumb404: 'Page introuvable',
  },
  en: {
    code: '404',
    title: 'Page not found',
    body: 'This page does not exist or has moved.',
    cta: 'Back to home',
    explore: 'Main sections',
    links: {
      gallery: 'Browse the gallery',
      cyclorama: 'Discover the cyclorama',
      book: 'Book a stage',
      contact: 'Contact us',
    },
    breadcrumbHome: 'Home',
    breadcrumb404: 'Page not found',
  },
} as const;

const SITE_ORIGIN = 'https://e-do.studio';

const breadcrumbJsonLd = (lang: Lang) => {
  const copy = COPY[lang];
  const homePath = SCREEN_TO_PATH.home(lang);
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: copy.breadcrumbHome,
        item: `${SITE_ORIGIN}${homePath}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.breadcrumb404,
      },
    ],
  });
};

interface NavLinkProps {
  href: string;
  label: string;
  navigate: (opts: { to: string }) => void;
}

// Les deux liens de cette page réécrivaient un bouton à la main — typographie
// mono, anneau de focus, transition, `no-underline` — soit quinze classes pour
// retrouver ce que `variant="cell"` donne déjà. `render` conserve la véritable
// ancre : elle garde son `href`, donc le clic milieu et le « ouvrir dans un
// nouvel onglet ».
const NavLink = ({ href, label, navigate }: NavLinkProps) => (
  <Button
    variant="cell"
    // biome-ignore lint/a11y/useAnchorContent: Base UI clone cette ancre avec les enfants du bouton — elle n'est vide qu'à la lecture statique
    render={<a href={href} />}
    onClick={(e) => {
      e.preventDefault();
      navigate({ to: href });
    }}
    className="border border-border px-4 py-2 hover:bg-muted"
  >
    {label}
  </Button>
);

export const NotFoundPage = () => {
  const { lang } = usePageContext();
  const navigate = useNavigate();
  const copy = COPY[lang];

  const homeHref = SCREEN_TO_PATH.home(lang);
  const galleryHref = SCREEN_TO_PATH.gallery(lang);
  const cycloramaHref = SCREEN_TO_PATH.cyclorama(lang);
  const bookHref = SCREEN_TO_PATH.book(lang);
  const contactHref = SCREEN_TO_PATH.contact(lang);

  return (
    // `id` et non un `<main>` nu : `SkipLink` est rendu par __root sur TOUTES
    // les pages, 404 comprise, et cherche `#contenu`. Sans lui, « aller au
    // contenu » ne faisait rien ici et laissait le focus sur `<body>` — le
    // même défaut que la confirmation de réservation, dernière occurrence.
    //
    // Cette page est la seule sans bande d'en-tête : elle n'est nulle part,
    // donc elle ne se nomme pas et ne porte pas la navigation du site. C'est
    // aussi pourquoi elle n'emploie pas `PageShell` — il n'y a pas de bento à
    // verrouiller, seulement un bloc centré.
    <main
      id={MAIN_ID}
      role="main"
      className={cn(
        'flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center text-foreground',
      )}
    >
      <MonoLabel tone="muted">{copy.code}</MonoLabel>
      <h1 className="text-3xl font-light tracking-tighter leading-tight">
        {copy.title}
      </h1>
      <p className="max-w-md font-mono text-sm text-muted-foreground">
        {copy.body}
      </p>
      <Button
        variant="cell"
        // biome-ignore lint/a11y/useAnchorContent: Base UI clone cette ancre avec les enfants du bouton — elle n'est vide qu'à la lecture statique
        render={<a href={homeHref} />}
        onClick={(e) => {
          e.preventDefault();
          navigate({ to: homeHref });
        }}
        className="dark h-10 gap-2 bg-background px-5 hover:opacity-90"
      >
        {copy.cta}
      </Button>
      <nav
        aria-label={copy.explore}
        className="mt-4 flex w-full max-w-xl flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
      >
        <NavLink
          href={galleryHref}
          label={copy.links.gallery}
          navigate={navigate}
        />
        <NavLink
          href={cycloramaHref}
          label={copy.links.cyclorama}
          navigate={navigate}
        />
        <NavLink href={bookHref} label={copy.links.book} navigate={navigate} />
        <NavLink
          href={contactHref}
          label={copy.links.contact}
          navigate={navigate}
        />
      </nav>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd(lang) }}
      />
    </main>
  );
};
