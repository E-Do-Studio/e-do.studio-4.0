import { createFileRoute } from '@tanstack/react-router';
import { PlateauSlugPage } from '../../../plateau-page';
import { settle } from '../../../lib/route-data';
import { fetchPlateaux } from '../../../lib/strapi';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';
import {
  buildPageBreadcrumb,
  buildPlateauServiceSchema,
} from '../../../lib/structured-data';
import { common } from '../../../i18n/messages';

export const Route = createFileRoute('/$lang/plateau/$slug')({
  loader: async () => ({ plateaux: await settle(fetchPlateaux()) }),
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
          { name: common.stages[lang], pathname: '/cyclorama' },
          { name: plateau?.name || params.slug, pathname },
        ]),
      ],
    });
  },
  component: PlateauSlugPage,
});
