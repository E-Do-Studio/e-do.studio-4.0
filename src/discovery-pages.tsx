import { lazy, Suspense, useMemo, useState } from 'react';
import { useLoaderData, useNavigate } from '@tanstack/react-router';
import type { DiscoveryCategory, DiscoveryPost } from './types';
import { ArticleCard, ArticleEmptyCard } from './discovery/article-card';
import { BookCtaCell } from './discovery/book-cta-cell';
import { MorePostsCard } from './discovery/more-posts-card';
import { NewsletterCell } from './discovery/newsletter-cell';
import { filterByCategory, selectPosts } from './discovery/select-posts';
import { cn } from '@/lib/utils';
import { usePageContext } from './lib/page-context';
import { useT } from './i18n/use-t';
import { SocialClientsBar } from './social-clients-bar';
import { MobileAssistantFab } from './ui/mobile-assistant-fab';
import { Rail, RailCell, RailHeader } from './ui/rail-cell';
import { PageShell } from './ui/page-shell';
import { MAIN_ID } from './ui/skip-link';
import { useIsDesktop } from './ui/use-is-desktop';

const AssistantChat = lazy(() => import('./assistant-chat'));

// Références stables : sans elles les mémos ci-dessous se rejouent à chaque
// rendu de chargement.
const EMPTY_POSTS: DiscoveryPost[] = [];
const EMPTY_CATS: DiscoveryCategory[] = [];

// Le placement de la cellule du chat, écrit une fois. Il l'était trois fois —
// deux repliements de Suspense et le composant — et les trois chaînes avaient
// déjà divergé sur le fond.
//
// Un seul palier : la cellule apparaît là où la grille bascule, et
// `MobileAssistantFab` disparaît au même endroit. Ces deux seuils ont été
// désaccordés (cellule à `md`, grille à `lg`), et il avait fallu décaler
// l'apparition d'un cran pour que 768–1024px ne se retrouve pas sans cellule ET
// sans bouton. Ils décrivent la même décision, ils portent maintenant le même
// nom — le décalage n'a plus d'objet.
const CHAT_CELL = 'hidden app:flex app:col-start-4 app:row-start-4 app:min-h-0';

const DiscoveryPage = () => {
  const t = useT();
  const { lang } = usePageContext();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [cat, setCat] = useState('all');

  const { posts, categories } = useLoaderData({ from: '/$lang/discovery/' });
  const allPosts = posts ?? EMPTY_POSTS;
  const cats = categories ?? EMPTY_CATS;

  const { headline, rest } = useMemo(() => selectPosts(allPosts), [allPosts]);
  const listed = useMemo(() => filterByCategory(rest, cat), [rest, cat]);

  // Le rail ne propose que des catégories qui ont quelque chose à montrer.
  // Sans ce filtrage, « Backstage » était systématiquement vide : l'unique
  // article backstage est celui de la une, et la une est retirée de la liste.
  // Un filtre qui ne peut rien rendre est un piège, pas un choix.
  const railCats = useMemo(
    () => cats.filter((c) => c.k === 'all' || rest.some((p) => p.cat === c.k)),
    [cats, rest],
  );

  const openPost = (post: DiscoveryPost) =>
    navigate({
      to: '/$lang/discovery/$slug',
      params: { lang, slug: post.slug },
    });

  return (
    <>
      {/* Le gabarit du site : colonne du logo puis trois pistes égales, rangées
          explicites — le même que plateaux, post-prod, galerie et mentions
          légales. Le placement est porté par `col-start`/`row-start`, ce qui
          libère l'ordre du DOM : il est écrit dans l'ordre de lecture mobile,
          et pas une classe `order-*` n'est nécessaire.

          Le palier est `app` et non `md` : la colonne du logo prend 240px, il
          ne reste que 3×193px à 820px de large et la liste y retronque ses
          titres. C'est aussi le palier que la bande d'en-tête s'est choisi — en
          dessous elle garde le burger plutôt que les cinq destinations. */}
      {/* `<main class="contents">` : voir home-page. */}
      <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_var(--spacing-band)_minmax(0,1.6fr)_minmax(0,1fr)_var(--spacing-cta)]">
        <main id={MAIN_ID} className="contents">
          <h1 className="sr-only">
            {t('discoveryPage.srTitle')} — E-Do Studio
          </h1>

          <SocialClientsBar className="col-span-full app:row-start-2" />

          {headline ? (
            <ArticleCard
              post={headline}
              lang={lang}
              onOpen={() => openPost(headline)}
              className="app:col-start-2 app:col-span-2 app:row-start-3 app:row-span-2"
            />
          ) : (
            <ArticleEmptyCard className="app:col-start-2 app:col-span-2 app:row-start-3 app:row-span-2" />
          )}

          {/* Le rail de la galerie, tel quel. Une colonne à tous les paliers :
              en dessous de `lg` elle s'empile au-dessus de la liste qu'elle
              filtre, comme les cinq autres rails du site. */}
          <Rail className="overflow-y-auto app:col-start-1 app:row-start-3 app:row-span-2 app:min-h-0">
            <RailHeader label={t('discoveryPage.categories')} />
            {railCats.map((category) => (
              <RailCell
                density="compact"
                key={category.k}
                label={category[lang]}
                active={cat === category.k}
                onSelect={() => setCat(category.k)}
              />
            ))}
          </Rail>

          <MorePostsCard
            posts={listed}
            total={rest.length}
            lang={lang}
            onOpen={openPost}
            className="app:col-start-4 app:row-start-3"
          />

          {/* Le chat n'est rendu qu'au-dessus de `md`, où il tient dans sa
            cellule. En dessous il repousserait toute la page : c'est le bouton
            flottant qui prend le relais. */}
          {isDesktop ? (
            <Suspense
              fallback={
                <div aria-hidden className={cn(CHAT_CELL, 'bg-background')} />
              }
            >
              <AssistantChat lang={lang} className={CHAT_CELL} />
            </Suspense>
          ) : (
            <div aria-hidden className={cn(CHAT_CELL, 'bg-background')} />
          )}

          <NewsletterCell className="app:col-start-1 app:col-span-2 app:row-start-5" />
          <BookCtaCell className="app:col-start-3 app:col-span-2 app:row-start-5" />
        </main>
      </PageShell>

      <MobileAssistantFab lang={lang} />
    </>
  );
};

export { DiscoveryPage };
