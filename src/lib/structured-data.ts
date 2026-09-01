import type { Lang } from '../types';
import type {
  ContactInfo,
  StudioHours,
  SiteBusinessInfo,
  PlateauSpec,
  PPCat,
  GalleryProject,
  GalleryCategory,
} from './strapi';
import type { DiscoveryPost } from '../types';
import { getT } from '../i18n';
import { bcp47 } from './format';

const SITE_URL = 'https://e-do.studio';
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const DEFAULT_LOGO = `${SITE_URL}/brand/logo-full.webp`;

// JSON-LD is a loose, recursive shape. We accept any nested record and let the
// builders below produce schema.org-shaped output.
export type JsonLdNode = Record<string, unknown>;

function pageUrl(lang: Lang, pathname = ''): string {
  const safe = pathname.startsWith('/')
    ? pathname
    : pathname
      ? `/${pathname}`
      : '';
  return `${SITE_URL}/${lang}${safe}`;
}

function compact<T extends Record<string, unknown>>(node: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

// ─── Opening hours mapping ──────────────────────────────────────────────────

// Une rangée d'horaires porte déjà ses jours et ses bornes normalisées : ce
// bloc les lit, il ne les redevine plus.
//
// La version précédente relisait la CHAÎNE D'AFFICHAGE à la regex, puis
// affirmait `dayOfWeek: [Monday…Friday]` quelle que soit la donnée. Un studio
// ouvert du mardi au samedi déclarait donc à Google des horaires du lundi au
// vendredi — le même postulat que celui du rail, mais envoyé au moteur de
// recherche, où personne ne le voit se tromper.
const JSONLD_DAY: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function buildOpeningHoursSpec(
  hours?: StudioHours | null,
): JsonLdNode[] | undefined {
  if (!hours) return undefined;
  const out: JsonLdNode[] = [];
  for (const row of hours.rows) {
    // Seule une plage se déclare. Un jour fermé ou sur rendez-vous n'a pas
    // d'`opens`/`closes`, et un `OpeningHoursSpecification` sans bornes ne dit
    // rien de plus que son absence.
    if (row.kind !== 'hours' || !row.opens || !row.closes) continue;
    const dayOfWeek = row.days.map((d) => JSONLD_DAY[d]).filter(Boolean);
    if (dayOfWeek.length === 0) continue;
    out.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek,
      opens: row.opens,
      closes: row.closes,
    });
  }
  return out.length > 0 ? out : undefined;
}

// ─── Organization / LocalBusiness ───────────────────────────────────────────

// Le studio est en France ; seul ce cas mérite une correspondance. Toute autre
// valeur est renvoyée telle quelle : un code déjà valide passe, et une saisie
// inattendue reste visible plutôt que d'être silencieusement réécrite en FR.
function toCountryCode(country?: string): string {
  if (!country) return 'FR';
  return /^france$/i.test(country.trim()) ? 'FR' : country;
}

export interface BuildOrganizationArgs {
  lang: Lang;
  contact?: ContactInfo | null;
  hours?: StudioHours | null;
  business?: SiteBusinessInfo | null;
  socials?: { href: string }[] | null;
}

export function buildLocalBusinessSchema({
  lang,
  contact,
  hours,
  business,
  socials,
}: BuildOrganizationArgs): JsonLdNode {
  const description = getT(lang)('seo.localBusinessDescription');
  const address = contact?.address;
  const sameAs = (socials ?? [])
    .map((s) => s.href)
    .filter((href) => typeof href === 'string' && /^https?:\/\//.test(href));
  const postalAddress = address?.street
    ? compact({
        '@type': 'PostalAddress',
        streetAddress: address.street,
        postalCode: address.postalCode,
        addressLocality: address.city,
        // schema.org attend un code ISO 3166-1 alpha-2 ; le CMS saisit le nom
        // en toutes lettres (« France »).
        addressCountry: toCountryCode(address.country),
      })
    : undefined;
  const contactPoints =
    contact?.phone || contact?.email
      ? [
          compact({
            '@type': 'ContactPoint',
            telephone: contact?.phone,
            email: contact?.email,
            contactType: 'customer service',
            areaServed: 'FR',
            availableLanguage: ['French', 'English'],
          }),
        ]
      : undefined;
  return compact({
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    '@id': ORGANIZATION_ID,
    name: business?.legalName || 'E-Do Studio',
    alternateName: 'E-Do Studio',
    legalName: business?.legalName,
    url: SITE_URL,
    logo: DEFAULT_LOGO,
    image: DEFAULT_LOGO,
    description,
    email: contact?.email || business?.contactEmail,
    telephone: contact?.phone,
    vatID: business?.vatNumber,
    taxID: business?.siret,
    address: postalAddress,
    areaServed: { '@type': 'Country', name: 'France' },
    knowsAbout: [
      'photographie',
      'vidéo',
      'post-production',
      'cyclorama',
      'studio photo',
      'shooting',
      'packshot',
    ],
    openingHoursSpecification: buildOpeningHoursSpec(hours),
    contactPoint: contactPoints,
    sameAs,
    inLanguage: bcp47(lang),
  });
}

// ─── WebSite ────────────────────────────────────────────────────────────────

export function buildWebSiteSchema(lang: Lang): JsonLdNode {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: 'E-Do Studio',
    inLanguage: bcp47(lang),
    publisher: { '@id': ORGANIZATION_ID },
  });
}

