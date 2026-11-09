// Tout ce que le service envoie à PostHog : les bons événements, et aucune
// donnée personnelle (adresse, nom, téléphone, message).
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Db } from '../src/db.ts';
import { createApp } from '../src/http.ts';
import { configurePosthog, scrubbed } from '../src/posthog.ts';
import { deps, drain, FakeCalendar, FakeMailer, websiteInput } from './fakes.ts';
import { createTestDb } from './pglite.ts';

const KEY = 'etouch-secret-0123456789abcdef';
let db: Db;
let sent: { event: string; distinct_id: string; properties: Record<string, unknown> }[];

beforeEach(async () => {
  db = await createTestDb();
  sent = [];
  configurePosthog({ token: 'phc_test', host: 'https://ph.test' });
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    if (url.startsWith('https://ph.test')) {
      sent.push(JSON.parse(String(init.body)));
      return new Response('{}');
    }
    if (url.includes(':embedContent')) return Response.json({ embedding: { values: [1] } });
    if (url.includes(':generateContent')) {
      return Response.json({ candidates: [{ content: { parts: [{ text: 'Bonjour.' }] } }] });
    }
    throw new Error(`appel inattendu ${url}`);
  });
});

afterEach(async () => {
  configurePosthog({ token: undefined, host: 'https://eu.i.posthog.com' });
  vi.unstubAllGlobals();
  await db.close();
});

const settle = () => new Promise((r) => setTimeout(r, 20));

it("suit tout le parcours, sans jamais envoyer d'adresse ni de nom", async () => {
  const app = createApp({
    db,
    apiKeys: new Map([[KEY, 'etouch']]),
    allowedOrigins: ['https://e-do.studio'],
    geminiKey: 'g',
  });
  const post = (path: string, json: unknown, auth = false) =>
    app.request(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://e-do.studio',
        ...(auth ? { Authorization: `Bearer ${KEY}` } : {}),
      },
      body: JSON.stringify(json),
    });

  const created = (await (
    await post('/v1/public/bookings', websiteInput([{ plateauKey: 'live', days: 5, hour: 10, hours: 2 }]))
  ).json()) as { reference: string };
  const [{ id }] = await db.query<{ id: string }>('SELECT id FROM bookings WHERE reference = $1', [
    created.reference,
  ]);
  await drain(deps(db, new FakeCalendar(), new FakeMailer()));
  await post(`/v1/bookings/${id}/cancel`, { notifyClient: true }, true);
  await drain(deps(db, new FakeCalendar(), new FakeMailer()));
  await post('/v1/public/contact', {
    nom: 'Camille Durand',
    email: 'camille@marque.fr',
    telephone: '06 12 34 56 78',
    societe: 'Marque',
    message: 'Bonjour, un shooting de 40 sacs le mois prochain.',
    elapsedMs: 30_000,
  });
  await drain(deps(db, new FakeCalendar(), new FakeMailer()));
  await post('/v1/public/chat', { messages: [{ role: 'user', content: 'bonjour' }] });
  await settle();

  const events = sent.map((e) => e.event);
  for (const e of [
    'booking_created',
    'calendar_synced',
    'booking_email_sent',
    'booking_cancelled',
    'contact_delivered',
    'contact_email_sent',
    'chat_replied',
  ]) {
    expect(events, e).toContain(e);
  }
  const all = JSON.stringify(sent);
  expect(all).not.toContain('camille@marque.fr');
  expect(all).not.toContain('Durand');
  expect(all).not.toContain('06 12 34 56 78');
  expect(all).not.toContain('40 sacs');
  expect(sent.find((e) => e.event === 'booking_cancelled')?.distinct_id).toBe(`booking:${created.reference}`);
});

it('efface les adresses des messages d’erreur', () => {
  expect(scrubbed('Resend 422 : invalid to "a.b@c.fr"')).toBe('Resend 422 : invalid to "[e-mail]"');
});
