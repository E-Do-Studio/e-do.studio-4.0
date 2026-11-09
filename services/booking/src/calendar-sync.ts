// Synchro de l'agenda Google du studio.
//
// La base fait foi. Pour une réservation, la synchro calcule les événements
// voulus (une ligne datée d'une réservation non annulée = un événement), les
// compare au registre, crée ou met à jour ce qui manque, retire ce qui ne doit
// plus y être — y compris les lignes supprimées, retrouvées par le registre.
// Elle ne rend la main sans erreur que si Google a tout accepté : un échec
// relance le travail (file) et finit en alerte.
//
// La réconciliation, périodique, regarde Google lui-même : elle retire les
// événements e-do qu'aucune ligne active ne justifie (retrouvés par id, ou
// par la référence de leur description pour ceux d'avant le registre), et
// recrée ceux qui ont disparu.
import { createHash } from 'node:crypto';
import { raiseAlert, resolveAlert } from './alerts.ts';
import { findIdByReference, loadBundle, registryFor } from './bookings.ts';
import type { Db, Queryable } from './db.ts';
import {
  eventDescription,
  eventSummary,
  googleEventId,
  referenceFromDescription,
  sessionTiming,
  sessionUid,
  STUDIO_TZ,
  wallClockIso,
} from './event-content.ts';
import type { CalendarApi, GoogleEvent } from './google.ts';
import { enqueue } from './queue.ts';
import type { Booking, BookingStatus, CalendarEntry, Quote, Session } from './types.ts';

/** Ce qui figure à l'agenda : tout sauf l'annulé (un devis daté y est « provisoire »). */
const CALENDAR_STATUSES: readonly BookingStatus[] = ['draft', 'pending', 'confirmed'];

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildGoogleEvent(
  booking: Booking,
  session: Session,
  quote: Quote | null,
  entry: Pick<CalendarEntry, 'uid' | 'google_event_id'>,
): GoogleEvent | null {
  const timing = sessionTiming(booking, session);
  if (!timing) return null;
  return {
    id: entry.google_event_id,
    status: booking.status === 'confirmed' ? 'confirmed' : 'tentative',
    summary: eventSummary(booking, session),
    description: eventDescription(
      booking,
      session,
      quote?.rows ?? [],
      quote?.total ?? null,
    ),
    location: 'E-Do Studio, Paris',
    start: timing.allDay
      ? { date: timing.date }
      : { dateTime: wallClockIso(timing.start), timeZone: STUDIO_TZ },
    end: timing.allDay
      ? { date: addDays(timing.date, 1) }
      : { dateTime: wallClockIso(timing.end), timeZone: STUDIO_TZ },
    extendedProperties: {
      private: {
        edoUid: entry.uid,
        edoReference: booking.reference,
        edoBookingId: booking.id,
        edoSessionId: session.id,
      },
    },
  };
}

const hashOf = (event: GoogleEvent) =>
  createHash('sha256').update(JSON.stringify(event)).digest('hex');

const errorText = (err: unknown) =>
  (err instanceof Error ? err.message : String(err)).slice(0, 1000);

export interface SyncResult {
  upserted: number;
  removed: number;
  errors: string[];
}

/**
 * Au-delà de deux jours dans le passé, l'agenda est de l'histoire : la synchro
 * n'y écrit ni n'y efface plus rien.
 */
export function syncHorizon(now = new Date()): string {
  return new Date(now.getTime() - 2 * 86_400_000).toLocaleDateString('sv-SE', {
    timeZone: STUDIO_TZ,
  });
}

