# Strapi Phase 3 migrations — runbook

7 scripts qui migrent les données legacy vers les nouvelles structures
introduites par les PR #94 → #108. Tous idempotents.

## Prérequis (à faire UNE fois côté ops)

1. **Backup DB prod** (Postgres dump ou snapshot Scaleway).
2. Récupérer un **API token full-access Strapi** :
   - Strapi admin → Settings → API Tokens → Create new
   - Token type: Full access · Token duration: 7 days (jeter après usage)
3. Récupérer la **chaîne de connexion DB prod** depuis le `.env` du serveur Strapi.

## Variables d'environnement à exporter

```bash
# Pour les scripts qui passent par l'API Strapi
export STRAPI_URL=https://cms.e-do.studio
export STRAPI_TOKEN=<le-token-full-access>

# Pour les scripts qui touchent directement la DB (year + audit-required)
export DATABASE_CLIENT=postgres
export DATABASE_URL=postgres://user:pass@host:5432/db
# (ou DATABASE_HOST / PORT / NAME / USERNAME / PASSWORD)
```

## Exécution recommandée

### Sur staging d'abord

```bash
cd strapi
npm install                # si node_modules pas encore installé
npm run migrate:all        # confirmation interactive y/N
```

L'orchestrator affiche les 7 tâches, leur statut (ready/blocked/skip),
demande confirmation, puis enchaîne en s'arrêtant à la première erreur.

### Sur prod

**Avant** : confirmer que le résultat staging est correct côté admin Strapi
(les nouveaux champs `pricingRows`, `openingHours`, `address`, `ctaText`,
`stageKey` sont peuplés ; le bug d'affichage « 2 025 » a disparu).

**Pendant la migration `year`** : la première étape touche directement la
colonne SQL — Strapi doit être **STOPPÉ** pour cette étape, sinon le
schema sync de Strapi peut courser le rename.

```bash
# 1. Stop Strapi
sudo systemctl stop strapi  # ou pm2 stop strapi, selon le déploiement

# 2. Run migration year (DB-only)
npm run migrate:year

# 3. Restart Strapi
sudo systemctl start strapi

# 4. Run le reste (passe par l'API Strapi, donc Strapi doit tourner)
SKIP_YEAR=1 npm run migrate:all
```

### Variantes

```bash
# Skip la migration year (déjà faite ou pas concernée)
SKIP_YEAR=1 npm run migrate:all

# Mode non-interactif (CI)
YES=1 npm run migrate:all

# Lancer un script individuellement
npm run migrate:pricing
npm run migrate:hours
npm run migrate:address
npm run migrate:blog-camel
npm run migrate:stage
npm run audit:required        # read-only, retourne un markdown listant les rows null
```

## Vérification post-migration

Côté admin Strapi :

| CT / champ | Vérifier |
|---|---|
| `gallery-project` → champ `year` | Plus formaté `2 025`, affiche `2025` brut |
| `gallery-project` → champ `stageKey` | Peuplé pour chaque projet (live/eclipse/horizontal/vertical/cyclorama) |
| `machine` / `cyclorama` → `pricingRows` | Liste structurée avec label/amount/kind |
| `cyclorama` → `pricingRows` | Idem |
| `post-production-type` → `priceRows` | Idem |
| `site-setting` → `openingHours` | 7 entrées (mon-fri + sat-sun) avec opensAt/closesAt |
| `site-setting` → `address` | Composant peuplé (street/city/postalCode/country) |
| `blog-post` → `ctaText`/`ctaLabel`/`ctaUrl` | Copies des `cta_*` legacy |

Côté site (https://e-do.studio) :

- `/galerie` : les filtres par plateau marchent (utilise `stageKey` désormais)
- `/cyclorama`, `/plateau/*` : tarifs s'affichent (utilise `pricingRows` si peuplé, sinon legacy)
- `/contact` : adresse complète et horaires affichés (composant `address` + `openingHours` si peuplés)

## Audit data avant `required: true`

```bash
npm run audit:required > /tmp/required-audit.md
```

Liste pour chaque champ candidat le nombre de rows null. Sortie markdown
indiquant `✅ safe to set required` ou `⚠️ needs data fix first`.

Une fois le rapport relu, ouvrir une PR pour passer `required: true` sur
les champs verts uniquement.

## Phase 4 (drop des champs deprecated) — APRÈS stabilisation prod

Quand les nouvelles structures sont peuplées et le site stable depuis 1-2
semaines, ouvrir une PR de cleanup qui :

- Supprime `cta_text`, `cta_label`, `cta_url` (remplacés par `ctaText` etc.)
- Supprime `seo_title`, `seo_description`, `seo_image` (remplacés par le composant `seo`)
- Supprime `phoneHref`, `fullAddress`, `openingHoursSpec` (calculables)
- Supprime `hours`, `weekendHours` (remplacés par `openingHours` composant)
- Supprime `street`, `city`, `postalCode`, `country` (remplacés par `address` composant)
- Supprime `pricing`, `operatorPricing`, `price` (remplacés par les composants)
- Supprime `stage` (remplacé par `stageKey`)
- Supprime `body` (richtext) sur blog-post (remplacé par `bodyBlocks`)

Strapi 5 retire les colonnes en DB lors du schema sync. Backup DB **avant**.
