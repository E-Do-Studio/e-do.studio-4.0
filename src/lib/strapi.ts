import type { Bilingual, MachineInfo, DiscoveryPost, DiscoveryCategory, SocialLink } from '../types';
import type { BlockNode } from './render-blocks';
import { getPreviewState } from './preview-mode';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'https://cms.e-do.studio';
const STRAPI_TOKEN = import.meta.env.VITE_STRAPI_TOKEN || '';
// Optional dedicated token with read-draft permission. Falls back to the
// public token when not configured (assuming that token also has draft scope
// in the Strapi role).
const STRAPI_PREVIEW_TOKEN = import.meta.env.VITE_STRAPI_PREVIEW_TOKEN || '';

// ─── Generic fetcher ────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchStrapi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (k === 'populate' && v.includes(',')) {
        v.split(',').forEach((field, i) => url.searchParams.append(`populate[${i}]`, field.trim()));
      } else {
        url.searchParams.set(k, v);
      }
    });
  }

  const preview = getPreviewState();
  if (preview.active) {
    // Strapi 5 selects unpublished entries via `status=draft` (per the
    // Document Service API). Adding it changes the cache key too, so draft
    // and published responses never collide.
    url.searchParams.set('status', preview.status);
  }

  const key = url.toString();
  // Skip the in-memory cache while previewing so editors see their latest
  // changes without waiting for the 5-minute TTL.
  if (!preview.active) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data as T;
  }

  // After the users-permissions plugin removal, the public website
  // authenticates with a read-only API token via VITE_STRAPI_TOKEN.
  // Without the token the request is anonymous and Strapi will reject
  // it with 401 once the plugin is gone.
  const token = preview.active && STRAPI_PREVIEW_TOKEN ? STRAPI_PREVIEW_TOKEN : STRAPI_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(key, { headers });
  if (!res.ok) throw new Error(`Strapi ${path}: ${res.status}`);
  const json = await res.json();
  if (!preview.active) cache.set(key, { data: json, ts: Date.now() });
  return json;
}

async function fetchStrapiBilingual<T>(path: string, params?: Record<string, string>): Promise<{ fr: T; en: T }> {
  const [fr, en] = await Promise.all([
    fetchStrapi<T>(path, { ...params, locale: 'fr' }),
    fetchStrapi<T>(path, { ...params, locale: 'en' }),
  ]);
  return { fr, en };
}

// ─── Strapi response types (single-locale, matching i18n API) ──────────────

interface StrapiSpec { label: string; value: string }
interface StrapiLocalizedItem { text: string }
interface StrapiSocialLink { platform: string; label: string; url: string }

interface StrapiPricingRow {
  label: string;
  amount: number | string | null;
  kind?: 'unit' | 'package' | 'quote';
  note?: string | null;
}

interface StrapiSeoMeta {
  title?: string;
  description?: string;
  image?: StrapiMedia;
  canonicalUrl?: string;
  noIndex?: boolean;
}

interface StrapiMachine {
  id: number;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  pricing: string;
  operatorPricing: string | null;
  specs?: StrapiSpec[];
  pricingRows?: StrapiPricingRow[];
  operatorPricingRows?: StrapiPricingRow[];
  media?: StrapiMedia[];
  seo?: StrapiSeoMeta;
}

interface StrapiCyclorama {
  title: string;
  subtitle: string;
  description: string;
  pricing: string;
  pricingDescription: string;
  specs?: StrapiSpec[];
  usages?: StrapiLocalizedItem[];
  pricingRows?: StrapiPricingRow[];
  media?: StrapiMediaItem[];
  seo?: StrapiSeoMeta;
}

interface StrapiPostProdType {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: string;
  includes?: StrapiLocalizedItem[];
  priceRows?: StrapiPricingRow[];
  media?: StrapiMedia[];
  seo?: StrapiSeoMeta;
}

interface StrapiMedia {
  url: string;
  mime?: string;
  alternativeText?: string | null;
  formats?: {
    medium?: { url: string };
    small?: { url: string };
    thumbnail?: { url: string };
  };
}

interface StrapiMediaItem {
  kind: 'image' | 'video';
  image?: StrapiMedia | null;
  video?: StrapiMedia | null;
  poster?: StrapiMedia | null;
  alt?: string | null;
}

interface StrapiBlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body?: string;
  bodyBlocks?: BlockNode[];
  coverImage?: StrapiMedia;
  publishedAt: string;
  categories?: { id: number; title: string; slug: string }[];
}

interface StrapiBlogCategory {
  id: number;
  title: string;
  slug: string;
}

interface StrapiTransportEntry { label: string }
interface StrapiAddressEntry { label: string; address: string }

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface StrapiOpeningHour {
  dayOfWeek: DayOfWeek;
  opensAt?: string | null;
  closesAt?: string | null;
  closed?: boolean;
  byAppointment?: boolean;
}

