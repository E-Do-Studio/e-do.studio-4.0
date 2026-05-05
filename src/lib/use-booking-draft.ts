import { useEffect, useRef, useCallback } from 'react';

const DRAFT_KEY = 'edo-booking-draft';
const DRAFT_VERSION = 1;
const DEBOUNCE_MS = 800;

export interface BookingDraft {
  v: number;
  ts: number;
  step: number;
  configGlobal: { projectType: string; urgency: string; postprod: boolean };
  configSessions: unknown[];
  activeSessionIdx: number;
  configApplied: boolean;
  plateau: string | null;
  plateaus: string[];
  perPlateau: Record<string, unknown>;
  slotType: string;
  hours: number;
  cycloMode: string;
  paint: boolean;
  kwh: number;
  team: Record<string, unknown>;
  pp: Record<string, unknown>;
  contact: Record<string, unknown>;
  selected: { y: number; m: number; d: number } | null;
  arrivalHour: number;
  dateIdx: number;
  viewY: number;
  viewM: number;
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function loadDraft(): BookingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingDraft;
    if (parsed.v !== DRAFT_VERSION) return null;
    if (Date.now() - parsed.ts > MAX_AGE_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export function useBookingDraftSaver(getState: () => Omit<BookingDraft, 'v' | 'ts'>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getStateRef = useRef(getState);
  getStateRef.current = getState;

  const save = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const state = getStateRef.current();
        const draft: BookingDraft = { v: DRAFT_VERSION, ts: Date.now(), ...state };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {}
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return save;
}
