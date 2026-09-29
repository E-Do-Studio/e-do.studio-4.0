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
import { HoverMarquee } from './ui/hover-marquee';
import { useT } from './i18n/use-t';
import { usePageContext } from './lib/page-context';
import { useScrollDepth } from './lib/use-scroll-depth';
import { NotFoundPage } from './not-found-page';
import { PageShell } from './ui/page-shell';
import { sectionTitleVariants } from './ui/section-intro';
import { MAIN_ID } from './ui/skip-link';
import { CtaCell } from './ui/cta-cell';
import { captureCta } from './lib/analytics';
import { SCREEN_TO_PATH } from './lib/screens';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollDepth(scrollRef);
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
      {/* Le gabarit du site : colonne du logo puis trois pistes égales — celui
          de l'index, des plateaux, de la post-prod. L'article avait sa propre
          découpe, 55/45, et la bande de retour cassait à 192px : trois
          verticales sous l'en-tête, dont aucune ne tombait sur une autre.

          Sous `app`, rien n'est placé : la pile suit l'ordre du DOM et la
          fenêtre défile. */}
      <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_var(--spacing-band)_minmax(0,1fr)]">
        <main id={MAIN_ID} className="contents">
          {/* Retour au journal et méta de l'article, en rangée 2 — la même forme
            que l'index Discovery, dont la bande sociale occupe cette rangée. */}
          {/* `h-band` porté par la bande elle-même : sous `app` le gabarit de
              rangées ne s'applique plus, et rien d'autre ne la dimensionne. */}
          <div className="col-span-full flex h-band gap-px bg-border app:row-start-2">
            <Button
              onClick={backToIndex}
              // Sous `sm`, le libellé est masqué et la flèche seule ne nommait
              // pas le bouton.
              aria-label={t('discoveryPage.backToJournal')}
              variant="header"
              // Sans `size`, cette cellule héritait `h-8` de `size="default"` et
              // flottait dans sa rangée de `--spacing-band`, laissant passer 12px
              // du filet noir sous elle. Ses `gap-2.5 px-4 md:px-6` l'emportent
              // toujours.
              size="header"
              // `app:w-logo` : le filet de droite tombe sur celui de la colonne
              // du logo, au-dessus, et de la colonne de l'article, en dessous.
              className="flex-none gap-2.5 px-4 md:px-6 app:w-logo app:justify-start app:px-5"
            >
              <ArrowLeft />
              <MonoLabel className="hidden sm:inline">
                {t('discoveryPage.backToJournal')}
              </MonoLabel>
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-3.5 bg-background px-4 md:px-6 app:px-8">
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
              <HoverMarquee className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {post.date[lang]}
              </HoverMarquee>
            </div>
          </div>

          {/* La disposition de la post-prod : la colonne de gauche porte la
              navigation, le centre se lit, la droite montre. Sans cover, le
              texte prend les trois pistes plutôt que de laisser une colonne
              vide — c'est le titre qui s'élargit, le corps garde sa mesure.

              Dans le DOM : l'image, le texte, puis la colonne — l'ordre de la
              pile mobile. */}
          <article className="contents">
            {cover && (
              <div className="relative aspect-photo bg-muted app:col-start-4 app:row-start-3 app:aspect-auto app:min-h-0">
                <DiscoveryCoverMedia
                  post={post}
                  lang={lang}
                  sizes="(min-width: 1024px) 30vw, 100vw"
                  priority
                  controls
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            )}

            {/* La mesure est portée par le bloc de texte, pas par la cellule :
                l'aplat blanc remplit sa piste, le corps s'arrête à 36rem — 68
                caractères par ligne en moyenne dans cette police. Aligné à
                gauche, sur le filet de la colonne, et non centré : centré, il
                flottait entre deux marges qui ne correspondaient à rien. */}
            <div
              ref={scrollRef}
              className={cn(
                'flex min-w-0 flex-col bg-background px-6 py-8 md:px-8 md:py-10 app:row-start-3 app:min-h-0 app:overflow-y-auto',
                cover
                  ? 'app:col-start-2 app:col-span-2'
                  : 'app:col-start-2 app:col-span-3',
              )}
            >
              <header className="flex max-w-3xl flex-col gap-6">
                <h1
                  className={cn(
                    sectionTitleVariants({ size: 'lg' }),
                    'text-foreground app:text-5xl',
                  )}
                >
                  {post.title[lang]}
                </h1>
                {/* Le chapô se détache par le CORPS, pas par la graisse : en
                    16px et en 400 à côté d'un corps en 300, il se lisait comme
                    un paragraphe en gras. */}
                {post.sub[lang] && (
                  <p className="m-0 max-w-xl text-pretty text-xl font-light leading-snug text-foreground">
                    {post.sub[lang]}
                  </p>
                )}
              </header>
              {bodyHtml && (
                <div
                  ref={bodyRef}
                  onClick={onBodyClick}
                  onKeyDown={onBodyKeyDown}
                  className="article-prose prose prose-sm mt-10 max-w-xl text-foreground"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              )}
            </div>
          </article>

          {/* La colonne de gauche, comme sur l'index : l'article suivant en
              tête, la réservation au pied. Le renvoi était au bout de 2300px
              de texte ; ici il reste à l'écran pendant la lecture. */}
          <div className="flex min-w-0 flex-col bg-background app:col-start-1 app:row-start-3 app:min-h-0">
            {nextPost && (
              <ArticleTeaserCell
                post={nextPost}
                lang={lang}
                className="border-b border-border"
              />
            )}
            <CtaCell
              title={t('common.book')}
              href={SCREEN_TO_PATH.book(lang)}
              onClick={() => {
                captureCta('book');
                goto('book');
              }}
              className="app:mt-auto"
            />
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
