// Capture PostHog depuis les Edge Functions, par l'API HTTP : pas de SDK à
// charger pour quelques événements, et rien que le bloqueur d'un visiteur
// puisse couper. C'est la source fiable des réservations créées et des pannes
// serveur — le navigateur ne voit d'un 500 que « ça n'a pas marché ».
//
// Toujours « au mieux » : attendu avec un délai court (une fonction Deno qui a
// répondu peut être gelée avant qu'une promesse non attendue n'aboutisse),
// jamais levé. Une panne PostHog ne doit pas devenir une panne de réservation.

const HOST = Deno.env.get("POSTHOG_HOST") ?? "https://eu.i.posthog.com";
const TIMEOUT_MS = 2000;

// En mode cookieless, le SDK navigateur n'a pas d'identifiant stable : il
// renvoie ce jeton, que seul l'ingestion sait convertir (hash IP + UA). Relayé
// depuis le serveur, il agrégerait tous ces visiteurs en une seule personne.
const COOKIELESS_SENTINEL = "$posthog_cookieless";

export interface AnalyticsContext {
  distinct_id?: string;
  source?: string;
  funnel?: string | null;
}

export async function captureServer(
  event: string,
  distinctId: string | undefined,
  fallbackId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const token = Deno.env.get("POSTHOG_PROJECT_TOKEN");
  if (!token) return;

  const anonymous = !distinctId || distinctId === COOKIELESS_SENTINEL;
  try {
    const res = await fetch(`${HOST}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        api_key: token,
        event,
        distinct_id: anonymous ? fallbackId : distinctId,
        properties: {
          ...properties,
          $lib: "edge-function",
          // Sans visiteur rattachable, pas de profil personne créé par
          // l'identifiant de repli.
          ...(anonymous ? { $process_person_profile: false } : {}),
        },
      }),
    });
    if (!res.ok) console.error(`[posthog] ${event} ${res.status}`);
  } catch (e) {
    console.error(`[posthog] ${event}`, e);
  }
}
