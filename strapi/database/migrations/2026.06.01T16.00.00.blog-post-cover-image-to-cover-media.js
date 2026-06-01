'use strict';

/**
 * Rename the blog-post media attribute from `coverImage` to `coverMedia`.
 *
 * Context: we widened the allowedTypes from ["images"] to ["images","videos"]
 * so editors can use a video cover; renaming to `coverMedia` removes the
 * misleading «image» wording.
 *
 * Strapi 5 stores media relations in `files_related_morphs` with a `field`
 * column carrying the attribute name. After the schema rename, the column
 * still says `'coverImage'` for legacy rows — `populate=coverMedia` would
 * therefore return nothing. This migration updates those rows.
 *
 * Idempotent: nothing to do if no rows still reference `field='coverImage'`,
 * or if the morph table is absent.
 *
 * Same pattern as `2026.05.25T10.20.00.gallery-project-images-to-media.js`.
 */

const MORPH_TABLE = 'files_related_morphs';
const RELATED_TYPE = 'api::blog-post.blog-post';
const OLD_FIELD = 'coverImage';
const NEW_FIELD = 'coverMedia';

async function up(knex) {
  const hasTable = await knex.schema.hasTable(MORPH_TABLE);
  if (!hasTable) {
    console.log(`[blog-cover-rename] table ${MORPH_TABLE} not found; skipping.`);
    return;
  }

  const updated = await knex(MORPH_TABLE)
    .where({ related_type: RELATED_TYPE, field: OLD_FIELD })
    .update({ field: NEW_FIELD });

  if (updated > 0) {
    console.log(`[blog-cover-rename] renamed ${updated} morph row(s) from '${OLD_FIELD}' to '${NEW_FIELD}'.`);
  } else {
    console.log(`[blog-cover-rename] no legacy '${OLD_FIELD}' morph rows; nothing to rename.`);
  }
}

async function down() {
  console.log('[blog-cover-rename] down is not supported; restore from backup.');
}

module.exports = { up, down };
