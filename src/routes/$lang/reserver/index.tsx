import { createFileRoute } from '@tanstack/react-router';
import { BookPicker } from '../../../book/book-picker';
import { teamLoader } from '../../../lib/route-data';
import type { Lang } from '../../../types';
import { buildSeoHead } from '../../../lib/seo-head';

export const Route = createFileRoute('/$lang/reserver/')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'book-picker', lang: params.lang as Lang, pathname: '/reserver', noIndex: true }),
  loader: teamLoader,
  component: BookPicker,
});