// ─── BreadcrumbList ─────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  pathname: string;
}

function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
  lang: Lang,
): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: pageUrl(lang, it.pathname),
    })),
  };
}

/**
 * Fil d'Ariane d'une page interne : l'accueil, puis les niveaux fournis.
 * Évite de répéter le premier maillon dans le `head()` de chaque route.
 */
export function buildPageBreadcrumb(
  lang: Lang,
  trail: BreadcrumbItem[],
): JsonLdNode {
  return buildBreadcrumbSchema(
    [{ name: getT(lang)('common.home'), pathname: '' }, ...trail],
    lang,
  );
}

// ─── Service (plateaux + post-prod) ─────────────────────────────────────────

export interface BuildPlateauServiceArgs {
  plateau: PlateauSpec;
  slug: string;
  lang: Lang;
  pathname: string;
}

export function buildPlateauServiceSchema({
  plateau,
  slug,
  lang,
  pathname,
}: BuildPlateauServiceArgs): JsonLdNode {
  const name =
    plateau.seo?.[lang]?.title || `${plateau.name} — E-Do Studio Paris`;
  const description =
    plateau.seo?.[lang]?.description ||
    plateau.desc?.[lang] ||
    plateau.tagline?.[lang] ||
    '';
  const offers = (plateau.rates ?? [])
    .map((r) => {
      const value = typeof r.v === 'string' ? r.v : r.v?.[lang];
      const priceMatch = value
        ? String(value)
            .replace(/\s/g, '')
            .match(/(\d+(?:[.,]\d+)?)/)
        : null;
      const price = priceMatch ? priceMatch[1].replace(',', '.') : undefined;
      if (!price) return null;
      const labelObj = r.k as { fr?: string; en?: string } | undefined;
      const label = labelObj?.[lang] || labelObj?.fr;
      return compact({
        '@type': 'Offer',
        name: label,
        priceCurrency: 'EUR',
        price,
        availability: 'https://schema.org/InStock',
        url: pageUrl(lang, pathname),
      });
    })
    .filter(Boolean) as JsonLdNode[];

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${pageUrl(lang, pathname)}#service`,
    serviceType:
      slug === 'cyclorama' ? 'Cyclorama rental' : 'Photo & video stage rental',
    name,
    description,
    url: pageUrl(lang, pathname),
    areaServed: { '@type': 'Country', name: 'France' },
    provider: { '@id': ORGANIZATION_ID },
    offers: offers.length > 0 ? offers : undefined,
    image: plateau.media?.find((m) => m.kind === 'image')?.url,
  });
}

export interface BuildPostProdServiceArgs {
  cats: PPCat[];
  lang: Lang;
  pathname: string;
}

export function buildPostProdServiceSchema({
  cats,
  lang,
  pathname,
}: BuildPostProdServiceArgs): JsonLdNode {
  const items = cats.map((c) => {
    const priceStr = c.price?.amount;
    const priceMatch = priceStr
      ? String(priceStr)
          .replace(/\s/g, '')
          .match(/(\d+(?:[.,]\d+)?)/)
      : null;
    const price = priceMatch ? priceMatch[1].replace(',', '.') : undefined;
    return compact({
      '@type': 'Offer',
      name: lang === 'fr' ? c.fr : c.en,
      description: c.tagline?.[lang],
      priceCurrency: 'EUR',
      price,
      availability: 'https://schema.org/InStock',
      url: pageUrl(lang, pathname),
      itemOffered: compact({
        '@type': 'Service',
        name: lang === 'fr' ? c.fr : c.en,
        description: c.tagline?.[lang] || c.note?.[lang],
        serviceType:
          c.medium === 'video'
            ? 'Video post-production'
            : 'Photo post-production',
      }),
    });
  });
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${pageUrl(lang, pathname)}#service`,
    name: 'Post-production — E-Do Studio',
    serviceType: getT(lang)('seo.postprodServiceType'),
    description: getT(lang)('seo.postprodDescription'),
    url: pageUrl(lang, pathname),
    provider: { '@id': ORGANIZATION_ID },
    areaServed: { '@type': 'Country', name: 'France' },
    hasOfferCatalog:
      items.length > 0
        ? compact({
            '@type': 'OfferCatalog',
            name: getT(lang)('seo.postprodCatalogName'),
            itemListElement: items,
          })
        : undefined,
  });
}

