import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/$lang/reserver/configurateur/')({
  component: lazyRouteComponent(() => import('../../../../book/book-step-routes'), 'ConfigStep0'),
});
