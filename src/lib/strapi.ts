import type { Bilingual, MachineInfo, DiscoveryPost, DiscoveryCategory, SocialLink } from '../types';
import type { BlockNode } from './render-blocks';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'https://cms.e-do.studio';

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

  const key = url.toString();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data as T;

  const res = await fetch(key);
  if (!res.ok) throw new Error(`Strapi ${path}: ${res.status}`);
  const json = await res.json();
  cache.set(key, { data: json, ts: Date.now() });
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
}

interface StrapiCyclorama {
  title: string;
  subtitle: string;
  description: string;
  pricing: string;
  pricingDescription: string;
  specs?: StrapiSpec[];
  amenities?: StrapiLocalizedItem[];
  pricingRows?: StrapiPricingRow[];
}

interface StrapiPostProdType {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: string;
  includes?: StrapiLocalizedItem[];
  priceRows?: StrapiPricingRow[];
}

interface StrapiMedia {
  url: string;
  formats?: {
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
  rank: number;
}

type StageKey = 'live' | 'eclipse' | 'horizontal' | 'vertical' | 'cyclorama';

interface StrapiGalleryProject {
  id: number;
  title: string;
  slug: string;
  stage: string;
  stageKey?: StageKey | null;
  year: number | string;
  rank: number;
  category?: StrapiGalleryCategory;
  brand?: StrapiGalleryBrand;
  images?: StrapiMedia[];
}

// ─── PlateauSpec type (local, matches what the frontend expects) ────────────

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

// ─── Fallback plateau data (used when Strapi content types unavailable) ─────

const FALLBACK_PLATEAUX: Record<string, PlateauSpec> = {
  cyclorama: {
    num: '01', name: 'Cyclorama', slug: 'cyclorama',
    tagline: { fr: 'Production libre', en: 'Free production' },
    desc: {
      fr: "Cyclo 2 faces de 30 m² pour photo et vidéo sur fond blanc infini. À la journée ou à la semaine, en production libre ou avec notre équipe.",
      en: "30 m² 2-sided cyclorama for photo and video on an infinite white background. Daily or weekly, as a free-production rental or crewed.",
    },
    specs: [
      { k: { fr: 'Surface', en: 'Surface' }, v: { fr: '240 m² · Cyclo 2 faces 32 m²', en: '240 m² · 2-sided cyclo 32 m²' } },
      { k: { fr: 'Dimensions', en: 'Dimensions' }, v: { fr: '6,3m L x 5,2m l x 5m H', en: '6.3m L × 5.2m W × 5m H' } },
      { k: { fr: 'Éclairage naturel', en: 'Natural light' }, v: { fr: 'Skydomes occultable', en: 'Blackout skydomes' } },
      { k: { fr: 'Accès', en: 'Access' }, v: { fr: 'Quai de livraison 3,5m L × 4,5m H', en: 'Loading dock 3.5m L × 4.5m H' } },
      { k: { fr: 'Extérieur', en: 'Exterior' }, v: { fr: 'Accès direct, parking sur place', en: 'Direct access, on-site parking' } },
      { k: { fr: 'Électricité', en: 'Electricity' }, v: { fr: '1 prise Marechal 63A triphasée · 15 prises 16A', en: '1 Marechal 63A 3-phase · 15 × 16A outlets' } },
      { k: { fr: 'Connectivité & son', en: 'Connectivity & sound' }, v: { fr: 'Wi-Fi très haut débit · Sound system intégré', en: 'High-speed Wi-Fi · Integrated sound system' } },
      { k: { fr: 'Maquillage', en: 'Make-up' }, v: { fr: '2 postes maquillage équipés', en: '2 equipped make-up stations' } },
      { k: { fr: 'Habillage', en: 'Dressing' }, v: { fr: "2 cabines d'essayage", en: '2 fitting rooms' } },
      { k: { fr: 'Cuisine', en: 'Kitchen' }, v: { fr: 'Entièrement équipée', en: 'Fully equipped' } },
    ],
    uses: [
      { fr: 'Campagne & éditorial', en: 'Campaign & editorial' },
      { fr: 'Film publicitaire', en: 'Advertising film' },
      { fr: 'Packshot & still life', en: 'Packshot & still life' },
    ],
    rates: [
      { k: { fr: '5h', en: '5 hours' }, v: '€ 650' },
      { k: { fr: '10h', en: '10 hours' }, v: '€ 880' },
      { k: { fr: '10h éditorial', en: '10 hours editorial' }, v: { fr: 'Sur demande', en: 'On request' } },
    ],
    ratesNote: { fr: 'Remise en blanc 110 € · Électricité 1,40 €/kWh', en: 'Repaint 110 € · Electricity 1.40 €/kWh' },
    visual: 'cyc',
  },
  horizontal: {
    num: '02', name: 'Horizontal', slug: 'horizontal',
    tagline: { fr: 'Packshots à plat', en: 'Flat packshots' },
    desc: {
      fr: "L'Horizontal est conçue pour les packshots à plat : flat lays précis et cohérents, adaptés aux vêtements, accessoires ou compositions produits.",
      en: "The Horizontal is built for flat packshots — precise, consistent flat lays for apparel, accessories and product compositions.",
    },
    specs: [
      { k: { fr: 'Caméra', en: 'Camera' }, v: { fr: 'Canon EOS R · 24–105 mm motorisé', en: 'Canon EOS R · 24–105 mm motorized' } },
      { k: { fr: 'Pilotage', en: 'Control' }, v: { fr: 'iPad · application intuitive', en: 'iPad · intuitive app' } },
      { k: { fr: 'Éclairage', en: 'Lighting' }, v: { fr: 'LED High-CRI continue', en: 'High-CRI LED continuous' } },
      { k: { fr: 'Détourage automatique', en: 'Auto clipping' }, v: { fr: 'AutoAlpha™', en: 'AutoAlpha™' } },
      { k: { fr: 'Formats', en: 'Formats' }, v: { fr: 'JPG · PNG · TIFF · RAW', en: 'JPG · PNG · TIFF · RAW' } },
    ],
    uses: [
      { fr: 'Prêt-à-porter à plat', en: 'Flat-laid ready-to-wear' },
      { fr: 'Compositions produits', en: 'Product compositions' },
      { fr: 'Détourage automatique', en: 'Automatic clipping' },
    ],
    rates: [
      { k: { fr: '1 heure', en: '1 hour' }, v: '€ 120' },
      { k: { fr: 'Demi-journée', en: 'Half day' }, v: '€ 410' },
      { k: { fr: 'Journée', en: 'Full day' }, v: '€ 740' },
    ],
    visual: 'horizontal',
  },
  vertical: {
    num: '03', name: 'Vertical', slug: 'vertical',
    tagline: { fr: 'Mannequin ghost', en: 'Ghost mannequin' },
    desc: {
      fr: "La Vertical est pensée pour les packshots textiles, particulièrement efficace pour le ghost, le piqué et les prises de vue e-commerce standardisées.",
      en: "The Vertical is built for textile packshots — particularly effective for ghost, hanging and standardized e-commerce shots.",
    },
    specs: [
      { k: { fr: 'Caméra', en: 'Camera' }, v: { fr: 'Canon EOS R · 70–200 mm motorisé', en: 'Canon EOS R · 70–200 mm motorized' } },
      { k: { fr: 'Pilotage', en: 'Control' }, v: { fr: 'iPad · application intuitive', en: 'iPad · intuitive app' } },
      { k: { fr: 'Éclairage', en: 'Lighting' }, v: { fr: 'LED High-CRI continue', en: 'High-CRI LED continuous' } },
      { k: { fr: 'Détourage automatique', en: 'Auto clipping' }, v: { fr: 'AutoAlpha™', en: 'AutoAlpha™' } },
      { k: { fr: 'Formats', en: 'Formats' }, v: { fr: 'JPG · PNG · TIFF · RAW', en: 'JPG · PNG · TIFF · RAW' } },
    ],
    uses: [
      { fr: 'Ghost', en: 'Ghost' },
      { fr: 'Piqué', en: 'Piqué' },
      { fr: 'Détourage automatique', en: 'Automatic clipping' },
    ],
    rates: [
      { k: { fr: '1 heure', en: '1 hour' }, v: '€ 120' },
      { k: { fr: 'Demi-journée', en: 'Half day' }, v: '€ 410' },
      { k: { fr: 'Journée', en: 'Full day' }, v: '€ 740' },
    ],
    visual: 'vertical',
  },
  eclipse: {
    num: '04', name: 'Eclipse', slug: 'eclipse',
    tagline: { fr: 'Photo & vidéo 360°', en: 'Photo & video 360°' },
    desc: {
      fr: "L'Eclipse est conçue pour les produits petits et moyens : chaussures, sacs, accessoires, objets design ou beauté, avec plateau tournant intégré pour le 360°.",
      en: "The Eclipse is built for small and medium products — shoes, bags, accessories, design and beauty — with an integrated turntable for 360° shots.",
    },
    specs: [
      { k: { fr: 'Caméra', en: 'Camera' }, v: { fr: 'Canon EOS R · 24–105 mm motorisé', en: 'Canon EOS R · 24–105 mm motorized' } },
      { k: { fr: 'Pilotage', en: 'Control' }, v: { fr: 'iPad · application intuitive', en: 'iPad · intuitive app' } },
      { k: { fr: 'Motorisation', en: 'Motion' }, v: { fr: '4 axes · hauteur · inclinaison · zoom · rotation 360°', en: '4 axes · height · tilt · zoom · 360° rotation' } },
      { k: { fr: 'Éclairage', en: 'Lighting' }, v: { fr: 'LED High-CRI continue', en: 'High-CRI LED continuous' } },
      { k: { fr: 'Formats', en: 'Formats' }, v: { fr: 'JPG · PNG · TIFF · RAW · MP4 · MOV', en: 'JPG · PNG · TIFF · RAW · MP4 · MOV' } },
    ],
    uses: [
      { fr: 'Photo & vidéo e-commerce', en: 'E-commerce photo & video' },
      { fr: 'Still life', en: 'Still life' },
      { fr: 'Accessoires, chaussures & beauté', en: 'Accessories, footwear & beauty' },
    ],
    rates: [
      { k: { fr: '1 heure', en: '1 hour' }, v: '€ 160' },
      { k: { fr: 'Demi-journée', en: 'Half day' }, v: '€ 560' },
      { k: { fr: 'Journée', en: 'Full day' }, v: '€ 990' },
    ],
    visual: 'eclipse',
  },
  live: {
    num: '05', name: 'Live', slug: 'live',
    tagline: { fr: 'Shooting porté', en: 'On-model shooting' },
    desc: {
      fr: "La Live est notre solution dédiée au shooting sur modèle. Elle produit un contenu e-commerce cohérent, rapide et reproductible d'une session à l'autre.",
      en: "The Live is our dedicated on-model shooting solution — consistent e-commerce content, fast to produce and easy to reproduce across sessions.",
    },
    specs: [
      { k: { fr: 'Caméra', en: 'Camera' }, v: { fr: 'Canon EOS R · 24–105 mm motorisé', en: 'Canon EOS R · 24–105 mm motorized' } },
      { k: { fr: 'Pilotage', en: 'Control' }, v: { fr: 'iPad · application intuitive', en: 'iPad · intuitive app' } },
      { k: { fr: 'Motorisation', en: 'Motion' }, v: { fr: '3 axes · hauteur · inclinaison · zoom', en: '3 axes · height · tilt · zoom' } },
      { k: { fr: 'Éclairage', en: 'Lighting' }, v: { fr: 'LED High-CRI continue', en: 'High-CRI LED continuous' } },
      { k: { fr: 'Formats', en: 'Formats' }, v: { fr: 'JPG · PNG · TIFF · RAW · MP4 · MOV', en: 'JPG · PNG · TIFF · RAW · MP4 · MOV' } },
    ],
    uses: [
      { fr: 'Shooting porté', en: 'On-model shooting' },
      { fr: 'Photo & vidéo e-commerce', en: 'E-commerce photo & video' },
      { fr: 'Lookbooks & linesheets', en: 'Lookbooks & linesheets' },
    ],
    rates: [
      { k: { fr: '1 heure', en: '1 hour' }, v: '€ 185' },
      { k: { fr: 'Demi-journée', en: 'Half day' }, v: '€ 620' },
      { k: { fr: 'Journée', en: 'Full day' }, v: '€ 1 120' },
    ],
    visual: 'live',
  },
};

const FALLBACK_MACHINES: MachineInfo[] = [
  { slug: 'cyclorama', fr: { t: 'Cyclorama', sub: 'Production libre', label: '30 m² — Broncolor' }, en: { t: 'Cyclorama', sub: 'Free production', label: '30 m² — Broncolor' } },
  { slug: 'horizontal', fr: { t: 'Horizontal', sub: 'Packshots à plat', label: 'Packshot horizontal' }, en: { t: 'Horizontal', sub: 'Flat packshots', label: 'Horizontal packshot' } },
  { slug: 'vertical', fr: { t: 'Vertical', sub: 'Mannequin ghost', label: 'Pleine hauteur' }, en: { t: 'Vertical', sub: 'Ghost mannequin', label: 'Full height' } },
  { slug: 'eclipse', fr: { t: 'Eclipse', sub: 'Chaussures et accessoires', label: 'Éclipse 360°' }, en: { t: 'Eclipse', sub: 'Shoes & accessories', label: 'Eclipse 360°' } },
  { slug: 'live', fr: { t: 'Live', sub: 'Shooting porté', label: 'Diffusion live' }, en: { t: 'Live', sub: 'On-model shooting', label: 'Live broadcast' } },
];

// ─── Data fetchers ──────────────────────────────────────────────────────────

export async function fetchPlateaux(): Promise<Record<string, PlateauSpec>> {
  try {
    const [machinesBI, cycloBI] = await Promise.all([
      fetchStrapiBilingual<{ data: StrapiMachine[] }>('machines', { 'populate': 'specs,pricingRows', 'sort': 'rank:asc' }),
      fetchStrapiBilingual<{ data: StrapiCyclorama }>('cyclorama', { 'populate': 'specs,amenities,pricingRows' }),
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
        uses: mergeLocalizedItems(cycFr.amenities ?? [], cycEn?.amenities ?? []),
        rates,
        ratesNote: cycFr.pricingDescription ? { fr: cycFr.pricingDescription, en: cycEn?.pricingDescription ?? cycFr.pricingDescription } : undefined,
        visual: 'cyc',
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
      };
    });

    if (Object.keys(result).length > 0) return result;
  } catch {
    // Strapi machine/cyclorama content types not available yet
  }
  return FALLBACK_PLATEAUX;
}

