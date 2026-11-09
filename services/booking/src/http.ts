import { createHash } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { raiseAlert } from './alerts.ts';
import {
  type Actor,
  appendHistory,
  availability,
  cancelBooking,
  confirmBooking,
  createStudioBooking,
  createWebsiteBooking,
  DomainError,
  findIdByReference,
  historyFor,
  LIST_ORDERS,
  listBookings,
  loadBundle,
  notifyBooking,
  registryFor,
  removeSessions,
  requestResync,
  rescheduleBooking,
  setBlockedDate,
} from './bookings.ts';
import { registryErrors } from './calendar-sync.ts';
import { type Db, pgCode } from './db.ts';
import { handleChat } from './chat/chat.ts';
import { invalidateKnowledge } from './chat/knowledge.ts';
import { handleContact } from './contact/contact.ts';
import { bookingFeed, studioFeed } from './ical-feed.ts';
import { renderTunnelFailure } from './mailer.ts';
import { captureServer, scrubbed, trackService } from './posthog.ts';
import { hashIp, rateLimit } from './rate-limit.ts';
import { enqueue } from './queue.ts';
import type { CreateBookingInput } from './quote.ts';

export interface AppDeps {
  db: Db;
  apiKeys: Map<string, string>;
  allowedOrigins: string[];
  studioEmail?: string;
  geminiKey?: string;
  zaiKey?: string;
  turnstileSecret?: string;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
}

type Env = { Variables: { caller: string } };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();
const hour = z.number().int().min(0).max(23);
const minute = z.number().int().min(0).max(59);

const ymd = z.object({ y: z.number().int(), m: z.number().int(), d: z.number().int() });

const websiteBookingSchema = z.object({
  mode: z.enum(['quote', 'booking', 'request']),
  contact: z.object({
    nom: z.string().max(100).default(''),
    prenom: z.string().max(100).default(''),
    email: z.string().trim().max(254).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/),
    tel: z.string().max(40).default(''),
    societe: z.string().max(160).default(''),
    siren: z.string().max(40).default(''),
    adresseFacturation: z.string().max(400).default(''),
    marque: z.string().max(160).default(''),
    autresInfos: z.string().max(4000).default(''),
  }),
  projectType: z.string().max(100).nullable().default(null),
  urgency: z.string().max(100).nullable().default(null),
  sessions: z
    .array(
      z.object({
        plateauKey: z.string().min(1).max(60),
        slotType: z.string().max(30).nullable(),
        hours: z.number().min(0).max(240),
        date: ymd.nullable(),
        arrivalHour: hour.nullable(),
        cycloMode: z.string().max(30).nullable(),
        productType: z.string().max(100).nullable(),
        method: z.string().max(100).nullable(),
        submethod: z.string().max(100).nullable(),
        media: z.array(z.string().max(60)).max(20),
        views: z.array(z.string().max(60)).max(20),
        viewsCount: z.number().int().min(0).max(1000),
        quantity: z.number().int().min(0).max(100000),
        postprodEnabled: z.boolean(),
        postprodVideo: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
  quote: z
    .object({ rows: z.array(z.unknown()).default([]), total: z.number().default(0) })
    .default({ rows: [], total: 0 }),
  preferredDate: ymd.nullable().default(null),
  arrivalHour: hour.nullable().default(null),
});

const failureSchema = z.object({
  error: z.string().max(2000),
  mode: z.string().max(60),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().max(254).optional(),
  contactPhone: z.string().max(40).optional(),
  pageUrl: z.string().max(500).optional(),
});

const studioBookingSchema = z.object({
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().max(254),
  clientCompany: z.string().max(200).nullish(),
  clientPhone: z.string().max(40).nullish(),
  projectType: z.string().max(100).nullish(),
  urgency: z.string().max(100).nullish(),
  notes: z.string().max(4000).nullish(),
  totalEstimate: z.number().nullish(),
  preferredDate: isoDate.nullish(),
  arrivalHour: hour.nullish(),
  arrivalMinute: minute.nullish(),
  notifyClient: z.boolean().default(true),
  actor: z.string().max(200).nullish(),
  sessions: z
    .array(
      z.object({
        plateauKey: z.string().min(1).max(60),
        slotType: z.string().max(30),
        hours: z.number().min(0).max(240),
        sessionDate: isoDate.nullish(),
        arrivalHour: hour.nullish(),
        arrivalMinute: minute.nullish(),
        quantity: z.number().int().nullish(),
        productType: z.string().max(100).nullish(),
        method: z.string().max(100).nullish(),
        media: z.array(z.string().max(60)).nullish(),
        viewsCount: z.number().int().nullish(),
        postprodEnabled: z.boolean().nullish(),
        postprodVideo: z.boolean().nullish(),
      }),
    )
    .max(20),
});

const notifySchema = z.object({
  notifyClient: z.boolean().default(true),
  message: z.string().max(4000).nullish(),
  actor: z.string().max(200).nullish(),
});

const rescheduleSchema = notifySchema.extend({
  preferredDate: isoDate.nullish(),
  arrivalHour: hour.nullish(),
  arrivalMinute: minute.nullish(),
  sessions: z
    .array(
      z.object({
        id: uuid,
        sessionDate: isoDate,
        arrivalHour: hour.nullish(),
        arrivalMinute: minute.nullish(),
        slotType: z.string().max(30).nullish(),
        hours: z.number().min(0).max(240).nullish(),
      }),
    )
    .default([]),
});

const removeSessionsSchema = notifySchema.extend({
  sessionIds: z.array(uuid).min(1),
  // Retirer une machine n'écrit pas au client, sauf demande explicite.
  notifyClient: z.boolean().default(false),
});

const historySchema = z.object({
  action: z.string().min(1).max(60),
  sessionId: uuid.optional(),
  plateauKey: z.string().max(60).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  actor: z.string().max(200).nullish(),
});

function clientIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';
}

function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  } catch {
    return false;
  }
}

