import type { Bilingual, MachineInfo, DiscoveryPost, DiscoveryCategory, SocialLink } from '../types';
import type { BlockNode } from './render-blocks';
import { getPreviewState } from './preview-mode';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'https://cms.e-do.studio';
const STRAPI_TOKEN = import.meta.env.VITE_STRAPI_TOKEN || '';
const STRAPI_PREVIEW_TOKEN = import.meta.env.VITE_STRAPI_PREVIEW_TOKEN || '';
const API_ORIGIN = import.meta.env.DEV ? '' : STRAPI_URL;

// ─── Generic fetcher ────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchStrapi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`/api/${path}`, API_ORIGIN || window.location.origin);
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
  pricingDescription?: string | null;
  specs?: StrapiSpec[];
  usages?: StrapiLocalizedItem[];
  pricingRows?: StrapiPricingRow[];
  operatorPricingRows?: StrapiPricingRow[];
  media?: StrapiMedia[];
  seo?: StrapiSeoMeta;
}

interface StrapiPostProdType {
  id: number;
  title: string;
  slug: string;
  description: string;
  includes?: StrapiLocalizedItem[];
  priceRows?: StrapiPricingRow[];
  media?: StrapiMedia[];
  seo?: StrapiSeoMeta;
}

interface StrapiMedia {
  url: string;
  mime?: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: {
    large?: { url: string };
    medium?: { url: string };
    small?: { url: string };
    thumbnail?: { url: string };
  };
}

interface StrapiBlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body?: string;
  coverMedia?: StrapiMedia;
  // Editorial date set by the editor (independent of Strapi's publish state).
  // `publishedAt` is kept as a fallback for posts that haven't been migrated
  // yet but is no longer authoritative (EDO-256).
  articleDate?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  categories?: { id: number; title: string; slug: string }[];
  featured?: boolean;
  seo?: StrapiSeoMeta;
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
  announcement?: string;
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
  displayOrder?: number | null;
  category?: StrapiGalleryCategory;
  brand?: StrapiGalleryBrand;
  media?: StrapiMedia[];
  embeds?: { url: string; alt?: string }[];
}

// ─── PlateauSpec type (local, matches what the frontend expects) ────────────

export interface SeoMeta {
  title?: string;
  description?: string;
  imageUrl?: string;
  noIndex?: boolean;
}

export type MediaItem =
  | { kind: 'image'; url: string; previewUrl?: string; alt: Bilingual; width?: number; height?: number }
  | { kind: 'video'; url: string; previewUrl?: string; poster?: string; alt: Bilingual; width?: number; height?: number };

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

export type PPSample =
  | { kind: 'image'; url: string; alt: string }
  | { kind: 'video'; url: string; mime: string; alt: string };

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
  samples: PPSample[];
  brands: string[];
  seo?: Bilingual<SeoMeta>;
}

// ─── Transform helpers ──────────────────────────────────────────────────────

