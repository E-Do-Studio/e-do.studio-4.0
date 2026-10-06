import { createFileRoute } from '@tanstack/react-router';
import { OnModelPage } from '../../on-model-page';
import { LIVE_RATES, onModelFaq } from '../../on-model/content';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import {
  buildFaqSchema,
  buildOnModelServiceSchema,
  buildPageBreadcrumb,
} from '../../lib/structured-data';
import { getT } from '../../i18n';

export const Route = createFileRoute('/$lang/on-model-photo-studio')({
  head: ({ params }) => {
    const lang = params.lang as Lang;
    const t = getT(lang);
    // La page répond sous les deux slugs dans les deux langues, comme la
    // galerie : le canonical pointe toujours celui de la langue courante.
    const canonical =
      lang === 'fr' ? '/studio-photo-mannequin' : '/on-model-photo-studio';
    return buildSeoHead({
      metaKey: 'on-model',
      lang,
      pathname: canonical,
      jsonLd: [
        buildOnModelServiceSchema({
          lang,
          pathname: canonical,
          offers: [
            { name: t('booking.hourly'), price: LIVE_RATES.hour },
            { name: t('booking.halfDay'), price: LIVE_RATES.half },
            { name: t('booking.fullDay'), price: LIVE_RATES.full },
          ],
        }),
        buildFaqSchema(onModelFaq(t, lang), lang, canonical),
        buildPageBreadcrumb(lang, [
          { name: t('common.stages'), pathname: '/cyclorama' },
          { name: t('onModelPage.title'), pathname: canonical },
        ]),
      ],
    });
  },
  component: OnModelPage,
});
