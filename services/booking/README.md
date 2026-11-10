# Service de réservation e-do

Remplace Supabase pour tout le site : les Edge Functions (`create-booking`,
`calendar-sync`, `send-email`, `chat`, `ical`) et la base (réservations,
historique, jours bloqués, base de connaissances du chat, messages du
formulaire de contact).
Node 22 + Postgres, une seule application Coolify : l'API et le worker
tournent dans le même processus.

## Ce qui change par rapport à Supabase

| Avant | Maintenant |
|---|---|
| Synchro agenda « au mieux » (`fetch` sans attente, cron toutes les 2 min) | Une file en base, écrite dans la même transaction que la réservation. Chaque travail est retenté (30 s, 1 min… jusqu'à 1 h), puis abandonné après 12 essais avec une alerte critique. |
| `calendar-sync` relisait les lignes pour supprimer, et répondait 200 quand il n'y en avait plus | Un **registre** des événements (`calendar_events`), une entrée par UID, qui survit à la ligne. Une synchro ne réussit que si Google a tout accepté. |
| Annuler supprimait les lignes (le créneau était libéré, mais les événements perdus) | Annuler garde les lignes et libère le créneau (`blocks_slot = false`). Retirer une machine supprime sa ligne, et le registre garde son événement jusqu'à ce qu'il soit retiré. |
| Aucun contrôle de l'agenda | **Réconciliation** toutes les 10 min : retire les événements e-do qu'aucune ligne active ne justifie (trouvés par id, ou par `Référence:` dans la description pour ceux d'avant), remet ceux supprimés à la main, alerte sur une référence inconnue (sans rien supprimer). |
| `.ics` client en `METHOD:PUBLISH`, `SEQUENCE:0`, rien à l'annulation | `METHOD:REQUEST` avec ORGANIZER et ATTENDEE ; report = même UID, SEQUENCE + 1 ; annulation = `METHOD:CANCEL` / `STATUS:CANCELLED`, même UID, SEQUENCE + 1. |
| Alertes : un e-mail si la création échouait 3 fois | Toute tâche en échec (agenda, e-mail) alerte au 3e essai, et l'abandon déclenche une alerte critique. Les alertes sont dédupliquées. Pas de récapitulatif quotidien : un e-mail ne part que quand il faut agir ; le reste se lit dans PostHog. `GET /v1/admin/status` donne l'état complet. |

Les UID (`<référence>-<id de ligne>@e-do.studio`) et les ids Google
(`sha256(uid)` en hexadécimal, ceux de la v31 de calendar-sync) ne changent
pas : les événements existants et les invitations déjà envoyées restent
pilotables. Si la v31 utilisait d'autres ids, la réconciliation reprend les
événements existants par date et plateau au lieu d'en créer des doublons.

## API

Publique (CORS limité à `ALLOWED_ORIGINS`, débit limité par IP — la dernière adresse de `X-Forwarded-For`, celle qu'ajoute Traefik —, réservations plafonnées à 5 par adresse e-mail et par jour et à 40 par heure pour tout le site, corps limité à 1 Mo) :

- `POST /v1/public/bookings` : tunnel du site. Le devis est recalculé avec `src/lib/booking-engine.ts`. Réponses : `{ reference, total }` (201), 409 `slot_taken`, 400.
- `GET /v1/public/availability?plateau=&from=&to=` : occupation et jours bloqués, sans aucune donnée client.
- `POST /v1/public/booking-failures` : échec du tunnel côté navigateur, alerte critique immédiate.
- `POST /v1/public/contact` : formulaire de contact (anti-spam, Turnstile si `TURNSTILE_SECRET_KEY`, 5 messages / 10 min et 15 / jour par IP). Les deux e-mails et HubSpot partent par la file.
- `POST /v1/public/chat` : l'assistant du site (code repris de `supabase/functions/chat`). Base de connaissances en mémoire (cosinus), disponibilités sans aucune donnée client, brouillon de réservation jamais écrit.
- `GET /v1/public/ical/:reference` : flux d'abonnement d'une réservation (`METHOD:PUBLISH`).

Privée (`Authorization: Bearer <clé>`, une clé par appelant) :

- `GET /v1/bookings?updatedSince=&status=pending,confirmed&from=&to=&order=&limit=` : liste filtrée (synchro etouch). `order` : `updated_at.asc` (défaut), `created_at.desc`, `preferred_date.desc`.
- `GET /v1/bookings/:id` et `GET /v1/bookings/by-reference/:ref` : réservation, lignes, devis, registre agenda, historique.
- `POST /v1/bookings` : réservation saisie par le studio (`notifyClient`).
- `POST /v1/bookings/:id/confirm` · `/cancel` · `/reschedule` · `/sessions/remove` · `/events` · `/resync`
- `POST /v1/bookings/:id/notify` (`template`: `created` | `rescheduled` | `cancelled` | `updated`) : écrit au client après coup, avec les .ics des UID concernés.
- Un 409 `slot_taken` renvoie `conflict: { plateau, date, fromHour, toHour }`.
- `PUT|DELETE /v1/blocked-dates/:date`
- `GET /v1/ical?plateau=` : flux de toutes les réservations actives.
- `GET|POST /v1/admin/chat-knowledge` : base de connaissances du chat, écrite par `pnpm chat:reindex` quand `BOOKING_API_URL` et `BOOKING_API_KEY` sont posés.
- `GET /v1/admin/status` · `POST /v1/admin/reconcile` · `POST /v1/admin/jobs/:id/retry`

## Variables d'environnement

| Variable | |
|---|---|
| `DATABASE_URL` | Postgres du service |
| `BOOKING_API_KEYS` | `etouch:<secret>,admin:<secret>` (24 caractères min., `openssl rand -hex 24`) |
| `ALLOWED_ORIGINS` | défaut `https://e-do.studio,https://www.e-do.studio` |
| `ALLOW_LOCAL_ORIGINS` | `true` pour accepter localhost et le réseau privé (développement) ; `false` par défaut |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | envoi des e-mails |
| `STUDIO_EMAIL`, `ALERT_EMAIL` | copie studio et destinataire des alertes (défaut : `contact@e-do.studio`) |
| `GOOGLE_CALENDAR_ID` | agenda du studio |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | compte de service avec qui l'agenda est partagé (« Modifier les événements »)… |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | …ou jeton OAuth du compte propriétaire |
| `HUBSPOT_PRIVATE_APP_TOKEN` | facultatif |
| `GEMINI_API_KEY` | chat (réponses et embeddings) |
| `ZAI_API_KEY` | chat, GLM essayé avant Gemini (facultatif) |
| `TURNSTILE_SECRET_KEY` | contact (facultatif, à poser seulement quand le site envoie le jeton) |
| `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST` | événements serveur (facultatif) |
| `WORKER_ENABLED` | `false` pour une instance API seule |

## Développement

```bash
pnpm install
pnpm test        # Postgres réel en WASM (PGlite), Google et Resend simulés
pnpm typecheck
pnpm build       # dist/server.js, dist/import-supabase.js
```

## Déploiement Coolify

1. Base : une ressource PostgreSQL 16 (extension `btree_gist`, fournie avec l'image officielle).
2. Application : dépôt `E-Do-Studio/e-do.studio-4.0`, build pack Dockerfile, **Dockerfile `services/booking/Dockerfile`, contexte = racine du dépôt**, port 3000, domaine (ex. `booking.e-do.studio`). Healthcheck : `/healthz`.
3. Variables ci-dessus. Le schéma s'applique tout seul au démarrage.

## Bascule depuis Supabase

1. Déployer le service avec `WORKER_ENABLED=false`.
2. Import à blanc : `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… DATABASE_URL=… node dist/import-supabase.js --dry-run` (dans le conteneur).
3. Geler les écritures Supabase (désactiver les crons `reconcile-calendar-sync` / `alert-calendar-sync-failures` / `reconcile_calendar_deletions`), relancer l'import sans `--dry-run`.
4. `WORKER_ENABLED=true` et redéployer. La première réconciliation reprend les événements existants et retire les orphelins, dont les 6 de novembre (GÜÇ ×4, IMANUUR, marah), qui portent leur référence dans la description. Lire le rapport dans `GET /v1/admin/status` (`state` → `calendar.reconcile`).
5. Site : `VITE_BOOKING_API_URL=https://booking.e-do.studio` au build. Le tunnel et le calendrier de disponibilité passent sur le service.
6. etouch : remplacer les appels REST Supabase de l'intégration e-do par l'API privée (PR séparée dans etouch).
7. Ensuite seulement, couper les Edge Functions de réservation.

Avant l'étape 6, etouch écrit encore dans Supabase : ne pas basculer le site
tant que les deux ne pointent pas vers le même service.
