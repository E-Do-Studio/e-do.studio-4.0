// Base de connaissances du chat : les fragments et leurs embeddings, gardés en
// mémoire quelques minutes, classés par similarité cosinus. Quelques centaines
// de fragments de 768 dimensions : un parcours complet coûte moins d'une
// milliseconde, sans extension pgvector.
import type { Queryable } from '../db.ts';

export type Lang = 'fr' | 'en';

export interface KnowledgeChunk {
  id: string;
  kind: string;
  slug: string | null;
  lang: Lang;
  title: string;
  url: string | null;
  body: string;
  tags: string[];
}

interface StoredChunk extends KnowledgeChunk {
  embedding: number[] | null;
  norm: number;
}

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; chunks: StoredChunk[] } | null = null;

const normOf = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

export function invalidateKnowledge(): void {
  cache = null;
}

export async function loadKnowledge(q: Queryable): Promise<StoredChunk[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.chunks;
  const rows = await q.query<KnowledgeChunk & { embedding: number[] | null }>(
    `SELECT id, kind, slug, lang, title, url, body, tags, embedding
     FROM chat_knowledge_chunks`,
  );
  const chunks = rows.map((r) => ({
    ...r,
    embedding: r.embedding,
    norm: r.embedding ? normOf(r.embedding) : 0,
  }));
  cache = { at: Date.now(), chunks };
  return chunks;
}

const strip = ({ embedding: _e, norm: _n, ...chunk }: StoredChunk): KnowledgeChunk =>
  chunk;

/** Les `count` fragments les plus proches, dans la langue (même règle que match_chat_chunks). */
export function rankChunks(
  chunks: StoredChunk[],
  query: number[],
  lang: Lang,
  count: number,
): KnowledgeChunk[] {
  const qn = normOf(query);
  if (qn === 0) return [];
  return chunks
    .filter((c) => c.lang === lang && c.embedding && c.norm > 0)
    .map((c) => {
      let dot = 0;
      const e = c.embedding as number[];
      for (let i = 0; i < e.length; i += 1) dot += e[i] * query[i];
      return { c, score: dot / (c.norm * qn) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ c }) => strip(c));
}

export function pinnedIdentity(chunks: StoredChunk[], lang: Lang): KnowledgeChunk | null {
  const found = chunks.find((c) => c.kind === 'site' && c.slug === 'identity' && c.lang === lang);
  return found ? strip(found) : null;
}

export function wikiInstructions(chunks: StoredChunk[]): string | null {
  return chunks.find((c) => c.kind === 'instructions')?.body ?? null;
}
