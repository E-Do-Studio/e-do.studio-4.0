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

  it('un récapitulatif par jour, à partir de 8 h à Paris', async () => {
    await schedule(db, new Date('2026-11-10T06:30:00Z')); // 7h30 à Paris
    expect(await queued()).not.toContain('alerts.digest');
    await schedule(db, new Date('2026-11-10T07:05:00Z')); // 8h05
    await schedule(db, new Date('2026-11-10T15:00:00Z'));
    expect((await queued()).filter((k) => k === 'alerts.digest')).toHaveLength(1);
  });

  it('le récapitulatif liste l’ouvert et ce qui s’est passé', async () => {
    const mailer = new FakeMailer();
    await raiseAlert(db, { key: 'k1', severity: 'warning', subject: 'Synchro en échec', body: '…' });
    await raiseAlert(db, { key: 'k2', severity: 'info', subject: 'Orphelin retiré', body: '…' });
    await db.query("INSERT INTO jobs (kind, dedupe_key) VALUES ('alerts.digest', 'alerts.digest')");
    await drain(deps(db, new FakeCalendar(), mailer));
    const digest = mailer.sent.find((m) => m.subject.startsWith('Réservations'));
    expect(digest?.html).toContain('Synchro en échec');
    expect(digest?.html).toContain('Orphelin retiré');
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
