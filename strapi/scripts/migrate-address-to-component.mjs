#!/usr/bin/env node

/**
 * Manual migration: copy site-setting.{street,city,postalCode,country,latitude,longitude}
 * into the new structured `address` component (shared.postal-address) introduced
 * by the postal-address PR.
 *
 * Run order:
 *   1. Take a DB backup.
 *   2. STRAPI_URL=https://cms.e-do.studio STRAPI_TOKEN=<full-access-token> \
 *        node strapi/scripts/migrate-address-to-component.mjs
 *   3. Verify in admin (Réglages du site → Adresse postale).
 *   4. Once everything looks good and the site has been live with the new
 *      structured field for a while, drop the legacy `street/city/postalCode/
 *      country/fullAddress` columns in a follow-up schema PR.
 *
 * Idempotent: skipped if `address` is already populated.
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

const COUNTRY_ALLOWED = new Set(['FR', 'BE', 'CH', 'LU', 'MC', 'DE', 'ES', 'IT', 'GB', 'US']);

function normalizeCountry(value) {
  if (!value) return 'FR';
  const trimmed = String(value).trim();
  // Accept ISO-2 (FR), ISO-3 (FRA), or full names (France).
  const upper = trimmed.toUpperCase();
  if (COUNTRY_ALLOWED.has(upper)) return upper;
  if (/^FRANCE$/i.test(trimmed) || /^FRA$/.test(upper)) return 'FR';
  if (/^BELG/i.test(trimmed)) return 'BE';
  if (/^SUI?SS|^CHE$/i.test(trimmed)) return 'CH';
  if (/^LUX/i.test(trimmed)) return 'LU';
  if (/^MONACO/i.test(trimmed)) return 'MC';
  if (/^ALLEM|^DEU/i.test(trimmed)) return 'DE';
  if (/^ESP|^SPAIN/i.test(trimmed)) return 'ES';
  if (/^ITAL/i.test(trimmed)) return 'IT';
  if (/^UNITED\s*KINGDOM|^UK$|^GBR/i.test(trimmed)) return 'GB';
  if (/^UNITED\s*STATES|^US$|^USA$/i.test(trimmed)) return 'US';
  return 'OTHER';
}

async function api(path, opts = {}) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  const res = await fetch(url, { headers, ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || 'GET'} /api/${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`Strapi: ${STRAPI_URL}`);
  const res = await api('site-setting?locale=fr&populate=address');
  const data = res.data;
  if (!data) {
    console.log('site-setting has no entry; nothing to do.');
    return;
  }
  if (data.address) {
    console.log('address already populated; skipped.');
    return;
  }
  if (!data.street || !data.city || !data.postalCode) {
    console.log('Legacy address fields are incomplete (street/city/postalCode required); skipped.');
    return;
  }

  const payload = {
    address: {
      street: data.street,
      city: data.city,
      postalCode: String(data.postalCode),
      country: normalizeCountry(data.country),
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    },
  };

  await api('site-setting?locale=fr', {
    method: 'PUT',
    body: JSON.stringify({ data: payload }),
  });
  console.log(`✓ wrote address component on FR locale (country=${payload.address.country}).`);

  // Address is non-localized in nature; we don't replicate to EN.
  console.log('=== done ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
