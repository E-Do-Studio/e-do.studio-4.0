import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { teamLoader } from '../../../lib/route-data';

export const Route = createFileRoute('/$lang/reserver/')({
  loader: teamLoader,
  component: lazyRouteComponent(() => import('../../../book/book-picker'), 'BookPicker'),
});
