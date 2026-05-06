# Audit Strapi CMS — e-do.studio-4.0

**Date** : 2026-05-06
**Repo** : `e-do.studio-4.0` (commit auditée : branche `main`, dernier commit Strapi `8cda2ab`)
**Auteur** : CTO
**Issue** : EDO-6 (parent EDO-5)

---

## 0. TL;DR — État général

Le CMS est **fonctionnellement minimal** mais présente plusieurs problèmes structurels et un **incident de sécurité bloquant**. Les content-types sont propres et bien typés, l'i18n a été correctement migrée vers le format Strapi 5, et les choses qui tournent sur le site (galerie, plateaux, blog, social links) tournent.

Le vrai problème n'est pas Strapi — c'est la **désynchronisation entre Strapi et le front** :
- Plus de la moitié des champs définis (notamment dans `site-setting`) **ne sont jamais lus** par le site.
- Plusieurs pages clés (`contact-page`, `postprod-page`, `legal-page`, `direction-editorial`, `book-page`) ont **leur contenu codé en dur** alors que les content-types et les hooks Strapi existent déjà.
- Trois hooks Strapi sont exportés mais **importés nulle part** (`useContact`, `useStudioHours`, `usePostProdTypes`).

**À traiter en priorité absolue (cette semaine)** :
1. **Rotation des credentials Cloudflare R2 hardcodés dans Git** (P0 — `strapi/scripts/setup-r2-cors.mjs` et `upload-to-r2.mjs`).
2. Vérification que les secrets `.env.example` (`tobemodified`) **ne sont pas la valeur réelle en prod**.
3. Codification des permissions du rôle public (actuellement uniquement en base, non versionnées).

---

## 1. Inventaire

### 1.1 Stack Strapi

| Élément | Version |
|---|---|
| `@strapi/strapi` | `5.39.0` (stable, à jour) |
| `@strapi/plugin-users-permissions` | `5.39.0` |
| `@strapi/provider-upload-aws-s3` | `5.39.0` (utilisé pour R2) |
| `@breezertwo/strapi-plugin-drag-drop-content-types` | `5.4.0` |
| `strapi-plugin-populate-deep` | `3.0.1` (**installé mais jamais activé**, voir §3.2) |
| Node | `>=20.0.0 <=24.x.x` |
| DB | SQLite (dev) · Postgres (prod) — détecté via `DATABASE_CLIENT` |
| Stockage médias | Cloudflare R2 (S3 provider) |

### 1.2 Content-types (9)

