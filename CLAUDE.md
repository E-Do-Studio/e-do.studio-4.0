# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Public e-do.studio site (FR/EN) — a photo/video studio: editorial pages, gallery,
booking funnel, chatbot. **Server-rendered** (TanStack Start), fed by Strapi
(content) and Supabase (booking, chat, emails, calendar).

## Commands

```bash
pnpm dev          # TanStack Start dev server (SSR), --host 0.0.0.0
pnpm typecheck    # tsc --noEmit  ← widest safety net, run before any non-trivial commit
pnpm test         # vitest run (6 files, ~170 cases, < 1s)
pnpm test:watch
pnpm lint         # biome lint
pnpm check        # biome check --write (lint + format)
pnpm build        # → dist/client (assets) + dist/server/server.js (fetch handler)
pnpm preview
pnpm chat:reindex # rebuilds the chatbot knowledge index from Strapi
pnpm hubspot:setup
```

Single test file: `pnpm vitest run src/lib/nav.test.ts`.
Single case: `pnpm vitest run -t "test name"`.

Node ≥ 22, **pnpm** only (do not reintroduce a `package-lock.json`).

Three safety nets, all must stay green: `typecheck`, `test`, `lint`. The
typecheck is the widest — `noUnusedLocals: true` turns any newly-orphaned
variable into an error, which certifies a refactor is complete file by file.
None of them proves a screen *works*: see "Verifying a UI change".

## Architecture

### Render pipeline (SSR, non-streaming)

`vite.config.ts` (`tanstackStart` plugin, before `react()`) → `src/routes/`
→ `src/routeTree.gen.ts` (**generated, never hand-edit**) → `src/router.tsx`
(`getRouter()` factory, a fresh instance per request) → `src/server.ts` (app
server entry) → `server.mjs` (production HTTP façade, also serves `dist/client`)
→ Caddy in front (legacy 301s, security headers, 404, maintenance mode).

Two structural choices, documented in the files themselves — read them before
touching either:

- **`src/server.ts` uses `defaultRenderHandler`, not streaming.** Start's stream
  transformer caps what it buffers after `</body>` at 64 KB; on `/fr/galerie`
  (~316 KB of HTML) the render blew past it and took the process down. There was
  nothing to stream anyway: all data resolves in loaders before render.
- **Route components are imported statically**, not via `lazyRouteComponent` —
  without streaming, the server would render the Suspense fallback instead of
  the content.

Corollary: **no data is ever fetched in a `useEffect`.** An effect never runs on
Node; the HTML would ship empty. Everything goes through route loaders.

### URLs and navigation

- **`src/lib/screens.ts` is the source of truth for URLs.** `LOCALIZED` table
  (path by path, not segment by segment), `SCREEN_TO_PATH`, `BOOK_PATHS`,
  `translatePathname` (FR↔EN switch that translates the slug, not just the
  prefix). It lives outside the router: a page importing `router.tsx` would
  create a cycle, since the router already imports the pages.
- **Every translated page answers under both slugs in both languages** —
  `/fr/galerie`, `/fr/gallery`, `/en/galerie`, `/en/gallery` all mount the same
  page (two route files). Hence `bothSlugs()` for anything that recognizes a
  page from a path, and an explicit `canonical` in each `head()`.
- **`src/lib/nav.ts`** holds cell order, labels, and the path prefixes that light
  up the current entry. No React, therefore testable (`nav.test.ts`).
- Adding a page = create the route file **and** the `SCREEN_TO_PATH` entry (plus
  `LOCALIZED` if the slug differs per language).
- `src/routes/$lang/route.tsx` returns a 404 on an unknown language — `$lang`
  captures any first segment.

### Data

| Source | Path | Notes |
|---|---|---|
| Strapi | `src/lib/strapi.ts` | single fetcher: 5 min cache capped at 200 entries, in-flight request dedup, revalidation backoff, preview-mode bypass |
| Supabase (front) | `src/lib/supabase.ts` | lazy client behind a Proxy; never instantiate an ad-hoc client |
| Shared FR/EN loaders | `src/lib/route-data.ts` | `settle()` = `.catch(() => null)`: a Strapi outage degrades the page, it does not take the site down |
| Global data | `src/routes/__root.tsx` loader → `SiteData` → `PageContext` | contact, socials, hours, machines, `siteDefaults` — passed down by context, never re-fetched per component |

