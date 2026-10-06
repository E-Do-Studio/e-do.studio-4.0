import { createFileRoute } from '@tanstack/react-router';
import { StudioRentalPage } from '../../studio-rental-page';
import {
  studioRentalFaq,
  studioRentalRates,
} from '../../studio-rental/content';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import {
  buildFaqSchema,
  buildPageBreadcrumb,
  buildStudioRentalServiceSchema,
} from '../../lib/structured-data';
import { getT } from '../../i18n';

export const Route = createFileRoute('/$lang/location-studio-photo-paris')({
  head: ({ params }) => {
    const lang = params.lang as Lang;
    const t = getT(lang);
    // La page répond sous les deux slugs dans les deux langues, comme la
    // galerie : le canonical pointe toujours le slug de la langue courante.
    const canonical =
      lang === 'fr'
        ? '/location-studio-photo-paris'
        : '/photo-studio-rental-paris';
    return buildSeoHead({
      metaKey: 'studio-rental',
      lang,
      pathname: canonical,
      jsonLd: [
        buildStudioRentalServiceSchema(lang, canonical, studioRentalRates(t)),
        buildFaqSchema(studioRentalFaq(t, lang), lang, canonical),
        buildPageBreadcrumb(lang, [
          { name: t('studioRental.h1'), pathname: canonical },
        ]),
      ],
    });
  },
  component: StudioRentalPage,
});