interface StrapiPostalAddress {
  street: string;
  complement?: string | null;
  city: string;
  postalCode: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface StrapiClosurePeriod {
  label?: string;
  startsAt: string;
  endsAt: string;
  note?: string;
}

interface StrapiSiteSettings {
  siteTitle?: string;
  siteDescription?: string;
  phone: string;
  phoneHref?: string;
  email: string;
  street: string;
  city: string;
  postalCode: string;
  country?: string;
  fullAddress?: string;
  googleMapsUrl?: string;
  mapsEmbedUrl?: string;
  hours?: string;
  weekendHours?: string;
  openingHours?: StrapiOpeningHour[];
  parking?: string;
  transport?: StrapiTransportEntry[];
  entries?: StrapiAddressEntry[];
  defaultSeoTitle?: string;
  defaultSeoDescription?: string;
  defaultSeoImage?: StrapiMedia;
  googleAnalyticsId?: string;
  socialLinks?: StrapiSocialLink[];
  siteUrl?: string;
  legalName?: string;
  siret?: string;
  vatNumber?: string;
  currency?: 'EUR' | 'USD' | 'GBP' | 'CHF';
  contactEmail?: string;
  closures?: StrapiClosurePeriod[];
  address?: StrapiPostalAddress;
}

interface StrapiGalleryBrand {
  id: number;
  name: string;
}

interface StrapiGalleryCategory {
  id: number;
  name: string;
  slug: string;
  group?: string;
}

type StageKey = 'live' | 'eclipse' | 'horizontal' | 'vertical' | 'cyclorama';

interface StrapiGalleryProject {
  id: number;
  stage?: StageKey | null;
  year: number | string;
  category?: StrapiGalleryCategory;
  brand?: StrapiGalleryBrand;
  media?: StrapiMedia[];
}

// ─── PlateauSpec type (local, matches what the frontend expects) ────────────

export interface SeoMeta {
  title?: string;
  description?: string;
  imageUrl?: string;
  noIndex?: boolean;
}

export type MediaItem =
  | { kind: 'image'; url: string; alt: Bilingual }
  | { kind: 'video'; url: string; poster?: string; alt: Bilingual };

export interface PlateauSpec {
  num: string;
  name: string;
  slug: string;
  tagline: Bilingual;
  desc: Bilingual;
  specs: { k: Bilingual; v: Bilingual }[];
  uses: Bilingual[];
  rates: { k: Bilingual; v: string | Bilingual }[];
  ratesNote?: Bilingual;
  visual: string;
  media: MediaItem[];
  seo?: Bilingual<SeoMeta>;
}

function buildSeo(seoFr: StrapiSeoMeta | undefined, seoEn: StrapiSeoMeta | undefined): Bilingual<SeoMeta> | undefined {
  const fr = seoFr ?? {};
  const en = seoEn ?? seoFr ?? {};
  const hasAny = (s: StrapiSeoMeta) => !!(s.title || s.description || s.image);
  if (!hasAny(fr) && !hasAny(en)) return undefined;
  return {
    fr: {
      title: fr.title,
      description: fr.description,
      imageUrl: resolveStrapiMediaUrl(fr.image),
      noIndex: fr.noIndex,
    },
    en: {
      title: en.title || fr.title,
      description: en.description || fr.description,
      imageUrl: resolveStrapiMediaUrl(en.image) || resolveStrapiMediaUrl(fr.image),
      noIndex: en.noIndex ?? fr.noIndex,
    },
  };
}

// ─── PPCat type ─────────────────────────────────────────────────────────────

export interface PPPrice {
  amount?: string;
  unit?: Bilingual;
  from?: boolean;
  kind?: string;
}

export interface PPCat {
  k: string;
  medium: string;
  fr: string;
  en: string;
  tagline: Bilingual;
  price: PPPrice;
  note: Bilingual;
  features: Bilingual<string[]>;
  formats: string[];
  samples: string[];
  brands: string[];
  seo?: Bilingual<SeoMeta>;
}

// ─── Transform helpers ──────────────────────────────────────────────────────

function mergeSpecs(frSpecs: StrapiSpec[], enSpecs: StrapiSpec[]): { k: Bilingual; v: Bilingual }[] {
  const len = Math.max(frSpecs.length, enSpecs.length);
  const result: { k: Bilingual; v: Bilingual }[] = [];
  for (let i = 0; i < len; i++) {
    result.push({
      k: { fr: frSpecs[i]?.label ?? '', en: enSpecs[i]?.label ?? '' },
      v: { fr: frSpecs[i]?.value ?? '', en: enSpecs[i]?.value ?? '' },
    });
  }
  return result;
}

function mergeLocalizedItems(frItems: StrapiLocalizedItem[], enItems: StrapiLocalizedItem[]): Bilingual[] {
  const len = Math.max(frItems.length, enItems.length);
  return Array.from({ length: len }, (_, i) => ({
    fr: frItems[i]?.text ?? '',
    en: enItems[i]?.text ?? '',
  }));
}

function mediaListToItems(items: StrapiMedia[] | undefined): MediaItem[] {
  if (!items) return [];
  const out: MediaItem[] = [];
  for (const m of items) {
    const url = resolveStrapiMediaUrl(m);
    if (!url) continue;
    const alt: Bilingual = { fr: m.alternativeText ?? '', en: m.alternativeText ?? '' };
    if (m.mime?.startsWith('video/')) {
      const rawUrl = resolveRawMediaUrl(m) ?? url;
      out.push({ kind: 'video', url: rawUrl, alt });
    } else {
      out.push({ kind: 'image', url, alt });
    }
  }
  return out;
}

function mergeMediaItems(frItems: StrapiMediaItem[] | undefined, enItems: StrapiMediaItem[] | undefined): MediaItem[] {
  const fr = frItems ?? [];
  const en = enItems ?? [];
  // The media component itself is non-localized in Strapi, but `alt` IS localized
  // at the entry level — so FR/EN come in as parallel arrays of the same length.
  // Merge by index; the FR entry is the source of truth for kind/url/poster.
  const out: MediaItem[] = [];
  for (let i = 0; i < fr.length; i++) {
    const f = fr[i];
    const e = en[i] ?? f;
    const altFr = f.alt ?? '';
    const altEn = e.alt ?? altFr;
    const alt: Bilingual = { fr: altFr, en: altEn };
    if (f.kind === 'video') {
      const url = resolveRawMediaUrl(f.video);
      if (!url) continue;
      out.push({ kind: 'video', url, poster: resolveRawMediaUrl(f.poster), alt });
    } else {
      const url = resolveStrapiMediaUrl(f.image);
      if (!url) continue;
      out.push({ kind: 'image', url, alt });
    }
  }
  return out;
}

function parsePricingToRates(pricingFr: string, pricingEn: string): { k: Bilingual; v: string }[] {
  const frParts = pricingFr?.split(' · ') ?? [];
  const enParts = pricingEn?.split(' · ') ?? [];
  const len = Math.max(frParts.length, enParts.length);
  const rates: { k: Bilingual; v: string }[] = [];
  for (let i = 0; i < len; i++) {
    const fr = frParts[i]?.trim() ?? '';
    const en = enParts[i]?.trim() ?? '';
    const frMatch = fr.match(/^(.+?)\s*[/:]\s*(.+)$/);
    const enMatch = en.match(/^(.+?)\s*[/:]\s*(.+)$/);
    if (frMatch && enMatch) {
      rates.push({ k: { fr: frMatch[2], en: enMatch[2] }, v: frMatch[1] });
    } else {
      rates.push({ k: { fr: fr, en: en }, v: '' });
    }
  }
  return rates;
}

function formatRowAmount(row: StrapiPricingRow, fallback: Bilingual): string | Bilingual {
  if (row.kind === 'quote' || row.amount == null || row.amount === '') {
    return fallback;
  }
  const n = typeof row.amount === 'number' ? row.amount : Number(row.amount);
  if (Number.isNaN(n)) return String(row.amount);
  // Display whole euros without decimal, otherwise 2 decimals.
  const formatted = Number.isInteger(n) ? `€ ${n}` : `€ ${n.toFixed(2)}`;
  return formatted;
}

function pricingRowsToRates(
  frRows: StrapiPricingRow[],
  enRows: StrapiPricingRow[],
): { k: Bilingual; v: string | Bilingual }[] {
  const len = Math.max(frRows.length, enRows.length);
  const onRequest: Bilingual = { fr: 'Sur demande', en: 'On request' };
  const rates: { k: Bilingual; v: string | Bilingual }[] = [];
  for (let i = 0; i < len; i++) {
    const fr = frRows[i];
    const en = enRows[i] ?? fr;
    if (!fr) continue;
    rates.push({
      k: { fr: fr.label ?? '', en: en?.label ?? fr.label ?? '' },
      v: formatRowAmount(fr, onRequest),
    });
  }
  return rates;
}

const CYCLO_USES: Bilingual[] = [
  { fr: 'Campagne & éditorial', en: 'Campaign & editorial' },
  { fr: 'Film publicitaire', en: 'Advertising film' },
  { fr: 'Packshot & still life', en: 'Packshot & still life' },
];

const MACHINE_USES: Record<string, Bilingual[]> = {
  horizontal: [
    { fr: 'Prêt-à-porter à plat', en: 'Flat-laid ready-to-wear' },
    { fr: 'Compositions produits', en: 'Product compositions' },
    { fr: 'Détourage automatique', en: 'Automatic clipping' },
  ],
  vertical: [
    { fr: 'Ghost', en: 'Ghost' },
    { fr: 'Piqué', en: 'Piqué' },
    { fr: 'Détourage automatique', en: 'Automatic clipping' },
  ],
  eclipse: [
    { fr: 'Photo & vidéo e-commerce', en: 'E-commerce photo & video' },
    { fr: 'Still life', en: 'Still life' },
    { fr: 'Accessoires, chaussures & beauté', en: 'Accessories, footwear & beauty' },
  ],
  live: [
    { fr: 'Shooting porté', en: 'On-model shooting' },
    { fr: 'Photo & vidéo e-commerce', en: 'E-commerce photo & video' },
    { fr: 'Lookbooks & linesheets', en: 'Lookbooks & linesheets' },
  ],
};

const MACHINE_LABELS: Record<string, { fr: string; en: string }> = {
  cyclorama: { fr: '30 m² — Broncolor', en: '30 m² — Broncolor' },
  horizontal: { fr: 'Packshot horizontal', en: 'Horizontal packshot' },
  vertical: { fr: 'Pleine hauteur', en: 'Full height' },
  eclipse: { fr: 'Éclipse 360°', en: 'Eclipse 360°' },
  live: { fr: 'Diffusion live', en: 'Live broadcast' },
};

// ─── Data fetchers ──────────────────────────────────────────────────────────

export async function fetchPlateaux(): Promise<Record<string, PlateauSpec>> {
  const [machinesBI, cycloBI] = await Promise.all([
    fetchStrapiBilingual<{ data: StrapiMachine[] }>('machines', { 'populate': 'specs,pricingRows,seo,seo.image,media', 'sort': 'createdAt:asc' }),
    fetchStrapiBilingual<{ data: StrapiCyclorama }>('cyclorama', { 'populate': 'specs,usages,pricingRows,seo,seo.image,media,media.image,media.video,media.poster' }),
  ]);

  const result: Record<string, PlateauSpec> = {};

  const cycFr = cycloBI.fr.data;
  const cycEn = cycloBI.en.data;
  if (cycFr) {
    const cycRows = cycFr.pricingRows ?? [];
    const cycRowsEn = cycEn?.pricingRows ?? [];
    const rates = cycRows.length > 0
      ? pricingRowsToRates(cycRows, cycRowsEn)
      : parsePricingToRates(cycFr.pricing, cycEn?.pricing ?? cycFr.pricing);
    result.cyclorama = {
      num: '01',
      name: 'Cyclorama',
      slug: 'cyclorama',
      tagline: { fr: cycFr.subtitle, en: cycEn?.subtitle ?? cycFr.subtitle },
      desc: { fr: cycFr.description, en: cycEn?.description ?? cycFr.description },
      specs: mergeSpecs(cycFr.specs ?? [], cycEn?.specs ?? []),
      uses: mergeLocalizedItems(cycFr.usages ?? [], cycEn?.usages ?? []),
      rates,
      ratesNote: cycFr.pricingDescription ? { fr: cycFr.pricingDescription, en: cycEn?.pricingDescription ?? cycFr.pricingDescription } : undefined,
      visual: 'cyc',
      media: mergeMediaItems(cycFr.media, cycEn?.media),
      seo: buildSeo(cycFr.seo, cycEn?.seo),
    };
  }

  const machinesFr = machinesBI.fr.data;
  const machinesEn = machinesBI.en.data;
  machinesFr.forEach((mFr, i) => {
    const mEn = machinesEn.find(e => e.slug === mFr.slug) ?? mFr;
    const rows = mFr.pricingRows ?? [];
    const rowsEn = mEn.pricingRows ?? [];
    const rates = rows.length > 0
      ? pricingRowsToRates(rows, rowsEn)
      : parsePricingToRates(mFr.pricing, mEn.pricing);
    result[mFr.slug] = {
      num: String(i + 2).padStart(2, '0'),
      name: mFr.title,
      slug: mFr.slug,
      tagline: { fr: mFr.subtitle, en: mEn.subtitle },
      desc: { fr: mFr.description, en: mEn.description },
      specs: mergeSpecs(mFr.specs ?? [], mEn.specs ?? []),
      uses: MACHINE_USES[mFr.slug] ?? [],
      rates,
      visual: mFr.slug,
      media: mediaListToItems(mFr.media),
      seo: buildSeo(mFr.seo, mEn.seo),
    };
  });

  return result;
}

export async function fetchMachines(): Promise<MachineInfo[]> {
  const [machinesBI, cycloBI] = await Promise.all([
    fetchStrapiBilingual<{ data: StrapiMachine[] }>('machines', { 'sort': 'createdAt:asc' }),
    fetchStrapiBilingual<{ data: StrapiCyclorama }>('cyclorama'),
  ]);

  const cycFr = cycloBI.fr.data;
  const cycEn = cycloBI.en.data;
  const list: MachineInfo[] = [];

  if (cycFr) {
    list.push({
      slug: 'cyclorama',
      fr: { t: cycFr.title || 'Cyclorama', sub: cycFr.subtitle, label: MACHINE_LABELS.cyclorama?.fr },
      en: { t: cycEn?.title || 'Cyclorama', sub: cycEn?.subtitle ?? cycFr.subtitle, label: MACHINE_LABELS.cyclorama?.en },
    });
  }

  const machinesFr = machinesBI.fr.data;
  const machinesEn = machinesBI.en.data;
  for (const mFr of machinesFr) {
    const mEn = machinesEn.find(e => e.slug === mFr.slug) ?? mFr;
    list.push({
      slug: mFr.slug,
      fr: { t: mFr.title, sub: mFr.subtitle, label: MACHINE_LABELS[mFr.slug]?.fr },
      en: { t: mEn.title, sub: mEn.subtitle, label: MACHINE_LABELS[mFr.slug]?.en },
    });
  }

  return list;
}

function priceFromRow(row: StrapiPricingRow): PPPrice {
  if (row.kind === 'quote' || row.amount == null || row.amount === '') {
    return { kind: 'quote', from: false };
  }
  const n = typeof row.amount === 'number' ? row.amount : Number(row.amount);
  if (Number.isNaN(n)) return { amount: String(row.amount), kind: row.kind ?? 'unit', from: false };
  const amount = Number.isInteger(n) ? `${n}€` : `${n.toFixed(2).replace('.', ',')}€`;
  return {
    amount,
    kind: row.kind === 'package' ? 'package' : 'unit',
    from: true,
  };
}

export async function fetchPostProdTypes(): Promise<PPCat[]> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiPostProdType[] }>('post-production-types', {
    'populate': 'includes,priceRows,media,seo,seo.image',
    'sort': 'createdAt:asc',
  });

  const frTypes = resBI.fr.data;
  const enTypes = resBI.en.data;

  return frTypes.map(tFr => {
    const tEn = enTypes.find(e => e.slug === tFr.slug) ?? tFr;
    const firstRow = tFr.priceRows?.[0];
    const price = firstRow ? priceFromRow(firstRow) : parsePriceText(tFr.price);
    // `media` is non-i18n: the FR locale is the source of truth. The
    // schema allows multiple images/videos — selection multiple like
    // gallery-project.
    const samples = (tFr.media ?? [])
      .map((m) => resolveStrapiMediaUrl(m))
      .filter((u): u is string => !!u);
    return {
      k: tFr.slug,
      medium: 'photo',
      fr: tFr.title,
      en: tEn.title,
      tagline: { fr: tFr.description, en: tEn.description },
      price,
      note: { fr: '', en: '' },
      features: {
        fr: (tFr.includes ?? []).map(i => i.text),
        en: (tEn.includes ?? []).map(i => i.text),
      },
      formats: [],
      samples,
      brands: [],
      seo: buildSeo(tFr.seo, tEn.seo),
    };
  });
}

