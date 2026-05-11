#!/usr/bin/env node

/**
 * Delete the placeholder gallery projects and brands that were seeded by
 * earlier versions of seed-content.mjs (EDO-24). The list below mirrors the
 * fictional entries that used to live in seedGalleryBrands() and
 * seedGalleryProjects() — categories are left intact because they reflect the
 * studio's real taxonomy.
 *
 * Usage:
 *   STRAPI_URL=https://cms.e-do.studio STRAPI_TOKEN=<api-token> \
 *     node strapi/scripts/delete-gallery-seed.mjs [--dry-run]
 *
 * The token must have full-access permissions on gallery-projects and
 * gallery-brands.
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

if (!STRAPI_TOKEN) {
  console.error('STRAPI_TOKEN env var is required.');
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

const PROJECT_SLUGS = [
  'maison-ortho-2026',
  'le-monde-beryl-2026',
  'atelier-soie-2026',
  'koji-2025',
  'rue-saint-honore-2025',
  'ganymede-2025',
  'moa-studio-2026',
  'maison-margin-2025',
  'toby-ombre-2026',
  'noir-etoile-2025',
  'orbite-2025',
  'studio-11-2026',
  'parure-2026',
  'rue-cadet-2025',
  'atelier-bois-2025',
  'maison-ardent-2026',
  'saar-paris-2026',
  'solene-2025',
];

const BRAND_NAMES = [
  'Maison Ortho',
  'Le Monde Béryl',
  'Atelier Soie',
  'Kôji',
  'Rue Saint-Honoré',
  'Ganymède',
  'Moa Studio',
  'Maison Margin',
  'Toby Ombré',
  'Noir Étoilé',
  'Orbite',
  'Studio 11',
  'Parure',
  'Rue Cadet',
  'Atelier Bois',
  'Maison Ardent',
  'Saar Paris',
  'Solène',
];

async function findOne(collection, filterField, filterValue) {
  const path = `${collection}?filters[${filterField}][$eq]=${encodeURIComponent(filterValue)}&locale=fr&publicationState=preview`;
  const res = await api(path);
  return res?.data?.[0] ?? null;
}

async function deleteEntry(collection, documentId) {
  if (DRY_RUN) return;
  await api(`${collection}/${documentId}`, { method: 'DELETE' });
}

async function main() {
  console.log(`Deleting seeded gallery entries on ${STRAPI_URL}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log('='.repeat(60));

  let removed = 0;
  let missing = 0;

  console.log('\n🖼️  Gallery projects');
  for (const slug of PROJECT_SLUGS) {
    const entry = await findOne('gallery-projects', 'slug', slug);
    if (!entry) {
      console.log(`  · not found: ${slug}`);
      missing++;
      continue;
    }
    await deleteEntry('gallery-projects', entry.documentId);
    console.log(`  ✗ deleted gallery-projects/${slug}`);
    removed++;
  }

  console.log('\n🏢 Gallery brands');
  for (const name of BRAND_NAMES) {
    const entry = await findOne('gallery-brands', 'name', name);
    if (!entry) {
      console.log(`  · not found: ${name}`);
      missing++;
      continue;
    }
    await deleteEntry('gallery-brands', entry.documentId);
    console.log(`  ✗ deleted gallery-brands/${name}`);
    removed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`${DRY_RUN ? 'Would delete' : 'Deleted'} ${removed} entries (${missing} already absent).`);
}

main().catch(err => {
  console.error('Delete failed:', err.message);
  process.exit(1);
});
