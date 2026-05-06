import type { Bilingual, MachineInfo, DiscoveryPost, DiscoveryCategory, SocialLink } from '../types';

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

// ─── Strapi response types ──────────────────────────────────────────────────

interface StrapiSpec { label_fr: string; label_en: string; value_fr: string; value_en: string }
interface StrapiLocalizedItem { fr: string; en: string }
interface StrapiSocialLink { platform: string; label: string; url: string }

interface StrapiMachine {
  id: number;
  title: string;
  slug: string;
  subtitle_fr: string;
  subtitle_en: string;
  description_fr: string;
  description_en: string;
  pricing_fr: string;
  pricing_en: string;
  operatorPricing_fr: string | null;
  operatorPricing_en: string | null;
  specs?: StrapiSpec[];
}

interface StrapiCyclorama {
  title_fr: string;
  title_en: string;
  subtitle_fr: string;
  subtitle_en: string;
  description_fr: string;
  description_en: string;
  pricing_fr: string;
  pricing_en: string;
  pricingDescription_fr: string;
  pricingDescription_en: string;
  specs?: StrapiSpec[];
  amenities?: StrapiLocalizedItem[];
}

interface StrapiPostProdType {
  id: number;
  title_fr: string;
  title_en: string;
  slug: string;
  description_fr: string;
  description_en: string;
  price_fr: string;
  price_en: string;
  includes?: StrapiLocalizedItem[];
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
  title_fr: string;
  title_en: string;
  slug: string;
  excerpt_fr: string;
  excerpt_en: string;
  body_fr?: string;
  body_en?: string;
  author?: string;
  readingTime?: number;
  featured?: boolean;
  coverImage?: StrapiMedia;
  publishedAt: string;
  categories?: { id: number; title_fr: string; title_en: string; slug: string }[];
}

interface StrapiBlogCategory {
  id: number;
  title_fr: string;
  title_en: string;
  slug: string;
}

interface StrapiSiteSettings {
  siteTitle: string;
  phone: string;
  phoneHref: string;
  email: string;
  street: string;
  city: string;
  postalCode: string;
  fullAddress: string;
  hours_fr: string;
  hours_en: string;
  socialLinks?: StrapiSocialLink[];
}

interface StrapiGalleryBrand {
  id: number;
  name: string;
}

interface StrapiGalleryCategory {
  id: number;
  title_fr: string;
  title_en: string;
  slug: string;
}