export function createApp(deps: AppDeps): Hono<Env> {
  const { db } = deps;
  const app = new Hono<Env>();

  // Une ligne par requête (méthode, route, statut, durée, appelant), sans
  // corps ni en-tête : de quoi retrouver n'importe quel appel dans PostHog Logs.
  app.use('*', async (c, next) => {
    const started = Date.now();
    await next();
    if (c.req.path === '/healthz') return;
    deps.log?.(`${c.req.method} ${c.req.routePath} ${c.res.status} ${Date.now() - started}ms`, {
      method: c.req.method,
      route: c.req.routePath,
      status: c.res.status,
      durationMs: Date.now() - started,
      caller: c.get('caller') ?? 'public',
    });
  });

  app.onError((err, c) => {
    if (err instanceof DomainError) {
      return c.json(
        { error: err.code, message: err.message, ...err.details },
        err.status,
      );
    }
    if (err instanceof z.ZodError) {
      return c.json({ error: 'invalid_payload', issues: err.issues }, 400);
    }
    if (err instanceof SyntaxError) {
      return c.json({ error: 'invalid_json' }, 400);
    }
    deps.log?.('erreur API', { path: c.req.path, error: String(err) });
    trackService('booking_api_error', {
      method: c.req.method,
      path: c.req.routePath,
      error: scrubbed(String(err)),
    });
    return c.json({ error: 'internal_error' }, 500);
  });

  app.get('/healthz', async (c) => {
    await db.query('SELECT 1');
    const [beat] = await db.query<{ updated_at: string }>(
      "SELECT updated_at FROM service_state WHERE key = 'worker.heartbeat'",
    );
    return c.json({
      ok: true,
      workerHeartbeatAgeSeconds: beat
        ? Math.round((Date.now() - Date.parse(beat.updated_at)) / 1000)
        : null,
    });
  });

  // ─── Public : le site ────────────────────────────────────────────────────

  const pub = new Hono<Env>();
  pub.use(
    '*',
    cors({
      origin: (origin) =>
        deps.allowedOrigins.includes(origin) || isLocalOrigin(origin) ? origin : null,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }),
  );

  pub.post('/bookings', async (c) => {
    if (!(await rateLimit(db, 'booking', hashIp(clientIp(c)), 10, 600))) {
      return c.json({ error: 'rate_limited' }, 429);
    }
    const raw = await c.req.json();
    const input = websiteBookingSchema.parse(raw);
    const analytics = (raw as { analytics?: { distinct_id?: string; source?: string; funnel?: string | null } })
      .analytics ?? {};
    const track = (event: string, reference: string, props: Record<string, unknown> = {}) =>
      captureServer(event, analytics.distinct_id, `booking:${reference}`, {
        reference,
        submit_mode: input.mode,
        source: analytics.source ?? null,
        funnel: analytics.funnel ?? null,
        session_count: input.sessions.length,
        ...props,
      });
    let result: Awaited<ReturnType<typeof createWebsiteBooking>>;
    try {
      result = await createWebsiteBooking(db, input as CreateBookingInput);
    } catch (err) {
      if (err instanceof DomainError && err.code === 'slot_taken') {
        await track('booking_slot_conflict', 'unknown', { stage: 'insert' });
      } else if (!(err instanceof DomainError)) {
        await track('booking_server_error', 'unknown', { stage: 'insert', message: String(err) });
      }
      throw err;
    }
    if (Math.abs(result.total - result.clientTotal) > 0.01) {
      deps.log?.('total divergent', {
        reference: result.reference,
        client: result.clientTotal,
        server: result.total,
      });
      await track('booking_total_mismatch', result.reference, {
        client_total: result.clientTotal,
        server_total: result.total,
      });
    }
    await track('booking_created', result.reference, {
      total: result.total,
      plateaux: input.sessions.map((s) => s.plateauKey),
    });
    return c.json({ reference: result.reference, total: result.total }, 201);
  });

  pub.get('/availability', async (c) => {
    const q = z
      .object({ plateau: z.string().min(1).max(60), from: isoDate, to: isoDate })
      .parse(c.req.query());
    trackService('availability_checked', { plateau: q.plateau, from: q.from, to: q.to });
    return c.json(await availability(db, q.plateau, q.from, q.to));
  });

  // Un échec du tunnel côté navigateur : rien en base, seul le studio peut
  // rappeler le client. Alerte immédiate.
  pub.post('/booking-failures', async (c) => {
    if (!(await rateLimit(db, 'failure', hashIp(clientIp(c)), 5, 600))) {
      return c.json({ error: 'rate_limited' }, 429);
    }
    const input = failureSchema.parse(await c.req.json());
    trackService('booking_tunnel_failed', { mode: input.mode, error: scrubbed(input.error) });
    await raiseAlert(db, {
      key: `tunnel:${createHash('sha256').update(`${input.error}|${input.contactEmail ?? ''}`).digest('hex').slice(0, 16)}`,
      severity: 'critical',
      subject: "Une réservation n'a pas pu être enregistrée",
      body: renderTunnelFailure(input),
    });
    return c.json({ ok: true });
  });

  pub.post('/contact', async (c) => {
    const origin = c.req.header('origin');
    const originAllowed =
      !!origin && (deps.allowedOrigins.includes(origin) || isLocalOrigin(origin));
    const result = await handleContact(
      { db, turnstileSecret: deps.turnstileSecret },
      await c.req.json(),
      clientIp(c),
      originAllowed,
    );
    return c.json(result.body, result.status as 200);
  });

  pub.post('/chat', async (c) => {
    const result = await handleChat(
      { db, geminiKey: deps.geminiKey, zaiKey: deps.zaiKey },
      await c.req.json(),
      clientIp(c),
    );
    return c.json(result.body, result.status as 200);
  });

  pub.get('/ical/:reference', async (c) => {
    const ics = await bookingFeed(
      db,
      c.req.param('reference'),
      deps.studioEmail ?? 'contact@e-do.studio',
    );
    if (!ics) throw new DomainError(404, 'not_found', 'Réservation introuvable.');
    trackService('ical_feed_served', { scope: 'booking', reference: c.req.param('reference') });
    return c.body(ics, 200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache, must-revalidate',
    });
  });

  app.route('/v1/public', pub);

  // ─── Privé : etouch, admin ─────────────────────────────────────────────

  const priv = new Hono<Env>();
  priv.use('*', async (c, next) => {
    const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
    const caller = token ? deps.apiKeys.get(token) : undefined;
    if (!caller) return c.json({ error: 'unauthorized' }, 401);
    c.set('caller', caller);
    await next();
  });

  const actorOf = (c: Context<Env>, name?: string | null): Actor => ({
    name: name ?? null,
    source: c.get('caller'),
  });

  const lifecycle = async (
    event: string,
    c: Context<Env>,
    id: string,
    extra: Record<string, unknown> = {},
  ) => {
    const [row] = await db.query<{ reference: string; status: string }>(
      'SELECT reference, status FROM bookings WHERE id = $1',
      [id],
    );
    trackService(
      event,
      { booking_id: id, reference: row?.reference, status: row?.status, caller: c.get('caller'), ...extra },
      `booking:${row?.reference ?? id}`,
    );
  };

  const fullBooking = async (id: string) => {
    const bundle = await loadBundle(db, id);
    if (!bundle) throw new DomainError(404, 'not_found', 'Réservation introuvable.');
    return {
      ...bundle,
      calendar: (await registryFor(db, id)).map((e) => ({
        uid: e.uid,
        sessionId: e.session_id,
        googleEventId: e.google_event_id,
        googleState: e.google_state,
        sequence: e.sequence,
        lastError: e.last_error,
      })),
      history: await historyFor(db, id),
    };
  };

  priv.get('/bookings', async (c) => {
    const q = z
      .object({
        updatedSince: z.string().datetime({ offset: true }).optional(),
        status: z
          .string()
          .transform((v) => v.split(','))
          .pipe(z.array(z.enum(['draft', 'pending', 'confirmed', 'cancelled'])))
          .optional(),
        from: isoDate.optional(),
        to: isoDate.optional(),
        order: z.enum(Object.keys(LIST_ORDERS) as [keyof typeof LIST_ORDERS]).optional(),
        limit: z.coerce.number().int().min(1).max(500).default(100),
      })
      .parse(c.req.query());
    return c.json({
      bookings: await listBookings(db, { ...q, statuses: q.status }),
    });
  });

  priv.get('/bookings/by-reference/:reference', async (c) => {
    const id = await findIdByReference(db, c.req.param('reference'));
    if (!id) throw new DomainError(404, 'not_found', 'Réservation introuvable.');
    return c.json(await fullBooking(id));
  });

  priv.get('/bookings/:id', async (c) =>
    c.json(await fullBooking(uuid.parse(c.req.param('id')))),
  );

  priv.post('/bookings', async (c) => {
    const input = studioBookingSchema.parse(await c.req.json());
    const bundle = await createStudioBooking(
      db,
      input,
      actorOf(c, input.actor),
    );
    await lifecycle('booking_created', c, bundle.booking.id, {
      source: c.get('caller'),
      notify_client: input.notifyClient,
      plateaux: input.sessions.map((s) => s.plateauKey),
      session_count: input.sessions.length,
    });
    return c.json(await fullBooking(bundle.booking.id), 201);
  });

  priv.post('/bookings/:id/confirm', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = z
      .object({ actor: z.string().max(200).nullish() })
      .parse(await c.req.json().catch(() => ({})));
    await confirmBooking(db, id, actorOf(c, body.actor));
    await lifecycle('booking_confirmed', c, id);
    return c.json(await fullBooking(id));
  });

  priv.post('/bookings/:id/cancel', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = notifySchema.parse(await c.req.json().catch(() => ({})));
    await cancelBooking(db, id, actorOf(c, body.actor), body);
    await lifecycle('booking_cancelled', c, id, { notify_client: body.notifyClient });
    return c.json(await fullBooking(id));
  });

  priv.post('/bookings/:id/reschedule', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = rescheduleSchema.parse(await c.req.json());
    await rescheduleBooking(db, id, actorOf(c, body.actor), body);
    await lifecycle('booking_rescheduled', c, id, {
      notify_client: body.notifyClient,
      sessions_moved: body.sessions.length,
    });
    return c.json(await fullBooking(id));
  });

  priv.post('/bookings/:id/sessions/remove', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = removeSessionsSchema.parse(await c.req.json());
    await removeSessions(db, id, body.sessionIds, actorOf(c, body.actor), body);
    await lifecycle('booking_sessions_removed', c, id, {
      notify_client: body.notifyClient,
      sessions_removed: body.sessionIds.length,
    });
    return c.json(await fullBooking(id));
  });

  priv.post('/bookings/:id/notify', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = z
      .object({
        template: z.enum(['created', 'rescheduled', 'cancelled', 'updated']),
        message: z.string().max(4000).nullish(),
      })
      .parse(await c.req.json());
    await notifyBooking(db, id, body.template, body.message ?? null);
    await lifecycle('booking_client_notified', c, id, { template: body.template });
    return c.json({ ok: true }, 202);
  });

  priv.post('/bookings/:id/events', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = historySchema.parse(await c.req.json());
    await appendHistory(db, id, actorOf(c, body.actor), body);
    return c.json({ ok: true }, 201);
  });

  priv.post('/bookings/:id/resync', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    await requestResync(db, id);
    await lifecycle('booking_resync_requested', c, id);
    return c.json({ ok: true }, 202);
  });

  priv.put('/blocked-dates/:date', async (c) => {
    const date = isoDate.parse(c.req.param('date'));
    const body = z
      .object({ reason: z.string().max(200).nullish() })
      .parse(await c.req.json().catch(() => ({})));
    await setBlockedDate(db, date, body.reason ?? null, true);
    return c.json({ ok: true });
  });

  priv.delete('/blocked-dates/:date', async (c) => {
    await setBlockedDate(db, isoDate.parse(c.req.param('date')), null, false);
    return c.json({ ok: true });
  });

  priv.get('/ical', async (c) => {
    const plateau = c.req.query('plateau') || undefined;
    const ics = await studioFeed(db, deps.studioEmail ?? 'contact@e-do.studio', plateau);
    trackService('ical_feed_served', { scope: 'studio', plateau: plateau ?? null, caller: c.get('caller') });
    return c.body(ics, 200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="e-do-studio-bookings.ics"',
      'Cache-Control': 'no-cache, must-revalidate',
    });
  });

  // Base de connaissances du chat, écrite par scripts/build-chat-knowledge.mjs.
  priv.get('/admin/chat-knowledge', async (c) =>
    c.json({
      chunks: await db.query(
        'SELECT id, content_hash, embedding FROM chat_knowledge_chunks ORDER BY id',
      ),
    }),
  );

  priv.post('/admin/chat-knowledge', async (c) => {
    const body = z
      .object({
        upsert: z
          .array(
            z.object({
              id: z.string().min(1).max(300),
              kind: z.string().min(1).max(60),
              slug: z.string().max(300).nullable(),
              lang: z.enum(['fr', 'en']),
              title: z.string().max(500),
              url: z.string().max(1000).nullable(),
              body: z.string().max(100_000),
              tags: z.array(z.string().max(200)).max(100).default([]),
              content_hash: z.string().max(200).nullable(),
              embedding: z.array(z.number()).max(4096).nullable(),
            }),
          )
          .max(1000)
          .default([]),
        delete: z.array(z.string().max(300)).max(10_000).default([]),
      })
      .parse(await c.req.json());
    await db.tx(async (q) => {
      for (const ch of body.upsert) {
        await q.query(
          `INSERT INTO chat_knowledge_chunks
             (id, kind, slug, lang, title, url, body, tags, content_hash, embedding, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
           ON CONFLICT (id) DO UPDATE SET kind = EXCLUDED.kind, slug = EXCLUDED.slug,
             lang = EXCLUDED.lang, title = EXCLUDED.title, url = EXCLUDED.url,
             body = EXCLUDED.body, tags = EXCLUDED.tags, content_hash = EXCLUDED.content_hash,
             -- Un fragment inchangé arrive sans embedding (le script ne le
             -- recalcule pas) : on garde le sien.
             embedding = COALESCE(EXCLUDED.embedding, CASE
               WHEN chat_knowledge_chunks.content_hash = EXCLUDED.content_hash
               THEN chat_knowledge_chunks.embedding END),
             updated_at = now()`,
          [ch.id, ch.kind, ch.slug, ch.lang, ch.title, ch.url, ch.body, ch.tags, ch.content_hash, ch.embedding],
        );
      }
      if (body.delete.length > 0) {
        await q.query('DELETE FROM chat_knowledge_chunks WHERE id = ANY($1)', [body.delete]);
      }
    });
    invalidateKnowledge();
    return c.json({ upserted: body.upsert.length, deleted: body.delete.length });
  });

  priv.get('/admin/status', async (c) => {
    const jobs = await db.query(
      `SELECT kind, status, count(*)::int AS n FROM jobs
       WHERE status IN ('queued', 'running', 'dead') GROUP BY kind, status ORDER BY kind`,
    );
    const dead = await db.query(
      `SELECT id, kind, payload, attempts, last_error, updated_at FROM jobs
       WHERE status = 'dead' ORDER BY updated_at DESC LIMIT 50`,
    );
    const alerts = await db.query(
      `SELECT id, key, severity, subject, body, occurrences, first_seen_at, last_seen_at, notified_at
       FROM alerts WHERE resolved_at IS NULL ORDER BY first_seen_at DESC`,
    );
    const state = await db.query(
      `SELECT key, value, updated_at FROM service_state ORDER BY key`,
    );
    return c.json({
      jobs,
      deadJobs: dead,
      openAlerts: alerts,
      state,
      calendarErrors: await registryErrors(db),
    });
  });

  priv.post('/admin/reconcile', async (c) => {
    await enqueue(db, 'calendar.reconcile', {}, { dedupeKey: 'calendar.reconcile' });
    return c.json({ ok: true }, 202);
  });

  priv.post('/admin/jobs/:id/retry', async (c) => {
    const id = z.coerce.number().int().parse(c.req.param('id'));
    const rows = await db
      .query(
        `UPDATE jobs SET status = 'queued', attempts = 0, run_at = now(), updated_at = now()
         WHERE id = $1 AND status = 'dead' RETURNING id`,
        [id],
      )
      .catch((err) => {
        if (pgCode(err) === '23505') {
          throw new DomainError(409, 'already_queued', 'Une demande identique est déjà en file.');
        }
        throw err;
      });
    if (rows.length === 0) {
      throw new DomainError(404, 'not_found', 'Aucun travail abandonné de cet id.');
    }
    return c.json({ ok: true }, 202);
  });

  app.route('/v1', priv);
  return app;
}
