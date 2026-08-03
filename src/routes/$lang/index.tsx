import { createFileRoute } from '@tanstack/react-router';
import { DirectionA } from '../../direction-editorial';
import { settle } from '../../lib/route-data';
import { fetchAnnouncement, fetchHomeHero } from '../../lib/strapi';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import { buildWebSiteSchema } from '../../lib/structured-data';

export const Route = createFileRoute('/$lang/')({
  head: ({ params }) =>
    buildSeoHead({
      metaKey: 'home',
      lang: params.lang as Lang,
      pathname: '',
      jsonLd: [buildWebSiteSchema(params.lang as Lang)],
    }),
  loader: async () => {
    const [announcement, homeHero] = await Promise.all([
      settle(fetchAnnouncement()),
      settle(fetchHomeHero()),
    ]);
    return { announcement, homeHero };
  },
  component: DirectionA,
});
