import { createFileRoute } from '@tanstack/react-router';
import { PostprodPage } from '../../postprod-page';
import { settle } from '../../lib/route-data';
import { fetchPostProdTypes } from '../../lib/strapi';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import {
  buildPageBreadcrumb,
  buildPostProdServiceSchema,
} from '../../lib/structured-data';
import { common } from '../../i18n/messages';

export const Route = createFileRoute('/$lang/post-production')({
  // `?type=` est une cible de redirection 301 depuis les URLs v3
  // (/post-production/lookbook → /fr/post-production?type=lookbook, cf.
  // Caddyfile) : le paramètre absent équivaut à la catégorie par défaut, et
  // n'est jamais écrit dans l'URL.
  validateSearch: (search: Record<string, unknown>): { type?: string } =>
    typeof search.type === 'string' && search.type ? { type: search.type } : {},
  loader: async () => ({ postProdTypes: await settle(fetchPostProdTypes()) }),
  // Chaque type a son propre titre : sans surcharge Strapi, il est composé
  // depuis le libellé et la tagline, pour qu'aucune catégorie ne partage la
  // meta générique de la page.
  head: ({ params, match, loaderData }) => {
    const lang = params.lang as Lang;
    const cats = loaderData?.postProdTypes ?? [];
    const cat = cats.find((c) => c.k === match.search.type) ?? cats[0];
    const strapiSeo = cat?.seo?.[lang];
    return buildSeoHead({
      metaKey: 'postprod',
      lang,
      pathname: '/post-production',
      title:
        strapiSeo?.title ||
        (cat
          ? `${cat[lang]} — Post-production — E-Do Studio Paris`
          : undefined),
      description:
        strapiSeo?.description ||
        cat?.tagline[lang] ||
        cat?.features[lang]?.[0] ||
        undefined,
      imageUrl: strapiSeo?.imageUrl,
      noIndex: strapiSeo?.noIndex,
      jsonLd: [
        cats.length > 0 &&
          buildPostProdServiceSchema({
            cats,
            lang,
            pathname: '/post-production',
          }),
        buildPageBreadcrumb(lang, [
          { name: common.postProd[lang], pathname: '/post-production' },
        ]),
      ],
    });
  },
  component: PostprodPage,
});
