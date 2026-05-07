#!/usr/bin/env node

/**
 * Manual migration: copy `gallery-project.stage` (free-text string)
 * into the new `stageKey` enumeration field. Maps fuzzy values
 * ("Cyclo", "cyclorama  ", "Live", etc.) to the canonical 5-value enum
 * (live/eclipse/horizontal/vertical/cyclorama).
 *
 * Run order:
 *   1. Take a DB backup.
 *   2. STRAPI_URL=https://cms.e-do.studio STRAPI_TOKEN=<full-access> \
 *        node strapi/scripts/migrate-stage-to-stagekey.mjs
 *   3. Verify in admin (each project has a stageKey set).
 *   4. After stabilisation, a follow-up PR drops the legacy `stage`
 *      string field.
 *
 * Idempotent: skipped per-project if stageKey is already set.
 *
 * Reports unmappable values at the end so the editor can fix them
 * by hand before re-running.
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

if (!STRAPI_TOKEN) {
  console.error('STRAPI_TOKEN env var is required (full-access API token).');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${STRAPI_TOKEN}`,
};

const VALID = ['live', 'eclipse', 'horizontal', 'vertical', 'cyclorama'];

function normalize(raw) {
  if (!raw) return null;
  const v = String(raw).trim().toLowerCase();
  if (VALID.includes(v)) return v;
  // Common misspellings / partials.
  if (v.startsWith('cyclo')) return 'cyclorama';
  if (v.startsWith('hori')) return 'horizontal';
  if (v.startsWith('vert')) return 'vertical';
  if (v.startsWith('ecl')) return 'eclipse';
  if (v === 'liv' || v.startsWith('live')) return 'live';
  return null;
}

async function api(path, opts = {}) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  const res = await fetch(url, { headers, ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || 'GET'} /api/${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`Strapi: ${STRAPI_URL}`);
  const res = await api('gallery-projects?locale=fr&pagination[pageSize]=200&publicationState=preview');
  const projects = res.data ?? [];
  let migrated = 0;
  let skipped = 0;
  const unmapped = [];

  for (const p of projects) {
    const docId = p.documentId ?? p.id;
    if (p.stageKey) {
      skipped++;
      continue;
    }
    const key = normalize(p.stage);
    if (!key) {
      unmapped.push({ docId, stage: p.stage, slug: p.slug });
      continue;
    }
    await api(`gallery-projects/${docId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: { stageKey: key } }),
    });
    console.log(`  ✓ ${docId} (${p.slug}): "${p.stage}" → ${key}`);
    migrated++;
  }

  console.log(`\nDone. migrated=${migrated} skipped=${skipped}`);
  if (unmapped.length > 0) {
    console.log(`\n⚠️ ${unmapped.length} project(s) had unmappable stage values — fix them in admin then re-run:`);
    for (const u of unmapped) {
      console.log(`   - ${u.docId} (${u.slug}): stage="${u.stage}"`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
