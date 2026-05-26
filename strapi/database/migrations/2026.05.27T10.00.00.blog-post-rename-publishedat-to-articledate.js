'use strict';

/**
 * EDO-256 — Decouple the editorial article date from Strapi's system
 * `publishedAt` field used by draftAndPublish.
 *
 * Why this exists: the blog-post schema defined a user-editable
 * `publishedAt` datetime that shared the same column name as the Strapi 5
 * system field controlling publish state. The two writers fought:
 *   - The publish action overwrote whatever date the editor typed.
 *   - Drafts (publishedAt = NULL) were never returned by the public API,
 *     so blog posts disappeared from the website even when the editor had
 *     filled the field expecting it to act as an editorial date.
 *
 * Fix: introduce a dedicated `article_date` column (schema attribute
 * `articleDate`) and seed it from the legacy `published_at` value so any
 * historical editorial intent is preserved. After this migration:
 *   - `published_at` is owned exclusively by Strapi (publish state).
 *   - `article_date` is owned exclusively by the editor (display date).
 *
 * Idempotent: only copies when article_date IS NULL on a row.
 *
 * Boot ordering note: Strapi 5 runs schema sync before custom migrations,
 * so by the time this code runs the `article_date` column already exists.
 */

const TABLE = 'blog_posts';
const SRC_COLUMN = 'published_at';
const DST_COLUMN = 'article_date';

async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE);
  if (!exists) {
    console.log(`  [skip] ${TABLE} does not exist (fresh install)`);
    return;
  }

  const info = await knex(TABLE).columnInfo();
  if (!info[SRC_COLUMN]) {
    console.log(`  [skip] ${TABLE}.${SRC_COLUMN} does not exist`);
    return;
  }
  if (!info[DST_COLUMN]) {
    console.log(`  [skip] ${TABLE}.${DST_COLUMN} does not exist yet — schema sync must run first`);
    return;
  }

  const copied = await knex(TABLE)
    .whereNull(DST_COLUMN)
    .whereNotNull(SRC_COLUMN)
    .update({ [DST_COLUMN]: knex.ref(SRC_COLUMN) });
  console.log(`  -> Seeded ${TABLE}.${DST_COLUMN} from ${SRC_COLUMN} on ${copied} row(s)`);
}

async function down(knex) {
  const exists = await knex.schema.hasTable(TABLE);
  if (!exists) return;
  const info = await knex(TABLE).columnInfo();
  if (!info[DST_COLUMN]) return;
  await knex(TABLE).update({ [DST_COLUMN]: null });
}

module.exports = { up, down };
