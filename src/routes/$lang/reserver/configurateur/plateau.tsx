import { createFileRoute } from '@tanstack/react-router';
import { ConfigStep2 } from '../../../../book/book-step-routes';
import type { Lang } from '../../../../types';
import { buildSeoHead } from '../../../../lib/seo-head';

export const Route = createFileRoute('/$lang/reserver/configurateur/plateau')({
  head: ({ params }) =>
    buildSeoHead({
      metaKey: 'book',
      lang: params.lang as Lang,
      pathname: '/reserver/configurateur/plateau',
      noIndex: true,
    }),
  component: ConfigStep2,
});