function parsePriceText(text: string): PPPrice {
  const from = text?.startsWith('À partir de') || text?.startsWith('Sur devis');
  const amountMatch = text?.match(/[\d,]+\s*€/);
  return {
    amount: amountMatch?.[0] ?? text,
    from,
    kind: text?.includes('devis') ? 'quote' : 'unit',
  };
}

const TONES: Array<'warm' | 'mono' | 'dark'> = ['warm', 'mono', 'dark'];

function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function resolveStrapiMediaUrl(media?: StrapiMedia | null): string | undefined {
  if (!media?.url) return undefined;
  const path = media.formats?.medium?.url ?? media.url;
  if (path.startsWith('http')) return path;
  return `${STRAPI_URL}${path}`;
}

function resolveRawMediaUrl(media?: StrapiMedia | null): string | undefined {
  if (!media?.url) return undefined;
  if (media.url.startsWith('http')) return media.url;
  return `${STRAPI_URL}${media.url}`;
}

export async function fetchDiscoveryPosts(): Promise<DiscoveryPost[]> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiBlogPost[] }>('blog-posts', {
    'populate': 'categories,coverImage,bodyBlocks',
    'sort': 'publishedAt:desc',
    'pagination[pageSize]': '50',
  });

  const frPosts = resBI.fr.data;
  const enPosts = resBI.en.data;

  return frPosts.map((pFr, i) => {
    const pEn = enPosts.find(e => e.slug === pFr.slug) ?? pFr;
    const catFr = pFr.categories?.[0];
    const catEn = pEn.categories?.[0];
    const bodyFr = pFr.body ?? '';
    const bodyEn = pEn.body ?? '';
    const blocksFr = Array.isArray(pFr.bodyBlocks) ? pFr.bodyBlocks : [];
    const blocksEn = Array.isArray(pEn.bodyBlocks) ? pEn.bodyBlocks : blocksFr;
    const readingTime = estimateReadingTime(bodyFr || bodyEn);
    return {
      id: pFr.id,
      cat: catFr?.slug ?? 'tips',
      tone: TONES[i % 3],
      tag: { fr: catFr?.title ?? 'Tips', en: catEn?.title ?? 'Tips' },
      title: { fr: pFr.title, en: pEn.title },
      sub: { fr: pFr.excerpt, en: pEn.excerpt },
      body: { fr: bodyFr, en: bodyEn },
      bodyBlocks: blocksFr.length > 0 || blocksEn.length > 0 ? { fr: blocksFr, en: blocksEn } : undefined,
      date: formatStrapiDate(pFr.publishedAt),
      read: `${readingTime} min`,
      author: 'Studio',
      coverUrl: resolveStrapiMediaUrl(pFr.coverImage),
      featured: false,
    };
  });
}

