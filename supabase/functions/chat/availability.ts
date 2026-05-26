// Availability lookup for the E-DO chatbot.
//
// Privacy contract (EDO-220):
//   - Only non-PII columns are SELECTed from `bookings` / `booking_sessions`.
//   - After fetch, every projection is passed through `sanitizeBookingProjection`
//     which discards any key not on `BOOKING_FIELD_WHITELIST` /
//     `SESSION_FIELD_WHITELIST`. This is defense-in-depth: even if the SELECT
//     is later widened by mistake, no PII can reach the LLM.
//   - The block we hand back to the system prompt contains only computed FREE
//     slots (date, plateau, hour range, duration). No raw booking rows.
//   - User input is never interpolated into the SQL: queries are parameterized
//     via the supabase-js builder and the date window is built from validated
//     primitives only.

// ─── Types ────────────────────────────────────────────────────────────────

export type Lang = "fr" | "en";

export type PlateauKey = "horizontal" | "vertical" | "eclipse" | "live" | "cyclorama";

export const PLATEAU_KEYS: readonly PlateauKey[] = [
  "horizontal",
  "vertical",
  "eclipse",
  "live",
  "cyclorama",
];

export interface SafeBookingProjection {
  preferred_date: string;
  arrival_hour: number;
  booking_sessions: { plateau_key: PlateauKey | string; hours: number }[];
}

export interface AvailabilityIntent {
  wantsAvailability: boolean;
  plateauKey: PlateauKey | null;
  windowStart: string; // YYYY-MM-DD
  windowEnd: string;   // YYYY-MM-DD (inclusive)
  minHours: number;
  lang: Lang;
}

export interface FreeSlot {
  date: string;        // YYYY-MM-DD
  plateau_key: PlateauKey;
  start_hour: number;  // 9..18
  end_hour: number;    // start_hour + duration_hours
  duration_hours: number;
}

