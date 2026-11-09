// Base de test : PGlite (Postgres en WASM) derrière l'interface Db du service.
// Une base modèle migrée une fois par fichier, clonée pour chaque test.
import { fileURLToPath } from 'node:url';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { type Db, migrate, type Queryable } from '../src/db.ts';

const parsers = {
  1700: (v: string) => Number.parseFloat(v),
  20: (v: string) => Number.parseInt(v, 10),
  1082: (v: string) => v,
};

type Target = Pick<PGliteInterface, 'query' | 'exec'>;

function wrap(target: Target): Queryable {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      if (params.length === 0 && text.includes(';')) {
        const results = await target.exec(text, { parsers });
        return (results.at(-1)?.rows ?? []) as T[];
      }
      const res = await target.query(text, params as unknown[], { parsers });
      return res.rows as T[];
    },
  };
}

function asDb(pg: PGliteInterface): Db {
  return {
    query: wrap(pg).query,
    tx: (fn) => pg.transaction((t) => fn(wrap(t))),
    close: () => pg.close(),
  };
}

let template: Promise<PGliteInterface> | null = null;

export async function createTestDb(): Promise<Db> {
  template ??= (async () => {
    const pg = await PGlite.create({ extensions: { btree_gist }, parsers });
    await migrate(asDb(pg), fileURLToPath(new URL('../migrations', import.meta.url)));
    return pg;
  })();
  return asDb(await (await template).clone());
}
