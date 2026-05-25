'use strict';

/**
 * EDO-134: the `title` and `slug` attributes were removed from
 * `gallery-project`. They were redundant once `brand` became a relation to
 * `gallery-brand` (the gallery UI reads `brand?.name`, never the title).
 * Strapi's schema sync sometimes leaves the orphan columns behind on
 * Postgres in production, so this migration drops them explicitly.
 *
 * Idempotent: each drop is guarded by `hasColumn`.
 *
 * Safety guard: the previous migration
 * (`2026.05.25T12.50.00.gallery-project-brand-from-title.js`) backfills
 * brands from title for any project that still has none. If — for any
 * reason — that backfill could not link a project (e.g. it ran but the
 * insert was rolled back), this migration ABORTS before dropping the
 * column so the title data is not lost. The operator can re-run the
 * backfill manually via the REST script and redeploy.
 */

const TABLE = 'gallery_projects';
const COLUMNS = ['title', 'slug'];

async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) {
    console.log(`[gallery-project-drop-title-slug] table ${TABLE} not found; skipping.`);
    return;
  }

  const hasTitle = await knex.schema.hasColumn(TABLE, 'title');
  const hasBrandId = await knex.schema.hasColumn(TABLE, 'brand_id');
  if (hasTitle && hasBrandId) {
    const orphans = await knex(TABLE)
      .whereNull('brand_id')
      .whereNotNull('title')
      .whereRaw("COALESCE(TRIM(title), '') <> ''")
      .count({ n: 'id' })
      .first();
    const orphanCount = Number(orphans?.n ?? 0);
    if (orphanCount > 0) {
      throw new Error(
        `[gallery-project-drop-title-slug] refusing to drop title: ${orphanCount} project row(s) still have a title but no brand. ` +
          `Run strapi/scripts/backfill-gallery-brands-from-titles.mjs (or fix the rows manually) before retrying the deploy.`,
      );
    }
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