| UID | Kind | Localisé | Rang | Frontend ? |
|---|---|---|---|---|
| `api::blog-category.blog-category` | collection | ✅ | non | ✅ utilisé |
| `api::blog-post.blog-post` | collection | ✅ | non | ✅ utilisé |
| `api::cyclorama.cyclorama` | single | ✅ | n/a | ✅ utilisé |
| `api::gallery-brand.gallery-brand` | collection | ✅ | ✅ | ⚠️ partiel (seul `name` lu, `logo`/`url` ignorés) |
| `api::gallery-category.gallery-category` | collection | ✅ | ✅ | ⚠️ partiel (`group` jamais lu) |
| `api::gallery-project.gallery-project` | collection | ✅ | ✅ | ✅ utilisé |
| `api::machine.machine` | collection | ✅ | ✅ | ✅ utilisé |
| `api::post-production-type.post-production-type` | collection | ✅ | ✅ | ❌ **orphelin de fait** (le hook existe mais n'est importé nulle part — la page postprod a un `PP_CATS` codé en dur) |
| `api::site-setting.site-setting` | single | ✅ | n/a | ⚠️ ~15% utilisé (cf §4.2) |

### 1.3 Composants partagés (6)

| UID | Utilisé par | Affiché par le front ? |
|---|---|---|
| `shared.spec` | `machine`, `cyclorama` | ✅ |
| `shared.localized-item` | `cyclorama.amenities`, `post-production-type.includes` | ⚠️ amenities oui, includes non (postprod hardcodée) |
| `shared.label-item` | `site-setting.transport` | ❌ jamais affiché |
| `shared.address-entry` | `site-setting.entries` | ❌ jamais affiché |
| `shared.social-link` | `site-setting.socialLinks` | ✅ |
| `shared.bento-keyword` | `site-setting.bentoKeywords` | ❌ jamais affiché |

---

## 2. Configuration Strapi

### 2.1 `config/server.ts`
```ts
host: env('HOST', '0.0.0.0'),
port: env.int('PORT', 1337),
url: env('PUBLIC_URL', 'http://localhost:1337'),
app: { keys: env.array('APP_KEYS') },
```
- ✅ OK basiquement.
- ⚠️ Pas de `proxy: true` — si Strapi est derrière un reverse proxy (ce qui semble être le cas vu les domaines `cms.e-do.studio` / `nkowss…sslip.io`), les IP source dans les logs et dans les rate-limiters internes seront fausses. **Ajouter `proxy: true`**.

### 2.2 `config/admin.ts`
- ✅ Structure correcte.
- ⚠️ `flags.nps: true` et `flags.promoteEE: true` — affichage publicitaire dans l'admin. À mettre à `false` en prod.

### 2.3 `config/api.ts`
- `defaultLimit: 25`, `maxLimit: 100`, `withCount: true`. ✅ OK.

### 2.4 `config/database.ts`
- Multi-driver (mysql/postgres/sqlite). ✅ OK.
- ⚠️ Le path SQLite (`__dirname + '../../' + .tmp/data.db`) implique que le dev tape sur SQLite. **Recommandation** : aligner dev sur Postgres pour éviter les divergences de typage `jsonb` / `text`.

### 2.5 `config/middlewares.ts` — sécurité
- ✅ CSP `connect-src` autorise `'self'` + `https:`.
- ⚠️ **`'connect-src': "https:"` est très permissif** (autorise n'importe quelle origine HTTPS). À resserrer : whitelist explicite de `https://e-do.studio`, `https://*.e-do.studio`, `https://pub-9b79de66b20440cdb7e8bae53605296c.r2.dev`.
- ⚠️ Les origines CORS incluent `http://localhost:3000` et `http://localhost:1337` — à ne **pas** servir en production. Splitter `config/env/development/middlewares.ts` vs `config/env/production/middlewares.ts`.
- ❌ **Aucun rate limiting** au-delà de celui builtin de `users-permissions`. Recommandation : ajouter `koa-ratelimit` sur `/api/auth/*` et `/api/uploads`.
- ❌ Pas de `strapi::compression` actif (gain bande passante côté front).

### 2.6 `config/plugins.ts`
- `i18n` activé, `defaultLocale: 'fr'`. ✅
- `drag-drop-content-types` activé. ✅
- `upload` configuré sur Cloudflare R2 via S3 provider. ✅
- ❌ **`strapi-plugin-populate-deep` est dans les deps mais pas dans le fichier de plugins** → soit le supprimer du `package.json`, soit l'activer (il évite les erreurs de populate sur relations imbriquées profondes).

### 2.7 `src/admin/app.tsx`
```ts
config: { locales: ['fr'] }
```
- ❌ **Bug ergonomique majeur** : l'admin Strapi n'a que `fr` activé en interface, alors que tous les content-types sont localisés `fr/en`. **Conséquence** : les éditeurs ne peuvent pas créer/éditer les traductions EN depuis l'admin, ils doivent passer par l'API ou par le seed script. **Fix immédiat** : `locales: ['fr', 'en']`.

### 2.8 `src/index.ts` — bootstrap
- Code de masquage du champ `rank` dans l'UI de Content Manager pour les types ordonnables. ✅ Cohérent avec `drag-drop-content-types`.
- ⚠️ Modifie `plugin_content_manager_configuration_content_types::*` au démarrage à chaque boot — peu coûteux mais à terme un middleware d'admin serait plus propre.

### 2.9 Migrations
- `database/migrations/2026.05.06T00.00.00.migrate-i18n-suffix-fields.js` : migre proprement le legacy `field_fr/field_en` vers le format Strapi 5 i18n. ✅
- ⚠️ La fonction `down()` retourne juste `console.log('Rollback not supported')` — donc **migration irréversible**. C'est OK pour un one-shot legacy mais à documenter dans le runbook.
- ⚠️ Dans `migrateContentTypeTable`, le code crée les rows EN par `INSERT` avec `delete enRow.id`, ce qui suppose un autoincrement → en **Postgres** ça marche, en SQLite aussi, mais **la valeur de `documentId` (généré par Strapi 5) n'est pas régénérée**. Vérifier que les nouveaux rows EN ont bien un `documentId` distinct.

### 2.10 Permissions / rôles
- ❌ **Aucune politique versionnée** dans `src/api/*/policies/` ni dans `src/policies/`.
- ❌ Aucun fichier de seed des permissions.
- → Les permissions du rôle `public` (find/findOne sur chaque content-type) sont **uniquement en base** (`up_permissions`).
- **Conséquence** : si on rebuild la DB de zéro, le site casse silencieusement (toutes les routes Strapi répondent 403).
- **Recommandation** : utiliser `strapi-plugin-config-sync` ou un script `bootstrap` qui force `users-permissions.permission` pour chaque action `find`/`findOne` des CT publics.

### 2.11 Customisations API
- Tous les `controllers/`, `routes/`, `services/` sont des `factories.create*` standards. Aucun lifecycle (`afterCreate`, `beforeUpdate`, etc.).
- ❌ Pas de hook `lifecycle` pour invalider un cache CDN sur publication, par exemple — à considérer quand on aura mis du cache.

---

## 3. Sécurité

### 3.1 🔴 P0 — **Credentials Cloudflare R2 commités en clair dans Git**

`strapi/scripts/setup-r2-cors.mjs:6-9` et `strapi/scripts/upload-to-r2.mjs:11-13` :

```js
const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://40b1f3eb00963de1f0c69c748e35eed3.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '00c62ee8708b37fd51460652897ad646',
    secretAccessKey: '87c44f90ebd5874859810145c62c7f62aec5a7a903d20689e0822aba8064ff46',
  },
  ...
});
```

Ces clés ont **un accès complet au bucket R2 `website`** (lecture, écriture, modification CORS). Le repo a été migré de `e-do.studio-3.0` (commit `8cda2ab feat(cms): move Strapi CMS from e-do.studio-3.0 to 4.0 [EDOAAA-417] (#70)`), donc elles sont vraisemblablement **dans l'historique des deux repos**.

**Action immédiate (à faire AUJOURD'HUI)** :
1. Révoquer ces clés sur Cloudflare R2 (`Manage R2 API Tokens` → revoke).
2. Régénérer une nouvelle paire et la mettre **uniquement** dans une variable d'env Vercel/serveur Strapi.
3. Refacto les deux scripts pour lire `process.env.CF_ACCESS_KEY_ID` / `CF_ACCESS_SECRET`.
4. Considérer un `git filter-repo` pour purger l'historique (cher mais propre — sinon, accepter qu'elles soient dans le passé et compter sur la rotation).
5. Audit Cloudflare des accès récents avec ces clés.

### 3.2 P1 — `.env.example` racine a `tobemodified` partout
```
APP_KEYS="toBeModified1,toBeModified2"
API_TOKEN_SALT=tobemodified
ADMIN_JWT_SECRET=tobemodified
TRANSFER_TOKEN_SALT=tobemodified
JWT_SECRET=tobemodified
ENCRYPTION_KEY=tobemodified
```

C'est **normal pour un fichier d'exemple** — mais il faut vérifier que la prod a des valeurs réelles, fortes, distinctes par environnement. Si `cms.e-do.studio` tourne avec `tobemodified` en `JWT_SECRET`, n'importe qui peut forger des tokens admin.

**Action** : auditer `cat .env` sur le serveur Strapi prod, confirmer toutes les valeurs ≠ defaults.

### 3.3 P1 — `.env.example` Strapi (`strapi/.env.example`) incomplet
```
HOST=0.0.0.0
PORT=1337
APP_KEYS=...
API_TOKEN_SALT=...
ADMIN_JWT_SECRET=...
TRANSFER_TOKEN_SALT=...
JWT_SECRET=...
ENCRYPTION_KEY=...
```

Manquent (utilisés dans le code) :
- `DATABASE_CLIENT`, `DATABASE_URL` ou `DATABASE_HOST/PORT/USERNAME/PASSWORD/NAME`
- `DATABASE_SSL` (Postgres en prod)
- `PUBLIC_URL`
- `CF_PUBLIC_URL`, `CF_ACCESS_KEY_ID`, `CF_ACCESS_SECRET`, `CF_ACCOUNT_ID`, `CF_BUCKET_NAME`
- `NODE_ENV`

Sans ces vars, un nouveau dev/serveur ne sait pas quoi configurer.

### 3.4 P2 — Exposition publique de l'API
Le frontend appelle `https://cms.e-do.studio/api/...` **sans token** (cf `src/lib/strapi.ts:26` : `fetch(key)` sans header Authorization). Donc tous les content-types publics doivent accepter `find`/`findOne` non authentifiés.

Implications :
- Pas de problème pour des données de marketing publiques.
- Mais **les paramètres de query** (`filters`, `sort`, `pagination[pageSize]`) sont totalement contrôlés par le client → un attaquant peut faire `?pagination[pageSize]=10000&populate=*` et ramener tout le contenu en une fois. Configurer `maxLimit` dans `config/api.ts` (déjà à 100, ✅) et envisager un middleware qui plafonne `populate` pour éviter les requêtes lourdes.

### 3.5 P2 — Headers CORS et CSP
- `connect-src: ['self', 'https:']` → trop large (cf §2.5).
- `keepHeaderOnError: true` côté CORS → OK.

### 3.6 P3 — Rate limiting
Aucun rate limit explicite. Avec `users-permissions` activé, l'endpoint `/api/auth/local` est ouvert en POST → bruteforce possible. À mitiger via `koa-ratelimit` ou Cloudflare devant.

---

## 4. Cohérence Strapi ↔ Site

### 4.1 Inventaire des appels Strapi côté front

Tous les appels passent par `src/lib/strapi.ts` (qui fait du `fetch` direct) et sont exposés via les hooks de `src/lib/use-strapi.ts`.

| Hook | Endpoint Strapi | Importé dans | Effectivement rendu ? |
|---|---|---|---|
| `usePlateaux` | `/api/machines` + `/api/cyclorama` (×2 locales) | `plateau-page.tsx` | ✅ |
| `useMachines` | idem | `cells.tsx` (MachineListCell) | ✅ |
| `usePostProdTypes` | `/api/post-production-types` (×2 locales) | **personne** | ❌ |
| `useDiscoveryPosts` | `/api/blog-posts` (×2 locales) | `discovery/discovery-bento-grid.tsx` | ✅ |
| `useDiscoveryCategories` | `/api/blog-categories` (×2 locales) | `discovery/filter-chips.tsx` | ✅ |
| `useSocialLinks` | `/api/site-setting?populate=socialLinks` (fr) | `nav-menu.tsx`, `direction-editorial.tsx`, `discovery/discovery-footer.tsx` | ✅ |
| `useBrands` | `/api/gallery-brands` | `cells.tsx` (GalleryCell, MarqueeCell) | ✅ |
| `useContact` | `/api/site-setting?locale=fr` | **personne** | ❌ |
| `useStudioHours` | `/api/site-setting` (×2 locales) | **personne** | ❌ |
| `useGalleryProjects` | `/api/gallery-projects` | `gallery-page.tsx` | ✅ |
| `useGalleryCategories` | `/api/gallery-categories` (×2 locales) | `gallery-page.tsx` | ✅ |

→ **3 hooks fonctionnels mais orphelins** : `useContact`, `useStudioHours`, `usePostProdTypes`.

### 4.2 Champs `site-setting` réellement consommés

| Champ | Consommé ? | Hardcodé ailleurs ? |
|---|---|---|
| `siteTitle` | ❌ | `index.html` |
| `siteDescription` | ❌ | `index.html` + `use-document-meta.ts` |
| `logo` | ❌ | composant `Wordmark` SVG inline |
| `phone` | ❌ (via useContact orphelin) | `contact-page.tsx`, `cells.tsx`, `direction-editorial.tsx` |
| `phoneHref` | ❌ | idem (`tel:+33144041149`) |
| `email` | ❌ | idem (`contact@e-do.studio`) |
| `street`, `city`, `postalCode`, `country`, `fullAddress` | ❌ | `contact-page.tsx`, `cells.tsx` |
| `googleMapsUrl`, `mapsEmbedUrl`, `latitude`, `longitude` | ❌ | nulle part (jamais affichés) |
| `transport` (composant) | ❌ | `contact-page.tsx` (lignes métro 13/14 hardcodées) |
| `parking` | ❌ | nulle part |
| `entries` (address-entry) | ❌ | `contact-page.tsx` (`Bât. 6.7` hardcodé) |
| `hours` | ❌ (via useStudioHours orphelin) | `contact-page.tsx` (`10:00 — 18:00`), `direction-editorial.tsx` (`homeMsg.monSatHours`) |
| `weekendHours` | ❌ | idem |
| `openingHoursSpec` | ❌ | nulle part (mais utile pour SEO `LocalBusiness` de `index.html` !) |
| `socialLinks` | ✅ | mais aussi hardcodé dans `contact-page.tsx:41-46` (drift) |
| `bentoKeywords` | ❌ | nulle part |
| `defaultSeoTitle`, `defaultSeoDescription`, `defaultSeoImage` | ❌ | `use-document-meta.ts` (META hardcodé par page) |
| `googleAnalyticsId` | ❌ | n'existe pas — pas d'analytics installé |

**Conclusion** : `site-setting` est à **environ 6% utilisé** (1 champ sur ~25). Soit on simplifie le content-type, soit on branche le front. Voir §5.

### 4.3 Pages avec contenu hardcodé qui devrait venir de Strapi

| Page | Contenu hardcodé | CT correspondant |
|---|---|---|
| `direction-editorial.tsx` (home) | catégories e-com, machines e-com, hours, phone, address footer | `gallery-category` (avec `group`), `machine`, `site-setting` |
| `contact-page.tsx` | adresse complète, métros, horaires, téléphone, équipe, social links | `site-setting` (entries, transport, hours, phone, socialLinks) |
| `postprod-page.tsx` | `PP_CATS` (8+ types de postprod, prix, features, formats) | `post-production-type` (existe, complet) |
| `book-page.tsx` (1290 lignes) | configuration des plateaux, tarifs, services | `machine`, `cyclorama` (existant mais relations vers booking absentes) |
| `legal-page.tsx` (456 lignes) | mentions légales, CGV, CGU, RGPD, cookies | aucun CT — à créer (`legal-page` single-type avec sections) |
| `cells.tsx` (`ContactCell`) | téléphone, email, adresse | `site-setting` |

### 4.4 Orphelins côté Strapi

- `post-production-type` : tous les enregistrements sont **orphelins** (le hook ne sert à personne).
- `gallery-category.group` : le champ enum existe mais n'est jamais utilisé pour filtrer/regrouper côté front.
- `gallery-brand.url`, `gallery-brand.logo` : jamais affichés (le front ne récupère que `name`).
- `blog-post.cta_text`, `cta_label`, `cta_url`, `seo_*` : non lus par `fetchDiscoveryPosts`.
- Composants `label-item`, `address-entry`, `bento-keyword` : modélisés mais jamais rendus.

### 4.5 Stratégie de fetch

- `fetchStrapi` → `fetch` natif côté **client** uniquement (pas de SSR/SSG/ISR — c'est un SPA Vite).
- Cache : map en mémoire avec TTL de 5 minutes (`src/lib/strapi.ts:7-8`). **Disparaît à chaque navigation hors PWA / refresh** car non persisté.
- ❌ **Pas de revalidation** — un changement publié dans l'admin ne se voit qu'après expiration du TTL ou refresh complet.
- ❌ **Pas de gestion d'erreur explicite côté UI** — quand `fetchStrapi` jette, le hook `useAsync` met `error` dans le state mais aucune page ne lit `error`. → l'UI affiche les fallbacks ou rien.
- ⚠️ **Pattern bilingue à coût double** : `fetchStrapiBilingual` fait 2 requêtes Strapi (locale=fr, locale=en) en parallèle pour chaque besoin. Sur un site SPA c'est 2× la latence et 2× la charge CMS pour des pages où l'utilisateur ne consulte qu'une langue à la fois.

### 4.6 Médias

- ✅ Provider R2 correctement configuré (avec baseUrl public).
- ✅ CSP autorise `pub-9b79de66b20440cdb7e8bae53605296c.r2.dev`.
- ✅ Script `optimize-assets.mjs` redimensionne à 2400×2400 max et qualité 82.
- ⚠️ Frontend `resolveStrapiMediaUrl` prend `formats.medium.url` ou `media.url` — mais ne préfixe pas avec STRAPI_URL si l'URL est déjà absolue (✅ OK), sinon préfixe (✅). Comportement correct.
- ❌ Pas de transformation à la volée (Strapi 5 ne le fait pas nativement) — les formats `medium/small/thumbnail` viennent de l'image processing au moment de l'upload.

---

## 5. Recommandations priorisées

### 🔴 Critiques (cette semaine)

| # | Action | Effort | Owner |
|---|---|---|---|
| C1 | Révoquer + rotater les clés R2 hardcodées (cf §3.1) | 2h | CTO + DevOps |
| C2 | Refactorer `setup-r2-cors.mjs` et `upload-to-r2.mjs` pour lire depuis env | 30min | Frontend Dev |
| C3 | Auditer le `.env` du serveur Strapi prod (vérifier ≠ `tobemodified`) | 1h | DevOps |
| C4 | Activer `locales: ['fr', 'en']` dans `src/admin/app.tsx` | 5min | Frontend Dev |

### 🟠 Majeures (ce sprint)

| # | Action | Effort |
|---|---|---|
| M1 | Brancher `useContact` → `contact-page.tsx` (FindUsSection, HoursSection, PhoneSection, SocialGrid) | 1j |
| M2 | Brancher `usePostProdTypes` → `postprod-page.tsx` (remplacer `PP_CATS`) — note : le schéma actuel `post-production-type` ne couvre pas `formats`, `samples`, `brands`, `note` ; à étendre. | 1.5j |
| M3 | Brancher `direction-editorial.tsx` (home) sur `useGalleryCategories` + `useMachines` + `useStudioHours` | 1j |
| M4 | Codifier les permissions du rôle public (script `bootstrap` ou `config-sync`) | 1j |
| M5 | Splitter middlewares dev/prod (sortir `localhost` des CORS prod) | 30min |
| M6 | Resserrer le CSP `connect-src` | 30min |
| M7 | Ajouter `proxy: true` dans `config/server.ts` | 5min |
| M8 | Compléter `strapi/.env.example` (DATABASE_*, CF_*, PUBLIC_URL) | 15min |
| M9 | Décider : activer ou supprimer `strapi-plugin-populate-deep` | 30min |

### 🟡 Mineures (backlog)

| # | Action | Effort |
|---|---|---|
| m1 | Ajouter `seo_title`, `seo_description`, `seo_image` à `machine`, `cyclorama`, `post-production-type` | 2h |
| m2 | Remplacer le pattern `fetchStrapiBilingual` par un fetch single-locale piloté par le `lang` du contexte React | 0.5j |
| m3 | Persister le cache `fetchStrapi` dans `localStorage` ou IndexedDB | 0.5j |
| m4 | Ajouter `koa-ratelimit` sur `/api/auth/*` | 1h |
| m5 | Ajouter une stratégie de cache CDN/Cloudflare devant Strapi avec invalidation par lifecycle hook | 1j |
| m6 | Créer un content-type `legal-page` (single, avec composants `legal-section` répétables) pour sortir `legal-page.tsx` | 1.5j |
| m7 | Ajouter contraintes `required: true` sur `gallery-project.category` et `gallery-project.brand` | 5min + data fix |
| m8 | Supprimer ou afficher les composants modélisés non rendus (`label-item`, `address-entry`, `bento-keyword`) | variable |
| m9 | Brancher `googleAnalyticsId` ou supprimer le champ | 1h |
| m10 | Rendre `defaultSeoTitle` / `defaultSeoDescription` lisibles depuis `use-document-meta.ts` (fallback dynamique au lieu du META hardcodé) | 0.5j |
| m11 | Ajouter `flags.nps: false`, `flags.promoteEE: false` en prod | 5min |
| m12 | Gestion d'erreur UI explicite quand `useAsync` retourne `error` | 0.5j |

### 🟢 Quick wins immédiats (< 30min chacun)

- Activer EN dans l'admin (`src/admin/app.tsx:5`).
- Compléter `.env.example`.
- Ajouter `proxy: true` dans server.ts.
- Désactiver les NPS/EE flags en prod.
- Resserrer la CSP.

---

## 6. Annexes

### 6.1 Routes Strapi exposées (basées sur les routers `factories.createCoreRouter`)

Pour chaque collection : `find`, `findOne`, `create`, `update`, `delete` ; pour chaque single : `find`, `update`, `delete`.

→ Toutes les routes sont **par défaut publiques** au niveau routeur ; ce sont les permissions du rôle `public` (en DB) qui filtrent. Si le rôle public n'a que `find`/`findOne`, c'est OK ; il faut **vérifier** que `create`/`update`/`delete` sont bien refusés au public.

### 6.2 Suspect : seed-content.mjs

`strapi/scripts/seed-content.mjs` (700+ lignes, non lu intégralement ici) fait `upsert` via API REST avec un `STRAPI_TOKEN`. Cela présuppose un token full-access en main → à utiliser uniquement en dev/staging, jamais en prod. Recommander de basculer vers les seeds Strapi natifs (`strapi import` / programmatic API).

### 6.3 Repo `etouch` ?

L'audit s'est concentré sur `e-do.studio-4.0`. Le repo `etouch` (SaaS interne) est mentionné dans CLAUDE.md mais pas pertinent pour le CMS du website public — non audité. Si `etouch` consomme aussi Strapi, à signaler dans une issue séparée.

---

## 7. Conclusion

Le CMS Strapi en lui-même est **propre techniquement** (Strapi 5.39, i18n migrée, R2 storage, code factory). Ce n'est pas le CMS qui est "extrêmement mal configuré" au sens technique — **c'est l'usage qui l'est** : la moitié des content-types est sous-exploitée et trois pages clés du site **ignorent le CMS** alors que les content-types correspondants existent. Le travail des prochains sprints n'est pas tant de refaire Strapi que de **finir le branchement front ↔ Strapi**.

Et avant tout : **rotater les credentials R2**.
