#!/usr/bin/env node

/**
 * Backfill `gallery-brand` entries from `gallery-project.title` and link
 * each project to the matching brand (EDO-36).
 *
 * Why this script exists:
 *   The studio populates the gallery from the Strapi admin one project at a
 *   time. Until now they have been entering the brand name directly into
 *   `gallery-project.title` because no matching `gallery-brand` existed yet
 *   (the placeholder seed was removed in EDO-24, see #122). The public site
 *   already falls back to `project.title` when the brand relation is null
 *   (src/lib/strapi.ts: `p.brand?.name ?? p.title`), so the gallery renders
 *   but the brand collection is empty — breaking the home marquee and any
 *   future brand-aware filtering.
 *
 *   This one-shot migration walks every gallery-project, takes the FR title
 *   (and EN title for localisation), creates a `gallery-brand` if none with
 *   the same normalised name exists, then sets `project.brand` to the new
 *   brand's id. Existing brand links are preserved.
 *
 * Usage:
 *   STRAPI_URL=https://cms.e-do.studio \
 *   STRAPI_TOKEN=<full-access-token> \
 *     node strapi/scripts/backfill-gallery-brands-from-titles.mjs [--dry-run]
 *
 * The script is idempotent:
 *   - projects that already have a brand relation are skipped
 *   - brands are deduplicated by `name` (trimmed, whitespace-collapsed,
 *     case-folded) — re-running after a partial run will reuse the brands
 *     created on the previous run instead of creating duplicates.
 *
 * Locale handling:
 *   - reads FR and EN locales of `gallery-project` (EN is optional, falls
 *     back to FR if no EN entry exists for a given documentId).
 *   - creates the brand in FR with the FR title, then writes the EN locale
 *     with the EN title (or FR title if EN is missing).
 *
 * Draft & publish:
 *   - both content types have draftAndPublish enabled. The script queries
 *     drafts (publicationState=preview) so unpublished projects are also
 *     migrated, and publishes brands + projects after writing so the new
 *     relation is visible on the public site.
 *
 * Token requirements:
 *   `Full access` on gallery-project and gallery-brand (read/write/publish).
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

if (!STRAPI_TOKEN) {
  console.error('STRAPI_TOKEN env var is required (full-access API token).');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${STRAPI_TOKEN}`,
};

async function api(path, opts = {}) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  const res = await fetch(url, { headers, ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || 'GET'} /api/${path} → ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Normalised key used for brand dedup. We do not modify the stored name —
// the user-facing casing/accents stay intact, this is only the lookup key.
function normalizeBrandKey(name) {
  return String(name).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function fetchAll(collection, locale, extra = '') {
  const out = [];
  let page = 1;
  const pageSize = 100;
  // We page to be safe even though pageSize=100 already covers the current
  // gallery size — keeps the script working as the catalogue grows.
  while (true) {
    const path = `${collection}?locale=${locale}&publicationState=preview&pagination[page]=${page}&pagination[pageSize]=${pageSize}${extra}`;
    const res = await api(path);
    const items = res?.data ?? [];
    out.push(...items);
    const pageCount = res?.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page++;
  }
  return out;
}

async function publishDoc(collection, documentId, locale) {
  try {
    await api(`${collection}/${documentId}/actions/publish?locale=${locale}`, { method: 'POST' });
  } catch (err) {
    const msg = err.message ?? String(err);
    if (!/already|nothing to publish/i.test(msg)) {
      console.warn(`    ⚠️  publish failed for ${collection}/${documentId} (${locale}): ${msg}`);
    }
  }
}

async function findOrCreateBrand({ frTitle, enTitle, byKey }) {
  const key = normalizeBrandKey(frTitle);
  const existing = byKey.get(key);
  if (existing) return existing;

  if (DRY_RUN) {
    console.log(`    + would create brand "${frTitle}"${enTitle && enTitle !== frTitle ? ` / "${enTitle}"` : ''}`);
    // Stub so subsequent projects with the same title don't queue another create.
    const stub = { id: -1, documentId: 'dry-run', name: frTitle };
    byKey.set(key, stub);
    return stub;
  }

  const created = await api('gallery-brands', {
    method: 'POST',
    body: JSON.stringify({ data: { name: frTitle, locale: 'fr' } }),
  });
  const brand = {
    id: created.data.id,
    documentId: created.data.documentId,
    name: created.data.name ?? frTitle,
  };
  byKey.set(key, brand);

  // Localise EN. If the EN title is the same as FR (common when the brand
  // name has no translation), still write it so the EN locale exists and
  // the public site doesn't 404 the EN brand entry.
  const enName = (enTitle && enTitle.trim()) || frTitle;
  try {
    await api(`gallery-brands/${brand.documentId}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: { name: enName } }),
    });
  } catch (err) {
    console.warn(`    ⚠️  EN locale write failed for brand "${frTitle}": ${err.message}`);
  }

  await publishDoc('gallery-brands', brand.documentId, 'fr');
  await publishDoc('gallery-brands', brand.documentId, 'en');

  console.log(`    + created brand "${frTitle}"${enName !== frTitle ? ` / "${enName}"` : ''} → ${brand.documentId}`);
  return brand;
}

async function main() {
  console.log(`Backfilling gallery-brands on ${STRAPI_URL}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log('='.repeat(60));

  // 1. Inventory existing brands so dedup works across runs and across
  //    projects that share the same brand name.
  const frBrands = await fetchAll('gallery-brands', 'fr');
  const byKey = new Map();
  for (const b of frBrands) {
    byKey.set(normalizeBrandKey(b.name), {
      id: b.id,
      documentId: b.documentId,
      name: b.name,
    });
  }
  console.log(`Loaded ${byKey.size} existing brand(s).`);

  // 2. Pull FR projects (with brand relation populated so we can skip ones
  //    that already have a brand) and EN projects (for the EN title).
  const frProjects = await fetchAll('gallery-projects', 'fr', '&populate=brand');
  const enProjects = await fetchAll('gallery-projects', 'en');
  const enByDocId = new Map(enProjects.map(p => [p.documentId, p]));
  console.log(`Loaded ${frProjects.length} FR project(s) (${enProjects.length} EN translation(s)).`);

  let linked = 0;
  let createdBrands = 0;
  let alreadyLinked = 0;
  let skippedNoTitle = 0;
  const initialBrandCount = byKey.size;

  for (const project of frProjects) {
    const docId = project.documentId;
    const frTitle = project.title?.trim();
    if (!frTitle) {
      console.log(`  · skip ${docId}: empty title`);
      skippedNoTitle++;
      continue;
    }
    if (project.brand && (project.brand.id || project.brand.documentId)) {
      console.log(`  · skip ${docId} (${frTitle}): already linked to brand ${project.brand.name ?? project.brand.documentId}`);
      alreadyLinked++;
      continue;
    }

    const enTitle = enByDocId.get(docId)?.title?.trim() ?? frTitle;

    console.log(`  → ${docId}: "${frTitle}"`);
    const brand = await findOrCreateBrand({ frTitle, enTitle, byKey });

    if (DRY_RUN) {
      console.log(`    · would link project → brand "${brand.name}"`);
      linked++;
      continue;
    }

    // Link the project to the brand on both locales. Strapi 5 stores the
    // relation on a single side (gallery-project.brand) but updating only
    // the FR locale leaves the EN draft pointing at no brand; setting it
    // on both keeps the locale views consistent. Strapi 5 accepts the
    // related entry's documentId in the relation field.
    await api(`gallery-projects/${docId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: { brand: brand.documentId } }),
    });
    if (enByDocId.has(docId)) {
      try {
        await api(`gallery-projects/${docId}?locale=en`, {
          method: 'PUT',
          body: JSON.stringify({ data: { brand: brand.documentId } }),
        });
      } catch (err) {
        console.warn(`    ⚠️  EN link write failed for project ${docId}: ${err.message}`);
      }
    }
    await publishDoc('gallery-projects', docId, 'fr');
    if (enByDocId.has(docId)) {
      await publishDoc('gallery-projects', docId, 'en');
    }

    console.log(`    ✓ linked project ${docId} → brand ${brand.documentId}`);
    linked++;
  }

  createdBrands = byKey.size - initialBrandCount;

  console.log('\n' + '='.repeat(60));
  console.log(`${DRY_RUN ? 'Would link' : 'Linked'} ${linked} project(s).`);
  console.log(`${DRY_RUN ? 'Would create' : 'Created'} ${createdBrands} new brand(s).`);
  console.log(`Skipped: ${alreadyLinked} already linked, ${skippedNoTitle} without a title.`);
}

main().catch(err => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
