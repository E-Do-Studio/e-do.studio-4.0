import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cancelBooking,
  createStudioBooking,
  createWebsiteBooking,
  loadBundle,
  registryFor,
  removeSessions,
  rescheduleBooking,
} from '../src/bookings.ts';
import { reconcile } from '../src/calendar-sync.ts';
import type { Db } from '../src/db.ts';
import { googleEventId, sessionUid } from '../src/event-content.ts';
import { MAX_ATTEMPTS } from '../src/queue.ts';
import type { WorkerDeps } from '../src/worker.ts';
import {
  deps,
  drain,
  FakeCalendar,
  FakeMailer,
  fastForward,
  futureYmd,
  isoOf,
  websiteInput,
} from './fakes.ts';
import { createTestDb } from './pglite.ts';

const etouch = { name: 'Théo', source: 'etouch' };

let db: Db;
let calendar: FakeCalendar;
let mailer: FakeMailer;
let d: WorkerDeps;

afterEach(async () => {
  await db.close();
});

beforeEach(async () => {
  db = await createTestDb();
  calendar = new FakeCalendar();
  mailer = new FakeMailer();
  d = deps(db, calendar, mailer);
});

async function gucBooking() {
  const date = isoOf(futureYmd(4));
  return createStudioBooking(
    db,
    {
      clientName: 'GÜÇ',
      clientEmail: 'guc@example.com',
      notifyClient: false,
      sessions: [
        { plateauKey: 'vertical', slotType: 'hour', hours: 4, sessionDate: date, arrivalHour: 10 },
        { plateauKey: 'live', slotType: 'hour', hours: 3, sessionDate: date, arrivalHour: 9 },
      ],
    },
    etouch,
  );
}

