// Règles métier des réservations. Chaque opération tient en UNE transaction :
// le changement, l'historique, le registre des événements d'agenda et les
// travaux (synchro, e-mails) partent ensemble ou pas du tout.
//
// Différence de fond avec Supabase : annuler ne supprime plus les lignes. Le
// créneau se libère par `blocks_slot = false` (la contrainte d'exclusion ne
// regarde que les lignes qui bloquent), et les lignes restent lisibles pour
// retirer leurs événements. Retirer une machine supprime sa ligne, mais son
// entrée du registre survit jusqu'à ce que l'événement soit retiré.
import { pgCode, type Db, type Queryable } from './db.ts';
import { googleEventId, sessionTiming, sessionUid } from './event-content.ts';
import { enqueue } from './queue.ts';
import {
  type CreateBookingInput,
  dateToIso,
  generateReference,
  recomputeQuote,
  referencePrefix,
  withinOpeningHours,
} from './quote.ts';
import type {
  Booking,
  BookingBundle,
  BookingStatus,
  CalendarEntry,
  Quote,
  Session,
} from './types.ts';
import { ACTIVE_STATUSES } from './types.ts';

export class DomainError extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export interface SlotConflict {
  plateau: string;
  date: string;
  fromHour: number;
  toHour: number;
}

/**
 * Le créneau occupé que nomme une violation 23P01 : `… conflicts with existing
 * key (plateau_key, session_date, numrange(…))=(live, 2026-11-06, [600,840))`,
 * bornes en minutes. etouch en fait son message « créneau pris ».
 */
export function parseSlotConflict(detail: string | undefined): SlotConflict | null {
  const m = detail?.match(
    /existing key[^=]*=\(([^,]+),\s*(\d{4}-\d{2}-\d{2}),\s*\[([\d.]+),([\d.]+)\)\)/,
  );
  if (!m) return null;
  return {
    plateau: m[1].trim(),
    date: m[2],
    fromHour: Number(m[3]) / 60,
    toHour: Number(m[4]) / 60,
  };
}

export interface Actor {
  /** Qui, pour l'historique (nom ou e-mail). */
  name: string | null;
  /** D'où : `website`, `etouch`, `admin`… */
  source: string;
}

const slotTaken = (conflict: SlotConflict | null = null) =>
  new DomainError(
    409,
    'slot_taken',
    'Ce créneau est déjà réservé.',
    conflict ? { conflict } : undefined,
  );

/** Exécute `fn` en traduisant un chevauchement (23P01) en 409. */
async function guarded<T>(db: Db, fn: (q: Queryable) => Promise<T>): Promise<T> {
  try {
    return await db.tx(fn);
  } catch (err) {
    if (pgCode(err) === '23P01') {
      throw slotTaken(parseSlotConflict((err as { detail?: string }).detail));
    }
    throw err;
  }
}

// ─── Lecture ────────────────────────────────────────────────────────────────

