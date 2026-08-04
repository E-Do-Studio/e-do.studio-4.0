# e-do.studio 4.0 — Guide de collaboration

Site public e-do.studio (FR/EN). Front Vite + React, contenu via Strapi (CMS),
backend applicatif via Supabase (booking, chat, emails, calendrier).

## Stack

- **Front** : Vite 7, React 18, TypeScript strict, TanStack Router (file-less,
  routes déclarées dans `src/router.tsx`), nuqs (state URL), Tailwind v4 via
  `@tailwindcss/vite` (pas de `tailwind.config.*`, tout vit dans `src/styles.css`
  et `colors_and_type.css`).
- **CMS** : Strapi 5 (dossier `strapi/`, déployé sur `cms.e-do.studio`). En dev,
  Vite proxifie `/api` → `https://cms.e-do.studio` (cf. `vite.config.ts`).
- **Backend** : Supabase (Postgres + Edge Functions Deno) — migrations SQL dans
  `supabase/migrations/`, fonctions dans `supabase/functions/`.
- **Node** : ≥ 20. Gestionnaire : `pnpm` (un `pnpm-lock.yaml` est présent ;
  ne pas réintroduire `package-lock.json` côté front).

## Commandes

```bash
pnpm dev          # vite --host 0.0.0.0
pnpm typecheck    # tsc --noEmit  ← à passer avant tout commit non trivial
pnpm lint         # biome lint
pnpm check        # biome check --write (lint + format)
pnpm build        # vite build
pnpm preview      # vite preview
pnpm chat:reindex # régénère l'index de connaissance du chatbot
```

Filets automatisés : le typecheck, Biome, et une suite Vitest (`npx vitest run`)
qui couvre le moteur de réservation, la validation et le rendu markdown. Tous
doivent rester verts.

Le typecheck reste le filet le plus large : `noUnusedLocals` transforme une
variable devenue orpheline en erreur, ce qui certifie qu'un refactor est
complet fichier par fichier.

## Structure

```
src/
  router.tsx              # routes + langues (fr/en), seul endroit qui les déclare
  *-page.tsx              # pages top-level (book, contact, gallery, plateau…)
  discovery/              # section éditoriale (bento grid, overlay, cards)
  ui/                     # primitives partagées (button, chip, bottom-sheet, …)
  lib/                    # accès données (strapi, supabase, hooks)
  i18n/locales/{fr,en}.json  # chaînes UI — source unique
  i18n/index.ts           # instances i18next figées + getT
  i18n/use-t.ts           # hook useT() pour les composants
  types.ts                # types métier (Lang, Bilingual<T>, DiscoveryPost…)
docs/                     # runbooks, audits, todos (Strapi, booking, chatbot)
supabase/
  migrations/*.sql        # une migration = un fichier daté, jamais d'édition rétro
  functions/<name>/       # Edge Function Deno (index.ts + deno.json local)
strapi/                   # code du CMS (déploiement séparé)
```

## Conventions de code

- **TypeScript strict** est activé, mais `noImplicitAny` et `noUnused*` sont à
  `false`. Préfère malgré tout typer explicitement plutôt que `any`.
- **Composants** : `function` ou `const` arrow, PascalCase, un composant par
  fichier en kebab-case (`mobile-nav-strip.tsx`). Pas de `default export` sauf
  pour les pages routées et `App.tsx`.
- **Classes Tailwind** : composer avec le helper `cn` (`src/ui/cn.ts`), pas de
  `clsx` ou `classnames`.
