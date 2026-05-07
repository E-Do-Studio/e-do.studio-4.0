#!/usr/bin/env node

/**
 * Manual migration: parses the legacy `site-setting.hours` and
 * `site-setting.weekendHours` strings into structured `openingHours` rows
 * (one component item per day of the week).
 *
 * Run order:
 *   1. Take a DB backup.
 *   2. STRAPI_URL=https://cms.e-do.studio STRAPI_TOKEN=<full-access-token> \
 *        node strapi/scripts/migrate-hours-to-component.mjs
 *   3. Visually verify in admin (Réglages du site → Horaires d'ouverture).
 *   4. The frontend (PR with this script) already prefers `openingHours`
 *      when populated; legacy fields stay as fallback.
 *
 * Idempotent: skipped if `openingHours` already has rows.
 *
 * Format expected:
 *   - Plain "10:00 — 18:00" / "10h00 - 18h00" → mon–fri row with that range
 *   - "Sur demande" / "On request" → mon–fri marked byAppointment
 *   - weekendHours follows the same rules and applies to sat–sun
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

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKEND = ['saturday', 'sunday'];

async function api(path, opts = {}) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  const res = await fetch(url, { headers, ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || 'GET'} /api/${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

function parseRange(text) {
  if (!text) return null;
  const trimmed = String(text).trim();
  if (!trimmed) return null;
  if (/sur\s*(rendez-vous|demande)|on\s*(appointment|request)|by\s*appointment/i.test(trimmed)) {
    return { byAppointment: true };
  }
  if (/^ferm[ée]|closed$/i.test(trimmed)) {
    return { closed: true };
  }
  // accepts "10:00 — 18:00", "10:00 - 18:00", "10h00-18h00", "10h-18h"
  const m = trimmed.match(/(\d{1,2})[:h](\d{0,2})\s*[—–-]\s*(\d{1,2})[:h](\d{0,2})/);
  if (!m) return null;
  const opensAt = `${m[1].padStart(2, '0')}:${(m[2] || '00').padStart(2, '0')}:00`;
  const closesAt = `${m[3].padStart(2, '0')}:${(m[4] || '00').padStart(2, '0')}:00`;
  return { opensAt, closesAt };
}

function buildRows(weekdayRange, weekendRange) {
  const rows = [];
  if (weekdayRange) {
    for (const day of WEEKDAYS) {
      rows.push({
        dayOfWeek: day,
        opensAt: weekdayRange.opensAt ?? null,
        closesAt: weekdayRange.closesAt ?? null,
        closed: !!weekdayRange.closed,
        byAppointment: !!weekdayRange.byAppointment,
      });
    }
  }
  if (weekendRange) {
    for (const day of WEEKEND) {
      rows.push({
        dayOfWeek: day,
        opensAt: weekendRange.opensAt ?? null,
        closesAt: weekendRange.closesAt ?? null,
        closed: !!weekendRange.closed,
        byAppointment: !!weekendRange.byAppointment,
      });
    }
  }
  return rows;
}

async function main() {
  console.log(`Strapi: ${STRAPI_URL}`);
  const frRes = await api('site-setting?locale=fr&populate=openingHours');
  const frData = frRes.data;
  if (!frData) {
    console.log('site-setting has no entry; nothing to do.');
    return;
  }
  if ((frData.openingHours ?? []).length > 0) {
    console.log('openingHours already populated; skipped.');
    return;
  }
  const weekday = parseRange(frData.hours);
  const weekend = parseRange(frData.weekendHours);
  const rows = buildRows(weekday, weekend);
  if (rows.length === 0) {
    console.log('Could not parse any range from `hours` / `weekendHours`; skipped.');
    return;
  }
  await api('site-setting?locale=fr', {
    method: 'PUT',
    body: JSON.stringify({ data: { openingHours: rows } }),
  });
  console.log(`✓ wrote ${rows.length} opening-hours rows on FR locale.`);

  // Try EN — may be the same data, but let's not assume.
  try {
    const enRes = await api('site-setting?locale=en&populate=openingHours');
    const enData = enRes.data;
    if (enData && (enData.openingHours ?? []).length === 0) {
      const enWeekday = parseRange(enData.hours) ?? weekday;
      const enWeekend = parseRange(enData.weekendHours) ?? weekend;
      const enRows = buildRows(enWeekday, enWeekend);
      await api('site-setting?locale=en', {
        method: 'PUT',
        body: JSON.stringify({ data: { openingHours: enRows } }),
      });
      console.log(`✓ wrote ${enRows.length} opening-hours rows on EN locale.`);
    }
  } catch (err) {
    console.warn(`EN update skipped: ${err.message}`);
  }

  console.log('=== done ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