// ─── Blog + BlogPosting ─────────────────────────────────────────────────────

export function buildBlogSchema(
  posts: DiscoveryPost[],
  lang: Lang,
  pathname: string,
): JsonLdNode {
  const items = posts.slice(0, 20).map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: pageUrl(lang, `${pathname}/${p.slug}`),
    name: p.title[lang],
  }));
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${pageUrl(lang, pathname)}#blog`,
    name: getT(lang)('seo.discoveryBlogName'),
    url: pageUrl(lang, pathname),
    inLanguage: bcp47(lang),
    publisher: { '@id': ORGANIZATION_ID },
    mainEntity:
      items.length > 0
        ? compact({
            '@type': 'ItemList',
            numberOfItems: items.length,
            itemListElement: items,
          })
        : undefined,
  });
}

function toIsoDate(input?: string): string | undefined {
  if (!input) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input;
  const parsed = Date.parse(input);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return undefined;
}

export function buildBlogPostingSchema(
  post: DiscoveryPost,
  lang: Lang,
  pathname: string,
): JsonLdNode {
  const url = pageUrl(lang, pathname);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title[lang],
    description: post.sub[lang],
    inLanguage: bcp47(lang),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    // La couverture d'un article peut être une vidéo : schema.org attend une
    // image ici, et un .mov y produit un balisage invalide.
    image: post.coverMime?.startsWith('image/') ? post.coverUrl : undefined,
    // `post.date` est une date d'affichage localisée (« 12 mars ») que
    // Date.parse ne sait pas lire : c'est publishedAt qui porte l'ISO.
    datePublished: toIsoDate(post.publishedAt),
    author: post.author
      ? compact({ '@type': 'Person', name: post.author })
      : undefined,
    publisher: { '@id': ORGANIZATION_ID },
    articleSection: post.tag?.[lang],
    keywords:
      [post.tag?.[lang], post.cat].filter(Boolean).join(', ') || undefined,
  });
}

// ─── ContactPage ────────────────────────────────────────────────────────────

export function buildContactPageSchema(
  lang: Lang,
  pathname: string,
  contact?: ContactInfo | null,
): JsonLdNode {
  const url = pageUrl(lang, pathname);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${url}#contact`,
    url,
    name: 'Contact — E-Do Studio Paris',
    inLanguage: bcp47(lang),
    description: getT(lang)('seo.contactDescription'),
    about: { '@id': ORGANIZATION_ID },
    mainEntity:
      contact?.email || contact?.phone
        ? compact({
            '@type': 'Organization',
            '@id': ORGANIZATION_ID,
            email: contact?.email,
            telephone: contact?.phone,
          })
        : undefined,
  });
}

// ─── Gallery (CollectionPage) ───────────────────────────────────────────────

export function buildGalleryCollectionSchema(
  projects: GalleryProject[],
  _categories: GalleryCategory[],
  lang: Lang,
  pathname: string,
): JsonLdNode {
  const url = pageUrl(lang, pathname);
  const items = projects.slice(0, 50).map((p, i) => {
    const firstImage = p.media?.find((m) => m.kind === 'image');
    return {
      '@type': 'ListItem',
      position: i + 1,
      item: compact({
        '@type': 'CreativeWork',
        name: p.brand,
        url,
        image: firstImage?.url,
        genre: p.cat,
        dateCreated: p.year,
      }),
    };
  });
  return compact({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#gallery`,
    name: getT(lang)('seo.galleryName'),
    url,
    inLanguage: bcp47(lang),
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    mainEntity:
      items.length > 0
        ? compact({
            '@type': 'ItemList',
            numberOfItems: items.length,
            itemListElement: items,
          })
        : undefined,
  });
}

// ─── Generic WebPage ────────────────────────────────────────────────────────

export interface BuildWebPageArgs {
  lang: Lang;
  pathname: string;
  name: string;
  description?: string;
  type?: 'WebPage' | 'AboutPage' | 'ContactPage';
}

export function buildWebPageSchema({
  lang,
  pathname,
  name,
  description,
  type = 'WebPage',
}: BuildWebPageArgs): JsonLdNode {
  const url = pageUrl(lang, pathname);
  return compact({
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#page`,
    url,
    name,
    description,
    inLanguage: bcp47(lang),
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
  });
}
