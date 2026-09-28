import { useEffect, useState } from 'react';
import { afterLoad } from '@/lib/after-load';

/**
 * Vrai une fois la page chargée et au repos (cf. afterLoad).
 *
 * Pour les iframes tierces du premier écran — la carte Google Maps du contact,
 * les visionneuses 3D Cappasity de la galerie. `loading="lazy"` ne les retenait
 * pas, puisqu'elles sont visibles : elles partaient avec le document, ~600 Ko
 * de JavaScript pour la carte et plusieurs Mo par visionneuse, et retardaient
 * la première peinture de la page d'environ une seconde sur mobile.
 *
 * Faux au rendu serveur et à l'hydratation : le cadre garde son fond de
 * réserve jusque-là.
 */
export function useAfterLoad(): boolean {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => afterLoad(() => setLoaded(true)), []);
  return loaded;
}
