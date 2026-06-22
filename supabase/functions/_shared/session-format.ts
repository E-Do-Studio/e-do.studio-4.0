// Display helpers shared by the booking confirmation email (renderers.ts) and
// the calendar .ics / CalDAV builders (ical.ts).
//
// The cyclorama is billed by "mode", not by the hour: cyclo_mode `halfH` = 5 h,
// `fullH` / `editorial` = 10 h. A cyclo session's `hours` column keeps its slot
// default (often 1, or a stray value inherited from a classic stage) and its
// `slot_type` is meaningless — so every surface derives the real duration from
// the mode. The front already does this (book-page.tsx, booking-engine.ts:426);
// these helpers carry the same rule into the email + calendar layer.

export function effectiveSessionHours(
  plateauKey: string,
  cycloMode: string | null | undefined,
  rawHours: number | null | undefined,
): number {
  if (plateauKey === "cyclorama") return cycloMode === "halfH" ? 5 : 10;
  return rawHours ?? 0;
}

// Human label for the slot. Emails are FR-only, so the cyclo labels are the
// French ones from the configurator tiles (Step3Slot). Non-cyclo stages keep
// their raw slot_type (`hour` / `half` / `full`).
export function sessionSlotLabel(
  plateauKey: string,
  cycloMode: string | null | undefined,
  slotType: string,
): string {
  if (plateauKey !== "cyclorama") return slotType;
  if (cycloMode === "halfH") return "demi-journée";
  if (cycloMode === "editorial") return "éditorial";
  return "journée";
}
