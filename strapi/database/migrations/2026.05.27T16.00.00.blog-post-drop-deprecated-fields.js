'use strict';

/**
 * Drop deprecated blog-post fields. Strapi 5 schema sync handles scalar
 * columns automatically when an attribute is removed from schema.json
 * (`body_blocks`, `cta_text`, `cta_label`, `cta_url`, `cta_text2`/`ctaText`
 * stored as `cta_text`-style snake_case columns, `seo_title`,
 * `seo_description`, `seo_image`). Component attributes are different:
 * Strapi stores them in the polymorphic link table `blog_posts_cmps` and
 * does NOT clean those rows on schema sync. This migration removes the
 * orphan `seo` links so the link/component tables don't keep dangling rows.
 *
 * Same shape as `2026.05.07T15.30.00.gallery-project-drop-seo-links.js`.
 * Idempotent.
 */

const LINK_TABLE = 'blog_posts_cmps';
const COMPONENT_TABLE = 'components_shared_seo_metas';
const FIELD = 'seo';
const COMPONENT_TYPE = 'shared.seo-meta';

async function up(knex) {
  const hasLinkTable = await knex.schema.hasTable(LINK_TABLE);
  if (!hasLinkTable) {
    console.log(`[blog-post-cleanup] ${LINK_TABLE} not found; nothing to do.`);
    return;
  }

  const orphans = await knex(LINK_TABLE)
    .where('field', FIELD)
    .where('component_type', COMPONENT_TYPE)
    .select('cmp_id');

  if (orphans.length === 0) {
    console.log(`[blog-post-cleanup] no orphaned ${FIELD} links on ${LINK_TABLE}.`);
    return;
  }

  const cmpIds = orphans.map((r) => r.cmp_id).filter((id) => id != null);
  console.log(`[blog-post-cleanup] removing ${orphans.length} orphan link(s).`);

  await knex(LINK_TABLE)
    .where('field', FIELD)
    .where('component_type', COMPONENT_TYPE)
    .delete();

  if (cmpIds.length === 0) return;

  const hasComponentTable = await knex.schema.hasTable(COMPONENT_TABLE);
  if (!hasComponentTable) return;

  const stillLinked = await knex(LINK_TABLE)
    .whereIn('cmp_id', cmpIds)
    .where('component_type', COMPONENT_TYPE)
    .pluck('cmp_id');
  const stillLinkedSet = new Set(stillLinked);
  const toDelete = cmpIds.filter((id) => !stillLinkedSet.has(id));
  if (toDelete.length === 0) return;
  await knex(COMPONENT_TABLE).whereIn('id', toDelete).delete();
  console.log(`[blog-post-cleanup] deleted ${toDelete.length} unlinked ${COMPONENT_TABLE} row(s).`);
}

async function down() {
  // Not reversible — the component rows are gone.
}

module.exports = { up, down };