// EN fallback dictionary for plateau specs/usages. Mirrors the strings the
// seed script (`strapi/scripts/seed-content.mjs`) installs in both locales,
// so the page renders the correct English copy even when Strapi has not yet
// been redeployed with the EN-translation data migration (EDO-211). Once
// Strapi serves real per-locale rows that differ from FR, this fallback is a
// no-op — we only swap when Strapi's EN value is identical to FR.
const PLATEAU_EN_FALLBACK: Record<string, string> = {
  // Cyclorama / machine spec labels
  'Surface': 'Surface',
  'Dimensions': 'Dimensions',
  'Éclairage naturel': 'Natural light',
  'Accès': 'Access',
  'Extérieur': 'Exterior',
  'Électricité': 'Electricity',
  'Connectivité & son': 'Connectivity & sound',
  'Maquillage': 'Make-up',
  'Habillage': 'Dressing',
  'Cuisine': 'Kitchen',
  'Caméra': 'Camera',
  'Pilotage': 'Control',
  'Éclairage': 'Lighting',
  'Détourage automatique': 'Auto clipping',
  'Formats': 'Formats',
  'Motorisation': 'Motion',
  // Cyclorama spec values
  '240 m² · Cyclo 2 faces 32 m²': '240 m² · 2-sided cyclo 32 m²',
  '6,3m L × 5,2m l × 5m H': '6.3m L × 5.2m W × 5m H',
  'Skydomes occultable': 'Blackout skydomes',
  'Quai de livraison 3,5m L × 4,5m H': 'Loading dock 3.5m L × 4.5m H',
  'Accès direct, parking sur place': 'Direct access, on-site parking',
  '1 prise Marechal 63A triphasée · 15 prises 16A': '1 Marechal 63A 3-phase · 15 × 16A outlets',
  'Wi-Fi très haut débit · Sound system intégré': 'High-speed Wi-Fi · Integrated sound system',
  '2 postes maquillage équipés': '2 equipped make-up stations',
  "2 cabines d'essayage": '2 fitting rooms',
  'Entièrement équipée': 'Fully equipped',
  // Machine spec values
  'Canon EOS R · 24–105 mm motorisé': 'Canon EOS R · 24–105 mm motorized',
  'Canon EOS R · 70–200 mm motorisé': 'Canon EOS R · 70–200 mm motorized',
  'iPad · application intuitive': 'iPad · intuitive app',
  'LED High-CRI continue': 'High-CRI LED continuous',
  'AutoAlpha™': 'AutoAlpha™',
  'JPG · PNG · TIFF · RAW': 'JPG · PNG · TIFF · RAW',
  'JPG · PNG · TIFF · RAW · MP4 · MOV': 'JPG · PNG · TIFF · RAW · MP4 · MOV',
  '4 axes · hauteur · inclinaison · zoom · rotation 360°': '4 axes · height · tilt · zoom · 360° rotation',
  '3 axes · hauteur · inclinaison · zoom': '3 axes · height · tilt · zoom',
  // Cyclorama usages
  'Campagne & éditorial': 'Campaign & editorial',
  'Film publicitaire': 'Advertising film',
  'Packshot & still life': 'Packshot & still life',
};

// FR fallback dictionary for plateau specs/usages. Mirrors PLATEAU_EN_FALLBACK
// in reverse: maps known English spec strings back to their French
// translations. The semi-prod Strapi has English content stored under the FR
// locale's component rows (specs/usages) on machine rows (cyclorama included,
// since EDO-233 merged it into the machines collection), so the raw FR value
// coming from the API still renders as English. Until the data is fixed in
// the CMS, swap any FR-locale string that matches a known English key for its
// French translation. Once Strapi serves real French rows that differ from
// the dictionary keys, this fallback is a no-op (lookup misses).
const PLATEAU_FR_FALLBACK: Record<string, string> = {
  // Cyclorama / machine spec labels (EN → FR)
  'Natural light': 'Éclairage naturel',
  'Access': 'Accès',
  'Exterior': 'Extérieur',
  'Electricity': 'Électricité',
  'Connectivity & sound': 'Connectivité & son',
  'Make-up': 'Maquillage',
  'Dressing': 'Habillage',
  'Kitchen': 'Cuisine',
  'Camera': 'Caméra',
  'Control': 'Pilotage',
  'Lighting': 'Éclairage',
  'Auto clipping': 'Détourage automatique',
  'Motion': 'Motorisation',
  // Cyclorama spec values (EN → FR)
  '240 m² · 2-sided cyclo 32 m²': '240 m² · Cyclo 2 faces 32 m²',
  '240 m² 2-sided cyclo 32 m²': '240 m² · Cyclo 2 faces 32 m²',
  '6.3m L × 5.2m W × 5m H': '6,3m L × 5,2m l × 5m H',
  'Blackout skydomes': 'Skydomes occultable',
  'Loading dock 3.5m L × 4.5m H': 'Quai de livraison 3,5m L × 4,5m H',
  'Direct access, on-site parking': 'Accès direct, parking sur place',
  '1 Marechal 63A 3-phase · 15 × 16A outlets': '1 prise Marechal 63A triphasée · 15 prises 16A',
  '1 Maréchal 63A 3-phase · 15 × 16A outlets': '1 prise Marechal 63A triphasée · 15 prises 16A',
  'High-speed Wi-Fi · Integrated sound system': 'Wi-Fi très haut débit · Sound system intégré',
  '2 equipped make-up stations': '2 postes maquillage équipés',
  '2 fitting rooms': "2 cabines d'essayage",
  'Fully equipped': 'Entièrement équipée',
  // Machine spec values (EN → FR)
  'Canon EOS R · 24–105 mm motorized': 'Canon EOS R · 24–105 mm motorisé',
  'Canon EOS R · 70–200 mm motorized': 'Canon EOS R · 70–200 mm motorisé',
  'iPad · intuitive app': 'iPad · application intuitive',
  'High-CRI LED continuous': 'LED High-CRI continue',
  '4 axes · height · tilt · zoom · 360° rotation': '4 axes · hauteur · inclinaison · zoom · rotation 360°',
  '3 axes · height · tilt · zoom': '3 axes · hauteur · inclinaison · zoom',
  // Cyclorama usages (EN → FR)
  'Campaign & editorial': 'Campagne & éditorial',
  'Advertising film': 'Film publicitaire',
};

