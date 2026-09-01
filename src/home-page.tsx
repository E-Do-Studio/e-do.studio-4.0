import { Button } from '@/components/ui/button';
import { useLoaderData } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useT } from './i18n/use-t';
import { usePageContext } from './lib/page-context';
import { SocialClientsBar } from './social-clients-bar';
import type { Bilingual } from './types';
import { fetchPriority } from './ui/fetch-priority';
import { ImageCrossfade } from './ui/image-crossfade';
import { MobileAssistantFab } from './ui/mobile-assistant-fab';
import { PageShell } from './ui/page-shell';
import { ResponsiveImage } from './ui/responsive-image';
import { SectionIntro } from './ui/section-intro';
import { MAIN_ID } from './ui/skip-link';
import { useIsDesktop } from './ui/use-is-desktop';
import { VideoLoop } from './ui/video-loop';
import { ordinal } from './lib/format';
import { HoverMarquee } from './ui/hover-marquee';
import { MonoLabel } from './ui/mono-label';
import { SelectTile } from './ui/select-tile';
import { SCREEN_TO_PATH } from './lib/screens';
import { CtaCell } from './ui/cta-cell';

const AssistantChat = lazy(() => import('./assistant-chat'));

interface MachineRowItem {
  slug: string;
  fr: { t: string; sub: string };
  en: { t: string; sub: string };
}

// Sous-titres imposés aux machines servies par Strapi. Ce n'est pas de l'UI
// traduite mais un override de contenu CMS, consommé bilingue des deux côtés à
// la fois (cf. ecomMachines) : il reste donc en Bilingual, hors i18next.
const MACHINE_SUB_OVERRIDES: Record<string, Bilingual> = {
  horizontal: { fr: 'Packshot à plat', en: 'Flat packshot' },
  vertical: { fr: 'Packshot ghost / piqué', en: 'Ghost / pinned packshot' },
  eclipse: {
    fr: 'Photo et vidéo objets et access',
    en: 'Object & accessory photo / video',
  },
  live: { fr: 'Photo et vidéo Porté', en: 'On-model photo & video' },
};

// Rendered before Strapi resolves so the four ecommerce cells don't flash
// empty on first refresh. Titles match the Strapi `machines` collection and
// subs mirror MACHINE_SUB_OVERRIDES (the same overrides we apply at runtime).
const HOME_FALLBACK_MACHINES: MachineRowItem[] = [
  {
    slug: 'horizontal',
    fr: { t: 'Horizontal', sub: 'Packshot à plat' },
    en: { t: 'Horizontal', sub: 'Flat packshot' },
  },
  {
    slug: 'vertical',
    fr: { t: 'Vertical', sub: 'Packshot ghost / piqué' },
    en: { t: 'Vertical', sub: 'Ghost / pinned packshot' },
  },
  {
    slug: 'eclipse',
    fr: { t: 'Éclipse', sub: 'Photo et vidéo objets et access' },
    en: { t: 'Eclipse', sub: 'Object & accessory photo / video' },
  },
  {
    slug: 'live',
    fr: { t: 'Live', sub: 'Photo et vidéo Porté' },
    en: { t: 'Live', sub: 'On-model photo & video' },
  },
];

