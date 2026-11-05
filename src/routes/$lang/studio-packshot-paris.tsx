import { createFileRoute } from '@tanstack/react-router';
import { PackshotPage } from '../../packshot-page';
import {
  PACKSHOT_RATES,
  PACKSHOT_STAGES,
  packshotFaq,
} from '../../packshot/content';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import {
  buildFaqSchema,
  buildPackshotServiceSchema,
  buildPageBreadcrumb,
} from '../../lib/structured-data';
import { getT } from '../../i18n';

export const Route = createFileRoute('/$lang/studio-packshot-paris')({
  head: ({ params }) => {
    const lang = params.lang as Lang;
    const t = getT(lang);
    // La page répond sous les deux slugs dans les deux langues : le canonical
    // pointe toujours celui de la langue courante.
    const canonical =
      lang === 'fr' ? '/studio-packshot-paris' : '/packshot-studio-paris';
    return buildSeoHead({
      metaKey: 'packshot',
      lang,
      pathname: canonical,
      jsonLd: [
        buildPackshotServiceSchema({
          lang,
          pathname: canonical,
          offers: PACKSHOT_STAGES.map((stage) => ({
            name: `${PACKSHOT_RATES[stage].label[lang]} · ${t('booking.fullDay')}`,
            price: PACKSHOT_RATES[stage].full,
          })),
        }),
        buildFaqSchema(packshotFaq(t, lang), lang, canonical),
        buildPageBreadcrumb(lang, [
          { name: t('common.stages'), pathname: '/cyclorama' },
          { name: t('packshotPage.title'), pathname: canonical },
        ]),
      ],
    });
  },
  component: PackshotPage,
});