export interface AvailabilityResult {
  slots: FreeSlot[];
  /** "next-free" slots returned because the requested window was full. */
  fallback: boolean;
  /** The window we ended up scanning, possibly extended past the user's ask. */
  scannedFrom: string;
  scannedTo: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

export const STUDIO_OPEN_HOUR = 9;
export const STUDIO_CLOSE_HOUR = 19;
export const DEFAULT_WINDOW_DAYS = 14;
export const MAX_WINDOW_DAYS = 60;
export const MAX_SLOTS_RETURNED = 6;

/**
 * Allow-list of booking columns the availability lookup may handle.
 * Anything else is dropped before the data is used in any downstream computation.
 * IMPORTANT: do not add `client_*`, `notes`, `total_estimate`, `project_type`,
 * `urgency`, `reference`, `id` or any other identifying field here.
 */
export const BOOKING_FIELD_WHITELIST: ReadonlySet<string> = new Set([
  "preferred_date",
  "arrival_hour",
  "booking_sessions",
]);

/**
 * Allow-list of booking_sessions columns. Same rules apply.
 */
export const SESSION_FIELD_WHITELIST: ReadonlySet<string> = new Set([
  "plateau_key",
  "hours",
]);

// ─── PII guard ────────────────────────────────────────────────────────────

/**
 * Strip every key that is not on the allow-list. Returns null if the row is
 * unusable (no preferred_date or no arrival_hour). Caller must use ONLY the
 * returned object — never the original.
 */
export function sanitizeBookingProjection(row: unknown): SafeBookingProjection | null {
  if (!row || typeof row !== "object") return null;
  const src = row as Record<string, unknown>;

  const preferred_date = src["preferred_date"];
  const arrival_hour = src["arrival_hour"];
  const sessions = src["booking_sessions"];

  if (typeof preferred_date !== "string") return null;
  if (typeof arrival_hour !== "number" || !Number.isFinite(arrival_hour)) return null;

  // Detect any extra key — never include it, but log for monitoring.
  for (const k of Object.keys(src)) {
    if (!BOOKING_FIELD_WHITELIST.has(k)) {
      // eslint-disable-next-line no-console
      console.warn(`[availability] dropping non-whitelisted booking field: ${k}`);
    }
  }

  const safeSessions: { plateau_key: string; hours: number }[] = [];
  if (Array.isArray(sessions)) {
    for (const s of sessions) {
      if (!s || typeof s !== "object") continue;
      const sObj = s as Record<string, unknown>;
      for (const k of Object.keys(sObj)) {
        if (!SESSION_FIELD_WHITELIST.has(k)) {
          // eslint-disable-next-line no-console
          console.warn(`[availability] dropping non-whitelisted session field: ${k}`);
        }
      }
      const pk = sObj["plateau_key"];
      const hh = sObj["hours"];
      if (typeof pk !== "string") continue;
      if (typeof hh !== "number" || !Number.isFinite(hh) || hh <= 0) continue;
      safeSessions.push({ plateau_key: pk, hours: hh });
    }
  }

  return {
    preferred_date,
    arrival_hour: Math.floor(arrival_hour),
    booking_sessions: safeSessions,
  };
}

// ─── Intent parser ────────────────────────────────────────────────────────

const AVAILABILITY_TRIGGERS = [
  // FR
  "dispo", "dispos", "disponibilité", "disponibilites", "disponibilités",
  "creneau", "creneaux", "créneau", "créneaux",
  "libre", "libres",
  "agenda", "calendrier",
  "réserver", "reserver", "réservation", "reservation",
  // EN
  "available", "availability", "free slot", "free slots", "slot", "slots",
  "open", "openings", "book a", "booking",
  "schedule", "calendar",
];

const PLATEAU_ALIASES: Array<[PlateauKey, RegExp]> = [
  ["cyclorama", /\b(cyclo|cyclorama)\b/i],
  ["horizontal", /\b(horizontal|packshot)\b/i],
  ["vertical", /\b(vertical|ghost|mannequin)\b/i],
  ["eclipse", /\b(eclipse|chauss|shoes|accessoir|accessor)\b/i],
  ["live", /\b(live|on[-\s]?model|portée|porte)\b/i],
];

const FR_WEEKDAYS: Record<string, number> = {
  // Day-of-week → 0=Sun … 6=Sat
  "dimanche": 0, "lundi": 1, "mardi": 2, "mercredi": 3,
  "jeudi": 4, "vendredi": 5, "samedi": 6,
};
const EN_WEEKDAYS: Record<string, number> = {
  "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3,
  "thursday": 4, "friday": 5, "saturday": 6,
};

const FR_MONTHS: Record<string, number> = {
  "janvier": 0, "fevrier": 1, "février": 1, "mars": 2, "avril": 3, "mai": 4,
  "juin": 5, "juillet": 6, "aout": 7, "août": 7, "septembre": 8, "octobre": 9,
  "novembre": 10, "decembre": 11, "décembre": 11,
};
const EN_MONTHS: Record<string, number> = {
  "january": 0, "february": 1, "march": 2, "april": 3, "may": 4, "june": 5,
  "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11,
};

function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function nextWeekday(from: Date, target: number): Date {
  const cur = from.getUTCDay();
  let delta = (target - cur + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(from, delta);
}

function nfd(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}+/gu, "");
}

/**
 * Cheap, deterministic intent detection — no LLM round-trip. Returns
 * `wantsAvailability: false` whenever the message clearly isn't about the
 * calendar, so we never hit the database for unrelated turns.
 *
 * `now` is injectable so this is unit-testable.
 */
