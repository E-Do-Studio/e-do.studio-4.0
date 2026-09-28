import type { OutboundTarget } from './analytics-events';

/**
 * La cible d'un lien qui quitte le site, ou `null` pour un lien interne.
 *
 * Le domaine plutôt que l'URL : le chemin d'un lien sortant peut porter un
 * identifiant (itinéraire, profil), le domaine suffit à dire où va le visiteur.
 */
export function outboundTarget(
  href: string,
  siteHost: string,
): OutboundTarget | null {
  let url: URL;
  try {
    url = new URL(href, `https://${siteHost}`);
  } catch {
    return null;
  }
  if (url.protocol === 'tel:') return 'tel';
  if (url.protocol === 'mailto:') return 'email';
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\./, '');
  if (host === siteHost.replace(/^www\./, '')) return null;
  return host;
}
