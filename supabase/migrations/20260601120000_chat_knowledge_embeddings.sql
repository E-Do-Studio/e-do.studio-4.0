-- Chatbot semantic retrieval — pgvector + content hash for incremental reindex.
--
-- Adds an `embedding` column (Gemini text-embedding-004, 768 dims) and a
-- `content_hash` column to `chat_knowledge_chunks`. The indexer
-- (`scripts/build-chat-knowledge.mjs`) writes both via the service role;
-- the chat edge function reads them through the SECURITY DEFINER RPC
-- `match_chat_chunks` for cosine similarity search filtered by language.
--
-- HNSW chosen over IVFFlat: no training pass required, perf is good from
-- row 1, memory cost is irrelevant at our scale (<300 chunks).

create extension if not exists vector;

alter table chat_knowledge_chunks
  add column if not exists embedding vector(768);

alter table chat_knowledge_chunks
  add column if not exists content_hash text;

create index if not exists chat_knowledge_chunks_embedding_idx
  on chat_knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

create or replace function match_chat_chunks(
  query_embedding vector(768),
  match_lang text,
  match_count int default 8
)
returns table (
  id text,
  kind text,
  slug text,
  lang text,
  title text,
  url text,
  body text,
  tags text[],
  similarity double precision
)
language sql
stable
as $$
  select
    c.id,
    c.kind,
    c.slug,
    c.lang,
    c.title,
    c.url,
    c.body,
    c.tags,
    1 - (c.embedding <=> query_embedding) as similarity
  from chat_knowledge_chunks c
  where c.lang = match_lang
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

revoke all on function match_chat_chunks(vector, text, int) from public;
grant execute on function match_chat_chunks(vector, text, int) to service_role;
