import { useEffect, useMemo } from 'react';
import type { JsonLdNode } from './structured-data';

const ATTR = 'data-edo-jsonld';

function serialize(nodes: (JsonLdNode | null | undefined | false)[]): string {
  const items = nodes.filter((n): n is JsonLdNode => !!n && typeof n === 'object');
  if (items.length === 0) return '';
  // Wrap multiple schemas in a single @graph so search engines parse them as a set
  // rooted at the same JSON-LD context.
  const payload =
    items.length === 1
      ? items[0]
      : { '@context': 'https://schema.org', '@graph': items.map(stripContext) };
  return JSON.stringify(payload);
}

function stripContext(node: JsonLdNode): JsonLdNode {
  if (!node['@context']) return node;
  const copy: JsonLdNode = { ...node };
  delete copy['@context'];
  return copy;
}

/**
 * Inject one or more JSON-LD schemas into <head> for the current page.
 *
 * - Schemas are tagged with `data-edo-jsonld="<id>"` so they can be replaced on
 *   navigation without touching the static schemas baked into index.html.
 * - Passing `null`/`undefined`/`false` is allowed; falsy entries are dropped so
 *   callers can conditionally include schemas while data is still loading.
 */
export function useStructuredData(
  id: string,
  nodes: (JsonLdNode | null | undefined | false)[],
): void {
  const json = useMemo(() => serialize(nodes), [nodes]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!json) {
      document.querySelectorAll(`script[${ATTR}="${id}"]`).forEach((el) => el.remove());
      return;
    }
    let tag = document.querySelector<HTMLScriptElement>(`script[${ATTR}="${id}"]`);
    if (!tag) {
      tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.setAttribute(ATTR, id);
      document.head.appendChild(tag);
    }
    tag.textContent = json;
    return () => {
      // Leave the tag in place; subsequent renders update its text. We only
      // remove on full unmount of the owning component.
      tag?.remove();
    };
  }, [id, json]);
}
