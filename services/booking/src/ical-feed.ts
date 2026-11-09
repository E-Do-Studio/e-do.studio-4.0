// Flux iCal d'abonnement (repris de supabase/functions/ical) : une réservation
// par sa référence, ou toutes les réservations actives pour l'équipe. Mêmes
// UID que l'agenda Google et que les invitations du client.
import { loadBundle } from './bookings.ts';
import type { Queryable } from './db.ts';
import { sessionUid } from './event-content.ts';
import { buildVEvents, wrapIcs } from './ics.ts';
import type { BookingBundle } from './types.ts';

function eventsOf(bundle: BookingBundle, studioEmail: string, plateau?: string): string[] {
  const sessions = plateau
    ? bundle.sessions.filter((s) => s.plateau_key === plateau)
    : bundle.sessions;
  return buildVEvents({
    method: 'PUBLISH',
    booking: bundle.booking,
    entries: sessions.map((s) => ({
      uid: sessionUid(bundle.booking.reference, s.id),
      sequence: 0,
      session: s,
    })),
    quoteRows: bundle.quote?.rows ?? [],
    quoteTotal: bundle.quote?.total ?? null,
    organizerEmail: studioEmail,
  });
}

export async function bookingFeed(
  q: Queryable,
  reference: string,
  studioEmail: string,
): Promise<string | null> {
  const [row] = await q.query<{ id: string }>(
    'SELECT id FROM bookings WHERE reference = $1',
    [reference],
  );
  const bundle = row ? await loadBundle(q, row.id) : null;
  if (!bundle) return null;
  return wrapIcs('PUBLISH', eventsOf(bundle, studioEmail), `E-Do Studio — ${reference}`);
}

export async function studioFeed(
  q: Queryable,
  studioEmail: string,
  plateau?: string,
): Promise<string> {
  const ids = await q.query<{ id: string }>(
    `SELECT id FROM bookings WHERE status IN ('pending', 'confirmed') ORDER BY preferred_date`,
  );
  const events: string[] = [];
  for (const { id } of ids) {
    const bundle = await loadBundle(q, id);
    if (bundle) events.push(...eventsOf(bundle, studioEmail, plateau));
  }
  return wrapIcs(
    'PUBLISH',
    events,
    plateau ? `E-Do Studio — ${plateau}` : 'E-Do Studio — Toutes les réservations',
  );
}
