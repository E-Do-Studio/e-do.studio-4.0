import { createFileRoute } from '@tanstack/react-router';
import { StudioTourPage } from '../../studio-tour-page';
import { settle } from '../../lib/route-data';
import { fetchPlateaux } from '../../lib/strapi';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import { buildPageBreadcrumb } from '../../lib/structured-data';
import { getT } from '../../i18n';

// La visite répond sous les deux slugs dans les deux langues, comme la galerie
// (voir visite-3d.tsx et 3d-tour.tsx) : le canonical pointe toujours le slug de
// la langue courante.
export const Route = createFileRoute('/$lang/3d-tour')({
  validateSearch: (search: Record<string, unknown>): { zone?: string } =>
    typeof search.zone === 'string' && search.zone ? { zone: search.zone } : {},
  loader: async () => ({ plateaux: await settle(fetchPlateaux()) }),
  head: ({ params }) => {
    const lang = params.lang as Lang;
    const canonical = lang === 'fr' ? '/visite-3d' : '/3d-tour';
    return buildSeoHead({
      metaKey: 'studio-tour',
      lang,
      pathname: canonical,
      jsonLd: [
        buildPageBreadcrumb(lang, [
          { name: getT(lang)('common.studioTour'), pathname: canonical },
        ]),
      ],
    });
  },
  component: StudioTourPage,
});