`usePageContext()` (`src/lib/page-context.ts`) exposes `lang`, `setLang`,
`openMenu`, `goto`, `siteData`. That is the channel for deep components.

### i18n

Two distinct mechanisms — do not conflate them:

| What | How |
|---|---|
| UI string inside a component | `const t = useT()` then `t('group.key')` |
| UI string outside React (`head()`, JSON-LD, helper) | `getT(lang)('group.key')` |
| Sentence with a styled fragment or a link | `<Trans i18nKey="…" components={{ name: <span /> }} />` |
| CMS content | `value[lang]` — `Bilingual<T> = { fr; en }`, i18next does not own it |

Source: `src/i18n/locales/{fr,en}.json`. The two cross-`satisfies` in
`src/i18n/index.ts` amount to structural equality — **a key present on only one
side breaks `pnpm typecheck`**; a nonexistent key is rejected by the
`i18next.d.ts` module augmentation.

One **frozen instance per locale**, never mutated: `changeLanguage` is called
nowhere. The provider derives from the same `lang` as `<html lang>`.

Never write `lang === 'fr' ? 'Oui' : 'Yes'`. The only legitimate uses of that
ternary are the `setLang(...)` toggle and picking a locale tag (`bcp47`,
`ogLocale` in `src/lib/format.ts`) — neither is a translation.

⚠️ `<Trans>` fails **silently**, rendering the raw key; the typecheck does not
catch it. Always check its output in the browser.

`src/lib/booking-engine.ts` is **outside i18next** and must stay pure (no React,
no Supabase, no i18n): it is imported by the Deno Edge Functions. Its display
labels are threaded in via `QuoteLabels`.

### UI — two distinct layers

