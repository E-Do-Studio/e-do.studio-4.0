import { createFileRoute } from '@tanstack/react-router';
import { BookConfirmation } from '../../../book/book-confirmation';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';

export const Route = createFileRoute('/$lang/book/confirmation')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'book-confirmation', lang: params.lang as Lang, pathname: '/book/confirmation', noIndex: true }),
  component: BookConfirmation,
});
