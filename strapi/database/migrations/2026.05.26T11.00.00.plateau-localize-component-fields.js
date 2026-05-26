'use strict';

/**
 * EDO-211 — Localize component fields on plateau content types.
 *
 * Context
 * -------
 * `cyclorama` and `machine` are i18n-enabled, but their component attributes
 * (`specs`, `usages`, `pricingRows`, `operatorPricingRows`) were not marked
 * as `localized: true` at the parent attribute level. In Strapi 5 the inner
 * `localized: true` on a shared component's attributes is a no-op unless the
 * parent attribute is also localized — so FR and EN locale entries ended up
 * sharing the same set of component instances. Switching the language on
 * the plateau page therefore left the « caractéristiques » block unchanged.
 *
 * The schema files now mark those component attributes localized. This
 * migration repairs the existing data: for every documentId that has both
 * an FR and an EN locale entry, where the EN locale's component links point
 * at the same `cmp_id`s as the FR locale's (i.e. they share instances), it
 * duplicates the component rows so the EN locale gets its own independent
 * copy. Values are copied from FR as a baseline — editors then translate
 * them in the admin without affecting FR content.
 *
 * Idempotent: rows that are already locale-independent are skipped.
 */

const TARGETS = [
  {
    table: 'cycloramas',
    linkTable: 'cycloramas_cmps',
    fields: [
      { field: 'specs', componentType: 'shared.spec', componentTable: 'components_shared_specs' },
      { field: 'usages', componentType: 'shared.localized-item', componentTable: 'components_shared_localized_items' },
      { field: 'pricingRows', componentType: 'shared.pricing-row', componentTable: 'components_shared_pricing_rows' },
    ],
  },
  {
    table: 'machines',
    linkTable: 'machines_cmps',
    fields: [
      { field: 'specs', componentType: 'shared.spec', componentTable: 'components_shared_specs' },
      { field: 'pricingRows', componentType: 'shared.pricing-row', componentTable: 'components_shared_pricing_rows' },
      { field: 'operatorPricingRows', componentType: 'shared.pricing-row', componentTable: 'components_shared_pricing_rows' },
    ],
  },
];

async function tableExists(knex, table) {
  return knex.schema.hasTable(table);
}

async function columnExists(knex, table, column) {
  return knex.schema.hasColumn(table, column);
}

async function listColumns(knex, table) {
  const info = await knex(table).columnInfo();
  return Object.keys(info);
}

async function duplicateComponentRow(knex, componentTable, componentId, columns) {
  const [row] = await knex(componentTable).where('id', componentId).select('*');
  if (!row) return null;
  const insertable = { ...row };
  delete insertable.id;
  // Remove unknown columns defensively (Knex insert is strict on some drivers).
  for (const key of Object.keys(insertable)) {
    if (!columns.includes(key)) delete insertable[key];
  }
  const [inserted] = await knex(componentTable).insert(insertable).returning('id');
  return typeof inserted === 'object' ? inserted.id : inserted;
}

async function splitSharedComponents(knex, { table, linkTable, fields }) {
  const hasTable = await tableExists(knex, table);
  if (!hasTable) {
    console.log(`  [skip] ${table} does not exist`);
    return;
  }
  const hasLink = await tableExists(knex, linkTable);
  if (!hasLink) {
    console.log(`  [skip] ${linkTable} does not exist`);
    return;
  }
  const hasLocale = await columnExists(knex, table, 'locale');
  const hasDocumentId = await columnExists(knex, table, 'document_id');
  if (!hasLocale || !hasDocumentId) {
    console.log(`  [skip] ${table} is not i18n-shaped (locale/document_id missing)`);
    return;
  }

  const entries = await knex(table).select('id', 'document_id', 'locale');
  // Group entries by document_id so we can pair FR and EN siblings.
  const byDoc = new Map();
  for (const row of entries) {
    if (!row.document_id) continue;
    if (!byDoc.has(row.document_id)) byDoc.set(row.document_id, []);
    byDoc.get(row.document_id).push(row);
  }

  for (const { field, componentType, componentTable } of fields) {
    if (!(await tableExists(knex, componentTable))) {
      console.log(`    [skip] component table ${componentTable} missing for field '${field}'`);
      continue;
    }
    const componentColumns = await listColumns(knex, componentTable);
    let splits = 0;
    for (const siblings of byDoc.values()) {
      const fr = siblings.find((s) => s.locale === 'fr');
      const en = siblings.find((s) => s.locale === 'en');
      if (!fr || !en) continue;

      const frLinks = await knex(linkTable)
        .where({ entity_id: fr.id, field, component_type: componentType })
        .orderBy('order', 'asc')
        .select('id', 'cmp_id', 'order');
      const enLinks = await knex(linkTable)
        .where({ entity_id: en.id, field, component_type: componentType })
        .orderBy('order', 'asc')
        .select('id', 'cmp_id', 'order');

      const frIds = new Set(frLinks.map((r) => r.cmp_id));
      const sharedEn = enLinks.filter((r) => frIds.has(r.cmp_id));

      if (sharedEn.length === 0) continue;

      // EN locale currently points at one or more component rows that ALSO
      // back the FR locale. Duplicate each shared row so EN owns its own.
      for (const link of sharedEn) {
        const newId = await duplicateComponentRow(knex, componentTable, link.cmp_id, componentColumns);
        if (!newId) continue;
        await knex(linkTable).where('id', link.id).update({ cmp_id: newId });
        splits++;
      }
    }
    if (splits > 0) {
      console.log(`    -> Split ${splits} shared ${field} component(s) so EN owns its own copy`);
    } else {
      console.log(`    [ok] ${field}: no shared component rows to split`);
    }
  }
}

async function up(knex) {
  console.log('\n=== EDO-211 — Localize plateau component fields ===\n');
  for (const target of TARGETS) {
    console.log(`-> ${target.table}`);
    try {
      await splitSharedComponents(knex, target);
    } catch (err) {
      console.error(`  ERROR processing ${target.table}: ${err.message}`);
    }
  }
  console.log('\n=== Migration complete ===\n');
}

async function down() {
  console.log('Rollback not supported. Duplicated rows would need to be merged back manually.');
}

module.exports = { up, down };
