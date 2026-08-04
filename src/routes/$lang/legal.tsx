import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '../../legal-page';
import { settle } from '../../lib/route-data';
import {
  fetchLegalDocuments,
  fetchLegalSectionsByDocument,
  LEGAL_DOCUMENT_KEYS,
  type LegalDocumentKey,
} from '../../lib/strapi';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import {
  buildPageBreadcrumb,
  buildWebPageSchema,
} from '../../lib/structured-data';
import { common } from '../../i18n/messages';

export const Route = createFileRoute('/$lang/legal')({
  head: ({ params }) => {
    const lang = params.lang as Lang;
    return buildSeoHead({
      metaKey: 'legal',
      lang,
      pathname: '/legal',
      jsonLd: [
        buildWebPageSchema({
          lang,
          pathname: '/legal',
          name: common.legal[lang],
        }),
        buildPageBreadcrumb(lang, [
          { name: common.legal[lang], pathname: '/legal' },
        ]),
      ],
    });
  },
  // `?doc=` sélectionne le document affiché ; « mentions » est le défaut et
  // n'est jamais écrit dans l'URL.
  validateSearch: (
    search: Record<string, unknown>,
  ): { doc?: LegalDocumentKey } =>
    LEGAL_DOCUMENT_KEYS.includes(search.doc as LegalDocumentKey) &&
    search.doc !== 'mentions'
      ? { doc: search.doc as LegalDocumentKey }
      : {},
  loader: async () => {
    const [documents, sections] = await Promise.all([
      settle(fetchLegalDocuments()),
      settle(fetchLegalSectionsByDocument()),
    ]);
    return { documents, sections };
  },
  component: LegalPage,
});
