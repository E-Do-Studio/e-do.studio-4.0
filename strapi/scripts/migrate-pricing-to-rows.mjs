#!/usr/bin/env node

/**
 * Manual migration: parses the legacy `pricing` / `operatorPricing` / `price`
 * string fields into structured `pricingRows` / `operatorPricingRows` /
 * `priceRows` component rows on the Strapi side.
 *
 * Run order (per environment):
 *   1. Take a DB backup.
 *   2. STRAPI_URL=https://cms.e-do.studio STRAPI_TOKEN=<full-access-token> \
 *        node strapi/scripts/migrate-pricing-to-rows.mjs
 *   3. Visually verify in the admin that pricingRows look correct.
 *   4. Once frontend (PR with this script) is deployed, the website will
 *      switch to reading the new structured rows.
 *   5. After a stabilisation period, drop the legacy `pricing` / `price`
 *      columns in a follow-up schema change + data fix.
 *
 * Idempotent: if `pricingRows` already has entries for an item, that item is
 * skipped (no double-write).
 *
 * Format expected on the legacy strings:
 *   - Pricing (machine, cyclorama):  "5h / € 650 · 10h / € 880 · 10h éditorial / Sur demande"
 *     (rows separated by ' · ', label/amount split by '/' or ':')
 *   - Price (post-production-type):  "À partir de 7,90€"  or  "Sur devis"
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

async function api(path, opts = {}) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  const res = await fetch(url, { headers, ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || 'GET'} /api/${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

function parseAmount(text) {
  if (!text) return { amount: null, kind: 'quote' };
  const trimmed = String(text).trim();
  if (/sur\s*(demande|devis)|on\s*request|to\s*be\s*quoted/i.test(trimmed)) {
    return { amount: null, kind: 'quote' };
  }
  const m = trimmed.match(/([\d\s]+(?:[.,]\d+)?)\s*€/);
  if (!m) return { amount: null, kind: 'unit' };
  const n = Number(m[1].replace(/\s/g, '').replace(',', '.'));
  return { amount: Number.isFinite(n) ? n : null, kind: 'unit' };
}

function parsePricingString(pricing) {
  // "5h / € 650 · 10h / € 880" → [{label: '5h', amount: 650}, ...]
  if (!pricing) return [];
  const parts = pricing.split(' · ').map((p) => p.trim()).filter(Boolean);
  return parts.map((part) => {
    const m = part.match(/^(.+?)\s*[/:]\s*(.+)$/);
    if (!m) return { label: part, amount: null, kind: 'quote', note: null };
    const label = m[1].trim();
    const valueText = m[2].trim();
    const { amount, kind } = parseAmount(valueText);
    return {
      label,
      amount,
      kind,
      note: amount == null ? valueText : null,
    };
  });
}

function parsePriceString(price) {
  // "À partir de 7,90€" → [{label: 'À partir de', amount: 7.9}], or "Sur devis" → [{kind: 'quote'}]
  if (!price) return [];
  const trimmed = price.trim();
  const onQuote = /sur\s*(demande|devis)/i.test(trimmed);
  if (onQuote) return [{ label: trimmed, amount: null, kind: 'quote', note: null }];
  const fromMatch = trimmed.match(/^(à partir de|à partir|from)\s*(.+)$/i);
  const labelGuess = fromMatch ? fromMatch[1].charAt(0).toUpperCase() + fromMatch[1].slice(1) : 'Tarif';
  const amountText = fromMatch ? fromMatch[2] : trimmed;
  const { amount } = parseAmount(amountText);
  return [{ label: labelGuess, amount, kind: 'unit', note: null }];
}

async function migrateCollection({
  collection,
  legacyField,
  legacyEnField,
  rowsField,
  parser,
}) {
  console.log(`\n=== ${collection}.${legacyField} → ${rowsField} ===`);
  const frRes = await api(`${collection}?locale=fr&populate=${rowsField}&pagination[pageSize]=200`);
  const enRes = await api(`${collection}?locale=en&populate=${rowsField}&pagination[pageSize]=200`).catch(() => ({ data: [] }));

  const enById = new Map();
  for (const e of enRes.data ?? []) {
    enById.set(e.documentId ?? e.id, e);
  }

  let migrated = 0;
  let skipped = 0;
  for (const item of frRes.data ?? []) {
    const docId = item.documentId ?? item.id;
    const existingRows = item[rowsField] ?? [];
    if (existingRows.length > 0) {
      skipped++;
      continue;
    }
    const legacyFr = item[legacyField];
    if (!legacyFr) {
      skipped++;
      continue;
    }
    const enItem = enById.get(docId);
    const legacyEn = enItem?.[legacyEnField ?? legacyField] ?? legacyFr;

    const rowsFr = parser(legacyFr);
    const rowsEn = parser(legacyEn);

    if (rowsFr.length === 0) {
      skipped++;
      continue;
    }

    await api(`${collection}/${docId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: { [rowsField]: rowsFr } }),
    });
    if (legacyEn && rowsEn.length > 0) {
      await api(`${collection}/${docId}?locale=en`, {
        method: 'PUT',
        body: JSON.stringify({ data: { [rowsField]: rowsEn } }),
      }).catch((err) => console.warn(`  warn: EN update for ${collection}/${docId} failed: ${err.message}`));
    }
    console.log(`  ✓ ${collection}/${docId}: ${rowsFr.length} row(s) written`);
    migrated++;
  }

  console.log(`  Done. migrated=${migrated} skipped=${skipped}`);
}

async function migrateSingle({ singleType, legacyField, rowsField, parser }) {
  console.log(`\n=== ${singleType}.${legacyField} (single) → ${rowsField} ===`);
  const frRes = await api(`${singleType}?locale=fr&populate=${rowsField}`);
  const enRes = await api(`${singleType}?locale=en&populate=${rowsField}`).catch(() => ({ data: null }));
  const itemFr = frRes.data;
  const itemEn = enRes.data;
  if (!itemFr) {
    console.log('  no entry; skipped.');
    return;
  }
  if ((itemFr[rowsField] ?? []).length > 0) {
    console.log('  already populated; skipped.');
    return;
  }
  const rowsFr = parser(itemFr[legacyField]);
  if (rowsFr.length === 0) {
    console.log('  legacy field empty; skipped.');
    return;
  }
  await api(`${singleType}?locale=fr`, {
    method: 'PUT',
    body: JSON.stringify({ data: { [rowsField]: rowsFr } }),
  });
  if (itemEn?.[legacyField]) {
    const rowsEn = parser(itemEn[legacyField]);
    await api(`${singleType}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: { [rowsField]: rowsEn } }),
    }).catch((err) => console.warn(`  warn: EN update failed: ${err.message}`));
  }
  console.log(`  ✓ wrote ${rowsFr.length} row(s).`);
}

async function main() {
  console.log(`Strapi: ${STRAPI_URL}`);

  await migrateCollection({
    collection: 'machines',
    legacyField: 'pricing',
    rowsField: 'pricingRows',
    parser: parsePricingString,
  });

  await migrateCollection({
    collection: 'machines',
    legacyField: 'operatorPricing',
    rowsField: 'operatorPricingRows',
    parser: parsePricingString,
  });

  await migrateSingle({
    singleType: 'cyclorama',
    legacyField: 'pricing',
    rowsField: 'pricingRows',
    parser: parsePricingString,
  });

  await migrateCollection({
    collection: 'post-production-types',
    legacyField: 'price',
    rowsField: 'priceRows',
    parser: parsePriceString,
  });

  console.log('\n=== migration complete ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
