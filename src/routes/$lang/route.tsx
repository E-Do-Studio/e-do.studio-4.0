import { createFileRoute, redirect } from '@tanstack/react-router';
import type { Lang } from '../../types';

const VALID_LANGS: Lang[] = ['fr', 'en'];

export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    if (!VALID_LANGS.includes(params.lang as Lang)) {
      throw redirect({ to: '/$lang', params: { lang: 'fr' } });
    }
  },
});
