// Cas relevés en revue de code, un test chacun.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cancelBooking,
  createStudioBooking,
  createWebsiteBooking,
  loadBundle,
  registryFor,
  rescheduleBooking,
} from '../src/bookings.ts';
import type { Db } from '../src/db.ts';
import { googleEventId, sessionUid } from '../src/event-content.ts';
import type { OutgoingEmail } from '../src/mailer.ts';
import { claimNext, enqueue, markFailed } from '../src/queue.ts';
import type { WorkerDeps } from '../src/worker.ts';
import {
  deps,
  drain,
  FakeCalendar,
  FakeMailer,
  futureYmd,
  isoOf,
  websiteInput,
} from './fakes.ts';
import { createTestDb } from './pglite.ts';

const etouch = { name: 'Théo', source: 'etouch' };
let db: Db;
let mailer: FakeMailer;
let d: WorkerDeps;

afterEach(async () => {
  await db.close();
});
beforeEach(async () => {
  db = await createTestDb();
  mailer = new FakeMailer();
  d = deps(db, new FakeCalendar(), mailer);
});

const unfold = (t: string | undefined) => (t ?? '').replace(/\r\n /g, '');
const icsOf = (m: OutgoingEmail, method: string) =>
  unfold(m.attachments?.find((a) => a.contentType.includes(`method=${method}`))?.content);

it("l'annulation part même avec une ligne libérée importée (instantané au format #1526)", async () => {
  const r = await createWebsiteBooking(db, websiteInput([{ plateauKey: 'live', days: 5, hour: 10, hours: 2 }]));
  await drain(d);
  const date = isoOf(futureYmd(5));
  const uid = `${r.reference}-11111111-1111-4111-8111-111111111111@e-do.studio`;
  await db.query(
    `INSERT INTO calendar_events (uid, booking_id, session_id, google_event_id, snapshot)
     VALUES ($1, $2, '11111111-1111-4111-8111-111111111111', $3, $4)`,
    [uid, r.id, googleEventId(uid), JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', plateau_key: 'vertical', session_date: date, arrival_hour: 14, arrival_minute: null, slot_type: 'hour', hours: 3, calendar_uid: uid })],
  );
  await cancelBooking(db, r.id, etouch, { notifyClient: true });
  await drain(d);
  const cancel = mailer.sent.filter((m) => m.to === 'camille@marque.fr').at(-1) as OutgoingEmail;
  const body = icsOf(cancel, 'CANCEL');
  expect(body).toContain(`UID:${uid}`);
  expect(body).toContain(`DTSTART;TZID=Europe/Paris:${date.replaceAll('-', '')}T140000`);
  expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(2);
});

it("une invitation en retard ne ressuscite pas chez le client une réservation annulée entre-temps", async () => {
  const r = await createWebsiteBooking(db, websiteInput([{ plateauKey: 'live', days: 5, hour: 10, hours: 2 }]));
  await drain(d);
  const id = (await loadBundle(db, r.id))?.sessions[0].id as string;
  mailer.failing = true;
  await rescheduleBooking(db, r.id, etouch, { sessions: [{ id, sessionDate: isoOf(futureYmd(6)), arrivalHour: 11 }], notifyClient: true });
  await drain(d);
  mailer.failing = false;
  await cancelBooking(db, r.id, etouch, { notifyClient: true });
  await drain(d); // l'annulation passe d'abord, le report attend sa reprise
  await db.query("UPDATE jobs SET run_at = now() WHERE status = 'queued'");
  await drain(d);
  const toClient = mailer.sent.filter((m) => m.to === 'camille@marque.fr');
  const last = toClient.at(-1) as OutgoingEmail;
  expect(last.attachments?.some((a) => a.contentType.includes('REQUEST'))).toBe(false);
  expect(toClient.some((m) => icsOf(m, 'CANCEL').includes('METHOD:CANCEL'))).toBe(true);
});

it('une reprise renvoie exactement le même .ics (clé d’idempotence Resend)', async () => {
  const sent: string[] = [];
  let attempts = 0;
  const flaky = {
    async send(email: OutgoingEmail) {
      attempts += 1;
      if (email.to === 'camille@marque.fr') sent.push(email.attachments?.[0]?.content ?? '');
      if (attempts === 1) throw new Error('délai dépassé');
    },
  };
  await createWebsiteBooking(db, websiteInput([{ plateauKey: 'live', days: 5, hour: 10, hours: 2 }]));
  const dd = { ...d, mailer: flaky };
  await drain(dd);
  await new Promise((r) => setTimeout(r, 1100));
  await db.query("UPDATE jobs SET run_at = now() WHERE status = 'queued'");
  await drain(dd);
  expect(sent.length).toBeGreaterThanOrEqual(2);
  expect(new Set(sent).size).toBe(1);
});

it('la garde de chevauchement compte les minutes (10:30–12:30 contre 12:00–14:00)', async () => {
  const date = isoOf(futureYmd(9));
  const mk = (hour: number, minute: number) =>
    createStudioBooking(
      db,
      { clientName: 'X', clientEmail: 'x@x.fr', notifyClient: false, sessions: [{ plateauKey: 'live', slotType: 'hour', hours: 2, sessionDate: date, arrivalHour: hour, arrivalMinute: minute }] },
      etouch,
    );
  await mk(10, 30);
  await expect(mk(12, 0)).rejects.toMatchObject({ status: 409 });
  await expect(mk(12, 30)).resolves.toBeTruthy();
});

it("un report par l'en-tête fait monter le SEQUENCE des lignes qui le suivent", async () => {
  const b = await createStudioBooking(
    db,
    { clientName: 'Y', clientEmail: 'y@x.fr', notifyClient: false, sessions: [{ plateauKey: 'live', slotType: 'hour', hours: 2, sessionDate: isoOf(futureYmd(9)) }] },
    etouch,
  );
  await db.query('UPDATE bookings SET arrival_hour = 10 WHERE id = $1', [b.booking.id]);
  await rescheduleBooking(db, b.booking.id, etouch, { arrivalHour: 15, sessions: [], notifyClient: false });
  expect((await registryFor(db, b.booking.id))[0].sequence).toBe(1);
  expect((await registryFor(db, b.booking.id))[0].uid).toBe(sessionUid(b.booking.reference, b.sessions[0].id));
});

describe('file', () => {
  it("un échec ne bloque pas le travail quand une demande identique arrive au même moment", async () => {
    await enqueue(db, 'calendar.sync', { bookingId: 'x' }, { dedupeKey: 'calendar:x' });
    const job = await claimNext(db);
    await enqueue(db, 'calendar.sync', { bookingId: 'x' }, { dedupeKey: 'calendar:x' });
    // La vérification « remplacé ? » ne voit pas la nouvelle demande (course) :
    // on la simule en lui donnant un autre dedupe_key le temps du contrôle.
    await db.query("UPDATE jobs SET dedupe_key = 'calendar:x' WHERE status = 'queued'");
    await expect(markFailed(db, { ...job!, dedupe_key: null }, 'boom')).resolves.toBe('retry');
    const statuses = await db.query<{ status: string }>('SELECT status FROM jobs ORDER BY id');
    expect(statuses.map((s) => s.status)).toEqual(['done', 'queued']);
  });
});