export async function syncBooking(
  db: Db,
  api: CalendarApi,
  bookingId: string,
  now = new Date(),
): Promise<SyncResult> {
  const horizon = syncHorizon(now);
  const result: SyncResult = { upserted: 0, removed: 0, errors: [] };
  const bundle = await loadBundle(db, bookingId);
  if (!bundle) return result;
  const { booking, sessions, quote } = bundle;
  const onCalendar = CALENDAR_STATUSES.includes(booking.status);

  const entries = new Map(
    (await registryFor(db, bookingId)).map((e) => [e.uid, e]),
  );
  const wanted = new Set<string>();

  for (const session of onCalendar ? sessions : []) {
    const uid = sessionUid(booking.reference, session.id);
    let entry = entries.get(uid);
    if (!entry) {
      [entry] = await db.query<CalendarEntry>(
        `INSERT INTO calendar_events (uid, booking_id, session_id, google_event_id, snapshot)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (uid) DO UPDATE SET updated_at = now()
         RETURNING *`,
        [uid, bookingId, session.id, googleEventId(uid), JSON.stringify(session)],
      );
    }
    const event = buildGoogleEvent(booking, session, quote, entry);
    if (!event) continue;
    wanted.add(uid);
    if ((event.start?.date ?? event.start?.dateTime ?? '') < horizon) continue;
    const hash = hashOf(event);
    if (entry.google_state === 'present' && entry.content_hash === hash) continue;
    try {
      await api.upsert(event);
      await db.query(
        `UPDATE calendar_events SET google_state = 'present', content_hash = $2,
           last_synced_at = now(), last_error = NULL, updated_at = now()
         WHERE uid = $1`,
        [uid, hash],
      );
      result.upserted += 1;
    } catch (err) {
      result.errors.push(`${uid} : ${errorText(err)}`);
      await db.query(
        'UPDATE calendar_events SET last_error = $2, updated_at = now() WHERE uid = $1',
        [uid, errorText(err)],
      );
    }
  }

  for (const entry of entries.values()) {
    if (wanted.has(entry.uid) || entry.google_state === 'absent') continue;
    const date = entry.snapshot?.session_date ?? booking.preferred_date;
    if (date && date < horizon) continue;
    try {
      await api.remove(entry.google_event_id);
      await db.query(
        `UPDATE calendar_events SET google_state = 'absent', content_hash = NULL,
           last_synced_at = now(), last_error = NULL, updated_at = now()
         WHERE uid = $1`,
        [entry.uid],
      );
      result.removed += 1;
    } catch (err) {
      result.errors.push(`${entry.uid} : ${errorText(err)}`);
      await db.query(
        'UPDATE calendar_events SET last_error = $2, updated_at = now() WHERE uid = $1',
        [entry.uid, errorText(err)],
      );
    }
  }

  await db.query(
    `UPDATE bookings SET calendar_synced_at = CASE WHEN $2 THEN now() ELSE calendar_synced_at END,
       calendar_sync_error = $3
     WHERE id = $1`,
    [
      bookingId,
      result.errors.length === 0,
      result.errors.length === 0 ? null : result.errors.join('; ').slice(0, 1000),
    ],
  );

  if (result.errors.length > 0) {
    throw new Error(
      `agenda : ${result.errors.length} événement(s) en échec pour ${booking.reference} — ${result.errors.join('; ')}`,
    );
  }
  return result;
}

// ─── Réconciliation ────────────────────────────────────────────────────────

/** Heure murale de Paris d'un début Google (`dateTime` avec décalage, ou `date`). */
function parisStart(event: GoogleEvent): string | null {
  return parisTime(event.start);
}

