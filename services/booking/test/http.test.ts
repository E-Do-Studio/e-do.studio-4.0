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

  it("ne lit que l'adresse ajoutée par le proxy, pas celle que le client écrit", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await call('/v1/public/bookings', {
        method: 'POST',
        json: websiteInput([{ plateauKey: 'live', days: 20 + i, hour: 10, hours: 2 }], `s${i}@x.fr`),
        headers: { 'X-Forwarded-For': `198.51.100.${i}, 203.0.113.9` },
      });
      statuses.push(res.status);
    }
    expect(statuses[10]).toBe(429);
  });

  it("plafonne les réservations par adresse e-mail, quelle que soit l'IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const res = await call('/v1/public/bookings', {
        method: 'POST',
        json: websiteInput([{ plateauKey: 'live', days: 20 + i, hour: 10, hours: 2 }], 'Cible@x.fr'),
        headers: { 'X-Forwarded-For': `198.51.100.${i}` },
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it('plafonne les réservations du site par heure et alerte le studio', async () => {
    await db.query(
      `INSERT INTO rate_limits (bucket, ip_hash, window_start, count)
       VALUES ('booking-global', 'all', to_timestamp(floor(extract(epoch FROM now()) / 3600) * 3600), 40)`,
    );
    const res = await call('/v1/public/bookings', {
      method: 'POST',
      json: websiteInput([{ plateauKey: 'live', days: 20, hour: 10, hours: 2 }]),
    });
    expect(res.status).toBe(429);
    const [alert] = await db.query<{ severity: string }>(
      "SELECT severity FROM alerts WHERE key = 'abuse:booking-global'",
    );
    expect(alert?.severity).toBe('warning');
  });

  it('plafonne la lecture des flux iCal (énumération des références)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 61; i += 1) {
      statuses.push((await call(`/v1/public/ical/EDO-R-AAAA${i}`)).status);
    }
    expect(statuses.slice(0, 60).every((s) => s === 404)).toBe(true);
    expect(statuses[60]).toBe(429);
  });

  it("refuse localhost en production, l'accepte en développement", async () => {
    const preflight = (a: typeof app) =>
      a.request('/v1/public/bookings', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'POST' },
      });
    expect((await preflight(app)).headers.get('access-control-allow-origin')).toBeNull();
    const dev = createApp({ db, apiKeys: new Map(), allowedOrigins: [], allowLocalOrigins: true });
    expect((await preflight(dev)).headers.get('access-control-allow-origin')).toBe(
      'http://localhost:3000',
    );
  });

  it('refuse un corps démesuré', async () => {
    const res = await call('/v1/public/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(2 * 1024 * 1024) }] }),
    });
    expect(res.status).toBe(413);
  });

  it('pose les en-têtes de sécurité', async () => {
    const res = await call('/healthz');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

describe('privé', () => {
  it('refuse sans clé, accepte avec', async () => {
    expect((await call('/v1/bookings')).status).toBe(401);
    expect((await call('/v1/bookings', { key: 'mauvaise' })).status).toBe(401);
    expect((await call('/v1/bookings', { key: KEY })).status).toBe(200);
  });

  it('bloque une IP qui essaie des clés en série', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 21; i += 1) {
      statuses.push((await call('/v1/bookings', { key: `essai-${i}` })).status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true);
    expect(statuses[20]).toBe(429);
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

describe('pour etouch', () => {
  const studio = (hour: number, minute = 0) => ({
    clientName: 'Studio',
    clientEmail: 's@x.fr',
    notifyClient: false,
    sessions: [{ plateauKey: 'live', slotType: 'hour', hours: 2, sessionDate: isoOf(futureYmd(15)), arrivalHour: hour, arrivalMinute: minute }],
  });

  it('un 409 nomme le créneau occupé, en heures', async () => {
    await call('/v1/bookings', { method: 'POST', key: KEY, json: studio(10, 30) });
    const res = await call('/v1/bookings', { method: 'POST', key: KEY, json: studio(11) });
    expect(res.status).toBe(409);
    expect((await read(res)).conflict).toEqual({ plateau: 'live', date: isoOf(futureYmd(15)), fromHour: 10.5, toHour: 12.5 });
  });

  it('filtre la liste par statut, dates et ordre', async () => {
    const a = await read(await call('/v1/bookings', { method: 'POST', key: KEY, json: studio(10) }));
    await call('/v1/bookings', { method: 'POST', key: KEY, json: { ...studio(14), sessions: [{ ...studio(14).sessions[0], sessionDate: isoOf(futureYmd(40)) }] } });
    await call(`/v1/bookings/${a.booking.id}/cancel`, { method: 'POST', key: KEY, json: { notifyClient: false } });
    const day = isoOf(futureYmd(15));
    const active = await read(await call(`/v1/bookings?status=pending,confirmed&from=${isoOf(futureYmd(1))}&to=${isoOf(futureYmd(60))}&order=preferred_date.desc`, { key: KEY }));
    expect(active.bookings).toHaveLength(1);
    const cancelled = await read(await call(`/v1/bookings?status=cancelled&from=${day}&to=${day}`, { key: KEY }));
    expect(cancelled.bookings[0].booking.id).toBe(a.booking.id);
    expect((await call('/v1/bookings?order=n_importe_quoi', { key: KEY })).status).toBe(400);
  });

  it('prévient le client après coup : annulation avec ses UID', async () => {
    const a = await read(await call('/v1/bookings', { method: 'POST', key: KEY, json: studio(10) }));
    await call(`/v1/bookings/${a.booking.id}/cancel`, { method: 'POST', key: KEY, json: { notifyClient: false } });
    await db.query('DELETE FROM jobs');
    const res = await call(`/v1/bookings/${a.booking.id}/notify`, { method: 'POST', key: KEY, json: { template: 'cancelled', message: 'Désolé' } });
    expect(res.status).toBe(202);
    const jobs = await db.query<{ kind: string; payload: { cancelUids: string[]; message: string } }>('SELECT kind, payload FROM jobs ORDER BY id');
    expect(jobs.map((j) => j.kind)).toEqual(['email.client', 'email.studio']);
    expect(jobs[0].payload.cancelUids).toHaveLength(1);
    expect(jobs[0].payload.message).toBe('Désolé');
  });
});
