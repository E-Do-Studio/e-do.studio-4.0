import { createFileRoute } from '@tanstack/react-router';
import { CycloramaPage } from '../../plateau-page';
import { settle } from '../../lib/route-data';
import { fetchPlateaux } from '../../lib/strapi';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import {
  buildPageBreadcrumb,
  buildPlateauServiceSchema,
} from '../../lib/structured-data';

export const Route = createFileRoute('/$lang/cyclorama')({
  loader: async () => ({ plateaux: await settle(fetchPlateaux()) }),
  head: ({ params, loaderData }) => {
    const lang = params.lang as Lang;
    const plateau = loaderData?.plateaux?.cyclorama;
    return buildSeoHead({
      metaKey: 'cyclorama',
      lang,
      pathname: '/cyclorama',
      ...plateau?.seo?.[lang],
      jsonLd: [
        plateau &&
          buildPlateauServiceSchema({
            plateau,
            slug: 'cyclorama',
            lang,
            pathname: '/cyclorama',
          }),
        buildPageBreadcrumb(lang, [
          { name: 'Cyclorama', pathname: '/cyclorama' },
        ]),
      ],
    });
  },
  component: CycloramaPage,
});