export function detectAvailabilityIntent(
  message: string,
  lang: Lang,
  now: Date = new Date(),
): AvailabilityIntent {
  const text = nfd(message);
  const wants = AVAILABILITY_TRIGGERS.some((t) => text.includes(nfd(t)));

  let plateau: PlateauKey | null = null;
  for (const [k, re] of PLATEAU_ALIASES) {
    if (re.test(message)) { plateau = k; break; }
  }

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let start = addDays(today, 1); // default: tomorrow
  let end = addDays(start, DEFAULT_WINDOW_DAYS - 1);

  // Relative anchors
  if (/\b(demain|tomorrow)\b/i.test(message)) {
    start = addDays(today, 1);
    end = start;
  } else if (/\b(aujourd'?hui|today)\b/i.test(message)) {
    start = today;
    end = today;
  } else if (/\b(apres[-\s]?demain|day\s+after\s+tomorrow)\b/i.test(text)) {
    start = addDays(today, 2);
    end = start;
  } else if (/\b(weekend|week-end|fin\s+de\s+semaine)\b/i.test(text)) {
    // Next Sat..Sun
    const sat = nextWeekday(today, 6);
    start = sat;
    end = addDays(sat, 1);
  } else if (/\b(semaine\s+prochaine|next\s+week)\b/i.test(text)) {
    const mon = nextWeekday(today, 1);
    start = mon;
    end = addDays(mon, 6);
  } else if (/\b(mois\s+prochain|next\s+month)\b/i.test(text)) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    start = d;
    end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  } else {
    // Single weekday mention
    const weekdays = { ...FR_WEEKDAYS, ...EN_WEEKDAYS };
    for (const [name, idx] of Object.entries(weekdays)) {
      const re = new RegExp(`\\b${name}\\b`, "i");
      if (re.test(text)) {
        const d = nextWeekday(today, idx);
        start = d;
        end = d;
        break;
      }
    }

    // Explicit "the 5th of June" / "June 5"
    const months = { ...FR_MONTHS, ...EN_MONTHS };
    const monthNames = Object.keys(months).join("|");
    const reFr = new RegExp(`(\\d{1,2})\\s+(${monthNames})`, "i");
    const reEn = new RegExp(`(${monthNames})\\s+(\\d{1,2})`, "i");
    const mFr = text.match(reFr);
    const mEn = text.match(reEn);
    let day: number | null = null;
    let month: number | null = null;
    if (mFr) { day = parseInt(mFr[1], 10); month = months[mFr[2].toLowerCase()]; }
    else if (mEn) { month = months[mEn[1].toLowerCase()]; day = parseInt(mEn[2], 10); }
    if (day && month != null && day >= 1 && day <= 31) {
      let year = today.getUTCFullYear();
      const candidate = new Date(Date.UTC(year, month, day));
      if (candidate < today) {
        year += 1;
      }
      const d = new Date(Date.UTC(year, month, day));
      start = d;
      end = d;
    }
  }

  // Duration hints
  let minHours = 1;
  const halfDay = /\b(demi[-\s]?journee|half[-\s]?day)\b/i.test(text);
  const fullDay = /\b(journee\s+entiere|journee\s+complete|toute\s+la\s+journee|full[-\s]?day|all\s+day)\b/i.test(text);
  if (halfDay) minHours = 4;
  if (fullDay) minHours = 8;
  const hMatch = text.match(/(\d{1,2})\s*(?:h|heures?|hours?)/);
  if (hMatch) {
    const n = parseInt(hMatch[1], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 10) minHours = n;
  }

  // Clamp the window
  const maxEnd = addDays(today, MAX_WINDOW_DAYS);
  if (end > maxEnd) end = maxEnd;
  if (end < start) end = start;

  return {
    wantsAvailability: wants,
    plateauKey: plateau,
    windowStart: isoDate(start),
    windowEnd: isoDate(end),
    minHours,
    lang,
  };
}

// ─── Slot computation ─────────────────────────────────────────────────────

