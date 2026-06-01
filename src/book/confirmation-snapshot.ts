const KEY = 'edo-booking-confirmation';

export type ConfirmationMode = 'request' | 'quote' | 'booking';

export interface ConfirmationSessionSlot {
  plateauKey: string;
  plateauName: { fr: string; en: string };
  date: { y: number; m: number; d: number } | null;
  arrivalHour: number | null;
  hours: number;
}

export interface ConfirmationSnapshot {
  v: 2;
  ts: number;
  mode: ConfirmationMode;
  savedRef: string | null;
  plateauKey: string | null;
  plateauName: { fr: string; en: string };
  selected: { y: number; m: number; d: number } | null;
  arrivalHour: number | null;
  rentalHours: number;
  plateaus: string[];
  perPlateau: Record<string, unknown>;
  sessions: ConfirmationSessionSlot[];
  contact: Record<string, unknown>;
  total: number;
  rows: unknown[];
  isCyclo: boolean;
}

export function saveConfirmation(snapshot: Omit<ConfirmationSnapshot, 'v' | 'ts'>): void {
  try {
    const payload: ConfirmationSnapshot = { v: 2, ts: Date.now(), ...snapshot };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {}
}

export function loadConfirmation(): ConfirmationSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConfirmationSnapshot;
    if (parsed.v !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearConfirmation(): void {
  try { sessionStorage.removeItem(KEY); } catch {}
}
