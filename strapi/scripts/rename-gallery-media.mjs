#!/usr/bin/env node

/**
 * Rename gallery media `name`, `alternativeText` and `caption` from the linked
 * brand + category + year of each `gallery-project`.
 *
 * Format produit :
 *   - name              : `e-do-studio-{brand-slug}-{category-slug}-{year}-{N}`
 *   - alternativeText   : `e-do studio — {Brand Name} — {Category FR} — {Year} ({N}/{total})`
 *   - caption           : identique à alt
 *
 * Le `name` Strapi n'inclut pas l'extension (Strapi la stocke à part dans
 * `ext`). On ne touche pas au fichier physique sur R2 — seul le `name`
 * affiché en admin et l'URL d'origine côté CMS changent. Le hash R2 reste
 * stable, donc aucune URL cachée ne casse.
 *
 * Idempotent :
 *   - si name + alt + caption matchent déjà la valeur cible, on saute.
 *
 * Pré-requis :
 *   - Token API full-access (lecture + écriture sur upload, gallery-project,
 *     gallery-category, gallery-brand).
 *
 * Usage :
 *   STRAPI_URL=https://cms.e-do.studio \
 *   STRAPI_TOKEN=<full-access-token> \
 *     node strapi/scripts/rename-gallery-media.mjs --dry-run
 *
 *   # Une fois le dry-run validé :
 *   STRAPI_URL=https://cms.e-do.studio \
 *   STRAPI_TOKEN=<full-access-token> \
 *     node strapi/scripts/rename-gallery-media.mjs
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

if (!STRAPI_TOKEN) {
  console.error('STRAPI_TOKEN env var is required (full-access API token).');
  process.exit(1);
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${STRAPI_TOKEN}`,
};

const authHeader = { Authorization: `Bearer ${STRAPI_TOKEN}` };

async function api(path, opts = {}) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  const res = await fetch(url, { headers: jsonHeaders, ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || 'GET'} /api/${path} → ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function slugify(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchAll(collection, extra = '') {
  const out = [];
  let page = 1;
  const pageSize = 100;
  while (true) {
    const path = `${collection}?publicationState=preview&pagination[page]=${page}&pagination[pageSize]=${pageSize}${extra}`;
    const res = await api(path);
    const items = res?.data ?? [];
    out.push(...items);
    const pageCount = res?.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page++;
  }
  return out;
}

// Strapi 5 upload plugin accepte un POST multipart sur /api/upload?id=:id avec
// uniquement un champ `fileInfo` (JSON stringifié) pour mettre à jour les
// métadonnées sans toucher au binaire. C'est la seule route content-API qui
// expose cette opération — l'alternative admin-API nécessite un token admin.
async function updateFileMeta(fileId, fileInfo) {
  const form = new FormData();
  form.append('fileInfo', JSON.stringify(fileInfo));
  const url = new URL(`/api/upload?id=${fileId}`, STRAPI_URL);
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeader,
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /api/upload?id=${fileId} → ${res.status}: ${text}`);
  }
}

async function main() {
  console.log(`Renaming gallery media on ${STRAPI_URL}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log('='.repeat(60));

  const projects = await fetchAll(
    'gallery-projects',
    '&locale=fr&populate[brand]=true&populate[category]=true&populate[media]=true'
  );
  console.log(`Loaded ${projects.length} project(s).`);

  let renamed = 0;
  let skipped = 0;
  let skippedMissing = 0;
  let failed = 0;

  for (const project of projects) {
    const brandName = project.brand?.name?.trim();
    const categoryName = project.category?.name?.trim();
    const categorySlug = project.category?.slug?.trim();
    const year = project.year?.trim();
    const media = Array.isArray(project.media) ? project.media : [];

    if (!brandName || !categoryName || !categorySlug || !year || media.length === 0) {
      console.log(`  · skip ${project.documentId}: missing brand/category/year/media`);
      skippedMissing++;
      continue;
    }

    const brandSlug = slugify(brandName);
    const total = media.length;

    console.log(`  → ${project.documentId}: ${brandName} / ${categoryName} / ${year} (${total} media)`);

    for (let i = 0; i < media.length; i++) {
      const file = media[i];
      const idx = i + 1;
      const targetName = `e-do-studio-${brandSlug}-${categorySlug}-${year}-${idx}`;
      const targetAlt = `e-do studio — ${brandName} — ${categoryName} — ${year} (${idx}/${total})`;
      const targetCaption = targetAlt;

      const sameName = file.name === targetName;
      const sameAlt = (file.alternativeText ?? '') === targetAlt;
      const sameCaption = (file.caption ?? '') === targetCaption;
      if (sameName && sameAlt && sameCaption) {
        skipped++;
        continue;
      }

      const before = {
        name: file.name,
        alt: file.alternativeText ?? '',
        caption: file.caption ?? '',
      };

      if (DRY_RUN) {
        console.log(`    · [${idx}/${total}] would rename file ${file.id}`);
        console.log(`        name    : "${before.name}" → "${targetName}"`);
        console.log(`        alt     : "${before.alt}" → "${targetAlt}"`);
        console.log(`        caption : "${before.caption}" → "${targetCaption}"`);
        renamed++;
        continue;
      }

      try {
        await updateFileMeta(file.id, {
          name: targetName,
          alternativeText: targetAlt,
          caption: targetCaption,
        });
        console.log(`    ✓ [${idx}/${total}] file ${file.id} → "${targetName}"`);
        renamed++;
      } catch (err) {
        console.warn(`    ⚠️  [${idx}/${total}] file ${file.id} failed: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`${DRY_RUN ? 'Would rename' : 'Renamed'} ${renamed} media.`);
  console.log(`Skipped (already correct): ${skipped}`);
  console.log(`Skipped (missing relations): ${skippedMissing} project(s)`);
  if (failed) console.log(`Failed: ${failed} media`);
}

main().catch(err => {
  console.error('Rename failed:', err.message);
  process.exit(1);
});
