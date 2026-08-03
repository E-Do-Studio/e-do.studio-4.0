import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import type { Lang } from '../../../../types';
import { buildSeoHead } from '../../../../lib/seo-head';

export const Route = createFileRoute('/$lang/book/configurator/dates')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'book', lang: params.lang as Lang, pathname: '/book/configurator/dates', noIndex: true }),
  component: lazyRouteComponent(() => import('../../../../book/book-step-routes'), 'ConfigStep6'),
});
