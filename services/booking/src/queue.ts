// File de travail en base. Écrite dans la transaction du changement métier :
// une réservation enregistrée a forcément sa synchro et ses e-mails en file,
// même si le processus meurt juste après. Le worker les exécute, les retente
// avec un délai croissant, et alerte quand ça ne passe pas.
import { type Db, pgCode, type Queryable } from './db.ts';

export type JobKind =
  | 'calendar.sync'
  | 'calendar.reconcile'
  | 'email.client'
  | 'email.studio'
  | 'email.contact'
  | 'hubspot.booking'
  | 'hubspot.contact'
  | 'supabase.watch'
  | 'alerts.flush'
  | 'alerts.digest';

export interface Job {
  id: number;
  kind: JobKind;
  payload: Record<string, unknown>;
  dedupe_key: string | null;
  attempts: number;
  run_at: string;
  last_error: string | null;
  created_at: string;
}

/** Une alerte part dès ce nombre d'échecs ; le travail est abandonné au maximum. */
export const ALERT_AFTER_ATTEMPTS = 3;
export const MAX_ATTEMPTS = 12;

/** 30 s, 1 min, 2 min… plafonné à 1 h : 12 essais couvrent environ 6 h. */
export function backoffSeconds(attempts: number): number {
  return Math.min(30 * 2 ** Math.max(0, attempts - 1), 3600);
}

export async function enqueue(
  q: Queryable,
  kind: JobKind,
  payload: Record<string, unknown>,
  opts: { dedupeKey?: string; delaySeconds?: number } = {},
): Promise<void> {
  const delay = opts.delaySeconds ?? 0;
  if (opts.dedupeKey) {
    // Une demande déjà en attente pour le même objet suffit : on garde la plus
    // proche échéance.
    await q.query(
      `INSERT INTO jobs (kind, payload, dedupe_key, run_at)
       VALUES ($1, $2, $3, now() + make_interval(secs => $4))
       ON CONFLICT (dedupe_key) WHERE status = 'queued' AND dedupe_key IS NOT NULL
       DO UPDATE SET run_at = LEAST(jobs.run_at, EXCLUDED.run_at),
                     payload = EXCLUDED.payload,
                     updated_at = now()`,
      [kind, JSON.stringify(payload), opts.dedupeKey, delay],
    );
    return;
  }
  await q.query(
    `INSERT INTO jobs (kind, payload, run_at)
     VALUES ($1, $2, now() + make_interval(secs => $3))`,
    [kind, JSON.stringify(payload), delay],
  );
}

export async function claimNext(db: Db): Promise<Job | null> {
  const rows = await db.query<Job>(
    `UPDATE jobs SET status = 'running', attempts = attempts + 1, updated_at = now()
     WHERE id = (
       SELECT id FROM jobs
       WHERE status = 'queued' AND run_at <= now()
       ORDER BY run_at, id
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, kind, payload, dedupe_key, attempts, run_at, last_error, created_at`,
  );
  return rows[0] ?? null;
}

export async function markDone(db: Db, job: Job): Promise<void> {
  await db.query(
    `UPDATE jobs SET status = 'done', last_error = NULL, updated_at = now() WHERE id = $1`,
    [job.id],
  );
}

/** Renvoie `dead` quand le travail est abandonné. */
export async function markFailed(
  db: Db,
  job: Job,
  error: string,
): Promise<'retry' | 'dead'> {
  if (job.attempts >= MAX_ATTEMPTS) {
    await db.query(
      `UPDATE jobs SET status = 'dead', last_error = $2, updated_at = now() WHERE id = $1`,
      [job.id, error.slice(0, 2000)],
    );
    return 'dead';
  }
  // Une demande plus récente pour le même objet attend déjà : elle reprend
  // tout l'état (une synchro est idempotente), celle-ci s'efface.
  const superseded = await supersededBy(db, job);
  if (superseded) {
    await db.query(
      `UPDATE jobs SET status = 'done', last_error = $2, updated_at = now() WHERE id = $1`,
      [job.id, `remplacé par #${superseded} — ${error}`.slice(0, 2000)],
    );
    // Les échecs passés comptent pour l'alerte : la demande qui reprend en
    // hérite, sinon des modifications fréquentes la retarderaient sans fin.
    await db.query(
      `UPDATE jobs SET attempts = GREATEST(attempts, $2), last_error = $3 WHERE id = $1`,
      [superseded, job.attempts, error.slice(0, 2000)],
    );
    return 'retry';
  }
  try {
    await db.query(
      `UPDATE jobs SET status = 'queued', last_error = $2,
              run_at = now() + make_interval(secs => $3), updated_at = now()
       WHERE id = $1`,
      [job.id, error.slice(0, 2000), backoffSeconds(job.attempts)],
    );
  } catch (err) {
    // Une demande identique vient d'arriver : elle prend le relais.
    if (pgCode(err) !== '23505') throw err;
    await db.query(
      `UPDATE jobs SET status = 'done', last_error = $2, updated_at = now() WHERE id = $1`,
      [job.id, `remplacé — ${error}`.slice(0, 2000)],
    );
  }
  return 'retry';
}

async function supersededBy(db: Db, job: Job): Promise<number | null> {
  if (!job.dedupe_key) return null;
  const rows = await db.query<{ id: number }>(
    `SELECT id FROM jobs WHERE dedupe_key = $1 AND status = 'queued' AND id <> $2`,
    [job.dedupe_key, job.id],
  );
  return rows[0]?.id ?? null;
}

/** Après un arrêt brutal, ce qui tournait repart. */
export async function requeueStale(db: Db): Promise<number> {
  await db.query(
    `UPDATE jobs r SET status = 'done', last_error = 'remplacé au redémarrage', updated_at = now()
     WHERE r.status = 'running' AND r.dedupe_key IS NOT NULL
       AND EXISTS (SELECT 1 FROM jobs q WHERE q.dedupe_key = r.dedupe_key AND q.status = 'queued')`,
  );
  const rows = await db.query(
    `UPDATE jobs SET status = 'queued', updated_at = now()
     WHERE status = 'running' RETURNING id`,
  );
  return rows.length;
}
