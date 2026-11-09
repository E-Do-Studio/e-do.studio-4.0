import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import pg from 'pg';
import { loadConfig } from './config.ts';
import { createPgDb, migrate } from './db.ts';
import { createGoogleCalendar } from './google.ts';
import { createApp } from './http.ts';
import { createResendMailer } from './mailer.ts';
import { startWorker } from './worker.ts';

const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra }));

const config = loadConfig();
const db = createPgDb(config.databaseUrl);

const applied = await migrate(
  db,
  process.env.MIGRATIONS_DIR ??
    fileURLToPath(new URL('../migrations', import.meta.url)),
);
if (applied.length > 0) log('migrations appliquées', { applied });

// Un seul worker à la fois, même quand Coolify fait tourner l'ancien et le
// nouveau conteneur pendant un déploiement : il démarre quand il obtient le
// verrou consultatif, tenu par une connexion dédiée, et rend la main avec elle.
const WORKER_LOCK = 4_242_001;
let worker: ReturnType<typeof startWorker> | null = null;
let lockClient: pg.Client | null = null;

async function acquireWorker(): Promise<void> {
  const client = new pg.Client({ connectionString: config.databaseUrl });
  client.on('error', (err) => {
    // Connexion perdue = verrou perdu : on s'arrête, Coolify redémarre.
    log('connexion du verrou worker perdue', { error: String(err) });
    process.exit(1);
  });
  await client.connect();
  const [row] = (
    await client.query<{ ok: boolean }>('SELECT pg_try_advisory_lock($1) AS ok', [WORKER_LOCK])
  ).rows;
  if (!row.ok) {
    await client.end();
    log('worker en attente : un autre conteneur tient la file');
    setTimeout(() => void acquireWorker().catch(onLockError), 15_000);
    return;
  }
  lockClient = client;
  worker = startWorker({
    db,
    calendar: createGoogleCalendar(config.googleCalendarId, config.googleAuth),
    mailer: createResendMailer(config.resendApiKey, config.fromEmail),
    studioEmail: config.studioEmail,
    alertEmail: config.alertEmail,
    hubspotToken: config.hubspotToken,
    log,
  });
  log('worker démarré');
}

function onLockError(err: unknown) {
  log('verrou worker', { error: String(err) });
  setTimeout(() => void acquireWorker().catch(onLockError), 15_000);
}

if (config.workerEnabled) await acquireWorker().catch(onLockError);

const app = createApp({
  db,
  apiKeys: config.apiKeys,
  allowedOrigins: config.allowedOrigins,
  log,
});
const server = serve({ fetch: app.fetch, port: config.port }, (info) =>
  log('service de réservation à l’écoute', {
    port: info.port,
    worker: config.workerEnabled,
  }),
);

const shutdown = async () => {
  log('arrêt');
  server.close();
  await worker?.stop();
  await lockClient?.end();
  await db.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