function dayRange(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const start = new Date(`${fromISO}T00:00:00Z`);
  const end = new Date(`${toISO}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    out.push(isoDate(d));
  }
  return out;
}

/** Pure, side-effect-free slot calculator — easy to test. */
export function computeFreeSlots(
  rows: SafeBookingProjection[],
  opts: { from: string; to: string; plateauKey: PlateauKey | null; minHours: number },
): FreeSlot[] {
  const minHours = Math.max(1, Math.floor(opts.minHours));
  const plateaus: PlateauKey[] = opts.plateauKey ? [opts.plateauKey] : [...PLATEAU_KEYS];

  // Build per-day, per-plateau occupied hour sets.
  const occupied: Map<string, Set<number>> = new Map();
  const key = (date: string, plateau: string) => `${date}::${plateau}`;
  for (const r of rows) {
    if (!r.preferred_date || r.arrival_hour == null) continue;
    const totalHours = r.booking_sessions.reduce((s, x) => s + (x.hours || 0), 0);
    if (totalHours <= 0) continue;
    const arr = r.arrival_hour;
    const end = Math.min(STUDIO_CLOSE_HOUR, arr + totalHours);
    const sessionsByPlateau = new Set(r.booking_sessions.map((s) => s.plateau_key));
    for (const p of sessionsByPlateau) {
      const k = key(r.preferred_date, p);
      let set = occupied.get(k);
      if (!set) { set = new Set(); occupied.set(k, set); }
      for (let h = arr; h < end; h++) set.add(h);
    }
  }

  const out: FreeSlot[] = [];
  for (const date of dayRange(opts.from, opts.to)) {
    for (const p of plateaus) {
      const occ = occupied.get(key(date, p)) ?? new Set<number>();
      // Walk the hours, emit each maximal free [start, start+minHours) anchor.
      for (let start = STUDIO_OPEN_HOUR; start + minHours <= STUDIO_CLOSE_HOUR; start++) {
        let fits = true;
        for (let h = start; h < start + minHours; h++) {
          if (occ.has(h)) { fits = false; break; }
        }
        if (fits) {
          out.push({
            date,
            plateau_key: p,
            start_hour: start,
            end_hour: start + minHours,
            duration_hours: minHours,
          });
          // Skip ahead so we don't emit overlapping anchors back-to-back —
          // we want a handful of distinct slot suggestions, not every hour.
          start += minHours - 1;
        }
      }
    }
  }
  return out;
}

// ─── Database fetch ───────────────────────────────────────────────────────

interface MinimalSupabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

/**
 * Pull only the columns we need, then run every row through the whitelist.
 * If the SELECT ever drifts to include PII, the sanitizer drops it before the
 * data leaves this module.
 */
export async function fetchSafeBookings(
  client: MinimalSupabaseClient,
  from: string,
  to: string,
  plateauKey: PlateauKey | null,
): Promise<SafeBookingProjection[]> {
  let query = client
    .from("bookings")
    // ── STRICT PROJECTION — do not add PII columns here. ──
    .select("preferred_date, arrival_hour, booking_sessions!inner(plateau_key, hours)")
    .in("status", ["pending", "confirmed"])
    .not("preferred_date", "is", null)
    .gte("preferred_date", from)
    .lte("preferred_date", to);

  if (plateauKey) {
    query = query.eq("booking_sessions.plateau_key", plateauKey);
  }

  const { data, error } = await query;
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[availability] supabase error", error);
    return [];
  }

  const out: SafeBookingProjection[] = [];
  for (const r of (data ?? []) as unknown[]) {
    const safe = sanitizeBookingProjection(r);
    if (safe) out.push(safe);
  }
  return out;
}

// ─── Public entry point ──────────────────────────────────────────────────

/** Try the requested window first; if empty, search forward up to MAX_WINDOW_DAYS. */
export async function getAvailability(
  client: MinimalSupabaseClient,
  intent: AvailabilityIntent,
  now: Date = new Date(),
): Promise<AvailabilityResult> {
  const safeRows = await fetchSafeBookings(
    client,
    intent.windowStart,
    intent.windowEnd,
    intent.plateauKey,
  );

  const initial = computeFreeSlots(safeRows, {
    from: intent.windowStart,
    to: intent.windowEnd,
    plateauKey: intent.plateauKey,
    minHours: intent.minHours,
  }).slice(0, MAX_SLOTS_RETURNED);

  if (initial.length > 0) {
    return {
      slots: initial,
      fallback: false,
      scannedFrom: intent.windowStart,
      scannedTo: intent.windowEnd,
    };
  }

  // Fallback: extend forward until we find something or hit MAX_WINDOW_DAYS.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const fallbackFrom = intent.windowEnd;
  const fallbackTo = isoDate(addDays(today, MAX_WINDOW_DAYS));
  if (fallbackFrom >= fallbackTo) {
    return { slots: [], fallback: true, scannedFrom: intent.windowStart, scannedTo: intent.windowEnd };
  }

  const fbRows = await fetchSafeBookings(client, fallbackFrom, fallbackTo, intent.plateauKey);
  const fbSlots = computeFreeSlots(fbRows, {
    from: fallbackFrom,
    to: fallbackTo,
    plateauKey: intent.plateauKey,
    minHours: intent.minHours,
  }).slice(0, MAX_SLOTS_RETURNED);

  return {
    slots: fbSlots,
    fallback: true,
    scannedFrom: intent.windowStart,
    scannedTo: fallbackTo,
  };
}

// ─── Prompt formatting ────────────────────────────────────────────────────

const PLATEAU_LABELS_FR: Record<PlateauKey, string> = {
  horizontal: "Plateau Horizontal",
  vertical: "Plateau Vertical",
  eclipse: "Plateau Eclipse",
  live: "Plateau Live",
  cyclorama: "Cyclorama",
};
const PLATEAU_LABELS_EN: Record<PlateauKey, string> = {
  horizontal: "Horizontal stage",
  vertical: "Vertical stage",
  eclipse: "Eclipse stage",
  live: "Live stage",
  cyclorama: "Cyclorama",
};

function fmtHour(h: number, lang: Lang): string {
  if (lang === "en") {
    const suffix = h < 12 ? "am" : "pm";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}${suffix}`;
  }
  return `${h}h`;
}