export async function loadBundle(
  q: Queryable,
  id: string,
  opts: { forUpdate?: boolean } = {},
): Promise<BookingBundle | null> {
  const [booking] = await q.query<Booking>(
    `SELECT * FROM bookings WHERE id = $1${opts.forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  );
  if (!booking) return null;
  const sessions = await q.query<Session>(
    `SELECT * FROM booking_sessions WHERE booking_id = $1
     ORDER BY session_date NULLS LAST, arrival_hour NULLS LAST, created_at`,
    [id],
  );
  const [quote] = await q.query<Quote>(
    `SELECT * FROM booking_quotes WHERE booking_id = $1
     ORDER BY generated_at DESC LIMIT 1`,
    [id],
  );
  return { booking, sessions, quote: quote ?? null };
}

async function mustLoad(q: Queryable, id: string): Promise<BookingBundle> {
  const bundle = await loadBundle(q, id, { forUpdate: true });
  if (!bundle) {
    throw new DomainError(404, 'not_found', 'Réservation introuvable.');
  }
  return bundle;
}

export async function findIdByReference(
  q: Queryable,
  reference: string,
): Promise<string | null> {
  const rows = await q.query<{ id: string }>(
    'SELECT id FROM bookings WHERE reference = $1',
    [reference],
  );
  return rows[0]?.id ?? null;
}

export async function registryFor(
  q: Queryable,
  bookingId: string,
): Promise<CalendarEntry[]> {
  return q.query<CalendarEntry>(
    'SELECT * FROM calendar_events WHERE booking_id = $1 ORDER BY created_at',
    [bookingId],
  );
}

export const LIST_ORDERS = {
  'updated_at.asc': 'updated_at ASC, id',
  'created_at.desc': 'created_at DESC, id',
  'preferred_date.desc': 'preferred_date DESC NULLS LAST, id',
} as const;

export async function listBookings(
  q: Queryable,
  opts: {
    updatedSince?: string;
    statuses?: BookingStatus[];
    from?: string;
    to?: string;
    order?: keyof typeof LIST_ORDERS;
    limit: number;
  },
): Promise<BookingBundle[]> {
  const ids = await q.query<{ id: string }>(
    `SELECT id FROM bookings
     WHERE ($1::timestamptz IS NULL OR updated_at > $1::timestamptz)
       AND ($2::text[] IS NULL OR status = ANY($2::text[]))
       AND ($3::date IS NULL OR preferred_date >= $3::date)
       AND ($4::date IS NULL OR preferred_date <= $4::date)
     ORDER BY ${LIST_ORDERS[opts.order ?? 'updated_at.asc']} LIMIT $5`,
    [
      opts.updatedSince ?? null,
      opts.statuses ?? null,
      opts.from ?? null,
      opts.to ?? null,
      opts.limit,
    ],
  );
  const out: BookingBundle[] = [];
  for (const { id } of ids) {
    const b = await loadBundle(q, id);
    if (b) out.push(b);
  }
  return out;
}

export async function historyFor(q: Queryable, bookingId: string) {
  return q.query(
    'SELECT * FROM booking_events WHERE booking_id = $1 ORDER BY created_at',
    [bookingId],
  );
}

/** Occupation publique d'un plateau, sans aucune donnée client. */
export async function availability(
  q: Queryable,
  plateauKey: string,
  from: string,
  to: string,
) {
  const sessions = await q.query<{
    session_date: string;
    arrival_hour: number;
    arrival_minute: number | null;
    hours: number;
  }>(
    `SELECT s.session_date, s.arrival_hour, s.arrival_minute, s.hours
     FROM booking_sessions s JOIN bookings b ON b.id = s.booking_id
     WHERE s.plateau_key = $1 AND s.session_date BETWEEN $2 AND $3
       AND b.status IN ('pending', 'confirmed')`,
    [plateauKey, from, to],
  );
  const blocked = await q.query<{ date: string }>(
    'SELECT date FROM blocked_dates WHERE date BETWEEN $1 AND $2 ORDER BY date',
    [from, to],
  );
  return { sessions, blockedDates: blocked.map((r) => r.date) };
}

// ─── Mécanique commune ─────────────────────────────────────────────────────

/**
 * Recalcule `blocks_slot` des lignes d'une réservation : bloque une ligne
 * active dont la date n'est pas passée (heure de Paris). Le contrôle de
 * chevauchement a lieu ici, d'où le 23P01 possible.
 */
async function refreshBlocks(q: Queryable, bookingId: string): Promise<void> {
  await q.query(
    `UPDATE booking_sessions s
     SET blocks_slot = b.status IN ('pending', 'confirmed')
       AND (s.session_date IS NULL
            OR s.session_date >= (now() AT TIME ZONE 'Europe/Paris')::date)
     FROM bookings b
     WHERE b.id = s.booking_id AND s.booking_id = $1`,
    [bookingId],
  );
}

async function touch(q: Queryable, bookingId: string): Promise<void> {
  await q.query('UPDATE bookings SET updated_at = now() WHERE id = $1', [
    bookingId,
  ]);
}

/**
 * Inscrit chaque ligne présente au registre (UID, id Google, instantané) et
 * augmente le SEQUENCE des UID dont l'événement change. Les entrées des lignes
 * disparues restent : la synchro les retirera de Google.
 */
async function updateRegistry(
  q: Queryable,
  bookingId: string,
  bump: Set<string> | 'all',
): Promise<CalendarEntry[]> {
  const bundle = await loadBundle(q, bookingId);
  if (!bundle) return [];
  for (const s of bundle.sessions) {
    const uid = sessionUid(bundle.booking.reference, s.id);
    await q.query(
      `INSERT INTO calendar_events (uid, booking_id, session_id, google_event_id, snapshot)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (uid) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = now()`,
      [uid, bookingId, s.id, googleEventId(uid), JSON.stringify(s)],
    );
  }
  const entries = await registryFor(q, bookingId);
  const bumped = entries.filter((e) => bump === 'all' || bump.has(e.uid));
  if (bumped.length > 0) {
    await q.query(
      `UPDATE calendar_events SET sequence = sequence + 1, updated_at = now()
       WHERE uid = ANY($1)`,
      [bumped.map((e) => e.uid)],
    );
  }
  return registryFor(q, bookingId);
}

async function scheduleCalendarSync(q: Queryable, bookingId: string) {
  await enqueue(q, 'calendar.sync', { bookingId }, {
    dedupeKey: `calendar:${bookingId}`,
  });
}

export type EmailTemplate = 'created' | 'rescheduled' | 'cancelled' | 'updated';

export interface EmailPayload {
  bookingId: string;
  template: EmailTemplate;
  /** UID à (re)proposer au client : invitation REQUEST. */
  requestUids: string[];
  /** UID à retirer de l'agenda du client : METHOD:CANCEL. */
  cancelUids: string[];
  message?: string | null;
}

async function scheduleEmails(
  q: Queryable,
  payload: EmailPayload,
  opts: { client: boolean; studio: boolean },
) {
  if (opts.client) await enqueue(q, 'email.client', { ...payload });
  if (opts.studio) await enqueue(q, 'email.studio', { ...payload });
}

export async function logEvent(
  q: Queryable,
  bookingId: string,
  action: string,
  actor: Actor,
  details: {
    sessionId?: string;
    plateauKey?: string;
    data?: Record<string, unknown>;
  } = {},
): Promise<void> {
  await q.query(
    `INSERT INTO booking_events
       (booking_id, session_id, plateau_key, action, actor, actor_source, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      bookingId,
      details.sessionId ?? null,
      details.plateauKey ?? null,
      action,
      actor.name,
      actor.source,
      details.data ? JSON.stringify(details.data) : null,
    ],
  );
}

