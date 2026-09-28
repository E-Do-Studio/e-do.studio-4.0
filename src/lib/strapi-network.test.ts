import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./analytics', () => ({ captureException: vi.fn() }));

const ok = () =>
  new Response(JSON.stringify({ data: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('lectures Strapi et coupures réseau', () => {
  beforeEach(() => {
    // Le cache et la déduplication vivent au niveau du module : un module
    // neuf par test, sinon le second lit la réponse du premier.
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Régression #394 et suivantes : une coupure passagère rendait la page
  // vide et remontait un « Failed to fetch » par langue.
  it('rejoue une fois une requête coupée, sans rien signaler', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(async () => ok());
    vi.stubGlobal('fetch', fetchMock);
    const { fetchMachines } = await import('./strapi');
    const { captureException } = await import('./analytics');

    await expect(fetchMachines()).resolves.toEqual([]);
    // FR coupé puis rejoué, EN du premier coup.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('signale la panne quand la seconde tentative échoue aussi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    const { fetchMachines } = await import('./strapi');
    const { captureException } = await import('./analytics');

    await expect(fetchMachines()).rejects.toThrow('Failed to fetch');
    expect(captureException).toHaveBeenCalled();
  });

  it('ne rejoue pas une erreur HTTP', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => new Response('{}', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchMachines } = await import('./strapi');

    await expect(fetchMachines()).rejects.toThrow();
    // Une requête par langue, aucune relance.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
