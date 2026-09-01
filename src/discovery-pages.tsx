import { useMemo, useState } from 'react';
import { useLoaderData, useNavigate } from '@tanstack/react-router';
import type { DiscoveryCategory, DiscoveryPost } from './types';
import { ArticleCard, ArticleEmptyCard } from './discovery/article-card';
import { MorePostsCard } from './discovery/more-posts-card';
import { NewsletterCell } from './discovery/newsletter-cell';
import { filterByCategory, selectPosts } from './discovery/select-posts';
import { usePageContext } from './lib/page-context';
import { useT } from './i18n/use-t';
import { SocialClientsBar } from './social-clients-bar';
import { CtaCell } from './ui/cta-cell';
import { Rail, RailCell, RailHeader } from './ui/rail-cell';
import { PageShell } from './ui/page-shell';
import { MAIN_ID } from './ui/skip-link';
import { SCREEN_TO_PATH } from './lib/screens';

// Références stables : sans elles les mémos ci-dessous se rejouent à chaque
// rendu de chargement.
const EMPTY_POSTS: DiscoveryPost[] = [];
const EMPTY_CATS: DiscoveryCategory[] = [];

const DiscoveryPage = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  const navigate = useNavigate();
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
    <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_var(--spacing-band)_minmax(0,1.6fr)_minmax(0,1fr)_var(--spacing-cta)]">
      <main id={MAIN_ID} className="contents">
        <h1 className="sr-only">{t('discoveryPage.srTitle')} — E-Do Studio</h1>

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

        {/* Le rail de la galerie, et son pied.

            La colonne mesure toute la bande de contenu — 900px sur un grand
            écran — et Discovery n'a que deux catégories, qui en occupent le
            dixième. Un rail seul y laissait une colonne blanche de 240 × 800,
            à côté de la couverture. `postprod-page.tsx` règle le même cas de la
            même façon : les cellules en haut, un bloc au pied, et la colonne
            tient par ses deux bouts.

            Le pied, ici, c'est l'inscription à la lettre — elle occupait la
            moitié de la bande d'action, où elle n'avait rien à faire face au
            pavé de réservation. Empilée, la colonne se lit dans l'ordre :
            filtres, puis inscription, puis la liste qu'ils filtrent. */}
        <div className="flex min-w-0 flex-col bg-background app:col-start-1 app:row-start-3 app:row-end-6 app:min-h-0">
          <Rail className="min-h-0 overflow-y-auto">
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
          <NewsletterCell className="mt-auto border-t border-border" />
        </div>

        {/* Deux rangées : la colonne de droite était partagée avec la cellule
              du chat, qui ne vit plus sur cette page. Sans ce `row-span-2`, la
              rangée 4 resterait une aire vide — c'est-à-dire un aplat de la
              couleur des filets, la gouttière de la grille n'ayant plus rien à
              séparer. La liste est justement ce qui manquait de hauteur : elle
              scrolle déjà et annonce son propre décompte. */}
        <MorePostsCard
          posts={listed}
          total={rest.length}
          lang={lang}
          onOpen={openPost}
          className="app:col-start-4 app:row-start-3 app:row-span-2"
        />

        {/* La bande d'action prend toute la largeur : c'est la seule action de
            la page, et la moitié qu'elle partageait avec l'inscription faisait
            deux demi-bandes dont aucune ne fermait la page.

            `CtaCell` et non la copie qui vivait dans `discovery/` : elle
            redessinait le même sur-titre à `/75`, le même titre `text-2xl
            font-light`, la même flèche `size-6`, et ses commentaires disaient
            eux-mêmes qu'elle imitait le pavé de l'accueil.

            Le sur-titre y annonçait « Studio ouvert 7j/7 » — faux (l'accueil
            affiche lun–sam) et sans objet sur un bouton de réservation. C'est
            la phrase de l'accueil qui le remplace, la seule que ce pavé ait
            jamais eue à dire. */}
        <CtaCell
          size="cta"
          kicker={t('common.requestQuoteOr')}
          title={t('common.book')}
          href={SCREEN_TO_PATH.book(lang)}
          onClick={() => goto('book')}
          className="app:col-start-2 app:col-end-5 app:row-start-5"
        />
      </main>
    </PageShell>
  );
};

export { DiscoveryPage };
