// Filet de la bascule : un onglet ouvert avant la mise à jour du site écrit
// encore dans Supabase. Toutes les 10 minutes, les réservations récentes de
// Supabase absentes du service sont rapatriées (lignes, devis, historique),
// mises à l'agenda, et signalées. Leurs e-mails sont déjà partis de Supabase.
import { raiseAlert } from './alerts.ts';
import type { Db, Queryable } from './db.ts';
import { googleEventId, sessionUid } from './event-content.ts';
import { trackService } from './posthog.ts';
import { enqueue } from './queue.ts';

export interface SupabaseSource {
  url: string;
  serviceKey: string;
}

type Row = Record<string, unknown>;

async function get(src: SupabaseSource, path: string, fetchImpl: typeof fetch): Promise<Row[]> {
  const res = await fetchImpl(`${src.url}/rest/v1/${path}`, {
    headers: { apikey: src.serviceKey, Authorization: `Bearer ${src.serviceKey}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Supabase ${path.split('?')[0]} : ${res.status}`);
  return (await res.json()) as Row[];
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

async function insert(q: Queryable, table: string, rows: Row[], columns: string[]) {
  for (const row of rows) {
    const values = columns.map((c) => {
      const v = row[c];
      return v !== null && typeof v === 'object' ? JSON.stringify(v) : (v ?? null);
    });
    await q.query(
      `INSERT INTO ${table} (${columns.join(', ')})
       VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
       ON CONFLICT (id) DO NOTHING`,
      values,
    );
  }
}

export async function watchSupabase(
  db: Db,
  src: SupabaseSource,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const recent = await get(
    src,
    `bookings?select=*&created_at=gte.${encodeURIComponent(since)}&order=created_at`,
    fetchImpl,
  );
  if (recent.length === 0) return [];
  const known = new Set(
    (
      await db.query<{ id: string }>('SELECT id FROM bookings WHERE id = ANY($1)', [
        recent.map((b) => b.id),
      ])
    ).map((r) => r.id),
  );
  const missing = recent.filter((b) => !known.has(b.id as string));
  if (missing.length === 0) return [];

  const ids = missing.map((b) => b.id as string).join(',');
  const [sessions, quotes, events] = await Promise.all([
    get(src, `booking_sessions?select=*&booking_id=in.(${ids})`, fetchImpl),
    get(src, `booking_quotes?select=*&booking_id=in.(${ids})`, fetchImpl),
    get(src, `booking_events?select=*&booking_id=in.(${ids})`, fetchImpl),
  ]);
  for (const b of missing) {
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

  const references: string[] = [];
  for (const b of missing) {
    const mine = (rows: Row[]) => rows.filter((r) => r.booking_id === b.id);
    await db.tx(async (q) => {
      await insert(q, 'bookings', [b], BOOKING_COLUMNS);
      await insert(q, 'booking_sessions', mine(sessions), SESSION_COLUMNS);
      await insert(q, 'booking_quotes', mine(quotes), QUOTE_COLUMNS);
      await insert(q, 'booking_events', mine(events), EVENT_COLUMNS);
      // Un créneau déjà pris dans le service lève 23P01 : la réservation reste
      // rapatriée, sans bloquer, et l'alerte dit qu'il faut trancher.
      await q.query(
        `UPDATE booking_sessions s SET blocks_slot = b.status IN ('pending', 'confirmed')
           AND (s.session_date IS NULL OR s.session_date >= (now() AT TIME ZONE 'Europe/Paris')::date)
         FROM bookings b WHERE b.id = s.booking_id AND b.id = $1`,
        [b.id],
      ).catch(() => undefined);
      for (const s of mine(sessions)) {
        const uid = sessionUid(b.reference as string, s.id as string);
        await q.query(
          `INSERT INTO calendar_events (uid, booking_id, session_id, google_event_id, snapshot)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (uid) DO NOTHING`,
          [uid, b.id, s.id, googleEventId(uid), JSON.stringify(s)],
        );
      }
      await enqueue(q, 'calendar.sync', { bookingId: b.id }, { dedupeKey: `calendar:${b.id}` });
    });
    references.push(b.reference as string);
    trackService('supabase_booking_recovered', { reference: b.reference, status: b.status }, `booking:${b.reference}`);
  }
  await raiseAlert(db, {
    key: `supabase:recovered:${references.join(',')}`,
    severity: 'warning',
    subject: `${references.length} réservation(s) arrivée(s) par l'ancien site, rapatriée(s)`,
    body: `${references.join(', ')} : envoyée(s) depuis un onglet resté sur l'ancienne version du site. Elles sont maintenant dans le service et à l'agenda ; leurs e-mails étaient déjà partis. Vérifiez qu'aucun créneau ne se chevauche.`,
  });
  return references;
}
