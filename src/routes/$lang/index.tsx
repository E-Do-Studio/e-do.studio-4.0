import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '../../home-page';
import { settle } from '../../lib/route-data';
import { fetchAnnouncement, fetchHomeHero } from '../../lib/strapi';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';

export const Route = createFileRoute('/$lang/')({
  // Pas de jsonLd ici : Organization et WebSite sont émis par __root sur toutes
  // les pages. Les répéter produirait deux nœuds au même `@id`.
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'home', lang: params.lang as Lang, pathname: '' }),
  loader: async () => {
    const [announcement, homeHero] = await Promise.all([
      settle(fetchAnnouncement()),
      settle(fetchHomeHero()),
    ]);
    return { announcement, homeHero };
  },
  component: HomePage,
});
