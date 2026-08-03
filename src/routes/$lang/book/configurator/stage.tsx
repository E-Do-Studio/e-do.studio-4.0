import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/$lang/book/configurator/stage')({
  component: lazyRouteComponent(() => import('../../../../book/book-step-routes'), 'ConfigStep2'),
});
