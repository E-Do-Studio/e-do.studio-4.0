import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { getI18n } from './i18n';
import { captureException } from './lib/analytics';
import type { Lang } from './types';

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

    const t = getI18n(detectLang()).t;
    return (
      <Empty size="page">
        <EmptyHeader>
          <EmptyTitle>{t('runtimeError.title')}</EmptyTitle>
          <EmptyDescription>{t('runtimeError.body')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" onClick={() => window.location.reload()}>
            {t('runtimeError.reload')}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
}

export { PostHogErrorBoundary };
export type { PostHogErrorBoundaryProps };