function formatStrapiDate(iso: string): Bilingual {
  if (!iso) return { fr: '', en: '' };
  const d = new Date(iso);
  return {
    fr: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', ''),
    en: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

export async function fetchDiscoveryCategories(): Promise<DiscoveryCategory[]> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiBlogCategory[] }>('blog-categories', { 'sort': 'title:asc' });
  const frCats = resBI.fr.data;
  const enCats = resBI.en.data;
  return [
    { k: 'all', fr: 'Tout', en: 'All' },
    ...frCats.map(cFr => {
      const cEn = enCats.find(e => e.slug === cFr.slug) ?? cFr;
      return { k: cFr.slug, fr: cFr.title, en: cEn.title };
    }),
  ];
}

export async function fetchSocialLinks(): Promise<SocialLink[]> {
  const res = await fetchStrapi<{ data: StrapiSiteSettings }>('site-setting', { 'populate': 'socialLinks', 'locale': 'fr' });
  return (res.data.socialLinks ?? []).map(s => ({ k: s.platform, label: s.label, href: s.url }));
}

export interface ContactInfo {
  phone: string;
  phoneHref: string;
  email: string;
  emailHref: string;
  address: { street: string; zip: string; city: string; postalCode: string; country?: string };
  fullAddress?: string;
  googleMapsUrl?: string;
  mapsEmbedUrl?: string;
  parking?: Bilingual;
  transport: { label: string }[];
  entries: { label: string; address: string }[];
  etouch: string;
}

