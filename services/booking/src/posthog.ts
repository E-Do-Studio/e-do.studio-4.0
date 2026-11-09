// Événements PostHog côté serveur, par l'API HTTP (repris de
// supabase/functions/_shared/posthog.ts). Toujours « au mieux » : une panne
// PostHog ne devient jamais une panne de réservation, de chat ou de contact.

export interface PosthogConfig {
  token: string | undefined;
  host: string;
}

const TIMEOUT_MS = 2000;

// En mode cookieless, le SDK navigateur n'a pas d'identifiant stable : relayé
// depuis le serveur, ce jeton agrégerait tous ces visiteurs en une personne.
const COOKIELESS_SENTINEL = '$posthog_cookieless';

let config: PosthogConfig = { token: undefined, host: 'https://eu.i.posthog.com' };

export function configurePosthog(next: PosthogConfig): void {
  config = next;
}

export async function captureServer(
  event: string,
  distinctId: string | undefined,
  fallbackId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!config.token) return;
  const anonymous = !distinctId || distinctId === COOKIELESS_SENTINEL;
  try {
    const res = await fetch(`${config.host}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        api_key: config.token,
        event,
        distinct_id: anonymous ? fallbackId : distinctId,
        properties: {
          ...properties,
          $lib: 'booking-service',
          ...(anonymous ? { $process_person_profile: false } : {}),
        },
      }),
    });
    if (!res.ok) console.error(`[posthog] ${event} ${res.status}`);
  } catch (e) {
    console.error(`[posthog] ${event}`, e);
  }
}

// Les adresses e-mail n'ont rien à faire dans PostHog, même au détour d'un
// message d'erreur d'un fournisseur.
const EMAIL_RE = /[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+/g;

export function scrubbed(text: string, max = 300): string {
  return text.replace(EMAIL_RE, '[e-mail]').slice(0, max);
}

/**
 * Un événement du service (réservation, agenda, e-mail, alerte…), jamais
 * attendu : le suivi ne ralentit ni une réponse ni une synchro. `subject`
 * regroupe les événements d'un même objet (`booking:EDO-R-…`), sans profil.
 */
export function trackService(
  event: string,
  properties: Record<string, unknown> = {},
  subject = 'booking-service',
): void {
  void captureServer(event, undefined, subject, { service: 'booking', ...properties });
}
