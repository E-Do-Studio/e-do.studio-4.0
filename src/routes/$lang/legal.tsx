import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { settle } from '../../lib/route-data';
import {
  fetchLegalDocuments,
  fetchLegalSectionsByDocument,
  LEGAL_DOCUMENT_KEYS,
  type LegalDocumentKey,
} from '../../lib/strapi';

export const Route = createFileRoute('/$lang/legal')({
  // `?doc=` sélectionne le document affiché ; « mentions » est le défaut et
  // n'est jamais écrit dans l'URL.
  validateSearch: (search: Record<string, unknown>): { doc?: LegalDocumentKey } =>
    LEGAL_DOCUMENT_KEYS.includes(search.doc as LegalDocumentKey) && search.doc !== 'mentions'
      ? { doc: search.doc as LegalDocumentKey }
      : {},
  loader: async () => {
    const [documents, sections] = await Promise.all([
      settle(fetchLegalDocuments()),
      settle(fetchLegalSectionsByDocument()),
    ]);
    return { documents, sections };
  },
  component: lazyRouteComponent(() => import('../../legal-page'), 'LegalPage'),
});
