'use strict';

/**
 * EDO-254 follow-up — backfill `specs` on the restored cyclorama machine row.
 *
 * Context
 * -------
 * `2026.05.27T13.00.00.machines-restore-cyclorama-row.js` recreated the
 * `slug='cyclorama'` rows in `machines` after EDO-241's drop migration had
 * removed them on prod. The restore migration copies component links from
 * the legacy `cycloramas` single-type when present, but the single-type
 * schema NEVER carried a `specs` field — only `pricing_description` and
 * `usages`. As a result the restored cyclorama row has an empty
 * `components_shared_specs` link list, and the front-end's
 * « Caractéristiques » block renders blank (Thomas: « Ok par contre les
 * caractéristiques ne sont pas chargés »).
 *
 * `MACHINE_USES['cyclorama']` in `src/lib/strapi.ts` masks the same
 * problem for usages because there's a per-slug fallback dictionary. There
 * was no equivalent for specs — this PR adds one as a belt-and-braces
 * safety net (see `MACHINE_SPECS['cyclorama']` in `src/lib/strapi.ts`), but
 * the canonical fix is to make the data exist in Strapi so editors can
 * curate it from the admin.
 *
 * Fix
 * ---
 * For every `machines/cyclorama` row that has NO `field='specs'` links in
 * `machines_cmps`, insert the canonical 10 spec rows (in the matching
 * locale) into `components_shared_specs` and link them in `machines_cmps`.
 * Strapi 5 stores localized component data on per-locale link lists, so
 * each locale gets its own freshly inserted component rows.
 *
 * Idempotent: a second run finds the existing links and skips.
 */

const ENTITY_TABLE = 'machines';
const LINK_TABLE = 'machines_cmps';
const COMPONENT_TABLE = 'components_shared_specs';
const COMPONENT_TYPE = 'shared.spec';
const FIELD = 'specs';
const SLUG = 'cyclorama';

// Match the seed (`strapi/scripts/seed-content.mjs::seedMachines`) and the
// EN-translation migration (`2026.05.26T12.00.00.plateau-populate-en-translations.js`).
const SPECS = {
  fr: [
    { label: 'Surface', value: '240 m² · Cyclo 2 faces 32 m²' },
    { label: 'Dimensions', value: '6,3m L × 5,2m l × 5m H' },
    { label: 'Éclairage naturel', value: 'Skydomes occultable' },
    { label: 'Accès', value: 'Quai de livraison 3,5m L × 4,5m H' },
    { label: 'Extérieur', value: 'Accès direct, parking sur place' },
    { label: 'Électricité', value: '1 prise Marechal 63A triphasée · 15 prises 16A' },
    { label: 'Connectivité & son', value: 'Wi-Fi très haut débit · Sound system intégré' },
    { label: 'Maquillage', value: '2 postes maquillage équipés' },
    { label: 'Habillage', value: "2 cabines d'essayage" },
    { label: 'Cuisine', value: 'Entièrement équipée' },
  ],
  en: [
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

async function tableExists(knex, table) {
  return knex.schema.hasTable(table);
}

async function listColumns(knex, table) {
  return Object.keys(await knex(table).columnInfo());
}

async function detectOrderColumn(knex, table) {
  for (const name of ['order', 'cmp_order']) {
    if (await knex.schema.hasColumn(table, name)) return name;
  }
  return null;
}

async function backfillLocale(knex, { machineId, locale, componentCols, linkCols, orderCol }) {
  const existing = await knex(LINK_TABLE)
    .where({ entity_id: machineId, field: FIELD, component_type: COMPONENT_TYPE })
    .count({ n: '*' })
    .first();
  if (Number(existing?.n ?? 0) > 0) {
    console.log(`  [skip] machines/${SLUG}/${locale} already has ${FIELD} links (${existing.n})`);
    return 0;
  }

  const specs = SPECS[locale];
  if (!specs) {
    console.log(`  [skip] no spec dictionary for locale=${locale}`);
    return 0;
  }

  // Insert one component row per spec, then a matching link row.
  const componentInserts = specs.map((s) => {
    const row = { label: s.label, value: s.value };
    for (const key of Object.keys(row)) {
      if (!componentCols.includes(key)) delete row[key];
    }
    return row;
  });

  const insertedCmpIds = [];
  for (const row of componentInserts) {
    const result = await knex(COMPONENT_TABLE).insert(row).returning('id');
    const id = typeof result[0] === 'object' ? result[0].id : result[0];
    insertedCmpIds.push(id);
  }

  const linkInserts = insertedCmpIds.map((cmpId, index) => {
    const row = {
      entity_id: machineId,
      cmp_id: cmpId,
      component_type: COMPONENT_TYPE,
      field: FIELD,
      [orderCol]: index + 1,
    };
    for (const key of Object.keys(row)) {
      if (!linkCols.includes(key)) delete row[key];
    }
    return row;
  });

  await knex(LINK_TABLE).insert(linkInserts);
  console.log(`  -> inserted ${linkInserts.length} ${FIELD} link(s) for machines/${SLUG}/${locale}`);
  return linkInserts.length;
}

async function up(knex) {
  console.log('\n=== EDO-254 follow-up — Backfill cyclorama specs ===\n');

  for (const t of [ENTITY_TABLE, LINK_TABLE, COMPONENT_TABLE]) {
    if (!(await tableExists(knex, t))) {
      console.log(`[skip] table ${t} missing — schema is unexpected.`);
      return;
    }
  }

  const hasSlug = await knex.schema.hasColumn(ENTITY_TABLE, 'slug');
  const hasLocale = await knex.schema.hasColumn(ENTITY_TABLE, 'locale');
  if (!hasSlug || !hasLocale) {
    console.log(`[skip] ${ENTITY_TABLE}.slug or .locale missing — schema is unexpected.`);
    return;
  }

  const orderCol = await detectOrderColumn(knex, LINK_TABLE);
  if (!orderCol) {
    console.log(`[skip] ${LINK_TABLE} has no order column — aborting to avoid scrambling slot order.`);
    return;
  }

  const cyclorama = await knex(ENTITY_TABLE).where('slug', SLUG).select('id', 'locale');
  if (cyclorama.length === 0) {
    console.log(`[skip] no ${ENTITY_TABLE}/${SLUG} row found — nothing to backfill.`);
    return;
  }

  const componentCols = await listColumns(knex, COMPONENT_TABLE);
  const linkCols = await listColumns(knex, LINK_TABLE);

  let total = 0;
  for (const row of cyclorama) {
    total += await backfillLocale(knex, {
      machineId: row.id,
      locale: row.locale ?? 'fr',
      componentCols,
      linkCols,
      orderCol,
    });
  }

  if (total === 0) {
    console.log('  [ok] cyclorama specs already populated — nothing to do.');
  } else {
    console.log(`  [done] backfilled ${total} spec link(s) across locales.`);
  }
}

async function down() {
  console.log('[edo-254-specs] down is not supported; remove the spec rows manually if needed.');
}

module.exports = { up, down };
