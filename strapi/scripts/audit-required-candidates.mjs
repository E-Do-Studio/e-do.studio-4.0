#!/usr/bin/env node

/**
 * Data audit: lists rows that would FAIL if we set required:true on the
 * candidate fields below. Run this BEFORE adding required:true to any
 * schema.json — otherwise Strapi will refuse to boot or refuse to save
 * existing rows.
 *
 * Output is a markdown report (stdout) listing per content-type/locale:
 *   - field name
 *   - rows missing the field
 *   - sample row IDs / documentIds
 *
 * Usage:
 *   DATABASE_CLIENT=postgres DATABASE_URL=postgres://... \
 *     node scripts/audit-required-candidates.mjs
 *
 * For SQLite (local dev):
 *   DATABASE_CLIENT=sqlite DATABASE_FILENAME=../.tmp/data.db \
 *     node scripts/audit-required-candidates.mjs
 */

import knex from 'knex';

// Candidate fields we want to be `required: true` (mirrors the deep audit
// recommendations). DB column names use snake_case; Strapi attribute names
// in schema.json may differ — we map both ways.
const CANDIDATES = [
  // table, column (DB), attribute (schema), severity
  ['blog_categories', 'title', 'title', 'major'],
  ['blog_posts', 'title', 'title', 'major'],
  ['blog_posts', 'cover_media_id', 'coverMedia', 'critical'],
  ['blog_posts', 'excerpt', 'excerpt', 'minor'],
  ['gallery_brands', 'logo_id', 'logo', 'critical'],
  ['gallery_brands', 'url', 'url', 'minor'],
  ['gallery_categories', 'name', 'name', 'major'],
  ['gallery_projects', 'title', 'title', 'major'],
  ['gallery_projects', 'category_id', 'category', 'major'],
  ['gallery_projects', 'brand_id', 'brand', 'major'],
  ['machines', 'title', 'title', 'major'],
  ['machines', 'subtitle', 'subtitle', 'minor'],
  ['post_production_types', 'title', 'title', 'major'],
  ['post_production_types', 'description', 'description', 'major'],
  ['site_settings', 'site_title', 'siteTitle', 'critical'],
  ['site_settings', 'email', 'email', 'critical'],
  ['site_settings', 'phone', 'phone', 'critical'],
  ['site_settings', 'logo_id', 'logo', 'critical'],
  ['site_settings', 'default_seo_title', 'defaultSeoTitle', 'major'],
  ['site_settings', 'default_seo_description', 'defaultSeoDescription', 'major'],
];

const client = process.env.DATABASE_CLIENT ?? 'sqlite';

function buildKnex() {
  if (client === 'sqlite') {
    return knex({
      client: 'better-sqlite3',
      connection: { filename: process.env.DATABASE_FILENAME ?? '../.tmp/data.db' },
      useNullAsDefault: true,
    });
  }
  if (client === 'postgres') {
    return knex({
      client: 'pg',
      connection: process.env.DATABASE_URL ?? {
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT ?? 5432),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        ssl: process.env.DATABASE_SSL === 'true',
      },
    });
  }
  throw new Error(`Unsupported DATABASE_CLIENT: ${client}`);
}

async function tableExists(db, table) {
  return db.schema.hasTable(table);
}

async function columnExists(db, table, column) {
  return db.schema.hasColumn(table, column);
}

async function auditCandidate(db, [table, column, attribute, severity]) {
  if (!(await tableExists(db, table))) {
    return { table, attribute, status: 'skipped', reason: 'table missing' };
  }

  // Strapi 5 stores relation FKs in a *_lnk join table for many-to-* relations,
  // and as <attr>_id columns only for one-to-one / many-to-one. Try direct column
  // first, fall back to skipping.
  if (!(await columnExists(db, table, column))) {
    return { table, attribute, status: 'skipped', reason: `column ${column} missing (likely m2m via _lnk)` };
  }

  const total = await db(table).count('id as n').first();
  const missing = await db(table).whereNull(column).count('id as n').first();
  const sampleRows = await db(table).whereNull(column).select('id', 'document_id').limit(5);

  return {
    table,
    attribute,
    severity,
    status: 'ok',
    total: Number(total?.n ?? 0),
    missing: Number(missing?.n ?? 0),
    samples: sampleRows.map((r) => `${r.id}/${r.document_id ?? '-'}`),
  };
}

function formatLine(r) {
  if (r.status === 'skipped') {
    return `- \`${r.table}.${r.attribute}\` — SKIPPED (${r.reason})`;
  }
  const ratio = r.total === 0 ? 'no rows' : `${r.missing}/${r.total}`;
  const safe = r.missing === 0 ? '✅ safe to set required' : '⚠️ needs data fix first';
  const samples = r.samples.length ? ` — samples: ${r.samples.join(', ')}` : '';
  return `- [${r.severity}] \`${r.table}.${r.attribute}\`: ${ratio} null ${safe}${samples}`;
}

async function main() {
  const db = buildKnex();
  const lines = ['# Audit `required: true` candidates', ''];

  for (const candidate of CANDIDATES) {
    const result = await auditCandidate(db, candidate);
    lines.push(formatLine(result));
  }

  console.log(lines.join('\n'));
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
