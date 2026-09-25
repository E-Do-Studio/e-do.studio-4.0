import type { DiscoveryPost } from '../types';
import { discoveryPostPath } from './screens';
import { escapeHtmlAttr, PRERENDER_ROUTE_PAIRS, SITE_ORIGIN } from './seo-meta';

// Le sitemap est généré à la requête, et non plus écrit à la main dans
// public/ : un fichier statique ne pouvait pas lister les articles Discovery,
// qui viennent de Strapi. Or ce sont les pages écrites pour les requêtes
// métier (« louer un cyclorama à Saint-Ouen », « photo packshot »), et l'index
// qui les liait ne le faisait que par des `<button>` — elles n'avaient aucune
// porte d'entrée pour un moteur.
//
// Ni `changefreq` ni `priority` : Google les ignore l'un et l'autre, et
// l'ancien fichier les tenait à jour à la main pour rien. `lastmod`, lui, est
// lu — mais seulement s'il est exact, d'où sa seule présence sur les articles.

interface SitemapEntry {
  fr: string;
  en: string;
  lastmod?: string;
}

function urlBlock(loc: string, entry: SitemapEntry): string {
  const lines = [
    '  <url>',
    `    <loc>${escapeHtmlAttr(loc)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="fr" href="${escapeHtmlAttr(entry.fr)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeHtmlAttr(entry.en)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtmlAttr(entry.fr)}"/>`,
  ];
  if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  lines.push('  </url>');
  return lines.join('\n');
}

// Un article que la rédaction a marqué noindex dans une langue n'est listé
// dans aucune : les deux URLs se déclarent alternatives l'une de l'autre, en
// retirer une seule laisserait un hreflang pointer vers une page exclue.
function isIndexable(post: DiscoveryPost): boolean {
  return !post.seo?.fr?.noIndex && !post.seo?.en?.noIndex;
}

function toLastmod(iso?: string): string | undefined {
  if (!iso || Number.isNaN(Date.parse(iso))) return undefined;
  return iso.slice(0, 10);
}

export function buildSitemap(posts: DiscoveryPost[]): string {
  const entries: SitemapEntry[] = [
    ...PRERENDER_ROUTE_PAIRS.map((p) => ({
      fr: `${SITE_ORIGIN}${p.fr}`,
      en: `${SITE_ORIGIN}${p.en}`,
    })),
    ...posts.filter(isIndexable).map((post) => ({
      fr: `${SITE_ORIGIN}${discoveryPostPath('fr', post.slug)}`,
      en: `${SITE_ORIGIN}${discoveryPostPath('en', post.slug)}`,
      lastmod: toLastmod(post.publishedAt),
    })),
  ];
  const blocks = entries.flatMap((e) => [urlBlock(e.fr, e), urlBlock(e.en, e)]);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...blocks,
    '</urlset>',
    '',
  ].join('\n');
}
