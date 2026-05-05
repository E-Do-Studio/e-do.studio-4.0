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
  orderRank: number;
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
  orderRank: number;
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
  orderRank: number;
}

interface StrapiGalleryCategory {
  id: number;
  title_fr: string;
  title_en: string;
  slug: string;
  orderRank: number;
}

interface StrapiGalleryProject {
  id: number;
  title: string;
  slug: string;
  stage: string;
  year: number;
  orderRank: number;
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

// ─── Data fetchers ──────────────────────────────────────────────────────────

export async function fetchPlateaux(): Promise<Record<string, PlateauSpec>> {
  const [machinesRes, cycloRes] = await Promise.all([
    fetchStrapi<{ data: StrapiMachine[] }>('machines', { 'populate': 'specs', 'sort': 'orderRank:asc' }),
    fetchStrapi<{ data: StrapiCyclorama }>('cyclorama', { 'populate': 'specs,amenities' }),
  ]);

  const result: Record<string, PlateauSpec> = {};

  const cyc = cycloRes.data;
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

  for (const m of machinesRes.data) {
    result[m.slug] = {
      num: String(m.orderRank).padStart(2, '0'),
      name: m.title,
      slug: m.slug,
      tagline: { fr: m.subtitle_fr, en: m.subtitle_en },
      desc: { fr: m.description_fr, en: m.description_en },
      specs: (m.specs ?? []).map(specToBilingual),
      uses: MACHINE_USES[m.slug] ?? [],
      rates: parsePricingToRates(m.pricing_fr, m.pricing_en),
      visual: m.slug,
    };
  }

  return result;
}

export async function fetchMachines(): Promise<MachineInfo[]> {
  const [machinesRes, cycloRes] = await Promise.all([
    fetchStrapi<{ data: StrapiMachine[] }>('machines', { 'sort': 'orderRank:asc' }),
    fetchStrapi<{ data: StrapiCyclorama }>('cyclorama'),
  ]);

  const cyc = cycloRes.data;
  const list: MachineInfo[] = [
    {
      slug: 'cyclorama',
      fr: { t: cyc.title_fr || 'Cyclorama', sub: cyc.subtitle_fr, label: MACHINE_LABELS.cyclorama?.fr },
      en: { t: cyc.title_en || 'Cyclorama', sub: cyc.subtitle_en, label: MACHINE_LABELS.cyclorama?.en },
    },
  ];

  for (const m of machinesRes.data) {
    list.push({
      slug: m.slug,
      fr: { t: m.title, sub: m.subtitle_fr, label: MACHINE_LABELS[m.slug]?.fr },
      en: { t: m.title, sub: m.subtitle_en, label: MACHINE_LABELS[m.slug]?.en },
    });
  }

  return list;
}

export async function fetchPostProdTypes(): Promise<PPCat[]> {
  const res = await fetchStrapi<{ data: StrapiPostProdType[] }>('post-production-types', {
    'populate': 'includes',
    'sort': 'orderRank:asc',
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
    'sort': 'orderRank:asc',
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
  title: string;
  slug: string;
  cat: string;
  plateau: string;
  year: number;
  tone: 'mono' | 'dark' | 'warm';
  imageUrls: string[];
}

export interface GalleryCategory {
  k: string;
  fr: string;
  en: string;
}

export async function fetchGalleryProjects(): Promise<GalleryProject[]> {
  const res = await fetchStrapi<{ data: StrapiGalleryProject[] }>('gallery-projects', {
    'populate': 'category,images',
    'sort': 'orderRank:asc',
    'pagination[pageSize]': '100',
  });

  return res.data.map((p, i) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    cat: p.category?.slug ?? 'other',
    plateau: p.stage,
    year: p.year,
    tone: TONES[i % 3],
    imageUrls: (p.images ?? []).map(img => resolveStrapiMediaUrl(img)).filter((u): u is string => !!u),
  }));
}

export async function fetchGalleryCategories(): Promise<GalleryCategory[]> {
  const res = await fetchStrapi<{ data: StrapiGalleryCategory[] }>('gallery-categories', {
    'sort': 'orderRank:asc',
  });
  return res.data.map(c => ({ k: c.slug, fr: c.title_fr, en: c.title_en }));
}

