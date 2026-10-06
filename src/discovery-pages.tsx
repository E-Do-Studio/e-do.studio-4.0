import { useMemo, useState } from 'react';
import { useLoaderData } from '@tanstack/react-router';
import type { DiscoveryCategory, DiscoveryPost } from './types';
import { ArticleCard, ArticleEmptyCard } from './discovery/article-card';
import { FaqCell } from './discovery/faq-cell';
import { discoveryFaq } from './discovery/faq';
import { MorePostsCard } from './discovery/more-posts-card';
import { filterByCategory, selectPosts } from './discovery/select-posts';
import { usePageContext } from './lib/page-context';
import { captureCta } from './lib/analytics';
import { useScrollDepth } from './lib/use-scroll-depth';
import { useT } from './i18n/use-t';
import { SocialClientsBar } from './social-clients-bar';
import { CtaCell } from './ui/cta-cell';
import { PageShell } from './ui/page-shell';
import { MAIN_ID } from './ui/skip-link';
import { SectionIntro } from './ui/section-intro';
import { SCREEN_TO_PATH } from './lib/screens';

// Références stables : sans elles les mémos ci-dessous se rejouent à chaque
// rendu de chargement.
const EMPTY_POSTS: DiscoveryPost[] = [];
const EMPTY_CATS: DiscoveryCategory[] = [];

const DiscoveryPage = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  const [cat, setCat] = useState('all');
  useScrollDepth();

  const { posts, categories } = useLoaderData({ from: '/$lang/discovery/' });
  const allPosts = posts ?? EMPTY_POSTS;
  const cats = categories ?? EMPTY_CATS;

  const { headline, rest } = useMemo(() => selectPosts(allPosts), [allPosts]);
  const listed = useMemo(() => filterByCategory(rest, cat), [rest, cat]);

  // Le filtre ne propose que des catégories qui ont quelque chose à montrer :
  // l'unique article backstage est celui de la une, et la une est retirée de
  // la liste — « Backstage » y était systématiquement vide.
  //
  // Et il disparaît quand il ne reste qu'une catégorie : « Tout » et « Tips »
  // rendaient exactement la même liste. Un choix sans alternative n'est pas
  // un filtre, c'est une ligne de bruit au-dessus des articles.
  const filterCats = useMemo(() => {
    const available = cats.filter(
      (c) => c.k === 'all' || rest.some((p) => p.cat === c.k),
    );
    return available.length > 2 ? available : EMPTY_CATS;
  }, [cats, rest]);

  return (
    /* Le gabarit du site : colonne du logo puis trois pistes égales, rangées
       explicites — le même que plateaux, post-prod, galerie et mentions
       légales. Le placement est porté par `col-start`/`row-start`, ce qui
       libère l'ordre du DOM : il est écrit dans l'ordre de lecture mobile, et
       pas une classe `order-*` n'est nécessaire.

       Le palier est `app` et non `md` : la colonne du logo prend 240px, il ne
       reste que 3×193px à 820px de large et la liste y retronque ses titres.
       C'est aussi le palier que la bande d'en-tête s'est choisi — en dessous
       elle garde le burger plutôt que les cinq destinations. */
    /* `<main class="contents">` : voir home-page. */
    <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_var(--spacing-band)_auto_minmax(0,1fr)]">
      <main id={MAIN_ID} className="contents">
        <SocialClientsBar className="col-span-full app:row-start-2" />

        {/* Le titre de la page, premier dans le DOM donc premier de la pile
            mobile. Sa rangée est `auto` : la une et la liste enjambent les deux
            rangées du milieu, seule la colonne de gauche les découpe. */}
        <SectionIntro
          size="sm"
          title={t('discoveryPage.title')}
          className="bg-background px-5 md:px-5 app:col-start-1 app:row-start-3"
        />

        {headline ? (
          <ArticleCard
            post={headline}
            lang={lang}
            className="app:col-start-2 app:col-span-2 app:row-start-3 app:row-span-2"
          />
        ) : (
          <ArticleEmptyCard className="app:col-start-2 app:col-span-2 app:row-start-3 app:row-span-2" />
        )}

        {/* La liste avant la colonne de gauche dans le DOM : sur mobile, on
            lit la une, puis les autres articles, puis la FAQ. Le placement du
            bento est porté par `col-start`/`row-start`, l'ordre du DOM ne sert
            qu'à la pile. */}
        <MorePostsCard
          posts={listed}
          categories={filterCats}
          activeCategory={cat}
          onSelectCategory={setCat}
          lang={lang}
          className="app:col-start-4 app:row-start-3 app:row-span-2"
        />

        {/* La FAQ, puis l'action au pied de la colonne. Le pavé de
            réservation prenait toute la largeur sous la une, 84px de haut —
            et 144px sur mobile — pour répéter le bouton orange de la bande
            d'en-tête. Au format `band`, dans la colonne du logo, il ferme la
            page sans l'écraser. */}
        <div className="flex min-w-0 flex-col bg-background app:col-start-1 app:row-start-4 app:min-h-0">
          <FaqCell
            entries={discoveryFaq(t)}
            className="app:min-h-0 app:flex-1"
          />
          <CtaCell
            title={t('common.book')}
            href={SCREEN_TO_PATH.book(lang)}
            onClick={() => {
              captureCta('book');
              goto('book');
            }}
          />
        </div>
      </main>
    </PageShell>
  );
};

export { DiscoveryPage };
