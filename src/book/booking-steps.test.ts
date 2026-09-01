import { describe, expect, it } from 'vitest';
import type { BookingSession, SlotState } from '../lib/booking-engine';
import { makeBlankSession } from '../lib/booking-engine';
import {
  STEP,
  canGoNext,
  resolveSlotList,
  stepProgress,
  stepsFor,
} from './booking-steps';

const t = ((key: string) => key) as never;

const validSession = (): BookingSession => ({
  ...makeBlankSession(),
  projectType: 'cyclorama',
});

const base = {
  configSessions: [] as BookingSession[],
  slotIds: [] as string[],
  plateau: null as string | null,
  slots: {} as Record<string, SlotState>,
  selected: null,
  contactValid: false,
};

describe('resolveSlotList', () => {
  it('préfère slotIds quand il est peuplé', () => {
    expect(resolveSlotList(['a', 'b'], 'live')).toEqual(['a', 'b']);
  });

  it('retombe sur le plateau seul avant tout ajout de créneau', () => {
    expect(resolveSlotList([], 'live')).toEqual(['live']);
    expect(resolveSlotList(null, 'live')).toEqual(['live']);
  });

  it('rend une liste vide quand rien n’est sélectionné', () => {
    expect(resolveSlotList([], null)).toEqual([]);
  });
});

describe('stepsFor', () => {
  it('le mode config saute le choix de plateau et la post-prod', () => {
    const ns = stepsFor('config', t).map((s) => s.n);
    expect(ns).toEqual([
      STEP.CONFIG,
      STEP.DURATION,
      STEP.TEAM,
      STEP.CONTACT,
      STEP.DATE,
    ]);
  });

  it('le mode manuel commence au plateau et garde la post-prod', () => {
    const ns = stepsFor('manual', t).map((s) => s.n);
    expect(ns).toEqual([
      STEP.PLATEAU,
      STEP.DURATION,
      STEP.TEAM,
      STEP.POSTPROD,
      STEP.CONTACT,
      STEP.DATE,
    ]);
  });
});

describe('canGoNext', () => {
  it('bloque le configurateur tant qu’une session est incomplète', () => {
    expect(
      canGoNext({
        ...base,
        step: STEP.CONFIG,
        configSessions: [makeBlankSession()],
      }),
    ).toBe(false);
    expect(
      canGoNext({
        ...base,
        step: STEP.CONFIG,
        configSessions: [validSession()],
      }),
    ).toBe(true);
  });

  it('bloque le configurateur sans aucune session', () => {
    expect(canGoNext({ ...base, step: STEP.CONFIG })).toBe(false);
  });

  it('accepte le choix de plateau via slotIds ou via plateau seul', () => {
    expect(canGoNext({ ...base, step: STEP.PLATEAU })).toBe(false);
    expect(canGoNext({ ...base, step: STEP.PLATEAU, plateau: 'live' })).toBe(
      true,
    );
    expect(
      canGoNext({ ...base, step: STEP.PLATEAU, slotIds: ['live#0'] }),
    ).toBe(true);
  });

  it('laisse passer les étapes sans contrainte', () => {
    expect(canGoNext({ ...base, step: STEP.DURATION })).toBe(true);
    expect(canGoNext({ ...base, step: STEP.TEAM })).toBe(true);
    expect(canGoNext({ ...base, step: STEP.POSTPROD })).toBe(true);
  });

  it('relaie la validité du contact', () => {
    expect(canGoNext({ ...base, step: STEP.CONTACT })).toBe(false);
    expect(canGoNext({ ...base, step: STEP.CONTACT, contactValid: true })).toBe(
      true,
    );
  });

  it('mono-créneau : exige la date globale', () => {
    expect(canGoNext({ ...base, step: STEP.DATE, plateau: 'live' })).toBe(
      false,
    );
    expect(
      canGoNext({
        ...base,
        step: STEP.DATE,
        plateau: 'live',
        selected: { y: 2026, m: 8, d: 12 },
      }),
    ).toBe(true);
  });

  it('multi-créneaux : exige une date ET une heure sur chacun', () => {
    const slotIds = ['live#0', 'eclipse#1'];
    const dated: Record<string, SlotState> = {
      'live#0': { date: { y: 2026, m: 8, d: 12 }, arrivalHour: 10 },
      'eclipse#1': { date: { y: 2026, m: 8, d: 13 }, arrivalHour: 9 },
    };
    expect(canGoNext({ ...base, step: STEP.DATE, slotIds, slots: dated })).toBe(
      true,
    );
    expect(
      canGoNext({
        ...base,
        step: STEP.DATE,
        slotIds,
        slots: { ...dated, 'eclipse#1': { date: { y: 2026, m: 8, d: 13 } } },
      }),
    ).toBe(false);
    expect(
      canGoNext({
        ...base,
        step: STEP.DATE,
        slotIds,
        slots: { 'live#0': dated['live#0'] },
      }),
    ).toBe(false);
  });
});

describe('stepProgress', () => {
  const steps = stepsFor('manual', t);

  it("marque l'étape courante et celles franchies", () => {
    const p = stepProgress(steps, STEP.TEAM, false);
    expect(p.map((s) => s.active)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(p.map((s) => s.done)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it("n'ouvre l'étape suivante que si l'étape courante est franchissable", () => {
    const blocked = stepProgress(steps, STEP.PLATEAU, false);
    expect(blocked.find((s) => s.n === STEP.DURATION)?.clickable).toBe(false);
    const open = stepProgress(steps, STEP.PLATEAU, true);
    expect(open.find((s) => s.n === STEP.DURATION)?.clickable).toBe(true);
  });

  it('laisse les étapes franchies cliquables, jamais celles au-delà', () => {
    const p = stepProgress(steps, STEP.CONTACT, true);
    expect(p.find((s) => s.n === STEP.PLATEAU)?.clickable).toBe(true);
    expect(p.find((s) => s.n === STEP.DATE)?.clickable).toBe(true);
  });

  it('garde le configurateur toujours atteignable', () => {
    // Il n'est pas dans la liste manuelle ; en mode config il est en tête et
    // reste cliquable même depuis la dernière étape.
    const p = stepProgress(stepsFor('config', t), STEP.DATE, false);
    expect(p.find((s) => s.n === STEP.CONFIG)?.clickable).toBe(true);
  });

  it('retombe sur la première étape quand la courante est hors liste', () => {
    // Cas réel : le mode bascule et l'étape courante n'est plus dans la liste
    // (POSTPROD n'existe qu'en manuel, PLATEAU pas en config). Aucune étape
    // n'est alors courante ni franchie, et seule la première reste ouverte.
    const p = stepProgress(steps, 99, true);
    expect(p.every((s) => !s.active && !s.done)).toBe(true);
    expect(p.filter((s) => s.clickable).map((s) => s.n)).toEqual([
      STEP.PLATEAU,
    ]);
  });
});
