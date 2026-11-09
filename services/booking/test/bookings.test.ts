import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cancelBooking,
  createStudioBooking,
  createWebsiteBooking,
  DomainError,
  loadBundle,
  registryFor,
  removeSessions,
  rescheduleBooking,
} from '../src/bookings.ts';
import type { Db } from '../src/db.ts';
import { googleEventId, sessionUid } from '../src/event-content.ts';
import { futureYmd, isoOf, jobs, websiteInput } from './fakes.ts';
import { createTestDb } from './pglite.ts';

const etouch = { name: 'Théo', source: 'etouch' };

let db: Db;
afterEach(async () => {
  await db.close();
});

beforeEach(async () => {
  db = await createTestDb();
});

describe('création depuis le site', () => {
  it('écrit la réservation, ses lignes, le devis recalculé, le registre et la file', async () => {
    const r = await createWebsiteBooking(
      db,
      websiteInput([
        { plateauKey: 'vertical', days: 10, hour: 10, hours: 4 },
        { plateauKey: 'live', days: 10, hour: 14, hours: 2 },
      ]),
    );
    expect(r.reference).toMatch(/^EDO-R-[A-Z0-9]{6}$/);
    expect(r.total).toBeGreaterThan(0);

    const bundle = await loadBundle(db, r.id);
    expect(bundle?.booking.status).toBe('pending');
    expect(bundle?.sessions).toHaveLength(2);
    expect(bundle?.sessions.every((s) => s.blocks_slot)).toBe(true);
    expect(bundle?.quote?.total).toBe(r.total);

    const registry = await registryFor(db, r.id);
    expect(registry.map((e) => e.uid).sort()).toEqual(
      bundle?.sessions.map((s) => sessionUid(r.reference, s.id)).sort(),
    );
    expect(registry[0].google_event_id).toBe(googleEventId(registry[0].uid));

    expect((await jobs(db)).map((j) => j.kind).sort()).toEqual([
      'calendar.sync',
      'email.client',
      'email.studio',
      'hubspot.booking',
    ]);
  });

  it('refuse un créneau hors des horaires du plateau', async () => {
    await expect(
      createWebsiteBooking(
        db,
        websiteInput([{ plateauKey: 'vertical', days: 5, hour: 17, hours: 4 }]),
      ),
    ).rejects.toMatchObject({ code: 'outside_opening_hours' });
  });

  it('refuse un chevauchement sur le même plateau (409), sans rien laisser en base', async () => {
    await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'vertical', days: 7, hour: 10, hours: 4 }]),
    );
    const err = await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'vertical', days: 7, hour: 12, hours: 2 }], 'b@x.fr'),
    ).catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.status).toBe(409);
    const [{ n }] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM bookings');
    expect(n).toBe(1);
  });
});

describe('annulation', () => {
  it('libère le créneau sans supprimer les lignes, et augmente le SEQUENCE', async () => {
    const r = await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'vertical', days: 6, hour: 10, hours: 4 }]),
    );
    await cancelBooking(db, r.id, etouch, { notifyClient: true });

    const bundle = await loadBundle(db, r.id);
    expect(bundle?.booking.status).toBe('cancelled');
    expect(bundle?.sessions).toHaveLength(1);
    expect(bundle?.sessions[0].blocks_slot).toBe(false);
    expect((await registryFor(db, r.id))[0].sequence).toBe(1);

    // Le même créneau se réserve de nouveau.
    await expect(
      createWebsiteBooking(
        db,
        websiteInput([{ plateauKey: 'vertical', days: 6, hour: 10, hours: 4 }], 'c@x.fr'),
      ),
    ).resolves.toBeTruthy();

    const history = await db.query<{ action: string; data: { lines: { calendar_uid: string }[] } }>(
      "SELECT action, data FROM booking_events WHERE booking_id = $1 AND action = 'cancelled'",
      [r.id],
    );
    expect(history[0].data.lines[0].calendar_uid).toBe(
      sessionUid(r.reference, bundle?.sessions[0].id as string),
    );
  });

  it("n'écrit pas au client quand le studio ne le veut pas", async () => {
    const r = await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'live', days: 3, hour: 11, hours: 2 }]),
    );
    await db.query('DELETE FROM jobs');
    await cancelBooking(db, r.id, etouch, { notifyClient: false });
    expect((await jobs(db)).map((j) => j.kind)).toEqual(['calendar.sync']);
  });
});

describe("retrait d'une machine", () => {
  it('supprime la ligne mais garde son UID au registre', async () => {
    const created = await createStudioBooking(
      db,
      {
        clientName: 'GÜÇ',
        clientEmail: 'guc@example.com',
        notifyClient: false,
        sessions: [
          { plateauKey: 'vertical', slotType: 'hour', hours: 4, sessionDate: isoOf(futureYmd(4)), arrivalHour: 10 },
          { plateauKey: 'live', slotType: 'hour', hours: 3, sessionDate: isoOf(futureYmd(4)), arrivalHour: 9 },
        ],
      },
      etouch,
    );
    const vertical = created.sessions.find((s) => s.plateau_key === 'vertical');
    await removeSessions(db, created.booking.id, [vertical?.id as string], etouch, {
      notifyClient: false,
    });
    const after = await loadBundle(db, created.booking.id);
    expect(after?.sessions.map((s) => s.plateau_key)).toEqual(['live']);
    const registry = await registryFor(db, created.booking.id);
    expect(registry).toHaveLength(2);
    expect(registry.find((e) => e.session_id === vertical?.id)?.sequence).toBe(1);
  });

  it('retirer la dernière machine annule la réservation', async () => {
    const created = await createStudioBooking(
      db,
      {
        clientName: 'IMANUUR',
        clientEmail: 'i@example.com',
        notifyClient: false,
        sessions: [
          { plateauKey: 'live', slotType: 'hour', hours: 2, sessionDate: isoOf(futureYmd(2)), arrivalHour: 15 },
        ],
      },
      etouch,
    );
    await removeSessions(db, created.booking.id, [created.sessions[0].id], etouch, {
      notifyClient: false,
    });
    expect((await loadBundle(db, created.booking.id))?.booking.status).toBe('cancelled');
  });
});

describe('report', () => {
  it('déplace la ligne, recale l’en-tête et augmente le SEQUENCE de la ligne déplacée', async () => {
    const r = await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'horizontal', days: 8, hour: 10, hours: 2 }]),
    );
    const before = await loadBundle(db, r.id);
    const target = isoOf(futureYmd(9));
    await rescheduleBooking(db, r.id, etouch, {
      sessions: [{ id: before?.sessions[0].id as string, sessionDate: target, arrivalHour: 14, arrivalMinute: 30 }],
      notifyClient: true,
    });
    const after = await loadBundle(db, r.id);
    expect(after?.sessions[0]).toMatchObject({ session_date: target, arrival_hour: 14, arrival_minute: 30 });
    expect(after?.booking).toMatchObject({ preferred_date: target, arrival_hour: 14 });
    expect((await registryFor(db, r.id))[0].sequence).toBe(1);
  });

  it('refuse un report sur un créneau pris', async () => {
    await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'live', days: 12, hour: 10, hours: 4 }]),
    );
    const other = await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'live', days: 13, hour: 10, hours: 4 }], 'z@x.fr'),
    );
    const s = (await loadBundle(db, other.id))?.sessions[0];
    await expect(
      rescheduleBooking(db, other.id, etouch, {
        sessions: [{ id: s?.id as string, sessionDate: isoOf(futureYmd(12)), arrivalHour: 12 }],
        notifyClient: false,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