function fmtDate(iso: string, lang: Lang): string {
  // Stable, locale-flavoured rendering without relying on Intl runtime data.
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const dayNamesFr = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const dayNamesEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthsFr = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dn = lang === "en" ? dayNamesEn : dayNamesFr;
  const mn = lang === "en" ? monthsEn : monthsFr;
  return `${dn[d.getUTCDay()]} ${d.getUTCDate()} ${mn[d.getUTCMonth()]}`;
}

/** Final, safe text block injected in the system prompt. */
export function formatAvailabilityForPrompt(
  result: AvailabilityResult,
  intent: AvailabilityIntent,
  bookingPageUrl: string,
): string {
  const lang = intent.lang;
  const labels = lang === "en" ? PLATEAU_LABELS_EN : PLATEAU_LABELS_FR;

  if (result.slots.length === 0) {
    return lang === "en"
      ? `# AVAILABILITY (server-truth)
No free slots were found between ${result.scannedFrom} and ${result.scannedTo}.
Direct the visitor to ${bookingPageUrl} so they can pick another window themselves.`
      : `# DISPONIBILITÉS (vérité serveur)
Aucun créneau libre trouvé entre le ${result.scannedFrom} et le ${result.scannedTo}.
Renvoie la personne vers ${bookingPageUrl} pour choisir une autre fenêtre.`;
  }

  const lines = result.slots.map((s) => {
    const label = labels[s.plateau_key as PlateauKey] ?? s.plateau_key;
    return `- ${fmtDate(s.date, lang)} · ${fmtHour(s.start_hour, lang)}–${fmtHour(s.end_hour, lang)} · ${label}`;
  });

  const header = lang === "en"
    ? `# AVAILABILITY (server-truth)
The list below was produced by querying the booking calendar with a strict slot-only projection. **No client data is present and you MUST NOT invent or imply any.** Propose at most 3 of these slots, pick those that best match the user's stated window/plateau, and always end with a booking link.`
    : `# DISPONIBILITÉS (vérité serveur)
La liste ci-dessous provient du calendrier de réservation avec une projection stricte « créneaux seulement ». **Aucune donnée client n'est présente et tu NE DOIS JAMAIS en inventer ni en suggérer.** Propose au maximum 3 créneaux parmi ceux-ci, choisis ceux qui collent le mieux à la fenêtre/au plateau demandés, et termine toujours par un lien de réservation.`;

  const fallbackNote = result.fallback
    ? (lang === "en"
      ? `\n(No slots were free in the user's requested window — these are the next free openings.)`
      : `\n(Aucun créneau libre dans la fenêtre demandée — voici les prochaines ouvertures.)`)
    : "";

  const bookingHint = lang === "en"
    ? `\nBooking page: ${bookingPageUrl}`
    : `\nPage de réservation : ${bookingPageUrl}`;

  return `${header}${fallbackNote}\n\n${lines.join("\n")}\n${bookingHint}`;
}
