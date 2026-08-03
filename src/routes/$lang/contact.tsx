import { createFileRoute } from '@tanstack/react-router';
import { ContactPage } from '../../contact-page';
import { teamLoader } from '../../lib/route-data';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';

export const Route = createFileRoute('/$lang/contact')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'contact', lang: params.lang as Lang, pathname: '/contact' }),
  loader: teamLoader,
  component: ContactPage,
});
