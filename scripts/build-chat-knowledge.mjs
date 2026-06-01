#!/usr/bin/env node
// Indexer for the E-DO chatbot knowledge base.
//
// Reads:
//   - Strapi (cyclorama is in `machines`, post-production-types, blog-posts,
//     legal-sections, team-members, site-setting).
//   - Static FAQ files in scripts/chat-knowledge-static/*.json.
//
// Writes:
//   - chat_knowledge_chunks (id, kind, slug, lang, title, url, body, tags,
//     content_hash, embedding) via the service role.
//   - Prunes rows whose id is no longer in the corpus.
//
// Embeddings: Gemini text-embedding-004 (768d), via batchEmbedContents.
// Incremental: only re-embeds chunks whose (title+body+tags) hash changed
// or whose embedding column is null.
//
// Required env:
//   STRAPI_URL, STRAPI_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   GEMINI_API_KEY.
// Optional env:
//   SITE_URL (default https://e-do.studio), CHAT_KNOWLEDGE_DRY_RUN=1.

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Env ──────────────────────────────────────────────────────────────────

function firstSet(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
}

function requireEnv(...names) {
  const v = firstSet(...names);
  if (!v) {
    console.error(`Missing env: one of ${names.join(', ')}`);
    process.exit(1);
  }
  return v;
}

const STRAPI_URL = firstSet('STRAPI_URL', 'NEXT_PUBLIC_STRAPI_URL', 'VITE_STRAPI_URL') || 'https://cms.e-do.studio';
const STRAPI_TOKEN = requireEnv('STRAPI_TOKEN', 'VITE_STRAPI_TOKEN', 'STRAPI_API_TOKEN');
const SUPABASE_URL = requireEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = requireEnv('GEMINI_API_KEY');
const SITE_URL = process.env.SITE_URL || 'https://e-do.studio';
const DRY_RUN = process.env.CHAT_KNOWLEDGE_DRY_RUN === '1';

const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIMS = 768;
const MAX_BODY_CHARS = 3000;
// Free tier on gemini-embedding-001 is 100 requests/minute; each item in a
// batchEmbedContents call counts as one request. Keep one batch under that
// ceiling and serialise — 80 items + concurrency 1 leaves headroom for retries.
const BATCH_SIZE = 80;
const CONCURRENCY = 1;

// ─── Strapi fetch ─────────────────────────────────────────────────────────

