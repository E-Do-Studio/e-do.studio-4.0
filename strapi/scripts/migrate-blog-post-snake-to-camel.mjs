#!/usr/bin/env node

/**
 * Manual migration: copy `blog-post.cta_text/cta_label/cta_url` (snake_case)
 * into the new `ctaText/ctaLabel/ctaUrl` (camelCase) fields.
 *
 * The snake_case fields stay in the schema (marked DEPRECATED) until a
 * follow-up PR drops them after this migration has been applied
 * everywhere.
 *
 * SEO fields (`seo_title/seo_description/seo_image`) are NOT migrated
 * here — those should be migrated into the `shared.seo-meta` component
 * (`seo` field) instead. That migration is separate.
 *
 * Run order:
 *   1. Take a DB backup.
 *   2. STRAPI_URL=https://cms.e-do.studio STRAPI_TOKEN=<full-access> \
 *        node strapi/scripts/migrate-blog-post-snake-to-camel.mjs
 *   3. Verify in admin (one or two posts have ctaText/ctaLabel/ctaUrl).
 *   4. After a stabilisation period, a follow-up PR drops the old fields
 *      and the front (when needed) reads exclusively from camelCase.
 *
 * Idempotent: per-post per-locale, skips if the camelCase target is
 * already populated.
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

const FIELD_MAP = [
  ['cta_text', 'ctaText'],
  ['cta_label', 'ctaLabel'],
  ['cta_url', 'ctaUrl'],
];

async function api(path, opts = {}) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  const res = await fetch(url, { headers, ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || 'GET'} /api/${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function migrateLocale(locale) {
  console.log(`\n--- locale=${locale} ---`);
  const res = await api(`blog-posts?locale=${locale}&pagination[pageSize]=200&publicationState=preview`);
  const posts = res.data ?? [];
  let migrated = 0;
  let skipped = 0;

  for (const post of posts) {
    const docId = post.documentId ?? post.id;
    const updates = {};
    for (const [snake, camel] of FIELD_MAP) {
      const snakeVal = post[snake];
      const camelVal = post[camel];
      if (snakeVal && !camelVal) {
        updates[camel] = snakeVal;
      }
    }
    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }
    await api(`blog-posts/${docId}?locale=${locale}`, {
      method: 'PUT',
      body: JSON.stringify({ data: updates }),
    });
    console.log(`  ✓ ${docId}: ${Object.keys(updates).join(', ')}`);
    migrated++;
  }

  console.log(`  Done. migrated=${migrated} skipped=${skipped}`);
}

async function main() {
  console.log(`Strapi: ${STRAPI_URL}`);
  await migrateLocale('fr');
  try {
    await migrateLocale('en');
  } catch (err) {
    console.warn(`EN locale skipped: ${err.message}`);
  }
  console.log('\n=== migration complete ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