/** Les lignes libérées, avec l'UID de leur événement (format etouch #1526). */
function releasedLines(reference: string, sessions: Session[]) {
  return {
    lines: sessions.map((s) => ({
      id: s.id,
      plateau_key: s.plateau_key,
      session_date: s.session_date,
      arrival_hour: s.arrival_hour,
      arrival_minute: s.arrival_minute,
      slot_type: s.slot_type,
      hours: s.hours,
      calendar_uid: sessionUid(reference, s.id),
    })),
  };
}

const isActive = (status: BookingStatus) => ACTIVE_STATUSES.includes(status);

// ─── Création ──────────────────────────────────────────────────────────────

/** Le tunnel du site : devis recalculé, horaires d'ouverture vérifiés. */
export async function createWebsiteBooking(
  db: Db,
  input: CreateBookingInput,
): Promise<{ id: string; reference: string; total: number; clientTotal: number }> {
  const fallbackDate = input.preferredDate ? dateToIso(input.preferredDate) : null;
  const resolved = input.sessions.map((s) => ({
    s,
    date: s.date ? dateToIso(s.date) : fallbackDate,
    arrivalHour: s.arrivalHour ?? input.arrivalHour,
  }));
  if (
    resolved.some(
      ({ s, arrivalHour }) =>
        !withinOpeningHours({
          plateauKey: s.plateauKey,
          slotType: s.slotType,
          hours: s.hours,
          cycloMode: s.cycloMode,
          arrivalHour,
        }),
    )
  ) {
    throw new DomainError(
      400,
      'outside_opening_hours',
      "Le créneau sort des horaires d'ouverture.",
    );
  }

  const breakdown = recomputeQuote(input);
  const reference = generateReference(referencePrefix(input.mode));
  const quoteRef =
    input.mode === 'booking' ? generateReference('EDO-Q-') : reference;
  const status: BookingStatus = input.mode === 'booking' ? 'pending' : 'draft';
  const c = input.contact;
  const primary = resolved[0];

  const id = await guarded(db, async (q) => {
    const [row] = await q.query<{ id: string }>(
      `INSERT INTO bookings (reference, status, source, client_name, client_first_name,
         client_last_name, client_email, client_company, client_brand,
         client_billing_address, client_siren, client_phone, project_type, urgency,
         total_estimate, notes, preferred_date, arrival_hour)
       VALUES ($1, $2, 'website', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15, $16, $17)
       RETURNING id`,
      [
        reference,
        status,
        [c.prenom, c.nom].filter(Boolean).join(' '),
        c.prenom || null,
        c.nom || null,
        c.email,
        c.societe || null,
        c.marque || null,
        c.adresseFacturation || null,
        c.siren || null,
        c.tel || null,
        input.projectType,
        input.urgency,
        breakdown.total,
        c.autresInfos || null,
        primary?.date ?? fallbackDate,
        primary?.arrivalHour ?? input.arrivalHour,
      ],
    );
    for (const { s, date, arrivalHour } of resolved) {
      await q.query(
        `INSERT INTO booking_sessions (booking_id, plateau_key, slot_type, hours,
           session_date, arrival_hour, cyclo_mode, product_type, method, submethod,
           media, views, views_count, quantity, postprod_enabled, postprod_video)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          row.id,
          s.plateauKey,
          s.slotType ?? 'hour',
          s.hours,
          date,
          arrivalHour,
          s.cycloMode,
          s.productType,
          s.method,
          s.submethod,
          JSON.stringify(s.media ?? []),
          JSON.stringify(s.views ?? []),
          s.viewsCount ?? 0,
          s.quantity ?? 1,
          s.postprodEnabled ?? false,
          s.postprodVideo ?? false,
        ],
      );
    }
    await q.query(
      `INSERT INTO booking_quotes (booking_id, reference, rows, total)
       VALUES ($1, $2, $3, $4)`,
      [row.id, quoteRef, JSON.stringify(breakdown.rows), breakdown.total],
    );
    await refreshBlocks(q, row.id);
    const entries = await updateRegistry(q, row.id, new Set());
    await logEvent(q, row.id, 'created', { name: c.email, source: 'website' });
    await scheduleCalendarSync(q, row.id);
    await scheduleEmails(
      q,
      {
        bookingId: row.id,
        template: 'created',
        requestUids: entries.map((e) => e.uid),
        cancelUids: [],
      },
      { client: true, studio: true },
    );
    await enqueue(q, 'hubspot.booking', { bookingId: row.id });
    return row.id;
  });

  return {
    id,
    reference,
    total: breakdown.total,
    clientTotal: Number(input.quote?.total ?? 0),
  };
}

export interface StudioSessionInput {
  plateauKey: string;
  slotType: string;
  hours: number;
  sessionDate?: string | null;
  arrivalHour?: number | null;
  arrivalMinute?: number | null;
  quantity?: number | null;
  productType?: string | null;
  method?: string | null;
  media?: string[] | null;
  viewsCount?: number | null;
  postprodEnabled?: boolean | null;
  postprodVideo?: boolean | null;
}

export interface StudioBookingInput {
  clientName: string;
  clientEmail: string;
  clientCompany?: string | null;
  clientPhone?: string | null;
  projectType?: string | null;
  urgency?: string | null;
  notes?: string | null;
  totalEstimate?: number | null;
  /** En-tête explicite ; sinon celui de la première ligne datée. */
  preferredDate?: string | null;
  arrivalHour?: number | null;
  arrivalMinute?: number | null;
  sessions: StudioSessionInput[];
  notifyClient: boolean;
}

/** Réservation saisie par le studio (etouch) : pas de devis recalculé. */
export async function createStudioBooking(
  db: Db,
  input: StudioBookingInput,
  actor: Actor,
): Promise<BookingBundle> {
  const dated = [...input.sessions]
    .filter((s) => s.sessionDate)
    .sort((a, b) =>
      `${a.sessionDate}T${String(a.arrivalHour ?? 0).padStart(2, '0')}`.localeCompare(
        `${b.sessionDate}T${String(b.arrivalHour ?? 0).padStart(2, '0')}`,
      ),
    );
  const first = dated[0];
  const reference = generateReference('ETC-');

  const id = await guarded(db, async (q) => {
    const [row] = await q.query<{ id: string }>(
      `INSERT INTO bookings (reference, status, source, client_name, client_email,
         client_company, client_phone, project_type, urgency, notes, total_estimate,
         preferred_date, arrival_hour, arrival_minute)
       VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        reference,
        actor.source,
        input.clientName,
        input.clientEmail,
        input.clientCompany ?? null,
        input.clientPhone ?? null,
        input.projectType ?? null,
        input.urgency ?? null,
        input.notes ?? null,
        input.totalEstimate == null
          ? null
          : Math.round(input.totalEstimate * 100) / 100,
        input.preferredDate ?? first?.sessionDate ?? null,
        input.arrivalHour ?? first?.arrivalHour ?? null,
        input.arrivalMinute ?? first?.arrivalMinute ?? null,
      ],
    );
    for (const s of input.sessions) {
      await q.query(
        `INSERT INTO booking_sessions (booking_id, plateau_key, slot_type, hours,
           session_date, arrival_hour, arrival_minute, product_type, method, media,
           views_count, quantity, postprod_enabled, postprod_video)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          row.id,
          s.plateauKey,
          s.slotType,
          s.hours,
          s.sessionDate ?? null,
          s.arrivalHour ?? null,
          s.arrivalMinute ?? null,
          s.productType ?? input.projectType ?? null,
          s.method ?? null,
          JSON.stringify(s.media ?? []),
          s.viewsCount ?? 0,
          s.quantity ?? 1,
          s.postprodEnabled ?? false,
          s.postprodVideo ?? false,
        ],
      );
    }
    await refreshBlocks(q, row.id);
    const entries = await updateRegistry(q, row.id, new Set());
    await logEvent(q, row.id, 'created', actor);
    await scheduleCalendarSync(q, row.id);
    await scheduleEmails(
      q,
      {
        bookingId: row.id,
        template: 'created',
        requestUids: entries.map((e) => e.uid),
        cancelUids: [],
      },
      { client: input.notifyClient, studio: input.notifyClient },
    );
    return row.id;
  });

  return (await loadBundle(db, id)) as BookingBundle;
}

// ─── Cycle de vie ──────────────────────────────────────────────────────────

export async function confirmBooking(
  db: Db,
  id: string,
  actor: Actor,
): Promise<BookingBundle> {
  await guarded(db, async (q) => {
    const { booking } = await mustLoad(q, id);
    if (booking.status === 'cancelled') {
      throw new DomainError(409, 'cancelled', 'Réservation annulée.');
    }
    if (booking.status === 'confirmed') return;
    await q.query(
      `UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = $1`,
      [id],
    );
    await refreshBlocks(q, id);
    // TENTATIVE → CONFIRMED : l'événement change, son SEQUENCE aussi.
    await updateRegistry(q, id, 'all');
    await logEvent(q, id, 'confirmed', actor);
    await scheduleCalendarSync(q, id);
  });
  return (await loadBundle(db, id)) as BookingBundle;
}

export async function cancelBooking(
  db: Db,
  id: string,
  actor: Actor,
  opts: { notifyClient: boolean; message?: string | null },
): Promise<BookingBundle> {
  await db.tx(async (q) => {
    const { booking, sessions } = await mustLoad(q, id);
    if (booking.status === 'cancelled') return;
    await q.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = now(), updated_at = now()
       WHERE id = $1`,
      [id],
    );
    await refreshBlocks(q, id);
    const entries = await updateRegistry(q, id, 'all');
    await logEvent(q, id, 'cancelled', actor, {
      data: releasedLines(booking.reference, sessions),
    });
    await scheduleCalendarSync(q, id);
    // Plus rien à annuler chez le client quand toutes les dates sont passées.
    const today = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Europe/Paris',
    });
    const upcoming = sessions.some(
      (s) => (s.session_date ?? booking.preferred_date ?? today) >= today,
    );
    await scheduleEmails(
      q,
      {
        bookingId: id,
        template: 'cancelled',
        requestUids: [],
        cancelUids: entries.map((e) => e.uid),
        message: opts.message ?? null,
      },
      { client: opts.notifyClient && upcoming, studio: opts.notifyClient },
    );
  });
  return (await loadBundle(db, id)) as BookingBundle;
}

