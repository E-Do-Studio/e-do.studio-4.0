import { afterEach, beforeEach, expect, it } from 'vitest';
import { createWebsiteBooking, loadBundle } from '../src/bookings.ts';
import type { Db } from '../src/db.ts';
import { watchSupabase } from '../src/supabase-watch.ts';
import { deps, drain, FakeCalendar, FakeMailer, futureYmd, isoOf, websiteInput } from './fakes.ts';
import { createTestDb } from './pglite.ts';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});
afterEach(async () => {
  await db.close();
});

const OLD_ID = '11111111-2222-4333-8444-555555555555';
const SESSION_ID = '66666666-7777-4888-8999-aaaaaaaaaaaa';

function fakeSupabase(extraBookings: Record<string, unknown>[] = []) {
  const date = isoOf(futureYmd(12));
  const booking = {
    id: OLD_ID, reference: 'EDO-R-OLDTAB', status: 'pending', source: 'website',
    client_name: 'Ancien Onglet', client_email: 'a@b.fr', preferred_date: date, arrival_hour: 11,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const session = {
    id: SESSION_ID, booking_id: OLD_ID, plateau_key: 'horizontal', slot_type: 'hour', hours: 2,
    session_date: date, arrival_hour: 11, media: [], views: [], created_at: new Date().toISOString(),
  };
  return (async (input: string | URL) => {
    const url = String(input);
    if (url.includes('/bookings?')) return Response.json([booking, ...extraBookings]);
    if (url.includes('/booking_sessions?')) return Response.json([session]);
    return Response.json([]);
  }) as typeof fetch;
}

it("rapatrie une réservation arrivée par l'ancien site, la met à l'agenda et prévient", async () => {
  const src = { url: 'https://old.supabase.co', serviceKey: 'k' };
  const recovered = await watchSupabase(db, src, fakeSupabase());
  expect(recovered).toEqual(['EDO-R-OLDTAB']);
  const bundle = await loadBundle(db, OLD_ID);
  expect(bundle?.sessions).toHaveLength(1);
  expect(bundle?.sessions[0].blocks_slot).toBe(true);
  const calendar = new FakeCalendar();
  await drain(deps(db, calendar, new FakeMailer()));
  expect(calendar.events.size).toBe(1);
  const [alert] = await db.query<{ subject: string }>("SELECT subject FROM alerts WHERE key LIKE 'supabase:%'");
  expect(alert.subject).toContain('ancien site');
  // Un second passage ne refait rien.
  expect(await watchSupabase(db, src, fakeSupabase())).toEqual([]);
});

it('ignore ce que le service a déjà', async () => {
  const r = await createWebsiteBooking(db, websiteInput([{ plateauKey: 'live', days: 4, hour: 10, hours: 2 }]));
  const [{ id }] = await db.query<{ id: string }>('SELECT id FROM bookings WHERE reference = $1', [r.reference]);
  const src = { url: 'https://old.supabase.co', serviceKey: 'k' };
  const only = (async (input: string | URL) =>
    String(input).includes('/bookings?')
      ? Response.json([{ id, reference: r.reference, created_at: new Date().toISOString() }])
      : Response.json([])) as typeof fetch;
  expect(await watchSupabase(db, src, only)).toEqual([]);
});
