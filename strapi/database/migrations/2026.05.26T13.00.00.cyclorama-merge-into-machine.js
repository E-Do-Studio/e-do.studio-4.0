'use strict';

/**
 * EDO-233 — Merge the Cyclorama single-type into the Machine collection.
 *
 * Context
 * -------
 * The Cyclorama lived as both:
 *   - a `Plateau · Machine` row with slug='cyclorama' (collection type), and
 *   - a `Plateau · Cyclorama` single-type (detached duplicate).
 *
 * The single-type is removed in this PR. The Cyclorama is now just another
 * Machine. To preserve any content the editorial team had written on the
 * single-type, we copy two fields the Machine schema didn't carry before:
 *   - `pricingDescription` (text, localized) — note shown under the rates grid
 *   - `usages`             (shared.localized-item component, localized) — list
 *
 * The other Cyclorama fields (title, subtitle, description, specs, media,
 * pricingRows, seo) are already mirrored on the cyclorama Machine row from
 * the seed, so we don't overwrite them here. Anything that was richer on
 * the single-type is left to editors to re-enter on the Machine row.
 *
 * Idempotent: skips when the source tables don't exist, when the Machine
 * row doesn't have a cyclorama slug, or when the destination already has
 * the migrated content.
 *
 * Cleanup: the cycloramas / cycloramas_cmps tables are left in place. Strapi
 * schema-sync will not touch them (the content-type is gone from disk) but
 * dropping them automatically would risk data loss if the migration was
 * partial. They can be dropped manually once editors confirm the Machine
 * row carries the right content.
 */

const SRC_TABLE = 'cycloramas';
const SRC_LINK_TABLE = 'cycloramas_cmps';
const DST_TABLE = 'machines';
const DST_LINK_TABLE = 'machines_cmps';
const USAGES_COMPONENT_TYPE = 'shared.localized-item';
const USAGES_FIELD = 'usages';

async function tableExists(knex, table) {
  return knex.schema.hasTable(table);
}

async function columnExists(knex, table, column) {
  return knex.schema.hasColumn(table, column);
}

async function copyPricingDescription(knex) {
  const hasSrcCol = await columnExists(knex, SRC_TABLE, 'pricing_description');
  const hasDstCol = await columnExists(knex, DST_TABLE, 'pricing_description');
  if (!hasSrcCol || !hasDstCol) {
    console.log(`  [skip] pricing_description column missing (src=${hasSrcCol} dst=${hasDstCol})`);
    return;
  }

  const sources = await knex(SRC_TABLE)
    .select('locale', 'pricing_description')
    .whereNotNull('pricing_description');

  if (sources.length === 0) {
    console.log('  [skip] no cyclorama pricing_description rows to copy');
    return;
  }

  let updated = 0;
  for (const src of sources) {
    if (!src.pricing_description || String(src.pricing_description).trim() === '') continue;
    const target = await knex(DST_TABLE)
      .where({ slug: 'cyclorama', locale: src.locale })
      .first('id', 'pricing_description');
    if (!target) {
      console.log(`  [skip] no machines row with slug='cyclorama' for locale=${src.locale}`);
      continue;
    }
    if (target.pricing_description && String(target.pricing_description).trim() !== '') {
      console.log(`  [skip] machines/cyclorama/${src.locale} already has pricing_description`);
      continue;
    }
    await knex(DST_TABLE).where('id', target.id).update({ pricing_description: src.pricing_description });
    updated += 1;
    console.log(`  -> copied pricing_description for locale=${src.locale}`);
  }
  if (updated === 0) console.log('  [ok] pricing_description: nothing to copy');
}

async function copyUsages(knex) {
  const hasSrcLink = await tableExists(knex, SRC_LINK_TABLE);
  const hasDstLink = await tableExists(knex, DST_LINK_TABLE);
  if (!hasSrcLink || !hasDstLink) {
    console.log(`  [skip] link tables missing (src=${hasSrcLink} dst=${hasDstLink})`);
    return;
  }

  const machineRows = await knex(DST_TABLE)
    .where({ slug: 'cyclorama' })
    .select('id', 'locale');
  if (machineRows.length === 0) {
    console.log('  [skip] no machines row with slug=cyclorama');
    return;
  }

  const cycloRows = await knex(SRC_TABLE).select('id', 'locale');
  const cycloByLocale = new Map(cycloRows.map((r) => [r.locale, r.id]));

  let migrated = 0;
  for (const machine of machineRows) {
    const cycloEntityId = cycloByLocale.get(machine.locale);
    if (!cycloEntityId) {
      console.log(`  [skip] no cycloramas row for locale=${machine.locale}`);
      continue;
    }

    const existing = await knex(DST_LINK_TABLE)
      .where({ entity_id: machine.id, field: USAGES_FIELD, component_type: USAGES_COMPONENT_TYPE })
      .count({ n: '*' })
      .first();
    if (Number(existing?.n ?? 0) > 0) {
      console.log(`  [skip] machines/cyclorama/${machine.locale} already has usages`);
      continue;
    }

    const links = await knex(SRC_LINK_TABLE)
      .where({ entity_id: cycloEntityId, field: USAGES_FIELD, component_type: USAGES_COMPONENT_TYPE })
      .orderBy('order', 'asc')
      .select('cmp_id', 'order');

    if (links.length === 0) {
      console.log(`  [skip] no usages links on cycloramas locale=${machine.locale}`);
      continue;
    }

    const linkColumns = Object.keys(await knex(DST_LINK_TABLE).columnInfo());
    const inserts = links.map((link) => {
      const row = {
        entity_id: machine.id,
        cmp_id: link.cmp_id,
        component_type: USAGES_COMPONENT_TYPE,
        field: USAGES_FIELD,
        order: link.order,
      };
      // Strict drivers reject unknown columns, so only keep what exists.
      for (const key of Object.keys(row)) {
        if (!linkColumns.includes(key)) delete row[key];
      }
      return row;
    });

    if (inserts.length > 0) {
      await knex(DST_LINK_TABLE).insert(inserts);
      migrated += inserts.length;
      console.log(`  -> migrated ${inserts.length} usages link(s) for locale=${machine.locale}`);
    }
  }
  if (migrated === 0) console.log('  [ok] usages: nothing to migrate');
}

async function up(knex) {
  console.log('\n=== EDO-233 — Merge Cyclorama single-type into Machine ===\n');

  const hasSrc = await tableExists(knex, SRC_TABLE);
  if (!hasSrc) {
    console.log(`[skip] ${SRC_TABLE} does not exist (fresh install — nothing to migrate).`);
    return;
  }

  console.log('-> pricing_description');
  try {
    await copyPricingDescription(knex);
  } catch (err) {
    console.error(`  ERROR copying pricing_description: ${err.message}`);
  }

  console.log('-> usages');
  try {
    await copyUsages(knex);
  } catch (err) {
    console.error(`  ERROR copying usages: ${err.message}`);
  }

  console.log('\n=== Migration complete (cycloramas tables left in place for safety) ===\n');
}

async function down() {
  console.log('Rollback not supported. The new fields can be cleared manually if needed.');
}

module.exports = { up, down };