export interface RescheduleInput {
  preferredDate?: string | null;
  arrivalHour?: number | null;
  arrivalMinute?: number | null;
  sessions: {
    id: string;
    sessionDate: string;
    arrivalHour?: number | null;
    arrivalMinute?: number | null;
    slotType?: string | null;
    hours?: number | null;
  }[];
  notifyClient: boolean;
  message?: string | null;
}

export async function rescheduleBooking(
  db: Db,
  id: string,
  actor: Actor,
  input: RescheduleInput,
): Promise<BookingBundle> {
  await guarded(db, async (q) => {
    const { booking, sessions } = await mustLoad(q, id);
    if (booking.status === 'cancelled') {
      throw new DomainError(409, 'cancelled', 'Réservation annulée.');
    }
    const byId = new Map(sessions.map((s) => [s.id, s]));
    const moved = new Set<string>();
    for (const change of input.sessions) {
      const s = byId.get(change.id);
      if (!s) {
        throw new DomainError(
          404,
          'session_not_found',
          `Ligne ${change.id} absente de la réservation.`,
        );
      }
      await q.query(
        `UPDATE booking_sessions SET session_date = $2,
           arrival_hour = COALESCE($3, arrival_hour),
           arrival_minute = CASE WHEN $3::int IS NULL THEN arrival_minute ELSE $4 END,
           slot_type = COALESCE($5, slot_type),
           hours = COALESCE($6, hours)
         WHERE id = $1`,
        [
          s.id,
          change.sessionDate,
          change.arrivalHour ?? null,
          change.arrivalMinute ?? null,
          change.slotType ?? null,
          change.hours ?? null,
        ],
      );
    }
    // L'en-tête suit la première ligne, ou la valeur donnée explicitement.
    await q.query(
      `UPDATE bookings b SET
         preferred_date = COALESCE($2, first.session_date, b.preferred_date),
         arrival_hour = COALESCE($3, first.arrival_hour, b.arrival_hour),
         arrival_minute = COALESCE($4, first.arrival_minute, b.arrival_minute),
         updated_at = now()
       FROM (SELECT session_date, arrival_hour, arrival_minute FROM booking_sessions
             WHERE booking_id = $1 AND session_date IS NOT NULL
             ORDER BY session_date, arrival_hour NULLS LAST LIMIT 1) first
       WHERE b.id = $1`,
      [
        id,
        input.preferredDate ?? null,
        input.arrivalHour ?? null,
        input.arrivalMinute ?? null,
      ],
    );
    // Réservation sans ligne datée : seul l'en-tête porte la date.
    if (input.sessions.length === 0) {
      await q.query(
        `UPDATE bookings SET preferred_date = COALESCE($2, preferred_date),
           arrival_hour = COALESCE($3, arrival_hour),
           arrival_minute = COALESCE($4, arrival_minute), updated_at = now()
         WHERE id = $1`,
        [
          id,
          input.preferredDate ?? null,
          input.arrivalHour ?? null,
          input.arrivalMinute ?? null,
        ],
      );
    }
    await refreshBlocks(q, id);
    // Toute ligne dont l'horaire a vraiment bougé change de SEQUENCE, qu'elle
    // ait été visée ou qu'elle suive l'en-tête.
    const after = await loadBundle(q, id);
    for (const s of after?.sessions ?? []) {
      const prev = byId.get(s.id);
      if (
        after &&
        prev &&
        JSON.stringify(sessionTiming(booking, prev)) !==
          JSON.stringify(sessionTiming(after.booking, s))
      ) {
        moved.add(sessionUid(booking.reference, s.id));
      }
    }
    const entries = await updateRegistry(q, id, moved);
    await logEvent(q, id, 'rescheduled', actor, {
      data: { sessions: input.sessions, preferredDate: input.preferredDate },
    });
    await scheduleCalendarSync(q, id);
    const current = new Set(
      sessions.map((s) => sessionUid(booking.reference, s.id)),
    );
    await scheduleEmails(
      q,
      {
        bookingId: id,
        template: 'rescheduled',
        requestUids: entries.filter((e) => current.has(e.uid)).map((e) => e.uid),
        cancelUids: [],
        message: input.message ?? null,
      },
      { client: input.notifyClient, studio: input.notifyClient },
    );
  });
  return (await loadBundle(db, id)) as BookingBundle;
}