describe('synchro', () => {
  it('crée un événement par ligne, avec l’id sha256 de son UID et l’heure de Paris', async () => {
    const b = await gucBooking();
    await drain(d);
    expect(calendar.events.size).toBe(2);
    const vertical = b.sessions.find((s) => s.plateau_key === 'vertical');
    const ev = calendar.events.get(googleEventId(sessionUid(b.booking.reference, vertical?.id as string)));
    expect(ev?.summary).toBe('GÜÇ — Vertical');
    expect(ev?.start).toEqual({ dateTime: `${vertical?.session_date}T10:00:00`, timeZone: 'Europe/Paris' });
    expect(ev?.end?.dateTime).toBe(`${vertical?.session_date}T14:00:00`);
    expect(ev?.description).toContain(`Référence: ${b.booking.reference}`);
    expect(ev?.status).toBe('tentative');
    expect((await loadBundle(db, b.booking.id))?.booking.calendar_synced_at).not.toBeNull();
  });

  it('une annulation retire tous les événements de la réservation', async () => {
    const b = await gucBooking();
    await drain(d);
    await cancelBooking(db, b.booking.id, etouch, { notifyClient: false });
    await drain(d);
    expect(calendar.events.size).toBe(0);
    expect((await registryFor(db, b.booking.id)).every((e) => e.google_state === 'absent')).toBe(true);
  });

  it('retirer une machine retire SON événement, même sans sa ligne, et garde l’autre', async () => {
    const b = await gucBooking();
    await drain(d);
    const vertical = b.sessions.find((s) => s.plateau_key === 'vertical');
    const live = b.sessions.find((s) => s.plateau_key === 'live');
    await removeSessions(db, b.booking.id, [vertical?.id as string], etouch, { notifyClient: false });
    await drain(d);
    expect([...calendar.events.keys()]).toEqual([
      googleEventId(sessionUid(b.booking.reference, live?.id as string)),
    ]);
  });

  it('un report déplace l’événement existant (même id)', async () => {
    const b = await gucBooking();
    await drain(d);
    const live = b.sessions.find((s) => s.plateau_key === 'live');
    const target = isoOf(futureYmd(6));
    await rescheduleBooking(db, b.booking.id, etouch, {
      sessions: [{ id: live?.id as string, sessionDate: target, arrivalHour: 15 }],
      notifyClient: false,
    });
    await drain(d);
    const ev = calendar.events.get(googleEventId(sessionUid(b.booking.reference, live?.id as string)));
    expect(ev?.start?.dateTime).toBe(`${target}T15:00:00`);
    expect(calendar.events.size).toBe(2);
  });

  it('ne rend jamais la main en succès quand Google refuse : reprise, alerte, puis abandon critique', async () => {
    const b = await gucBooking();
    await drain(d);
    calendar.failing = true;
    await cancelBooking(db, b.booking.id, etouch, { notifyClient: false });
    await drain(d);
    let [job] = await db.query<{ status: string; attempts: number }>(
      "SELECT status, attempts FROM jobs WHERE kind = 'calendar.sync' ORDER BY id DESC LIMIT 1",
    );
    expect(job).toMatchObject({ status: 'queued', attempts: 1 });
    expect((await loadBundle(db, b.booking.id))?.booking.calendar_sync_error).toContain('503');

    for (let i = 0; i < 2; i += 1) {
      await fastForward(db);
      await drain(d);
    }
    const [warning] = await db.query<{ severity: string; subject: string }>(
      "SELECT severity, subject FROM alerts WHERE key LIKE 'job:calendar:%'",
    );
    expect(warning.severity).toBe('warning');
    expect(warning.subject).toContain(b.booking.reference);
    // L'e-mail d'alerte est parti au studio.
    expect(mailer.sent.some((m) => m.to === 'alertes@e-do.studio')).toBe(true);

    for (let i = 3; i < MAX_ATTEMPTS; i += 1) {
      await fastForward(db);
      await drain(d);
    }
    [job] = await db.query(
      "SELECT status, attempts FROM jobs WHERE kind = 'calendar.sync' ORDER BY id DESC LIMIT 1",
    );
    expect(job.status).toBe('dead');
    const [critical] = await db.query<{ severity: string }>(
      "SELECT severity FROM alerts WHERE key LIKE 'job:calendar:%' AND resolved_at IS NULL",
    );
    expect(critical.severity).toBe('critical');
    // Les événements sont toujours là : rien n'a été prétendu supprimé.
    expect(calendar.events.size).toBe(2);
  });

  it('l’alerte se referme quand la synchro repasse', async () => {
    const b = await gucBooking();
    calendar.failing = true;
    for (let i = 0; i < 3; i += 1) {
      await fastForward(db);
      await drain(d);
    }
    calendar.failing = false;
    await fastForward(db);
    await drain(d);
    const open = await db.query("SELECT 1 FROM alerts WHERE key LIKE 'job:calendar:%' AND resolved_at IS NULL");
    expect(open).toHaveLength(0);
    expect(calendar.events.size).toBe(2);
    expect((await loadBundle(db, b.booking.id))?.booking.calendar_sync_error).toBeNull();
  });
});

