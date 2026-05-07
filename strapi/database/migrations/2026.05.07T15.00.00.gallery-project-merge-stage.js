'use strict';

/**
 * Merge `gallery_projects.stage_key` (enumeration) into `stage` (now also
 * enumeration) and drop the legacy `stage_key` column.
 *
 * Context: the schema previously had two side-by-side fields — `stage`
 * (free-text string, deprecated) and `stageKey` (closed enumeration). The
 * editor saw both in the admin UI which was confusing. The schema is now
 * unified to a single `stage` enumeration field. This migration:
 *   1. Copies any non-null `stage_key` value into `stage` (it's the
 *      validated value and wins over free text).
 *   2. Normalises free-text `stage` values into the enum where possible
 *      ("Cyclo", "Cyclorama  ", "LIVE" → "cyclorama"/"live"). This is
 *      what the old `migrate-stage-to-stagekey.mjs` API script used to
 *      do; folding it into the DB migration means a single source of
 *      truth for the conversion.
 *   3. Sets any remaining unrecognised value to NULL so the admin UI
 *      doesn't reject it as out-of-enum.
 *   4. Drops the now-empty `stage_key` column.
 *
 * Idempotent: skipped when `stage_key` no longer exists.
 */

const TABLE = 'gallery_projects';
const TARGET = 'stage';
const LEGACY = 'stage_key';
const ALLOWED = ['live', 'eclipse', 'horizontal', 'vertical', 'cyclorama'];

function normalize(raw) {
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();
  if (ALLOWED.includes(v)) return v;
  if (v.startsWith('cyclo')) return 'cyclorama';
  if (v.startsWith('hori')) return 'horizontal';
  if (v.startsWith('vert')) return 'vertical';
  if (v.startsWith('ecl')) return 'eclipse';
  if (v.startsWith('live') || v === 'liv') return 'live';
  return null;
}

async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE);
  if (!exists) {
    console.log(`[stage-merge] table ${TABLE} does not exist; skipping.`);
    return;
  }

  const hasTarget = await knex.schema.hasColumn(TABLE, TARGET);
  if (!hasTarget) {
    await knex.schema.alterTable(TABLE, (t) => t.string(TARGET).nullable());
    console.log(`[stage-merge] created missing ${TARGET} column.`);
  }

  const hasLegacy = await knex.schema.hasColumn(TABLE, LEGACY);

  // Step 1: stage_key → stage (legacy enum wins).
  if (hasLegacy) {
    const updated = await knex(TABLE)
      .whereNotNull(LEGACY)
      .update({ [TARGET]: knex.ref(LEGACY) });
    console.log(`[stage-merge] copied ${updated} rows from ${LEGACY} to ${TARGET}.`);
  }

  // Step 2: normalise free-text stage values.
  const rows = await knex(TABLE).select('id', TARGET).whereNotNull(TARGET);
  let normalised = 0;
  let cleared = 0;
  for (const row of rows) {
    const current = row[TARGET];
    if (ALLOWED.includes(current)) continue;
    const mapped = normalize(current);
    if (mapped) {
      await knex(TABLE).where('id', row.id).update({ [TARGET]: mapped });
      normalised++;
    } else {
      await knex(TABLE).where('id', row.id).update({ [TARGET]: null });
      cleared++;
    }
  }
  if (normalised > 0) {
    console.log(`[stage-merge] normalised ${normalised} free-text value(s) into the enum.`);
  }
  if (cleared > 0) {
    console.log(`[stage-merge] cleared ${cleared} unrecognised value(s) to NULL.`);
  }

  // Step 3: drop the legacy column.
  if (hasLegacy) {
    await knex.schema.alterTable(TABLE, (t) => t.dropColumn(LEGACY));
    console.log(`[stage-merge] dropped column ${LEGACY}.`);
  } else {
    console.log(`[stage-merge] ${LEGACY} column already gone; nothing to drop.`);
  }
}

async function down() {
  console.log('[stage-merge] down is not supported; restore from backup.');
}

module.exports = { up, down };
