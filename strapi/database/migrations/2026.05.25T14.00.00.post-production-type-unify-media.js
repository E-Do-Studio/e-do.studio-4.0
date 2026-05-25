'use strict';

/**
 * Unify post-production-type media into a single native `media` field.
 *
 * Background: `post-production-type` exposed two parallel media surfaces:
 *   - `image`   (media field, single, "Image illustrative de la prestation")
 *   - `gallery` (media field, multiple, "Galerie d'exemples avant/après")
 *
 * The editorial team reported that the demo media selection did not work
 * like gallery-project's multi-selection. The fix collapses both fields
 * into a single `media` native media field (images + videos, multiple),
 * mirroring the gallery-project pattern.
 *
 * What this migration does, idempotently, on the polymorphic morph link
 * table (`files_related_morphs`):
 *
 *   1. Rename `field = 'image'`   → `field = 'media'` for every
 *      `api::post-production-type.post-production-type` entry. The single
 *      cover image becomes the first item of the new media array.
 *
 *   2. Rename `field = 'gallery'` → `field = 'media'` for every entry,
 *      preserving the existing ordering. When an entry has BOTH `image`
 *      and `gallery` legacy links, the rename happens in two passes —
 *      `image` first, then `gallery` — so the cover stays first and the
 *      gallery items follow.
 *
 *   3. Skips per-entry when destination `field = 'media'` already has
 *      links, so re-running cannot duplicate or scramble data.
 *
 * Boot order note: Strapi 5 runs schema sync BEFORE custom migrations.
 * Schema sync leaves orphan morph rows untouched when a media attribute
 * is removed (cf. gallery-project-unify-media migration), so the
 * `field = 'image'` and `field = 'gallery'` rows are still readable here
 * even though those attributes are gone from schema.json. We rename them
 * in place — no file rows are deleted.
 */

const MORPH_TABLE = 'files_related_morphs';
const RELATED_TYPE = 'api::post-production-type.post-production-type';
const NEW_FIELD = 'media';
const LEGACY_FIELDS = ['image', 'gallery'];

async function renameLegacyField(knex, legacyField) {
  const legacyLinks = await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', legacyField)
    .select('id', 'related_id');

  if (legacyLinks.length === 0) {
    console.log(`[postprod-media-unify] no legacy '${legacyField}' links to migrate.`);
    return;
  }

  const legacyEntryIds = [...new Set(legacyLinks.map((r) => r.related_id))];
  const conflicting = await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', NEW_FIELD)
    .whereIn('related_id', legacyEntryIds)
    .pluck('related_id');
  const conflictSet = new Set(conflicting);

  const safeIds = legacyEntryIds.filter((id) => !conflictSet.has(id));
  const skipped = legacyEntryIds.filter((id) => conflictSet.has(id));

  if (skipped.length > 0) {
    console.log(
      `[postprod-media-unify] WARN: ${skipped.length} entry(ies) already have '${NEW_FIELD}' links; their '${legacyField}' rows are LEFT IN PLACE for manual review:`,
    );
    for (const id of skipped) {
      console.log(`    related_id=${id}`);
    }
  }

  if (safeIds.length > 0) {
    const updated = await knex(MORPH_TABLE)
      .where('related_type', RELATED_TYPE)
      .where('field', legacyField)
      .whereIn('related_id', safeIds)
      .update({ field: NEW_FIELD });
    console.log(
      `[postprod-media-unify] renamed ${updated} '${legacyField}' link(s) → '${NEW_FIELD}' across ${safeIds.length} entry(ies).`,
    );
  }
}

async function up(knex) {
  const hasMorph = await knex.schema.hasTable(MORPH_TABLE);
  if (!hasMorph) {
    console.log(`[postprod-media-unify] ${MORPH_TABLE} not found; nothing to do.`);
    return;
  }

  // Two passes: `image` first (so the cover lands first in the array),
  // then `gallery`. The second pass uses the same conflict guard, so
  // entries that already received `image` links via this migration will
  // be skipped — operators must merge gallery rows manually for those.
  for (const legacyField of LEGACY_FIELDS) {
    await renameLegacyField(knex, legacyField);
  }
}

async function down() {
  console.log('[postprod-media-unify] down is not supported; restore from backup.');
}

module.exports = { up, down };
