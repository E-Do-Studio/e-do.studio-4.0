'use strict';

/**
 * EDO-134 (Thomas precision): some legacy gallery-project rows still carry
 * the brand's name in `title` because no `gallery-brand` was assigned when
 * they were created (back when `brand` was a free string before EDO-36
 * turned it into a relation). This migration backfills those rows BEFORE
 * the next migration (`2026.05.25T13.00.00.gallery-project-drop-title-slug.js`)
 * physically drops the `title` column — otherwise the title would be gone
 * and the data lost.
 *
 * Logic mirrors `strapi/scripts/backfill-gallery-brands-from-titles.mjs`
 * (the manual REST-API version) but runs at boot via Knex so a single
 * deploy is enough. The script stays in the repo as a re-runnable tool
 * for ad-hoc cleanups on data added through the admin between deploys.
 *
 * For every `gallery_projects` row where `brand_id IS NULL` and `title`
 * is non-empty, the migration:
 *   1. Looks up a `gallery_brands` row whose normalised name matches the
 *      project title, in the SAME locale and SAME publication state
 *      (`published_at IS NULL` for drafts). If found, that brand row's id
 *      is reused.
 *   2. Otherwise, creates a new `gallery_brands` row in that same
 *      (locale, publication state) bucket. The new row's `name` is the
 *      uppercased title so it matches what the `gallery-brand`
 *      `beforeCreate` lifecycle hook would emit, and so the
 *      `2026.05.25T13.10.00.gallery-brand-uppercase-names.js` migration
 *      that runs right after has nothing to rewrite for it.
 *   3. `document_id` is shared across all (locale, state) variants of the
 *      same conceptual brand within a single run: the first variant
 *      created mints a fresh 24-char hex id, the rest reuse it. This
 *      keeps Strapi 5's cross-locale + draft/publish "document" identity
 *      intact for the brand.
 *   4. Sets `gallery_projects.brand_id` on the candidate row.
 *
 * Match key: normalised name = NFC + trimmed + collapsed whitespace +
 * lowercased — case-insensitive so "Coca Cola" / "COCA COLA" /
 * "coca cola" all collapse onto the same brand.
 *
 * Idempotent: rows with `brand_id` already set are filtered out by the
 * SQL predicate, and rerunning the migration is a no-op once every
 * candidate has been backfilled. Safe against the next-migration
 * column drop because the predicate short-circuits when `title` is gone.
 */

const crypto = require('crypto');

const PROJECTS = 'gallery_projects';
const BRANDS = 'gallery_brands';

// Strapi 5 documentIds are 24-char alphanumeric. 12 random bytes hex-encoded
// produces a 24-char string from the [0-9a-f] subset, which is a valid
// documentId for every part of Strapi 5 we touch (FK joins, REST,
// content-manager).
function newDocumentId() {
  return crypto.randomBytes(12).toString('hex');
}