/**
 * Retire des machines d'une réservation (une machine ôtée d'une session dans
 * etouch). Retirer la dernière revient à annuler.
 */
export async function removeSessions(
  db: Db,
  id: string,
  sessionIds: string[],
  actor: Actor,
  opts: { notifyClient: boolean; message?: string | null },
): Promise<BookingBundle> {
  const { sessions } = (await loadBundle(db, id)) ?? { sessions: [] };
  const remaining = sessions.filter((s) => !sessionIds.includes(s.id));
  if (sessions.length > 0 && remaining.length === 0) {
    return cancelBooking(db, id, actor, opts);
  }

  await db.tx(async (q) => {
    const bundle = await mustLoad(q, id);
    const removed = bundle.sessions.filter((s) => sessionIds.includes(s.id));
    const missing = sessionIds.filter(
      (sid) => !bundle.sessions.some((s) => s.id === sid),
    );
    if (missing.length > 0) {
      throw new DomainError(
        404,
        'session_not_found',
        `Ligne(s) absente(s) : ${missing.join(', ')}.`,
      );
    }
    await q.query(
      'DELETE FROM booking_sessions WHERE booking_id = $1 AND id = ANY($2)',
      [id, sessionIds],
    );
    const removedUids = new Set(
      removed.map((s) => sessionUid(bundle.booking.reference, s.id)),
    );
    const entries = await updateRegistry(q, id, removedUids);
    await touch(q, id);
    for (const s of removed) {
      await logEvent(q, id, 'session_cancelled', actor, {
        sessionId: s.id,
        plateauKey: s.plateau_key,
        data: releasedLines(bundle.booking.reference, [s]),
      });
    }
    await scheduleCalendarSync(q, id);
    await scheduleEmails(
      q,
      {
        bookingId: id,
        template: 'updated',
        requestUids: entries
          .filter((e) => !removedUids.has(e.uid) && e.google_state !== 'absent')
          .filter((e) => bundle.sessions.some((s) => s.id === e.session_id))
          .map((e) => e.uid),
        cancelUids: [...removedUids],
        message: opts.message ?? null,
      },
      {
        client: opts.notifyClient && isActive(bundle.booking.status),
        studio: opts.notifyClient,
      },
    );
  });
  return (await loadBundle(db, id)) as BookingBundle;
}

