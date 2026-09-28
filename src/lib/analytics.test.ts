import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: posthog }));

// `analytics.ts` lit le jeton et pose ses écouteurs au chargement du module :
// chaque test en charge une instance neuve, après avoir préparé l'environnement.
async function loadAnalytics(token: string) {
  vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', token);
  vi.stubGlobal('window', {
    location: { pathname: '/fr/plateau/eclipse' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestIdleCallback: (fn: () => void) => fn(),
  });
  // Page déjà chargée : `afterLoad` passe directement au repos.
  vi.stubGlobal('document', { readyState: 'complete' });
  vi.resetModules();
  return import('./analytics');
}

// L'import dynamique du SDK se résout sur une microtâche.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('capture', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // Régression #421 : au chargement d'une page, ses effets passent avant
  // `startPostHog()`. L'événement émis au montage était jeté.
  it('garde un événement émis avant le démarrage et le rejoue ensuite', async () => {
    const analytics = await loadAnalytics('phc_test');
    analytics.capture('booking_confirmation_viewed', {
      submit_mode: 'booking',
      total: 480,
      snapshot_present: true,
    });
    expect(posthog.capture).not.toHaveBeenCalled();

    analytics.startPostHog();
    await flush();

    expect(posthog.init).toHaveBeenCalledOnce();
    expect(posthog.capture).toHaveBeenCalledWith(
      'booking_confirmation_viewed',
      { submit_mode: 'booking', total: 480, snapshot_present: true },
    );
  });

  it('envoie directement une fois le SDK arrivé', async () => {
    const analytics = await loadAnalytics('phc_test');
    analytics.startPostHog();
    await flush();
    analytics.capture('booking_config_skipped', {});
    expect(posthog.capture).toHaveBeenCalledWith('booking_config_skipped', {});
  });

  it('ne fait rien sans jeton de projet', async () => {
    const analytics = await loadAnalytics('');
    analytics.capture('booking_config_skipped', {});
    analytics.startPostHog();
    await flush();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

describe('captureCta', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rattache le CTA à la page du clic', async () => {
    const analytics = await loadAnalytics('phc_test');
    analytics.startPostHog();
    await flush();
    analytics.captureCta('book_stage', 'eclipse');
    expect(posthog.capture).toHaveBeenCalledWith('cta_clicked', {
      cta: 'book_stage',
      pathname: '/fr/plateau/eclipse',
      plateau: 'eclipse',
    });
  });

  it('omet le plateau quand le CTA n’en vise aucun', async () => {
    const analytics = await loadAnalytics('phc_test');
    analytics.startPostHog();
    await flush();
    analytics.captureCta('book');
    expect(posthog.capture).toHaveBeenCalledWith('cta_clicked', {
      cta: 'book',
      pathname: '/fr/plateau/eclipse',
    });
  });

  // Critère 4 de #431 : les nouveaux événements passent par la même file que
  // les autres, aucun ne part avant l'arrivée du SDK.
  it('met en file un clic émis avant le démarrage', async () => {
    const analytics = await loadAnalytics('phc_test');
    analytics.captureCta('book');
    analytics.capture('outbound_click', { target: 'tel' });
    expect(posthog.capture).not.toHaveBeenCalled();
    analytics.startPostHog();
    await flush();
    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });
});
