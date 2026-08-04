import { useCallback, useSyncExternalStore } from 'react';

// Une MediaQueryList par requête, partagée entre tous les composants : elle sert
// de source d'instantané stable à useSyncExternalStore, qui compare les
// snapshots par identité.
const lists = new Map<string, MediaQueryList>();

function mediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) return null;
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
}

/**
 * Lecture ponctuelle, hors rendu.
 *
 * Pour les media queries consultées dans un gestionnaire d'événement plutôt
 * qu'au rendu : `matches` est une lecture live, la valeur est donc toujours à
 * jour sans abonnement. Y abonner un composant coûterait un re-rendu à chaque
 * changement pour une valeur qui n'est lue qu'à l'interaction.
 */
export function matchesMedia(query: string): boolean {
  return mediaQueryList(query)?.matches ?? false;
}

/**
 * S'abonne à une media query.
 *
 * Remplace le trio `useState(false)` + `useEffect` + `addEventListener` qui
 * était réécrit à l'identique dans plusieurs composants. Le contrat reste le
 * même — **faux au premier rendu**, y compris côté serveur où `matchMedia`
 * n'existe pas — mais il est ici porté par `getServerSnapshot` plutôt que par
 * une valeur initiale choisie à la main : serveur et première passe client
 * s'accordent par construction, donc pas d'incohérence d'hydratation.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = mediaQueryList(query);
      if (!list) return () => {};
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => mediaQueryList(query)?.matches ?? false,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Vrai à partir du point de rupture `md` de Tailwind.
 *
 * Sert notamment à ne pas monter l'assistant (React.lazy) pendant le rendu
 * serveur : celui-ci n'étant pas streamé, il ne peut pas résoudre une frontière
 * Suspense et lèverait une erreur d'hydratation (React #419).
 */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');

/** Vrai quand le visiteur a demandé à réduire les animations. */
export const usePrefersReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)');

/** Vrai sur un pointeur fin capable de survol — souris, pas tactile. */
export const useSupportsHover = () =>
  useMediaQuery('(hover: hover) and (pointer: fine)');
