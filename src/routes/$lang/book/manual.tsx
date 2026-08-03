import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { manualStepSearch } from '../../../lib/route-data';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';

export const Route = createFileRoute('/$lang/book/manual')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'book', lang: params.lang as Lang, pathname: '/book/manual', noIndex: true }),
  validateSearch: manualStepSearch,
  component: lazyRouteComponent(() => import('../../../book/book-step-routes'), 'ManualBook'),
});
