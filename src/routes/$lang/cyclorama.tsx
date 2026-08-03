import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { settle } from '../../lib/route-data';
import { fetchPlateaux } from '../../lib/strapi';

export const Route = createFileRoute('/$lang/cyclorama')({
  loader: async () => ({ plateaux: await settle(fetchPlateaux()) }),
  component: lazyRouteComponent(() => import('../../plateau-page'), 'CycloramaPage'),
});
