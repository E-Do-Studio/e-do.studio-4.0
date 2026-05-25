'use strict';

/**
 * EDO-161: published gallery_projects rows have a dangling brand link
 * after the EDO-159 dedup.
 *
 * Why the previous repair (`…T15.00.00.gallery-brand-repair-publish-state.js`)
 * was not enough
 * --------------------------------------------------------------------------
 * That migration only (1) promoted draft brand rows to published, and (2)
 * logged published projects whose `brand_id` was orphan because it was
 * assumed unrecoverable. Diagnostics against the deployed Strapi proved the
 * opposite: every project document has BOTH a draft and a published row,
 * the draft row's brand link is intact and points to a brand whose
 * `document_id` is also present in the published brand set. So we can
 * deterministically re-link every published project to the right published
 * brand by walking through the project's own draft sibling — no human
 * re-assignment needed.
 *
 * Concretely, on the deployed Strapi at boot time:
 *   - `gallery-projects` has 71 documents, 71 draft + 71 published rows.
 *     All 71 DRAFT rows have a valid brand link.
 *     All 71 PUBLISHED rows have `brand: null` on the public API.
 *   - `gallery-brands` has 59 documents, 59 draft + 59 published rows
 *     (full parity), so the draft brand referenced by a draft project
 *     always has a published twin.
 *
 * Algorithm
 * ---------
 * For each (project_document_id) seen in `gallery_projects`:
 *   1. Find the project's draft row (published_at IS NULL).
 *   2. Read its brand link → brand row → brand document_id.
 *   3. Find the published brand row sharing that document_id.
 *   4. Find the project's published row (published_at IS NOT NULL).
 *   5. Upsert the link so the published project points at the published
 *      brand row. The published project's existing link (if it references
 *      a deleted brand id) is replaced.
 *
 * Schema layouts supported
 * ------------------------
 * Strapi 5 stores manyToOne relations in a dedicated link table
 * `{owner}_{field}_lnk` (e.g. `gallery_projects_brand_lnk`) with columns
 * `{owner_singular}_id` and `{target_singular}_id`. Older Strapi installs
 * stored the FK as a column (`brand_id`) directly on the owner table; the
 * earlier EDO-161 migrations referenced that shape. This migration
 * detects which layout is in use and updates both when present, so a
 * single deploy fixes the deployed Strapi regardless of which one is
 * authoritative there.
 *
 * Idempotent: a second run finds every published project already linked
 * to its proper published brand and updates nothing.
 */

const PROJECTS = 'gallery_projects';
const BRANDS = 'gallery_brands';
const PROJECT_BRAND_LNK_CANDIDATES = [
  // Strapi 5 default naming.
  'gallery_projects_brand_lnk',
  // Some Strapi configurations pluralize the field.
  'gallery_projects_brands_lnk',
];

async function pickLinkTable(knex) {
  for (const name of PROJECT_BRAND_LNK_CANDIDATES) {
    if (await knex.schema.hasTable(name)) return name;
  }
  return null;
}

async function pickLinkColumns(knex, table) {
  const cols = await knex(table).columnInfo();
  const names = Object.keys(cols);
  const projectCol = names.find(
    (n) => n === 'gallery_project_id' || n === 'project_id' || n.endsWith('gallery_project_id'),
  );
  const brandCol = names.find(
    (n) => n === 'gallery_brand_id' || n === 'brand_id' || n.endsWith('gallery_brand_id'),
  );
  return { projectCol, brandCol };
}

