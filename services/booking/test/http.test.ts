import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db.ts';
import { createApp } from '../src/http.ts';
import { futureYmd, isoOf, websiteInput } from './fakes.ts';
import { createTestDb } from './pglite.ts';

const KEY = 'etouch-secret-0123456789abcdef';
let db: Db;
let app: ReturnType<typeof createApp>;

afterEach(async () => {
  await db.close();
});

beforeEach(async () => {
  db = await createTestDb();
  app = createApp({
    db,
    apiKeys: new Map([[KEY, 'etouch']]),
    allowedOrigins: ['https://e-do.studio'],
  });
});

// biome-ignore lint/suspicious/noExplicitAny: corps JSON lus par les assertions
const read = async (res: Response): Promise<any> => res.json();

const call = (path: string, init: RequestInit & { json?: unknown; key?: string } = {}) =>
  app.request(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://e-do.studio',
      ...(init.key ? { Authorization: `Bearer ${init.key}` } : {}),
      ...(init.headers as Record<string, string>),
    },
    body: init.json === undefined ? init.body : JSON.stringify(init.json),
  });

describe('public', () => {
  it('crée une réservation et ne renvoie que la référence et le total', async () => {
    const res = await call('/v1/public/bookings', {
      method: 'POST',
      json: websiteInput([{ plateauKey: 'live', days: 6, hour: 10, hours: 2 }]),
    });
    expect(res.status).toBe(201);
    const body = await read(res);
    expect(Object.keys(body).sort()).toEqual(['reference', 'total']);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://e-do.studio');
  });

  it('409 quand le créneau est pris', async () => {
    const input = websiteInput([{ plateauKey: 'live', days: 6, hour: 10, hours: 2 }]);
    await call('/v1/public/bookings', { method: 'POST', json: input });
    const res = await call('/v1/public/bookings', { method: 'POST', json: input });
    expect(res.status).toBe(409);
    expect(await read(res)).toMatchObject({ error: 'slot_taken' });
  });

  it('400 sur une charge invalide', async () => {
    const res = await call('/v1/public/bookings', { method: 'POST', json: { mode: 'booking' } });
    expect(res.status).toBe(400);
  });

  it('les disponibilités ne portent aucune donnée client', async () => {
    await call('/v1/public/bookings', {
      method: 'POST',
      json: websiteInput([{ plateauKey: 'live', days: 6, hour: 10, hours: 2 }]),
    });
    const day = isoOf(futureYmd(6));
    const res = await call(`/v1/public/availability?plateau=live&from=${day}&to=${day}`);
    const body = await read(res);
    expect(body.sessions).toEqual([
      { session_date: day, arrival_hour: 10, arrival_minute: null, hours: 2 },
    ]);
    expect(JSON.stringify(body)).not.toContain('@');
  });

  it("un échec du tunnel ouvre une alerte critique et l'envoie", async () => {
    const res = await call('/v1/public/booking-failures', {
      method: 'POST',
      json: { error: 'TypeError: Failed to fetch', mode: 'booking', contactEmail: 'x@y.fr' },
    });
    expect(res.status).toBe(200);
    const [alert] = await db.query<{ severity: string }>('SELECT severity FROM alerts');
    expect(alert.severity).toBe('critical');
    const [job] = await db.query<{ kind: string }>("SELECT kind FROM jobs WHERE kind = 'alerts.flush'");
    expect(job).toBeTruthy();
  });

  it('limite le débit par IP', async () => {
    const input = (i: number) => websiteInput([{ plateauKey: 'live', days: 20 + i, hour: 10, hours: 2 }], `p${i}@x.fr`);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await call('/v1/public/bookings', {
        method: 'POST',
        json: input(i),
        headers: { 'X-Forwarded-For': '203.0.113.9' },
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('privé', () => {
  it('refuse sans clé, accepte avec', async () => {
    expect((await call('/v1/bookings')).status).toBe(401);
    expect((await call('/v1/bookings', { key: 'mauvaise' })).status).toBe(401);
    expect((await call('/v1/bookings', { key: KEY })).status).toBe(200);
  });

  it('crée depuis etouch, annule, et l’historique note qui', async () => {
    const created = await call('/v1/bookings', {
      method: 'POST',
      key: KEY,
      json: {
        clientName: 'GÜÇ',
        clientEmail: 'guc@example.com',
        notifyClient: false,
        actor: 'Théo',
        sessions: [
          { plateauKey: 'vertical', slotType: 'hour', hours: 4, sessionDate: isoOf(futureYmd(4)), arrivalHour: 10 },
        ],
      },
    });
    expect(created.status).toBe(201);
    const booking = await read(created);
    expect(booking.booking.reference).toMatch(/^ETC-/);
    expect(booking.booking.source).toBe('etouch');
    expect(booking.calendar).toHaveLength(1);

    const cancelled = await call(`/v1/bookings/${booking.booking.id}/cancel`, {
      method: 'POST',
      key: KEY,
      json: { notifyClient: false, actor: 'Théo' },
    });
    const after = await read(cancelled);
    expect(after.booking.status).toBe('cancelled');
    expect(after.history.map((h: { action: string; actor_source: string }) => `${h.action}:${h.actor_source}`)).toEqual([
      'created:etouch',
      'cancelled:etouch',
    ]);
  });

  it('liste les réservations modifiées depuis une date (synchro etouch)', async () => {
    await call('/v1/public/bookings', {
      method: 'POST',
      json: websiteInput([{ plateauKey: 'live', days: 6, hour: 10, hours: 2 }]),
    });
    const since = new Date(Date.now() - 60_000).toISOString();
    const res = await call(`/v1/bookings?updatedSince=${encodeURIComponent(since)}`, { key: KEY });
    const body = await read(res);
    expect(body.bookings).toHaveLength(1);
    expect(body.bookings[0].sessions).toHaveLength(1);
  });

  it("donne l'état du service", async () => {
    const res = await call('/v1/admin/status', { key: KEY });
    expect(res.status).toBe(200);
    expect(Object.keys(await read(res)).sort()).toEqual([
      'calendarErrors',
      'deadJobs',
      'jobs',
      'openAlerts',
      'state',
    ]);
  });

  it('404 sur une réservation inconnue', async () => {
    const res = await call('/v1/bookings/00000000-0000-4000-8000-000000000000', { key: KEY });
    expect(res.status).toBe(404);
  });
});
