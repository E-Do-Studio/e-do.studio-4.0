'use strict';

/**
 * The `rank` integer attribute (managed by `@breezertwo/strapi-plugin-drag-drop-content-types`)
 * has been removed from every content-type that carried it (EDO-125). Strapi's
 * schema sync drops the column on most adapters at boot, but on Postgres in
 * production it has historically left the orphan column behind. This migration
 * drops the column explicitly on each table so prod converges.
 *
 * Idempotent: each drop is guarded by `hasColumn`.
 */

const TABLES_WITH_RANK = [
  'team_members',
  'post_production_types',
  'machines',
  'legal_sections',
  'gallery_projects',
  'gallery_categories',
  'gallery_brands',
  'contact_subjects',
];

async function up(knex) {
  for (const table of TABLES_WITH_RANK) {
    const hasTable = await knex.schema.hasTable(table);
    if (!hasTable) {
      console.log(`[drop-rank] table ${table} not found; skipping.`);
      continue;
    }
    const hasRank = await knex.schema.hasColumn(table, 'rank');
    if (!hasRank) {
      console.log(`[drop-rank] ${table}.rank already gone.`);
      continue;
    }
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn('rank');
    });
    console.log(`[drop-rank] dropped ${table}.rank.`);
  }
}

async function down() {
  console.log('[drop-rank] down is not supported; restore from backup.');
}

module.exports = { up, down };