/**
 * Écrit au client et au studio après coup, pour un appelant qui sépare le
 * changement de la décision de prévenir (etouch : le studio coche « prévenir
 * le client »). Les UID et SEQUENCE sont ceux que le changement a déjà posés.
 */
export async function notifyBooking(
  db: Db,
  id: string,
  template: EmailTemplate,
  message: string | null,
): Promise<void> {
  await db.tx(async (q) => {
    const { booking, sessions } = await mustLoad(q, id);
    const entries = await registryFor(q, id);
    const current = new Set(sessions.map((s) => sessionUid(booking.reference, s.id)));
    const requestUids =
      template === 'cancelled' ? [] : entries.filter((e) => current.has(e.uid)).map((e) => e.uid);
    const cancelUids =
      template === 'cancelled'
        ? entries.map((e) => e.uid)
        : entries.filter((e) => !current.has(e.uid)).map((e) => e.uid);
    await scheduleEmails(
      q,
      { bookingId: id, template, requestUids, cancelUids, message },
      { client: true, studio: true },
    );
  });
}

/** Note libre d'un appelant (etouch) dans l'historique. */
export async function appendHistory(
  db: Db,
  id: string,
  actor: Actor,
  entry: {
    action: string;
    sessionId?: string;
    plateauKey?: string;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  await db.tx(async (q) => {
    await mustLoad(q, id);
    await logEvent(q, id, entry.action, actor, entry);
  });
}

/** Repasse une réservation à la synchro (après un incident, à la main). */
export async function requestResync(db: Db, id: string): Promise<void> {
  await db.tx(async (q) => {
    await mustLoad(q, id);
    await q.query(
      `UPDATE calendar_events SET content_hash = NULL, updated_at = now()
       WHERE booking_id = $1`,
      [id],
    );
    await scheduleCalendarSync(q, id);
  });
}

export async function setBlockedDate(
  db: Db,
  date: string,
  reason: string | null,
  blocked: boolean,
): Promise<void> {
  if (blocked) {
    await db.query(
      `INSERT INTO blocked_dates (date, reason) VALUES ($1, $2)
       ON CONFLICT (date) DO UPDATE SET reason = EXCLUDED.reason`,
      [date, reason],
    );
  } else {
    await db.query('DELETE FROM blocked_dates WHERE date = $1', [date]);
  }
}