interface StrapiGalleryProject {
  id: number;
  title: string;
  slug: string;
  stage: string;
  year: number | string;
  category?: StrapiGalleryCategory;
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

function specToBilingual(s: StrapiSpec): { k: Bilingual; v: Bilingual } {
  return { k: { fr: s.label_fr, en: s.label_en }, v: { fr: s.value_fr, en: s.value_en } };
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
    const [machinesRes, cycloRes] = await Promise.all([
      fetchStrapi<{ data: StrapiMachine[] }>('machines', { 'populate': 'specs', 'sort': 'rank:asc' }),
      fetchStrapi<{ data: StrapiCyclorama }>('cyclorama', { 'populate': 'specs,amenities' }),
    ]);

    const result: Record<string, PlateauSpec> = {};

    const cyc = cycloRes.data;
    if (cyc) {
      result.cyclorama = {
        num: '01',
        name: 'Cyclorama',
        slug: 'cyclorama',
        tagline: { fr: cyc.subtitle_fr, en: cyc.subtitle_en },
        desc: { fr: cyc.description_fr, en: cyc.description_en },
        specs: (cyc.specs ?? []).map(specToBilingual),
        uses: (cyc.amenities ?? []).map(a => ({ fr: a.fr, en: a.en })),
        rates: parsePricingToRates(cyc.pricing_fr, cyc.pricing_en),
        ratesNote: cyc.pricingDescription_fr ? { fr: cyc.pricingDescription_fr, en: cyc.pricingDescription_en } : undefined,
        visual: 'cyc',
      };
    }

    machinesRes.data.forEach((m, i) => {
      result[m.slug] = {
        num: String(i + 2).padStart(2, '0'),
        name: m.title,
        slug: m.slug,
        tagline: { fr: m.subtitle_fr, en: m.subtitle_en },
        desc: { fr: m.description_fr, en: m.description_en },
        specs: (m.specs ?? []).map(specToBilingual),
        uses: MACHINE_USES[m.slug] ?? [],
        rates: parsePricingToRates(m.pricing_fr, m.pricing_en),
        visual: m.slug,
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
    const [machinesRes, cycloRes] = await Promise.all([
      fetchStrapi<{ data: StrapiMachine[] }>('machines', { 'sort': 'rank:asc' }),
      fetchStrapi<{ data: StrapiCyclorama }>('cyclorama'),
    ]);

    const cyc = cycloRes.data;
    const list: MachineInfo[] = [];

    if (cyc) {
      list.push({
        slug: 'cyclorama',
        fr: { t: cyc.title_fr || 'Cyclorama', sub: cyc.subtitle_fr, label: MACHINE_LABELS.cyclorama?.fr },
        en: { t: cyc.title_en || 'Cyclorama', sub: cyc.subtitle_en, label: MACHINE_LABELS.cyclorama?.en },
      });
    }

    for (const m of machinesRes.data) {
      list.push({
        slug: m.slug,
        fr: { t: m.title, sub: m.subtitle_fr, label: MACHINE_LABELS[m.slug]?.fr },
        en: { t: m.title, sub: m.subtitle_en, label: MACHINE_LABELS[m.slug]?.en },
      });
    }

    if (list.length > 0) return list;
  } catch {
    // Strapi machine/cyclorama content types not available yet
  }
  return FALLBACK_MACHINES;
}

export async function fetchPostProdTypes(): Promise<PPCat[]> {
  const res = await fetchStrapi<{ data: StrapiPostProdType[] }>('post-production-types', {
    'populate': 'includes',
    'sort': 'rank:asc',
  });

  return res.data.map(t => ({
    k: t.slug,
    medium: 'photo',
    fr: t.title_fr,
    en: t.title_en,
    tagline: { fr: t.description_fr, en: t.description_en },
    price: parsePriceText(t.price_fr, t.price_en),
    note: { fr: '', en: '' },
    features: {
      fr: (t.includes ?? []).map(i => i.fr),
      en: (t.includes ?? []).map(i => i.en),
    },
    formats: [],
    samples: [],
    brands: [],
  }));
}

function parsePriceText(fr: string, en: string): PPPrice {
  const fromFr = fr?.startsWith('À partir de') || fr?.startsWith('Sur devis');
  const amountMatch = fr?.match(/[\d,]+\s*€/);
  return {
    amount: amountMatch?.[0] ?? fr,
    from: fromFr,
    kind: fr?.includes('devis') ? 'quote' : 'unit',
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
  const res = await fetchStrapi<{ data: StrapiBlogPost[] }>('blog-posts', {
    'populate': 'categories,coverImage',
    'sort': 'publishedAt:desc',
    'pagination[pageSize]': '50',
  });

  return res.data.map((p, i) => {
    const cat = p.categories?.[0];
    const bodyFr = p.body_fr ?? '';
    const bodyEn = p.body_en ?? '';
    const readingTime = p.readingTime ?? estimateReadingTime(bodyFr || bodyEn);
    return {
      id: p.id,
      cat: cat?.slug ?? 'tips',
      tone: TONES[i % 3],
      tag: { fr: cat?.title_fr ?? 'Tips', en: cat?.title_en ?? 'Tips' },
      title: { fr: p.title_fr, en: p.title_en },
      sub: { fr: p.excerpt_fr, en: p.excerpt_en },
      body: { fr: bodyFr, en: bodyEn },
      date: formatStrapiDate(p.publishedAt),
      read: `${readingTime} min`,
      author: p.author ?? 'Studio',
      coverUrl: resolveStrapiMediaUrl(p.coverImage),
      featured: p.featured ?? false,
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
  const res = await fetchStrapi<{ data: StrapiBlogCategory[] }>('blog-categories', { 'sort': 'title_fr:asc' });
  return [
    { k: 'all', fr: 'Tout', en: 'All' },
    ...res.data.map(c => ({ k: c.slug, fr: c.title_fr, en: c.title_en })),
  ];
}

export async function fetchSocialLinks(): Promise<SocialLink[]> {
  const res = await fetchStrapi<{ data: StrapiSiteSettings }>('site-setting', { 'populate': 'socialLinks' });
  return (res.data.socialLinks ?? []).map(s => ({ k: s.platform, label: s.label, href: s.url }));
}

export async function fetchBrands(): Promise<string[]> {
  const res = await fetchStrapi<{ data: StrapiGalleryBrand[] }>('gallery-brands', {
    'sort': 'rank:asc',
    'pagination[pageSize]': '50',
  });
  return res.data.map(b => b.name);
}

export async function fetchContact() {
  const res = await fetchStrapi<{ data: StrapiSiteSettings }>('site-setting');
  const s = res.data;
  return {
    phone: s.phone,
    phoneHref: s.phoneHref || `tel:${s.phone?.replace(/\s/g, '')}`,
    email: s.email,
    emailHref: `mailto:${s.email}`,
    address: { street: s.street, zip: `${s.postalCode} ${s.city}` },
    etouch: 'https://etouch.e-do.studio',
  };
}

export async function fetchStudioHours(): Promise<Bilingual> {
  const res = await fetchStrapi<{ data: StrapiSiteSettings }>('site-setting');
  return { fr: res.data.hours_fr, en: res.data.hours_en };
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

export async function fetchGalleryProjects(): Promise<GalleryProject[]> {
  try {
    const res = await fetchStrapi<{ data: StrapiGalleryProject[] }>('gallery-projects', {
      'populate': 'category,images',
      'sort': 'rank:asc',
      'pagination[pageSize]': '100',
    });

    if (res.data.length > 0) {
      return res.data.map((p, i) => ({
        id: p.id,
        brand: p.title ?? p.slug,
        slug: p.slug,
        cat: p.category?.slug ?? 'other',
        plateau: p.stage,
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
    const res = await fetchStrapi<{ data: StrapiGalleryCategory[] }>('gallery-categories', {
      'sort': 'rank:asc',
    });
    if (res.data.length > 0) {
      return res.data.map(c => ({ k: c.slug, fr: c.title_fr, en: c.title_en }));
    }
  } catch {
    // Strapi gallery-category content type not available yet
  }
  return FALLBACK_GALLERY_CATEGORIES;
}

