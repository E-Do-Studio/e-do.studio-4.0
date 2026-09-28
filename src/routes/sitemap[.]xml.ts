import { createFileRoute } from '@tanstack/react-router';
import { settle } from '../lib/route-data';
import { buildSitemap } from '../lib/sitemap';
import { fetchDiscoveryPosts } from '../lib/strapi';

// Une panne Strapi rend le sitemap sans les articles plutôt qu'une erreur :
// les pages fixes restent listées, et le prochain passage du robot rattrape.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const posts = await settle(fetchDiscoveryPosts());
        return new Response(buildSitemap(posts ?? []), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
