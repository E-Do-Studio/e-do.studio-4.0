'use strict';

/**
 * Convert `gallery_projects.year` from integer to varchar(4) zero-padded.
 *
 * Why this exists: when `year` is an integer field, the Strapi admin UI
 * formats values like 2025 as "2,025" in the EN locale (thousand separator).
 * Storing the year as a 4-character string fixes the display without losing
 * any sortability we care about.
 *
 * Idempotent: detects current column type and skips when already varchar.
 *
 * Boot ordering note (Strapi 5): schema sync runs before custom migrations.
 * Schema sync's `alterTable` for integer→varchar requires an explicit USING
 * clause that knex does not emit by default, so on Postgres the sync may
 * log a warning and leave the column as integer. This migration is what
 * actually performs the conversion safely. After the first deploy where
 * this migration ran successfully, subsequent boots find the column
 * already in varchar, sync is a no-op, and the schema.json change to
 * `string` (committed alongside this file) becomes the source of truth.
 */

const TABLE = 'gallery_projects';
const COLUMN = 'year';

async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE);
  if (!exists) {
    console.log(`[year-migration] table ${TABLE} does not exist; skipping.`);
    return;
  }

  // Read column metadata. knex column info varies per dialect.
  const info = await knex(TABLE).columnInfo();
  const col = info[COLUMN];
  if (!col) {
    console.log(`[year-migration] column ${COLUMN} does not exist; skipping.`);
    return;
  }

  const type = String(col.type ?? '').toLowerCase();
  const isInt = type.includes('int');
  if (!isInt) {
    console.log(`[year-migration] column ${COLUMN} is already ${type}; skipping.`);
    return;
  }

  const client = knex.client.config.client;
  console.log(`[year-migration] converting ${TABLE}.${COLUMN} from ${type} to varchar(4) on ${client}.`);

  if (client === 'pg' || client === 'postgres') {
    // Postgres requires an explicit USING clause for integer→varchar.
    await knex.raw(
      `ALTER TABLE ${TABLE} ALTER COLUMN ${COLUMN} TYPE varchar(4) USING lpad(${COLUMN}::text, 4, '0')`,
    );
  } else if (client === 'better-sqlite3' || client === 'sqlite3' || client === 'sqlite') {
    // SQLite has no ALTER COLUMN TYPE; copy through a temporary column.
    await knex.schema.alterTable(TABLE, (t) => t.string('year_tmp', 4).nullable());
    const rows = await knex(TABLE).select('id', COLUMN);
    for (const row of rows) {
      const v = row[COLUMN];
      const padded = v == null ? null : String(v).padStart(4, '0');
      await knex(TABLE).where('id', row.id).update({ year_tmp: padded });
    }
    await knex.schema.alterTable(TABLE, (t) => t.dropColumn(COLUMN));
    await knex.schema.alterTable(TABLE, (t) => t.renameColumn('year_tmp', COLUMN));
  } else if (client === 'mysql' || client === 'mysql2') {
    await knex.raw(`ALTER TABLE ${TABLE} MODIFY COLUMN ${COLUMN} VARCHAR(4)`);
  } else {
    throw new Error(`[year-migration] unsupported client: ${client}`);
  }

  console.log(`[year-migration] done.`);
}

async function down() {
  console.log('[year-migration] down is not supported; restore from backup.');
}

module.exports = { up, down };
