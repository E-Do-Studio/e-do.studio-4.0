'use strict';

/**
 * EDO-135: remove i18n from the gallery-project collection.
 *
 * `pluginOptions.i18n.localized` is being dropped on the content-type (gallery
 * projects do not need translations). In Strapi 5 i18n stores one row per
 * locale per document, sharing `document_id`. Once the localized flag is gone,
 * any leftover non-default-locale rows surface as duplicate documents in the
 * admin and on the public API.
 *
 * Strategy:
 *   - For each `document_id`, keep the `fr` (default-locale) row when it
 *     exists; otherwise promote the surviving row's locale to `fr` so en-only
 *     entries are not lost.
 *   - Delete the redundant non-fr rows.
 *   - Clear the localizations link table (`gallery_projects_localizations_lnk`).
 *     The table itself is dropped by Strapi's schema sync when the relation no
 *     longer exists; we just truncate its rows to avoid dangling references.
 *
 * Idempotent: a second run finds no non-fr rows and exits without changes.
 */

const TABLE = 'gallery_projects';
const LINK_TABLE = 'gallery_projects_localizations_lnk';
const DEFAULT_LOCALE = 'fr';

async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) {
    console.log(`[edo-135] ${TABLE} not found; skipping.`);
    return;
  }
  const hasLocale = await knex.schema.hasColumn(TABLE, 'locale');
  if (!hasLocale) {
    console.log(`[edo-135] ${TABLE}.locale already absent; nothing to do.`);
    return;
  }
  const hasDocId = await knex.schema.hasColumn(TABLE, 'document_id');

  const rows = await knex(TABLE).select(
    'id',
    hasDocId ? 'document_id' : knex.raw('NULL as document_id'),
    'locale',
  );

  const byDoc = new Map();
  const toDelete = [];

  for (const row of rows) {
    const key = row.document_id ?? `id:${row.id}`;
    const prev = byDoc.get(key);
    if (!prev) {
      byDoc.set(key, row);
      continue;
    }
    // Prefer the fr row; if neither is fr, keep the lower id (oldest).
    const keep =
      row.locale === DEFAULT_LOCALE
        ? row
        : prev.locale === DEFAULT_LOCALE
          ? prev
          : row.id < prev.id
            ? row
            : prev;
    const drop = keep === row ? prev : row;
    byDoc.set(key, keep);
    toDelete.push(drop);
  }

  if (toDelete.length > 0) {
    const ids = toDelete.map((r) => r.id);
    await knex(TABLE).whereIn('id', ids).del();
    for (const r of toDelete) {
      console.log(
        `[edo-135] deleted gallery_projects id=${r.id} locale=${r.locale} doc=${r.document_id ?? '∅'}`,
      );
    }
  }

  const promoted = await knex(TABLE)
    .whereNot('locale', DEFAULT_LOCALE)
    .update({ locale: DEFAULT_LOCALE });
  if (promoted > 0) {
    console.log(`[edo-135] promoted ${promoted} non-${DEFAULT_LOCALE} row(s) to '${DEFAULT_LOCALE}'.`);
  }

  const hasLinkTable = await knex.schema.hasTable(LINK_TABLE);
  if (hasLinkTable) {
    const cleared = await knex(LINK_TABLE).del();
    console.log(`[edo-135] cleared ${cleared} row(s) from ${LINK_TABLE}.`);
  }
}

async function down() {
  console.log('[edo-135] down is not supported; restore from backup.');
}

module.exports = { up, down };
