import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { captureException } from './lib/analytics';
import type { Lang } from './types';
import { RuntimeErrorScreen } from './ui/runtime-error-screen';

interface PostHogErrorBoundaryProps {
  children: ReactNode;
}

interface PostHogErrorBoundaryState {
  hasError: boolean;
}

function detectLang(): Lang {
  try {
    return window.location.pathname.startsWith('/en') ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

class PostHogErrorBoundary extends Component<
  PostHogErrorBoundaryProps,
  PostHogErrorBoundaryState
> {
  state: PostHogErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PostHogErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureException(error, {
      $exception_level: 'error',
      component_stack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <RuntimeErrorScreen lang={detectLang()} />;
  }
}

/**
 * Erreur levée par un loader ou un `beforeLoad`. TanStack la rattrape dans sa
 * propre frontière, avant `PostHogErrorBoundary` : sans ce composant, un
 * Strapi en panne ou un loader qui jette ne laissait aucune trace. L'effet
 * tourne aussi à l'hydratation d'une erreur rendue côté serveur.
 */
const RouteErrorScreen = ({ error }: { error: unknown }) => {
  // Le chemin du routeur et non `window` : cet écran est aussi rendu côté
  // serveur, où `detectLang()` retomberait sur `fr` pour une page anglaise.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    captureException(error, { $exception_level: 'error', source: 'route' });
  }, [error]);
  return <RuntimeErrorScreen lang={pathname.startsWith('/en') ? 'en' : 'fr'} />;
};

export { PostHogErrorBoundary, RouteErrorScreen };
export type { PostHogErrorBoundaryProps };
