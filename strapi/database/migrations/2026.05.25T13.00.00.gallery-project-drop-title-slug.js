'use strict';

/**
 * EDO-134: the `title` and `slug` attributes were removed from
 * `gallery-project`. They were redundant once `brand` became a relation to
 * `gallery-brand` (the gallery UI reads `brand?.name`, never the title).
 * Strapi's schema sync sometimes leaves the orphan columns behind on
 * Postgres in production, so this migration drops them explicitly.
 *
 * Idempotent: each drop is guarded by `hasColumn`.
 */

const TABLE = 'gallery_projects';
const COLUMNS = ['title', 'slug'];

async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) {
    console.log(`[gallery-project-drop-title-slug] table ${TABLE} not found; skipping.`);
    return;
  }

  for (const column of COLUMNS) {
    const exists = await knex.schema.hasColumn(TABLE, column);
    if (!exists) {
      console.log(`[gallery-project-drop-title-slug] ${TABLE}.${column} already gone.`);
      continue;
    }
    await knex.schema.alterTable(TABLE, (t) => {
      t.dropColumn(column);
    });
    console.log(`[gallery-project-drop-title-slug] dropped ${TABLE}.${column}.`);
  }
}

async function down() {
  console.log('[gallery-project-drop-title-slug] down is not supported; restore from backup.');
}

module.exports = { up, down };
