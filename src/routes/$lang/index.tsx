import { createFileRoute } from '@tanstack/react-router';
import { DirectionA } from '../../direction-editorial';
import { settle } from '../../lib/route-data';
import { fetchAnnouncement, fetchHomeHero } from '../../lib/strapi';

export const Route = createFileRoute('/$lang/')({
  loader: async () => {
    const [announcement, homeHero] = await Promise.all([
      settle(fetchAnnouncement()),
      settle(fetchHomeHero()),
    ]);
    return { announcement, homeHero };
  },
  component: DirectionA,
});
