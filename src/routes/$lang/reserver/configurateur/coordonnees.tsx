import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/$lang/reserver/configurateur/coordonnees')({
  component: lazyRouteComponent(() => import('../../../../book/book-step-routes'), 'ConfigStep5'),
});