function composeFullAddress(addr: StrapiPostalAddress): string {
  const parts = [addr.street, addr.complement, `${addr.postalCode} ${addr.city}`.trim(), addr.country && addr.country !== 'FR' ? addr.country : ''];
  return parts.filter(Boolean).join(', ');
}

export async function fetchContact(): Promise<ContactInfo> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiSiteSettings }>(
    'site-setting',
    { populate: 'transport,entries,address' },
  );
  const s = resBI.fr.data;
  const sEn = resBI.en.data;
  const phoneHref = s.phoneHref || (s.phone ? `tel:${s.phone.replace(/\s/g, '')}` : '');

  // Prefer the structured `address` component when populated; otherwise fall back to flat fields.
  const addr = s.address;
  const street = addr?.street ?? s.street;
  const city = addr?.city ?? s.city;
  const postalCode = addr?.postalCode ?? s.postalCode;
  const country = addr?.country ?? s.country;
  const fullAddress = addr ? composeFullAddress(addr) : s.fullAddress;

  return {
    phone: s.phone,
    phoneHref,
    email: s.email,
    emailHref: s.email ? `mailto:${s.email}` : '',
    address: {
      street,
      zip: `${postalCode ?? ''} ${city ?? ''}`.trim(),
      city,
      postalCode,
      country,
    },
    fullAddress,
    googleMapsUrl: s.googleMapsUrl,
    mapsEmbedUrl: s.mapsEmbedUrl,
    parking: s.parking || sEn?.parking ? { fr: s.parking ?? '', en: sEn?.parking ?? s.parking ?? '' } : undefined,
    transport: s.transport ?? [],
    entries: s.entries ?? [],
    etouch: 'https://etouch.e-do.studio',
  };
}

