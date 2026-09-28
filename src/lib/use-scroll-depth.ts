import { type RefObject, useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import type { ScrollDepth } from './analytics-events';
import { capture } from './analytics';
import { depthRatio, newDepths, type ScrollMetrics } from './scroll-depth';

/**
 * `scroll_depth` à 25, 50, 75 et 100 %, une fois par palier et par page.
 *
 * Sans `ref`, la profondeur est celle du document. Avec, c'est la part de CET
 * élément que le visiteur a vue — et ce n'est pas le même conteneur qui défile
 * selon le palier : au-delà d'`app` la page est verrouillée et l'article défile
 * en lui-même ; en dessous, c'est la fenêtre, et l'article n'est qu'une partie
 * de la page. Mesurer le document seul compterait l'en-tête et les articles
 * voisins comme lus.
 *
 * Seul le défilement déclenche une mesure : un article qui tient dans l'écran
 * ne produit rien, faute de pouvoir distinguer la lecture du simple affichage.
 */
export function useScrollDepth(ref?: RefObject<HTMLElement | null>): void {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const reached = new Set<ScrollDepth>();
    const el = ref?.current ?? null;
    let frame = 0;

    const metrics = (): ScrollMetrics => {
      if (el && el.scrollHeight > el.clientHeight + 1) {
        return {
          scrollTop: el.scrollTop,
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
        };
      }
      if (el) {
        const rect = el.getBoundingClientRect();
        return {
          scrollTop: -rect.top,
          clientHeight: window.innerHeight,
          scrollHeight: rect.height,
        };
      }
      const doc = document.documentElement;
      return {
        scrollTop: window.scrollY,
        clientHeight: window.innerHeight,
        scrollHeight: doc.scrollHeight,
      };
    };

    const measure = () => {
      frame = 0;
      for (const depth of newDepths(depthRatio(metrics()), reached)) {
        reached.add(depth);
        capture('scroll_depth', { depth, pathname });
      }
    };
    // Une lecture de géométrie par image au plus : le défilement émet bien
    // plus d'événements que d'images.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    el?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      el?.removeEventListener('scroll', onScroll);
    };
  }, [pathname, ref]);
}
