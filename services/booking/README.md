# Service de réservation e-do

Remplace les Edge Functions Supabase de la réservation (`create-booking`,
`calendar-sync`, `send-email` pour la partie réservation) et la base Supabase.
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
| Alertes : un e-mail si la création échouait 3 fois | Toute tâche en échec (agenda, e-mail) alerte au 3e essai, et l'abandon déclenche une alerte critique. Les alertes sont dédupliquées et un récapitulatif part chaque jour à 8 h si quelque chose est ouvert ou s'est passé. `GET /v1/admin/status` donne l'état complet. |

Les UID (`<référence>-<id de ligne>@e-do.studio`) et les ids Google
(`sha256(uid)` en hexadécimal, ceux de la v31 de calendar-sync) ne changent
pas : les événements existants et les invitations déjà envoyées restent
pilotables. Si la v31 utilisait d'autres ids, la réconciliation reprend les
événements existants par date et plateau au lieu d'en créer des doublons.

## API

Publique (CORS limité à `ALLOWED_ORIGINS`, débit limité par IP) :

- `POST /v1/public/bookings` : tunnel du site. Le devis est recalculé avec `src/lib/booking-engine.ts`. Réponses : `{ reference, total }` (201), 409 `slot_taken`, 400.
- `GET /v1/public/availability?plateau=&from=&to=` : occupation et jours bloqués, sans aucune donnée client.
- `POST /v1/public/booking-failures` : échec du tunnel côté navigateur, alerte critique immédiate.

Privée (`Authorization: Bearer <clé>`, une clé par appelant) :

- `GET /v1/bookings?updatedSince=&limit=` : flux des modifications (synchro etouch).
- `GET /v1/bookings/:id` et `GET /v1/bookings/by-reference/:ref` : réservation, lignes, devis, registre agenda, historique.
- `POST /v1/bookings` : réservation saisie par le studio (`notifyClient`).
- `POST /v1/bookings/:id/confirm` · `/cancel` · `/reschedule` · `/sessions/remove` · `/events` · `/resync`
- `PUT|DELETE /v1/blocked-dates/:date`
- `GET /v1/admin/status` · `POST /v1/admin/reconcile` · `POST /v1/admin/jobs/:id/retry`

## Variables d'environnement

| Variable | |
|---|---|
| `DATABASE_URL` | Postgres du service |
| `BOOKING_API_KEYS` | `etouch:<secret>,admin:<secret>` (24 caractères min., `openssl rand -hex 24`) |
| `ALLOWED_ORIGINS` | défaut `https://e-do.studio,https://www.e-do.studio` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | envoi des e-mails |
| `STUDIO_EMAIL`, `ALERT_EMAIL` | copie studio et destinataire des alertes (défaut : `contact@e-do.studio`) |
| `GOOGLE_CALENDAR_ID` | agenda du studio |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | compte de service avec qui l'agenda est partagé (« Modifier les événements »)… |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | …ou jeton OAuth du compte propriétaire |
| `HUBSPOT_PRIVATE_APP_TOKEN` | facultatif |
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
