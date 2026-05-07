#!/usr/bin/env node

/**
 * Manual migration: convert `gallery_projects.year` from integer to string(4).
 *
 * The board reported the admin UI displays year values formatted as "2 025"
 * because Strapi renders integer fields with locale formatting. Storing the
 * year as a 4-character string (regex `^\d{4}$`) avoids that.
 *
 * This script is INTENTIONALLY NOT in `database/migrations/` — running it
 * before swapping the schema.json type would cause Strapi schema sync to
 * destroy the new column on boot. Apply in this order:
 *
 *   1. STOP the Strapi server (so schema sync does not run mid-migration).
 *   2. Take a DB backup.
 *   3. Run `node migrate-year-to-string.mjs` against the prod DB.
 *   4. In a single PR: change `year.type` from `integer` to `string` in
 *      `src/api/gallery-project/content-types/gallery-project/schema.json`
 *      and add `regex: ^\\d{4}$`, `minLength: 4`, `maxLength: 4`.
 *   5. Boot Strapi — schema sync sees a varchar column already in place,
 *      no destructive change.
 *
 * Supports Postgres (prod) and SQLite (dev). Uses DATABASE_URL or
 * DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD env vars (Strapi convention).
 */

import knex from 'knex';

const client = process.env.DATABASE_CLIENT ?? 'sqlite';
const TABLE = 'gallery_projects';
const COLUMN = 'year';

function buildKnex() {
  if (client === 'sqlite') {
    return knex({
      client: 'better-sqlite3',
      connection: {
        filename: process.env.DATABASE_FILENAME ?? '../.tmp/data.db',
      },
      useNullAsDefault: true,
    });
  }
  if (client === 'postgres') {
    return knex({
      client: 'pg',
      connection: process.env.DATABASE_URL ?? {
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT ?? 5432),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        ssl: process.env.DATABASE_SSL === 'true',
      },
    });
  }
  throw new Error(`Unsupported DATABASE_CLIENT: ${client}`);
}

async function columnIsInteger(db) {
  if (client === 'sqlite') {
    const rows = await db.raw(`PRAGMA table_info(${TABLE});`);
    const col = rows.find((r) => r.name === COLUMN);
    if (!col) throw new Error(`Column ${COLUMN} does not exist on ${TABLE}.`);
    return /int/i.test(col.type);
  }
  const { rows } = await db.raw(
    `SELECT data_type FROM information_schema.columns WHERE table_name = ? AND column_name = ?`,
    [TABLE, COLUMN],
  );
  if (!rows.length) throw new Error(`Column ${COLUMN} does not exist on ${TABLE}.`);
  return /^integer|bigint|smallint$/i.test(rows[0].data_type);
}

async function main() {
  const db = buildKnex();

  console.log(`\n=== Migrating ${TABLE}.${COLUMN} (integer → string(4)) ===\n`);

  const isInt = await columnIsInteger(db);
  if (!isInt) {
    console.log(`Column ${TABLE}.${COLUMN} is already non-integer. Nothing to do.`);
    await db.destroy();
    return;
  }

  // Strategy:
  //   1. Add a new VARCHAR column `year_tmp`.
  //   2. Copy the integer value as a 4-char zero-padded string.
  //   3. Drop the old `year` column.
  //   4. Rename `year_tmp` → `year`.

  await db.schema.alterTable(TABLE, (t) => {
    t.string('year_tmp', 4).nullable();
  });
  console.log('  + added year_tmp VARCHAR(4)');

  const rows = await db(TABLE).select('id', COLUMN);
  for (const row of rows) {
    const value = row[COLUMN];
    const padded = value == null ? null : String(value).padStart(4, '0');
    await db(TABLE).where('id', row.id).update({ year_tmp: padded });
  }
  console.log(`  ✓ copied ${rows.length} row(s) to year_tmp`);

  await db.schema.alterTable(TABLE, (t) => {
    t.dropColumn(COLUMN);
  });
  console.log('  - dropped old integer year');

  await db.schema.alterTable(TABLE, (t) => {
    t.renameColumn('year_tmp', COLUMN);
  });
  console.log('  ✓ renamed year_tmp → year');

  await db.destroy();
  console.log('\n=== Done. Now update schema.json (year.type = string) and reboot Strapi. ===\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
