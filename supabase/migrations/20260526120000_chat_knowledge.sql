-- Chatbot knowledge base sourced from Strapi.
-- One row per chunk (per language). Edge function `chat` reads this table on
-- cold start and uses it to ground answers; the ingestion script
-- `scripts/build-chat-knowledge.mjs` writes it via the service role.

create table if not exists chat_knowledge_chunks (
  id text primary key,
  kind text not null,
  slug text,
  lang text not null check (lang in ('fr', 'en')),
  title text not null,
  url text,
  body text not null,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists chat_knowledge_chunks_lang_idx on chat_knowledge_chunks(lang);
create index if not exists chat_knowledge_chunks_kind_idx on chat_knowledge_chunks(kind);

alter table chat_knowledge_chunks enable row level security;
-- No policies — only the edge function (service role) reads/writes this table.
