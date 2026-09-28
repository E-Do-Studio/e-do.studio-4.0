import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ConfirmationSnapshot,
  confirmationViewedProps,
  loadConfirmation,
  saveConfirmation,
} from './confirmation-snapshot';

const snapshot = (
  over: Partial<ConfirmationSnapshot> = {},
): ConfirmationSnapshot => ({
  v: 3,
  ts: 0,
  mode: 'booking',
  savedRef: 'EDO-R-ABC123',
  plateauKey: 'eclipse',
  plateauName: { fr: 'Eclipse', en: 'Eclipse' },
  selected: null,
  arrivalHour: null,
  rentalHours: 4,
  slotIds: [],
  slots: {},
  sessions: [],
  contact: {},
  total: 480,
  rows: [],
  isCyclo: false,
  ...over,
});

describe('confirmationViewedProps', () => {
  it('reprend le mode et le total du récapitulatif', () => {
    expect(confirmationViewedProps(snapshot({ mode: 'quote' }))).toEqual({
      submit_mode: 'quote',
      total: 480,
      snapshot_present: true,
    });
  });

  // Régression #421 : sans snapshot, l'événement ne partait pas du tout.
  it('signale l’absence de récapitulatif au lieu de se taire', () => {
    expect(confirmationViewedProps(null)).toEqual({
      submit_mode: null,
      total: 0,
      snapshot_present: false,
    });
  });
});

describe('loadConfirmation', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('relit ce que le submit a écrit', () => {
    const { v: _v, ts: _ts, ...input } = snapshot();
    saveConfirmation(input);
    expect(loadConfirmation()).toMatchObject({ v: 3, mode: 'booking' });
  });

  it('renvoie null sans snapshot', () => {
    expect(loadConfirmation()).toBeNull();
  });

  it('écarte un snapshot d’une version antérieure', () => {
    store.set('edo-booking-confirmation', JSON.stringify({ v: 2 }));
    expect(loadConfirmation()).toBeNull();
    expect(store.size).toBe(0);
  });

  it('renvoie null sur un snapshot illisible', () => {
    store.set('edo-booking-confirmation', '{');
    expect(loadConfirmation()).toBeNull();
  });
});
