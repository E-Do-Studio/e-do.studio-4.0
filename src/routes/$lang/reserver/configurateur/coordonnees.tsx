import { createFileRoute } from '@tanstack/react-router';
import { ConfigStep5 } from '../../../../book/book-step-routes';
import type { Lang } from '../../../../types';
import { buildSeoHead } from '../../../../lib/seo-head';

export const Route = createFileRoute('/$lang/reserver/configurateur/coordonnees')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'book', lang: params.lang as Lang, pathname: '/reserver/configurateur/coordonnees', noIndex: true }),
  component: ConfigStep5,
});
