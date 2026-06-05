'use strict';

/**
 * Initialise `gallery_projects.display_order` from creation order (EDO).
 *
 * The new `displayOrder` integer attribute lands with `default 0`, so every
 * row starts at 0. This migration numbers existing projects 0,1,2,… following
 * their current `created_at` order — so the public gallery keeps its exact
 * current ordering until an editor reorders it from the "Ordre galerie" admin
 * page.
 *
 * `display_order` is written per `document_id` so draft and published versions
 * of the same project share the same value (the front reads the published one).
 *
 * Idempotent: skips if the column is missing (schema not synced yet) or if any
 * row already carries a non-zero `display_order` (a reorder has happened).
 */

const TABLE = 'gallery_projects';
const COLUMN = 'display_order';

async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) {
    console.log(`[init-display-order] table ${TABLE} not found; skipping.`);
    return;
  }
  const hasColumn = await knex.schema.hasColumn(TABLE, COLUMN);
  if (!hasColumn) {
    console.log(`[init-display-order] ${TABLE}.${COLUMN} not found yet; skipping.`);
    return;
  }

  const alreadyOrdered = await knex(TABLE).where(COLUMN, '!=', 0).first();
  if (alreadyOrdered) {
    console.log('[init-display-order] non-zero order already present; skipping.');
    return;
  }

  // One rank per document, ordered by the document's earliest created_at so
  // draft/published siblings collapse to a single position.
  const docs = await knex(TABLE)
    .select('document_id')
    .min({ created_at: 'created_at' })
    .whereNotNull('document_id')
    .groupBy('document_id')
    .orderBy('created_at', 'asc');

  let rank = 0;
  for (const { document_id } of docs) {
    await knex(TABLE).where('document_id', document_id).update({ [COLUMN]: rank });
    rank += 1;
  }
  console.log(`[init-display-order] numbered ${rank} project(s).`);
}

async function down() {
  console.log('[init-display-order] down is not supported; restore from backup.');
}

module.exports = { up, down };
