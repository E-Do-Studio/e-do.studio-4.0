#!/usr/bin/env node
/**
 * Builds the chatbot knowledge base from Strapi and upserts it into the
 * Supabase `chat_knowledge_chunks` table.
 *
 * Run after CMS content changes (or on a scheduled basis):
 *   npm run chat:reindex
 *
 * Required env (loaded from .env.local / .env or the shell):
 *   STRAPI_URL                  e.g. https://cms.e-do.studio
 *   STRAPI_TOKEN                read-only Strapi API token
 *   SUPABASE_URL                Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   service-role key (server-side only)
 *
 * Optional:
 *   SITE_URL                    Public site URL (default: https://e-do.studio)
 *   CHAT_KNOWLEDGE_DRY_RUN=1    Print chunks without writing
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Env ───────────────────────────────────────────────────────────────────

function loadDotEnv(file) {
  try {
    const raw = readFileSync(resolve(process.cwd(), file), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (process.env[m[1]] !== undefined) continue;
      let value = m[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[m[1]] = value;
    }
  } catch {
    // No file — fine.
  }
}

loadDotEnv('.env.local');
loadDotEnv('.env');

const STRAPI_URL = process.env.STRAPI_URL || process.env.VITE_STRAPI_URL || 'https://cms.e-do.studio';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || process.env.VITE_STRAPI_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SITE_URL = (process.env.SITE_URL || 'https://e-do.studio').replace(/\/$/, '');
const DRY_RUN = process.env.CHAT_KNOWLEDGE_DRY_RUN === '1';

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

requireEnv('STRAPI_URL', STRAPI_URL);
requireEnv('STRAPI_TOKEN', STRAPI_TOKEN);
if (!DRY_RUN) {
  requireEnv('SUPABASE_URL', SUPABASE_URL);
  requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
}

// ─── Strapi fetch helpers ──────────────────────────────────────────────────

async function strapi(path, params = {}) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  for (const [k, v] of Object.entries(params)) {
    if (k === 'populate' && typeof v === 'string' && v.includes(',')) {
      v.split(',').forEach((field, i) => url.searchParams.append(`populate[${i}]`, field.trim()));
    } else if (Array.isArray(v)) {
      v.forEach((entry, i) => url.searchParams.append(`${k}[${i}]`, String(entry)));
    } else {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${STRAPI_TOKEN}` } });
  if (!res.ok) {
    throw new Error(`Strapi ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchBilingual(path, params = {}) {
  const [fr, en] = await Promise.all([
    strapi(path, { ...params, locale: 'fr' }),
    strapi(path, { ...params, locale: 'en' }),
  ]);
  return { fr, en };
}

// ─── Rendering helpers (Strapi blocks → plain text) ───────────────────────

function blocksToText(nodes) {
  if (!Array.isArray(nodes)) return '';
  const out = [];
  for (const node of nodes) {
    if (!node) continue;
    if (node.type === 'paragraph') {
      out.push(inlineToText(node.children).trim());
    } else if (node.type === 'heading') {
      out.push(`${'#'.repeat(Math.min(6, node.level || 2))} ${inlineToText(node.children).trim()}`);
    } else if (node.type === 'list') {
      const prefix = node.format === 'ordered' ? null : '-';
      const items = (node.children ?? []).map((item, i) => {
        const text = inlineToText(item.children).trim();
        return prefix ? `- ${text}` : `${i + 1}. ${text}`;
      });
      out.push(items.join('\n'));
    } else if (node.type === 'quote') {
      out.push(`> ${inlineToText(node.children).trim()}`);
    } else if (node.type === 'code') {
      out.push(inlineToText(node.children).trim());
    }
  }
  return out.filter(Boolean).join('\n\n');
}

function inlineToText(nodes) {
  if (!Array.isArray(nodes)) return '';
  return nodes
    .map((n) => {
      if (!n) return '';
      if (n.type === 'link') return inlineToText(n.children);
      return typeof n.text === 'string' ? n.text : '';
    })
    .join('');
}

function joinLines(lines) {
  return lines.filter((l) => l != null && String(l).trim().length > 0).join('\n');
}

function bullet(items) {
  return items
    .filter((s) => s != null && String(s).trim().length > 0)
    .map((s) => `- ${s}`)
    .join('\n');
}

function pageUrl(lang, path) {
  return `${SITE_URL}/${lang}${path}`;
}

// ─── Builders ──────────────────────────────────────────────────────────────

const PLATEAU_PATHS = {
  cyclorama: '/cyclorama',
  horizontal: '/plateau/horizontal',
  vertical: '/plateau/vertical',
  eclipse: '/plateau/eclipse',
  live: '/plateau/live',
};

const PLATEAU_LABELS = {
  cyclorama: { fr: 'Cyclorama', en: 'Cyclorama' },
  horizontal: { fr: 'Plateau Horizontal', en: 'Horizontal Stage' },
  vertical: { fr: 'Plateau Vertical', en: 'Vertical Stage' },
  eclipse: { fr: 'Plateau Éclipse', en: 'Eclipse Stage' },
  live: { fr: 'Plateau Live', en: 'Live Stage' },
};

function formatPricingRow(row) {
  if (!row) return null;
  const amount = row.amount;
  const kind = row.kind ?? 'unit';
  let priceText;
  if (kind === 'quote' || amount == null || amount === '') {
    priceText = 'sur demande / on request';
  } else {
    const n = typeof amount === 'number' ? amount : Number(amount);
    priceText = Number.isFinite(n) ? `${Number.isInteger(n) ? n : n.toFixed(2)} €` : String(amount);
  }
  const note = row.note ? ` (${row.note})` : '';
  return `${row.label}: ${priceText}${note}`;
}

function buildPlateauChunks(plateauKey, mFr, mEn) {
  const url = PLATEAU_PATHS[plateauKey] ? pageUrl('fr', PLATEAU_PATHS[plateauKey]) : null;
  const urlEn = PLATEAU_PATHS[plateauKey] ? pageUrl('en', PLATEAU_PATHS[plateauKey]) : null;
  const label = PLATEAU_LABELS[plateauKey] ?? { fr: mFr.title, en: mEn.title };
  const tags = [plateauKey, 'plateau', 'studio', mFr.slug ?? plateauKey];

  const buildBody = (m, lang) => {
    const lines = [
      m.subtitle ? `Tagline : ${m.subtitle}` : null,
      m.description || null,
      m.specs?.length
        ? `\nSpécifications :\n${bullet(m.specs.map((s) => `${s.label}: ${s.value}`))}`
        : null,
      m.pricingRows?.length
        ? `\nTarifs :\n${bullet(m.pricingRows.map(formatPricingRow).filter(Boolean))}`
        : m.pricing
          ? `\nTarifs : ${m.pricing}`
          : null,
      m.usages?.length
        ? `\nUsages : ${m.usages.map((u) => u.text).filter(Boolean).join(' · ')}`
        : null,
      lang === 'fr' && url ? `\nPage du site : ${url}` : null,
      lang === 'en' && urlEn ? `\nWebsite page: ${urlEn}` : null,
    ];
    return joinLines(lines);
  };

  return [
    {
      id: `plateau-${plateauKey}-fr`,
      kind: 'plateau',
      slug: plateauKey,
      lang: 'fr',
      title: label.fr,
      url,
      body: buildBody(mFr, 'fr'),
      tags,
    },
    {
      id: `plateau-${plateauKey}-en`,
      kind: 'plateau',
      slug: plateauKey,
      lang: 'en',
      title: label.en,
      url: urlEn,
      body: buildBody(mEn ?? mFr, 'en'),
      tags,
    },
  ];
}

async function buildPlateauxChunks() {
  const chunks = [];
  try {
    const cyclo = await fetchBilingual('cyclorama', {
      populate: 'specs,pricingRows,usages',
    });
    const cFr = cyclo.fr?.data;
    const cEn = cyclo.en?.data ?? cFr;
    if (cFr) chunks.push(...buildPlateauChunks('cyclorama', cFr, cEn));
  } catch (err) {
    console.warn('[chat-knowledge] cyclorama fetch failed:', err.message);
  }

  try {
    const machines = await fetchBilingual('machines', {
      populate: 'specs,pricingRows',
      sort: 'createdAt:asc',
    });
    const frList = machines.fr?.data ?? [];
    const enList = machines.en?.data ?? [];
    for (const mFr of frList) {
      const mEn = enList.find((e) => e.slug === mFr.slug) ?? mFr;
      const slug = mFr.slug;
      if (!PLATEAU_PATHS[slug]) {
        // Unknown plateau slug — still index, just without a canonical URL.
        chunks.push({
          id: `plateau-${slug}-fr`,
          kind: 'plateau',
          slug,
          lang: 'fr',
          title: mFr.title,
          url: null,
          body: joinLines([
            mFr.subtitle ? `Tagline : ${mFr.subtitle}` : null,
            mFr.description || null,
            mFr.specs?.length ? `Spécifications : ${mFr.specs.map((s) => `${s.label}: ${s.value}`).join(' · ')}` : null,
            mFr.pricing ? `Tarifs : ${mFr.pricing}` : null,
          ]),
          tags: ['plateau', slug],
        });
      } else {
        chunks.push(...buildPlateauChunks(slug, mFr, mEn));
      }
    }
  } catch (err) {
    console.warn('[chat-knowledge] machines fetch failed:', err.message);
  }

  return chunks;
}

async function buildPostProdChunks() {
  try {
    const res = await fetchBilingual('post-production-types', {
      populate: 'includes,priceRows',
      sort: 'createdAt:asc',
    });
    const frList = res.fr?.data ?? [];
    const enList = res.en?.data ?? [];
    const chunks = [];
    for (const tFr of frList) {
      const tEn = enList.find((e) => e.slug === tFr.slug) ?? tFr;
      const tags = ['post-production', 'postprod', 'retouche', 'editing', tFr.slug];
      const urlFr = pageUrl('fr', '/post-production');
      const urlEn = pageUrl('en', '/post-production');
      const bodyFr = joinLines([
        tFr.description || null,
        tFr.priceRows?.length
          ? `\nTarifs :\n${bullet(tFr.priceRows.map(formatPricingRow).filter(Boolean))}`
          : tFr.price
            ? `\nTarif : ${tFr.price}`
            : null,
        tFr.includes?.length
          ? `\nInclus :\n${bullet(tFr.includes.map((i) => i.text))}`
          : null,
        `\nPage du site : ${urlFr}`,
      ]);
      const bodyEn = joinLines([
        tEn.description || null,
        tEn.priceRows?.length
          ? `\nPricing:\n${bullet(tEn.priceRows.map(formatPricingRow).filter(Boolean))}`
          : tEn.price
            ? `\nPricing: ${tEn.price}`
            : null,
        tEn.includes?.length
          ? `\nIncluded:\n${bullet(tEn.includes.map((i) => i.text))}`
          : null,
        `\nWebsite page: ${urlEn}`,
      ]);
      chunks.push(
        { id: `postprod-${tFr.slug}-fr`, kind: 'post-prod', slug: tFr.slug, lang: 'fr', title: tFr.title, url: urlFr, body: bodyFr, tags },
        { id: `postprod-${tFr.slug}-en`, kind: 'post-prod', slug: tFr.slug, lang: 'en', title: tEn.title, url: urlEn, body: bodyEn, tags },
      );
    }
    return chunks;
  } catch (err) {
    console.warn('[chat-knowledge] post-production-types fetch failed:', err.message);
    return [];
  }
}

async function buildBlogChunks() {
  try {
    const res = await fetchBilingual('blog-posts', {
      populate: 'categories,bodyBlocks',
      sort: 'publishedAt:desc',
      'pagination[pageSize]': 50,
    });
    const frList = res.fr?.data ?? [];
    const enList = res.en?.data ?? [];
    const chunks = [];
    for (const pFr of frList) {
      const pEn = enList.find((e) => e.slug === pFr.slug) ?? pFr;
      const catFr = pFr.categories?.[0];
      const catEn = pEn.categories?.[0];
      const tags = ['blog', 'discovery', 'article', catFr?.slug, pFr.slug].filter(Boolean);
      const urlFr = pageUrl('fr', `/discovery#${pFr.slug}`);
      const urlEn = pageUrl('en', `/discovery#${pEn.slug ?? pFr.slug}`);
      const bodyFromBlocksFr = blocksToText(pFr.bodyBlocks);
      const bodyFromBlocksEn = blocksToText(pEn.bodyBlocks);
      const bodyFr = joinLines([
        pFr.excerpt || null,
        bodyFromBlocksFr || pFr.body || null,
        catFr?.title ? `Catégorie : ${catFr.title}` : null,
        `Page du site : ${urlFr}`,
      ]);
      const bodyEn = joinLines([
        pEn.excerpt || null,
        bodyFromBlocksEn || pEn.body || null,
        catEn?.title ? `Category: ${catEn.title}` : null,
        `Website page: ${urlEn}`,
      ]);
      chunks.push(
        { id: `blog-${pFr.slug}-fr`, kind: 'blog', slug: pFr.slug, lang: 'fr', title: pFr.title, url: urlFr, body: bodyFr, tags },
        { id: `blog-${pFr.slug}-en`, kind: 'blog', slug: pFr.slug, lang: 'en', title: pEn.title, url: urlEn, body: bodyEn, tags },
      );
    }
    return chunks;
  } catch (err) {
    console.warn('[chat-knowledge] blog-posts fetch failed:', err.message);
    return [];
  }
}

async function buildLegalChunks() {
  try {
    const res = await fetchBilingual('legal-sections', {
      sort: 'slug:asc',
      'pagination[pageSize]': 200,
    });
    const frList = res.fr?.data ?? [];
    const enList = res.en?.data ?? [];
    const chunks = [];
    for (const s of frList) {
      const sEn = enList.find((e) => e.id === s.id) ?? s;
      const urlFr = pageUrl('fr', '/legal');
      const urlEn = pageUrl('en', '/legal');
      const tags = ['legal', 'cgv', 'cgu', 'mentions', 'privacy', s.documentKey, s.slug].filter(Boolean);
      chunks.push(
        {
          id: `legal-${s.slug}-fr`,
          kind: 'legal',
          slug: s.slug,
          lang: 'fr',
          title: s.title,
          url: urlFr,
          body: joinLines([blocksToText(s.body), `Page du site : ${urlFr}`]),
          tags,
        },
        {
          id: `legal-${s.slug}-en`,
          kind: 'legal',
          slug: s.slug,
          lang: 'en',
          title: sEn.title,
          url: urlEn,
          body: joinLines([blocksToText(sEn.body), `Website page: ${urlEn}`]),
          tags,
        },
      );
    }
    return chunks;
  } catch (err) {
    console.warn('[chat-knowledge] legal-sections fetch failed:', err.message);
    return [];
  }
}

async function buildTeamChunks() {
  try {
    const res = await fetchBilingual('team-members', {
      sort: 'createdAt:asc',
      'pagination[pageSize]': 50,
    });
    const frList = res.fr?.data ?? [];
    const enList = res.en?.data ?? [];
    if (frList.length === 0) return [];
    const linesFr = frList.map((m) => {
      const en = enList.find((e) => e.id === m.id) ?? m;
      return `- ${m.name} — ${m.role}${m.email ? ` (${m.email})` : ''}${en && en.name !== m.name ? ` / ${en.name}` : ''}`;
    });
    const linesEn = enList.length > 0
      ? enList.map((m) => `- ${m.name} — ${m.role}${m.email ? ` (${m.email})` : ''}`)
      : linesFr;
    const tags = ['équipe', 'team', 'staff', 'qui', 'who'];
    return [
      {
        id: 'team-fr',
        kind: 'team',
        slug: null,
        lang: 'fr',
        title: 'Équipe E-DO Studio',
        url: pageUrl('fr', '/contact'),
        body: joinLines([`Équipe :`, linesFr.join('\n')]),
        tags,
      },
      {
        id: 'team-en',
        kind: 'team',
        slug: null,
        lang: 'en',
        title: 'E-DO Studio team',
        url: pageUrl('en', '/contact'),
        body: joinLines([`Team:`, linesEn.join('\n')]),
        tags,
      },
    ];
  } catch (err) {
    console.warn('[chat-knowledge] team-members fetch failed:', err.message);
    return [];
  }
}

function summarizeHours(rows, days, lang) {
  const open = rows.filter((r) => days.includes(r.dayOfWeek) && !r.closed);
  if (open.length === 0) return lang === 'fr' ? 'Fermé' : 'Closed';
  if (open.every((r) => r.byAppointment)) return lang === 'fr' ? 'Sur rendez-vous' : 'By appointment';
  const trimTime = (t) => (t ? String(t).match(/^(\d{2}):(\d{2})/)?.slice(1).join(':') ?? String(t) : '');
  const first = open[0];
  return `${trimTime(first.opensAt)} — ${trimTime(first.closesAt)}`;
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKEND = ['saturday', 'sunday'];

async function buildSiteChunks() {
  const chunks = [];
  try {
    const res = await fetchBilingual('site-setting', {
      populate: 'transport,entries,address,openingHours,closures,socialLinks',
    });
    const s = res.fr?.data;
    const sEn = res.en?.data ?? s;
    if (!s) return [];
    const addr = s.address;
    const street = addr?.street ?? s.street;
    const city = addr?.city ?? s.city;
    const postalCode = addr?.postalCode ?? s.postalCode;
    const country = addr?.country ?? s.country;
    const complement = addr?.complement ?? '';
    const fullAddress = [street, complement, `${postalCode ?? ''} ${city ?? ''}`.trim(), country && country !== 'FR' ? country : '']
      .filter(Boolean)
      .join(', ');

    const hoursRows = s.openingHours ?? [];
    const weekdayFr = hoursRows.length ? summarizeHours(hoursRows, WEEKDAYS, 'fr') : (s.hours ?? '');
    const weekendFr = hoursRows.length ? summarizeHours(hoursRows, WEEKEND, 'fr') : (s.weekendHours ?? '');
    const weekdayEn = hoursRows.length ? summarizeHours(hoursRows, WEEKDAYS, 'en') : (sEn?.hours ?? weekdayFr);
    const weekendEn = hoursRows.length ? summarizeHours(hoursRows, WEEKEND, 'en') : (sEn?.weekendHours ?? weekendFr);

    const transportFr = (s.transport ?? []).map((t) => t.label).filter(Boolean).join(' · ');
    const transportEn = (sEn?.transport ?? s.transport ?? []).map((t) => t.label).filter(Boolean).join(' · ');

    const socialLines = (s.socialLinks ?? []).map((l) => `- ${l.label || l.platform}: ${l.url}`).join('\n');

    const bodyFr = joinLines([
      `${s.siteTitle ?? 'E-DO Studio'} — ${s.siteDescription ?? ''}`,
      ``,
      `Adresse : ${fullAddress}`,
      transportFr ? `Accès : ${transportFr}` : null,
      ``,
      `Contact :`,
      s.email ? `- Email : ${s.email}` : null,
      s.phone ? `- Téléphone : ${s.phone}` : null,
      ``,
      `Horaires :`,
      weekdayFr ? `- Lundi–Vendredi : ${weekdayFr}` : null,
      weekendFr ? `- Samedi–Dimanche : ${weekendFr}` : null,
      ``,
      socialLines ? `Réseaux :\n${socialLines}` : null,
      ``,
      `Pages clés :`,
      `- Accueil : ${pageUrl('fr', '')}`,
      `- Plateaux : ${pageUrl('fr', '/cyclorama')} (et /plateau/horizontal, /plateau/vertical, /plateau/eclipse, /plateau/live)`,
      `- Post-production : ${pageUrl('fr', '/post-production')}`,
      `- Galerie : ${pageUrl('fr', '/galerie')}`,
      `- Discovery (journal) : ${pageUrl('fr', '/discovery')}`,
      `- Contact : ${pageUrl('fr', '/contact')}`,
      `- Réservation : ${pageUrl('fr', '/reserver')}`,
      `- Mentions légales : ${pageUrl('fr', '/legal')}`,
    ]);

    const bodyEn = joinLines([
      `${sEn?.siteTitle ?? 'E-DO Studio'} — ${sEn?.siteDescription ?? s.siteDescription ?? ''}`,
      ``,
      `Address: ${fullAddress}`,
      transportEn ? `Access: ${transportEn}` : null,
      ``,
      `Contact:`,
      s.email ? `- Email: ${s.email}` : null,
      s.phone ? `- Phone: ${s.phone}` : null,
      ``,
      `Hours:`,
      weekdayEn ? `- Monday–Friday: ${weekdayEn}` : null,
      weekendEn ? `- Saturday–Sunday: ${weekendEn}` : null,
      ``,
      socialLines ? `Social:\n${socialLines}` : null,
      ``,
      `Key pages:`,
      `- Home: ${pageUrl('en', '')}`,
      `- Stages: ${pageUrl('en', '/cyclorama')} (and /plateau/horizontal, /plateau/vertical, /plateau/eclipse, /plateau/live)`,
      `- Post-production: ${pageUrl('en', '/post-production')}`,
      `- Gallery: ${pageUrl('en', '/galerie')}`,
      `- Discovery (journal): ${pageUrl('en', '/discovery')}`,
      `- Contact: ${pageUrl('en', '/contact')}`,
      `- Book: ${pageUrl('en', '/book')}`,
      `- Legal: ${pageUrl('en', '/legal')}`,
    ]);

    const tags = ['site', 'studio', 'identité', 'identity', 'contact', 'adresse', 'address', 'horaires', 'hours', 'accès', 'access', 'e-do'];
    chunks.push(
      { id: 'site-identity-fr', kind: 'site', slug: 'identity', lang: 'fr', title: 'E-DO Studio — identité, contact, accès', url: pageUrl('fr', ''), body: bodyFr, tags },
      { id: 'site-identity-en', kind: 'site', slug: 'identity', lang: 'en', title: 'E-DO Studio — identity, contact, access', url: pageUrl('en', ''), body: bodyEn, tags },
    );
  } catch (err) {
    console.warn('[chat-knowledge] site-setting fetch failed:', err.message);
  }
  return chunks;
}

async function buildGalleryOverviewChunk() {
  try {
    const res = await strapi('gallery-projects', {
      populate: '*',
      'pagination[pageSize]': 100,
      locale: 'fr',
      sort: 'createdAt:desc',
    });
    const projects = res?.data ?? [];
    if (projects.length === 0) return [];
    const brands = [...new Set(projects.map((p) => p.brand?.name).filter(Boolean))];
    const stages = [...new Set(projects.map((p) => p.stage).filter(Boolean))];
    const cats = [...new Set(projects.map((p) => p.category?.slug).filter(Boolean))];
    const urlFr = pageUrl('fr', '/galerie');
    const urlEn = pageUrl('en', '/galerie');
    const bodyFr = joinLines([
      `La galerie présente ${projects.length} projets shootés chez E-DO Studio.`,
      brands.length ? `Marques visibles dans la galerie : ${brands.slice(0, 30).join(', ')}.` : null,
      stages.length ? `Plateaux couverts : ${stages.join(', ')}.` : null,
      cats.length ? `Catégories : ${cats.join(', ')}.` : null,
      `Page : ${urlFr}`,
    ]);
    const bodyEn = joinLines([
      `The gallery showcases ${projects.length} projects shot at E-DO Studio.`,
      brands.length ? `Featured brands: ${brands.slice(0, 30).join(', ')}.` : null,
      stages.length ? `Stages covered: ${stages.join(', ')}.` : null,
      cats.length ? `Categories: ${cats.join(', ')}.` : null,
      `Page: ${urlEn}`,
    ]);
    const tags = ['galerie', 'gallery', 'projets', 'projects', 'références', 'clients', 'marques', 'brands'];
    return [
      { id: 'gallery-overview-fr', kind: 'gallery', slug: 'overview', lang: 'fr', title: 'Galerie & références', url: urlFr, body: bodyFr, tags },
      { id: 'gallery-overview-en', kind: 'gallery', slug: 'overview', lang: 'en', title: 'Gallery & references', url: urlEn, body: bodyEn, tags },
    ];
  } catch (err) {
    console.warn('[chat-knowledge] gallery-projects fetch failed:', err.message);
    return [];
  }
}

async function buildContactSubjectsChunk() {
  try {
    const res = await fetchBilingual('contact-subjects', {
      sort: 'createdAt:asc',
      'pagination[pageSize]': 50,
    });
    const frList = res.fr?.data ?? [];
    const enList = res.en?.data ?? [];
    if (frList.length === 0) return [];
    const itemsFr = frList.map((s) => `- ${s.name}${s.description ? ` — ${s.description}` : ''}`);
    const itemsEn = enList.length > 0
      ? enList.map((s) => `- ${s.name}${s.description ? ` — ${s.description}` : ''}`)
      : itemsFr;
    const urlFr = pageUrl('fr', '/contact');
    const urlEn = pageUrl('en', '/contact');
    const tags = ['contact', 'sujets', 'subjects', 'devis', 'quote', 'visite', 'tour'];
    return [
      {
        id: 'contact-subjects-fr',
        kind: 'contact',
        slug: 'subjects',
        lang: 'fr',
        title: 'Motifs de contact disponibles',
        url: urlFr,
        body: joinLines([`Sujets disponibles dans le formulaire de contact :`, itemsFr.join('\n'), `\nFormulaire : ${urlFr}`]),
        tags,
      },
      {
        id: 'contact-subjects-en',
        kind: 'contact',
        slug: 'subjects',
        lang: 'en',
        title: 'Available contact topics',
        url: urlEn,
        body: joinLines([`Topics available in the contact form:`, itemsEn.join('\n'), `\nForm: ${urlEn}`]),
        tags,
      },
    ];
  } catch (err) {
    console.warn('[chat-knowledge] contact-subjects fetch failed:', err.message);
    return [];
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[chat-knowledge] Fetching from ${STRAPI_URL}`);

  const groups = await Promise.all([
    buildSiteChunks(),
    buildPlateauxChunks(),
    buildPostProdChunks(),
    buildBlogChunks(),
    buildLegalChunks(),
    buildTeamChunks(),
    buildGalleryOverviewChunk(),
    buildContactSubjectsChunk(),
  ]);

  const now = new Date().toISOString();
  const chunks = groups.flat().map((c) => ({
    ...c,
    body: (c.body || '').trim(),
    title: (c.title || '').trim(),
    tags: c.tags ?? [],
    updated_at: now,
  })).filter((c) => c.title && c.body);

  console.log(`[chat-knowledge] Built ${chunks.length} chunks across ${groups.length} source groups.`);

  if (DRY_RUN) {
    console.log(JSON.stringify(chunks.map((c) => ({ id: c.id, title: c.title, lang: c.lang, bytes: c.body.length })), null, 2));
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const incomingIds = new Set(chunks.map((c) => c.id));

  // Upsert in batches to stay well under the request size limit.
  const BATCH = 100;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const { error } = await supabase
      .from('chat_knowledge_chunks')
      .upsert(slice, { onConflict: 'id' });
    if (error) {
      console.error(`[chat-knowledge] Upsert batch ${i}-${i + slice.length} failed:`, error.message);
      process.exit(1);
    }
  }
  console.log(`[chat-knowledge] Upserted ${chunks.length} chunks.`);

  // Prune chunks no longer present in the corpus.
  const { data: existing, error: listErr } = await supabase
    .from('chat_knowledge_chunks')
    .select('id');
  if (listErr) {
    console.warn(`[chat-knowledge] Could not list existing chunks for pruning: ${listErr.message}`);
  } else {
    const stale = (existing ?? [])
      .map((row) => row.id)
      .filter((id) => !incomingIds.has(id));
    if (stale.length > 0) {
      const { error: delErr } = await supabase
        .from('chat_knowledge_chunks')
        .delete()
        .in('id', stale);
      if (delErr) {
        console.warn(`[chat-knowledge] Pruning failed: ${delErr.message}`);
      } else {
        console.log(`[chat-knowledge] Pruned ${stale.length} stale chunks.`);
      }
    }
  }

  console.log('[chat-knowledge] Done.');
}

main().catch((err) => {
  console.error('[chat-knowledge] Fatal:', err);
  process.exit(1);
});
