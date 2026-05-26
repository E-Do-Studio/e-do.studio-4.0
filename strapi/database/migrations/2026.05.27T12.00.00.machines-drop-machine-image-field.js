'use strict';

/**
 * EDO-254: drop the deprecated `machineImage` field from `machines`.
 *
 * The `machineImage` attribute was removed from the schema. Strapi 5 schema
 * sync runs BEFORE custom migrations and does NOT clean up morph link rows
 * when a media attribute is removed (see `machine-unify-media` migration for
 * the same caveat). This migration deletes the orphan link rows so the
 * deprecated field stops surfacing on machine entries.
 *
 * Idempotent: a second run finds no `field='machineImage'` rows and exits.
 */

const MORPH_TABLE = 'files_related_morphs';
const RELATED_TYPE = 'api::machine.machine';
const LEGACY_FIELD = 'machineImage';

async function up(knex) {
  const hasMorph = await knex.schema.hasTable(MORPH_TABLE);
  if (!hasMorph) {
    console.log(`[edo-254] ${MORPH_TABLE} not found; nothing to do.`);
    return;
  }
  const rows = await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', LEGACY_FIELD)
    .select('id');
  if (rows.length === 0) {
    console.log(`[edo-254] no '${LEGACY_FIELD}' morph rows to delete.`);
    return;
  }
  await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', LEGACY_FIELD)
    .delete();
  console.log(`[edo-254] deleted ${rows.length} '${LEGACY_FIELD}' morph row(s).`);
}

async function down() {
  console.log('[edo-254] down is not supported; restore from backup.');
}

module.exports = { up, down };
