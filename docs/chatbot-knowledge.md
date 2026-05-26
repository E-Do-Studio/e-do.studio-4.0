# Chatbot knowledge base — operations runbook

The site assistant (`AssistantChat`, Supabase Edge Function `chat`) grounds its
answers in a knowledge base sourced from Strapi. This document explains how the
index is built, how to refresh it after CMS changes, and how to verify the
pipeline.

## Pipeline overview

```
Strapi (cms.e-do.studio)
   │
   │  scripts/build-chat-knowledge.mjs
   ▼
Supabase table chat_knowledge_chunks
   │
   │  supabase/functions/chat (cold-start cache, 5 min TTL)
   ▼
Gemini 2.5 Flash (with retrieved top-K chunks injected into the system prompt)
```

Each chunk row carries: `id`, `kind`, `slug`, `lang`, `title`, `url`, `body`,
`tags`, `updated_at`. Retrieval is a token-overlap score (title and tags
weighted, stopwords stripped, accent-folded) per language. The chunk with
`kind = 'site'` and `slug = 'identity'` is always pinned in the prompt so the
bot has core contact / address / hours facts even when retrieval misses.

## When to re-index

- After publishing any change in Strapi that affects: plateaux, post-production
  types, blog posts, legal sections, site settings, contact subjects, team
  members, gallery projects.
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
#   SITE_URL=https://e-do.studio       # optional, defaults to https://e-do.studio
npm run chat:reindex
```

The script:
1. Fetches FR + EN content from Strapi (cyclorama, machines, post-production
   types, blog posts, legal sections, team, site settings, gallery overview,
   contact subjects).
2. Builds one chunk per logical unit per language.
3. Upserts into `chat_knowledge_chunks` via the service role.
4. Deletes any rows whose `id` is no longer present in the new corpus.

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

## Limits & roadmap

- **Retrieval is keyword-only** (title × 3, tags × 2, body × 1). Good enough
  for the current corpus (~30-60 chunks). When the blog grows beyond ~200
  posts, add an embedding column and switch to pgvector cosine search.
- **No incremental refresh.** Each run rebuilds the full corpus. With ~60
  chunks this is well under a second of Strapi traffic.
- **Hard rate limits** stay on the edge function (20 turns / 10 min, 100 /
  day per IP hash).
