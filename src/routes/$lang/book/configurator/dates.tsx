import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/$lang/book/configurator/dates')({
  component: lazyRouteComponent(() => import('../../../../book/book-step-routes'), 'ConfigStep6'),
});
