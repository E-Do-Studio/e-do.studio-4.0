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
  listBookings,
  loadBundle,
  registryFor,
  removeSessions,
  requestResync,
  rescheduleBooking,
  setBlockedDate,
} from './bookings.ts';
import { registryErrors } from './calendar-sync.ts';
import { type Db, pgCode } from './db.ts';
import { renderTunnelFailure } from './mailer.ts';
import { enqueue } from './queue.ts';
import type { CreateBookingInput } from './quote.ts';

export interface AppDeps {
  db: Db;
  apiKeys: Map<string, string>;
  allowedOrigins: string[];
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

/** `true` si l'appel passe ; fenêtre fixe par IP hachée. */
async function rateLimit(
  db: Db,
  bucket: string,
  ip: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const ipHash = createHash('sha256').update(ip).digest('base64');
  const [row] = await db.query<{ count: number }>(
    `INSERT INTO rate_limits (bucket, ip_hash, window_start, count)
     VALUES ($1, $2, to_timestamp(floor(extract(epoch FROM now()) / $3) * $3), 1)
     ON CONFLICT (bucket, ip_hash, window_start) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [bucket, ipHash, windowSeconds],
  );
  return row.count <= limit;
}

export function createApp(deps: AppDeps): Hono<Env> {
  const { db } = deps;
  const app = new Hono<Env>();

  app.onError((err, c) => {
    if (err instanceof DomainError) {
      return c.json({ error: err.code, message: err.message }, err.status);
    }
    if (err instanceof z.ZodError) {
      return c.json({ error: 'invalid_payload', issues: err.issues }, 400);
    }
    if (err instanceof SyntaxError) {
      return c.json({ error: 'invalid_json' }, 400);
    }
    deps.log?.('erreur API', { path: c.req.path, error: String(err) });
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
      origin: (origin) => {
        if (deps.allowedOrigins.includes(origin)) return origin;
        try {
          const host = new URL(origin).hostname;
          if (host === 'localhost' || host === '127.0.0.1') return origin;
        } catch {}
        return null;
      },
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }),
  );

  pub.post('/bookings', async (c) => {
    if (!(await rateLimit(db, 'booking', clientIp(c), 10, 600))) {
      return c.json({ error: 'rate_limited' }, 429);
    }
    const input = websiteBookingSchema.parse(await c.req.json());
    const result = await createWebsiteBooking(db, input as CreateBookingInput);
    if (Math.abs(result.total - result.clientTotal) > 0.01) {
      deps.log?.('total divergent', {
        reference: result.reference,
        client: result.clientTotal,
        server: result.total,
      });
    }
    return c.json({ reference: result.reference, total: result.total }, 201);
  });

  pub.get('/availability', async (c) => {
    const q = z
      .object({ plateau: z.string().min(1).max(60), from: isoDate, to: isoDate })
      .parse(c.req.query());
    return c.json(await availability(db, q.plateau, q.from, q.to));
  });

  // Un échec du tunnel côté navigateur : rien en base, seul le studio peut
  // rappeler le client. Alerte immédiate.
  pub.post('/booking-failures', async (c) => {
    if (!(await rateLimit(db, 'failure', clientIp(c), 5, 600))) {
      return c.json({ error: 'rate_limited' }, 429);
    }
    const input = failureSchema.parse(await c.req.json());
    await raiseAlert(db, {
      key: `tunnel:${createHash('sha256').update(`${input.error}|${input.contactEmail ?? ''}`).digest('hex').slice(0, 16)}`,
      severity: 'critical',
      subject: "Une réservation n'a pas pu être enregistrée",
      body: renderTunnelFailure(input),
    });
    return c.json({ ok: true });
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
        limit: z.coerce.number().int().min(1).max(500).default(100),
      })
      .parse(c.req.query());
    return c.json({ bookings: await listBookings(db, q) });
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
    return c.json(await fullBooking(bundle.booking.id), 201);
  });

  priv.post('/bookings/:id/confirm', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = z
      .object({ actor: z.string().max(200).nullish() })
      .parse(await c.req.json().catch(() => ({})));
    await confirmBooking(db, id, actorOf(c, body.actor));
    return c.json(await fullBooking(id));
  });

  priv.post('/bookings/:id/cancel', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = notifySchema.parse(await c.req.json().catch(() => ({})));
    await cancelBooking(db, id, actorOf(c, body.actor), body);
    return c.json(await fullBooking(id));
  });

  priv.post('/bookings/:id/reschedule', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = rescheduleSchema.parse(await c.req.json());
    await rescheduleBooking(db, id, actorOf(c, body.actor), body);
    return c.json(await fullBooking(id));
  });

  priv.post('/bookings/:id/sessions/remove', async (c) => {
    const id = uuid.parse(c.req.param('id'));
    const body = removeSessionsSchema.parse(await c.req.json());
    await removeSessions(db, id, body.sessionIds, actorOf(c, body.actor), body);
    return c.json(await fullBooking(id));
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
