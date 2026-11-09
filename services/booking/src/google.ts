// Client Google Calendar minimal (API v3 en REST, sans SDK).
import { createSign } from 'node:crypto';
import type { GoogleAuthConfig } from './config.ts';

export interface GoogleEvent {
  id: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
}

/** Ce dont la synchro a besoin ; remplacé par un faux dans les tests. */
export interface CalendarApi {
  /** Crée ou remplace l'événement d'id donné (y compris s'il était supprimé). */
  upsert(event: GoogleEvent): Promise<void>;
  /** `gone` : l'événement n'existait déjà plus. */
  remove(eventId: string): Promise<'deleted' | 'gone'>;
  /** Événements non supprimés qui touchent la fenêtre. */
  list(timeMin: string, timeMax: string): Promise<GoogleEvent[]>;
}

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/calendar';

function serviceAccountAssertion(json: string): string {
  const sa = JSON.parse(json) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256')
    .update(unsigned)
    .sign(sa.private_key)
    .toString('base64url');
  return `${unsigned}.${signature}`;
}

export function createGoogleCalendar(
  calendarId: string,
  auth: GoogleAuthConfig,
  fetchImpl: typeof fetch = fetch,
): CalendarApi {
  let token: { value: string; expiresAt: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 60_000) return token.value;
    const body =
      auth.kind === 'service_account'
        ? new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: serviceAccountAssertion(auth.json),
          })
        : new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: auth.clientId,
            client_secret: auth.clientSecret,
            refresh_token: auth.refreshToken,
          });
    const res = await fetchImpl(TOKEN_URL, { method: 'POST', body });
    if (!res.ok) {
      throw new GoogleApiError(
        res.status,
        `jeton Google refusé (${res.status}) : ${await res.text()}`,
      );
    }
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    token = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return token.value;
  }

  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  async function call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    return res;
  }

  async function fail(res: Response, what: string): Promise<never> {
    throw new GoogleApiError(
      res.status,
      `Google ${what} : ${res.status} ${(await res.text()).slice(0, 500)}`,
    );
  }

  return {
    async upsert(event) {
      // Remplacer d'abord : c'est le cas courant (mise à jour), et PUT
      // ressuscite un événement supprimé du même id.
      const put = await call('PUT', `/${encodeURIComponent(event.id)}`, event);
      if (put.ok) return;
      if (put.status !== 404) await fail(put, `mise à jour de ${event.id}`);
      const ins = await call('POST', '', event);
      if (ins.ok) return;
      if (ins.status === 409) {
        // Créé entre-temps (ou supprimé et gardé par Google) : on remplace.
        const again = await call('PUT', `/${encodeURIComponent(event.id)}`, event);
        if (again.ok) return;
        await fail(again, `remplacement de ${event.id}`);
      }
      await fail(ins, `création de ${event.id}`);
    },

    async remove(eventId) {
      const res = await call('DELETE', `/${encodeURIComponent(eventId)}`);
      if (res.ok) return 'deleted';
      // 410 : déjà supprimé ; 404 : jamais créé.
      if (res.status === 404 || res.status === 410) return 'gone';
      return fail(res, `suppression de ${eventId}`);
    },

    async list(timeMin, timeMax) {
      const out: GoogleEvent[] = [];
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({
          timeMin,
          timeMax,
          singleEvents: 'true',
          showDeleted: 'false',
          maxResults: '2500',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const res = await call('GET', `?${params}`);
        if (!res.ok) await fail(res, 'liste des événements');
        const data = (await res.json()) as {
          items?: GoogleEvent[];
          nextPageToken?: string;
        };
        out.push(...(data.items ?? []));
        pageToken = data.nextPageToken;
      } while (pageToken);
      return out;
    },
  };
}
