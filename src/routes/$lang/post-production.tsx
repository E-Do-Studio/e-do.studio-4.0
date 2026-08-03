import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { settle } from '../../lib/route-data';
import { fetchPostProdTypes } from '../../lib/strapi';

export const Route = createFileRoute('/$lang/post-production')({
  // `?type=` est une cible de redirection 301 depuis les URLs v3
  // (/post-production/lookbook → /fr/post-production?type=lookbook, cf.
  // Caddyfile) : le paramètre absent équivaut à la catégorie par défaut, et
  // n'est jamais écrit dans l'URL.
  validateSearch: (search: Record<string, unknown>): { type?: string } =>
    typeof search.type === 'string' && search.type ? { type: search.type } : {},
  loader: async () => ({ postProdTypes: await settle(fetchPostProdTypes()) }),
  component: lazyRouteComponent(() => import('../../postprod-page'), 'PostprodPage'),
});
