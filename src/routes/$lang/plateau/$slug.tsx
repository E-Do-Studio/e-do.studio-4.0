import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { PlateauSlugPage } from '../../../plateau-page';
import { settle } from '../../../lib/route-data';
import { fetchPlateaux } from '../../../lib/strapi';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';
import {
  buildPageBreadcrumb,
  buildPlateauServiceSchema,
} from '../../../lib/structured-data';
import { getT } from '../../../i18n';

export const Route = createFileRoute('/$lang/plateau/$slug')({
  // Le cyclorama a sa propre URL : celle-ci en était le doublon, indexable et
  // canonique vers elle-même.
  beforeLoad: ({ params }) => {
    if (params.slug === 'cyclorama')
      throw redirect({
        to: '/$lang/cyclorama',
        params: { lang: params.lang },
        statusCode: 301,
      });
  },
  // Un slug que Strapi ne connaît pas est un vrai 404. Sans ce garde, toute
  // URL /plateau/<n'importe quoi> rendait le cyclorama en 200, avec le titre de
  // l'accueil et une canonical vers elle-même. Une panne Strapi (`null`), elle,
  // garde le rendu dégradé : répondre 404 sur un plateau qui existe le ferait
  // désindexer.
  loader: async ({ params }) => {
    const plateaux = await settle(fetchPlateaux());
    if (plateaux && !plateaux[params.slug]) throw notFound();
    return { plateaux };
  },
  head: ({ params, loaderData }) => {
    const lang = params.lang as Lang;
    const pathname = `/plateau/${params.slug}`;
    const plateau = loaderData?.plateaux?.[params.slug];
    return buildSeoHead({
      metaKey: `plateau-${params.slug}`,
      lang,
      pathname,
      ...plateau?.seo?.[lang],
      jsonLd: [
        plateau &&
          buildPlateauServiceSchema({
            plateau,
            slug: params.slug,
            lang,
            pathname,
          }),
        buildPageBreadcrumb(lang, [
          { name: getT(lang)('common.stages'), pathname: '/cyclorama' },
          { name: plateau?.name || params.slug, pathname },
        ]),
      ],
    });
  },
  component: PlateauSlugPage,
});