describe('réconciliation', () => {
  /** Un événement écrit par l'ancien calendar-sync : hors registre, id inconnu. */
  function legacyEvent(id: string, reference: string, summary: string, dateTime: string) {
    calendar.events.set(id, {
      id,
      summary,
      description: `Référence: ${reference}\nClient: test`,
      start: { dateTime, timeZone: 'Europe/Paris' },
      end: { dateTime, timeZone: 'Europe/Paris' },
    });
  }

  it('retire l’événement orphelin d’une réservation annulée dont les lignes ont disparu (cas GÜÇ / IMANUUR)', async () => {
    const b = await gucBooking();
    await cancelBooking(db, b.booking.id, etouch, { notifyClient: false });
    // Ce qu'avait fait l'ancien etouch : lignes supprimées, registre vide.
    await db.query('DELETE FROM booking_sessions WHERE booking_id = $1', [b.booking.id]);
    await db.query('DELETE FROM calendar_events WHERE booking_id = $1', [b.booking.id]);
    await db.query('DELETE FROM jobs');
    legacyEvent('legacyguc1', b.booking.reference, 'GÜÇ — Vertical', `${isoOf(futureYmd(4))}T10:00:00+01:00`);

    const report = await reconcile(db, calendar);
    expect(report.removedOrphans).toHaveLength(1);
    expect(calendar.events.size).toBe(0);
    const [info] = await db.query<{ severity: string }>("SELECT severity FROM alerts WHERE key = 'calendar:orphan:legacyguc1'");
    expect(info.severity).toBe('info');
  });

  it('ne supprime pas un événement d’une référence inconnue : il alerte', async () => {
    legacyEvent('mystere1', 'EDO-R-INCONN', 'Inconnu — Live', `${isoOf(futureYmd(3))}T10:00:00+01:00`);
    const report = await reconcile(db, calendar);
    expect(report.unknown).toHaveLength(1);
    expect(calendar.events.has('mystere1')).toBe(true);
    const [alert] = await db.query<{ severity: string }>("SELECT severity FROM alerts WHERE key = 'calendar:unknown:mystere1'");
    expect(alert.severity).toBe('warning');
  });

  it('ignore les événements qui ne viennent pas d’e-do', async () => {
    calendar.events.set('perso', { id: 'perso', summary: 'Dentiste', start: { dateTime: '2026-12-01T10:00:00+01:00' } });
    const report = await reconcile(db, calendar);
    expect(report.ours).toBe(0);
    expect(calendar.events.has('perso')).toBe(true);
  });

  it('reprend l’événement d’avant le registre au lieu d’en créer un second', async () => {
    const r = await createWebsiteBooking(db, websiteInput([{ plateauKey: 'live', days: 5, hour: 14, hours: 2 }]));
    await db.query('DELETE FROM jobs');
    const date = isoOf(futureYmd(5));
    // Heure d'hiver ou d'été : on écrit l'instant UTC qui tombe à 14h à Paris.
    const utc = new Date(`${date}T14:00:00Z`);
    const offset = new Date(utc.toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getTime() - new Date(utc.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const instant = new Date(utc.getTime() - offset).toISOString();
    legacyEvent('ancienid42', r.reference, 'Marque — Live', instant);

    const report = await reconcile(db, calendar);
    expect(report.adopted).toHaveLength(1);
    await drain(d);
    expect([...calendar.events.keys()]).toEqual(['ancienid42']);
    expect(calendar.events.get('ancienid42')?.extendedProperties?.private?.edoReference).toBe(r.reference);
  });

  it('supprime un doublon quand la ligne a déjà son événement', async () => {
    const r = await createWebsiteBooking(db, websiteInput([{ plateauKey: 'live', days: 5, hour: 10, hours: 2 }]));
    await drain(d);
    const date = isoOf(futureYmd(5));
    const utc = new Date(`${date}T10:00:00Z`);
    const offset = new Date(utc.toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getTime() - new Date(utc.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    legacyEvent('doublon', r.reference, 'Marque — Live', new Date(utc.getTime() - offset).toISOString());
    const report = await reconcile(db, calendar);
    expect(report.removedOrphans).toHaveLength(1);
    expect(calendar.events.has('doublon')).toBe(false);
    expect(calendar.events.size).toBe(1);
  });

  it('remet un événement supprimé à la main dans Google et prévient le studio', async () => {
    const b = await gucBooking();
    await drain(d);
    const [first] = [...calendar.events.keys()];
    calendar.events.delete(first);
    const report = await reconcile(db, calendar);
    expect(report.recreated).toHaveLength(1);
    await drain(d);
    expect(calendar.events.has(first)).toBe(true);
    const alerts = await db.query<{ key: string }>("SELECT key FROM alerts WHERE key LIKE 'calendar:recreated:%'");
    expect(alerts).toHaveLength(1);
    expect(b).toBeTruthy();
  });

  it('retrouve par le registre les lignes libérées gardées dans l’historique (import etouch #1526)', async () => {
    const b = await gucBooking();
    await drain(d);
    // L'ancien chemin : lignes supprimées, réservation annulée, événements restés.
    await db.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [b.booking.id]);
    await db.query('DELETE FROM booking_sessions WHERE booking_id = $1', [b.booking.id]);
    await db.query('DELETE FROM jobs');
    expect(calendar.events.size).toBe(2);
    await reconcile(db, calendar);
    await drain(d);
    expect(calendar.events.size).toBe(0);
  });
});
