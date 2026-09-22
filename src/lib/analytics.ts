import posthog from 'posthog-js';

const PROJECT_TOKEN = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
const API_HOST =
  import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://eu.i.posthog.com';

let started = false;

export function isPostHogEnabled(): boolean {
  return Boolean(PROJECT_TOKEN);
}

export function isPostHogStarted(): boolean {
  return started;
}

export function startPostHog(): void {
  if (started || !PROJECT_TOKEN) return;
  if (typeof window === 'undefined') return;
  started = true;

  posthog.init(PROJECT_TOKEN, {
    api_host: API_HOST,
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-05-30',
    capture_pageview: false,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: true,
    },
    capture_performance: { web_vitals: true },
    person_profiles: 'identified_only',
    session_recording: {
      maskAllInputs: true,
    },
  });
}

export function stopPostHog(): void {
  if (!started) return;
  posthog.opt_out_capturing();
  posthog.stopSessionRecording();
}

export function optInPostHog(): void {
  if (!started) return;
  if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
}

export function capture(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!started) return;
  posthog.capture(event, properties);
}

export function captureException(
  error: unknown,
  properties?: Record<string, unknown>,
): void {
  if (!started) return;
  posthog.captureException(error, properties);
}

export function capturePageview(path: string): void {
  if (!started) return;
  posthog.capture('$pageview', {
    $current_url: window.location.href,
    path,
  });
}