- **Bilingue** — deux mécanismes distincts, à ne pas confondre :

  | Quoi | Comment | Où |
  |---|---|---|
  | Chaîne d'**UI** dans un composant ou un hook | `const t = useT()` puis `t('groupe.cle')` | `src/i18n/locales/{fr,en}.json` |
  | Chaîne d'**UI** hors React (`head()` de route, JSON-LD, helper) | `getT(lang)('groupe.cle')` | idem |
  | Phrase contenant un **fragment stylé ou un lien** | `<Trans i18nKey="…" components={{ nom: <span /> }} />` | idem, balisé `<nom>…</nom>` |
  | Contenu **CMS** (Strapi) | `valeur[lang]` — i18next n'en est pas propriétaire | `Bilingual<T> = { fr; en }` |

  Ne jamais écrire `lang === 'fr' ? 'Oui' : 'Yes'` dans un composant. Les seules
  occurrences légitimes de ce ternaire sont la bascule
  `setLang(lang === 'fr' ? 'en' : 'fr')` et le choix d'une étiquette de locale
  (`bcp47`, `ogLocale` dans `src/lib/format.ts`) — qui ne sont pas des traductions.

  Une clé présente d'un seul côté **casse `pnpm typecheck`** : `src/i18n/index.ts`
  croise les deux locales par `satisfies`. Une clé inexistante est rejetée à la
  compilation grâce à `src/i18n/i18next.d.ts`.

  ⚠️ `<Trans>` échoue **silencieusement** en rendant la clé brute — le typecheck
  ne le voit pas. Toujours vérifier son rendu dans le navigateur.

  `src/lib/booking-engine.ts` est **hors i18next** : il est importé par les Edge
  Functions Deno et doit rester pur. Ses libellés d'affichage lui sont injectés
  par l'appelant via `QuoteLabels`.
- **Routing** : ajouter une page = déclarer une route dans `src/router.tsx`
  + ajouter une entrée dans `SCREEN_TO_PATH` (mapping `screen → /:lang/...`).
- **State URL** : préférer `nuqs` à `useState` quand l'état doit être
  partageable ou survivre à un reload (filtres, onglets, query…).
- **Données Strapi** : passer par `src/lib/strapi.ts` (cache 5 min en mémoire,
  bypass automatique en mode preview, token via `VITE_STRAPI_TOKEN`).
- **Supabase côté front** : passer par `src/lib/supabase.ts` ; ne pas
  instancier de client ad hoc.
- **Pas de comments narratifs**. Un commentaire répond au *pourquoi* quand il
  n'est pas évident (contrainte, bug de référence, invariant subtil). Sinon,
  supprimer.

## Conventions de workflow

- **Branches** : un PR par changement, fusionné dans `main`. Pas de
  long-lived branches.
- **Commits & PR titles** : Conventional Commits avec scope, suivis de la
  référence Linear `(EDO-XXX)` :
  ```
  feat(plateau): mobile nav row + bottom-sheet picker (EDO-262)
  fix(postprod): constrain mobile grid column to viewport (EDO-262)
  refactor(nav): apply trigger+bottom-sheet picker to postprod & legal (EDO-262)
  ```
  Types observés : `feat`, `fix`, `refactor`, `revert`. Scope = la zone (page,
  composant, domaine), pas le fichier.
- **Migrations Supabase** : nom `YYYYMMDDHHMMSS_<sujet>.sql`. Ne **jamais**
  modifier une migration déjà appliquée — en créer une nouvelle.
- **Strapi** : voir `docs/strapi-migrations-runbook.md` avant toute
  modification de schéma.

## Bonnes pratiques attendues

- **Pas de feature creep** : un fix ne refactore pas le voisinage, une feature
  n'introduit pas d'abstraction « au cas où ». Trois lignes similaires valent
  mieux qu'une abstraction prématurée.
- **Pas de fallback défensif** sur des cas qui ne peuvent pas arriver. Valider
  aux frontières (input utilisateur, réponses API) et faire confiance au reste.
- **Pas de fichier de doc ou de plan généré sans demande explicite.** Pour
  documenter une décision durable, ajouter une note dans `docs/`.
- **UI = à tester dans le navigateur.** Le typecheck ne valide pas qu'un écran
  fonctionne. Lancer `pnpm dev`, vérifier desktop + mobile, et signaler
  explicitement si la vérification visuelle n'a pas pu être faite.
- **Mobile-first.** L'historique récent est dominé par des correctifs mobile
  (`EDO-260` à `EDO-266`) — toujours valider la version mobile avant de
  considérer un changement terminé.

## Variables d'environnement attendues (front)

- `VITE_STRAPI_URL` (défaut : `https://cms.e-do.studio`)
- `VITE_STRAPI_TOKEN` — token API read-only
- `VITE_STRAPI_PREVIEW_TOKEN` — token pour le mode preview (drafts)
- Variables Supabase (cf. `src/lib/supabase.ts`)

Ne jamais committer `.env*` (déjà gitignoré).

## Quand demander avant d'agir

- Modifier une migration Supabase existante, supprimer une table/colonne.
- Toucher au schéma Strapi ou aux content-types.
- Supprimer une route ou changer une URL publique (SEO).
- Introduire une nouvelle dépendance lourde (UI kit, state lib, etc.).
