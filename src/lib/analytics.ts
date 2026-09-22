import posthog from 'posthog-js';
import type { AnalyticsEvent, AnalyticsEvents } from './analytics-events';
import type { CookieConsent } from './use-cookie-consent';

const PROJECT_TOKEN = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
// Proxy géré par PostHog sur un sous-domaine du site : les bloqueurs de pub
// ne filtrent pas `d.e-do.studio`, et l'IP du visiteur arrive intacte (géoloc,
// hash du mode cookieless). Toujours lui en production, quelle que soit la
// variable d'environnement. En dev, hôte direct, surchargeable (faux serveur
// de test).
const API_HOST = import.meta.env.DEV
  ? import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://eu.i.posthog.com'
  : 'https://d.e-do.studio';

let started = false;

export function isPostHogEnabled(): boolean {
  return Boolean(PROJECT_TOKEN);
}

/**
 * Démarre PostHog quel que soit le consentement.
 *
 * `cookieless_mode: 'on_reject'` : tant que le visiteur n'a pas accepté (refus
 * ou bannière ignorée), le SDK n'écrit ni cookie ni stockage et l'identité est
 * un hash calculé côté serveur — pageviews et événements de tunnel restent
 * comptés, sans replay ni profil. Sans ce mode, tout visiteur n'ayant pas
 * accepté disparaissait des funnels, qui ne mesuraient plus que les
 * consentants. Exige l'option « cookieless server hash » dans le projet
 * PostHog, faute de quoi ces événements sont jetés à l'ingestion.
 */
export function startPostHog(): void {
  if (started || !PROJECT_TOKEN) return;
  if (typeof window === 'undefined') return;
  started = true;

  posthog.init(PROJECT_TOKEN, {
    api_host: API_HOST,
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-05-30',
    cookieless_mode: 'on_reject',
    // Sans lui, « pas encore répondu » n'est ni refus ni accord et le SDK ne
    // capture RIEN : la bannière ignorée — le cas majoritaire — redevenait
    // invisible. Refus par défaut = cookieless jusqu'à l'acceptation.
    opt_out_capturing_by_default: true,
    // Le consentement vit déjà dans `edo-cookie-consent` ; le SDK n'en garde
    // qu'un miroir, en localStorage plutôt qu'en cookie.
    opt_out_capturing_persistence_type: 'localStorage',
    // Le SDK suit lui-même les navigations du routeur. Les étapes du mode
    // manuel (`?step=N`, en replaceState) n'en produisent pas : c'est
    // `booking_step_viewed` qui les compte.
    capture_pageview: 'history_change',
    capture_pageleave: true,
    enable_heatmaps: true,
    capture_dead_clicks: true,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      // Les échecs connus sont capturés explicitement ; les `console.error`
      // qui les accompagnent les faisaient compter deux fois.
      capture_console_errors: false,
    },
    capture_performance: { web_vitals: true, network_timing: true },
    person_profiles: 'identified_only',
    session_recording: {
      maskAllInputs: true,
    },
  });
}

export function syncConsent(consent: CookieConsent): void {
  if (!started) return;
  // Le miroir du SDK survit aux visites : ne rejouer l'opt-in que s'il a
  // changé, sinon chaque chargement émettrait un `$opt_in`.
  const status = posthog.get_explicit_consent_status();
  if (consent === 'accepted' && status !== 'granted') {
    posthog.opt_in_capturing();
  } else if (consent === 'rejected' && status !== 'denied') {
    posthog.opt_out_capturing();
  }
}

export function registerSiteLang(lang: string): void {
  if (!started) return;
  posthog.register({ site_lang: lang });
}

export function capture<K extends AnalyticsEvent>(
  event: K,
  properties: AnalyticsEvents[K],
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

/**
 * Rattache le parcours à une personne. Seulement après un consentement
 * explicite : en cookieless, il n'y a pas d'identité stable à relier, et
 * l'e-mail ne doit pas partir sans accord.
 */
export function identify(
  email: string,
  properties: Record<string, string | undefined>,
): void {
  if (!started) return;
  if (posthog.get_explicit_consent_status() !== 'granted') return;
  const address = email.trim().toLowerCase();
  if (!address) return;
  posthog.identify(address, { email: address, ...properties });
}

/**
 * Transmis aux Edge Functions pour que leurs événements serveur rejoignent le
 * parcours (et le replay) du visiteur plutôt qu'une personne orpheline.
 */
export function getDistinctId(): string | undefined {
  if (!started) return undefined;
  return posthog.get_distinct_id();
}
