import { createFileRoute } from '@tanstack/react-router';
import { PlateauSlugPage } from '../../../plateau-page';
import { settle } from '../../../lib/route-data';
import { fetchPlateaux } from '../../../lib/strapi';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';

export const Route = createFileRoute('/$lang/plateau/$slug')({
  loader: async () => ({ plateaux: await settle(fetchPlateaux()) }),
  head: ({ params, loaderData }) =>
    buildSeoHead({
      metaKey: `plateau-${params.slug}`,
      lang: params.lang as Lang,
      pathname: `/plateau/${params.slug}`,
      ...loaderData?.plateaux?.[params.slug]?.seo?.[params.lang as Lang],
    }),
  component: PlateauSlugPage,
});
