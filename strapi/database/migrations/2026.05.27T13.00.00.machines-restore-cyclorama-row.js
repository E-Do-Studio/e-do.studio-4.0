'use strict';

/**
 * EDO-254 — restore the cyclorama row in the machines collection.
 *
 * Context
 * -------
 * Two migrations were merged in conflicting order:
 *   - 2026.05.27T00.00.00.machines-drop-cyclorama-row.js (PR #263, EDO-241):
 *     deletes any machines row with slug='cyclorama', back when the
 *     cyclorama lived in its own single-type and the row in machines was
 *     considered a duplicate.
 *   - 2026.05.26T13.00.00.cyclorama-merge-into-machine.js (PR #265, EDO-233):
 *     migrates pricing_description / usages from the cyclorama single-type
 *     into the machines collection — but assumes the cyclorama machines row
 *     already exists, and silently skips when it doesn't.
 *
 * Strapi runs migrations alphabetically by filename. Day 27 sorts after
 * day 26, so the DROP runs AFTER the MERGE on every install, including the
 * one already deployed to production. Result: machines has no cyclorama
 * row, the merge no-ops, and `fetchPlateaux` in `src/lib/strapi.ts`
 * returns a list without the cyclorama. PR #276's defensive
 * `if (!p) return null` in plateau-page.tsx hides the missing entry from
 * the sidebar instead of crashing, which is what the user reports:
 * "Le cyclorama ne s'affiche pas dans la liste des plateaux".
 *
 * Fix
 * ---
 * Insert the cyclorama machine row (FR + EN published). When the legacy
 * `cycloramas` single-type tables are still in place (the merge migration
 * explicitly left them for safety), copy the editorial scalar fields from
 * there so any work editors did on the single-type survives. Otherwise
 * fall back to the seed defaults — matching what `seedMachines` now
 * installs for fresh databases.
 *
 * Component links (specs, usages, pricingRows) are migrated when the
 * source single-type carried them; on fresh installs the frontend has
 * fallback dictionaries (`MACHINE_USES['cyclorama']`) so the page still
 * renders and editors can enrich the entry from the admin afterwards.
 * Media is intentionally not migrated — the cyclorama single-type used
 * a different shape (separate `image`, `gallery`, and `media` component)
 * than the machine collection (single `media` multi-media field), and
 * editors re-upload the assets when needed.
 *
 * Idempotent: a second run finds the cyclorama row and exits.
 */

const crypto = require('crypto');

const TABLE = 'machines';
const LINK_TABLE_CANDIDATES = ['machines_localizations_lnk', 'machines_localizations_links'];
const SRC_TABLE = 'cycloramas';
const SRC_LINK_TABLE = 'cycloramas_cmps';
const DST_LINK_TABLE = 'machines_cmps';
const SLUG = 'cyclorama';
const ALLOWED_COMPONENT_FIELDS = new Set(['specs', 'usages', 'pricingRows']);

// Strapi 5 documentIds are 24-char alphanumeric. 12 random bytes hex-encoded
// produces a 24-char string from the [0-9a-f] subset, valid everywhere the
// DB layer touches a documentId (REST, content-manager, FK joins).
function newDocumentId() {
  return crypto.randomBytes(12).toString('hex');
}

const SCALAR_DEFAULTS = {
  fr: {
    title: 'Cyclorama',
    subtitle: 'Production libre',
    description:
      "Cyclo 2 faces de 30 m² pour photo et vidéo sur fond blanc infini. À la journée ou à la semaine, en production libre ou avec notre équipe.",
    pricing: '650€ / 5h · 880€ / 10h · Sur demande / 10h éditorial',
    pricing_description: 'Remise en blanc 110 € · Électricité 1,40 €/kWh',
  },
  en: {
    title: 'Cyclorama',
    subtitle: 'Free production',
    description:
      '30 m² 2-sided cyclorama for photo and video on an infinite white background. Daily or weekly, as a free-production rental or crewed.',
    pricing: '€650 / 5 hours · €880 / 10 hours · On request / 10 hours editorial',
    pricing_description: 'Repaint €110 · Electricity €1.40/kWh',
  },
};

async function listColumns(knex, table) {
  return Object.keys(await knex(table).columnInfo());
}

async function readCycloramaSource(knex) {
  if (!(await knex.schema.hasTable(SRC_TABLE))) return null;
  const wantedCols = ['id', 'locale', 'title', 'subtitle', 'description', 'pricing', 'pricing_description', 'published_at'];
  const available = await listColumns(knex, SRC_TABLE);
  const cols = wantedCols.filter((c) => available.includes(c));
  const rows = await knex(SRC_TABLE).select(...cols);
  if (rows.length === 0) return null;
  // Prefer published rows over drafts when both are present for a locale.
  const byLocale = { fr: null, en: null };
  for (const row of rows) {
    const locale = row.locale ?? 'fr';
    if (!(locale in byLocale)) continue;
    const current = byLocale[locale];
    const currentPublished = current?.published_at != null;
    const rowPublished = row.published_at != null;
    if (!current || (rowPublished && !currentPublished)) {
      byLocale[locale] = row;
    }
  }
  return byLocale.fr || byLocale.en ? byLocale : null;
}

