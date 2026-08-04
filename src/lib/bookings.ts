import type {
  BookingSessionData,
  BookingQuoteData,
  CreateBookingInput,
} from './booking-engine';

export type { BookingSessionData, BookingQuoteData, CreateBookingInput };

export interface CreateBookingResult {
  reference: string;
  /** Total recalculé par le serveur — il fait foi sur celui envoyé. */
  total: number;
}

export class SlotTakenError extends Error {
  constructor() {
    super('Ce créneau est déjà réservé. Veuillez choisir un autre horaire.');
    this.name = 'SlotTakenError';
  }
}

/**
 * Crée une réservation via l'Edge Function `create-booking`.
 *
 * Le front écrivait auparavant dans Supabase avec la clé anon, en envoyant le
 * total qu'il avait lui-même calculé. Deux conséquences : le prix était
 * déclaratif, et `.insert().select()` imposait un droit de lecture `anon` sur
 * des lignes portant e-mail, téléphone, SIREN et adresse de facturation.
 *
 * La fonction recalcule le devis avec le moteur partagé, écrit avec le rôle de
 * service, puis déclenche la synchronisation calendrier et les e-mails. Elle ne
 * renvoie que la référence et le total : aucune donnée personnelle ne repart.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL manquant');

  const res = await fetch(`${supabaseUrl}/functions/v1/create-booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  // Le créneau vient d'être pris entre l'affichage et l'envoi : c'est la
  // contrainte d'exclusion en base qui tranche, pas une lecture préalable.
  if (res.status === 409) throw new SlotTakenError();

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `create-booking ${res.status}${detail ? `: ${detail}` : ''}`,
    );
  }

  return (await res.json()) as CreateBookingResult;
}
