#!/usr/bin/env node

/**
 * One-shot fix for the bad migration produced by migrate-pricing-to-rows.mjs.
 *
 * The parser in the original script assumed the legacy `pricing` string was
 * formatted as "label / amount" (e.g. "5h / € 650"), but the actual prod
 * format is "amount / label" (e.g. "650€ / 5h" or "160€ / 1 heure"). As a
 * result, every migrated row has the price stored in `label` (e.g. "120€"),
 * the duration in `note` (e.g. "1 heure"), and `amount = null`.
 *
 * This script re-parses the legacy strings correctly and overwrites the
 * existing pricingRows / priceRows with the right structure:
 *   - label   : the duration / tier name ("1 heure", "Demi-journée", "5h"…)
 *   - amount  : the numeric price (160, 650…) — null for "Sur demande" / quote
 *   - kind    : "unit" or "quote"
 *   - note    : null (the legacy data never had a real note here)
 *
 * For post-production-types, prices follow "À partir de 7,90€" / "Sur devis"
 * (FR) and "From €7.90" / "On quote" (EN). The `priceRows` component is not
 * itself i18n-localized but its inner `label` field is, so we PUT FR then EN
 * to update the localized label.
 *
 * Run with: STRAPI_TOKEN=… node strapi/scripts/fix-pricing-rows.mjs
 */

const STRAPI_URL = process.env.STRAPI_URL || 'https://cms.e-do.studio';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

if (!STRAPI_TOKEN) {
  console.error('STRAPI_TOKEN env var required');
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

// "650€ / 5h" or "€650 / 5 hours" → { amount: 650, label: '5h' }
// "Sur demande / 10h éditorial" → { amount: null, kind: 'quote', label: '10h éditorial' }
// "On request / 10 hours editorial" → idem
function parsePricingRow(part) {
  const m = part.match(/^(.+?)\s*\/\s*(.+)$/);
  if (!m) return { label: part, amount: null, kind: 'quote', note: null };
  const priceText = m[1].trim();
  const label = m[2].trim();
  if (/sur\s*(demande|devis)|on\s*request|on\s*quote/i.test(priceText)) {
    return { label, amount: null, kind: 'quote', note: null };
  }
  // "650€" / "€650" / "1 120€" / "€1,120"
  const num = priceText.match(/[\d][\d\s,.]*/);
  if (!num) return { label, amount: null, kind: 'unit', note: null };
  const n = Number(num[0].replace(/\s/g, '').replace(',', '.'));
  return {
    label,
    amount: Number.isFinite(n) ? n : null,
    kind: 'unit',
    note: null,
  };
}

function parsePricingString(pricing) {
  if (!pricing) return [];
  return pricing.split(' · ').map((p) => p.trim()).filter(Boolean).map(parsePricingRow);
}

// "À partir de 7,90€" → { label: 'À partir de', amount: 7.90 }
// "From €7.90"        → { label: 'From',        amount: 7.90 }
// "Sur devis" / "On quote" → quote row, label = the source text
function parsePriceText(text) {
  if (!text) return null;
  const trimmed = text.trim();
  if (/sur\s*(demande|devis)|on\s*quote|on\s*request/i.test(trimmed)) {
    return { label: trimmed, amount: null, kind: 'quote', note: null };
  }
  const m = trimmed.match(/^(à partir de|à partir|from)\s*(.+)$/i);
  const label = m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : 'Tarif';
  const amountText = m ? m[2] : trimmed;
  const num = amountText.match(/[\d][\d\s,.]*/);
  if (!num) return { label, amount: null, kind: 'unit', note: null };
  const n = Number(num[0].replace(/\s/g, '').replace(',', '.'));
  return {
    label,
    amount: Number.isFinite(n) ? n : null,
    kind: 'unit',
    note: null,
  };
}

async function fixMachines() {
  console.log('\n=== machines.pricingRows ===');
  const [fr, en] = await Promise.all([
    api('machines?locale=fr&fields[0]=slug&fields[1]=pricing&pagination[pageSize]=200'),
    api('machines?locale=en&fields[0]=slug&fields[1]=pricing&pagination[pageSize]=200'),
  ]);
  const enById = new Map((en.data ?? []).map((e) => [e.documentId, e]));
  for (const m of fr.data ?? []) {
    const rowsFr = parsePricingString(m.pricing);
    if (rowsFr.length === 0) {
      console.log(`  ${m.slug}: no legacy pricing, skipped`);
      continue;
    }
    await api(`machines/${m.documentId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: { pricingRows: rowsFr } }),
    });
    const enItem = enById.get(m.documentId);
    if (enItem?.pricing) {
      const rowsEn = parsePricingString(enItem.pricing);
      await api(`machines/${m.documentId}?locale=en`, {
        method: 'PUT',
        body: JSON.stringify({ data: { pricingRows: rowsEn } }),
      });
    }
    console.log(`  ✓ ${m.slug}: ${rowsFr.length} row(s) rewritten`);
  }
}

async function fixPostProd() {
  console.log('\n=== post-production-types.priceRows ===');
  const [fr, en] = await Promise.all([
    api('post-production-types?locale=fr&fields[0]=slug&fields[1]=price&pagination[pageSize]=200'),
    api('post-production-types?locale=en&fields[0]=slug&fields[1]=price&pagination[pageSize]=200'),
  ]);
  const enById = new Map((en.data ?? []).map((e) => [e.documentId, e]));
  for (const p of fr.data ?? []) {
    const rowFr = parsePriceText(p.price);
    if (!rowFr) {
      console.log(`  ${p.slug}: no legacy price, skipped`);
      continue;
    }
    await api(`post-production-types/${p.documentId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: { priceRows: [rowFr] } }),
    });
    const enItem = enById.get(p.documentId);
    if (enItem?.price) {
      const rowEn = parsePriceText(enItem.price);
      if (rowEn) {
        await api(`post-production-types/${p.documentId}?locale=en`, {
          method: 'PUT',
          body: JSON.stringify({ data: { priceRows: [rowEn] } }),
        });
      }
    }
    console.log(`  ✓ ${p.slug}: label="${rowFr.label}" amount=${rowFr.amount} kind=${rowFr.kind}`);
  }
}

async function main() {
  console.log(`Strapi: ${STRAPI_URL}`);
  await fixMachines();
  await fixPostProd();
  console.log('\n=== done ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
