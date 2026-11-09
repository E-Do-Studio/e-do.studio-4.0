// Journaux du service : une ligne JSON sur stdout (docker logs) et, quand un
// jeton PostHog est posé, la même ligne dans PostHog Logs (OTLP/HTTP), gardée
// et cherchable d'un déploiement à l'autre — comme etouch (service.name).
import { scrubbed } from './posthog.ts';

type Level = 'info' | 'warn' | 'error' | 'fatal';
const SEVERITY: Record<Level, number> = { info: 9, warn: 13, error: 17, fatal: 21 };

interface Record_ {
  t: number;
  level: Level;
  msg: string;
  extra: Record<string, unknown>;
}

let buffer: Record_[] = [];
let endpoint: { url: string; token: string; version: string } | null = null;

export function startLogShipping(opts: { host: string; token: string | undefined; version: string }) {
  if (!opts.token) return;
  endpoint = { url: `${opts.host}/i/v1/logs`, token: opts.token, version: opts.version };
  setInterval(() => void flushLogs(), 5000).unref();
}

const attr = (key: string, value: unknown) => ({
  key,
  value:
    typeof value === 'number'
      ? Number.isInteger(value)
        ? { intValue: value }
        : { doubleValue: value }
      : typeof value === 'boolean'
        ? { boolValue: value }
        : { stringValue: typeof value === 'string' ? scrubbed(value, 2000) : scrubbed(JSON.stringify(value), 2000) },
});

export async function flushLogs(): Promise<void> {
  if (!endpoint || buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${endpoint.token}` },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        resourceLogs: [
          {
            resource: {
              attributes: [
                attr('service.name', 'edo-booking'),
                attr('service.version', endpoint.version),
                attr('deployment.environment', 'production'),
              ],
            },
            scopeLogs: [
              {
                scope: { name: 'edo-booking' },
                logRecords: batch.map((r) => ({
                  timeUnixNano: String(r.t * 1_000_000),
                  severityNumber: SEVERITY[r.level],
                  severityText: r.level.toUpperCase(),
                  body: { stringValue: r.msg },
                  attributes: Object.entries(r.extra).map(([k, v]) => attr(k, v)),
                })),
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) console.error(JSON.stringify({ msg: 'PostHog Logs refusé', status: res.status }));
  } catch {
    // PostHog injoignable : les lignes restent sur stdout, rien ne s'arrête.
  }
}

export function log(msg: string, extra: Record<string, unknown> = {}, level: Level = 'info'): void {
  const t = Date.now();
  console.log(JSON.stringify({ t: new Date(t).toISOString(), level, msg, ...extra }));
  if (endpoint) {
    buffer.push({ t, level, msg, extra });
    if (buffer.length > 2000) buffer = buffer.slice(-2000);
  }
}
