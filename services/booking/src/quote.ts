// Devis recalculé côté serveur avec le moteur du site (même module que le
// tunnel et que l'ancienne fonction create-booking) : le total envoyé par le
// navigateur n'est jamais cru.
import { randomBytes } from 'node:crypto';
import {
  BOOK_PLATEAUX,
  type CreateBookingInput,
  computePriceBreakdown,
  fitsBookingHours,
  type QuoteLabels,
  type SlotState,
} from '../../../src/lib/booking-engine.ts';

export type { CreateBookingInput };

// Le moteur est sans i18n : ces libellés ne servent qu'aux lignes persistées
// du devis, reprises telles quelles de create-booking.
const LABELS: QuoteLabels = {
  cyclo5h: 'Cyclorama · 5h',
  cyclo10h: 'Cyclorama · 10h',
  cyclo10hEditorial: 'Cyclorama · 10h éditorial',
  cycloPaint: 'Peinture fraîche du cyclo',
  electricity: 'Électricité additionnelle',
  studioVisit: 'Visite du studio',
  halfDay: 'Demi-journée',
  fullDayWithHours: (count: number) =>
    count > 1 ? 'journées (8h)' : 'journée (8h)',
  proRataDay: 'au prorata',
  postProduction: 'Post-production',
  images: 'images',
  videoEditing: 'Montage vidéo',
  onRequest: 'Sur demande',
};

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReference(prefix: string): string {
  let code = '';
  for (const b of randomBytes(6)) code += REF_CHARS[b % REF_CHARS.length];
  return prefix + code;
}

export function referencePrefix(mode: CreateBookingInput['mode']): string {
  return mode === 'quote' ? 'EDO-Q-' : mode === 'booking' ? 'EDO-R-' : 'EDO-';
}

export const dateToIso = (d: { y: number; m: number; d: number }) =>
  `${d.y}-${String(d.m + 1).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;

export function recomputeQuote(input: CreateBookingInput) {
  const slots: Record<string, SlotState> = {};
  const slotIds: string[] = [];
  input.sessions.forEach((s, i) => {
    const id = `${s.plateauKey}#${i}`;
    slotIds.push(id);
    slots[id] = {
      plateauKey: s.plateauKey,
      slotType: s.slotType,
      hours: s.hours,
      cycloMode: s.cycloMode,
      // Les extras ne transitent pas par le tunnel : leur valeur neutre
      // empêche qu'un client les injecte.
      paint: false,
      kwh: 0,
      team: {},
      postprod: { enabled: s.postprodEnabled, video: s.postprodVideo },
      date: s.date,
      arrivalHour: s.arrivalHour ?? undefined,
    } as SlotState;
  });
  return computePriceBreakdown({
    plateau: input.sessions[0]?.plateauKey ?? null,
    slotIds,
    slots,
    lang: 'fr',
    labels: LABELS,
  });
}

/** Mêmes horaires que le calendrier du tunnel (10h–18h, 9h–19h au cyclo). */
export function withinOpeningHours(session: {
  plateauKey: string;
  slotType: string | null;
  hours: number;
  cycloMode: string | null;
  arrivalHour: number | null;
}): boolean {
  return fitsBookingHours(
    {
      plateauKey: session.plateauKey,
      slotType: session.slotType,
      hours: session.hours,
      cycloMode: session.cycloMode,
      arrivalHour: session.arrivalHour ?? undefined,
    } as SlotState,
    BOOK_PLATEAUX.find((p) => p.k === session.plateauKey),
  );
}
