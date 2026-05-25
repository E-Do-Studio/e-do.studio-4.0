'use strict';

/**
 * Unify gallery-project media into a single native media field.
 *
 * Background: `gallery-project` used to expose two parallel media surfaces:
 *   - `images`  (media field, images only, the historical source of truth)
 *   - `media`   (shared.media-item component, repeatable, kind+image+video+poster)
 *
 * Both were rejected as too complex for the editorial team. The schema is
 * now a single `media` native media field (images + videos), validated to
 * exactly 3 entries by the lifecycle hook.
 *
 * What this migration does, idempotently:
 *
 *   1. Walks the Strapi 5 polymorphic morph link table
 *      (`files_related_morphs`) and renames `field = 'images'` to
 *      `field = 'media'` for every `api::gallery-project.gallery-project`
 *      entry. The underlying file ids and ordering are preserved.
 *
 *   2. Skips when the destination `field = 'media'` already has links on
 *      the same entry, so re-running cannot duplicate or scramble data.
 *
 *   3. Audits every gallery_project row and logs, on stdout, any entry
 *      whose final media count is not exactly 3. The editorial team must
 *      complete those manually before the lifecycle (which enforces ===3
 *      on writes) starts blocking edits.
 *
 * Boot order note: Strapi 5 runs schema sync BEFORE custom migrations.
 * Schema sync leaves orphan morph rows untouched when a media attribute is
 * removed (cf. seo-drop migration comment), so the `field = 'images'`
 * rows are still readable here even though the `images` attribute is gone
 * from schema.json. We rename them in place — no file rows are deleted.
 */

const MORPH_TABLE = 'files_related_morphs';
const ENTRIES_TABLE = 'gallery_projects';
const RELATED_TYPE = 'api::gallery-project.gallery-project';
const OLD_FIELD = 'images';
const NEW_FIELD = 'media';
const REQUIRED_COUNT = 3;

async function up(knex) {
  const hasMorph = await knex.schema.hasTable(MORPH_TABLE);
  if (!hasMorph) {
    console.log(`[gallery-media-unify] ${MORPH_TABLE} not found; nothing to do.`);
    return;
  }
  const hasEntries = await knex.schema.hasTable(ENTRIES_TABLE);
  if (!hasEntries) {
    console.log(`[gallery-media-unify] ${ENTRIES_TABLE} not found; nothing to do.`);
    return;
  }

  const legacyLinks = await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', OLD_FIELD)
    .select('id', 'related_id');

  if (legacyLinks.length === 0) {
    console.log(`[gallery-media-unify] no legacy '${OLD_FIELD}' links to migrate.`);
  } else {
    // Per-entry guard: refuse to rename when the same entry already has
    // links on the new field, otherwise we would mix two arrays whose
    // ordering is undefined.
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
        `[gallery-media-unify] WARN: ${skipped.length} entry(ies) already have '${NEW_FIELD}' links; their '${OLD_FIELD}' rows are LEFT IN PLACE for manual review:`,
      );
      for (const id of skipped) {
        console.log(`    related_id=${id}`);
      }
    }

    if (safeIds.length > 0) {
      const updated = await knex(MORPH_TABLE)
        .where('related_type', RELATED_TYPE)
        .where('field', OLD_FIELD)
        .whereIn('related_id', safeIds)
        .update({ field: NEW_FIELD });
      console.log(
        `[gallery-media-unify] renamed ${updated} '${OLD_FIELD}' link(s) → '${NEW_FIELD}' across ${safeIds.length} entry(ies).`,
      );
    }
  }

  // Audit pass: list every entry whose final count is not exactly 3.
  const grouped = await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', NEW_FIELD)
    .select('related_id')
    .count({ n: '*' })
    .groupBy('related_id');

  const countByEntry = new Map();
  for (const row of grouped) {
    countByEntry.set(row.related_id, Number(row.n));
  }

  // Pick the columns we know exist; `slug` is part of the gallery_project
  // schema and is useful for the editorial team to locate the row.
  const hasSlug = await knex.schema.hasColumn(ENTRIES_TABLE, 'slug');
  const hasLocale = await knex.schema.hasColumn(ENTRIES_TABLE, 'locale');
  const cols = ['id'];
  if (hasSlug) cols.push('slug');
  if (hasLocale) cols.push('locale');

  const entries = await knex(ENTRIES_TABLE).select(cols);
  const incomplete = entries
    .map((e) => ({ ...e, count: countByEntry.get(e.id) ?? 0 }))
    .filter((e) => e.count !== REQUIRED_COUNT);

  if (incomplete.length === 0) {
    console.log(`[gallery-media-unify] all ${entries.length} project row(s) have exactly ${REQUIRED_COUNT} media ✓`);
    return;
  }

  console.log(
    `[gallery-media-unify] ${incomplete.length} project row(s) do NOT have exactly ${REQUIRED_COUNT} media — complete manually before editors trigger the lifecycle:`,
  );
  for (const e of incomplete) {
    const parts = [`id=${e.id}`, `count=${e.count}`];
    if (e.slug) parts.push(`slug=${e.slug}`);
    if (e.locale) parts.push(`locale=${e.locale}`);
    console.log(`    ${parts.join(' ')}`);
  }
}

async function down() {
  console.log('[gallery-media-unify] down is not supported; restore from backup.');
}

module.exports = { up, down };
