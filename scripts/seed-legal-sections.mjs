#!/usr/bin/env node
// Seed Strapi legal-sections from `Terms & Conditions/formatted/*.md`.
//
//   node --env-file=.env scripts/seed-legal-sections.mjs --dry-run
//   STRAPI_WRITE_TOKEN=... node scripts/seed-legal-sections.mjs --wipe --seed
//
// Token resolution order: STRAPI_WRITE_TOKEN env var, then --token <value>.
// VITE_STRAPI_TOKEN from .env is read-only and will not work for writes.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FORMATTED_DIR = join(ROOT, 'Terms & Conditions', 'formatted');

const STRAPI_URL = process.env.STRAPI_URL || 'https://cms.e-do.studio';
const LAST_UPDATED_AT = '2024-12-05';

const DOCS = [
  { key: 'mentions', fr: 'mentions.md', en: 'mentions.en.md' },
  { key: 'cgv', fr: 'cgv.md', en: 'cgv.en.md' },
  { key: 'cgu', fr: 'cgu.md', en: 'cgu.en.md' },
  { key: 'privacy', fr: 'privacy.md', en: 'privacy.en.md' },
  { key: 'cookies', fr: 'cookies.md', en: 'cookies.en.md' },
];

function args() {
  const a = process.argv.slice(2);
  const out = { dryRun: false, wipe: false, seed: false, token: null, only: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--dry-run') out.dryRun = true;
    else if (a[i] === '--wipe') out.wipe = true;
    else if (a[i] === '--seed') out.seed = true;
    else if (a[i] === '--token') out.token = a[++i];
    else if (a[i].startsWith('--only=')) out.only = a[i].slice('--only='.length);
    else if (a[i] === '--only') out.only = a[++i];
  }
  return out;
}

function parseInline(text) {
  const out = [];
  let buf = '';
  let i = 0;
  const flush = (extra) => {
    if (buf) {
      out.push(extra ? { type: 'text', text: buf, ...extra } : { type: 'text', text: buf });
      buf = '';
    }
  };
  while (i < text.length) {
    if (text[i] === '[') {
      const m = text.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (m) {
        flush();
        out.push({ type: 'link', url: m[2], children: parseInline(m[1]) });
        i += m[0].length;
        continue;
      }
    }
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > -1) {
        flush();
        for (const n of parseInline(text.slice(i + 2, end))) {
          if (n.type === 'text') out.push({ ...n, bold: true });
          else out.push(n);
        }
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end > -1 && text[end + 1] !== '*') {
        flush();
        for (const n of parseInline(text.slice(i + 1, end))) {
          if (n.type === 'text') out.push({ ...n, italic: true });
          else out.push(n);
        }
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return out.length ? out : [{ type: 'text', text: '' }];
}

function mdToBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, children: parseInline(heading[2].trim()) });
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', children: parseInline(buf.join(' ').trim()) });
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push({ type: 'list-item', children: parseInline(lines[i].replace(/^\s*-\s+/, '')) });
        i++;
      }
      blocks.push({ type: 'list', format: 'unordered', children: items });
      continue;
    }
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|\s*-\s)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', children: parseInline(buf.join(' ')) });
  }
  return blocks;
}

