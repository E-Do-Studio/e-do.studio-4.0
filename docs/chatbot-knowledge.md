# Chatbot knowledge base — operations runbook

The site assistant (`AssistantChat`, Supabase Edge Function `chat`) grounds its
answers in a knowledge base sourced from Strapi. This document explains how the
index is built, how to refresh it after CMS changes, and how to verify the
pipeline.

## Pipeline overview

```
Strapi (cms.e-do.studio)  +  scripts/chat-knowledge-static/*.json
   │
   │  scripts/build-chat-knowledge.mjs   (embeddings: gemini-embedding-001, 768d)
   ▼
Supabase table chat_knowledge_chunks   (pgvector + content_hash)
   │
   │  supabase/functions/chat   (cold-start cache for identity chunk, 5 min TTL)
   ▼
GLM-5.1 primary  →  Gemini 2.5 Flash fallback   (function-calling on check_availability)
```

Both providers share the same `check_availability` tool declaration and the
same execution callback in `availability.ts`. The handler tries GLM first; on
failure (timeout, 5xx after retries, invalid response) it falls back to
Gemini for the same turn from scratch. Embeddings stay on Gemini
(`gemini-embedding-001`) — only chat completion is dual-provider.

Each chunk row carries: `id`, `kind`, `slug`, `lang`, `title`, `url`, `body`,
`tags`, `content_hash`, `embedding (vector(768))`, `updated_at`. Retrieval is a
**cosine similarity search** over Gemini `text-embedding-004` embeddings,
filtered by language, via the `match_chat_chunks` RPC. The chunk with
`kind = 'site'` and `slug = 'identity'` is always pinned in the prompt so the
bot has core contact / address / hours facts even when retrieval misses.

In addition to Strapi content, the indexer ingests static FAQ chunks from
`scripts/chat-knowledge-static/*.json` (one file per language). This is where
workflow / production-advice Q&A lives (which plateau for which project,
typical durations, post-prod turnaround, etc.) — edit those JSON files and
re-index to extend coverage.

## When to re-index

- After publishing any change in Strapi that affects: plateaux, post-production
  types, blog posts, legal sections, site settings, team members, gallery
  projects.
- After deploying a Strapi schema change that touches one of the collections
  the script reads (see `scripts/build-chat-knowledge.mjs` for the list).
- On a recurring schedule (weekly is fine — the script is idempotent and prunes
  stale rows automatically).

## Running the indexer

### Local

```bash
# .env.local or .env must define:
#   STRAPI_URL=https://cms.e-do.studio
#   STRAPI_TOKEN=<read-only Strapi API token>
#   SUPABASE_URL=https://<project>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
#   GEMINI_API_KEY=<Gemini API key (text-embedding-004)>
#   SITE_URL=https://e-do.studio       # optional, defaults to https://e-do.studio
pnpm chat:reindex
```

The script:
1. Fetches FR + EN content from Strapi (machines incl. cyclorama,
   post-production types, blog posts, legal sections, team, site settings).
2. Loads static workflow FAQ from `scripts/chat-knowledge-static/*.json`.
3. Builds one chunk per logical unit per language; computes a content hash
   (sha256 of title+url+body+tags).
4. Incremental embedding: only chunks with a new/changed hash (or a null
   embedding) are sent to Gemini `text-embedding-004:batchEmbedContents`.
5. Upserts into `chat_knowledge_chunks` via the service role.
6. Deletes any rows whose `id` is no longer present in the new corpus.

### Dry run (no writes)

```bash
CHAT_KNOWLEDGE_DRY_RUN=1 npm run chat:reindex
```

Prints a compact list of `{id, title, lang, bytes}` so you can sanity-check the
chunk inventory before pushing it to Supabase.

### Production refresh

The indexer can be scheduled by any worker with access to the env above. Two
recommended options:

