import { useNavigate } from '@tanstack/react-router';
import { usePageContext } from './lib/page-context';
import { SCREEN_TO_PATH } from './lib/screens';
import type { Lang } from './types';
import { cn } from '@/lib/utils';

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

const NavLink = ({ href, label, navigate }: NavLinkProps) => (
  <a
    href={href}
    onClick={(e) => {
      e.preventDefault();
      navigate({ to: href });
    }}
    className="edo-focus-ring inline-flex items-center justify-center border border-hairline bg-transparent px-4 py-2 font-mono text-caption uppercase tracking-label text-foreground no-underline transition-colors hover:bg-muted"
  >
    {label}
  </a>
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
    <main
      role="main"
      className={cn(
        'flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center text-foreground',
      )}
    >
      <span className="font-mono text-label uppercase tracking-meta text-muted-foreground">
        {copy.code}
      </span>
      <h1 className="text-page-title font-light tracking-display leading-tight">
        {copy.title}
      </h1>
      <p className="max-w-md font-mono text-detail text-muted-foreground">
        {copy.body}
      </p>
      <a
        href={homeHref}
        onClick={(e) => {
          e.preventDefault();
          navigate({ to: homeHref });
        }}
        className="edo-focus-ring inline-flex h-10 cursor-pointer items-center gap-2 border-0 bg-foreground px-5 font-mono text-label uppercase tracking-ui text-white no-underline transition-colors hover:opacity-90"
      >
        {copy.cta}
      </a>
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