function fallbackEn(frValue: string, enValue: string): string {
  if (enValue && enValue !== frValue) return enValue;
  const translated = PLATEAU_EN_FALLBACK[frValue];
  return translated ?? enValue ?? frValue;
}

function fallbackFr(frValue: string, enValue: string): string {
  const translated = PLATEAU_FR_FALLBACK[frValue];
  if (translated) return translated;
  return frValue || enValue;
}

function mergeSpecs(frSpecs: StrapiSpec[], enSpecs: StrapiSpec[]): { k: Bilingual; v: Bilingual }[] {
  const len = Math.max(frSpecs.length, enSpecs.length);
  const result: { k: Bilingual; v: Bilingual }[] = [];
  for (let i = 0; i < len; i++) {
    const fr = frSpecs[i];
    const en = enSpecs[i];
    const frLabel = fr?.label ?? en?.label ?? '';
    const frValue = fr?.value ?? en?.value ?? '';
    const enLabel = en?.label || frLabel;
    const enValue = en?.value || frValue;
    result.push({
      k: { fr: fallbackFr(frLabel, enLabel), en: fallbackEn(frLabel, enLabel) },
      v: { fr: fallbackFr(frValue, enValue), en: fallbackEn(frValue, enValue) },
    });
  }
  return result;
}

function mergeLocalizedItems(frItems: StrapiLocalizedItem[], enItems: StrapiLocalizedItem[]): Bilingual[] {
  const len = Math.max(frItems.length, enItems.length);
  return Array.from({ length: len }, (_, i) => {
    const fr = frItems[i]?.text ?? enItems[i]?.text ?? '';
    const en = enItems[i]?.text || fr;
    return { fr: fallbackFr(fr, en), en: fallbackEn(fr, en) };
  });
}