export interface StudioHours {
  weekday: Bilingual;
  weekend: Bilingual;
}

const WEEKDAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKEND: DayOfWeek[] = ['saturday', 'sunday'];

function trimTime(t?: string | null): string {
  if (!t) return '';
  const m = String(t).match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : String(t);
}

function summarizeRange(rows: StrapiOpeningHour[], days: DayOfWeek[], lang: 'fr' | 'en'): string {
  const matching = rows.filter((r) => days.includes(r.dayOfWeek));
  const open = matching.filter((r) => !r.closed);
  if (open.length === 0) {
    return lang === 'fr' ? 'Fermé' : 'Closed';
  }
  const byAppointment = open.every((r) => r.byAppointment);
  if (byAppointment) {
    return lang === 'fr' ? 'Sur rendez-vous' : 'By appointment';
  }
  // Take the first row's range; if everyone matches, that's the canonical display.
  // If they differ, fall back to a multi-line summary (caller should switch to legacy).
  const first = open[0];
  const allSame = open.every((r) => trimTime(r.opensAt) === trimTime(first.opensAt) && trimTime(r.closesAt) === trimTime(first.closesAt));
  const opens = trimTime(first.opensAt);
  const closes = trimTime(first.closesAt);
  if (!opens || !closes) {
    return lang === 'fr' ? 'Sur demande' : 'On request';
  }
  if (!allSame) {
    return open
      .map((r) => `${trimTime(r.opensAt)} — ${trimTime(r.closesAt)}`)
      .join(' · ');
  }
  return `${opens} — ${closes}`;
}

export async function fetchStudioHours(): Promise<StudioHours> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiSiteSettings }>('site-setting', {
    populate: 'openingHours',
  });
  const fr = resBI.fr.data;
  const en = resBI.en.data;
  const rowsFr = fr.openingHours ?? [];
  if (rowsFr.length > 0) {
    return {
      weekday: { fr: summarizeRange(rowsFr, WEEKDAYS, 'fr'), en: summarizeRange(rowsFr, WEEKDAYS, 'en') },
      weekend: { fr: summarizeRange(rowsFr, WEEKEND, 'fr'), en: summarizeRange(rowsFr, WEEKEND, 'en') },
    };
  }
  return {
    weekday: { fr: fr.hours ?? '', en: en?.hours ?? fr.hours ?? '' },
    weekend: { fr: fr.weekendHours ?? '', en: en?.weekendHours ?? fr.weekendHours ?? '' },
  };
}

export interface ClosurePeriod {
  label?: Bilingual;
  startsAt: string;
  endsAt: string;
  note?: Bilingual;
}

export interface SiteBusinessInfo {
  legalName?: string;
  siret?: string;
  vatNumber?: string;
  currency: 'EUR' | 'USD' | 'GBP' | 'CHF';
  siteUrl?: string;
  contactEmail?: string;
  closures: ClosurePeriod[];
}

