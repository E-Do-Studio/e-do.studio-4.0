import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { settle } from '../../lib/route-data';
import { fetchPlateaux } from '../../lib/strapi';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';

export const Route = createFileRoute('/$lang/cyclorama')({
  loader: async () => ({ plateaux: await settle(fetchPlateaux()) }),
  head: ({ params, loaderData }) =>
    buildSeoHead({
      metaKey: 'cyclorama',
      lang: params.lang as Lang,
      pathname: '/cyclorama',
      ...loaderData?.plateaux?.cyclorama?.seo?.[params.lang as Lang],
    }),
  component: lazyRouteComponent(() => import('../../plateau-page'), 'CycloramaPage'),
});