function mediaListToItems(items: StrapiMedia[] | undefined): MediaItem[] {
  if (!items) return [];
  const out: MediaItem[] = [];
  for (const m of items) {
    const previewUrl = resolveStrapiMediaUrl(m);
    const rawUrl = resolveRawMediaUrl(m);
    const url = rawUrl ?? previewUrl;
    if (!url) continue;
    const alt: Bilingual = { fr: m.alternativeText ?? '', en: m.alternativeText ?? '' };
    const width = m.width ?? undefined;
    const height = m.height ?? undefined;
    if (m.mime?.startsWith('video/')) {
      out.push({ kind: 'video', url, previewUrl, alt, width, height });
    } else {
      out.push({ kind: 'image', url, previewUrl, alt, width, height });
    }
  }
  return out;
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
    const fr = frRows[i] ?? enRows[i];
    const en = enRows[i] ?? fr;
    if (!fr) continue;
    const frLabel = fr.label ?? en?.label ?? '';
    rates.push({
      k: { fr: frLabel, en: en?.label || frLabel },
      v: formatRowAmount(fr, onRequest),
    });
  }
  return rates;
}

// Fallback `specs` per slug. Mirrors `MACHINE_USES` below: used when the
// Strapi entry has no specs component rows. EDO-254 hit this on the
// restored cyclorama row (the legacy single-type schema never carried a
// `specs` field, so PR #280's restore migration couldn't copy them).
// Backfill migration `2026.05.27T14.00.00.machines-backfill-cyclorama-specs.js`
// repopulates the DB so editors own the data; this fallback covers the
// window before that migration runs on each environment and shields the
// page from a future drop of the same data.
const MACHINE_SPECS: Record<string, { k: Bilingual; v: Bilingual }[]> = {
  cyclorama: [
    { k: { fr: 'Surface', en: 'Surface' }, v: { fr: '240 m² · Cyclo 2 faces 32 m²', en: '240 m² · 2-sided cyclo 32 m²' } },
    { k: { fr: 'Dimensions', en: 'Dimensions' }, v: { fr: '6,3m L × 5,2m l × 5m H', en: '6.3m L × 5.2m W × 5m H' } },
    { k: { fr: 'Éclairage naturel', en: 'Natural light' }, v: { fr: 'Skydomes occultable', en: 'Blackout skydomes' } },
    { k: { fr: 'Accès', en: 'Access' }, v: { fr: 'Quai de livraison 3,5m L × 4,5m H', en: 'Loading dock 3.5m L × 4.5m H' } },
    { k: { fr: 'Extérieur', en: 'Exterior' }, v: { fr: 'Accès direct, parking sur place', en: 'Direct access, on-site parking' } },
    { k: { fr: 'Électricité', en: 'Electricity' }, v: { fr: '1 prise Marechal 63A triphasée · 15 prises 16A', en: '1 Marechal 63A 3-phase · 15 × 16A outlets' } },
    { k: { fr: 'Connectivité & son', en: 'Connectivity & sound' }, v: { fr: 'Wi-Fi très haut débit · Sound system intégré', en: 'High-speed Wi-Fi · Integrated sound system' } },
    { k: { fr: 'Maquillage', en: 'Make-up' }, v: { fr: '2 postes maquillage équipés', en: '2 equipped make-up stations' } },
    { k: { fr: 'Habillage', en: 'Dressing' }, v: { fr: "2 cabines d'essayage", en: '2 fitting rooms' } },
    { k: { fr: 'Cuisine', en: 'Kitchen' }, v: { fr: 'Entièrement équipée', en: 'Fully equipped' } },
  ],
};