function parseSections(content) {
  const out = [];
  const parts = content.split(/\n## Section \d+ — [^\n]+\n/);
  parts.shift();
  for (const part of parts) {
    const title = part.match(/^- \*\*title \([A-Z]+\)\*\* : `([^`]+)`/m);
    const slug = part.match(/^- \*\*slug\*\* : `([^`]+)`/m);
    const body = part.match(/### Body \([A-Z]+\)\s*\n+([\s\S]*?)(?:\n---\s*\n|$)/);
    if (!title || !slug || !body) {
      console.warn('  ⚠ section incomplete, skipping:', part.slice(0, 80));
      continue;
    }
    out.push({ title: title[1], slug: slug[1], body: body[1].trim() });
  }
  return out;
}

function loadAll() {
  const docs = [];
  for (const d of DOCS) {
    const fr = parseSections(readFileSync(join(FORMATTED_DIR, d.fr), 'utf8'));
    const en = parseSections(readFileSync(join(FORMATTED_DIR, d.en), 'utf8'));
    const enBySlug = new Map(en.map((s) => [s.slug, s]));
    const sections = fr.map((s) => {
      const matchEn = enBySlug.get(s.slug);
      if (!matchEn) console.warn(`  ⚠ no EN match for ${d.key}/${s.slug}`);
      return {
        documentKey: d.key,
        slug: s.slug,
        fr: { title: s.title, body: mdToBlocks(s.body) },
        en: matchEn
          ? { title: matchEn.title, body: mdToBlocks(matchEn.body) }
          : { title: s.title, body: mdToBlocks(s.body) },
      };
    });
    docs.push({ key: d.key, sections });
  }
  return docs;
}

async function strapi(token, method, path, body) {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${txt.slice(0, 400)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function listAll(token, locale) {
  const out = [];
  let page = 1;
  for (;;) {
    const data = await strapi(
      token,
      'GET',
      `/api/legal-sections?locale=${locale}&pagination%5BpageSize%5D=100&pagination%5Bpage%5D=${page}&fields%5B0%5D=documentKey&fields%5B1%5D=slug`,
    );
    const items = data?.data ?? [];
    out.push(...items);
    const total = data?.meta?.pagination?.pageCount ?? 1;
    if (page >= total) break;
    page++;
  }
  return out;
}

async function wipe(token) {
  // Strapi v5 + i18n: DELETE must be issued per-locale or the other locale survives.
  for (const locale of ['fr', 'en']) {
    const items = await listAll(token, locale);
    console.log(`  ${locale.toUpperCase()}: ${items.length} entries`);
    let i = 0;
    for (const item of items) {
      i++;
      process.stdout.write(`\r  ${locale} ${i}/${items.length}...`);
      await strapi(token, 'DELETE', `/api/legal-sections/${item.documentId}?locale=${locale}`);
    }
    console.log(`\r  ✓ ${locale} wipe complete            `);
  }
}

async function seedSection(token, s) {
  const created = await strapi(token, 'POST', '/api/legal-sections', {
    data: {
      documentKey: s.documentKey,
      slug: s.slug,
      title: s.fr.title,
      body: s.fr.body,
      lastUpdatedAt: LAST_UPDATED_AT,
      locale: 'fr',
    },
  });
  const documentId = created.data.documentId;
  await strapi(token, 'PUT', `/api/legal-sections/${documentId}?locale=en`, {
    data: {
      documentKey: s.documentKey,
      slug: s.slug,
      title: s.en.title,
      body: s.en.body,
      lastUpdatedAt: LAST_UPDATED_AT,
    },
  });
  return documentId;
}

async function seed(token, docs) {
  let total = 0;
  for (const doc of docs) total += doc.sections.length;
  let i = 0;
  for (const doc of docs) {
    console.log(`  ${doc.key} — ${doc.sections.length} section(s)`);
    for (const s of doc.sections) {
      i++;
      process.stdout.write(`\r  ${i}/${total} ${s.slug}`.padEnd(70));
      await seedSection(token, s);
    }
  }
  console.log('\r  ✓ seed complete                                                   ');
}

async function main() {
  const opts = args();
  const token = opts.token || process.env.STRAPI_WRITE_TOKEN;
  if (!opts.dryRun && !token) {
    console.error('error: pass --token <value> or set STRAPI_WRITE_TOKEN');
    process.exit(1);
  }

  console.log('loading markdown files...');
  let docs = loadAll();
  if (opts.only) {
    const filtered = docs.filter((d) => d.key === opts.only);
    if (!filtered.length) {
      console.error(`error: unknown doc key '${opts.only}'. available: ${docs.map((d) => d.key).join(', ')}`);
      process.exit(1);
    }
    docs = filtered;
    console.log(`→ filtering to --only=${opts.only}`);
  }
  let count = 0;
  for (const d of docs) count += d.sections.length;
  console.log(`✓ loaded ${count} sections across ${docs.length} documents:`);
  for (const d of docs) console.log(`  - ${d.key}: ${d.sections.length}`);

  if (opts.dryRun) {
    const sample = docs[1].sections[0];
    console.log('\nsample (FR, first CGV section):');
    console.log(JSON.stringify(sample.fr, null, 2).slice(0, 1200));
    console.log('\ndry-run only, nothing pushed.');
    return;
  }

  if (opts.wipe) {
    console.log('\n→ wiping existing legal-sections...');
    await wipe(token);
  }
  if (opts.seed) {
    console.log('\n→ seeding sections (FR + EN)...');
    await seed(token, docs);
  }
  console.log('\ndone.');
}

main().catch((e) => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
