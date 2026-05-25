'use strict';

/**
 * Rename the gallery-project media attribute from `images` to `media`.
 *
 * Context: the schema initially had `images` (allowedTypes: images only) and a
 * separate component-based `media` field for image+video items. We collapsed
 * both into a single `media` media-field with allowedTypes ["images","videos"].
 *
 * Strapi stores media relations in `files_related_morphs` with a `field`
 * column carrying the attribute name. After the schema rename, the column
 * still says `'images'` for legacy rows — Strapi loads them under the old
 * attribute name and `populate=media` returns nothing. This migration updates
 * those rows to `'media'`.
 *
 * Idempotent: nothing to do if no rows reference `field='images'` for the
 * gallery-project content-type, or if the morph table is absent.
 */

const MORPH_TABLE = 'files_related_morphs';
const RELATED_TYPE = 'api::gallery-project.gallery-project';
const OLD_FIELD = 'images';
const NEW_FIELD = 'media';

async function up(knex) {
  const hasTable = await knex.schema.hasTable(MORPH_TABLE);
  if (!hasTable) {
    console.log(`[gallery-media-rename] table ${MORPH_TABLE} not found; skipping.`);
    return;
  }

  const updated = await knex(MORPH_TABLE)
    .where({ related_type: RELATED_TYPE, field: OLD_FIELD })
    .update({ field: NEW_FIELD });

  if (updated > 0) {
    console.log(`[gallery-media-rename] renamed ${updated} morph row(s) from '${OLD_FIELD}' to '${NEW_FIELD}'.`);
  } else {
    console.log(`[gallery-media-rename] no legacy '${OLD_FIELD}' morph rows; nothing to rename.`);
  }
}

async function down() {
  console.log('[gallery-media-rename] down is not supported; restore from backup.');
}

module.exports = { up, down };
