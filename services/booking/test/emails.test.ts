import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cancelBooking,
  createStudioBooking,
  createWebsiteBooking,
  loadBundle,
  removeSessions,
  rescheduleBooking,
} from '../src/bookings.ts';
import type { Db } from '../src/db.ts';
import { sessionUid } from '../src/event-content.ts';
import type { OutgoingEmail } from '../src/mailer.ts';
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

const toClient = (to = 'camille@marque.fr') =>
  mailer.sent.filter((m) => m.to === to);
const ics = (m: OutgoingEmail, method: 'REQUEST' | 'CANCEL') =>
  m.attachments?.find((a) => a.contentType.includes(`method=${method}`))?.content;
/** Les lignes .ics dépliées (RFC 5545 §3.1). */
const unfold = (text: string | undefined) => (text ?? '').replace(/\r\n /g, '');

describe('invitation', () => {
  it('le client reçoit un REQUEST avec organisateur, participant, UID de la ligne et SEQUENCE 0', async () => {
    const r = await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'vertical', days: 10, hour: 10, hours: 4 }]),
    );
    await drain(d);
    const [mail] = toClient();
    const body = unfold(ics(mail, 'REQUEST'));
    const session = (await loadBundle(db, r.id))?.sessions[0];
    expect(body).toContain('METHOD:REQUEST');
    expect(body).toContain(`UID:${sessionUid(r.reference, session?.id as string)}`);
    expect(body).toContain('SEQUENCE:0');
    expect(body).toContain('ORGANIZER;CN=E-Do Studio:mailto:contact@e-do.studio');
    expect(body).toContain('mailto:camille@marque.fr');
    expect(body).toContain(`DTSTART;TZID=Europe/Paris:${session?.session_date?.replaceAll('-', '')}T100000`);
    expect(body).toContain(`DTEND;TZID=Europe/Paris:${session?.session_date?.replaceAll('-', '')}T140000`);
    expect(mail.replyTo).toBe('contact@e-do.studio');
    expect(mail.idempotencyKey).toMatch(/^job-\d+$/);
    // Le studio reçoit sa copie, sans .ics.
    expect(mailer.sent.find((m) => m.to === 'contact@e-do.studio')?.attachments ?? []).toHaveLength(0);
  });

  it('chaque ligne .ics fait 75 octets au plus', async () => {
    await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'vertical', days: 10, hour: 10, hours: 4 }]),
    );
    await drain(d);
    const raw = ics(toClient()[0], 'REQUEST') ?? '';
    for (const line of raw.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
  });
});

describe('annulation', () => {
  it('joint un METHOD:CANCEL, mêmes UID, SEQUENCE supérieur, STATUS:CANCELLED', async () => {
    const r = await createWebsiteBooking(
      db,
      websiteInput([
        { plateauKey: 'vertical', days: 10, hour: 10, hours: 4 },
        { plateauKey: 'live', days: 10, hour: 14, hours: 2 },
      ]),
    );
    await drain(d);
    const invitation = unfold(ics(toClient()[0], 'REQUEST'));
    await cancelBooking(db, r.id, etouch, { notifyClient: true, message: 'Imprévu' });
    await drain(d);
    const cancel = toClient().at(-1) as OutgoingEmail;
    const body = unfold(ics(cancel, 'CANCEL'));
    expect(body).toContain('METHOD:CANCEL');
    expect(body.match(/STATUS:CANCELLED/g)).toHaveLength(2);
    expect(body.match(/SEQUENCE:1/g)).toHaveLength(2);
    const uids = (s: string) => [...s.matchAll(/^UID:(.+)$/gm)].map((m) => m[1]).sort();
    expect(uids(body)).toEqual(uids(invitation));
    expect(cancel.subject).toContain(r.reference);
  });

  it('pas d’e-mail au client quand le studio annule sans prévenir', async () => {
    const r = await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'live', days: 4, hour: 11, hours: 2 }]),
    );
    await drain(d);
    const before = mailer.sent.length;
    await cancelBooking(db, r.id, etouch, { notifyClient: false });
    await drain(d);
    expect(mailer.sent.length).toBe(before);
  });
});

describe('report', () => {
  it('renvoie un REQUEST au SEQUENCE incrémenté à chaque report', async () => {
    const r = await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'horizontal', days: 8, hour: 10, hours: 2 }]),
    );
    await drain(d);
    const id = (await loadBundle(db, r.id))?.sessions[0].id as string;
    for (const [n, days] of [
      [1, 9],
      [2, 11],
    ] as const) {
      await rescheduleBooking(db, r.id, etouch, {
        sessions: [{ id, sessionDate: isoOf(futureYmd(days)), arrivalHour: 11 }],
        notifyClient: true,
      });
      await drain(d);
      const body = unfold(ics(toClient().at(-1) as OutgoingEmail, 'REQUEST'));
      expect(body).toContain(`SEQUENCE:${n}`);
      expect(body).toContain(`DTSTART;TZID=Europe/Paris:${isoOf(futureYmd(days)).replaceAll('-', '')}T110000`);
    }
  });
});

describe("retrait d'une machine, client prévenu", () => {
  it('annule la machine retirée et confirme celle qui reste', async () => {
    const date = isoOf(futureYmd(5));
    const b = await createStudioBooking(
      db,
      {
        clientName: 'Marah',
        clientEmail: 'marah@example.com',
        notifyClient: true,
        sessions: [
          { plateauKey: 'vertical', slotType: 'hour', hours: 4, sessionDate: date, arrivalHour: 10 },
          { plateauKey: 'live', slotType: 'hour', hours: 2, sessionDate: date, arrivalHour: 15 },
        ],
      },
      etouch,
    );
    await drain(d);
    const vertical = b.sessions.find((s) => s.plateau_key === 'vertical');
    const live = b.sessions.find((s) => s.plateau_key === 'live');
    await removeSessions(db, b.booking.id, [vertical?.id as string], etouch, { notifyClient: true });
    await drain(d);
    const mail = toClient('marah@example.com').at(-1) as OutgoingEmail;
    expect(unfold(ics(mail, 'CANCEL'))).toContain(`UID:${sessionUid(b.booking.reference, vertical?.id as string)}`);
    expect(unfold(ics(mail, 'REQUEST'))).toContain(`UID:${sessionUid(b.booking.reference, live?.id as string)}`);
    expect(unfold(ics(mail, 'REQUEST'))).not.toContain(vertical?.id as string);
  });
});

describe('reprise', () => {
  it('un e-mail en échec est retenté avec la même clé d’idempotence', async () => {
    await createWebsiteBooking(
      db,
      websiteInput([{ plateauKey: 'live', days: 4, hour: 11, hours: 2 }]),
    );
    mailer.failing = true;
    await drain(d);
    mailer.failing = false;
    await db.query("UPDATE jobs SET run_at = now() WHERE status = 'queued'");
    await drain(d);
    const [client] = toClient();
    const [job] = await db.query<{ id: number; attempts: number }>(
      "SELECT id, attempts FROM jobs WHERE kind = 'email.client'",
    );
    expect(client.idempotencyKey).toBe(`job-${job.id}`);
    expect(job.attempts).toBe(2);
  });
});
