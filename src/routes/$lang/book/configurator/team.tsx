import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import type { Lang } from '../../../../types';
import { buildSeoHead } from '../../../../lib/seo-head';

export const Route = createFileRoute('/$lang/book/configurator/team')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'book', lang: params.lang as Lang, pathname: '/book/configurator/team', noIndex: true }),
  component: lazyRouteComponent(() => import('../../../../book/book-step-routes'), 'ConfigStep3'),
});
