-- Le reste de Supabase : la base de connaissances du chat et l'historique du
-- formulaire de contact. Mêmes colonnes que la prod Supabase (relevé du
-- 09/11/2026), pour que l'import garde les mêmes ids.

-- Fragments de connaissance du chat, écrits par scripts/build-chat-knowledge.mjs.
-- L'embedding (768 dimensions, gemini-embedding-001) est un real[] : la
-- similarité se calcule en mémoire sur quelques centaines de fragments
-- (chat/knowledge.ts), sans extension pgvector.
CREATE TABLE chat_knowledge_chunks (
  id text PRIMARY KEY,
  kind text NOT NULL,
  slug text,
  lang text NOT NULL,
  title text NOT NULL,
  url text,
  body text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  embedding real[],
  content_hash text
);

CREATE INDEX chat_knowledge_chunks_lang_idx ON chat_knowledge_chunks (lang);

-- Chaque message reçu par le formulaire, envoyé ou écarté (spam, débit) : la
-- seule trace d'un faux positif sur un vrai prospect.
CREATE TABLE contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nom text NOT NULL,
  email text NOT NULL,
  telephone text,
  societe text,
  message text NOT NULL,
  ip_hash text,
  spam_score integer,
  spam_reason text[],
  delivered boolean NOT NULL DEFAULT false
);

CREATE INDEX contact_submissions_created_idx ON contact_submissions (created_at);
