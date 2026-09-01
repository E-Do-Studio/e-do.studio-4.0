import { createFileRoute } from '@tanstack/react-router';
import { ConfigStep3 } from '../../../../book/book-step-routes';
import type { Lang } from '../../../../types';
import { buildSeoHead } from '../../../../lib/seo-head';

export const Route = createFileRoute('/$lang/reserver/configurateur/equipe')({
  head: ({ params }) =>
    buildSeoHead({
      metaKey: 'book',
      lang: params.lang as Lang,
      pathname: '/reserver/configurateur/equipe',
      noIndex: true,
    }),
  component: ConfigStep3,
});
