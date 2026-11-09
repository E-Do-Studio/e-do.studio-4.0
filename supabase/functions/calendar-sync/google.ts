// Google Calendar API v3 transport.
//
// Auth is a service account: the studio calendar is shared with the service
// account address as a writer, so there is no consent screen and no refresh
// token that can expire. Google's CalDAV endpoint would have required OAuth 2.0
// anyway — Basic auth (what iCloud accepted) is not an option there.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar";

export interface GoogleCredentials {
  calendarId: string;
  clientEmail: string;
  privateKey: string;
}

export interface CalendarResult {
  ok: boolean;
  status: number;
  detail: string;
}

export type GoogleEventTime = { dateTime: string; timeZone: string } | { date: string };

export interface GoogleEvent {
  summary: string;
  description: string;
  location: string;
  status: "confirmed" | "tentative";
  start?: GoogleEventTime;
  end?: GoogleEventTime;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const buffer = new ArrayBuffer(binary.length);
  const der = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) der[i] = binary.charCodeAt(i);
  return buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(creds: GoogleCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // Refresh early: the reconcile cron hits this function every 2 minutes.
  if (cachedToken && cachedToken.expiresAt > now + 300) return cachedToken.token;

  const encoder = new TextEncoder();
  const header = base64Url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64Url(encoder.encode(JSON.stringify({
    iss: creds.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })));
  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(creds.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signingInput)),
  );

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${base64Url(signature)}`,
    }),
  });

  const text = await res.text();
  let payload: { access_token?: string; expires_in?: number; error?: string; error_description?: string } = {};
  try {
    payload = JSON.parse(text);
  } catch { /* non-JSON error page */ }

  if (!res.ok || !payload.access_token) {
    throw new Error(
      `google token ${res.status}: ${payload.error_description ?? payload.error ?? text.slice(0, 200)}`,
    );
  }

  cachedToken = { token: payload.access_token, expiresAt: now + (payload.expires_in ?? 3600) };
  return payload.access_token;
}

/**
 * Google event ids must match `[a-v0-9]{5,1024}`, which the iCal UID
 * (`EDO-R-XXXXXX-<uuid>@e-do.studio`) does not. A SHA-256 hex digest is
 * deterministic and stays inside that charset, so pushes remain idempotent
 * without storing a provider-side id.
 */
export async function eventIdFor(uid: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(uid));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function toResult(res: Response, alsoOk: number[] = []): Promise<CalendarResult> {
  const text = await res.text().catch(() => "");
  if (res.ok || alsoOk.includes(res.status)) return { ok: true, status: res.status, detail: "" };

  let message = text.slice(0, 300);
  try {
    message = JSON.parse(text)?.error?.message ?? message;
  } catch { /* keep the raw body */ }
  return { ok: false, status: res.status, detail: message || res.statusText };
}

/**
 * A bad key or an unreachable API must surface as a recorded sync failure, not
 * as an uncaught throw — the caller writes `calendar_sync_error` from this
 * result and the alert cron reads it. Status 0 means "never reached Google".
 */
async function guard(run: () => Promise<CalendarResult>): Promise<CalendarResult> {
  try {
    return await run();
  } catch (err) {
    return { ok: false, status: 0, detail: err instanceof Error ? err.message : String(err) };
  }
}

export function upsertEvent(
  creds: GoogleCredentials,
  eventId: string,
  event: GoogleEvent,
): Promise<CalendarResult> {
  return guard(async () => {
    const token = await getAccessToken(creds);
    const calendar = encodeURIComponent(creds.calendarId);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const inserted = await toResult(
      await fetch(`${API_BASE}/calendars/${calendar}/events`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...event, id: eventId }),
      }),
    );
    if (inserted.ok || inserted.status !== 409) return inserted;

    // 409: that id already exists (re-push, or an event we previously deleted).
    // Overwrite it — the update also revives a cancelled event.
    return toResult(
      await fetch(`${API_BASE}/calendars/${calendar}/events/${eventId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(event),
      }),
    );
  });
}

export function deleteEvent(
  creds: GoogleCredentials,
  eventId: string,
): Promise<CalendarResult> {
  return guard(async () => {
    const token = await getAccessToken(creds);
    const calendar = encodeURIComponent(creds.calendarId);

    // 404/410: already gone. Deleting stays idempotent, as it was over CalDAV.
    return toResult(
      await fetch(`${API_BASE}/calendars/${calendar}/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
      [404, 410],
    );
  });
}