export async function fetchMachines(): Promise<MachineInfo[]> {
  try {
    const [machinesBI, cycloBI] = await Promise.all([
      fetchStrapiBilingual<{ data: StrapiMachine[] }>('machines', { 'sort': 'rank:asc' }),
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

    if (list.length > 0) return list;
  } catch {
    // Strapi machine/cyclorama content types not available yet
  }
  return FALLBACK_MACHINES;
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
    'populate': 'includes,priceRows',
    'sort': 'rank:asc',
  });

  const frTypes = resBI.fr.data;
  const enTypes = resBI.en.data;

  return frTypes.map(tFr => {
    const tEn = enTypes.find(e => e.slug === tFr.slug) ?? tFr;
    const firstRow = tFr.priceRows?.[0];
    const price = firstRow ? priceFromRow(firstRow) : parsePriceText(tFr.price);
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
      samples: [],
      brands: [],
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

function resolveStrapiMediaUrl(media?: StrapiMedia): string | undefined {
  if (!media?.url) return undefined;
  const path = media.formats?.medium?.url ?? media.url;
  if (path.startsWith('http')) return path;
  return `${STRAPI_URL}${path}`;
}

export async function fetchDiscoveryPosts(): Promise<DiscoveryPost[]> {
  const resBI = await fetchStrapiBilingual<{ data: StrapiBlogPost[] }>('blog-posts', {
    'populate': 'categories,coverImage',
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
    const readingTime = estimateReadingTime(bodyFr || bodyEn);
    return {
      id: pFr.id,
      cat: catFr?.slug ?? 'tips',
      tone: TONES[i % 3],
      tag: { fr: catFr?.title ?? 'Tips', en: catEn?.title ?? 'Tips' },
      title: { fr: pFr.title, en: pEn.title },
      sub: { fr: pFr.excerpt, en: pEn.excerpt },
      body: { fr: bodyFr, en: bodyEn },
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

export async function fetchBrands(): Promise<string[]> {
  const res = await fetchStrapi<{ data: StrapiGalleryBrand[] }>('gallery-brands', {
    'sort': 'rank:asc',
    'pagination[pageSize]': '50',
  });
  return res.data.map(b => b.name);
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

const FALLBACK_BUSINESS_INFO: SiteBusinessInfo = {
  currency: 'EUR',
  closures: [],
};

export async function fetchSiteBusinessInfo(): Promise<SiteBusinessInfo> {
  try {
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
  } catch {
    return FALLBACK_BUSINESS_INFO;
  }
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
  rank?: number;
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
      'sort': 'rank:asc',
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

const FALLBACK_LEGAL_DOCUMENTS: LegalDocumentMeta[] = [
  { k: 'mentions', fr: 'Mentions légales', en: 'Legal notice', updated: '12.2024' },
  { k: 'cgv', fr: 'Conditions de vente', en: 'Terms of sale', updated: '05.12.2024' },
  { k: 'cgu', fr: "Conditions d'utilisation", en: 'Terms of use', updated: '05.12.2024' },
  { k: 'privacy', fr: 'Confidentialité', en: 'Privacy policy', updated: '12.2024' },
  { k: 'cookies', fr: 'Cookies', en: 'Cookies', updated: '12.2024' },
];

function formatLastUpdated(iso?: string): string {
  if (!iso) return '';
  // Display as MM.YYYY for compactness, matching the existing hardcoded format.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export async function fetchLegalDocuments(): Promise<LegalDocumentMeta[]> {
  try {
    const resBI = await fetchStrapiBilingual<{ data: StrapiLegalSection[] }>('legal-sections', {
      'sort': 'rank:asc',
      'pagination[pageSize]': '200',
    });
    const frSections = resBI.fr.data ?? [];
    const enSections = resBI.en.data ?? [];
    if (frSections.length === 0) return FALLBACK_LEGAL_DOCUMENTS;

    // Group by documentKey and pick the most recent lastUpdatedAt for the badge.
    const byDoc = new Map<LegalDocumentKey, { titles: { fr: string; en: string }; updatedIso: string }>();
    for (const s of frSections) {
      const en = enSections.find((e) => e.id === s.id) ?? s;
      const existing = byDoc.get(s.documentKey);
      const updatedIso = s.lastUpdatedAt ?? existing?.updatedIso ?? '';
      const newer = !existing?.updatedIso || (s.lastUpdatedAt && s.lastUpdatedAt > existing.updatedIso);
      byDoc.set(s.documentKey, {
        titles: existing?.titles ?? { fr: s.title, en: en.title },
        updatedIso: newer ? (s.lastUpdatedAt ?? existing?.updatedIso ?? '') : (existing?.updatedIso ?? ''),
      });
    }

    return FALLBACK_LEGAL_DOCUMENTS.map((doc) => {
      const found = byDoc.get(doc.k);
      if (!found) return doc;
      const formatted = formatLastUpdated(found.updatedIso) || doc.updated;
      return {
        k: doc.k,
        fr: found.titles.fr || doc.fr,
        en: found.titles.en || doc.en,
        updated: formatted,
      };
    });
  } catch {
    return FALLBACK_LEGAL_DOCUMENTS;
  }
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
  rank?: number;
}

const FALLBACK_CONTACT_SUBJECTS: ContactSubject[] = [
  { k: 'general', fr: 'Question générale', en: 'General enquiry' },
  { k: 'reserver', fr: 'Réserver un plateau', en: 'Book a stage' },
  { k: 'ecom', fr: 'Production e-commerce', en: 'E-commerce production' },
  { k: 'visite', fr: 'Visite du studio', en: 'Studio visit' },
];

export async function fetchContactSubjects(): Promise<ContactSubject[]> {
  try {
    const resBI = await fetchStrapiBilingual<{ data: StrapiContactSubject[] }>('contact-subjects', {
      'sort': 'rank:asc',
      'pagination[pageSize]': '50',
    });
    const frSubjects = resBI.fr.data ?? [];
    const enSubjects = resBI.en.data ?? [];
    if (frSubjects.length === 0) return FALLBACK_CONTACT_SUBJECTS;
    return frSubjects.map((sFr) => {
      const sEn = enSubjects.find((e) => e.key === sFr.key) ?? sFr;
      return { k: sFr.key, fr: sFr.name, en: sEn.name };
    });
  } catch {
    return FALLBACK_CONTACT_SUBJECTS;
  }
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
  rank?: number;
}

const FALLBACK_TEAM_MEMBERS: TeamMember[] = [
  { id: 1, name: { fr: 'Thomas Guedj', en: 'Thomas Guedj' }, role: { fr: 'Direction & administration', en: 'Director & administration' }, email: null, emailHref: null },
  { id: 2, name: { fr: 'Benoît Cougny', en: 'Benoît Cougny' }, role: { fr: 'Planification & production', en: 'Planning & production' }, email: null, emailHref: null },
  { id: 3, name: { fr: 'Phan Vo', en: 'Phan Vo' }, role: { fr: 'Image & post-production', en: 'Image & post-production' }, email: null, emailHref: null },
  { id: 4, name: { fr: 'Théo Daguier', en: 'Théo Daguier' }, role: { fr: 'Support technique', en: 'Technical support' }, email: null, emailHref: null },
  { id: 5, name: { fr: 'Service général', en: 'General enquiries' }, role: { fr: 'Accueil & informations', en: 'Reception & information' }, email: 'contact@e-do.studio', emailHref: 'mailto:contact@e-do.studio' },
];

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const resBI = await fetchStrapiBilingual<{ data: StrapiTeamMember[] }>('team-members', {
      'populate': 'photo',
      'sort': 'rank:asc',
      'pagination[pageSize]': '50',
    });
    const frMembers = resBI.fr.data ?? [];
    const enMembers = resBI.en.data ?? [];
    if (frMembers.length === 0) return FALLBACK_TEAM_MEMBERS;
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
  } catch {
    return FALLBACK_TEAM_MEMBERS;
  }
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

export interface GalleryProject {
  id: number;
  brand: string;
  slug: string;
  cat: string;
  plateau: string;
  year: string;
  tone: 'mono' | 'dark' | 'warm';
  imageUrls: string[];
}

export interface GalleryCategory {
  k: string;
  fr: string;
  en: string;
}

const FALLBACK_GALLERY_CATEGORIES: GalleryCategory[] = [
  { k: 'pap', fr: 'Prêt-à-porter', en: 'Ready-to-wear' },
  { k: 'accessoires', fr: 'Accessoires', en: 'Accessories' },
  { k: 'eyewear', fr: 'Eyewear', en: 'Eyewear' },
  { k: 'bijoux', fr: 'Bijoux', en: 'Jewelry' },
  { k: 'cosmetique', fr: 'Cosmétique', en: 'Cosmetics' },
  { k: 'food', fr: 'Food & Spiritueux', en: 'Food & Spirits' },
];

const FALLBACK_GALLERY_PROJECTS: GalleryProject[] = [
  { id: 1, brand: 'Maison Ortho', slug: 'maison-ortho-2026', cat: 'pap', plateau: 'cyclorama', year: '2026', tone: 'mono', imageUrls: [] },
  { id: 2, brand: 'Le Monde Béryl', slug: 'le-monde-beryl-2026', cat: 'accessoires', plateau: 'horizontal', year: '2026', tone: 'dark', imageUrls: [] },
  { id: 3, brand: 'Atelier Soie', slug: 'atelier-soie-2026', cat: 'pap', plateau: 'vertical', year: '2026', tone: 'warm', imageUrls: [] },
  { id: 4, brand: 'Kôji', slug: 'koji-2025', cat: 'eyewear', plateau: 'eclipse', year: '2025', tone: 'mono', imageUrls: [] },
  { id: 5, brand: 'Rue Saint-Honoré', slug: 'rue-saint-honore-2025', cat: 'cosmetique', plateau: 'horizontal', year: '2025', tone: 'dark', imageUrls: [] },
  { id: 6, brand: 'Ganymède', slug: 'ganymede-2025', cat: 'bijoux', plateau: 'eclipse', year: '2025', tone: 'warm', imageUrls: [] },
  { id: 7, brand: 'Moa Studio', slug: 'moa-studio-2026', cat: 'pap', plateau: 'live', year: '2026', tone: 'mono', imageUrls: [] },
  { id: 8, brand: 'Maison Margin', slug: 'maison-margin-2025', cat: 'pap', plateau: 'vertical', year: '2025', tone: 'dark', imageUrls: [] },
  { id: 9, brand: 'Toby Ombré', slug: 'toby-ombre-2026', cat: 'food', plateau: 'horizontal', year: '2026', tone: 'warm', imageUrls: [] },
  { id: 10, brand: 'Noir Étoilé', slug: 'noir-etoile-2025', cat: 'cosmetique', plateau: 'cyclorama', year: '2025', tone: 'mono', imageUrls: [] },
  { id: 11, brand: 'Orbite', slug: 'orbite-2025', cat: 'eyewear', plateau: 'eclipse', year: '2025', tone: 'dark', imageUrls: [] },
  { id: 12, brand: 'Studio 11', slug: 'studio-11-2026', cat: 'accessoires', plateau: 'horizontal', year: '2026', tone: 'warm', imageUrls: [] },
  { id: 13, brand: 'Parure', slug: 'parure-2026', cat: 'bijoux', plateau: 'eclipse', year: '2026', tone: 'mono', imageUrls: [] },
  { id: 14, brand: 'Rue Cadet', slug: 'rue-cadet-2025', cat: 'pap', plateau: 'cyclorama', year: '2025', tone: 'dark', imageUrls: [] },
  { id: 15, brand: 'Atelier Bois', slug: 'atelier-bois-2025', cat: 'food', plateau: 'horizontal', year: '2025', tone: 'warm', imageUrls: [] },
  { id: 16, brand: 'Maison Ardent', slug: 'maison-ardent-2026', cat: 'pap', plateau: 'vertical', year: '2026', tone: 'mono', imageUrls: [] },
  { id: 17, brand: 'Saar Paris', slug: 'saar-paris-2026', cat: 'accessoires', plateau: 'eclipse', year: '2026', tone: 'dark', imageUrls: [] },
  { id: 18, brand: 'Solène', slug: 'solene-2025', cat: 'bijoux', plateau: 'cyclorama', year: '2025', tone: 'warm', imageUrls: [] },
];

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function fetchGalleryProjects(): Promise<GalleryProject[]> {
  try {
    const res = await fetchStrapi<{ data: StrapiGalleryProject[] }>('gallery-projects', {
      'populate': 'category,brand,images',
      'sort': 'rank:asc',
      'pagination[pageSize]': '100',
    });

    if (res.data.length > 0) {
      return res.data.map((p, i) => ({
        id: p.id,
        brand: p.brand?.name ?? p.title ?? slugToTitle(p.slug),
        slug: p.slug,
        cat: p.category?.slug ?? 'other',
        plateau: p.stageKey ?? p.stage,
        year: String(p.year),
        tone: TONES[i % 3],
        imageUrls: (p.images ?? []).map(img => resolveStrapiMediaUrl(img)).filter((u): u is string => !!u),
      }));
    }
  } catch {
    // Strapi gallery-project content type not available yet
  }
  return FALLBACK_GALLERY_PROJECTS;
}

export async function fetchGalleryCategories(): Promise<GalleryCategory[]> {
  try {
    const resBI = await fetchStrapiBilingual<{ data: StrapiGalleryCategory[] }>('gallery-categories', {
      'sort': 'rank:asc',
    });
    const frCats = resBI.fr.data;
    const enCats = resBI.en.data;
    if (frCats.length > 0) {
      return frCats.map(cFr => {
        const cEn = enCats.find(e => e.slug === cFr.slug) ?? cFr;
        return { k: cFr.slug, fr: cFr.name, en: cEn.name };
      });
    }
  } catch {
    // Strapi gallery-category content type not available yet
  }
  return FALLBACK_GALLERY_CATEGORIES;
}
