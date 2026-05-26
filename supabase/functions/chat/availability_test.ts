// Deno tests for the availability tool used by the chatbot.
//
// Run with:  deno test --allow-env supabase/functions/chat/availability_test.ts
//
// These tests are the security backstop for EDO-220: every assertion that
// references PII keys (`client_name`, `client_email`, `notes`, etc.) MUST
// stay green. If you change the whitelist, update the tests in lockstep.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BOOKING_FIELD_WHITELIST,
  SESSION_FIELD_WHITELIST,
  computeFreeSlots,
  detectAvailabilityIntent,
  fetchSafeBookings,
  formatAvailabilityForPrompt,
  getAvailability,
  sanitizeBookingProjection,
} from "./availability.ts";

// ─── Fake supabase client ──────────────────────────────────────────────────
//
// Mirrors the chainable builder shape the real client returns so the code
// under test runs unchanged. The fake records the SELECT string and returns
// whatever rows the test provided, so we can prove that:
//   1) the SELECT never asks for PII columns; and
//   2) even if the backend handed back PII, sanitizeBookingProjection drops it.

interface FakeQueryRecord {
  table: string;
  select: string;
  filters: Array<[string, ...unknown[]]>;
}

function fakeClient(rows: unknown[]) {
  const record: FakeQueryRecord = { table: "", select: "", filters: [] };
  const builder = {
    select(s: string) { record.select = s; return this; },
    in(...args: unknown[]) { record.filters.push(["in", ...args]); return this; },
    not(...args: unknown[]) { record.filters.push(["not", ...args]); return this; },
    gte(...args: unknown[]) { record.filters.push(["gte", ...args]); return this; },
    lte(...args: unknown[]) { record.filters.push(["lte", ...args]); return this; },
    eq(...args: unknown[]) { record.filters.push(["eq", ...args]); return this; },
    then(resolve: (v: { data: unknown[]; error: null }) => void) {
      resolve({ data: rows, error: null });
    },
  };
  const client = {
    from(table: string) { record.table = table; return builder; },
  };
  return { client, record };
}

// ─── PII whitelist ─────────────────────────────────────────────────────────

Deno.test("whitelist excludes every known PII column", () => {
  const piiColumns = [
    "id", "reference", "status",
    "client_name", "client_email", "client_company", "client_siren", "client_phone",
    "project_type", "urgency", "total_estimate", "notes",
    "created_at", "updated_at",
  ];
  for (const c of piiColumns) {
    assert(!BOOKING_FIELD_WHITELIST.has(c), `BOOKING_FIELD_WHITELIST must not contain ${c}`);
  }
  const piiSessionColumns = [
    "id", "booking_id", "slot_type", "cyclo_mode", "product_type",
    "method", "submethod", "media", "views", "views_count", "quantity",
    "postprod_enabled", "postprod_video", "created_at",
  ];
  for (const c of piiSessionColumns) {
    assert(!SESSION_FIELD_WHITELIST.has(c), `SESSION_FIELD_WHITELIST must not contain ${c}`);
  }
});

Deno.test("sanitizeBookingProjection drops PII even when the backend leaks it", () => {
  // Pretend the backend returned a row WITH client PII attached.
  const poisoned = {
    preferred_date: "2026-06-04",
    arrival_hour: 10,
    booking_sessions: [
      { plateau_key: "cyclorama", hours: 4, product_type: "ecom", method: "packshot", notes: "internal" },
    ],
    // PII fields that MUST be stripped:
    client_name: "Jean Dupont",
    client_email: "jean@example.com",
    client_phone: "+33611111111",
    client_company: "ACME SAS",
    notes: "Confidential brief",
    total_estimate: 1850,
    reference: "BK-12345",
  };

  const safe = sanitizeBookingProjection(poisoned)!;
  assert(safe, "expected a safe projection");
  assertEquals(Object.keys(safe).sort(), ["arrival_hour", "booking_sessions", "preferred_date"]);
  // No PII present at all.
  const json = JSON.stringify(safe);
  for (const needle of ["Jean Dupont", "jean@example.com", "+33611111111", "ACME", "BK-12345", "Confidential", "1850"]) {
    assert(!json.includes(needle), `sanitized output must not contain "${needle}", got: ${json}`);
  }
  // Sessions also stripped to just plateau_key + hours.
  assertEquals(safe.booking_sessions, [{ plateau_key: "cyclorama", hours: 4 }]);
});

