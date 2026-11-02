import type { ContactInfo } from './strapi';

/**
 * L'URL d'itinéraire vers le studio.
 *
 * `googleMapsUrl` vient du CMS ; à défaut, la recherche Google Maps est
 * construite sur l'adresse, pour que l'adresse reste cliquable même quand le
 * champ n'est pas rempli.
 */
function mapsLink(contact: ContactInfo | null): string | null {
  if (!contact) return null;
  if (contact.googleMapsUrl) return contact.googleMapsUrl;
  const query =
    contact.fullAddress ||
    [contact.address.street, contact.address.zip].filter(Boolean).join(' ');
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

export { mapsLink };
