import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/$lang/reserver/contact')({
  beforeLoad: () => {
    throw redirect({ to: '/$lang/contact', params: { lang: 'fr' } });
  },
  component: () => null,
});