Deno.test("sanitizeBookingProjection rejects unusable rows", () => {
  assertEquals(sanitizeBookingProjection(null), null);
  assertEquals(sanitizeBookingProjection({}), null);
  assertEquals(sanitizeBookingProjection({ preferred_date: "2026-06-04" }), null);
  assertEquals(
    sanitizeBookingProjection({ preferred_date: "2026-06-04", arrival_hour: "morning" }),
    null,
  );
});

// ─── DB fetch: SELECT projection contract ──────────────────────────────────

Deno.test("fetchSafeBookings never asks the DB for PII columns", async () => {
  const { client, record } = fakeClient([]);
  await fetchSafeBookings(client, "2026-06-01", "2026-06-30", null);
  // The SELECT must mention only safe columns.
  assert(record.select.includes("preferred_date"));
  assert(record.select.includes("arrival_hour"));
  assert(record.select.includes("booking_sessions"));
  for (const banned of ["client_name", "client_email", "client_phone", "client_company", "client_siren", "notes", "total_estimate", "reference", "id", "project_type"]) {
    assert(!record.select.includes(banned), `SELECT must not include ${banned}, got: ${record.select}`);
  }
});

Deno.test("fetchSafeBookings end-to-end strips PII if DB leaks", async () => {
  const { client } = fakeClient([
    {
      preferred_date: "2026-06-04",
      arrival_hour: 10,
      client_name: "LEAK",
      client_email: "leak@evil.test",
      notes: "should not appear",
      booking_sessions: [
        { plateau_key: "cyclorama", hours: 4, internal_note: "secret" },
      ],
    },
  ]);
  const rows = await fetchSafeBookings(client, "2026-06-01", "2026-06-30", null);
  const json = JSON.stringify(rows);
  for (const needle of ["LEAK", "leak@evil.test", "should not appear", "internal_note", "secret"]) {
    assert(!json.includes(needle), `fetchSafeBookings output must not contain "${needle}"`);
  }
});

// ─── Slot computation ──────────────────────────────────────────────────────

Deno.test("computeFreeSlots returns full grid when no bookings exist", () => {
  const slots = computeFreeSlots([], {
    from: "2026-06-04",
    to: "2026-06-04",
    plateauKey: "cyclorama",
    minHours: 4,
  });
  // Studio is 9..19 with min=4h → anchors 9,13 (next stride after the first
  // emitted anchor advances by minHours). At minimum 2 anchors per day.
  assert(slots.length >= 2);
  for (const s of slots) {
    assertEquals(s.plateau_key, "cyclorama");
    assertEquals(s.date, "2026-06-04");
    assertEquals(s.duration_hours, 4);
    assert(s.start_hour >= 9 && s.end_hour <= 19);
  }
});

Deno.test("computeFreeSlots excludes overlapping booked hours", () => {
  // Booking 10..14 on cyclorama 2026-06-04 → no 4h slot starting at 9 or 10.
  const slots = computeFreeSlots(
    [
      {
        preferred_date: "2026-06-04",
        arrival_hour: 10,
        booking_sessions: [{ plateau_key: "cyclorama", hours: 4 }],
      },
    ],
    { from: "2026-06-04", to: "2026-06-04", plateauKey: "cyclorama", minHours: 4 },
  );
  for (const s of slots) {
    // No proposed slot overlaps [10,14).
    assert(s.end_hour <= 10 || s.start_hour >= 14);
  }
});

Deno.test("computeFreeSlots scopes occupation to the right plateau", () => {
  // Same booking on cyclorama must not block the horizontal stage.
  const slots = computeFreeSlots(
    [
      {
        preferred_date: "2026-06-04",
        arrival_hour: 10,
        booking_sessions: [{ plateau_key: "cyclorama", hours: 4 }],
      },
    ],
    { from: "2026-06-04", to: "2026-06-04", plateauKey: "horizontal", minHours: 4 },
  );
  assert(slots.some((s) => s.start_hour === 9), "horizontal stage should still be free at 9h");
});

// ─── Intent detection ──────────────────────────────────────────────────────

const FROZEN_NOW = new Date(Date.UTC(2026, 4, 26)); // Tuesday 26 May 2026