export async function fetchSiteBusinessInfo(): Promise<SiteBusinessInfo> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiSiteSettings }>(
    'site-setting',
    { populate: 'closures' },
  );
  const fr = resBI.fr.data;
  const en = resBI.en.data;
  const closuresFr = fr.closures ?? [];
  const closuresEn = en?.closures ?? [];
  const closures: ClosurePeriod[] = closuresFr.map((c, i) => {
    const cEn = closuresEn[i] ?? c;
    return {
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      label: c.label || cEn?.label
        ? { fr: c.label ?? '', en: cEn?.label ?? c.label ?? '' }
        : undefined,
      note: c.note || cEn?.note
        ? { fr: c.note ?? '', en: cEn?.note ?? c.note ?? '' }
        : undefined,
    };
  });
  return {
    legalName: fr.legalName,
    siret: fr.siret,
    vatNumber: fr.vatNumber,
    currency: fr.currency ?? 'EUR',
    siteUrl: fr.siteUrl,
    contactEmail: fr.contactEmail,
    closures,
  };
}

export interface SiteDefaults {
  seoTitle: Bilingual;
  seoDescription: Bilingual;
  seoImageUrl?: string;
  googleAnalyticsId?: string;
}

export type LegalDocumentKey = 'mentions' | 'cgv' | 'cgu' | 'privacy' | 'cookies';

export interface LegalSection {
  documentKey: LegalDocumentKey;
  slug: string;
  title: Bilingual;
  lastUpdatedAt?: string;
}

interface StrapiLegalSection {
  id: number;
  documentKey: LegalDocumentKey;
  slug: string;
  title: string;
  body?: unknown;
  lastUpdatedAt?: string;
}

export interface LegalSectionContent {
  slug: string;
  title: Bilingual;
  body: Bilingual<BlockNode[]>;
  lastUpdatedAt?: string;
}

export type LegalSectionsByDocument = Partial<Record<LegalDocumentKey, LegalSectionContent[]>>;

export async function fetchLegalSectionsByDocument(): Promise<LegalSectionsByDocument> {
  try {
    const resBI = await fetchStrapiBilingual<{ data: StrapiLegalSection[] }>('legal-sections', {
      'sort': 'slug:asc',
      'pagination[pageSize]': '200',
    });
    const frSections = resBI.fr.data ?? [];
    const enSections = resBI.en.data ?? [];
    const enById = new Map(enSections.map((s) => [s.id, s]));
    const grouped: LegalSectionsByDocument = {};
    for (const s of frSections) {
      const en = enById.get(s.id) ?? s;
      const bodyFr = (Array.isArray(s.body) ? s.body : []) as BlockNode[];
      const bodyEn = (Array.isArray(en.body) ? en.body : bodyFr) as BlockNode[];
      const list = grouped[s.documentKey] ?? (grouped[s.documentKey] = []);
      list.push({
        slug: s.slug,
        title: { fr: s.title, en: en.title },
        body: { fr: bodyFr, en: bodyEn },
        lastUpdatedAt: s.lastUpdatedAt,
      });
    }
    return grouped;
  } catch {
    return {};
  }
}

export interface LegalDocumentMeta {
  k: LegalDocumentKey;
  fr: string;
  en: string;
  updated: string;
}

const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentKey, { fr: string; en: string }> = {
  mentions: { fr: 'Mentions légales', en: 'Legal notice' },
  cgv: { fr: 'Conditions de vente', en: 'Terms of sale' },
  cgu: { fr: "Conditions d'utilisation", en: 'Terms of use' },
  privacy: { fr: 'Confidentialité', en: 'Privacy policy' },
  cookies: { fr: 'Cookies', en: 'Cookies' },
};

const LEGAL_DOCUMENT_ORDER: LegalDocumentKey[] = ['mentions', 'cgv', 'cgu', 'privacy', 'cookies'];

function formatLastUpdated(iso?: string): string {
  if (!iso) return '';
  // Display as MM.YYYY for compactness.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export async function fetchLegalDocuments(): Promise<LegalDocumentMeta[]> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiLegalSection[] }>('legal-sections', {
    'sort': 'slug:asc',
    'pagination[pageSize]': '200',
  });
  const frSections = resBI.fr.data ?? [];

  // Pick the most recent lastUpdatedAt per document.
  const updatedByDoc = new Map<LegalDocumentKey, string>();
  for (const s of frSections) {
    const existing = updatedByDoc.get(s.documentKey);
    if (!existing || (s.lastUpdatedAt && s.lastUpdatedAt > existing)) {
      updatedByDoc.set(s.documentKey, s.lastUpdatedAt ?? existing ?? '');
    }
  }

  return LEGAL_DOCUMENT_ORDER.map((k) => ({
    k,
    fr: LEGAL_DOCUMENT_LABELS[k].fr,
    en: LEGAL_DOCUMENT_LABELS[k].en,
    updated: formatLastUpdated(updatedByDoc.get(k)),
  }));
}

export interface ContactSubject {
  k: string;
  fr: string;
  en: string;
}

interface StrapiContactSubject {
  id: number;
  key: string;
  name: string;
  description?: string;
}

export async function fetchContactSubjects(): Promise<ContactSubject[]> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiContactSubject[] }>('contact-subjects', {
    'sort': 'createdAt:asc',
    'pagination[pageSize]': '50',
  });
  const frSubjects = resBI.fr.data ?? [];
  const enSubjects = resBI.en.data ?? [];
  return frSubjects.map((sFr) => {
    const sEn = enSubjects.find((e) => e.key === sFr.key) ?? sFr;
    return { k: sFr.key, fr: sFr.name, en: sEn.name };
  });
}

export interface TeamMember {
  id: number;
  name: Bilingual;
  role: Bilingual;
  email: string | null;
  emailHref: string | null;
  photoUrl?: string;
}

