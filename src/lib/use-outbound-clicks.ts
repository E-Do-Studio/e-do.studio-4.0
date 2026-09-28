import { useEffect } from 'react';
import { capture } from './analytics';
import { outboundTarget } from './outbound';

/**
 * `outbound_click` pour tout lien `tel:`, `mailto:` ou vers un autre domaine
 * (réseaux, Giggster, itinéraire), où qu'il soit rendu.
 *
 * Un seul écouteur délégué plutôt qu'un `onClick` par lien : les liens des
 * réseaux viennent du CMS, le téléphone et l'e-mail sont rendus à une dizaine
 * d'endroits, et un lien ajouté demain serait oublié. Phase de capture, pour
 * qu'un `stopPropagation` en aval ne le rende pas invisible.
 */
export function useOutboundClicks(): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest('a[href]')
          : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      const target = outboundTarget(link.href, window.location.hostname);
      if (target) capture('outbound_click', { target });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
}
