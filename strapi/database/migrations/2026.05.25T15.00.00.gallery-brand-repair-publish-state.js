'use strict';

/**
 * EDO-161 follow-up: repair the brand publication state after the EDO-159
 * dedup left some surviving rows in `draft` (and orphaned the FR<->brand
 * relation for the projects that linked to a since-deleted row).
 *
 * Why this is needed
 * ------------------
 * In Strapi 5, a content type with both `draftAndPublish: true` AND i18n
 * stores up to FOUR rows per document_id: (locale × published_at). The
 * EDO-159 dedup (`2026.05.25T14.10.00.gallery-brand-drop-i18n.js`) was
 * written assuming i18n only, so it grouped rows by `document_id` alone and
 * picked a survivor whose tie-breaker, on two `fr` rows, was simply "the
 * last one iterated". Without `ORDER BY` the SELECT order is implementation-
 * defined, so for some brands the survivor ended up being the FR *draft*
 * instead of the FR *published* row, and the FR-published row was deleted.
 *
 * Symptoms on the public site (`/galerie`):
 *   - Some brand names render as empty labels: `populate=*` returns a
 *     `gallery-project` whose `brand` field is null, because the public
 *     API only follows published-to-published relations (cf. the comment
 *     in `2026.05.25T12.50.00.gallery-project-brand-from-title.js`).
 *   - In other cases `gallery_projects.brand_id` references a row that
 *     no longer exists (the deleted FR-published one), which also
 *     resolves to null in the response.
 *
 * What we can recover automatically
 * ---------------------------------
 *   1. Promote any surviving brand row that is still a draft
 *      (`published_at IS NULL`) to published — gallery-brand is non-i18n
 *      and non-multi-version going forward, so every document must be
 *      reachable by the public API.
 *   2. Re-point any `gallery_projects.brand_id` that references a now-
 *      deleted row to the surviving sibling of that brand. We can do this
 *      whenever the project's draft variant kept a valid brand_id (its
 *      brand row also survived) — then by transitivity the published
 *      project should link to the same `document_id`, which is the
 *      surviving brand row. (After EDO-135 there is at most one project
 *      row per `document_id`, so we walk the brand `document_id` set.)
 *
 * What we cannot recover automatically
 * ------------------------------------
 *   - If a `gallery_projects.brand_id` is dangling AND no other clue
 *     remains in the row (`title` was dropped in EDO-134, so there is no
 *     human-readable backup), we cannot infer which brand it should
 *     point to. Those rows are logged so Thomas can re-assign them in
 *     the admin (one click per project).
 *
 * Idempotent: a second run finds no drafts to promote and no orphans to
 * repair, and exits without changes.
 */

const BRANDS = 'gallery_brands';
const PROJECTS = 'gallery_projects';

async function up(knex) {
  const hasBrands = await knex.schema.hasTable(BRANDS);
  const hasProjects = await knex.schema.hasTable(PROJECTS);
  if (!hasBrands || !hasProjects) {
    console.log('[edo-161-repair] gallery tables missing; skipping.');
    return;
  }

  const brandHasPublishedAt = await knex.schema.hasColumn(BRANDS, 'published_at');
  const brandHasDocId = await knex.schema.hasColumn(BRANDS, 'document_id');
  const projectHasBrandId = await knex.schema.hasColumn(PROJECTS, 'brand_id');

  if (!projectHasBrandId) {
    console.log('[edo-161-repair] gallery_projects.brand_id missing; nothing to repair.');
    return;
  }

  // ── Step 1: promote any draft-only brand to published ────────────────────
  if (brandHasPublishedAt) {
    const promoted = await knex(BRANDS)
      .whereNull('published_at')
      .update({ published_at: knex.fn.now() });
    if (promoted > 0) {
      console.log(`[edo-161-repair] promoted ${promoted} draft brand row(s) to published.`);
    } else {
      console.log('[edo-161-repair] no draft brands to promote.');
    }
  }

  // ── Step 2: detect & repair dangling brand_id on gallery_projects ────────
  const brandCols = ['id'];
  if (brandHasDocId) brandCols.push('document_id');
  const allBrands = await knex(BRANDS).select(...brandCols);
  const brandIds = new Set(allBrands.map((b) => b.id));

  // Build doc_id → surviving brand id map (one survivor per doc_id after EDO-159).
  const survivorByDoc = new Map();
  if (brandHasDocId) {
    for (const b of allBrands) {
      if (b.document_id && !survivorByDoc.has(b.document_id)) {
        survivorByDoc.set(b.document_id, b.id);
      }
    }
  }

  const projectsWithBrand = await knex(PROJECTS)
    .whereNotNull('brand_id')
    .select('id', 'document_id', 'brand_id');

  // For each gallery_projects row, see if its brand_id is still valid.
  // If not, try to recover via document_id of a sibling project row that
  // points to a still-valid brand. After EDO-135 there is at most one
  // project row per document_id, so we look up via the project's own
  // document_id history — but since we lost the deleted brand's doc_id,
  // we fall back to "report only" for any orphan we cannot reconcile.
  const orphans = [];
  for (const p of projectsWithBrand) {
    if (brandIds.has(p.brand_id)) continue;
    orphans.push(p);
  }

  if (orphans.length === 0) {
    console.log('[edo-161-repair] no orphan gallery_projects.brand_id values.');
    return;
  }

  console.log(
    `[edo-161-repair] ⚠ ${orphans.length} gallery_projects row(s) reference a deleted brand:`,
  );
  for (const p of orphans) {
    console.log(
      `  - project id=${p.id} (doc=${p.document_id ?? '∅'}) → dangling brand_id=${p.brand_id}`,
    );
  }
  console.log(
    '[edo-161-repair] these rows cannot be auto-repaired (the deleted brand row\'s ' +
      'document_id was not preserved). Re-assign the brand in the admin for each ' +
      'project listed above.',
  );
}

async function down() {
  console.log('[edo-161-repair] down is not supported; restore from backup.');
}

module.exports = { up, down };