interface StrapiTeamMember {
  id: number;
  name: string;
  role: string;
  email: string | null;
  photo?: StrapiMedia;
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiTeamMember[] }>('team-members', {
    'populate': 'photo',
    'sort': 'createdAt:asc',
    'pagination[pageSize]': '50',
  });
  const frMembers = resBI.fr.data ?? [];
  const enMembers = resBI.en.data ?? [];
  return frMembers.map((mFr) => {
    const mEn = enMembers.find((e) => e.id === mFr.id) ?? mFr;
    return {
      id: mFr.id,
      name: { fr: mFr.name, en: mEn.name },
      role: { fr: mFr.role, en: mEn.role },
      email: mFr.email ?? null,
      emailHref: mFr.email ? `mailto:${mFr.email}` : null,
      photoUrl: resolveStrapiMediaUrl(mFr.photo),
    };
  });
}

export async function fetchSiteDefaults(): Promise<SiteDefaults> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiSiteSettings }>(
    'site-setting',
    { populate: 'defaultSeoImage' },
  );
  const s = resBI.fr.data;
  const sEn = resBI.en.data;
  return {
    seoTitle: { fr: s.defaultSeoTitle ?? '', en: sEn?.defaultSeoTitle ?? s.defaultSeoTitle ?? '' },
    seoDescription: {
      fr: s.defaultSeoDescription ?? '',
      en: sEn?.defaultSeoDescription ?? s.defaultSeoDescription ?? '',
    },
    seoImageUrl: resolveStrapiMediaUrl(s.defaultSeoImage),
    googleAnalyticsId: s.googleAnalyticsId,
  };
}

// ─── Gallery types & fetchers ──────────────────────────────────────────────

export interface GalleryMedia {
  url: string;
  mime: string;
  alt: string;
}

export interface GalleryProject {
  id: number;
  brand: string;
  cat: string;
  plateau: string;
  year: string;
  tone: 'mono' | 'dark' | 'warm';
  media: GalleryMedia[];
}

export interface GalleryCategory {
  k: string;
  fr: string;
  en: string;
}

function resolveGalleryMediaUrl(m: StrapiMedia): string | undefined {
  if (!m.url) return undefined;
  // Videos must be served as the raw upload; images can use the medium
  // format when available for lighter payloads at the gallery grid scale.
  const isVideo = m.mime?.startsWith('video/');
  const path = isVideo ? m.url : (m.formats?.medium?.url ?? m.url);
  if (path.startsWith('http')) return path;
  return `${STRAPI_URL}${path}`;
}

export async function fetchGalleryProjects(): Promise<GalleryProject[]> {
  // `populate=*` returns every first-level relation with all its scalar
  // attributes — category.slug, brand.name, and the media files with their
  // url/formats. Simpler and more robust than nested populate across the
  // i18n schema transition (EDO-159).
  const res = await fetchStrapi<{ data: StrapiGalleryProject[] }>('gallery-projects', {
    'populate': '*',
    'sort': 'createdAt:asc',
    'pagination[pageSize]': '100',
    'locale': 'fr',
  });

  return res.data.map((p, i) => {
    const media: GalleryMedia[] = (p.media ?? [])
      .map((m) => {
        const url = resolveGalleryMediaUrl(m);
        if (!url) return null;
        return {
          url,
          mime: m.mime ?? '',
          alt: m.alternativeText ?? '',
        };
      })
      .filter((m): m is GalleryMedia => m !== null);
    return {
      id: p.id,
      brand: p.brand?.name ?? '',
      cat: p.category?.slug ?? 'other',
      plateau: p.stage ?? '',
      year: String(p.year),
      tone: TONES[i % 3],
      media,
    };
  });
}

export async function fetchGalleryCategories(): Promise<GalleryCategory[]> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiGalleryCategory[] }>('gallery-categories', {
    'sort': 'createdAt:asc',
  });
  const frCats = resBI.fr.data;
  const enCats = resBI.en.data;
  return frCats.map(cFr => {
    const cEn = enCats.find(e => e.slug === cFr.slug) ?? cFr;
    return { k: cFr.slug, fr: cFr.name, en: cEn.name };
  });
}

// ─── Home Hero (showreel) ──────────────────────────────────────────────────

interface StrapiHomeHero {
  video?: StrapiMedia | null;
  poster?: StrapiMedia[] | null;
}

export interface HomeHeroPoster {
  url: string;
  alt: string;
}

export interface HomeHero {
  videoUrl?: string;
  posters: HomeHeroPoster[];
}

export async function fetchHomeHero(): Promise<HomeHero | null> {
  try {
    const res = await fetchStrapi<{ data: StrapiHomeHero | null }>('home-hero', {
      'populate': 'video,poster',
      'locale': 'fr',
    });
    const data = res?.data;
    if (!data) return null;
    const posters: HomeHeroPoster[] = (data.poster ?? [])
      .map((m) => {
        const url = resolveRawMediaUrl(m);
        if (!url) return null;
        return { url, alt: m.alternativeText ?? '' };
      })
      .filter((p): p is HomeHeroPoster => p !== null);
    return {
      videoUrl: resolveRawMediaUrl(data.video),
      posters,
    };
  } catch {
    return null;
  }
}
