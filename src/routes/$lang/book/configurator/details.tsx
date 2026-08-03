import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/$lang/book/configurator/details')({
  component: lazyRouteComponent(() => import('../../../../book/book-step-routes'), 'ConfigStep5'),
});
