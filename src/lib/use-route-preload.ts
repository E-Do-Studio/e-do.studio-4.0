import { useRouter, useRouterState } from '@tanstack/react-router';
import { useCallback, useEffect, useRef } from 'react';

// Charger la route d'arrivée pendant que le curseur est encore sur la cellule.
//
// Les loaders sont isomorphes — aucun `createServerFn` dans le dépôt — donc une
// navigation client les exécute dans le navigateur, où le cache module de
// strapi.ts est froid : deux à quatre requêtes réelles vers le CMS. Et sans
// `pendingComponent`, TanStack n'arme pas son minuteur de pending et ne commit
// rien en avance : l'ancienne page reste à l'écran tout le temps du réseau.
//
// Mesuré : Discovery, quatre requêtes, préchargée en 177ms puis affichée en
// 70ms au clic, contre 200 à 700ms sans. Le survol précède le clic de bien plus
// que cela.
//
// `defaultPreload: 'intent'` ferait la même chose et mieux, mais il n'agit que
// sur `<Link>` : ces cellules sont des `<a>` qui naviguent par `useNavigate`,
// leurs chemins venant de SCREEN_TO_PATH, calculés.
const PRELOAD_DELAY_MS = 60;

/**
 * Les gestionnaires à étaler sur une cible de navigation pour la précharger à
 * l'intention.
 *
 * ```tsx
 * <a href={href} {...useRoutePreload(href)}>…</a>
 * ```
 */
export const useRoutePreload = (to: string) => {
  const router = useRouter();
  const rendered = useRouterState({
    select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname,
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  // Le délai n'est pas cosmétique : les cinq destinations sont côte à côte, et
  // un survol qui balaye la bande déclencherait les cinq préchargements — une
  // dizaine de requêtes au CMS pour une intention qui n'existe pas. C'est ce
  // que fait `defaultPreloadDelay`, hors d'atteinte ici.
  const arm = useCallback(() => {
    if (to === rendered || timer.current !== undefined) return;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      // Avalé, et c'est la bonne réponse : un préchargement qui échoue ne
      // concerne pas l'utilisateur, il n'a rien demandé. La navigation réelle
      // rejouera le loader et fera remonter l'erreur là où elle se voit. La
      // règle « pas d'échec silencieux » vise les parcours client — réservation,
      // e-mail —, pas une anticipation dont personne n'attend le résultat.
      router.preloadRoute({ to }).catch(() => {});
    }, PRELOAD_DELAY_MS);
  }, [router, to, rendered]);

  useEffect(() => cancel, [cancel]);

  return {
    onMouseEnter: arm,
    onMouseLeave: cancel,
    onFocus: arm,
    onBlur: cancel,
  };
};