async function up(knex) {
  if (!(await knex.schema.hasTable(PROJECTS)) || !(await knex.schema.hasTable(BRANDS))) {
    console.log('[edo-161-relink] gallery tables missing; skipping.');
    return;
  }

  const projectHasPublishedAt = await knex.schema.hasColumn(PROJECTS, 'published_at');
  const projectHasDocId = await knex.schema.hasColumn(PROJECTS, 'document_id');
  const brandHasPublishedAt = await knex.schema.hasColumn(BRANDS, 'published_at');
  const brandHasDocId = await knex.schema.hasColumn(BRANDS, 'document_id');

  if (!projectHasPublishedAt || !projectHasDocId || !brandHasDocId) {
    console.log(
      '[edo-161-relink] required columns missing (project.document_id, project.published_at, brand.document_id); skipping.',
    );
    return;
  }

  const lnkTable = await pickLinkTable(knex);
  const projectHasBrandIdColumn = await knex.schema.hasColumn(PROJECTS, 'brand_id');

  if (!lnkTable && !projectHasBrandIdColumn) {
    console.log(
      '[edo-161-relink] neither link table nor brand_id column found; nothing to repair.',
    );
    return;
  }

  // ── Build the maps we need ────────────────────────────────────────────────
  const allBrands = await knex(BRANDS).select(
    'id',
    'document_id',
    brandHasPublishedAt ? 'published_at' : knex.raw('NULL as published_at'),
  );

  // doc_id → published brand row id (the canonical target)
  // doc_id → any brand row id (fallback)
  const publishedBrandByDoc = new Map();
  const anyBrandByDoc = new Map();
  for (const b of allBrands) {
    if (!b.document_id) continue;
    if (!anyBrandByDoc.has(b.document_id)) anyBrandByDoc.set(b.document_id, b.id);
    if (b.published_at != null && !publishedBrandByDoc.has(b.document_id)) {
      publishedBrandByDoc.set(b.document_id, b.id);
    }
  }

  // id → doc_id, for resolving a draft project's brand row back to its doc_id.
  const brandDocById = new Map();
  for (const b of allBrands) brandDocById.set(b.id, b.document_id);

  const allProjects = await knex(PROJECTS).select('id', 'document_id', 'published_at');

  // doc_id → { draft: id, published: id }
  const byDoc = new Map();
  for (const p of allProjects) {
    if (!p.document_id) continue;
    const slot = byDoc.get(p.document_id) ?? {};
    if (p.published_at == null) slot.draft = p.id;
    else slot.published = p.id;
    byDoc.set(p.document_id, slot);
  }

  // ── Resolve draft project → brand id, using whichever schema exists ───────
  const draftBrandByProjectId = new Map();
  let linkProjectCol = null;
  let linkBrandCol = null;
  let linkHasOrdColumn = false;

  if (lnkTable) {
    const cols = await knex(lnkTable).columnInfo();
    const found = await pickLinkColumns(knex, lnkTable);
    linkProjectCol = found.projectCol;
    linkBrandCol = found.brandCol;
    linkHasOrdColumn = 'brand_ord' in cols;
    if (!linkProjectCol || !linkBrandCol) {
      console.log(
        `[edo-161-relink] cannot resolve project/brand columns on ${lnkTable}; aborting.`,
      );
      return;
    }
    const draftProjectIds = [];
    for (const { draft } of byDoc.values()) if (draft != null) draftProjectIds.push(draft);
    if (draftProjectIds.length > 0) {
      const rows = await knex(lnkTable)
        .whereIn(linkProjectCol, draftProjectIds)
        .select(`${linkProjectCol} as project_id`, `${linkBrandCol} as brand_id`);
      for (const r of rows) draftBrandByProjectId.set(r.project_id, r.brand_id);
    }
  } else if (projectHasBrandIdColumn) {
    const draftProjectIds = [];
    for (const { draft } of byDoc.values()) if (draft != null) draftProjectIds.push(draft);
    if (draftProjectIds.length > 0) {
      const rows = await knex(PROJECTS)
        .whereIn('id', draftProjectIds)
        .whereNotNull('brand_id')
        .select('id', 'brand_id');
      for (const r of rows) draftBrandByProjectId.set(r.id, r.brand_id);
    }
  }

  // ── Re-link each published project to the proper published brand ──────────
  let updated = 0;
  let skippedNoDraftBrand = 0;
  let skippedNoPublishedBrand = 0;

  for (const [docId, slot] of byDoc.entries()) {
    if (slot.published == null) continue;
    if (slot.draft == null) continue;

    const draftBrandId = draftBrandByProjectId.get(slot.draft);
    if (draftBrandId == null) {
      skippedNoDraftBrand++;
      continue;
    }
    const brandDocId = brandDocById.get(draftBrandId);
    if (!brandDocId) {
      skippedNoDraftBrand++;
      continue;
    }
    const targetBrandId =
      publishedBrandByDoc.get(brandDocId) ?? anyBrandByDoc.get(brandDocId);
    if (targetBrandId == null) {
      skippedNoPublishedBrand++;
      continue;
    }

    if (lnkTable) {
      const existing = await knex(lnkTable)
        .where(linkProjectCol, slot.published)
        .select(`${linkBrandCol} as brand_id`)
        .first();
      if (existing && existing.brand_id === targetBrandId) continue;
      if (existing) {
        await knex(lnkTable).where(linkProjectCol, slot.published).del();
      }
      const insertRow = { [linkProjectCol]: slot.published, [linkBrandCol]: targetBrandId };
      if (linkHasOrdColumn) insertRow.brand_ord = 1;
      await knex(lnkTable).insert(insertRow);
      updated++;
    } else {
      const current = await knex(PROJECTS).where('id', slot.published).select('brand_id').first();
      if (current && current.brand_id === targetBrandId) continue;
      await knex(PROJECTS).where('id', slot.published).update({ brand_id: targetBrandId });
      updated++;
    }
  }

  console.log(
    `[edo-161-relink] re-linked ${updated} published project row(s) via ${lnkTable ? `link table ${lnkTable}` : 'brand_id column'}.`,
  );
  if (skippedNoDraftBrand > 0) {
    console.log(
      `[edo-161-relink] ${skippedNoDraftBrand} published project(s) skipped — draft sibling has no resolvable brand.`,
    );
  }
  if (skippedNoPublishedBrand > 0) {
    console.log(
      `[edo-161-relink] ${skippedNoPublishedBrand} published project(s) skipped — draft sibling's brand has no published twin yet.`,
    );
  }
}

async function down() {
  console.log('[edo-161-relink] down is not supported; restore from backup.');
}

module.exports = { up, down };