function parisTime(t: GoogleEvent['start']): string | null {
  if (t?.date) return t.date;
  if (!t?.dateTime) return null;
  // Sans décalage, c'est déjà l'heure murale du fuseau donné (ce que le
  // service écrit) : la relire comme une date JS la décalerait.
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(t.dateTime)) return t.dateTime.slice(0, 19);
  const d = new Date(t.dateTime);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: STUDIO_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`;
}

function sessionStart(booking: Booking, session: Session): string | null {
  const t = sessionTiming(booking, session);
  if (!t) return null;
  return t.allDay ? t.date : wallClockIso(t.start);
}

/** Un événement Google décrit-il cette ligne (même début, même plateau) ? */
function matchesSession(event: GoogleEvent, booking: Booking, session: Session) {
  const plateau = session.plateau_key.toLowerCase();
  return (
    parisStart(event) === sessionStart(booking, session) &&
    (event.summary ?? '').toLowerCase().endsWith(`— ${plateau}`)
  );
}

export interface ReconcileReport {
  scanned: number;
  ours: number;
  removedOrphans: string[];
  adopted: string[];
  recreated: string[];
  /** Événements modifiés dans Google (heure, titre, statut) : remis d'après la base. */
  drifted: string[];
  unknown: string[];
  resyncQueued: number;
  /** Événements que la base attend dans la fenêtre contrôlée. */
  expected: number;
  /** Attendus et trouvés tels quels dans Google. */
  inSync: number;
}

/** Ce qu'un événement Google doit montrer : comparé champ par champ, pas au hachage. */
function sameEventContent(actual: GoogleEvent, expected: GoogleEvent): string | null {
  if (parisTime(actual.start) !== parisTime(expected.start)) return 'début';
  if (parisTime(actual.end) !== parisTime(expected.end)) return 'fin';
  if ((actual.summary ?? '') !== (expected.summary ?? '')) return 'titre';
  if ((actual.status ?? 'confirmed') !== (expected.status ?? 'confirmed')) return 'statut';
  return null;
}

export async function reconcile(
  db: Db,
  api: CalendarApi,
  now = new Date(),
): Promise<ReconcileReport> {
  const report: ReconcileReport = {
    scanned: 0,
    ours: 0,
    removedOrphans: [],
    adopted: [],
    recreated: [],
    drifted: [],
    unknown: [],
    resyncQueued: 0,
    expected: 0,
    inSync: 0,
  };
  const bundles = new Map<string, Awaited<ReturnType<typeof loadBundle>>>();
  const bundleOf = async (id: string) => {
    if (!bundles.has(id)) bundles.set(id, await loadBundle(db, id));
    return bundles.get(id) ?? null;
  };

  // 1. Ce que la base sait déjà ne pas être à jour.
  const stale = await db.query<{ id: string }>(
    `SELECT b.id FROM bookings b
     WHERE (b.calendar_synced_at IS NULL OR b.calendar_synced_at < b.updated_at
            OR EXISTS (SELECT 1 FROM calendar_events c
                       WHERE c.booking_id = b.id AND c.google_state = 'unknown'
                         AND coalesce(c.snapshot->>'session_date', b.preferred_date::text, '9999') >= $1))
       AND (EXISTS (SELECT 1 FROM booking_sessions s WHERE s.booking_id = b.id
                    AND coalesce(s.session_date, b.preferred_date) >= $1::date)
            OR EXISTS (SELECT 1 FROM calendar_events c
                       WHERE c.booking_id = b.id AND c.google_state <> 'absent'
                         AND coalesce(c.snapshot->>'session_date', b.preferred_date::text, '9999') >= $1))`,
    [syncHorizon(now)],
  );

  // 2. Ce que Google contient vraiment.
  const timeMin = new Date(now.getTime() - 2 * 86_400_000).toISOString();
  const timeMax = new Date(now.getTime() + 400 * 86_400_000).toISOString();
  const events = await api.list(timeMin, timeMax);
  report.scanned = events.length;

  const registry = await db.query<
    CalendarEntry & { status: BookingStatus; session_exists: boolean }
  >(
    `SELECT c.*, b.status,
            EXISTS (SELECT 1 FROM booking_sessions s WHERE s.id = c.session_id) AS session_exists
     FROM calendar_events c JOIN bookings b ON b.id = c.booking_id`,
  );
  const byEventId = new Map(registry.map((e) => [e.google_event_id, e]));
  const wantedEntry = (e: (typeof registry)[number]) =>
    CALENDAR_STATUSES.includes(e.status) && e.session_exists;
  const seen = new Set<string>();

  const removeOrphan = async (event: GoogleEvent, reference: string, why: string) => {
    await api.remove(event.id);
    await db.query(
      `UPDATE calendar_events SET google_state = 'absent', content_hash = NULL, updated_at = now()
       WHERE google_event_id = $1`,
      [event.id],
    );
    report.removedOrphans.push(`${reference} (${event.summary ?? event.id})`);
    await raiseAlert(db, {
      key: `calendar:orphan:${event.id}`,
      severity: 'info',
      subject: `Événement orphelin retiré de l'agenda — ${reference}`,
      body: `« ${event.summary ?? ''} » (${event.start?.dateTime ?? event.start?.date ?? '?'}) : ${why}`,
    });
  };

  for (const event of events) {
    const entry = byEventId.get(event.id);
    const reference =
      event.extendedProperties?.private?.edoReference ??
      referenceFromDescription(event.description);
    if (!entry && !reference) continue;
    report.ours += 1;

    if (entry) {
      seen.add(entry.uid);
      if (!wantedEntry(entry)) {
        await removeOrphan(
          event,
          reference ?? entry.uid,
          entry.status === 'cancelled'
            ? 'réservation annulée'
            : 'ligne de réservation retirée',
        );
        continue;
      }
      // Présent : encore faut-il qu'il dise la même chose que la base.
      const bundle = await bundleOf(entry.booking_id);
      const session = bundle?.sessions.find((x) => x.id === entry.session_id);
      const expected =
        bundle && session ? buildGoogleEvent(bundle.booking, session, bundle.quote, entry) : null;
      const diff = expected && entry.google_state === 'present' ? sameEventContent(event, expected) : null;
      if (diff) {
        await db.query(
          `UPDATE calendar_events SET content_hash = NULL, updated_at = now() WHERE uid = $1`,
          [entry.uid],
        );
        report.drifted.push(`${bundle?.booking.reference} (${diff})`);
        stale.push({ id: entry.booking_id });
        await raiseAlert(db, {
          key: `calendar:drift:${entry.uid}:${Date.now()}`,
          severity: 'info',
          subject: `Événement modifié dans Google, remis d'après la réservation — ${bundle?.booking.reference}`,
          body: `« ${event.summary ?? ''} » : ${diff} différent de la réservation. Pour changer une réservation, passez par etouch : l'agenda suit.`,
        });
      }
      continue;
    }

    // Événement e-do hors registre : écrit avant ce service.
    const bookingId = reference ? await findIdByReference(db, reference) : null;
    const bundle = bookingId ? await loadBundle(db, bookingId) : null;
    if (!bundle) {
      report.unknown.push(`${reference} (${event.summary ?? event.id})`);
      await raiseAlert(db, {
        key: `calendar:unknown:${event.id}`,
        severity: 'warning',
        subject: `Événement à vérifier dans l'agenda — ${reference}`,
        body: `« ${event.summary ?? ''} » (${event.start?.dateTime ?? event.start?.date ?? '?'}) porte la référence ${reference}, inconnue de la base. Rien n'a été supprimé : à vérifier à la main.`,
      });
      continue;
    }
    if (!CALENDAR_STATUSES.includes(bundle.booking.status)) {
      await removeOrphan(event, bundle.booking.reference, 'réservation annulée');
      continue;
    }
    const session = bundle.sessions.find((s) =>
      matchesSession(event, bundle.booking, s),
    );
    const sessionEntry = session
      ? registry.find(
          (e) => e.uid === sessionUid(bundle.booking.reference, session.id),
        )
      : undefined;
    if (!session) {
      await removeOrphan(
        event,
        bundle.booking.reference,
        "aucune ligne de la réservation ne correspond (machine retirée ou créneau déplacé)",
      );
    } else if (!sessionEntry || sessionEntry.google_state !== 'present') {
      // L'événement d'avant le registre devient celui de la ligne : la
      // prochaine synchro le met à jour au lieu d'en créer un second.
      const uid = sessionUid(bundle.booking.reference, session.id);
      await db.query(
        `INSERT INTO calendar_events (uid, booking_id, session_id, google_event_id,
           google_state, snapshot)
         VALUES ($1, $2, $3, $4, 'present', $5)
         ON CONFLICT (uid) DO UPDATE SET google_event_id = EXCLUDED.google_event_id,
           google_state = 'present', content_hash = NULL, updated_at = now()`,
        [uid, bundle.booking.id, session.id, event.id, JSON.stringify(session)],
      );
      seen.add(uid);
      report.adopted.push(`${bundle.booking.reference} (${event.summary ?? event.id})`);
      stale.push({ id: bundle.booking.id });
    } else {
      await removeOrphan(
        event,
        bundle.booking.reference,
        'doublon : la ligne a déjà son événement',
      );
    }
  }

  // 3. Ce qui devrait être dans Google et n'y est plus (supprimé à la main).
  const windowStart = addDays(now.toISOString().slice(0, 10), -1);
  const windowEnd = addDays(now.toISOString().slice(0, 10), 399);
  for (const entry of registry) {
    if (entry.google_state !== 'present' || seen.has(entry.uid)) continue;
    if (!wantedEntry(entry) || !entry.snapshot) continue;
    const date = entry.snapshot.session_date;
    if (!date || date < windowStart || date > windowEnd) continue;
    await db.query(
      `UPDATE calendar_events SET google_state = 'unknown', content_hash = NULL, updated_at = now()
       WHERE uid = $1`,
      [entry.uid],
    );
    report.recreated.push(entry.uid);
    stale.push({ id: entry.booking_id });
    await raiseAlert(db, {
      key: `calendar:recreated:${entry.uid}`,
      severity: 'warning',
      subject: "Un événement supprimé dans l'agenda a été remis",
      body: `L'événement ${entry.uid} a disparu de Google alors que sa réservation est active. Il est recréé. Pour retirer une réservation, annulez-la dans etouch : l'agenda suivra.`,
    });
  }

  for (const entry of registry) {
    if (!wantedEntry(entry) || !entry.snapshot) continue;
    const date = entry.snapshot.session_date;
    if (!date || date < windowStart || date > windowEnd) continue;
    report.expected += 1;
  }
  report.inSync = Math.max(0, report.expected - report.recreated.length - report.drifted.length);

  for (const id of new Set(stale.map((s) => s.id))) {
    await enqueue(db, 'calendar.sync', { bookingId: id }, {
      dedupeKey: `calendar:${id}`,
    });
    report.resyncQueued += 1;
  }

  await db.query(
    `INSERT INTO service_state (key, value, updated_at) VALUES ('calendar.reconcile', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify({ at: now.toISOString(), ...report })],
  );
  await resolveAlert(db, 'job:calendar.reconcile');
  return report;
}

/** Pour la page d'état : entrées du registre en erreur. */
export async function registryErrors(q: Queryable) {
  return q.query(
    `SELECT c.uid, b.reference, c.google_state, c.last_error, c.updated_at
     FROM calendar_events c JOIN bookings b ON b.id = c.booking_id
     WHERE c.last_error IS NOT NULL ORDER BY c.updated_at DESC LIMIT 50`,
  );
}
