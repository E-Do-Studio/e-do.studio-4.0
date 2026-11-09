// Import des réservations Supabase dans le service. Rejouable : chaque ligne
// est écrite par son id (upsert), on peut le relancer juste avant la bascule
// pour prendre le delta.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… DATABASE_URL=… \
//     node dist/import-supabase.js [--dry-run]
//
// Le registre des événements d'agenda est amorcé pour tout ce qui est à venir :
//   - chaque ligne existante (état `unknown`, SEQUENCE 0 — les clients ont reçu
//     un PUBLISH en SEQUENCE 0, la prochaine mise à jour passera au-dessus) ;
//   - chaque ligne libérée que l'historique garde avec l'UID de son événement
//     (`booking_events.data.lines`, écrit par etouch depuis #1526) : la synchro
//     retirera ces événements de Google.
// Les événements orphelins d'avant cet historique sont retrouvés par la
// réconciliation, d'après la référence de leur description.
import { fileURLToPath } from 'node:url';
import { createPgDb, migrate, type Queryable } from '../src/db.ts';
import { googleEventId, sessionUid } from '../src/event-content.ts';
import { enqueue } from '../src/queue.ts';

const dryRun = process.argv.includes('--dry-run');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
if (!url || !key || !databaseUrl) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et DATABASE_URL requis');
}

type Row = Record<string, unknown>;

