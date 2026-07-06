// Deno tests for the past-slot guard shared by createBooking (front) and
// prepareBooking (chat).
//
// Run with:  deno test supabase/functions/chat/booking_test.ts
//
// Backstop for the regression where a slot already elapsed (e.g. today @ 10h
// confirmed at 18:22) was written straight through. The studio runs on
// Europe/Paris wall-clock time, so the guard resolves "now" in Paris — these
// assertions pin that, including the near-midnight rollover and the summer
// UTC+2 offset.

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isSlotInPast } from "../../../src/lib/booking-engine.ts";

// 18:22 Europe/Paris on 6 Jul 2026 (UTC+2 in summer → 16:22 UTC).
const NOW = new Date("2026-07-06T16:22:00Z");

Deno.test("rejects the reported bug: today @ 10h evaluated at 18:22 Paris", () => {
  assert(isSlotInPast("2026-07-06", 10, NOW));
});

Deno.test("rejects the current Paris hour (arrival == now hour is too late)", () => {
  assert(isSlotInPast("2026-07-06", 18, NOW));
});

Deno.test("allows a slot still ahead later today", () => {
  assert(!isSlotInPast("2026-07-06", 19, NOW));
});

Deno.test("rejects any earlier day regardless of hour", () => {
  assert(isSlotInPast("2026-07-05", 15, NOW));
  assert(isSlotInPast("2026-06-30", 9, NOW));
});

Deno.test("allows future days", () => {
  assert(!isSlotInPast("2026-07-07", 9, NOW));
  assert(!isSlotInPast("2026-08-01", 10, NOW));
});

Deno.test("accepts DateSelection (0-based month) as well as ISO strings", () => {
  // 6 Jul 2026 @ 10h → month index 6.
  assert(isSlotInPast({ y: 2026, m: 6, d: 6 }, 10, NOW));
  assert(!isSlotInPast({ y: 2026, m: 6, d: 7 }, 10, NOW));
});

Deno.test("uses Paris wall-clock near midnight, not the host/UTC day", () => {
  const lateNow = new Date("2026-07-06T21:30:00Z"); // 23:30 Paris, still 6 Jul
  assert(isSlotInPast("2026-07-06", 22, lateNow));
  assert(!isSlotInPast("2026-07-07", 9, lateNow));
});

Deno.test("a today slot with no committed hour is not yet past", () => {
  assert(!isSlotInPast("2026-07-06", null, NOW));
});
