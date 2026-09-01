import { ArrowLeft } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLoaderData, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { renderMarkdown } from './lib/render-markdown';
import { DiscoveryCoverMedia } from './discovery/discovery-cover';
import { hasCover } from './discovery/cover';
import { ArticleTeaserCell } from './discovery/article-teaser-cell';
import { GalleryLightbox } from './gallery-lightbox';
import type { GalleryMedia } from './lib/strapi';
import { MonoLabel } from './ui/mono-label';
import { Separator } from '@/components/ui/separator';
import { HoverMarquee } from './ui/hover-marquee';
import { useT } from './i18n/use-t';
import { usePageContext } from './lib/page-context';
import { NotFoundPage } from './not-found-page';
import { PageShell } from './ui/page-shell';
import { SectionIntro } from './ui/section-intro';
import { MAIN_ID } from './ui/skip-link';

export const DiscoveryPostPage = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  const navigate = useNavigate();
  const { post, posts } = useLoaderData({ from: '/$lang/discovery/$slug' });

  const bodyHtml = useMemo(
    () => (post ? renderMarkdown(post.body[lang]) : ''),
    [post, lang],
  );

  // Suggestion at the end of the article: the next post in chronological order,
  // wrapping to the newest once the oldest is reached.
  const nextPost = useMemo(() => {
    if (!post || !posts || posts.length < 2) return null;
    const i = posts.findIndex((p) => p.slug === post.slug);
    return i === -1 ? posts[0] : posts[(i + 1) % posts.length];
  }, [posts, post]);

  // Body images open the shared GalleryLightbox (carousel + zoom/preview);
  // videos keep their inline native controls. The cover is NOT included — it is
  // never enlarged on click. Clicking a body image collects every body media in
  // document order and opens the lightbox at its index.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{
    media: GalleryMedia[];
    index: number;
  } | null>(null);

  const openLightboxFor = (img: Element) => {
    if (!bodyRef.current) return;
    const els = Array.from(bodyRef.current.querySelectorAll('img, video'));
    const media: GalleryMedia[] = els.map((el) => {
      if (el instanceof HTMLVideoElement) {
        const source = el.querySelector('source');
        return {
          kind: 'video',
          url: el.getAttribute('src') || source?.getAttribute('src') || '',
          alt: el.getAttribute('aria-label') || '',
          mime: source?.getAttribute('type') || undefined,
        };
      }
      const image = el as HTMLImageElement;
      return {
        kind: 'image',
        url: image.currentSrc || image.src,
        alt: image.alt,
      };
    });
    setLightbox({ media, index: Math.max(0, els.indexOf(img)) });
  };

  const onBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = (e.target as HTMLElement).closest('img');
    if (!img || !bodyRef.current?.contains(img)) return;
    e.preventDefault();
    openLightboxFor(img);
  };

  // Body images carry tabindex+role from renderMarkdown, so keyboard users reach
  // them; delegation here gives them the same activation as a click.
  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const img = (e.target as HTMLElement).closest('img');
    if (!img || !bodyRef.current?.contains(img)) return;
    e.preventDefault();
    openLightboxFor(img);
  };

  if (!post) {
    return <NotFoundPage />;
  }

  const backToIndex = () =>
    navigate({ to: '/$lang/discovery', params: { lang } });

  const cover = hasCover(post);

  return (
    <>
      {/* `<main class="contents">` : voir home-page. */}
      {/* Le gabarit de rangées n'est pas gardé par `app:` — l'article garde le
          même rythme à toutes les largeurs, bande d'en-tête, bande de retour,
          puis le corps. Le verrou de défilement, lui, l'est : cette page était
          la seule du site à poser `overflow-hidden` sans palier, donc à couper
          son propre article sur mobile au lieu de le laisser défiler. */}
      <PageShell className="grid-rows-[var(--spacing-header)_var(--spacing-band)_minmax(0,1fr)]">
        <main id={MAIN_ID} className="contents">
          {/* Retour au journal et méta de l'article, en rangée 2 — la même forme
            que l'index Discovery, dont la bande sociale occupe cette rangée. */}
          <div className="row-start-2 flex gap-px bg-border">
            <Button
              onClick={backToIndex}
              variant="header"
              // Sans `size`, cette cellule héritait `h-8` de `size="default"` et
              // flottait dans sa rangée de `--spacing-band`, laissant passer 12px
              // du filet noir sous elle. Ses `gap-2.5 px-4 md:px-6` l'emportent
              // toujours.
              size="header"
              className="flex-none gap-2.5 px-4 md:px-6"
            >
              <ArrowLeft />
              <MonoLabel className="hidden sm:inline">
                {t('discoveryPage.backToJournal')}
              </MonoLabel>
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-3.5 bg-background px-4 md:px-6">
              <MonoLabel tone="primary">{post.tag[lang]}</MonoLabel>
              {/* Sans l'auteur : `strapi.ts` le pose en dur à « Studio » pour
                  tous les articles, ce n'est pas un champ que la rédaction
                  renseigne. Une valeur constante n'apprend rien. Elle reste
                  dans le JSON-LD, où schema.org attend un auteur. */}
              {/* Sans la durée de lecture : « 4 MIN » était une estimation
                  fabriquée par `strapi.ts` — le nombre de mots divisé par 200 —
                  posée entre la catégorie et la date. Trois valeurs alignées
                  dans une bande, dont une inventée, se lisent comme la chaîne au
                  point médian que ce dépôt bannit ailleurs. Le champ est parti
                  du modèle, pas seulement de l'affichage.

                  `HoverMarquee` ne peut pas porter le `gap` du parent — il pose
                  ses enfants dans une piste interne et mesure
                  `scrollWidth - clientWidth` sur un `whitespace-nowrap`, qu'un
                  `flex` sur son enveloppe fausserait. */}
              <HoverMarquee className="font-mono text-xs tracking-widest text-muted-foreground">
                {post.date[lang]}
              </HoverMarquee>
            </div>
          </div>

          {/* Sans cover, pas de colonne de cover : l'article prend toute la
              largeur et se lit en une colonne. La réserve grise a du sens dans
              une vignette de 48px, où elle tient l'alignement de la liste ;
              étalée sur la moitié d'un écran, elle ne tiendrait rien du tout —
              elle occuperait la moitié de la page pour dire qu'il manque une
              image. */}
          <div
            className={cn(
              'row-start-3 grid min-h-0 grid-cols-1 overflow-y-auto app:overflow-hidden',
              // `gap-px bg-border` ne peint QUE la gouttière entre les deux
              // colonnes. Sans cover il n'y a plus de gouttière, et l'aplat
              // débordait de part et d'autre de la colonne de lecture centrée :
              // un article en noir sur les deux tiers de l'écran.
              cover
                ? 'gap-px bg-border app:grid-cols-[1.1fr_1fr]'
                : 'bg-background',
            )}
          >
            {cover && (
              <div className="relative min-h-64 bg-foreground app:min-h-0">
                <DiscoveryCoverMedia
                  post={post}
                  lang={lang}
                  sizes="(min-width: 768px) 55vw, 100vw"
                  priority
                  controls
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            )}
            {/* Ni méta en tête ni signature en pied : la bande de la rangée 2
                porte déjà la catégorie, la durée, l'auteur et la date, et elle
                reste à l'écran pendant que l'article défile dans sa cellule.
                Les répéter ne renseignait personne. */}
            {/* La mesure est portée par le bloc de texte, pas par la cellule :
                l'aplat blanc doit remplir sa colonne — sinon c'est la gouttière
                noire de la grille qui apparaît sur les côtés — mais le texte,
                lui, s'arrête à 36rem.

                Mesuré, dans cette police et à ce corps : 74 caractères par ligne
                à 1440 avec cover, 86 sans, et 81 à 2560 même une fois plafonné à
                42rem. 36rem donne 68 en moyenne (63 à 75 selon le paragraphe),
                dans la plage lisible de 60 à 75. La mesure se vérifie en comptant
                des caractères, pas en choisissant un palier de largeur. */}
            <article className="flex min-h-0 w-full flex-col overflow-y-auto bg-background px-6 py-8 md:px-12 md:py-10">
              <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5">
                {/* `flow` : la cellule de l'article porte déjà son retrait, celui
                  de `lg` s'y ajouterait. Le chapô reste hors du composant — ce
                  n'en est pas un, c'est le chapeau de l'article, qui se lit au
                  corps du texte et non en gris réduit. */}
                <SectionIntro size="flow" title={post.title[lang]} />
                {post.sub[lang] && (
                  <p className="m-0 text-pretty text-base font-normal leading-relaxed text-foreground">
                    {post.sub[lang]}
                  </p>
                )}
                {bodyHtml && (
                  <div
                    ref={bodyRef}
                    onClick={onBodyClick}
                    onKeyDown={onBodyKeyDown}
                    className="article-prose prose prose-sm m-0 max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                )}
                {nextPost && (
                  <aside className="mt-auto flex flex-col gap-2.5">
                    <Separator className="mb-3.5" />
                    <MonoLabel tone="primary">
                      {t('discoveryPage.nextArticle')}
                    </MonoLabel>
                    <ArticleTeaserCell
                      post={nextPost}
                      lang={lang}
                      onOpen={() =>
                        navigate({
                          to: '/$lang/discovery/$slug',
                          params: { lang, slug: nextPost.slug },
                        })
                      }
                    />
                  </aside>
                )}
                {/* Plus de pied « Fermer » : la bande de la rangée 2 porte
                  « Retour journal », elle reste à l'écran pendant que l'article
                  défile, et elle dit où l'on revient. Le bouton noir posé en bas
                  à droite était la seconde sortie de la même pièce, sous un
                  troisième filet. */}
              </div>
            </article>
          </div>
        </main>
      </PageShell>
      {lightbox && lightbox.media.length > 0 && (
        <GalleryLightbox
          project={{
            id: post.id,
            brand: post.title[lang],
            cat: post.cat,
            plateau: '',
            year: '',
            tone: 'mono',
            media: lightbox.media,
          }}
          initialIndex={lightbox.index}
          lang={lang}
          onClose={() => setLightbox(null)}
          onBook={() => {
            setLightbox(null);
            goto('book');
          }}
          onContact={() => {
            setLightbox(null);
            goto('contact');
          }}
        />
      )}
    </>
  );
};
