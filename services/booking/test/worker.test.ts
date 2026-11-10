import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { raiseAlert } from '../src/alerts.ts';
import { loadConfig } from '../src/config.ts';
import type { Db } from '../src/db.ts';
import { requeueStale } from '../src/queue.ts';
import { schedule } from '../src/worker.ts';
import { deps, drain, FakeCalendar, FakeMailer } from './fakes.ts';
import { createTestDb } from './pglite.ts';

let db: Db;
afterEach(async () => {
  await db.close();
});
beforeEach(async () => {
  db = await createTestDb();
});

const queued = async () =>
  (await db.query<{ kind: string }>("SELECT kind FROM jobs WHERE status = 'queued' ORDER BY id")).map(
    (j) => j.kind,
  );

describe('planification', () => {
  it('réconcilie toutes les 10 minutes, pas plus', async () => {
    const t0 = new Date('2026-11-10T06:00:00Z');
    await schedule(db, t0);
    await schedule(db, new Date(t0.getTime() + 5 * 60_000));
    expect((await queued()).filter((k) => k === 'calendar.reconcile')).toHaveLength(1);
    await db.query('DELETE FROM jobs');
    await schedule(db, new Date(t0.getTime() + 11 * 60_000));
    expect(await queued()).toContain('calendar.reconcile');
  });

  it("pas de récapitulatif : rien n'est planifié à 8 h", async () => {
    await schedule(db, new Date('2026-11-10T07:05:00Z'));
    expect(await queued()).toEqual(['calendar.reconcile']);
  });

  it('une alerte répétée ne renvoie pas d’e-mail ; une aggravation si', async () => {
    const mailer = new FakeMailer();
    const d = deps(db, new FakeCalendar(), mailer);
    await raiseAlert(db, { key: 'k', severity: 'warning', subject: 'A', body: '' });
    await drain(d);
    await raiseAlert(db, { key: 'k', severity: 'warning', subject: 'A', body: '' });
    await drain(d);
    expect(mailer.sent).toHaveLength(1);
    await raiseAlert(db, { key: 'k', severity: 'critical', subject: 'A', body: '' });
    await drain(d);
    expect(mailer.sent).toHaveLength(2);
    expect(mailer.sent[1].subject).toContain('🚨');
  });

  it('au redémarrage, un travail interrompu repart', async () => {
    await db.query("INSERT INTO jobs (kind, status, dedupe_key) VALUES ('calendar.reconcile', 'running', 'r')");
    expect(await requeueStale(db)).toBe(1);
    expect(await queued()).toEqual(['calendar.reconcile']);
  });
});

describe('configuration', () => {
  const base = {
    DATABASE_URL: 'postgres://x',
    BOOKING_API_KEYS: 'etouch:0123456789abcdef01234567',
    RESEND_API_KEY: 're_x',
    GOOGLE_CALENDAR_ID: 'agenda@group.calendar.google.com',
    GOOGLE_SERVICE_ACCOUNT_JSON: '{}',
  };

  it('lit les clés par appelant', () => {
    const c = loadConfig(base);
    expect(c.apiKeys.get('0123456789abcdef01234567')).toBe('etouch');
    expect(c.alertEmail).toBe('contact@e-do.studio');
  });

  it('refuse une clé trop courte ou un agenda sans accès', () => {
    expect(() => loadConfig({ ...base, BOOKING_API_KEYS: 'etouch:court' })).toThrow();
    expect(() => loadConfig({ ...base, GOOGLE_SERVICE_ACCOUNT_JSON: undefined })).toThrow(/Agenda Google/);
  });
});
