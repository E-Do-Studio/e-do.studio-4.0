import { createFileRoute } from '@tanstack/react-router';
import { ConfigStep6 } from '../../../../book/book-step-routes';
import type { Lang } from '../../../../types';
import { buildSeoHead } from '../../../../lib/seo-head';

export const Route = createFileRoute('/$lang/reserver/configurateur/dates')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'book', lang: params.lang as Lang, pathname: '/reserver/configurateur/dates', noIndex: true }),
  component: ConfigStep6,
});
