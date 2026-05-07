'use strict';

/**
 * The `seo` component attribute was removed from `gallery-project`. Strapi
 * stores component attachments in a polymorphic link table
 * `gallery_projects_cmps` (rows linking each project entry to a row in
 * `components_shared_seo_metas`). When the attribute is dropped from the
 * schema, schema sync leaves those rows orphaned. This migration removes
 * them so the component table doesn't grow unbounded with unreachable rows.
 *
 * Idempotent: targets only the `field = 'seo'` rows for the gallery-project
 * link table; safe to re-run.
 */

const LINK_TABLE = 'gallery_projects_cmps';
const COMPONENT_TABLE = 'components_shared_seo_metas';
const FIELD = 'seo';

async function up(knex) {
  const hasLinkTable = await knex.schema.hasTable(LINK_TABLE);
  if (!hasLinkTable) {
    console.log(`[seo-drop] ${LINK_TABLE} not found; nothing to do.`);
    return;
  }

  const orphans = await knex(LINK_TABLE)
    .where('field', FIELD)
    .where('component_type', 'shared.seo-meta')
    .select('cmp_id');

  if (orphans.length === 0) {
    console.log(`[seo-drop] no orphaned ${FIELD} links on ${LINK_TABLE}.`);
    return;
  }

  const cmpIds = orphans.map((r) => r.cmp_id).filter((id) => id != null);
  console.log(`[seo-drop] removing ${orphans.length} orphan link(s) and component row(s).`);

  await knex(LINK_TABLE)
    .where('field', FIELD)
    .where('component_type', 'shared.seo-meta')
    .delete();

  if (cmpIds.length > 0) {
    const hasComponentTable = await knex.schema.hasTable(COMPONENT_TABLE);
    if (hasComponentTable) {
      // Only delete component rows that no other entry still links to.
      const stillLinked = await knex(LINK_TABLE)
        .whereIn('cmp_id', cmpIds)
        .where('component_type', 'shared.seo-meta')
        .pluck('cmp_id');
      const stillLinkedSet = new Set(stillLinked);
      const toDelete = cmpIds.filter((id) => !stillLinkedSet.has(id));
      if (toDelete.length > 0) {
        await knex(COMPONENT_TABLE).whereIn('id', toDelete).delete();
        console.log(`[seo-drop] deleted ${toDelete.length} component row(s) from ${COMPONENT_TABLE}.`);
      }
    }
  }
}

async function down() {
  console.log('[seo-drop] down is not supported; restore from backup.');
}

module.exports = { up, down };
