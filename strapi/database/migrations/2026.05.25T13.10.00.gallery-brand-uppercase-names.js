'use strict';

/**
 * EDO-134: normalise every existing `gallery-brand.name` to uppercase so the
 * marquee on the home page and the gallery brand filters render with a
 * consistent visual style. New entries are kept uppercase by the lifecycle
 * hook at `src/api/gallery-brand/content-types/gallery-brand/lifecycles.ts`,
 * but rows that pre-date that hook still carry mixed-case names. This
 * migration walks the table once at boot and rewrites only the rows whose
 * current value differs from its uppercase form.
 *
 * Each locale entry is stored as its own row (i18n is enabled and the row
 * carries its own `locale` column), so the update reaches both the FR and
 * EN draft + published versions of every brand without locale-specific
 * branching.
 *
 * Idempotent: rows already in uppercase are filtered out by the WHERE
 * clause, so re-running the migration is a no-op.
 */

const TABLE = 'gallery_brands';

async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) {
    console.log(`[gallery-brand-uppercase] table ${TABLE} not found; skipping.`);
    return;
  }
  const hasName = await knex.schema.hasColumn(TABLE, 'name');
  if (!hasName) {
    console.log(`[gallery-brand-uppercase] ${TABLE}.name column missing; skipping.`);
    return;
  }

  // Use a raw UPPER() so the rewrite runs server-side in one statement.
  // The WHERE filters out rows already uppercase and rows with a null name.
  const updated = await knex(TABLE)
    .whereNotNull('name')
    .whereRaw('name <> UPPER(name)')
    .update({ name: knex.raw('UPPER(name)') });

  if (updated === 0) {
    console.log('[gallery-brand-uppercase] no rows needed normalisation.');
    return;
  }
  console.log(`[gallery-brand-uppercase] uppercased ${updated} row(s) on ${TABLE}.name.`);
}

async function down() {
  console.log('[gallery-brand-uppercase] down is not supported; restore from backup.');
}

module.exports = { up, down };
