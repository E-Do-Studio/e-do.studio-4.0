'use strict';

/**
 * Data migration: moves _fr/_en suffix field data into proper Strapi 5 i18n locale entries.
 *
 * Strategy:
 * 1. For each table with _fr/_en columns, copy _fr values into the base column name
 * 2. Set locale='fr' on all existing rows (Strapi adds locale column on schema sync)
 * 3. Create duplicate rows with _en data and locale='en'
 * 4. Drop the old _fr/_en columns
 *
 * Column names match the Strapi schema attribute names exactly (camelCase).
 * This migration is idempotent — it checks for _fr column existence before running.
 */

// Fields use the exact Strapi attribute names (which become DB column names)
const CONTENT_TYPE_TABLES = [
  {
    table: 'blog_categories',
    fields: ['title', 'description'],
  },
  {
    table: 'blog_posts',
    fields: ['title', 'excerpt', 'body'],
  },
  {
    table: 'cycloramas',
    fields: ['title', 'subtitle', 'description', 'pricing', 'comfortText', 'complementaryServices', 'equipmentRental', 'pricingDescription'],
  },
  {
    table: 'gallery_categories',
    fields: ['name'],
  },
  {
    table: 'machines',
    fields: ['subtitle', 'description', 'pricing', 'operatorPricing'],
  },
  {
    table: 'post_production_types',
    fields: ['title', 'description', 'price'],
  },
  {
    table: 'site_settings',
    fields: ['siteDescription', 'parking', 'hours', 'weekendHours'],
  },
];

const COMPONENT_TABLES = [
  {
    table: 'components_shared_specs',
    fields: ['label', 'value'],
  },
];

async function columnExists(knex, table, column) {
  return knex.schema.hasColumn(table, column);
}

async function tableExists(knex, table) {
  return knex.schema.hasTable(table);
}

async function migrateContentTypeTable(knex, { table, fields }) {
  const exists = await tableExists(knex, table);
  if (!exists) {
    console.log(`  [skip] Table ${table} does not exist`);
    return;
  }

  const hasFrCol = await columnExists(knex, table, `${fields[0]}_fr`);
  if (!hasFrCol) {
    console.log(`  [skip] ${table} already migrated (no ${fields[0]}_fr column)`);
    return;
  }

  console.log(`  -> Migrating ${table} (${fields.length} fields)...`);

  const rows = await knex(table).select('*');
  const hasLocaleCol = await columnExists(knex, table, 'locale');

  if (rows.length > 0) {
    for (const row of rows) {
      const frUpdate = {};
      const enValues = {};

      for (const field of fields) {
        frUpdate[field] = row[`${field}_fr`] || null;
        enValues[field] = row[`${field}_en`] || null;
      }

      if (hasLocaleCol) {
        frUpdate.locale = 'fr';
      }
      await knex(table).where('id', row.id).update(frUpdate);

      const hasEnData = Object.values(enValues).some((v) => v !== null);
      if (hasEnData && hasLocaleCol) {
        const enRow = { ...row };
        delete enRow.id;

        for (const field of fields) {
          enRow[field] = enValues[field];
          delete enRow[`${field}_fr`];
          delete enRow[`${field}_en`];
        }
        enRow.locale = 'en';

        try {
          await knex(table).insert(enRow);
        } catch (err) {
          console.log(`    Warning: could not create EN entry: ${err.message}`);
        }
      }
    }
    console.log(`    Migrated ${rows.length} rows`);
  }

  await knex.schema.alterTable(table, (t) => {
    for (const field of fields) {
      t.dropColumn(`${field}_fr`);
      t.dropColumn(`${field}_en`);
    }
  });
  console.log(`    Dropped ${fields.length * 2} old columns`);
}

async function migrateComponentTable(knex, { table, fields }) {
  const exists = await tableExists(knex, table);
  if (!exists) {
    console.log(`  [skip] Component table ${table} does not exist`);
    return;
  }

  const hasFrCol = await columnExists(knex, table, `${fields[0]}_fr`);
  if (!hasFrCol) {
    console.log(`  [skip] ${table} already migrated`);
    return;
  }

  console.log(`  -> Migrating component ${table} (${fields.length} fields)...`);

  const rows = await knex(table).select('*');
  for (const row of rows) {
    const update = {};
    for (const field of fields) {
      update[field] = row[`${field}_fr`] || null;
    }
    await knex(table).where('id', row.id).update(update);
  }

  if (rows.length > 0) {
    console.log(`    Updated ${rows.length} rows with FR values`);
  }

  await knex.schema.alterTable(table, (t) => {
    for (const field of fields) {
      t.dropColumn(`${field}_fr`);
      t.dropColumn(`${field}_en`);
    }
  });
  console.log(`    Dropped ${fields.length * 2} old columns`);
}

async function migrateLocalizedItem(knex) {
  const table = 'components_shared_localized_items';
  const exists = await tableExists(knex, table);
  if (!exists) return;

  const hasFr = await columnExists(knex, table, 'fr');
  if (!hasFr) {
    console.log(`  [skip] ${table} already migrated`);
    return;
  }

  console.log(`  -> Migrating ${table} (fr/en -> text)...`);
  const rows = await knex(table).select('*');
  for (const row of rows) {
    await knex(table).where('id', row.id).update({ text: row.fr || null });
  }
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('fr');
    t.dropColumn('en');
  });
  console.log(`    Done (${rows.length} rows)`);
}

async function up(knex) {
  console.log('\n=== i18n Suffix Field Data Migration ===\n');

  console.log('--- Content Types ---');
  for (const entry of CONTENT_TYPE_TABLES) {
    try {
      await migrateContentTypeTable(knex, entry);
    } catch (err) {
      console.error(`  ERROR migrating ${entry.table}: ${err.message}`);
    }
  }

  console.log('\n--- Components ---');
  for (const entry of COMPONENT_TABLES) {
    try {
      await migrateComponentTable(knex, entry);
    } catch (err) {
      console.error(`  ERROR migrating component ${entry.table}: ${err.message}`);
    }
  }

  try {
    await migrateLocalizedItem(knex);
  } catch (err) {
    console.error(`  ERROR migrating localized-item: ${err.message}`);
  }

  console.log('\n=== Migration complete ===\n');
}

async function down(knex) {
  console.log('Rollback not supported for i18n migration. Restore from backup.');
}

module.exports = { up, down };
