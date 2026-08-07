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

/**
 * Prévient le studio qu'une réservation n'a pas pu être enregistrée.
 *
 * Sans elle, cet incident-là ne laissait AUCUNE trace : la ligne n'existe pas
 * en base, l'erreur ne sortait pas du navigateur du client, et le studio ne
 * l'apprenait que si celui-ci prenait la peine d'écrire. `create-booking` a pu
 * répondre 404 pendant un temps indéterminé sans que personne le sache.
 *
 * « Au mieux », comme la soumission HubSpot : jamais attendue, jamais relancée,
 * et son propre échec ne remonte nulle part — sinon la panne qu'on signale
 * devient la panne qui empêche de la signaler. Elle passe par `send-email`,
 * qui est une Edge Function distincte de `create-booking` : le jour où celle-ci
 * tombe, l'alerte part quand même.
 */
export function reportBookingFailure(input: {
  error: unknown;
  mode: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}): void {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;

  void fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `keepalive` : la soumission échoue souvent au moment où l'on quitte ou
    // recharge la page. Sans lui, la requête est annulée avec le document.
    keepalive: true,
    body: JSON.stringify({
      type: 'booking_failure_alert',
      error:
        input.error instanceof Error
          ? `${input.error.name}: ${input.error.message}`
          : String(input.error),
      mode: input.mode,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      pageUrl: typeof location === 'undefined' ? undefined : location.href,
    }),
  }).catch(() => {});
}
