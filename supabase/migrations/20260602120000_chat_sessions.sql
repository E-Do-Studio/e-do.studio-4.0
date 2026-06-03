-- Chat session persistence (Sens B — feed the second brain / LLM wiki).
--
-- One row per client conversation; the full transcript lives in `messages`
-- (jsonb array of {role, content}). Written by the `chat` edge function ONLY
-- when the visitor consented; read by the batch export job
-- (scripts/export-chat-sessions.mjs), which ships consented transcripts to the
-- wiki API over Tailscale and flips `exported`.
--
-- RGPD: this stores visitor messages (potential PII). Three guards:
--   1. write is consent-gated (edge function sets consent=true only then);
--   2. the IP is stored hashed (ip_hash), never raw;
--   3. rows auto-expire (expires_at) — see purge_expired_chat_sessions() below.

create table if not exists chat_sessions (
  id uuid primary key,
  lang text not null check (lang in ('fr', 'en')),
  last_page text,
  ip_hash text,
  consent boolean not null default false,
  messages jsonb not null default '[]'::jsonb,
  turns int not null default 0,
  exported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);

create index if not exists chat_sessions_exported_idx on chat_sessions (exported, updated_at);
create index if not exists chat_sessions_expires_idx on chat_sessions (expires_at);

alter table chat_sessions enable row level security;
-- No policies — only the edge function / export job (service role) read/write.

-- Retention purge. Either schedule it with pg_cron, e.g.
--   select cron.schedule('purge-chat-sessions', '0 4 * * *',
--                        'select purge_expired_chat_sessions()');
-- or call it from the export job (scripts/export-chat-sessions.mjs does).
create or replace function purge_expired_chat_sessions()
returns integer
language sql
as $$
  with deleted as (
    delete from chat_sessions where expires_at < now() returning 1
  )
  select count(*)::int from deleted;
$$;

revoke all on function purge_expired_chat_sessions() from public;
grant execute on function purge_expired_chat_sessions() to service_role;
