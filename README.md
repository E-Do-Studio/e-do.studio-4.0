# e-do.studio 4.0

Site public bilingue (FR/EN) de [e-do.studio](https://e-do.studio) — studio
photo/vidéo : présentation des plateaux et du cyclorama, galerie, contenu
éditorial, réservation en ligne et chatbot.

Front Vite + React (SPA), contenu géré dans Strapi (CMS), backend applicatif
sur Supabase (booking, chat, emails, calendrier).

> Pour les conventions de contribution détaillées, voir [`CLAUDE.md`](./CLAUDE.md).

## Stack

| Couche      | Technologie |
|-------------|-------------|
| Front       | Vite 7, React 18, TypeScript strict, [TanStack Router](https://tanstack.com/router) (routes déclarées dans `src/router.tsx`), [nuqs](https://nuqs.47ng.com/) (state URL) |
| Styles      | Tailwind v4 via `@tailwindcss/vite` — pas de `tailwind.config.*`, tout vit dans `src/styles.css` et `colors_and_type.css` |
| CMS         | Strapi 5 (dossier `strapi/`, déployé sur `cms.e-do.studio`) |
| Backend     | Supabase — Postgres + Edge Functions Deno (`supabase/`) |
| Chatbot     | Edge Function `chat` + Google Gemini, base de connaissance indexée dans Postgres |
| Déploiement | Build Docker → assets statiques servis par Caddy (Coolify / Nixpacks) |

Node ≥ 20, gestionnaire de paquets **pnpm** (`pnpm-lock.yaml` — ne pas
réintroduire de `package-lock.json` côté front).

## Démarrage rapide

```bash
pnpm install
cp .env.example .env   # puis renseigner les valeurs (voir ci-dessous)
pnpm dev               # serveur de dev sur http://localhost:5173
```

En dev, Vite proxifie `/api` vers `https://cms.e-do.studio` (cf.
`vite.config.ts`), donc un token Strapi read-only suffit pour voir le contenu.

## Commandes

```bash
pnpm dev          # vite --host 0.0.0.0
pnpm typecheck    # tsc --noEmit  ← à passer avant tout commit non trivial
pnpm build        # vite build (sortie dans dist/)
pnpm preview      # prévisualise le build de production
pnpm chat:reindex # régénère l'index de connaissance du chatbot
```

Il n'y a **pas de linter ni de suite de tests** configurés. Le `typecheck` est
le seul filet de sécurité automatisé — il doit rester vert. Toute modification
d'UI se valide dans le navigateur (desktop **et** mobile).

## Structure

```
src/
  router.tsx              # routes + langues (fr/en), seul endroit qui les déclare
  *-page.tsx              # pages top-level (book, contact, gallery, plateau, postprod…)
  discovery/              # section éditoriale (bento grid, overlay, cards)
  book/                   # tunnel de réservation (configurateur, manuel, confirmation)
  ui/                     # primitives partagées (button, chip, bottom-sheet…)
  lib/                    # accès données (strapi, supabase, hooks, SEO, structured data)
  i18n/messages.ts        # chaînes UI bilingues
  types.ts                # types métier (Lang, Bilingual<T>, DiscoveryPost…)
docs/                     # runbooks (booking-system, chatbot-knowledge)
scripts/
  build-chat-knowledge.mjs  # indexeur de la base de connaissance du chatbot
supabase/
  migrations/*.sql        # une migration = un fichier daté, jamais d'édition rétro
  functions/<name>/       # Edge Functions Deno : chat, send-email, calendar-sync, ical
strapi/                   # code du CMS (déploiement séparé)
```

### Routing & i18n

Les routes sont préfixées par la langue (`/:lang/...`) et déclarées
exclusivement dans `src/router.tsx`. Les chemins sont localisés (ex.
`/fr/reserver` ↔ `/en/book`, `/fr/galerie` ↔ `/en/gallery`). Ajouter une page =
créer la route **et** ajouter l'entrée correspondante dans `SCREEN_TO_PATH`.

Tout contenu localisé passe par `Bilingual<T> = { fr; en }` ; les libellés d'UI
vivent dans `src/i18n/messages.ts`. Ne jamais hardcoder un libellé FR ou EN dans
un composant.

## Données

- **Strapi** : passer par `src/lib/strapi.ts` (cache 5 min en mémoire, bypass
  automatique en mode preview, token via `VITE_STRAPI_TOKEN`).
- **Supabase (front)** : passer par `src/lib/supabase.ts` ; ne pas instancier de
  client ad hoc.
- **Mode preview** : la SPA bascule en lecture des drafts Strapi via le
  `?secret=` ajouté par le handler de preview du CMS (doit matcher
  `VITE_PREVIEW_SECRET`).

## Backend Supabase

- **Migrations** : `supabase/migrations/YYYYMMDDHHMMSS_<sujet>.sql`. Ne jamais
  modifier une migration déjà appliquée — en créer une nouvelle.
- **Edge Functions** (Deno, `supabase/functions/`) :
  - `chat` — chatbot IA (Gemini) avec rate-limiting et base de connaissance
  - `send-email` — emails transactionnels (+ sync CRM HubSpot)
  - `calendar-sync` / `ical` — synchronisation calendrier

Voir [`docs/booking-system.md`](./docs/booking-system.md) et
[`docs/chatbot-knowledge.md`](./docs/chatbot-knowledge.md) pour les détails.

### Chatbot — réindexation de la connaissance

```bash
pnpm chat:reindex
```

Le script `scripts/build-chat-knowledge.mjs` lit le contenu Strapi et alimente
les tables `chat_knowledge` de Supabase. Ses variables sont **server-side
uniquement** (jamais de préfixe `VITE_`) — voir `.env.example`.

## Variables d'environnement

Copier `.env.example` → `.env`. Les principales (détails et secrets côté
serveur dans `.env.example`) :

| Variable | Rôle |
|----------|------|
| `VITE_STRAPI_URL` | URL du CMS (défaut `https://cms.e-do.studio`) |
| `VITE_STRAPI_TOKEN` | Token API read-only (requis pour lire le contenu) |
| `VITE_STRAPI_PREVIEW_TOKEN` | Token avec droit `Read draft` (fallback sur le token public) |
| `VITE_PREVIEW_SECRET` | Secret partagé avec le CMS pour le mode preview |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` | Projet Supabase + clé anon |
| `VITE_GTM_ID` | Conteneur Google Tag Manager (non injecté si vide) |
| `GEMINI_API_KEY`, `CHAT_ALLOWED_ORIGIN` | Secrets Edge Function chat (jamais bundlés) |
| `HUBSPOT_PRIVATE_APP_TOKEN` | Sync CRM (secret Edge Function) |
| `VITE_HUBSPOT_PORTAL_ID` | Portal HubSpot — active l'envoi vers l'API Forms (attribution source) |
| `VITE_HUBSPOT_BOOKING_FORM_ID` / `VITE_HUBSPOT_CONTACT_FORM_ID` | GUID des forms HubSpot (générés par `pnpm hubspot:setup`) |

Ne jamais committer `.env*` (déjà gitignoré).

## Déploiement

Le build est packagé via [`Dockerfile`](./Dockerfile) : étape de build Node
(pnpm) puis image `caddy:2-alpine` servant `dist/` (config dans
[`Caddyfile`](./Caddyfile)). L'hébergement passe par Coolify / Nixpacks
([`nixpacks.toml`](./nixpacks.toml)). Les variables `VITE_*` doivent être
fournies au moment du build (cf. les `ARG` du Dockerfile).

## Conventions

- **Branches** : un PR par changement, mergé dans `main`. Pas de long-lived
  branches.
- **Commits & PR** : Conventional Commits avec scope + référence Linear, ex.
  `feat(plateau): mobile nav row + bottom-sheet picker (EDO-262)`.
- **Mobile-first** : toujours valider la version mobile avant de considérer un
  changement terminé.
- **Pas de feature creep, pas de fallback défensif** sur des cas impossibles.

Voir [`CLAUDE.md`](./CLAUDE.md) pour le guide complet et la liste des cas où il
faut demander avant d'agir (migrations, schéma Strapi, URLs publiques/SEO,
dépendances lourdes).
