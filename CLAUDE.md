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
pnpm build        # vite build
pnpm preview      # vite preview
pnpm chat:reindex # régénère l'index de connaissance du chatbot
```

Il n'y a **pas de linter ni de suite de tests** configurés. Le typecheck est
le seul filet de sécurité automatisé — il doit rester vert.

## Structure

```
src/
  router.tsx              # routes + langues (fr/en), seul endroit qui les déclare
  *-page.tsx              # pages top-level (book, contact, gallery, plateau…)
  discovery/              # section éditoriale (bento grid, overlay, cards)
  ui/                     # primitives partagées (button, chip, bottom-sheet, …)
  lib/                    # accès données (strapi, supabase, hooks)
  i18n/messages.ts        # chaînes UI bilingues
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
- **Bilingue** : tout contenu localisé passe par `Bilingual<T> = { fr; en }` ;
  les chaînes d'UI vivent dans `src/i18n/messages.ts`. Ne jamais hardcoder un
  libellé FR ou EN dans un composant.
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
