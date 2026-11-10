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
  // Accepte aussi localhost et le réseau privé : le développement seulement.
  ALLOW_LOCAL_ORIGINS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
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
  // Chat du site : Gemini (réponses et embeddings), GLM en secours.
  GEMINI_API_KEY: z.string().optional(),
  ZAI_API_KEY: z.string().optional(),
  // Formulaire de contact : inerte tant que le site n'envoie pas de jeton.
  TURNSTILE_SECRET_KEY: z.string().optional(),
  POSTHOG_PROJECT_TOKEN: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://eu.i.posthog.com'),
  // Filet de la bascule : rapatrie ce que l'ancien site écrit encore dans Supabase.
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
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
  allowLocalOrigins: boolean;
  resendApiKey: string;
  fromEmail: string;
  studioEmail: string;
  alertEmail: string;
  googleCalendarId: string;
  googleAuth: GoogleAuthConfig;
  hubspotToken: string | undefined;
  geminiKey: string | undefined;
  zaiKey: string | undefined;
  turnstileSecret: string | undefined;
  posthogToken: string | undefined;
  posthogHost: string;
  supabase: { url: string; serviceKey: string } | undefined;
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
    allowLocalOrigins: e.ALLOW_LOCAL_ORIGINS,
    resendApiKey: e.RESEND_API_KEY,
    fromEmail: e.RESEND_FROM_EMAIL,
    studioEmail: e.STUDIO_EMAIL,
    alertEmail: e.ALERT_EMAIL ?? e.STUDIO_EMAIL,
    googleCalendarId: e.GOOGLE_CALENDAR_ID,
    googleAuth,
    hubspotToken: e.HUBSPOT_PRIVATE_APP_TOKEN,
    geminiKey: e.GEMINI_API_KEY,
    zaiKey: e.ZAI_API_KEY,
    turnstileSecret: e.TURNSTILE_SECRET_KEY,
    posthogToken: e.POSTHOG_PROJECT_TOKEN,
    posthogHost: e.POSTHOG_HOST,
    supabase:
      e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY
        ? { url: e.SUPABASE_URL, serviceKey: e.SUPABASE_SERVICE_ROLE_KEY }
        : undefined,
    workerEnabled: e.WORKER_ENABLED,
  };
}
