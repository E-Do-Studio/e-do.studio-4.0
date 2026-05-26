'use strict';

/**
 * Rename the `amenities` attribute on the Cyclorama single-type to `usages`
 * so the Strapi admin label matches the « Usages » section rendered on the
 * front (the editor was looking for an « Usage » field and couldn't find
 * one because the schema named it « amenities »).
 *
 * Strapi v5 stores component slots in `<table>_cmps` with columns
 *   (entity_id, cmp_id, component_type, field, order, ...)
 * — the `field` column holds the attribute key. To preserve existing
 * content rows, we update `field` from 'amenities' to 'usages' so the
 * already-seeded localized-item components remain linked after the
 * schema rename.
 *
 * Idempotent: no-op if the link table is missing or no rows still use
 * the old `amenities` field name.
 */

const LINK_TABLE = 'cycloramas_cmps';
const OLD_FIELD = 'amenities';
const NEW_FIELD = 'usages';

async function up(knex) {
  const exists = await knex.schema.hasTable(LINK_TABLE);
  if (!exists) {
    console.log(`  [skip] ${LINK_TABLE} does not exist (fresh install)`);
    return;
  }

  const stale = await knex(LINK_TABLE).where('field', OLD_FIELD).count({ n: '*' }).first();
  const count = Number(stale?.n ?? 0);
  if (count === 0) {
    console.log(`  [skip] No rows with field='${OLD_FIELD}' in ${LINK_TABLE}`);
    return;
  }

  const updated = await knex(LINK_TABLE)
    .where('field', OLD_FIELD)
    .update({ field: NEW_FIELD });
  console.log(`  -> Renamed field '${OLD_FIELD}' → '${NEW_FIELD}' on ${updated} row(s) in ${LINK_TABLE}`);
}

async function down(knex) {
  const exists = await knex.schema.hasTable(LINK_TABLE);
  if (!exists) return;
  await knex(LINK_TABLE).where('field', NEW_FIELD).update({ field: OLD_FIELD });
}

module.exports = { up, down };