// Fallback `usages` per slug. Used when the Strapi entry has no usages
// component rows (e.g. on a fresh install before editors fill them in).
// Once the cyclorama Machine row carries its own usages from Strapi, the
// fallback for that slug is silently superseded.
const MACHINE_USES: Record<string, Bilingual[]> = {
  cyclorama: [
    { fr: 'Campagne & éditorial', en: 'Campaign & editorial' },
    { fr: 'Film publicitaire', en: 'Advertising film' },
    { fr: 'Packshot & still life', en: 'Packshot & still life' },
  ],
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

// Stable display order on every plateau-aware page. Cyclorama goes first;
// the rest follows the studio's standard ordering (live → eclipse → packshot
// stages). Any machine slug not listed falls in afterwards in API order.
const PLATEAU_ORDER = ['cyclorama', 'live', 'eclipse', 'horizontal', 'vertical'];

function sortByPlateauOrder<T extends { slug: string }>(rows: T[]): T[] {
  const indexOf = (slug: string) => {
    const i = PLATEAU_ORDER.indexOf(slug);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  return [...rows].sort((a, b) => indexOf(a.slug) - indexOf(b.slug));
}

export async function fetchPlateaux(): Promise<Record<string, PlateauSpec>> {
  const machinesBI = await fetchStrapiBilingual<{ data: StrapiMachine[] }>('machines', {
    'populate': 'specs,usages,pricingRows,seo,seo.image,media',
    'sort': 'createdAt:asc',
  });

  const machinesFr = sortByPlateauOrder(machinesBI.fr.data);
  const machinesEn = machinesBI.en.data;
  const result: Record<string, PlateauSpec> = {};
  // Post-EDO-233 (PR #265): the cyclorama single-type was merged into the
  // `machines` collection and is now expected to appear here as the row with
  // `slug='cyclorama'` (sorted first by PLATEAU_ORDER). The historical
  // EDO-241 invariant ("machines must not carry a cyclorama row") is
  // intentionally reversed — its absence now means the page won't render.
  machinesFr.forEach((mFr, i) => {
    const mEn = machinesEn.find(e => e.slug === mFr.slug) ?? mFr;
    const rates = pricingRowsToRates(mFr.pricingRows ?? [], mEn.pricingRows ?? []);
    const uses = mFr.usages && mFr.usages.length > 0
      ? mergeLocalizedItems(mFr.usages, mEn.usages ?? mFr.usages)
      : (MACHINE_USES[mFr.slug] ?? []);
    const specs = mFr.specs && mFr.specs.length > 0
      ? mergeSpecs(mFr.specs, mEn.specs ?? mFr.specs)
      : (MACHINE_SPECS[mFr.slug] ?? []);
    const noteFr = mFr.pricingDescription;
    const noteEn = mEn.pricingDescription ?? noteFr;
    const ratesNote = noteFr ? { fr: noteFr, en: noteEn ?? noteFr } : undefined;
    result[mFr.slug] = {
      num: String(i + 1).padStart(2, '0'),
      name: mFr.title,
      slug: mFr.slug,
      tagline: { fr: mFr.subtitle, en: mEn.subtitle },
      desc: { fr: mFr.description, en: mEn.description },
      specs,
      uses,
      rates,
      ratesNote,
      visual: mFr.slug === 'cyclorama' ? 'cyc' : mFr.slug,
      media: mediaListToItems(mFr.media),
      seo: buildSeo(mFr.seo, mEn.seo),
    };
  });

  return result;
}

export async function fetchMachines(): Promise<MachineInfo[]> {
  const machinesBI = await fetchStrapiBilingual<{ data: StrapiMachine[] }>('machines', {
    'sort': 'createdAt:asc',
  });

  const machinesFr = sortByPlateauOrder(machinesBI.fr.data);
  const machinesEn = machinesBI.en.data;
  return machinesFr.map((mFr) => {
    const mEn = machinesEn.find(e => e.slug === mFr.slug) ?? mFr;
    return {
      slug: mFr.slug,
      fr: { t: mFr.title, sub: mFr.subtitle, label: MACHINE_LABELS[mFr.slug]?.fr },
      en: { t: mEn.title, sub: mEn.subtitle, label: MACHINE_LABELS[mFr.slug]?.en },
    };
  });
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
    const price: PPPrice = firstRow
      ? priceFromRow(firstRow)
      : { amount: '', from: false, kind: 'unit' };
    // `media` is non-i18n: the FR locale is the source of truth. The schema
    // allows both images and videos — preserve the kind so the gallery can
    // render `<video>` for clips and `<img>` for stills (EDO-222).
    const samples: PPSample[] = (tFr.media ?? [])
      .map((m): PPSample | null => {
        const alt = m.alternativeText ?? '';
        if (m.mime?.startsWith('video/')) {
          const url = resolveRawMediaUrl(m);
          if (!url) return null;
          return { kind: 'video', url, mime: m.mime, alt };
        }
        const url = resolveStrapiMediaUrl(m);
        if (!url) return null;
        return { kind: 'image', url, alt };
      })
      .filter((s): s is PPSample => s !== null);
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

// Strapi 5 generates responsive derivatives for every uploaded image, written
// to the same bucket as `<variant>_<original>.<ext>` (thumbnail 245w, small
// 500w, medium 750w, large 1000w). `coverUrl`/`previewUrl` strings reaching
// the UI may already be one of these variants — strip the prefix to recover
// the stem, then synthesize the full srcset.
const STRAPI_FORMAT_PREFIXES = ['large_', 'medium_', 'small_', 'thumbnail_'] as const;

function splitVariantUrl(url: string): { dir: string; stem: string; query: string } | null {
  const m = url.match(/^(.*\/)([^/?#]+\.(?:jpg|jpeg|png|webp|avif))(\?.*)?$/i);
  if (!m) return null;
  const [, dir, filename, query = ''] = m;
  let stem = filename;
  for (const prefix of STRAPI_FORMAT_PREFIXES) {
    if (filename.startsWith(prefix)) {
      stem = filename.slice(prefix.length);
      break;
    }
  }
  return { dir, stem, query };
}

// Build a `srcset` covering thumbnail/small/medium/large for a Strapi-served
// image URL. Returns `undefined` for URLs that don't match (SVG, external,
// unrecognized extension) so the caller can skip the attribute entirely.
export function buildStrapiSrcset(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const parts = splitVariantUrl(url);
  if (!parts) return undefined;
  const { dir, stem, query } = parts;
  return [
    `${dir}thumbnail_${stem}${query} 245w`,
    `${dir}small_${stem}${query} 500w`,
    `${dir}medium_${stem}${query} 750w`,
    `${dir}large_${stem}${query} 1000w`,
  ].join(', ');
}

// Largest derivative (`large_*`, ~1000px wide, typically 30–60 KB) used as
// the default `src`. Falls back to the input URL when the pattern doesn't
// match — preserves behaviour for non-Strapi assets.
export function getStrapiLargeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const parts = splitVariantUrl(url);
  if (!parts) return url;
  const { dir, stem, query } = parts;
  return `${dir}large_${stem}${query}`;
}

function mapBlogPostToDiscovery(pFr: StrapiBlogPost, pEn: StrapiBlogPost, tone: 'warm' | 'mono' | 'dark'): DiscoveryPost {
  const catFr = pFr.categories?.[0];
  const catEn = pEn.categories?.[0];
  const bodyFr = pFr.body ?? '';
  const bodyEn = pEn.body ?? '';
  const readingTime = estimateReadingTime(bodyFr || bodyEn);
  const displayDate = pFr.articleDate ?? pFr.publishedAt ?? '';
  const seo = buildSeo(pFr.seo, pEn.seo);
  return {
    id: pFr.id,
    slug: pFr.slug,
    cat: catFr?.slug ?? 'tips',
    tone,
    tag: { fr: catFr?.title ?? 'Tips', en: catEn?.title ?? 'Tips' },
    title: { fr: pFr.title, en: pEn.title },
    sub: { fr: pFr.excerpt, en: pEn.excerpt },
    body: { fr: bodyFr, en: bodyEn },
    date: formatStrapiDate(displayDate),
    read: `${readingTime} min`,
    author: 'Studio',
    coverUrl: resolveStrapiMediaUrl(pFr.coverMedia),
    coverMime: pFr.coverMedia?.mime,
    publishedAt: pFr.publishedAt ?? undefined,
    featured: pFr.featured ?? false,
    seo,
  };
}

export async function fetchDiscoveryPosts(): Promise<DiscoveryPost[]> {
  // Sort server-side on `createdAt` (always present, always sortable) and
  // re-sort by editorial `articleDate` below — sorting on `articleDate`
  // server-side fails with 400 on envs where the schema rename (EDO-256)
  // hadn't propagated yet, and a single 400 wipes the whole discovery page.
  const resBI = await fetchStrapiBilingual<{ data: StrapiBlogPost[] }>('blog-posts', {
    'populate': 'categories,coverMedia,seo,seo.image',
    'sort': 'createdAt:desc',
    'pagination[pageSize]': '50',
  });

  function sortKey(p: StrapiBlogPost): number {
    const raw = p.articleDate ?? p.publishedAt ?? p.createdAt ?? '';
    const t = raw ? Date.parse(raw) : NaN;
    return Number.isNaN(t) ? 0 : t;
  }
  const frPosts = [...resBI.fr.data].sort((a, b) => sortKey(b) - sortKey(a));
  const enPosts = resBI.en.data;

  return frPosts.map((pFr, i) => {
    const pEn = enPosts.find(e => e.slug === pFr.slug) ?? pFr;
    return mapBlogPostToDiscovery(pFr, pEn, TONES[i % 3]);
  });
}

export async function fetchDiscoveryPost(slug: string): Promise<DiscoveryPost | null> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiBlogPost[] }>('blog-posts', {
    'populate': 'categories,coverMedia,seo,seo.image',
    'filters[slug][$eq]': slug,
    'pagination[pageSize]': '1',
  });
  const pFr = resBI.fr.data[0];
  if (!pFr) return null;
  const pEn = resBI.en.data.find(e => e.slug === pFr.slug) ?? pFr;
  return mapBlogPostToDiscovery(pFr, pEn, TONES[0]);
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
  address: { street: string; zip: string; city: string; postalCode: string; country?: string; complement?: string };
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
  const complement = addr?.complement ?? undefined;
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
      complement: complement || undefined,
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

// Strapi sometimes stores the legacy `hours` / `weekendHours` strings with a
// day prefix baked in (e.g. "Lun-Ven 10:00-18:00", "Sam-Dim sur demande"). The
// rail already prints the day range as the row label, so trim that prefix so
// the value column doesn't echo it back.
function stripLeadingDayPrefix(value: string): string {
  if (!value) return value;
  return value
    .replace(/^([A-Za-zéèêàâîïôûç]{2,})\s*[-–—]\s*([A-Za-zéèêàâîïôûç]{2,})\s+/i, '')
    .trim();
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
  const weekdayFr = stripLeadingDayPrefix(fr.hours ?? '');
  const weekdayEn = stripLeadingDayPrefix(en?.hours ?? fr.hours ?? '');
  const weekendFr = stripLeadingDayPrefix(fr.weekendHours ?? '');
  const weekendEn = stripLeadingDayPrefix(en?.weekendHours ?? fr.weekendHours ?? '');
  return {
    weekday: { fr: weekdayFr, en: weekdayEn },
    weekend: { fr: weekendFr, en: weekendEn },
  };
}

// Editorial announcement shown next to the studio hours on the home header
// (e.g. "Studio climatisé"). Localized scalar on site-setting; empty = hidden.
export async function fetchAnnouncement(): Promise<Bilingual> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiSiteSettings }>('site-setting');
  return {
    fr: resBI.fr.data.announcement ?? '',
    en: resBI.en.data.announcement ?? '',
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

  // Pick the most recent lastUpdatedAt per document, and track which docs have content.
  const updatedByDoc = new Map<LegalDocumentKey, string>();
  const docsWithContent = new Set<LegalDocumentKey>();
  for (const s of frSections) {
    docsWithContent.add(s.documentKey);
    const existing = updatedByDoc.get(s.documentKey);
    if (!existing || (s.lastUpdatedAt && s.lastUpdatedAt > existing)) {
      updatedByDoc.set(s.documentKey, s.lastUpdatedAt ?? existing ?? '');
    }
  }

  return LEGAL_DOCUMENT_ORDER.filter((k) => docsWithContent.has(k)).map((k) => ({
    k,
    fr: LEGAL_DOCUMENT_LABELS[k].fr,
    en: LEGAL_DOCUMENT_LABELS[k].en,
    updated: formatLastUpdated(updatedByDoc.get(k)),
  }));
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
  kind: 'image' | 'video' | 'embed';
  url: string;
  previewUrl?: string;
  alt: string;
  mime?: string;
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

function absoluteMediaUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${STRAPI_URL}${path}`;
}

// Cappasity 360° viewers ship with branding, UI chrome and a click-to-start
// overlay by default. Apply our house look (clean, auto-rotating, no logo) to
// any Cappasity embed so editors can paste the bare `/embedded` URL. A param
// explicitly set in the CMS URL always wins (per-packshot override).
const CAPPASITY_EMBED_DEFAULTS: Record<string, string> = {
  autorun: '1',
  autorotate: '1',
  logo: '0',
  arbutton: '0',
  closebutton: '0',
  hidehints: '1',
  hidefullscreen: '1',
  hideautorotateopt: '1',
  hidesettingsbtn: '1',
  hidezoomopt: '1',
  enableimagezoom: '1',
  analytics: '0',
};

function normalizeEmbedUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (!url.hostname.endsWith('cappasity.com')) return raw;
  for (const [k, v] of Object.entries(CAPPASITY_EMBED_DEFAULTS)) {
    if (!url.searchParams.has(k)) url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function fetchGalleryProjects(): Promise<GalleryProject[]> {
  // `populate=*` returns every first-level relation with all its scalar
  // attributes — category.slug, brand.name, and the media files with their
  // url/formats. Simpler and more robust than nested populate across the
  // i18n schema transition (EDO-159).
  // Sort server-side on `createdAt` (always present) and re-sort by the
  // editorial `displayOrder` below — sorting on `displayOrder` server-side
  // 400s on any env where the schema field hasn't propagated yet, and a single
  // 400 wipes the whole gallery (same precaution as `fetchDiscoveryPosts`).
  const res = await fetchStrapi<{ data: StrapiGalleryProject[] }>('gallery-projects', {
    'populate': '*',
    'sort': 'createdAt:asc',
    'pagination[pageSize]': '100',
    'locale': 'fr',
  });

  const ordered = [...res.data].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  return ordered.map((p, i) => {
    const files: GalleryMedia[] = (p.media ?? [])
      .map((m): GalleryMedia | null => {
        if (!m.url) return null;
        // Videos must be served raw. For images, expose the original as `url`
        // (used by the lightbox at full size) and the `medium` derivative as
        // `previewUrl` (used by the grid thumbnails to keep payloads light).
        const isVideo = m.mime?.startsWith('video/');
        const rawUrl = absoluteMediaUrl(m.url);
        const mediumPath = m.formats?.medium?.url;
        const previewUrl = !isVideo && mediumPath ? absoluteMediaUrl(mediumPath) : undefined;
        return {
          kind: isVideo ? 'video' : 'image',
          url: rawUrl,
          previewUrl,
          mime: m.mime ?? '',
          alt: m.alternativeText ?? '',
        };
      })
      .filter((m): m is GalleryMedia => m !== null);
    // Iframe embeds (360° packshots) follow the uploaded files in slot order.
    const embeds: GalleryMedia[] = (p.embeds ?? [])
      .filter((e) => !!e.url)
      .map((e) => ({ kind: 'embed', url: normalizeEmbedUrl(e.url), alt: e.alt ?? '' }));
    const media: GalleryMedia[] = [...files, ...embeds];
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
