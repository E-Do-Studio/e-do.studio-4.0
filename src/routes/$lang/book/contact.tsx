import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/$lang/book/contact')({
  beforeLoad: () => {
    throw redirect({ to: '/$lang/contact', params: { lang: 'en' } });
  },
  component: () => null,
});