Deno.test("detectAvailabilityIntent: French — 'jeudi après-midi'", () => {
  const i = detectAvailabilityIntent("avez-vous des dispos jeudi après-midi ?", "fr", FROZEN_NOW);
  assert(i.wantsAvailability);
  assertEquals(i.windowStart, "2026-05-28");
  assertEquals(i.windowEnd, "2026-05-28");
});

Deno.test("detectAvailabilityIntent: English — 'available next week, cyclorama'", () => {
  const i = detectAvailabilityIntent("Anything available next week on the cyclorama?", "en", FROZEN_NOW);
  assert(i.wantsAvailability);
  assertEquals(i.plateauKey, "cyclorama");
  assertEquals(i.windowStart, "2026-06-01"); // next Monday
});

Deno.test("detectAvailabilityIntent: half-day hint sets 4h minimum", () => {
  const i = detectAvailabilityIntent("Une demi-journée jeudi sur l'horizontal, c'est dispo ?", "fr", FROZEN_NOW);
  assert(i.wantsAvailability);
  assertEquals(i.minHours, 4);
  assertEquals(i.plateauKey, "horizontal");
});

Deno.test("detectAvailabilityIntent: unrelated question never queries the calendar", () => {
  const i = detectAvailabilityIntent("Quels sont vos tarifs cyclorama ?", "fr", FROZEN_NOW);
  assert(!i.wantsAvailability);
});

// ─── End-to-end: PII fuzz over getAvailability + prompt block ──────────────

Deno.test("getAvailability end-to-end: prompt block never contains injected PII", async () => {
  const piiNeedles = [
    "Marie Curie", "marie@evil.test", "+33612345678", "ACME SAS", "BK-99999",
    "Confidential brief", "300", "1850",
  ];

  const { client } = fakeClient([
    {
      preferred_date: "2026-05-28",
      arrival_hour: 10,
      booking_sessions: [{ plateau_key: "cyclorama", hours: 4 }],
      client_name: "Marie Curie",
      client_email: "marie@evil.test",
      client_phone: "+33612345678",
      client_company: "ACME SAS",
      reference: "BK-99999",
      notes: "Confidential brief",
      total_estimate: 1850,
    },
  ]);

  const intent = detectAvailabilityIntent("dispos jeudi cyclorama ?", "fr", FROZEN_NOW);
  assert(intent.wantsAvailability);

  const result = await getAvailability(client, intent, FROZEN_NOW);
  const block = formatAvailabilityForPrompt(result, intent, "https://e-do.studio/fr/reserver");

  for (const needle of piiNeedles) {
    assert(!block.includes(needle), `prompt block must not contain "${needle}"`);
  }
  assert(block.includes("Cyclorama"));
  assert(block.includes("https://e-do.studio/fr/reserver"));
});

Deno.test("getAvailability fallback note appears when window is full", async () => {
  // Block every hour of the 4-day default window on the cyclorama.
  const fullDay = (date: string) => ({
    preferred_date: date,
    arrival_hour: 9,
    booking_sessions: [{ plateau_key: "cyclorama", hours: 10 }],
  });
  const rows: unknown[] = [];
  const start = new Date(Date.UTC(2026, 4, 27));
  for (let i = 0; i < 14; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    rows.push(fullDay(d.toISOString().slice(0, 10)));
  }
  const { client } = fakeClient(rows);

  const intent = detectAvailabilityIntent("dispos cette semaine sur le cyclorama ?", "fr", FROZEN_NOW);
  // Force window to the fully-booked range
  intent.windowStart = "2026-05-27";
  intent.windowEnd = "2026-06-09";
  intent.plateauKey = "cyclorama";

  const result = await getAvailability(client, intent, FROZEN_NOW);
  // The fallback flag should fire (no slots in window). It may still return
  // empty slots if the search horizon hits the cap, which is fine — the test
  // only asserts the boolean and a present, PII-free block.
  assertEquals(result.fallback, true);
  const block = formatAvailabilityForPrompt(result, intent, "https://e-do.studio/fr/reserver");
  assert(block.includes("Aucun") || block.includes("prochaines"));
  // No identifying client data should appear (we tolerate the word "client"
  // in the FR header that warns the LLM not to leak it).
  for (const banned of ["client_name", "client_email", "client_phone", "@", "+33", "BK-", "SAS"]) {
    assert(!block.includes(banned), `block must not contain "${banned}"`);
  }
});
