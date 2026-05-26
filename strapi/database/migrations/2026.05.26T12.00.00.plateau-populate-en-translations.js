'use strict';

/**
 * EDO-211 follow-up — Populate EN translations for plateau component fields.
 *
 * The previous migration (`2026.05.26T11.00.00.plateau-localize-component-fields.js`)
 * made the EN locale's `specs` / `usages` / `pricingRows` component rows
 * independent from FR, but copied the FR values as a starting point. As a
 * result, toggling language on the plateau page still showed French text in
 * the « caractéristiques » block — the data was structurally localized but
 * semantically identical.
 *
 * This migration replaces the FR-derived values on EN-linked component rows
 * with their proper English translations (sourced from the seed dictionary
 * in `strapi/scripts/seed-content.mjs`). Match is by `order` index inside
 * each entity's link list — the seed and current production data share the
 * same row ordering.
 *
 * Safety
 * ------
 * - Idempotent: rows whose `label` already matches the EN dictionary are
 *   skipped, so the migration can run repeatedly without churn.
 * - Defensive: a component row is updated only if every link table reference
 *   to it points at an EN-locale entity. If a row is still shared with a FR
 *   entity (e.g. the previous migration was skipped), it is left untouched.
 * - Identifies machines by `slug` (which is NOT localized on the schema).
 *   Cyclorama is a singleType so only the locale is needed.
 * - Unknown / out-of-range indices are skipped with a warning, never throw.
 */

// ─── EN dictionaries (match the seed: strapi/scripts/seed-content.mjs) ───────

const CYCLORAMA_SPECS_EN = [
  { label: 'Surface', value: '240 m² · 2-sided cyclo 32 m²' },
  { label: 'Dimensions', value: '6.3m L × 5.2m W × 5m H' },
  { label: 'Natural light', value: 'Blackout skydomes' },
  { label: 'Access', value: 'Loading dock 3.5m L × 4.5m H' },
  { label: 'Exterior', value: 'Direct access, on-site parking' },
  { label: 'Electricity', value: '1 Marechal 63A 3-phase · 15 × 16A outlets' },
  { label: 'Connectivity & sound', value: 'High-speed Wi-Fi · Integrated sound system' },
  { label: 'Make-up', value: '2 equipped make-up stations' },
  { label: 'Dressing', value: '2 fitting rooms' },
  { label: 'Kitchen', value: 'Fully equipped' },
];

const CYCLORAMA_USAGES_EN = [
  { text: 'Campaign & editorial' },
  { text: 'Advertising film' },
  { text: 'Packshot & still life' },
];