- **`src/components/ui/`** — shadcn (`base-nova` style, [Base UI](https://base-ui.com)
  primitives, not Radix). Managed by the shadcn CLI (`components.json`),
  **excluded from Biome**. Site-specific variants (`cell`, `header` on
  `button.tsx`) are documented in place.
- **`src/ui/`** — bespoke e-do components (`page-header`, `mobile-nav-strip`,
  `hover-marquee`, `responsive-image`, `video-loop`…). This is where custom work
  goes.
- `cn` comes from **`@/lib/utils`** (clsx + tailwind-merge). No bare `clsx`.
- Tailwind v4 via `@tailwindcss/vite`: **no `tailwind.config.*`**, the theme
  lives in `src/styles.css`. The stylesheet is linked explicitly from
  `__root.tsx`'s `head()` (a side-effect import duplicates it in dev and lets
  Tailwind's default theme override ours).
- The `@/` alias must be declared in **both `tsconfig.json` and
  `vite.config.ts`** — declaring only one yields a green typecheck and a broken
  build.

### Two breakpoints, and they say different things

- **`md` (768px) means "there is more room"** — padding, type size, cell order,
  the aspect ratios of the widened stack. Nothing that decides the layout.
- **`app` (1024px, `--breakpoint-app` in `styles.css`) means "the full-screen
  bento applies"** — grid areas, column and row templates, `h-full`,
  `overflow-hidden`, `min-h-0`, and the viewport lock that comes with them.
  1024 is not a chosen number: it is the 976px the French nav band was already
  measured to need in `page-header.tsx`.
- One palier used to carry both, so every tablet got a 12-column grid built for
  1280 — inside a viewport `__root.tsx` locks with `overflow:hidden`, so what
  overflowed was clipped rather than scrollable.
- **Five things consume `app` and must move together**: the token, the critical
  CSS in `__root.tsx` (the number is *copied* there — a media query cannot read
  a custom property), `useIsDesktop`, `MobileAssistantFab`, `MobileNavStrip`.
  Leave one behind and the band between the two thresholds loses its navigation
  or its assistant.
- **A page passes placement, never geometry.** Grid area only; heights, ratios
  and padding — with their own paliers — belong to the component's `cva`.
- **Prefer `@container` to the viewport for a nested grid** whose width doesn't
  track the window (the booking tunnel, the home page's machine row).
- Rendered in full at `/dev/design-system`, section « Paliers ».

### Images — a frame, then an image

Every image on the site goes through **`MediaFrame`** (`src/ui/media-frame.tsx`)
wrapping **`ResponsiveImage`** (`src/ui/responsive-image.tsx`). Never a bare
`<img>`, never a hand-written `relative overflow-hidden aspect-[…]` box. The
reference lives at `/dev/design-system#medias`.

- **The frame owns the geometry**: `ratio` (`portrait` 4/5, `photo` 4/3, `hero`
  16/9, `fill`), `tone` (the reserve fill behind a loading image). Ratios come from
  `--aspect-*` tokens in `styles.css`, not from arbitrary values — a page grid
  needs the same measure as the frame, and only a token is shareable.
- **The image owns the fill**: `absolute inset-0 h-full w-full object-cover` is
  inside the component. Callers pass `src`, `alt`, `sizes`, and `priority` above
  the fold. `sizes` is required and must match what the cell really measures —
  three call sites overstated it and downloaded oversized derivatives.
- **Size a media grid on the area's HEIGHT, never on its width.** Fill the width
  and the cell ratio becomes `(rows / columns) × (area width / area height)` —
  the window's shape, not the one you chose. Measured, it fell to **0.39**:
  vertical slices. Fix the ratio on width-driven rows instead and the grid
  overflows by 654px at 1440×900, so it scrolls. **A scrolling media panel is a
  bug — the site is viewport-locked.** Height-driven is the only writing that
  holds all three.
  ```tsx
  // The area: a size container, the grid pushed to the screen edge.
  <div className="app:flex app:h-full app:justify-end app:overflow-hidden
                  app:bg-background app:[container-type:size]">
    // 3 rows → each is 100cqh/3; a 4/5 tile is 80% of that; two of them wide.
    <div className="grid grid-cols-2 gap-px bg-border
                    app:h-full app:w-[min(100cqw,calc(160cqh/3))] app:grid-rows-3">
      <MediaFrame className="aspect-portrait app:aspect-auto" />
  ```
  The leftover width becomes one band of page background beside the grid, never
  bands inside the tiles and never a scrollbar. Measured at eight sizes from
  390 to 2560: the tile is **0.80 everywhere**, nothing scrolls.
- `cqh` needs a **size** container, so the area's height must not come from its
  content: the grid row above the `app` breakpoint. Below it, drop the container
  entirely — the page scrolls normally, two columns of `aspect-portrait`, like
  the gallery.
- **Nothing renders alt text while loading**: `img { color: transparent }` in the
  base layer. The fade-in is set by a callback ref, never at server render — an
  `opacity-0` in the SSR HTML would leave a JS-less client blank.

### Naming a page — two levels, two rules

- **The header band names the destination, and it derives it.** `PageHeader`
  reads `pageLabelKey()` (`src/lib/nav.ts`) off the current path — the same table
  that feeds the nav cells and the drawer. **Never pass a page name in.** It used
  to be hand-written per caller and drifted: « Post-prod » in the band,
  « Post-production » in the drawer, a third literal hardcoded in the page. The
  only prop left is `note`, for page-local information (the home page's CMS
  announcement, its opening hours otherwise). Two pages stay unnamed: the home
  page, whose wordmark sits right beside the cell and already says it, and the
  404, which is nowhere.
- **The body names the content, through `SectionIntro`.** `size` picks the
  register: `xs` repeated header, `sm` section band, `lg` page header, `flow`
  same as `lg` for a cell that already carries its own padding. `kicker` takes a
  node (`StepHeading`, `StatusBadge`), `titleRef` focuses the heading after a
  navigation.
- **A page with no visible title is a decision, not an omission** — gallery and
  contact keep an `sr-only` `h1` because their first cell *is* the title. The
  reason is written in `section-intro.tsx`; if you add such a page, write yours
  there too.

### SEO

`src/lib/seo-meta.ts` (the `META` table) + `buildSeoHead()` (`seo-head.ts`) +
`structured-data.ts` (JSON-LD). Each indexable route's `head()` composes them;
`__root.tsx` lays the `LocalBusiness` + `WebSite` baseline that other schemas
reference by `@id`. Every indexable route must supply its own canonical and
alternates.

### Supabase backend

- `supabase/migrations/YYYYMMDDHHMMSS_<subject>.sql` — one migration = one dated
  file. **Never modify an already-applied migration**; create a new one.
- `supabase/functions/` (Deno): `chat` (Gemini + knowledge base + rate limiting),
  `create-booking`, `send-email` (+ HubSpot sync), `calendar-sync`, `ical`,
  `_shared/`.
- Runbooks: `docs/booking-system.md`, `docs/chatbot-knowledge.md`,
  `supabase/SETUP.md`.

## Code conventions

- **Strict TypeScript**, `noUnusedLocals` on, `noImplicitAny` off — still prefer
  explicit types over `any`.
- One component per file, kebab-case filename (`mobile-nav-strip.tsx`),
  PascalCase component. No `default export` outside routes.
- **No narrative comments.** A comment answers *why* when it isn't obvious
  (constraint, reference bug, subtle invariant) — that's the dominant form in
  this repo and it carries most of the knowledge. Otherwise, delete it. Existing
  comments are in French; match the file you are editing.
- **No class-name constants.** `const FOOTER_ACTION = 'min-w-0 flex-1 …'` is a
  component that was never written. Banned outright — including `as const` maps
  keyed by a variant name (`const TITLE_SIZE = { sm: '…', lg: '…' }`), which are
  the same thing wearing a type.
  - It escapes Tailwind IntelliSense and the class sorter, and `tailwind-merge`
    cannot arbitrate a conflict it never sees as two classes.
  - It hides what the JSX renders: reading the component no longer tells you.
  - It is always a hair away from being a real abstraction, and never becomes
    one — the constant is private to its file, so the next site copies the
    string instead.
  - Two mechanisms cover every case: repeated with variants → **`cva`**
    (`mono-label.tsx`, `select-tile.tsx`, `rail-cell.tsx`); used once → **inline
    in `className`**. Three identical inline lines beat one constant.
  - The only exception is `src/dev-inventory/`, whose whole purpose is to quote
    the old markup verbatim.
- **Never hand-write a component that already exists.** A page composes; it does
  not re-draw. If a screen needs a tile, a rail cell, a form cell, a CTA or a
  quote table, it calls the one in `src/ui/` — it does not assemble a `<Button
  variant="cell" size="cell">` with its own number, arrow, title and footer.
  - This is the founding rule of the design system, and the reason it exists.
    Every drift this repo has suffered started as one hand-written copy: seven
    CTA heights, five marker treatments for the same selection, thirteen rail
    implementations. A copy is never wrong on the day it is written — it drifts
    on the day the original changes and it does not.
  - **A hand-written copy also misses the invisible half.** `size="cell"` carries
    `font-sans`, the touch target, the focus ring, the overflow rules. Copies
    reproduce what is visible and silently drop the rest — every title on the
    site rendered in monospace for months because of exactly that.
  - The component missing a prop is not a reason to copy it: **add the prop**.
    `SelectTile` gained `footer`, then `price`, then `href` that way, and each
    time the existing callers benefited.
  - A **component file** in `src/ui/` or `src/discovery/` may of course use
    `Button` directly — that is where the drawing belongs. The rule targets
    pages: `home-page.tsx`, `gallery-page.tsx`, `postprod-page.tsx` must contain
    no `size="cell"` of their own.
- **No feature creep**: a fix does not refactor its neighborhood, a feature does
  not introduce just-in-case abstraction. Three similar lines beat a premature
  abstraction.
- **No defensive fallbacks** for cases that cannot happen. Validate at the
  boundaries (user input, API responses) and trust the rest. The inverse holds on
  client-facing flows (booking, email, payment): **no silent failures** — an
  error must be visible, logged and surfaced, never swallowed.
- **No doc or plan file generated without an explicit request.** To record a
  durable decision, add a note under `docs/`.
- **Never chain words with `·`.** `TIPS · 3 MIN · Studio · 31 juil` is not a
  sentence, it is four values a machine could not decide how to lay out. It reads
  as generated filler and it is banned in any user-facing string — labels, meta
  lines, cell subtitles, i18n values, chatbot replies.
  - Give each value its own element and let the layout separate them (a gap, a
    `Separator`, a cell of the bento grid). The site already separates by
    hairline everywhere else — the middot is redundant with it.
  - If two values genuinely belong on one line, write the sentence: `3 min de
    lecture`, `Ouvert 7j/7`.
  - Drop the value instead when it is constant across every record. `author` was
    hardcoded to `'Studio'` in `strapi.ts`, so `· Studio ·` informed nobody.
  - This is a real backlog, not a clean rule: ~95 occurrences remain in `src/`
    plus 24 in `src/i18n/locales/`. Clear them in the files you touch; do not
    open a sweep for it.
- **Never fill an empty value with a dash.** `{contact.siren || '—'}`,
  `placeholder="—"`, a `<span>—</span>` standing in for an empty list: banned in
  every form. It is the same failure as the middot — a character emitted because
  the code had nothing to say, which the reader must then decode.
  - A dash claims the value is *known and empty*. It never is: it means either
    "not filled in yet", "not applicable", or "we haven't loaded it". Three
    different states collapsed into one glyph that distinguishes none of them.
  - **A missing optional value hides its row.** Don't render a label whose value
    is a placeholder — the row costs a line and teaches nothing.
  - **A missing required value says what is missing**, in words, and links back
    to where it is filled in. That is the one case worth a row.
  - **A placeholder gives an example or a format** (`06 12 34 56 78`,
    `camille@votremarque.fr`), never a dash and never a repeat of the label —
    the label already sits above the field. `FormCellInput` makes `placeholder`
    required for exactly this reason; a dash satisfies the type and defeats the
    intent.
  - **An empty list gets an empty state**, not a dash. `Empty` /
    `EmptyTitle` exist in `src/components/ui/empty.tsx` and are already used on
    five screens.

## Tests

`vitest.config.ts` is **separate** from `vite.config.ts`: tests target pure
modules and load neither the Start plugin nor Tailwind.

- `environment: 'node'`, `include: ['src/**/*.test.ts']`.
- ⚠️ A `.test.tsx` would **never run** — keep testable logic outside React
  (that's why `nav.ts` has no React dependency).
- Currently covered: `booking-engine`, `booking-schema`, `nav`,
  `render-markdown`, `strapi-selectors`, `structured-data`.

## Verifying a UI change

The typecheck does not prove a screen works. Run `pnpm dev`, check **desktop and
mobile**, and say so explicitly if visual verification couldn't be done.

**Local gotcha**: without a valid `VITE_STRAPI_TOKEN`, Strapi answers 401,
`settle()` swallows the error, and every content-driven page renders **empty**.
That is not a regression — check `.env` before diagnosing.
In dev, Vite proxies `/api` → `cms.e-do.studio` (Node-side loaders hit the CMS
with an absolute URL).

Mobile-first: the history is dominated by mobile fixes; always validate mobile
before considering a change done.

## Workflow

- One PR per change, merged into `main`. No long-lived branches.
- Commits & PR titles: Conventional Commits with a scope + Linear reference.
  Messages are written in French, like the code comments.
  ```
  feat(nav): navigation fixe et item courant marqué (EDO-XXX)
  refactor(ui): PageHeader lit PageContext au lieu de recevoir trois rappels (EDO-XXX)
  ```
  Scope = the area (page, component, domain), not the file.
- Orca worktrees: `scripts/worktree-setup.sh` copies the gitignored `.env` files
  over from the main checkout (see `orca.yaml`). When several agents share a
  worktree, stay inside your scope — never reformat or commit other agents'
  files.
- Env vars: see `.env.example` (roles detailed in the README). `VITE_*` are
  supplied **at build time** (see the Dockerfile `ARG`s); Edge Function secrets
  never carry a `VITE_` prefix.

## Ask before acting

- Modifying an existing Supabase migration, dropping a table/column.
- Touching the Strapi schema or content types.
- Removing a route or changing a public URL — `screens.ts` opens with that
  warning: check the sitemap and the `Caddyfile` redirects.
- Introducing a heavy new dependency (UI kit, state lib…).
