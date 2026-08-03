import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { teamLoader } from '../../lib/route-data';

export const Route = createFileRoute('/$lang/contact')({
  loader: teamLoader,
  component: lazyRouteComponent(() => import('../../contact-page'), 'ContactPage'),
});