async function strapi(path, params) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (k === 'populate' && v.includes(',')) {
        v.split(',').forEach((field, i) => url.searchParams.append(`populate[${i}]`, field.trim()));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${STRAPI_TOKEN}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Strapi ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function strapiBilingual(path, params) {
  const [fr, en] = await Promise.all([
    strapi(path, { ...params, locale: 'fr' }),
    strapi(path, { ...params, locale: 'en' }),
  ]);
  return { fr, en };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function clip(s, n = MAX_BODY_CHARS) {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + '…';
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function joinWithBullets(items) {
  return items.filter(Boolean).map((s) => `- ${s}`).join('\n');
}

// Flatten Strapi 5 "blocks" rich-text into plain text for embedding/grounding.
function blocksToText(blocks) {
  if (!Array.isArray(blocks)) return '';
  const parts = [];
  for (const node of blocks) {
    if (!node) continue;
    if (typeof node.text === 'string') {
      parts.push(node.text);
    } else if (Array.isArray(node.children)) {
      parts.push(blocksToText(node.children));
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function pageUrl(lang, segment) {
  return `${SITE_URL}/${lang}/${segment}`;
}

const BOOKING_SEGMENT = { fr: 'reserver', en: 'book' };
const POSTPROD_SEGMENT = { fr: 'post-production', en: 'post-production' };
const CONTACT_SEGMENT = { fr: 'contact', en: 'contact' };
const GALLERY_SEGMENT = { fr: 'galerie', en: 'galerie' };
const DISCOVERY_SEGMENT = { fr: 'discovery', en: 'discovery' };
const CYCLO_SEGMENT = { fr: 'cyclorama', en: 'cyclorama' };
const LEGAL_SEGMENT = { fr: 'mentions-legales', en: 'legal' };

// ─── Chunk builders ───────────────────────────────────────────────────────

function buildIdentityChunks(siteFr, siteEn) {
  const out = [];
  for (const lang of ['fr', 'en']) {
    const s = lang === 'fr' ? siteFr : siteEn;
    const phone = s?.phone ?? '+33 1 44 04 11 49';
    const email = s?.email ?? 'contact@e-do.studio';
    const addr = s?.address;
    const street = addr?.street ?? s?.street ?? '6 rue du Landy';
    const postal = addr?.postalCode ?? s?.postalCode ?? '93400';
    const city = addr?.city ?? s?.city ?? 'Saint-Ouen-sur-Seine';
    const fullAddress = `${street}, ${postal} ${city}`;
    const keyPages = [
      pageUrl(lang, CYCLO_SEGMENT[lang]),
      pageUrl(lang, 'plateau/horizontal'),
      pageUrl(lang, 'plateau/vertical'),
      pageUrl(lang, 'plateau/eclipse'),
      pageUrl(lang, 'plateau/live'),
      pageUrl(lang, POSTPROD_SEGMENT[lang]),
      pageUrl(lang, GALLERY_SEGMENT[lang]),
      pageUrl(lang, DISCOVERY_SEGMENT[lang]),
      pageUrl(lang, CONTACT_SEGMENT[lang]),
      pageUrl(lang, BOOKING_SEGMENT[lang]),
    ];

    const body = lang === 'fr'
      ? `Studio photo & vidéo professionnel à Saint-Ouen-sur-Seine (Grand Paris). 5 plateaux + cyclorama 30 m² (Broncolor). Tarifs publics dès **450 €/jour HT**, cyclo demi-journée **650 €**, journée **880 €**. Post-production intégrée : retouche, détourage, colorimétrie, montage vidéo.
- Email : ${email}
- Téléphone : ${phone}
- Adresse : ${fullAddress}
- Ouvert **lundi–vendredi 10 h – 18 h**. **Week-end (samedi + dimanche) sur demande uniquement, avec majoration 25 % sur le tarif plateau.**
- Visite découverte gratuite ~1 h sur rendez-vous, **du lundi au vendredi** (pas de visite le week-end).
- Formulaire de contact en texte libre (nom, téléphone, email, société, message) — **il n'y a pas de sélecteur de sujet**.
- Pages clés : ${keyPages.join(' · ')}`
      : `Professional photo & video studio in Saint-Ouen-sur-Seine (Greater Paris). 5 stages + 30 m² cyclorama (Broncolor). Public rates from **€450/day**, cyclorama half-day **€650**, full day **€880** (excl. VAT). Integrated post-production: retouching, clipping, color grading, video editing.
- Email: ${email}
- Phone: ${phone}
- Address: ${fullAddress}
- Open **Monday–Friday 10am – 6pm**. **Weekends (Saturday + Sunday) on request only, with a 25% surcharge on the stage rate.**
- Free ~1h discovery tour by appointment, **Monday to Friday only** (no tours on weekends).
- Contact form is free-form (name, phone, email, company, message) — **there is no topic selector**.
- Key pages: ${keyPages.join(' · ')}`;

    out.push({
      id: `site:identity:${lang}`,
      kind: 'site',
      slug: 'identity',
      lang,
      title: lang === 'fr' ? 'E-DO Studio — repères essentiels' : 'E-DO Studio — essentials',
      url: SITE_URL,
      body: clip(body),
      tags: ['identity', 'contact', 'tarifs', 'address', 'hours'],
    });
  }
  return out;
}

function buildMachineChunks(machinesFr, machinesEn) {
  const out = [];
  for (const lang of ['fr', 'en']) {
    const rows = lang === 'fr' ? machinesFr : machinesEn;
    const counterpart = lang === 'fr' ? machinesEn : machinesFr;
    for (const m of rows ?? []) {
      if (!m?.slug) continue;
      const other = counterpart?.find((x) => x.slug === m.slug);
      const specsLines = (m.specs ?? []).map((s) => `- ${s.label} : ${s.value}`).filter(Boolean);
      const usesLines = (m.usages ?? []).map((u) => u.text).filter(Boolean);
      const ratesLines = (m.pricingRows ?? []).map((r) => {
        if (r.amount == null || r.amount === '') return r.label ? `- ${r.label} : sur devis` : null;
        const amt = typeof r.amount === 'number' ? r.amount : Number(r.amount);
        return `- ${r.label} : ${Number.isFinite(amt) ? `${amt} €` : r.amount}`;
      }).filter(Boolean);
      const segment = m.slug === 'cyclorama' ? CYCLO_SEGMENT[lang] : `plateau/${m.slug}`;
      const url = pageUrl(lang, segment);
      const lines = [
        m.subtitle ? `**${m.subtitle}**` : null,
        m.description,
        m.specs?.length ? (lang === 'fr' ? 'Caractéristiques :' : 'Specs:') : null,
        m.specs?.length ? specsLines.join('\n') : null,
        m.usages?.length ? (lang === 'fr' ? 'Usages :' : 'Uses:') : null,
        m.usages?.length ? usesLines.map((u) => `- ${u}`).join('\n') : null,
        m.pricingRows?.length ? (lang === 'fr' ? 'Tarifs :' : 'Rates:') : null,
        m.pricingRows?.length ? ratesLines.join('\n') : null,
        m.pricingDescription || other?.pricingDescription ? `_${m.pricingDescription || other?.pricingDescription}_` : null,
      ];
      const body = clip(lines.filter(Boolean).join('\n\n'));
      out.push({
        id: `machine:${m.slug}:${lang}`,
        kind: 'machine',
        slug: m.slug,
        lang,
        title: m.title,
        url,
        body,
        tags: uniq(['plateau', m.slug, ...(m.usages ?? []).map((u) => u.text || '').slice(0, 6)]),
      });
    }
  }
  return out;
}

function buildPostProdChunks(typesFr, typesEn) {
  const out = [];
  for (const lang of ['fr', 'en']) {
    const rows = lang === 'fr' ? typesFr : typesEn;
    for (const t of rows ?? []) {
      if (!t?.slug) continue;
      const includesLines = (t.includes ?? []).map((i) => i.text).filter(Boolean);
      const priceLines = (t.priceRows ?? []).map((r) => {
        if (r.amount == null || r.amount === '') return r.label ? `- ${r.label} : sur devis` : null;
        return `- ${r.label} : ${r.amount} €${r.note ? ` (${r.note})` : ''}`;
      }).filter(Boolean);
      const lines = [
        t.description,
        includesLines.length ? (lang === 'fr' ? 'Inclus :' : 'Includes:') : null,
        includesLines.length ? includesLines.map((i) => `- ${i}`).join('\n') : null,
        priceLines.length ? (lang === 'fr' ? 'Tarifs :' : 'Rates:') : null,
        priceLines.length ? priceLines.join('\n') : null,
      ];
      out.push({
        id: `postprod:${t.slug}:${lang}`,
        kind: 'postprod',
        slug: t.slug,
        lang,
        title: t.title,
        url: pageUrl(lang, POSTPROD_SEGMENT[lang]),
        body: clip(lines.filter(Boolean).join('\n\n')),
        tags: uniq(['post-production', t.slug, ...includesLines.slice(0, 4)]),
      });
    }
  }
  return out;
}

function buildBlogChunks(postsFr, postsEn) {
  const out = [];
  for (const lang of ['fr', 'en']) {
    const rows = lang === 'fr' ? postsFr : postsEn;
    const counterpart = lang === 'fr' ? postsEn : postsFr;
    for (const p of rows ?? []) {
      if (!p?.slug || !p?.title) continue;
      const other = counterpart?.find((x) => x.slug === p.slug);
      const excerpt = p.excerpt || other?.excerpt || '';
      const body = p.body || other?.body || '';
      const bodyText = typeof body === 'string' ? body : blocksToText(body);
      const cat = p.categories?.[0]?.title || other?.categories?.[0]?.title || '';
      const date = p.articleDate || p.publishedAt || p.createdAt || '';
      const lines = [
        cat ? `_${cat}${date ? ' · ' + date.slice(0, 10) : ''}_` : null,
        excerpt,
        bodyText,
      ];
      out.push({
        id: `blog:${p.slug}:${lang}`,
        kind: 'blog',
        slug: p.slug,
        lang,
        title: p.title,
        url: pageUrl(lang, `discovery/${p.slug}`),
        body: clip(lines.filter(Boolean).join('\n\n')),
        tags: uniq(['blog', 'discovery', cat || 'tips', ...(p.categories ?? []).map((c) => c.slug)]),
      });
    }
  }
  return out;
}

function buildLegalChunks(sectionsFr, sectionsEn) {
  const out = [];
  for (const lang of ['fr', 'en']) {
    const rows = lang === 'fr' ? sectionsFr : sectionsEn;
    const counterpart = lang === 'fr' ? sectionsEn : sectionsFr;
    for (const s of rows ?? []) {
      if (!s?.slug || !s?.title) continue;
      const other = counterpart?.find((x) => x.slug === s.slug);
      const bodyText = blocksToText(s.body) || blocksToText(other?.body);
      if (!bodyText) continue;
      out.push({
        id: `legal:${s.documentKey}:${s.slug}:${lang}`,
        kind: 'legal',
        slug: `${s.documentKey}/${s.slug}`,
        lang,
        title: s.title,
        url: pageUrl(lang, `${LEGAL_SEGMENT[lang]}/${s.documentKey}`),
        body: clip(bodyText),
        tags: uniq(['legal', s.documentKey, s.slug]),
      });
    }
  }
  return out;
}

function buildTeamChunks(membersFr, membersEn) {
  const out = [];
  for (const lang of ['fr', 'en']) {
    const rows = lang === 'fr' ? membersFr : membersEn;
    const counterpart = lang === 'fr' ? membersEn : membersFr;
    const items = (rows ?? []).map((m) => {
      const other = counterpart?.find((x) => x.id === m.id);
      const name = m.name;
      const role = m.role || other?.role || '';
      return `- **${name}** — ${role}${m.email ? ` (${m.email})` : ''}`;
    }).filter(Boolean);
    if (items.length === 0) continue;
    out.push({
      id: `team:members:${lang}`,
      kind: 'team',
      slug: 'members',
      lang,
      title: lang === 'fr' ? 'Équipe E-DO Studio' : 'E-DO Studio team',
      url: pageUrl(lang, CONTACT_SEGMENT[lang]),
      body: clip(items.join('\n')),
      tags: ['team', 'équipe', 'staff'],
    });
  }
  return out;
}

async function buildStaticFaqChunks() {
  const out = [];
  const dir = path.join(__dirname, 'chat-knowledge-static');
  let files;
  try {
    files = await fs.readdir(dir);
  } catch {
    return out;
  }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(dir, f), 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error(`Skipping ${f}: invalid JSON (${e.message})`);
      continue;
    }
    if (!Array.isArray(parsed)) {
      console.error(`Skipping ${f}: expected an array`);
      continue;
    }
    for (const entry of parsed) {
      if (!entry?.id || !entry?.lang || !entry?.title || !entry?.body) continue;
      out.push({
        id: entry.id,
        kind: entry.kind || 'faq',
        slug: entry.slug || null,
        lang: entry.lang,
        title: entry.title,
        url: entry.url || null,
        body: clip(entry.body),
        tags: Array.isArray(entry.tags) ? entry.tags : [],
      });
    }
  }
  return out;
}

// ─── Build full corpus ────────────────────────────────────────────────────

async function buildCorpus() {
  console.log('Fetching Strapi…');
  const [
    machinesBI,
    postProdBI,
    blogBI,
    legalBI,
    teamBI,
    siteBI,
  ] = await Promise.all([
    strapiBilingual('machines', { populate: 'specs,usages,pricingRows' }).catch((e) => {
      console.warn('machines:', e.message); return { fr: { data: [] }, en: { data: [] } };
    }),
    strapiBilingual('post-production-types', { populate: 'includes,priceRows' }).catch((e) => {
      console.warn('post-production-types:', e.message); return { fr: { data: [] }, en: { data: [] } };
    }),
    strapiBilingual('blog-posts', { populate: 'categories', 'pagination[pageSize]': '50' }).catch((e) => {
      console.warn('blog-posts:', e.message); return { fr: { data: [] }, en: { data: [] } };
    }),
    strapiBilingual('legal-sections', { 'pagination[pageSize]': '200' }).catch((e) => {
      console.warn('legal-sections:', e.message); return { fr: { data: [] }, en: { data: [] } };
    }),
    strapiBilingual('team-members', { 'pagination[pageSize]': '50' }).catch((e) => {
      console.warn('team-members:', e.message); return { fr: { data: [] }, en: { data: [] } };
    }),
    strapiBilingual('site-setting', { populate: 'address,openingHours' }).catch((e) => {
      console.warn('site-setting:', e.message); return { fr: { data: null }, en: { data: null } };
    }),
  ]);

  const corpus = [
    ...buildIdentityChunks(siteBI.fr?.data, siteBI.en?.data),
    ...buildMachineChunks(machinesBI.fr?.data ?? [], machinesBI.en?.data ?? []),
    ...buildPostProdChunks(postProdBI.fr?.data ?? [], postProdBI.en?.data ?? []),
    ...buildBlogChunks(blogBI.fr?.data ?? [], blogBI.en?.data ?? []),
    ...buildLegalChunks(legalBI.fr?.data ?? [], legalBI.en?.data ?? []),
    ...buildTeamChunks(teamBI.fr?.data ?? [], teamBI.en?.data ?? []),
    ...(await buildStaticFaqChunks()),
  ];

  // Filter empties and dedup by id.
  const seen = new Set();
  const result = [];
  for (const c of corpus) {
    if (!c.id || !c.body || !c.title) continue;
    if (seen.has(c.id)) {
      console.warn(`Duplicate id dropped: ${c.id}`);
      continue;
    }
    seen.add(c.id);
    result.push(c);
  }
  return result;
}

// ─── Hashing ──────────────────────────────────────────────────────────────

function contentHash(chunk) {
  const tags = (chunk.tags ?? []).map(String).sort().join('|');
  const payload = `${chunk.title}\n${chunk.url ?? ''}\n${chunk.body}\n${tags}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ─── Embeddings ───────────────────────────────────────────────────────────

function parseRetryAfterSeconds(errBody) {
  // Gemini returns "Please retry in 21.94s" in the error message.
  const m = errBody.match(/retry in ([0-9.]+)s/i);
  if (m) {
    const s = parseFloat(m[1]);
    if (Number.isFinite(s) && s > 0) return Math.ceil(s);
  }
  return null;
}

async function embedBatch(items) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = {
    requests: items.map((c) => ({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text: `${c.title}\n${(c.tags ?? []).join(', ')}\n${c.body}` }] },
      taskType: 'RETRIEVAL_DOCUMENT',
      title: c.title,
      outputDimensionality: EMBED_DIMS,
    })),
  };
  let attempt = 0;
  while (true) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const embeddings = (data.embeddings || []).map((e) => e.values);
      if (embeddings.length !== items.length) {
        throw new Error(`Gemini returned ${embeddings.length} embeddings for ${items.length} requests`);
      }
      return embeddings;
    }
    const errBody = await res.text().catch(() => '');
    if ([429, 500, 502, 503, 504].includes(res.status) && attempt < 5) {
      // Honour Gemini's retry-after hint when present; otherwise exponential
      // backoff. On 429 with no hint, default to 60s — the free tier window.
      const hinted = parseRetryAfterSeconds(errBody);
      const delaySec = hinted ?? (res.status === 429 ? 60 : Math.min(30, 2 ** attempt));
      console.warn(`Gemini ${res.status} — retrying in ${delaySec}s (attempt ${attempt + 1}/5)`);
      await new Promise((r) => setTimeout(r, delaySec * 1000));
      attempt += 1;
      continue;
    }
    throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 200)}`);
  }
}

async function embedChunks(chunks) {
  if (chunks.length === 0) return;
  const batches = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push(chunks.slice(i, i + BATCH_SIZE));
  }
  console.log(`Embedding ${chunks.length} chunks in ${batches.length} batch(es)…`);

  // Run with bounded concurrency.
  let inFlight = 0;
  let next = 0;
  await new Promise((resolve, reject) => {
    const launch = () => {
      while (inFlight < CONCURRENCY && next < batches.length) {
        const idx = next++;
        inFlight += 1;
        embedBatch(batches[idx])
          .then((embeddings) => {
            embeddings.forEach((vec, k) => { batches[idx][k]._embedding = vec; });
            inFlight -= 1;
            if (next >= batches.length && inFlight === 0) resolve();
            else launch();
          })
          .catch((err) => reject(err));
      }
    };
    launch();
  });
}

// ─── Supabase IO ──────────────────────────────────────────────────────────

function supabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadExisting(client) {
  const { data, error } = await client
    .from('chat_knowledge_chunks')
    .select('id, content_hash, embedding');
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) {
    map.set(row.id, {
      hash: row.content_hash ?? null,
      hasEmbedding: row.embedding !== null && row.embedding !== undefined,
    });
  }
  return map;
}