function normaliseKey(value) {
  return String(value).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function publicationState(publishedAt) {
  return publishedAt != null ? 'P' : 'D';
}

async function up(knex) {
  const hasProjects = await knex.schema.hasTable(PROJECTS);
  const hasBrands = await knex.schema.hasTable(BRANDS);
  if (!hasProjects || !hasBrands) {
    console.log('[gallery-project-brand-from-title] gallery tables missing; skipping.');
    return;
  }

  const hasTitle = await knex.schema.hasColumn(PROJECTS, 'title');
  if (!hasTitle) {
    console.log('[gallery-project-brand-from-title] title column already dropped; nothing to backfill.');
    return;
  }
  const hasBrandId = await knex.schema.hasColumn(PROJECTS, 'brand_id');
  if (!hasBrandId) {
    console.log('[gallery-project-brand-from-title] brand_id column missing on projects; skipping.');
    return;
  }

  const projectHasLocale = await knex.schema.hasColumn(PROJECTS, 'locale');
  const projectHasPublishedAt = await knex.schema.hasColumn(PROJECTS, 'published_at');
  const brandHasLocale = await knex.schema.hasColumn(BRANDS, 'locale');
  const brandHasPublishedAt = await knex.schema.hasColumn(BRANDS, 'published_at');
  const brandHasName = await knex.schema.hasColumn(BRANDS, 'name');
  if (!brandHasName) {
    console.log('[gallery-project-brand-from-title] gallery_brands.name missing; skipping.');
    return;
  }

  const projectCols = ['id', 'document_id', 'title'];
  if (projectHasLocale) projectCols.push('locale');
  if (projectHasPublishedAt) projectCols.push('published_at');

  const candidates = await knex(PROJECTS)
    .whereNull('brand_id')
    .whereNotNull('title')
    .whereRaw("COALESCE(TRIM(title), '') <> ''")
    .select(...projectCols);

  if (candidates.length === 0) {
    console.log('[gallery-project-brand-from-title] no projects need backfill.');
    return;
  }

  console.log(`[gallery-project-brand-from-title] ${candidates.length} project row(s) without brand but with title — backfilling.`);

  // Pre-index existing brand rows for fast (locale, state, name) lookup,
  // and for documentId reuse when a brand with the same name already
  // exists in some other locale or state.
  const brandCols = ['id', 'document_id', 'name'];
  if (brandHasLocale) brandCols.push('locale');
  if (brandHasPublishedAt) brandCols.push('published_at');
  const allBrands = await knex(BRANDS).select(...brandCols);

  const byComposite = new Map();
  const documentIdByKey = new Map();
  for (const brand of allBrands) {
    if (!brand.name) continue;
    const key = normaliseKey(brand.name);
    const locale = brandHasLocale ? brand.locale ?? '' : '';
    const state = brandHasPublishedAt ? publicationState(brand.published_at) : '';
    byComposite.set(`${locale}|${state}|${key}`, brand);
    if (!documentIdByKey.has(key)) {
      documentIdByKey.set(key, brand.document_id);
    }
  }

  let linked = 0;
  let createdBrandRows = 0;

  for (const project of candidates) {
    const rawTitle = String(project.title).trim();
    if (!rawTitle) continue;
    const key = normaliseKey(rawTitle);
    const locale = projectHasLocale ? project.locale ?? '' : '';
    const projectPublishedAt = projectHasPublishedAt ? project.published_at : null;
    const state = projectHasPublishedAt ? publicationState(projectPublishedAt) : '';
    const compositeKey = `${locale}|${state}|${key}`;

    let brand = byComposite.get(compositeKey);

    if (!brand) {
      const sharedDocumentId = documentIdByKey.get(key) ?? newDocumentId();
      documentIdByKey.set(key, sharedDocumentId);

      const now = new Date();
      const insertRow = {
        document_id: sharedDocumentId,
        name: rawTitle.toUpperCase(),
        created_at: now,
        updated_at: now,
      };
      if (brandHasLocale) insertRow.locale = locale || 'fr';
      if (brandHasPublishedAt) {
        // Match the project row's publication state so the public API,
        // which only follows published-to-published relations, resolves
        // the brand correctly. Reuse the project's `published_at` value
        // for an honest timestamp when the project was already published.
        insertRow.published_at = projectPublishedAt ?? null;
      }

      const inserted = await knex(BRANDS).insert(insertRow).returning('id');
      const newId = typeof inserted[0] === 'object' ? inserted[0].id : inserted[0];
      brand = {
        id: newId,
        document_id: sharedDocumentId,
        name: insertRow.name,
        locale: insertRow.locale,
        published_at: insertRow.published_at,
      };
      byComposite.set(compositeKey, brand);
      createdBrandRows++;
      const stateLabel = brandHasPublishedAt ? (state === 'P' ? 'published' : 'draft') : 'n/a';
      const localeLabel = brandHasLocale ? insertRow.locale : 'n/a';
      console.log(`  + brand "${insertRow.name}" (locale=${localeLabel}, ${stateLabel}) → id=${newId}`);
    }

    await knex(PROJECTS).where('id', project.id).update({ brand_id: brand.id });
    linked++;
  }

  console.log(`[gallery-project-brand-from-title] linked ${linked} project row(s); created ${createdBrandRows} brand row(s).`);
}

async function down() {
  console.log('[gallery-project-brand-from-title] down is not supported; restore from backup.');
}

module.exports = { up, down };