- **Supabase Scheduled Trigger** — call `npm run chat:reindex` from a GitHub
  Actions cron, or wire a Strapi webhook (`afterUpdate`/`afterCreate`) that
  hits a deploy hook running the script.
- **Manual on demand** — run the script locally with prod env after a major
  CMS update.

Either way, no downtime is required: the edge function reads the table on each
cold start and refreshes its in-memory cache every 5 minutes.

## Verifying the pipeline

1. Run a dry-run and confirm every page you expect is in the inventory.
2. Run the actual reindex; check the `chat_knowledge_chunks` table in Supabase
   Studio.
3. Hit the chat with a question that depends on a specific chunk (e.g. ask for
   the cyclorama half-day rate, or for a recent blog post title). The reply
   should quote the precise CMS value and link to the corresponding page URL.

## Adding a new content type

1. Add a `buildXChunks()` function in `scripts/build-chat-knowledge.mjs` that
   fetches from Strapi and returns one or more chunk objects (FR + EN). Use
   stable, kebab-case `id`s — they're the upsert key.
2. Add the new builder's promise to the `Promise.all` in `main()`.
3. Run with `CHAT_KNOWLEDGE_DRY_RUN=1` to confirm the chunks look right.
4. Reindex.

The edge function does not need to be redeployed — it discovers new chunks
automatically via the table read.

## Availability lookup (EDO-220)

In addition to the CMS knowledge base, the edge function can answer "do you
have a slot on…" questions by consulting the booking calendar. The contract
lives in `supabase/functions/chat/availability.ts`:

- The chat handler exposes a `check_availability` Gemini tool. The LLM
  decides when to call it based on the turn — there is no longer a separate
  keyword intent detector on the runtime path (the legacy
  `detectAvailabilityIntent` export is kept for the unit tests only).
- When triggered, the function reads `bookings` / `booking_sessions` with a
  **strict column projection** (`preferred_date`, `arrival_hour`, plus only
  `plateau_key` and `hours` on sessions). Every row is then passed through
  `sanitizeBookingProjection`, which drops any non-whitelisted key as a
  defense-in-depth check — even if the SELECT is widened by mistake, no PII
  reaches the LLM.
- The result handed to the system prompt is a list of computed **free slots
  only** (date, plateau, hour range, duration) plus the booking page link.
  Raw booking rows never appear in the prompt.
- The system prompt has an explicit non-negotiable rule forbidding the model
  from mentioning anything about other bookings or clients.

Run the regression tests with:

```bash
deno test --allow-env --allow-read --allow-net supabase/functions/chat/availability_test.ts
```

The PII-leak test (`getAvailability end-to-end: prompt block never contains
injected PII`) is the security backstop: it asserts that even when the
backend returns rows poisoned with `client_name`, `client_email`,
`client_phone`, `notes`, `total_estimate`, `reference`, etc., none of those
values can be found in the final prompt block. If you touch the whitelist or
the SELECT statement, this test MUST stay green.

## Limits & roadmap

- **Retrieval is semantic** (pgvector cosine, Gemini `text-embedding-004`,
  768 dims, HNSW index). Scales comfortably to thousands of chunks.
- **Incremental refresh.** Chunks with an unchanged `content_hash` and a
  non-null embedding are skipped during reindex — only new or modified rows
  are sent to the embedding API.
- **Static FAQ corpus** in `scripts/chat-knowledge-static/*.json`: edit + run
  `pnpm chat:reindex`. If editorial wants ownership, a Strapi `chat-faq`
  content-type is a possible follow-up.
- **Hard rate limits** stay on the edge function (20 turns / 10 min, 100 /
  day per IP hash).
- **Page context.** The frontend (`AssistantChat`) sends the current path as
  `currentPage`. The handler validates it (`/^\/[a-z0-9/_-]*$/i`, max 200
  chars), maps known patterns to a short hint, and injects them into the
  system prompt so the bot can answer in the user's current page context.