async function upsertChunks(client, chunks) {
  if (chunks.length === 0) return;
  const rows = chunks.map((c) => ({
    id: c.id,
    kind: c.kind,
    slug: c.slug,
    lang: c.lang,
    title: c.title,
    url: c.url,
    body: c.body,
    tags: c.tags ?? [],
    content_hash: c._hash,
    embedding: c._embedding ?? null,
    updated_at: new Date().toISOString(),
  }));
  for (let i = 0; i < rows.length; i += 100) {
    const slice = rows.slice(i, i + 100);
    const { error } = await client
      .from('chat_knowledge_chunks')
      .upsert(slice, { onConflict: 'id' });
    if (error) throw error;
  }
}

async function pruneStale(client, keepIds) {
  const { data, error } = await client
    .from('chat_knowledge_chunks')
    .select('id');
  if (error) throw error;
  const keep = new Set(keepIds);
  const stale = (data ?? []).map((r) => r.id).filter((id) => !keep.has(id));
  if (stale.length === 0) return 0;
  // Supabase doesn't accept very long `.in()` lists — chunk to be safe.
  for (let i = 0; i < stale.length; i += 100) {
    const slice = stale.slice(i, i + 100);
    const { error: delErr } = await client
      .from('chat_knowledge_chunks')
      .delete()
      .in('id', slice);
    if (delErr) throw delErr;
  }
  return stale.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  const corpus = await buildCorpus();
  console.log(`Built ${corpus.length} chunks.`);

  // Hash + classify (new / changed / reuse).
  const client = supabase();
  const existing = DRY_RUN ? new Map() : await loadExisting(client);
  let toEmbedCount = 0;
  for (const c of corpus) {
    c._hash = contentHash(c);
    const prev = existing.get(c.id);
    c._needsEmbed = !prev || !prev.hasEmbedding || prev.hash !== c._hash;
    if (c._needsEmbed) toEmbedCount += 1;
  }
  console.log(`Embed: ${toEmbedCount} new/changed · Skip: ${corpus.length - toEmbedCount}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN INVENTORY ---');
    for (const c of corpus) {
      console.log(`${c.id} [${c.lang}] ${c.kind} · ${Buffer.byteLength(c.body)}b · embed=${c._needsEmbed ? 'yes' : 'no'} · ${c.title.slice(0, 60)}`);
    }
    console.log('--- end ---');
    return;
  }

  await embedChunks(corpus.filter((c) => c._needsEmbed));
  await upsertChunks(client, corpus);
  const pruned = await pruneStale(client, corpus.map((c) => c.id));
  console.log(`Upserted ${corpus.length}, pruned ${pruned} stale row(s). (${Date.now() - t0}ms)`);
}

main().catch((err) => {
  console.error('Reindex failed:', err);
  process.exit(1);
});
