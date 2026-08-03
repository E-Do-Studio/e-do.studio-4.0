import { createFileRoute } from '@tanstack/react-router';
import { ConfigStep0 } from '../../../../book/book-step-routes';
import type { Lang } from '../../../../types';
import { buildSeoHead } from '../../../../lib/seo-head';

export const Route = createFileRoute('/$lang/reserver/configurateur/')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'book', lang: params.lang as Lang, pathname: '/reserver/configurateur', noIndex: true }),
  component: ConfigStep0,
});
