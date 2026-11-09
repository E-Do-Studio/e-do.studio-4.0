import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createGoogleCalendar } from '../src/google.ts';
import { createResendMailer } from '../src/mailer.ts';

type Call = { url: string; method: string; headers: Record<string, string>; body: string };

function fakeFetch(responses: ((c: Call) => Response | undefined)[]) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL, init: RequestInit = {}) => {
    const call: Call = {
      url: String(input),
      method: init.method ?? 'GET',
      headers: (init.headers as Record<string, string>) ?? {},
      body: init.body instanceof URLSearchParams ? init.body.toString() : String(init.body ?? ''),
    };
    calls.push(call);
    for (const r of responses) {
      const res = r(call);
      if (res) return res;
    }
    throw new Error(`appel inattendu ${call.method} ${call.url}`);
  }) as typeof fetch;
  return { calls, impl };
}

const token = (c: Call) =>
  c.url.startsWith('https://oauth2.googleapis.com/token')
    ? Response.json({ access_token: 'at', expires_in: 3600 })
    : undefined;

describe('client Google Calendar', () => {
  it('signe une assertion de compte de service vérifiable', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const sa = JSON.stringify({
      client_email: 'edo@projet.iam.gserviceaccount.com',
      private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    });
    const { calls, impl } = fakeFetch([token, () => Response.json({ items: [] })]);
    const api = createGoogleCalendar('agenda@group', { kind: 'service_account', json: sa }, impl);
    await api.list('2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z');

    const assertion = new URLSearchParams(calls[0].body).get('assertion') as string;
    const [h, p, s] = assertion.split('.');
    expect(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true);
    expect(JSON.parse(Buffer.from(p, 'base64url').toString())).toMatchObject({
      iss: 'edo@projet.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/calendar',
    });
    expect(calls[1].headers.Authorization).toBe('Bearer at');
    expect(calls[1].url).toContain('/calendars/agenda%40group/events?');
  });

  const oauth = { kind: 'oauth' as const, clientId: 'c', clientSecret: 's', refreshToken: 'r' };

  it('upsert : remplace, sinon crée (404), sinon remplace de nouveau (409)', async () => {
    let puts = 0;
    const { calls, impl } = fakeFetch([
      token,
      (c) => {
        if (c.method !== 'PUT') return;
        puts += 1;
        return new Response('', { status: puts === 1 ? 404 : 200 });
      },
      (c) => (c.method === 'POST' ? new Response('dup', { status: 409 }) : undefined),
    ]);
    const api = createGoogleCalendar('cal', oauth, impl);
    await api.upsert({ id: 'abc', summary: 'x' });
    expect(calls.slice(1).map((c) => c.method)).toEqual(['PUT', 'POST', 'PUT']);
  });

  it('remove : 410 et 404 valent « déjà parti », une autre erreur remonte', async () => {
    const statuses = [204, 410, 404, 500];
    const { impl } = fakeFetch([
      token,
      (c) => (c.method === 'DELETE' ? new Response(null, { status: statuses.shift() }) : undefined),
    ]);
    const api = createGoogleCalendar('cal', oauth, impl);
    expect(await api.remove('a')).toBe('deleted');
    expect(await api.remove('b')).toBe('gone');
    expect(await api.remove('c')).toBe('gone');
    await expect(api.remove('d')).rejects.toThrow(/500/);
  });

  it('list suit les pages', async () => {
    const pages = [
      { items: [{ id: '1' }], nextPageToken: 'p2' },
      { items: [{ id: '2' }] },
    ];
    const { calls, impl } = fakeFetch([token, (c) => (c.method === 'GET' ? Response.json(pages.shift()) : undefined)]);
    const api = createGoogleCalendar('cal', oauth, impl);
    expect((await api.list('a', 'b')).map((e) => e.id)).toEqual(['1', '2']);
    expect(calls.at(-1)?.url).toContain('pageToken=p2');
    // Un seul jeton pour toute la session.
    expect(calls.filter((c) => c.url.includes('oauth2')).length).toBe(1);
  });
});

describe('Resend', () => {
  it('envoie la clé d’idempotence et le .ics en base64 avec son type', async () => {
    const { calls, impl } = fakeFetch([() => Response.json({ id: 'em_1' })]);
    const mailer = createResendMailer('re_key', 'E-Do <contact@e-do.studio>', impl);
    await mailer.send({
      to: 'client@x.fr',
      subject: 'S',
      html: '<p>h</p>',
      replyTo: 'contact@e-do.studio',
      idempotencyKey: 'job-7',
      attachments: [{ filename: 'a.ics', content: 'BEGIN:VCALENDAR', contentType: 'text/calendar; method=CANCEL' }],
    });
    expect(calls[0].headers['Idempotency-Key']).toBe('job-7');
    const body = JSON.parse(calls[0].body);
    expect(body.attachments[0]).toEqual({
      filename: 'a.ics',
      content: Buffer.from('BEGIN:VCALENDAR').toString('base64'),
      content_type: 'text/calendar; method=CANCEL',
    });
    expect(body.reply_to).toBe('contact@e-do.studio');
  });

  it('un refus de Resend est une erreur (le travail sera retenté)', async () => {
    const { impl } = fakeFetch([() => new Response('rate limited', { status: 429 })]);
    await expect(createResendMailer('k', 'f', impl).send({ to: 'a', subject: 's', html: 'h' })).rejects.toThrow(/429/);
  });
});
