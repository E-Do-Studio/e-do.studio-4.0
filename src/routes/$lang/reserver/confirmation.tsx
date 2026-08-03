import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/$lang/reserver/confirmation')({
  component: lazyRouteComponent(() => import('../../../book/book-confirmation'), 'BookConfirmation'),
});
