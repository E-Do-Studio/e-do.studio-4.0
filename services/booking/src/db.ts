// Accès Postgres. Une seule interface, deux implémentations : `pg` en
// production, PGlite (Postgres compilé en WASM) dans les tests — le même SQL
// tourne dans les deux, contrainte d'exclusion comprise.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  /** Exécute `fn` dans une transaction ; tout ou rien. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Erreur Postgres portant son SQLSTATE (23P01, 23505…). */
export function pgCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

// `numeric` et `bigint` reviennent en chaîne par défaut : on les veut en
// nombre (montants, heures, ids de file) — aucune valeur ne dépasse 2^53.
pg.types.setTypeParser(1700, (v) => Number.parseFloat(v));
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));
// `date` en chaîne YYYY-MM-DD : un Date JS la décalerait selon le fuseau.
pg.types.setTypeParser(1082, (v) => v);

// Sans paramètre, le protocole simple : il accepte plusieurs instructions
// (fichiers de migration), le protocole étendu non.
function run(
  target: pg.Pool | pg.PoolClient,
  text: string,
  params: unknown[],
): Promise<pg.QueryResult> {
  return params.length === 0
    ? target.query(text)
    : target.query(text, params as unknown[]);
}

export function createPgDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 10 });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const res = await run(pool, text, params);
      return res.rows as T[];
    },
    async tx<T>(fn: (q: Queryable) => Promise<T>) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const q: Queryable = {
          async query<R>(text: string, params: unknown[] = []) {
            const res = await run(client, text, params);
            return res.rows as R[];
          },
        };
        const out = await fn(q);
        await client.query('COMMIT');
        return out;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

/**
 * Applique les fichiers `migrations/NNN_*.sql` pas encore passés, dans l'ordre,
 * chacun dans sa transaction. Rejouable.
 */
export async function migrate(db: Db, dir: string): Promise<string[]> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  const done = new Set(
    (await db.query<{ name: string }>('SELECT name FROM schema_migrations')).map(
      (r) => r.name,
    ),
  );
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(join(dir, file), 'utf8');
    await db.tx(async (q) => {
      await q.query(sql);
      await q.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    applied.push(file);
  }
  return applied;
}
