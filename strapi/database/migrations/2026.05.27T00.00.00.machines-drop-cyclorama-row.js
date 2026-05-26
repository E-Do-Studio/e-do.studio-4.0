'use strict';

/**
 * EDO-241: remove the legacy `cyclorama` row from the `machines` collection.
 *
 * Context: the canonical cyclorama content lives in the `cyclorama`
 * single-type (`api::cyclorama.cyclorama`). The old seed also wrote a
 * `cyclorama` row into the `machines` collection, which was never read by
 * the front (it was filtered out in `src/lib/strapi.ts`) but showed up in
 * the admin as a duplicate entry the editor could edit without effect.
 * The defensive filter on the front is now gone, the seed no longer
 * creates the row, and this migration cleans up production by deleting
 * any existing `slug='cyclorama'` row(s) — including every locale
 * variant — and their attached component / media links.
 *
 * Tables involved (Strapi 5):
 *   - `machines`               : entity rows (one per locale, shared
 *                                `document_id`).
 *   - `machines_cmps`          : composant attachments (specs, pricingRows,
 *                                seo, etc.).
 *   - `files_related_morphs`   : direct media field links
 *                                (`related_type = 'api::machine.machine'`).
 *
 * Composant rows in `components_shared_*` tables and file rows in
 * `files` are NOT deleted — they may be shared across entries or
 * reused elsewhere. We only delete the link rows that tie them to the
 * cyclorama machine entry.
 *
 * Idempotent: a second run finds no `slug='cyclorama'` row and exits.
 */

const TABLE = 'machines';
const CMPS_TABLE = 'machines_cmps';
const MORPH_TABLE = 'files_related_morphs';
const RELATED_TYPE = 'api::machine.machine';
const SLUG = 'cyclorama';

async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) {
    console.log(`[edo-241] ${TABLE} not found; nothing to do.`);
    return;
  }
  const hasSlug = await knex.schema.hasColumn(TABLE, 'slug');
  if (!hasSlug) {
    console.log(`[edo-241] ${TABLE}.slug not found; nothing to do.`);
    return;
  }

  const hasLocale = await knex.schema.hasColumn(TABLE, 'locale');
  const hasDocId = await knex.schema.hasColumn(TABLE, 'document_id');

  const selectCols = ['id'];
  if (hasLocale) selectCols.push('locale');
  if (hasDocId) selectCols.push('document_id');

  const rows = await knex(TABLE).where('slug', SLUG).select(selectCols);
  if (rows.length === 0) {
    console.log(`[edo-241] no ${TABLE} row with slug='${SLUG}'; nothing to do.`);
    return;
  }

  const ids = rows.map((r) => r.id);
  for (const r of rows) {
    const localeLabel = hasLocale ? r.locale : '∅';
    const docLabel = hasDocId ? (r.document_id ?? '∅') : '∅';
    console.log(
      `[edo-241] will delete ${TABLE} id=${r.id} locale=${localeLabel} doc=${docLabel}`,
    );
  }

  // Component link rows (specs, pricingRows, seo, etc.).
  const hasCmps = await knex.schema.hasTable(CMPS_TABLE);
  if (hasCmps) {
    const cmps = await knex(CMPS_TABLE)
      .whereIn('entity_id', ids)
      .select('id', 'component_type', 'field');
    if (cmps.length > 0) {
      const breakdown = cmps.reduce((acc, c) => {
        const key = `${c.component_type}/${c.field}`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      console.log(
        `[edo-241] removing ${cmps.length} composant link(s) from ${CMPS_TABLE}: ${JSON.stringify(breakdown)}`,
      );
      await knex(CMPS_TABLE).whereIn('entity_id', ids).delete();
    } else {
      console.log(`[edo-241] no composant links to remove from ${CMPS_TABLE}.`);
    }
  }

  // Media morph rows (machineImage, media, and any legacy fields).
  const hasMorph = await knex.schema.hasTable(MORPH_TABLE);
  if (hasMorph) {
    const morphs = await knex(MORPH_TABLE)
      .where('related_type', RELATED_TYPE)
      .whereIn('related_id', ids)
      .select('id', 'field', 'file_id');
    if (morphs.length > 0) {
      const breakdown = morphs.reduce((acc, m) => {
        acc[m.field] = (acc[m.field] ?? 0) + 1;
        return acc;
      }, {});
      console.log(
        `[edo-241] removing ${morphs.length} morph link(s) from ${MORPH_TABLE}: ${JSON.stringify(breakdown)}`,
      );
      await knex(MORPH_TABLE)
        .where('related_type', RELATED_TYPE)
        .whereIn('related_id', ids)
        .delete();
    } else {
      console.log(`[edo-241] no morph links to remove from ${MORPH_TABLE}.`);
    }
  }

  // Localizations link table (best-effort — name varies across versions).
  const linkCandidates = [
    'machines_localizations_lnk',
    'machines_localizations_links',
  ];
  for (const linkTable of linkCandidates) {
    if (!(await knex.schema.hasTable(linkTable))) continue;
    const cols = ['machine_id', 'inv_machine_id'];
    const filter = function () {
      this.whereIn(cols[0], ids).orWhereIn(cols[1], ids);
    };
    const deleted = await knex(linkTable).where(filter).delete();
    if (deleted > 0) {
      console.log(`[edo-241] cleared ${deleted} row(s) from ${linkTable}.`);
    }
  }

  const deleted = await knex(TABLE).whereIn('id', ids).delete();
  console.log(`[edo-241] deleted ${deleted} ${TABLE} row(s) with slug='${SLUG}'.`);
}

async function down() {
  console.log('[edo-241] down is not supported; restore from backup.');
}

module.exports = { up, down };
