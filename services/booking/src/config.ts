import { z } from 'zod';

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  // Clés d'API des appelants privés (etouch, admin), une par appelant :
  // `etouch:<secret>,admin:<secret>`. Le nom sert de `actor_source`.
  BOOKING_API_KEYS: z.string().min(1),
  ALLOWED_ORIGINS: z
    .string()
    .default('https://e-do.studio,https://www.e-do.studio'),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().default('E-Do Studio <contact@e-do.studio>'),
  STUDIO_EMAIL: z.string().default('contact@e-do.studio'),
  // Où partent les alertes ; le studio par défaut.
  ALERT_EMAIL: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().min(1),
  // Compte de service (JSON complet) à qui l'agenda est partagé en écriture…
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  // …ou jeton OAuth d'un compte qui possède l'agenda.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  HUBSPOT_PRIVATE_APP_TOKEN: z.string().optional(),
  // Désactive le worker (instance API seule, ou import).
  WORKER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type GoogleAuthConfig =
  | { kind: 'service_account'; json: string }
  | {
      kind: 'oauth';
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    };

export interface Config {
  port: number;
  databaseUrl: string;
  apiKeys: Map<string, string>;
  allowedOrigins: string[];
  resendApiKey: string;
  fromEmail: string;
  studioEmail: string;
  alertEmail: string;
  googleCalendarId: string;
  googleAuth: GoogleAuthConfig;
  hubspotToken: string | undefined;
  workerEnabled: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = schema.parse(env);

  const apiKeys = new Map<string, string>();
  for (const entry of list(e.BOOKING_API_KEYS)) {
    const at = entry.indexOf(':');
    const name = entry.slice(0, at);
    const secret = entry.slice(at + 1);
    if (at < 1 || secret.length < 24) {
      throw new Error(
        'BOOKING_API_KEYS : attendu `nom:secret` (secret de 24 caractères minimum)',
      );
    }
    apiKeys.set(secret, name);
  }

  let googleAuth: GoogleAuthConfig;
  if (e.GOOGLE_SERVICE_ACCOUNT_JSON) {
    googleAuth = { kind: 'service_account', json: e.GOOGLE_SERVICE_ACCOUNT_JSON };
  } else if (
    e.GOOGLE_CLIENT_ID &&
    e.GOOGLE_CLIENT_SECRET &&
    e.GOOGLE_REFRESH_TOKEN
  ) {
    googleAuth = {
      kind: 'oauth',
      clientId: e.GOOGLE_CLIENT_ID,
      clientSecret: e.GOOGLE_CLIENT_SECRET,
      refreshToken: e.GOOGLE_REFRESH_TOKEN,
    };
  } else {
    throw new Error(
      'Agenda Google : GOOGLE_SERVICE_ACCOUNT_JSON, ou GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN',
    );
  }

  return {
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    apiKeys,
    allowedOrigins: list(e.ALLOWED_ORIGINS),
    resendApiKey: e.RESEND_API_KEY,
    fromEmail: e.RESEND_FROM_EMAIL,
    studioEmail: e.STUDIO_EMAIL,
    alertEmail: e.ALERT_EMAIL ?? e.STUDIO_EMAIL,
    googleCalendarId: e.GOOGLE_CALENDAR_ID,
    googleAuth,
    hubspotToken: e.HUBSPOT_PRIVATE_APP_TOKEN,
    workerEnabled: e.WORKER_ENABLED,
  };
}