function buildInsertRow(locale, source, columns, now, docId) {
  const fallback = SCALAR_DEFAULTS[locale] ?? SCALAR_DEFAULTS.fr;
  const candidate = {
    document_id: docId,
    locale,
    title: source?.title ?? fallback.title,
    slug: SLUG,
    subtitle: source?.subtitle ?? fallback.subtitle,
    description: source?.description ?? fallback.description,
    pricing: source?.pricing ?? fallback.pricing,
    pricing_description: source?.pricing_description ?? fallback.pricing_description,
    published_at: now,
    created_at: now,
    updated_at: now,
  };
  const row = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (columns.includes(key)) row[key] = value;
  }
  return row;
}

async function copyComponentLinks(knex, sourceIdsByLocale, machineIdsByLocale) {
  if (!(await knex.schema.hasTable(SRC_LINK_TABLE))) return;
  if (!(await knex.schema.hasTable(DST_LINK_TABLE))) return;
  const dstCols = await listColumns(knex, DST_LINK_TABLE);
  let copied = 0;
  for (const [locale, machineId] of Object.entries(machineIdsByLocale)) {
    const sourceId = sourceIdsByLocale.get(locale);
    if (!sourceId || !machineId) continue;
    const links = await knex(SRC_LINK_TABLE)
      .where('entity_id', sourceId)
      .select('cmp_id', 'component_type', 'field', 'order');
    const inserts = links
      .filter((l) => ALLOWED_COMPONENT_FIELDS.has(l.field))
      .map((l) => {
        const row = {
          entity_id: machineId,
          cmp_id: l.cmp_id,
          component_type: l.component_type,
          field: l.field,
          order: l.order,
        };
        for (const key of Object.keys(row)) {
          if (!dstCols.includes(key)) delete row[key];
        }
        return row;
      });
    if (inserts.length > 0) {
      await knex(DST_LINK_TABLE).insert(inserts);
      copied += inserts.length;
      console.log(`  -> copied ${inserts.length} component link(s) for locale=${locale}`);
    }
  }
  if (copied === 0) {
    console.log('  [ok] no eligible component links to copy from cycloramas_cmps');
  }
}

async function up(knex) {
  console.log('\n=== EDO-254 — Restore cyclorama row in machines ===\n');

  if (!(await knex.schema.hasTable(TABLE))) {
    console.log(`[skip] ${TABLE} table does not exist.`);
    return;
  }

  const hasSlug = await knex.schema.hasColumn(TABLE, 'slug');
  if (!hasSlug) {
    console.log(`[skip] ${TABLE}.slug column missing — schema is unexpected.`);
    return;
  }

  const existing = await knex(TABLE).where('slug', SLUG).select('id', 'locale');
  if (existing.length > 0) {
    console.log(`[skip] machines/${SLUG} already exists (${existing.length} row(s)). Nothing to do.`);
    return;
  }

  const columns = await listColumns(knex, TABLE);
  const source = await readCycloramaSource(knex);
  if (source) {
    console.log('  [info] copying scalar fields from cycloramas single-type tables');
  } else {
    console.log('  [info] no cycloramas source data — inserting seed defaults');
  }

  const now = new Date();
  const documentId = newDocumentId();
  const machineIdsByLocale = {};
  const sourceIdsByLocale = new Map();

  for (const locale of ['fr', 'en']) {
    const src = source?.[locale] ?? source?.fr ?? null;
    if (src?.id) sourceIdsByLocale.set(locale, src.id);
    const row = buildInsertRow(locale, src, columns, now, documentId);
    const inserted = await knex(TABLE).insert(row).returning('id');
    const id = typeof inserted[0] === 'object' ? inserted[0].id : inserted[0];
    machineIdsByLocale[locale] = id;
    console.log(`  + inserted ${TABLE} row locale=${locale} id=${id}`);
  }

  for (const linkTable of LINK_TABLE_CANDIDATES) {
    if (!(await knex.schema.hasTable(linkTable))) continue;
    const linkCols = await listColumns(knex, linkTable);
    if (!linkCols.includes('machine_id') || !linkCols.includes('inv_machine_id')) continue;
    await knex(linkTable).insert([
      { machine_id: machineIdsByLocale.fr, inv_machine_id: machineIdsByLocale.en },
      { machine_id: machineIdsByLocale.en, inv_machine_id: machineIdsByLocale.fr },
    ]);
    console.log(`  + paired FR/EN variants in ${linkTable}`);
    break;
  }

  if (source) {
    await copyComponentLinks(knex, sourceIdsByLocale, machineIdsByLocale);
  }

  console.log('\n=== Migration complete ===\n');
}

async function down() {
  console.log('[edo-254] down is not supported; delete the row manually if needed.');
}

module.exports = { up, down };
