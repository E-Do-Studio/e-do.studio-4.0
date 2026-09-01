import { createFileRoute } from '@tanstack/react-router';
import { BookConfirmation } from '../../../book/book-confirmation';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';

export const Route = createFileRoute('/$lang/reserver/confirmation')({
  head: ({ params }) =>
    buildSeoHead({
      metaKey: 'book-confirmation',
      lang: params.lang as Lang,
      pathname: '/reserver/confirmation',
      noIndex: true,
    }),
  component: BookConfirmation,
});
