import { createFileRoute } from '@tanstack/react-router';
import { ManualBook } from '../../../book/book-step-routes';
import { manualStepSearch } from '../../../lib/route-data';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';

export const Route = createFileRoute('/$lang/reserver/manuel')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'book', lang: params.lang as Lang, pathname: '/reserver/manuel', noIndex: true }),
  validateSearch: manualStepSearch,
  component: ManualBook,
});
