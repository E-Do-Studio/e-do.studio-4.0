import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { manualStepSearch } from '../../../lib/route-data';

export const Route = createFileRoute('/$lang/reserver/manuel')({
  validateSearch: manualStepSearch,
  component: lazyRouteComponent(() => import('../../../book/book-step-routes'), 'ManualBook'),
});
