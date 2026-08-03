import { createFileRoute, notFound } from '@tanstack/react-router';
import type { Lang } from '../../types';

const VALID_LANGS: Lang[] = ['fr', 'en'];

export const Route = createFileRoute('/$lang')({
  // `$lang` capture n'importe quel premier segment : sans ce garde, /nimportequoi
  // serait traité comme une langue. On répond 404 plutôt que de rediriger vers
  // /fr — une URL inconnue doit renvoyer un vrai 404, pas un soft 404 vers
  // l'accueil. C'est ce que faisait Caddy (@invalid_top_level) avant le SSR.
  beforeLoad: ({ params }) => {
    if (!VALID_LANGS.includes(params.lang as Lang)) throw notFound();
  },
});