async function fetchAll(table: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${url}/rest/v1/${table}?select=*&order=id&limit=1000&offset=${offset}`,
      { headers: { apikey: key as string, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) throw new Error(`${table} : ${res.status} ${await res.text()}`);
    const rows = (await res.json()) as Row[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

async function upsert(q: Queryable, table: string, rows: Row[], columns: string[]) {
  for (const row of rows) {
    const values = columns.map((c) => {
      const v = row[c];
      return v !== null && typeof v === 'object' ? JSON.stringify(v) : (v ?? null);
    });
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const updates = columns
      .filter((c) => c !== 'id')
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    await q.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      values,
    );
  }
}

const BOOKING_COLUMNS = [
  'id', 'reference', 'status', 'source', 'client_name', 'client_first_name',
  'client_last_name', 'client_email', 'client_phone', 'client_company',
  'client_brand', 'client_billing_address', 'client_siren', 'project_type',
  'urgency', 'total_estimate', 'notes', 'preferred_date', 'arrival_hour',
  'arrival_minute', 'created_at', 'updated_at',
];
const SESSION_COLUMNS = [
  'id', 'booking_id', 'plateau_key', 'slot_type', 'hours', 'session_date',
  'arrival_hour', 'arrival_minute', 'cyclo_mode', 'product_type', 'method',
  'submethod', 'media', 'views', 'views_count', 'quantity', 'postprod_enabled',
  'postprod_video', 'created_at',
];
const QUOTE_COLUMNS = ['id', 'booking_id', 'reference', 'rows', 'total', 'generated_at'];
const EVENT_COLUMNS = [
  'id', 'booking_id', 'session_id', 'plateau_key', 'action', 'actor',
  'actor_source', 'data', 'created_at',
];
const BLOCKED_COLUMNS = ['id', 'date', 'reason', 'created_at'];

const [bookings, sessions, quotes, events, blocked] = await Promise.all([
  fetchAll('bookings'),
  fetchAll('booking_sessions'),
  fetchAll('booking_quotes'),
  fetchAll('booking_events'),
  fetchAll('blocked_dates'),
]);

// Supabase acceptait des lignes partielles : on remet les valeurs par défaut.
for (const b of bookings) {
  b.source ??= 'website';
  b.client_name ??= b.client_email ?? '';
}
for (const s of sessions) {
  s.slot_type ??= 'hour';
  s.media ??= [];
  s.views ??= [];
  s.views_count ??= 0;
  s.quantity ??= 1;
  s.postprod_enabled ??= false;
  s.postprod_video ??= false;
}

const horizon = new Date(Date.now() - 2 * 86_400_000).toLocaleDateString('sv-SE', {
  timeZone: 'Europe/Paris',
});
const bookingById = new Map(bookings.map((b) => [b.id as string, b]));
const sessionIds = new Set(sessions.map((s) => s.id as string));

interface Seed {
  uid: string;
  bookingId: string;
  sessionId: string;
  snapshot: Row;
}
const seeds = new Map<string, Seed>();
for (const s of sessions) {
  const b = bookingById.get(s.booking_id as string);
  if (!b) continue;
  const date = (s.session_date ?? b.preferred_date) as string | null;
  if (!date || date < horizon) continue;
  const uid = sessionUid(b.reference as string, s.id as string);
  seeds.set(uid, { uid, bookingId: b.id as string, sessionId: s.id as string, snapshot: s });
}
let releasedSeeds = 0;
for (const e of events) {
  const lines = (e.data as { lines?: Row[] } | null)?.lines ?? [];
  for (const line of lines) {
    const uid = line.calendar_uid as string | undefined;
    const date = line.session_date as string | undefined;
    if (!uid || !date || date < horizon || seeds.has(uid)) continue;
    if (sessionIds.has(line.id as string)) continue;
    seeds.set(uid, {
      uid,
      bookingId: e.booking_id as string,
      sessionId: line.id as string,
      snapshot: { ...line, booking_id: e.booking_id },
    });
    releasedSeeds += 1;
  }
}

console.log(
  JSON.stringify({
    bookings: bookings.length,
    sessions: sessions.length,
    quotes: quotes.length,
    events: events.length,
    blockedDates: blocked.length,
    calendarSeeds: seeds.size,
    releasedLineSeeds: releasedSeeds,
    horizon,
    dryRun,
  }),
);
if (dryRun) process.exit(0);

const db = createPgDb(databaseUrl);
await migrate(db, process.env.MIGRATIONS_DIR ?? fileURLToPath(new URL('../migrations', import.meta.url)));
await db.tx(async (q) => {
  await upsert(q, 'bookings', bookings, BOOKING_COLUMNS);
  // Les lignes supprimées côté Supabase depuis un import précédent partent ici aussi.
  await q.query('DELETE FROM booking_sessions WHERE NOT (id = ANY($1))', [[...sessionIds]]);
  await upsert(q, 'booking_sessions', sessions, SESSION_COLUMNS);
  await upsert(q, 'booking_quotes', quotes, QUOTE_COLUMNS);
  await upsert(q, 'booking_events', events, EVENT_COLUMNS);
  await upsert(q, 'blocked_dates', blocked, BLOCKED_COLUMNS);
  await q.query(
    `UPDATE bookings SET cancelled_at = COALESCE(cancelled_at, updated_at)
     WHERE status = 'cancelled'`,
  );
  // Même règle que le service (bookings.ts, refreshBlocks).
  await q.query(
    `UPDATE booking_sessions s
     SET blocks_slot = b.status IN ('pending', 'confirmed')
       AND (s.session_date IS NULL
            OR s.session_date >= (now() AT TIME ZONE 'Europe/Paris')::date)
     FROM bookings b WHERE b.id = s.booking_id`,
  );
  for (const seed of seeds.values()) {
    await q.query(
      `INSERT INTO calendar_events (uid, booking_id, session_id, google_event_id, snapshot)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (uid) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = now()`,
      [seed.uid, seed.bookingId, seed.sessionId, googleEventId(seed.uid), JSON.stringify(seed.snapshot)],
    );
  }
  // Rien n'est encore vérifié dans Google : la réconciliation passe d'abord
  // (elle reprend les événements existants), elle met ensuite en file les
  // synchros nécessaires.
  await q.query('UPDATE bookings SET calendar_synced_at = NULL');
  await enqueue(q, 'calendar.reconcile', {}, { dedupeKey: 'calendar.reconcile' });
});
await db.close();
console.log('import terminé');