const MACHINE_SPECS_EN = {
  horizontal: [
    { label: 'Camera', value: 'Canon EOS R · 24–105 mm motorized' },
    { label: 'Control', value: 'iPad · intuitive app' },
    { label: 'Lighting', value: 'High-CRI LED continuous' },
    { label: 'Auto clipping', value: 'AutoAlpha™' },
    { label: 'Formats', value: 'JPG · PNG · TIFF · RAW' },
  ],
  vertical: [
    { label: 'Camera', value: 'Canon EOS R · 70–200 mm motorized' },
    { label: 'Control', value: 'iPad · intuitive app' },
    { label: 'Lighting', value: 'High-CRI LED continuous' },
    { label: 'Auto clipping', value: 'AutoAlpha™' },
    { label: 'Formats', value: 'JPG · PNG · TIFF · RAW' },
  ],
  eclipse: [
    { label: 'Camera', value: 'Canon EOS R · 24–105 mm motorized' },
    { label: 'Control', value: 'iPad · intuitive app' },
    { label: 'Motion', value: '4 axes · height · tilt · zoom · 360° rotation' },
    { label: 'Lighting', value: 'High-CRI LED continuous' },
    { label: 'Formats', value: 'JPG · PNG · TIFF · RAW · MP4 · MOV' },
  ],
  live: [
    { label: 'Camera', value: 'Canon EOS R · 24–105 mm motorized' },
    { label: 'Control', value: 'iPad · intuitive app' },
    { label: 'Motion', value: '3 axes · height · tilt · zoom' },
    { label: 'Lighting', value: 'High-CRI LED continuous' },
    { label: 'Formats', value: 'JPG · PNG · TIFF · RAW · MP4 · MOV' },
  ],
  cyclorama: [
    { label: 'Surface', value: '240 m² · 2-sided cyclo 32 m²' },
    { label: 'Dimensions', value: '6.3m L × 5.2m W × 5m H' },
    { label: 'Natural light', value: 'Blackout skydomes' },
    { label: 'Access', value: 'Loading dock 3.5m L × 4.5m H' },
    { label: 'Exterior', value: 'Direct access, on-site parking' },
    { label: 'Electricity', value: '1 Marechal 63A 3-phase · 15 × 16A outlets' },
    { label: 'Connectivity & sound', value: 'High-speed Wi-Fi · Integrated sound system' },
    { label: 'Make-up', value: '2 equipped make-up stations' },
    { label: 'Dressing', value: '2 fitting rooms' },
    { label: 'Kitchen', value: 'Fully equipped' },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function tableExists(knex, table) {
  return knex.schema.hasTable(table);
}

async function columnExists(knex, table, column) {
  return knex.schema.hasColumn(table, column);
}

/**
 * Return true if the cmp_id is referenced ONLY by EN-locale entities.
 * If any FR (or other-locale) entity still references it, return false
 * so the caller can skip the update to avoid corrupting non-EN content.
 */
async function isExclusivelyEn(knex, linkTable, entityTable, cmpId, componentType, field) {
  const refs = await knex(linkTable)
    .where({ cmp_id: cmpId, component_type: componentType, field })
    .select('entity_id');
  if (refs.length === 0) return false;
  const entityIds = [...new Set(refs.map((r) => r.entity_id))];
  const locales = await knex(entityTable).whereIn('id', entityIds).select('id', 'locale');
  return locales.length > 0 && locales.every((row) => row.locale === 'en');
}

async function updateRow(knex, componentTable, columns, cmpId, payload) {
  const update = {};
  for (const [key, value] of Object.entries(payload)) {
    if (columns.includes(key) && value !== undefined) {
      update[key] = value;
    }
  }
  if (Object.keys(update).length === 0) return false;

  const [existing] = await knex(componentTable).where('id', cmpId).select(...Object.keys(update));
  if (!existing) return false;

  const allMatch = Object.entries(update).every(([k, v]) => existing[k] === v);
  if (allMatch) return false;

  await knex(componentTable).where('id', cmpId).update(update);
  return true;
}

/**
 * Translate every EN-linked component row for `field` on `entity` against
 * the dictionary (indexed by row order). Logs how many rows were updated
 * vs skipped vs already-translated.
 */
async function translateField(knex, {
  entityTable,
  linkTable,
  componentTable,
  componentType,
  field,
  entityRow,
  dictionary,
  label,
}) {
  if (!dictionary || dictionary.length === 0) return;

  const links = await knex(linkTable)
    .where({ entity_id: entityRow.id, field, component_type: componentType })
    .orderBy('order', 'asc')
    .select('id', 'cmp_id', 'order');

  if (links.length === 0) {
    console.log(`    [skip] ${label}: no link rows`);
    return;
  }

  const columns = Object.keys(await knex(componentTable).columnInfo());
  let updated = 0;
  let skippedShared = 0;
  let outOfRange = 0;
  let unchanged = 0;

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const dictEntry = dictionary[i];
    if (!dictEntry) {
      outOfRange++;
      continue;
    }

    const exclusive = await isExclusivelyEn(
      knex,
      linkTable,
      entityTable,
      link.cmp_id,
      componentType,
      field,
    );
    if (!exclusive) {
      skippedShared++;
      continue;
    }

    const wasUpdated = await updateRow(knex, componentTable, columns, link.cmp_id, dictEntry);
    if (wasUpdated) {
      updated++;
    } else {
      unchanged++;
    }
  }

  const summary = [
    `updated=${updated}`,
    `unchanged=${unchanged}`,
    skippedShared ? `skipped_shared=${skippedShared}` : null,
    outOfRange ? `out_of_range=${outOfRange}` : null,
  ].filter(Boolean).join(' · ');
  console.log(`    -> ${label}: ${summary}`);
}

async function translateCyclorama(knex) {
  const entityTable = 'cycloramas';
  const linkTable = 'cycloramas_cmps';

  if (!(await tableExists(knex, entityTable)) || !(await tableExists(knex, linkTable))) {
    console.log(`  [skip] cyclorama tables missing`);
    return;
  }
  const hasLocale = await columnExists(knex, entityTable, 'locale');
  if (!hasLocale) {
    console.log(`  [skip] ${entityTable}.locale missing (not i18n-shaped)`);
    return;
  }

  const enEntries = await knex(entityTable).where('locale', 'en').select('id', 'document_id', 'locale');
  if (enEntries.length === 0) {
    console.log(`  [skip] no EN cyclorama entries`);
    return;
  }

  for (const entityRow of enEntries) {
    console.log(`  -> cyclorama EN entity_id=${entityRow.id} (document_id=${entityRow.document_id})`);
    await translateField(knex, {
      entityTable,
      linkTable,
      componentTable: 'components_shared_specs',
      componentType: 'shared.spec',
      field: 'specs',
      entityRow,
      dictionary: CYCLORAMA_SPECS_EN,
      label: 'specs',
    });
    await translateField(knex, {
      entityTable,
      linkTable,
      componentTable: 'components_shared_localized_items',
      componentType: 'shared.localized-item',
      field: 'usages',
      entityRow,
      dictionary: CYCLORAMA_USAGES_EN,
      label: 'usages',
    });
  }
}

async function translateMachines(knex) {
  const entityTable = 'machines';
  const linkTable = 'machines_cmps';

  if (!(await tableExists(knex, entityTable)) || !(await tableExists(knex, linkTable))) {
    console.log(`  [skip] machine tables missing`);
    return;
  }
  const hasLocale = await columnExists(knex, entityTable, 'locale');
  const hasSlug = await columnExists(knex, entityTable, 'slug');
  if (!hasLocale || !hasSlug) {
    console.log(`  [skip] machines.locale or machines.slug missing`);
    return;
  }

  const enEntries = await knex(entityTable)
    .where('locale', 'en')
    .select('id', 'document_id', 'slug', 'locale');
  if (enEntries.length === 0) {
    console.log(`  [skip] no EN machine entries`);
    return;
  }

  for (const entityRow of enEntries) {
    const dictionary = MACHINE_SPECS_EN[entityRow.slug];
    if (!dictionary) {
      console.log(`  [skip] no EN dictionary for machine slug='${entityRow.slug}'`);
      continue;
    }
    console.log(`  -> machine '${entityRow.slug}' EN entity_id=${entityRow.id}`);
    await translateField(knex, {
      entityTable,
      linkTable,
      componentTable: 'components_shared_specs',
      componentType: 'shared.spec',
      field: 'specs',
      entityRow,
      dictionary,
      label: 'specs',
    });
  }
}

async function up(knex) {
  console.log('\n=== EDO-211 follow-up — Populate EN translations on plateau components ===\n');
  try {
    await translateCyclorama(knex);
  } catch (err) {
    console.error(`  ERROR translating cyclorama: ${err.message}`);
  }
  try {
    await translateMachines(knex);
  } catch (err) {
    console.error(`  ERROR translating machines: ${err.message}`);
  }
  console.log('\n=== Migration complete ===\n');
}

async function down() {
  console.log('Rollback not supported. To revert, restore FR-derived EN content via the previous migration’s duplication logic or re-run the seed.');
}

module.exports = { up, down };
