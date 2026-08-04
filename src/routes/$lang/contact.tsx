import { createFileRoute } from '@tanstack/react-router';
import { ContactPage } from '../../contact-page';
import { teamLoader } from '../../lib/route-data';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import {
  buildContactPageSchema,
  buildPageBreadcrumb,
} from '../../lib/structured-data';
import { common } from '../../i18n/messages';

export const Route = createFileRoute('/$lang/contact')({
  head: ({ params }) => {
    const lang = params.lang as Lang;
    return buildSeoHead({
      metaKey: 'contact',
      lang,
      pathname: '/contact',
      jsonLd: [
        buildContactPageSchema(lang, '/contact'),
        buildPageBreadcrumb(lang, [
          { name: common.contactUs[lang], pathname: '/contact' },
        ]),
      ],
    });
  },
  loader: teamLoader,
  component: ContactPage,
});