const HomePage = () => {
  const t = useT();
  const { lang, goto, siteData } = usePageContext();
  const isDesktop = useIsDesktop();
  const { machines } = siteData;
  const { announcement, homeHero } = useLoaderData({ from: '/$lang/' });
  const announcementText = announcement?.[lang]?.trim() ?? '';
  // SHOWREEL cell (small video tile): always video, as it was before EDO-176.
  // The multi-image rotation lives on the GALERIE cell (see below).
  const heroCmsVideo = homeHero?.videoUrl;
  const heroPosters = homeHero?.posters ?? [];
  const galleryHasCmsPosters = heroPosters.length > 0;
  const galleryUseCrossfade = heroPosters.length >= 2;
  const heroUseFallback = !heroCmsVideo;
  const heroVideo =
    heroCmsVideo ?? (heroUseFallback ? '/videos/showreel.mp4' : undefined);
  const heroVideoPoster = heroUseFallback
    ? '/showreel-preview.webp'
    : undefined;
  // Aperçu statique en couche de base de la cellule showreel ; quand le CMS
  // fournit une vidéo, VideoLoop apparaît par-dessus en fondu.
  const heroShowStaticPicture = !heroCmsVideo;
  // Subtitles for the homepage machine grid are pinned in the codebase so
  // marketing wording stays consistent regardless of Strapi content.
  const ecomMachines: MachineRowItem[] = machines
    ? machines
        .filter((m) => m.slug !== 'cyclorama')
        .map((m) => {
          const override = MACHINE_SUB_OVERRIDES[m.slug];
          return {
            slug: m.slug,
            fr: { t: m.fr.t, sub: override?.fr ?? m.fr.sub },
            en: { t: m.en.t, sub: override?.en ?? m.en.sub },
          };
        })
    : HOME_FALLBACK_MACHINES;

  return (
    /* Sous `app` : grille à 2 colonnes qui défile. À partir d'`app` : bento à 12
       colonnes, viewport verrouillé. */
    /* La grille bento impose que l'en-tête et le contenu soient frères dans le
       même conteneur : le `<header>` se retrouvait donc DANS le `<main>`, où il
       perd son rôle `banner` et où « aller au contenu » atterrit avant la
       navigation. `<main class="contents">` rétablit les deux repères sans
       introduire de boîte — les cellules restent des enfants directs de la
       grille. */
    /* ── Rangée 1 : la bande, rendue par la coquille ──
       L'accueil ne se nomme pas — le sigle est à sa gauche et le dit déjà —,
       donc les horaires occupent la cellule du nom. Courts, ils y tiennent ;
       l'annonce du CMS, plus longue, attend `xl` et sa propre cellule. Les deux
       se masquent d'elles-mêmes là où leur cellule est trop étroite, c'est la
       bande qui s'en charge. */
    <PageShell
      className="grid-cols-2 app:grid-cols-12 app:grid-rows-[var(--spacing-header)_var(--spacing-band)_var(--spacing-cta)_1.1fr_1.25fr_var(--spacing-cta)]"
      note={
        <HoverMarquee>
          <MonoLabel tone="muted">{t('home.monSatHours')}</MonoLabel>
        </HoverMarquee>
      }
      aside={
        announcementText ? (
          <span className="flex min-w-0 items-center gap-2 font-mono text-base font-bold text-foreground">
            {/* Carré, comme tout le reste : `--radius` vaut 0 dans ce système,
                et `rounded-full` est le seul rayon qui échappe au jeton — il
                pose 9999px en dur. Un rond posé au milieu de filets droits n'est
                pas une variation, c'est un corps étranger. */}
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 shrink-0 bg-primary"
            />
            {/* HoverMarquee et non `truncate` : le texte vient du CMS et peut
                  dépasser sa cellule. L'ellipse dit seulement qu'on cache ;
                  le déroulé au survol donne à lire. */}
            <HoverMarquee className="uppercase">
              {announcementText}
            </HoverMarquee>
          </span>
        ) : undefined
      }
    >
      <main id={MAIN_ID} className="contents">
        <h1 className="sr-only">E-Do Studio — {t('home.srTitle')}</h1>

        {/* ── Row 2: Social links + clients marquee ── */}
        <SocialClientsBar className="col-span-2 app:col-start-1 app:col-end-13 app:row-start-2" />

        {/* ── Bande haute gauche : e-commerce ── */}
        <div className="col-span-2 min-h-72 flex flex-col overflow-hidden bg-background app:col-start-1 app:col-end-7 app:row-start-3 app:row-end-5 app:min-h-0">
          {/* Deux chaînes nues, plus de `<Trans>` : les balises `<accent>`
                  et `<strong>` qu'elles portaient n'existaient que pour un mot
                  en italique orange et une phrase coupée en deux gris. L'orange
                  de ce site est celui d'une action — le CTA « Réserver », la
                  pastille d'annonce — et n'a jamais désigné un mot pour
                  l'emphase ailleurs. Les mots sont inchangés, le traitement
                  décoratif est parti.

                  `SectionIntro` et non un `<h2>` dessiné ici : cette cellule
                  était la seule de la page à écrire sa propre typographie de
                  titre, et elle en avait dérivé — un `clamp()`, le seul du
                  dépôt, qui rendait à 31.68px entre deux crans de l'échelle, et
                  un chapô en monospace de casse mixte, seule phrase courante en
                  chasse fixe du site. */}
          {/* `flex-1` : sans lui personne n'absorbe la hauteur restante de la
              cellule, et elle s'accumule SOUS la rangée de tuiles — mesuré, 305px
              de blanc à 1600×900. C'est ce que le commentaire ci-dessous décrit
              déjà (« le bloc de texte au-dessus absorbe ce qui reste ») ; il
              manquait la classe qui le fait. */}
          <SectionIntro
            size="sm"
            as="h2"
            title={t('home.studioHeadline')}
            subtitle={t('home.studioSubtitle')}
            className="flex-1 app:min-h-0"
          />

          {/* Les filets entre tuiles sont la gouttière de la grille, pas des
            bordures posées sur chaque tuile : plus de calcul de bordure selon
            l'index, et plus de doublon là où le parent dessine déjà un filet.
            Seul le trait supérieur, qui sépare cette rangée du bloc de texte,
            appartient à la grille elle-même. */}
          {/* `@container/machines` et non le viewport : cette rangée vit dans
              une sous-colonne de 6/12, dont la largeur n'a aucun rapport fixe
              avec la fenêtre. Réglée sur `md:grid-cols-4`, elle passait à
              quatre de front dès 768px — soit 96px par tuile, dans lesquels
              « Horizontal » et « Packshot à plat » ne rentrent pas. Elle
              mesure maintenant ce qui la contient, comme les grilles du
              tunnel.

              Plus d'`aspect-[4/1]` non plus : le ratio imposait une hauteur
              plus courte que le plancher des tuiles, et le dépassement partait
              en `overflow-hidden` — sur le titre, que `mt-auto` pousse en bas.
              La rangée prend la hauteur de ses tuiles, et c'est le bloc de
              texte au-dessus qui absorbe ce qui reste : une bande basse, pas
              quatre grands pavés.

              `@lg/machines` (512px de conteneur) et non `md` : à quatre de
              front il faut 128px par tuile. Le point d'arrêt du viewport en
              donnait 96 dans cette sous-colonne. */}
          <div className="@container/machines flex min-h-0 w-full flex-none overflow-hidden app:max-h-full">
            <div className="grid flex-1 grid-cols-2 gap-px border-t border-border bg-border @lg/machines:grid-cols-4">
              {ecomMachines.map((m, i) => (
                <div key={m.slug} className="flex bg-background">
                  {/* `SelectTile` et non un `Button` redessiné : c'est la même
                      tuile que le tunnel, au numéro, à la flèche et au titre
                      près. La copie qui vivait ici avait perdu le `font-sans`
                      de `size="cell"` — tous ces titres rendaient en monospace.

                      `justify-between` pousse le titre en bas de la tuile : le
                      numéro et la flèche coiffent, le nom repose au pied.

                      Plus de retrait ni de ratio passés d'ici : la page posait
                      `px-3 md:px-4`, deux valeurs plus petites que le canon de
                      20px que la tuile porte elle-même — et `--tile-pad`
                      restait à 20, donc un `footer` y aurait tracé son filet au
                      mauvais retrait. La géométrie appartient au composant. */}
                  <SelectTile
                    size="md"
                    number={ordinal(i)}
                    title={m[lang].t}
                    sub={m[lang].sub}
                    href={SCREEN_TO_PATH['plateau-' + m.slug]?.(lang)}
                    onSelect={() => goto('plateau-' + m.slug)}
                    className="h-full w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bande haute droite : pavé galerie ── */}
        <Button
          onClick={() => goto('gallery')}
          aria-label={t('common.gallery')}
          variant="cell"
          size="cell"
          // `md:aspect-[2/1]` : dans la pile, la cellule court sur toute la
          // largeur. Le 6/5 du téléphone y donnait 833px de haut à 1000px de
          // large — une image qui remplit l'écran à elle seule. Le ratio
          // s'aplatit quand la largeur double, et disparaît quand la grille
          // reprend la main.
          className="dark group relative col-span-2 aspect-[6/5] items-stretch justify-end overflow-hidden bg-background hover:bg-background md:aspect-[2/1] app:col-start-7 app:col-end-13 app:row-start-3 app:row-end-5 app:aspect-auto"
        >
          {galleryUseCrossfade ? (
            <ImageCrossfade
              images={heroPosters.map((p, i) => ({
                url: p.url,
                alt: p.alt || `${t('common.gallery')} — ${i + 1}`,
              }))}
              priority
            />
          ) : galleryHasCmsPosters ? (
            <ResponsiveImage
              src={heroPosters[0].url}
              alt={heroPosters[0].alt || t('common.gallery')}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <picture>
              <source srcSet="/gallery-hero.avif" type="image/avif" />
              <source srcSet="/gallery-hero.webp" type="image/webp" />
              <img
                src="/gallery-hero.jpg"
                alt=""
                width={1280}
                height={986}
                {...fetchPriority(true)}
                decoding="async"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
            </picture>
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.25)_0%,rgba(0,0,0,0)_30%,rgba(0,0,0,0)_55%,rgba(0,0,0,.65)_100%)]"
          />
          <div className="relative flex-1" />
          <div className="relative flex w-full items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-5xl font-light tracking-tighter leading-none text-foreground">
                {t('common.gallery')}
              </div>
            </div>
            <div className="flex-shrink-0">
              {/* Le titre pèse `text-5xl` : la flèche de 16px de la base y
                  disparaissait. Elle prend la mesure du pavé d'action. */}
              <ArrowRight className="size-6" />
            </div>
          </div>
        </Button>

        {/* L'ordre du JSX ci-dessous est celui de la pile : Post-production +
            Cyclorama (50/50) → showreel → CTA Réserver → Discovery pleine
            largeur. Les positions du bento sont épinglées par `app:col-start-*`
            / `app:row-start-*`, l'ordre du DOM n'y change donc rien. */}

        {/* ── Rows 5-6 middle (desktop) / mobile row A left: Cyclorama ── */}
        <CtaCell
          tone="surface"
          size="cta"
          kicker="Espace"
          title="Cyclorama"
          subtitle={t('home.freeProductionPhotovideo')}
          href={SCREEN_TO_PATH.cyclorama(lang)}
          onClick={() => goto('cyclorama')}
          className="col-span-1 app:col-span-3 app:col-start-4 app:col-end-7 app:row-start-5 app:row-end-7"
        />

        {/* ── Bande cols 7-10 : CTA Réserver au-dessus de Post-production ──
 `contents` sous le palier : les deux tuiles retombent dans la grille
 empilée à 2 colonnes, où le CTA est masqué et Post-production est une
 cellule ordinaire — l'ordre d'empilement reste donc celui du DOM.
 À partir d'`app`, la bande devient une grille de deux rangées et c'est sa
 gouttière qui trace le filet entre les deux. Auparavant les deux tuiles
 déclaraient la même aire de grille et le partage était simulé par un
 `mt-[85px]`, ce qui interdisait tout filet.

 La première rangée vaut `--spacing-cta` et non 84 en littéral : c'est la
 même mesure, et elle était écrite deux fois. */}
        <div className="contents app:col-start-7 app:col-end-10 app:row-start-5 app:row-end-7 app:grid app:grid-rows-[var(--spacing-cta)_minmax(0,1fr)] app:gap-px app:bg-border">
          {/* Le CTA vit dans l'en-tête sous le palier (action principale), d'où
 le `hidden app:flex` ici. */}
          <CtaCell
            size="cta"
            kicker={t('common.requestQuoteOr')}
            title={t('common.book')}
            onClick={() => goto('book')}
            className="hidden app:flex"
          />

          <CtaCell
            tone="surface"
            size="cta"
            kicker="Service"
            title="Post-production"
            subtitle={t('home.retouchPhotoVideo')}
            href={SCREEN_TO_PATH.postprod(lang)}
            onClick={() => goto('postprod')}
            className="col-span-1"
          />
        </div>

        {/* ── Rangée 5 gauche (bento) / rangée B empilée : showreel ──
 Le 5:4 donne au showreel une taille relative comparable à celle de sa
 tuile du bento (~360×284 sur 1440×900) au lieu d'une bande écrasée.
 `md:aspect-[16/9]` : au-delà de 768 la cellule court sur toute la
 largeur, et le 5:4 y aurait donné 800px de haut pour 1000 de large.
 À partir d'`app`, c'est le gabarit de rangée qui reprend la main. */}
        <div className="dark col-span-2 aspect-[5/4] flex overflow-hidden bg-background md:aspect-[16/9] app:col-span-3 app:col-start-1 app:col-end-4 app:row-start-5 app:aspect-auto app:min-h-0">
          <Button
            onClick={() => goto('gallery')}
            aria-label={t('common.gallery')}
            className="group relative flex h-full w-full overflow-hidden  bg-foreground p-0 text-left"
          >
            {heroShowStaticPicture ? (
              <picture>
                <source srcSet="/showreel-preview.avif" type="image/avif" />
                <source srcSet="/showreel-preview.webp" type="image/webp" />
                <img
                  src="/showreel-preview.webp"
                  alt=""
                  {...fetchPriority(true)}
                  decoding="async"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
              </picture>
            ) : null}
            {heroVideo && (
              <VideoLoop
                src={heroVideo}
                poster={heroVideoPoster}
                className="absolute inset-0 h-full w-full"
              />
            )}
            <div className="absolute inset-0 bg-home-media-gradient" />
          </Button>
        </div>

        {/* ── Rangée 6 gauche : Discovery ──
 La section est publique : plus de cadenas, plus de `disabled`, plus de
 trame SVG en fond — une grille de traits dessinée à la main, seul décor
 gratuit de la page, qui ne disait rien d'autre que « il n'y a rien ici ».
 C'est le même pavé d'action que ses deux voisines de la bande, au même
 sur-titre de catégorie et au même titre que la destination porte dans le
 tiroir. Sans sous-titre : la rangée vaut `--spacing-cta`, où le pavé n'a
 la place que de deux lignes — c'est le gabarit du CTA « Réserver », pas
 celui de Cyclorama qui court sur deux rangées. */}
        <CtaCell
          tone="surface"
          size="cta"
          kicker={t('home.journal')}
          title={t('common.discovery')}
          href={SCREEN_TO_PATH.discovery(lang)}
          onClick={() => goto('discovery')}
          className="col-span-2 app:col-span-3 app:col-start-1 app:col-end-4 app:row-start-6"
        />

        {/* ── Rangées 5-6 extrême droite : l'assistant. Sous le palier, c'est le
 bouton flottant qui le porte — `MobileAssistantFab`, qui disparaît
 exactement ici. Il n'est monté qu'au-dessus du palier pour que les
 téléphones ne téléchargent jamais le module de chat (et sa dépendance
 Supabase) pour un widget hors écran.

 UNE cellule, et le chat dedans. Le placement était écrit trois fois —
 le repli de Suspense, le composant, le substitut hors palier — et
 trois copies d'une même aire de grille finissent par diverger. La
 cellule reste peinte quoi qu'il arrive : c'est elle qui tient l'aire,
 sans quoi les voisines s'étalent dessus pendant le chargement. */}
        <div className="hidden bg-background app:flex app:col-start-10 app:col-end-13 app:row-start-5 app:row-end-7 app:min-h-0">
          {isDesktop && (
            <Suspense fallback={null}>
              <AssistantChat lang={lang} />
            </Suspense>
          )}
        </div>

        {/* ── Mobile chat FAB + sheet ──
 Discreet 40px floating button that opens a full-screen sheet on
 mobile. Desktop keeps the in-grid AssistantChat. Logic lives in
 MobileAssistantFab so the discovery page can reuse the same UX. */}
      </main>

      <MobileAssistantFab lang={lang} />
    </PageShell>
  );
};

export { HomePage };
