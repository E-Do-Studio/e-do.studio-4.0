import type { Lang } from '../types';
import { META, PRERENDER_ROUTE_PAIRS, SITE_ORIGIN } from './seo-meta';
import type { JsonLdNode } from './structured-data';

export interface SeoHeadInput {
  /** Clé dans META (src/lib/seo-meta.ts). */
  metaKey: string;
  lang: Lang;
  /** Chemin sans le préfixe de langue, ex. '/cyclorama'. '' pour l'accueil. */
  pathname: string;
  /** Surcharges Strapi (seo component) — priorité sur META. */
  title?: string;
  description?: string;
  imageUrl?: string;
  noIndex?: boolean;
  /** Schémas JSON-LD de la page, sérialisés en @graph. */
  jsonLd?: (JsonLdNode | null | undefined | false)[];
}

function stripContext(node: JsonLdNode): JsonLdNode {
  if (!node['@context']) return node;
  const copy: JsonLdNode = { ...node };
  delete copy['@context'];
  return copy;
}

export function serializeJsonLd(
  nodes: (JsonLdNode | null | undefined | false)[],
): string | null {
  const items = nodes.filter(
    (n): n is JsonLdNode => !!n && typeof n === 'object',
  );
  if (items.length === 0) return null;
  // Plusieurs schémas sont regroupés dans un @graph unique pour que les moteurs
  // les lisent comme un ensemble partageant le même @context.
  return JSON.stringify(
    items.length === 1
      ? items[0]
      : { '@context': 'https://schema.org', '@graph': items.map(stripContext) },
  );
}

/** Paire d'URLs FR/EN d'une route, pour les alternates hreflang. */
function hreflangPair(metaKey: string, pathname: string) {
  const pair = PRERENDER_ROUTE_PAIRS.find((p) => p.metaKey === metaKey);
  if (pair)
    return { fr: `${SITE_ORIGIN}${pair.fr}`, en: `${SITE_ORIGIN}${pair.en}` };
  // Routes hors du catalogue (articles Discovery, étapes de réservation) : le
  // chemin est identique dans les deux langues, seul le préfixe change.
  return {
    fr: `${SITE_ORIGIN}/fr${pathname}`,
    en: `${SITE_ORIGIN}/en${pathname}`,
  };
}

/**
 * Construit le <head> d'une route : titre, description, canonical, hreflang,
 * Open Graph, Twitter et JSON-LD.
 *
 * Source de vérité unique, appelée depuis le `head()` de chaque route. Elle
 * remplace l'ancien couple applyRouteMeta (réécriture du HTML au build) et
 * useDocumentMeta (mutation du DOM à l'exécution), qui pouvaient diverger.
 *
 * Priorité de chaque champ : surcharge Strapi, puis META[metaKey], puis META.home.
 */
export function buildSeoHead(input: SeoHeadInput) {
  const { metaKey, lang, pathname, imageUrl, noIndex, jsonLd = [] } = input;
  const pageMeta = META[metaKey]?.[lang];
  const title = input.title || pageMeta?.title || META.home[lang].title;
  const description =
    input.description || pageMeta?.description || META.home[lang].description;
  const url = `${SITE_ORIGIN}/${lang}${pathname}`;
  const alt = hreflangPair(metaKey, pathname);

  const meta: Record<string, string>[] = [
    { title },
    { name: 'description', content: description },
    {
      name: 'robots',
      content: noIndex ? 'noindex, nofollow' : 'index, follow',
    },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:locale', content: lang === 'en' ? 'en_US' : 'fr_FR' },
    {
      property: 'og:locale:alternate',
      content: lang === 'en' ? 'fr_FR' : 'en_US',
    },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ];
  if (imageUrl) {
    meta.push({ property: 'og:image', content: imageUrl });
    meta.push({ name: 'twitter:image', content: imageUrl });
  }

  const links: Record<string, string>[] = [];
  // Une page noindex ne doit ni se canonicaliser ni annoncer d'équivalent de
  // langue : ce serait un signal contradictoire avec son exclusion de l'index.
  if (!noIndex) {
    meta.push({ property: 'og:url', content: url });
    links.push({ rel: 'canonical', href: url });
    links.push({ rel: 'alternate', hrefLang: 'fr', href: alt.fr });
    links.push({ rel: 'alternate', hrefLang: 'en', href: alt.en });
    links.push({ rel: 'alternate', hrefLang: 'x-default', href: alt.fr });
  }

  const json = serializeJsonLd(jsonLd);
  const scripts = json
    ? [{ type: 'application/ld+json', children: json }]
    : undefined;

  return { meta, links, ...(scripts ? { scripts } : {}) };
}
