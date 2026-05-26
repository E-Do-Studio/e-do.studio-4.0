#!/usr/bin/env node

/**
 * Seed script to populate Strapi CMS with website content.
 *
 * Requires the i18n migration (EDOAAA-422) to be deployed first — this script
 * uses the Strapi 5 locale-based API, not the _fr/_en suffix fields.
 *
 * Usage:
 *   STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=<api-token> node seed-content.mjs
 *
 * The token must have full-access permissions on all content types.
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

if (!STRAPI_TOKEN) {
  console.error('STRAPI_TOKEN env var is required (create a full-access API token in Strapi admin)');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${STRAPI_TOKEN}`,
};

// ─── API helpers ────────────────────────────────────────────────────────────

async function api(path, opts = {}) {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  const res = await fetch(url, { headers, ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || 'GET'} /api/${path} → ${res.status}: ${text}`);
  }
  // Some endpoints (e.g. publish actions) may return 200/204 with no body.
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Strapi 5 has Draft & Publish enabled on every CT. POST/PUT to /api/{plural}
// updates the DRAFT version; the public REST GET only serves PUBLISHED entries
// (status=published is the default). Without an explicit publish step, every
// seeded entry is invisible to the website. publishDoc calls the dedicated
// publish action to promote draft → published per locale.
async function publishDoc(path, locale) {
  try {
    await api(`${path}/actions/publish?locale=${locale}`, { method: 'POST' });
  } catch (err) {
    // If already published with no draft changes, Strapi may 400. Don't fail
    // the whole seed for that — log and continue.
    const msg = err.message ?? String(err);
    if (!/already|nothing to publish/i.test(msg)) {
      console.warn(`    ⚠️  publish failed for ${path} (${locale}): ${msg}`);
    }
  }
}

async function publishCollectionDoc(collection, documentId) {
  await publishDoc(`${collection}/${documentId}`, 'fr');
  await publishDoc(`${collection}/${documentId}`, 'en');
}

async function publishSingle(singleType) {
  await publishDoc(singleType, 'fr');
  await publishDoc(singleType, 'en');
}

async function findBySlug(collection, slug) {
  const res = await api(`${collection}?filters[slug][$eq]=${slug}&locale=fr`);
  return res.data?.[0] ?? null;
}

async function findByName(collection, name) {
  const res = await api(`${collection}?filters[name][$eq]=${encodeURIComponent(name)}&locale=fr`);
  return res.data?.[0] ?? null;
}

async function findByTitle(collection, title) {
  const res = await api(`${collection}?filters[title][$eq]=${encodeURIComponent(title)}&locale=fr`);
  return res.data?.[0] ?? null;
}

async function upsertCollection(collection, slug, frData, enData) {
  const existing = await findBySlug(collection, slug);
  let docId;
  if (existing) {
    docId = existing.documentId;
    await api(`${collection}/${docId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: frData }),
    });
    await api(`${collection}/${docId}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    });
    console.log(`  ✓ updated ${collection}/${slug}`);
  } else {
    const created = await api(collection, {
      method: 'POST',
      body: JSON.stringify({ data: { ...frData, locale: 'fr' } }),
    });
    docId = created.data.documentId;
    await api(`${collection}/${docId}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    });
    console.log(`  + created ${collection}/${slug}`);
  }
  await publishCollectionDoc(collection, docId);
  return docId;
}

async function upsertByName(collection, name, frData, enData) {
  const existing = await findByName(collection, name);
  let docId;
  if (existing) {
    docId = existing.documentId;
    await api(`${collection}/${docId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: frData }),
    });
    if (enData) {
      await api(`${collection}/${docId}?locale=en`, {
        method: 'PUT',
        body: JSON.stringify({ data: enData }),
      });
    }
    console.log(`  ✓ updated ${collection}/${name}`);
  } else {
    const created = await api(collection, {
      method: 'POST',
      body: JSON.stringify({ data: { ...frData, locale: 'fr' } }),
    });
    docId = created.data.documentId;
    if (enData) {
      await api(`${collection}/${docId}?locale=en`, {
        method: 'PUT',
        body: JSON.stringify({ data: enData }),
      });
    }
    console.log(`  + created ${collection}/${name}`);
  }
  await publishDoc(`${collection}/${docId}`, 'fr');
  if (enData) await publishDoc(`${collection}/${docId}`, 'en');
  return docId;
}

async function upsertSingle(singleType, frData, enData) {
  try {
    await api(`${singleType}?locale=fr`);
    await api(`${singleType}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: frData }),
    });
    await api(`${singleType}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    });
    console.log(`  ✓ updated ${singleType}`);
  } catch {
    await api(singleType, {
      method: 'POST',
      body: JSON.stringify({ data: { ...frData, locale: 'fr' } }),
    });
    console.log(`  + created ${singleType}`);
  }
  await publishSingle(singleType);
}

// ─── Machines (collection type) ────────────────────────────────────────────

async function seedMachines() {
  console.log('\n📷 Seeding Machines…');

  const machines = [
    {
      slug: 'horizontal',
      fr: {
        title: 'Horizontal',
        subtitle: 'Packshots à plat',
        description:
          "L'Horizontal est conçue pour les packshots à plat : flat lays précis et cohérents, adaptés aux vêtements, accessoires ou compositions produits.",
        pricing: '120€ / 1 heure · 410€ / Demi-journée · 740€ / Journée',
        specs: [
          { label: 'Caméra', value: 'Canon EOS R · 24–105 mm motorisé' },
          { label: 'Pilotage', value: 'iPad · application intuitive' },
          { label: 'Éclairage', value: 'LED High-CRI continue' },
          { label: 'Détourage automatique', value: 'AutoAlpha™' },
          { label: 'Formats', value: 'JPG · PNG · TIFF · RAW' },
        ],
      },
      en: {
        title: 'Horizontal',
        subtitle: 'Flat packshots',
        description:
          'The Horizontal is built for flat packshots — precise, consistent flat lays for apparel, accessories and product compositions.',
        pricing: '€120 / 1 hour · €410 / Half day · €740 / Full day',
        specs: [
          { label: 'Camera', value: 'Canon EOS R · 24–105 mm motorized' },
          { label: 'Control', value: 'iPad · intuitive app' },
          { label: 'Lighting', value: 'High-CRI LED continuous' },
          { label: 'Auto clipping', value: 'AutoAlpha™' },
          { label: 'Formats', value: 'JPG · PNG · TIFF · RAW' },
        ],
      },
    },
    {
      slug: 'vertical',
      fr: {
        title: 'Vertical',
        subtitle: 'Mannequin ghost',
        description:
          'La Vertical est pensée pour les packshots textiles, particulièrement efficace pour le ghost, le piqué et les prises de vue e-commerce standardisées.',
        pricing: '120€ / 1 heure · 410€ / Demi-journée · 740€ / Journée',
        specs: [
          { label: 'Caméra', value: 'Canon EOS R · 70–200 mm motorisé' },
          { label: 'Pilotage', value: 'iPad · application intuitive' },
          { label: 'Éclairage', value: 'LED High-CRI continue' },
          { label: 'Détourage automatique', value: 'AutoAlpha™' },
          { label: 'Formats', value: 'JPG · PNG · TIFF · RAW' },
        ],
      },
      en: {
        title: 'Vertical',
        subtitle: 'Ghost mannequin',
        description:
          'The Vertical is built for textile packshots — particularly effective for ghost, hanging and standardized e-commerce shots.',
        pricing: '€120 / 1 hour · €410 / Half day · €740 / Full day',
        specs: [
          { label: 'Camera', value: 'Canon EOS R · 70–200 mm motorized' },
          { label: 'Control', value: 'iPad · intuitive app' },
          { label: 'Lighting', value: 'High-CRI LED continuous' },
          { label: 'Auto clipping', value: 'AutoAlpha™' },
          { label: 'Formats', value: 'JPG · PNG · TIFF · RAW' },
        ],
      },
    },
    {
      slug: 'eclipse',
      fr: {
        title: 'Eclipse',
        subtitle: 'Photo & vidéo 360°',
        description:
          "L'Eclipse est conçue pour les produits petits et moyens : chaussures, sacs, accessoires, objets design ou beauté, avec plateau tournant intégré pour le 360°.",
        pricing: '160€ / 1 heure · 560€ / Demi-journée · 990€ / Journée',
        specs: [
          { label: 'Caméra', value: 'Canon EOS R · 24–105 mm motorisé' },
          { label: 'Pilotage', value: 'iPad · application intuitive' },
          { label: 'Motorisation', value: '4 axes · hauteur · inclinaison · zoom · rotation 360°' },
          { label: 'Éclairage', value: 'LED High-CRI continue' },
          { label: 'Formats', value: 'JPG · PNG · TIFF · RAW · MP4 · MOV' },
        ],
      },
      en: {
        title: 'Eclipse',
        subtitle: 'Photo & video 360°',
        description:
          'The Eclipse is built for small and medium products — shoes, bags, accessories, design and beauty — with an integrated turntable for 360° shots.',
        pricing: '€160 / 1 hour · €560 / Half day · €990 / Full day',
        specs: [
          { label: 'Camera', value: 'Canon EOS R · 24–105 mm motorized' },
          { label: 'Control', value: 'iPad · intuitive app' },
          { label: 'Motion', value: '4 axes · height · tilt · zoom · 360° rotation' },
          { label: 'Lighting', value: 'High-CRI LED continuous' },
          { label: 'Formats', value: 'JPG · PNG · TIFF · RAW · MP4 · MOV' },
        ],
      },
    },
    {
      slug: 'live',
      fr: {
        title: 'Live',
        subtitle: 'Shooting porté',
        description:
          "La Live est notre solution dédiée au shooting sur modèle. Elle produit un contenu e-commerce cohérent, rapide et reproductible d'une session à l'autre.",
        pricing: '185€ / 1 heure · 620€ / Demi-journée · 1 120€ / Journée',
        specs: [
          { label: 'Caméra', value: 'Canon EOS R · 24–105 mm motorisé' },
          { label: 'Pilotage', value: 'iPad · application intuitive' },
          { label: 'Motorisation', value: '3 axes · hauteur · inclinaison · zoom' },
          { label: 'Éclairage', value: 'LED High-CRI continue' },
          { label: 'Formats', value: 'JPG · PNG · TIFF · RAW · MP4 · MOV' },
        ],
      },
      en: {
        title: 'Live',
        subtitle: 'On-model shooting',
        description:
          'The Live is our dedicated on-model shooting solution — consistent e-commerce content, fast to produce and easy to reproduce across sessions.',
        pricing: '€185 / 1 hour · €620 / Half day · €1,120 / Full day',
        specs: [
          { label: 'Camera', value: 'Canon EOS R · 24–105 mm motorized' },
          { label: 'Control', value: 'iPad · intuitive app' },
          { label: 'Motion', value: '3 axes · height · tilt · zoom' },
          { label: 'Lighting', value: 'High-CRI LED continuous' },
          { label: 'Formats', value: 'JPG · PNG · TIFF · RAW · MP4 · MOV' },
        ],
      },
    },
  ];

  for (const m of machines) {
    await upsertCollection(
      'machines',
      m.slug,
      { title: m.fr.title, slug: m.slug, subtitle: m.fr.subtitle, description: m.fr.description, pricing: m.fr.pricing, specs: m.fr.specs },
      { title: m.en.title, subtitle: m.en.subtitle, description: m.en.description, pricing: m.en.pricing, specs: m.en.specs },
    );
  }

  await upsertCollection(
    'machines',
    'cyclorama',
    {
      title: 'Cyclorama',
      slug: 'cyclorama',
      subtitle: 'Production libre',
      description:
        "Cyclo 2 faces de 30 m² pour photo et vidéo sur fond blanc infini. À la journée ou à la semaine, en production libre ou avec notre équipe.",
      pricing: '650€ / 5h · 880€ / 10h · Sur demande / 10h éditorial',
      pricingDescription: 'Remise en blanc 110 € · Électricité 1,40 €/kWh',
      usages: [
        { text: 'Campagne & éditorial' },
        { text: 'Film publicitaire' },
        { text: 'Packshot & still life' },
      ],
      specs: [
        { label: 'Surface', value: '240 m² · Cyclo 2 faces 32 m²' },
        { label: 'Dimensions', value: '6,3m L × 5,2m l × 5m H' },
        { label: 'Éclairage naturel', value: 'Skydomes occultable' },
        { label: 'Accès', value: 'Quai de livraison 3,5m L × 4,5m H' },
        { label: 'Extérieur', value: 'Accès direct, parking sur place' },
        { label: 'Électricité', value: '1 prise Marechal 63A triphasée · 15 prises 16A' },
        { label: 'Connectivité & son', value: 'Wi-Fi très haut débit · Sound system intégré' },
        { label: 'Maquillage', value: '2 postes maquillage équipés' },
        { label: 'Habillage', value: "2 cabines d'essayage" },
        { label: 'Cuisine', value: 'Entièrement équipée' },
      ],
    },
    {
      title: 'Cyclorama',
      subtitle: 'Free production',
      description:
        '30 m² 2-sided cyclorama for photo and video on an infinite white background. Daily or weekly, as a free-production rental or crewed.',
      pricing: '€650 / 5 hours · €880 / 10 hours · On request / 10 hours editorial',
      pricingDescription: 'Repaint €110 · Electricity €1.40/kWh',
      usages: [
        { text: 'Campaign & editorial' },
        { text: 'Advertising film' },
        { text: 'Packshot & still life' },
      ],
      specs: [
        { label: 'Surface', value: '240 m² · 2-sided cyclo 32 m²' },
        { label: 'Dimensions', value: '6.3m L × 5.2m W × 5m H' },
        { label: 'Natural light', value: 'Blackout skydomes' },
        { label: 'Access', value: 'Loading dock 3.5m L × 4.5m H' },
        { label: 'Exterior', value: 'Direct access, on-site parking' },
        { label: 'Electricity', value: '1 Marechal 63A 3-phase · 15 × 16A outlets' },
        { label: 'Connectivity & sound', value: 'High-speed Wi-Fi · Integrated sound system' },
        { label: 'Make-up', value: '2 equipped make-up stations' },
        { label: 'Dressing', value: '2 fitting rooms' },
        { label: 'Kitchen', value: 'Fully equipped' },
      ],
    },
  );
}

// ─── 3. Post-production types ─────────────────────────────────────────────

async function seedPostProdTypes() {
  console.log('\n✂️  Seeding Post-production types…');

  const types = [
    {
      slug: 'on-model',
      fr: {
        title: 'On model',
        description: 'Retouche peau, maquillage, cheveux et nettoyage textile.',
        price: 'À partir de 7,90€',
        includes: [
          { text: 'Détourage' },
          { text: 'Changement de fond' },
          { text: 'Nettoyage peau' },
          { text: 'Étalonnage couleur' },
          { text: 'Nettoyage textile' },
          { text: 'Harmonisation silhouette' },
        ],
      },
      en: {
        title: 'On model',
        description: 'Skin, make-up, hair retouch and fabric cleanup.',
        price: 'From €7.90',
        includes: [
          { text: 'Cutout' },
          { text: 'Background change' },
          { text: 'Skin cleanup' },
          { text: 'Color grading' },
          { text: 'Fabric cleanup' },
          { text: 'Silhouette harmonization' },
        ],
      },
    },
    {
      slug: 'ghost',
      fr: {
        title: 'Ghost',
        description:
          'Assemblage avant / arrière, disparition du mannequin, volume naturel. Doublures, cols ouverts et superpositions gérés.',
        price: 'À partir de 5,40€',
        includes: [
          { text: 'Détourage' },
          { text: 'Changement de fond' },
          { text: 'Disparition mannequin' },
          { text: 'Étalonnage couleur' },
          { text: 'Nettoyage textile' },
          { text: 'Revolumisation et harmonisation du vêtement' },
        ],
      },
      en: {
        title: 'Ghost',
        description:
          'Front / back assembly, mannequin removal, natural volume. Linings, open collars and layering handled.',
        price: 'From €5.40',
        includes: [
          { text: 'Cutout' },
          { text: 'Background change' },
          { text: 'Mannequin removal' },
          { text: 'Color grading' },
          { text: 'Fabric cleanup' },
          { text: 'Garment revolumizing & harmonization' },
        ],
      },
    },
    {
      slug: 'a-plat',
      fr: {
        title: 'Flat',
        description: 'Mise à plat stylée, découpe clean, ombre maîtrisée. Pour e-shop et éditorial.',
        price: 'À partir de 5,40€',
        includes: [
          { text: 'Détourage' },
          { text: 'Changement de fond' },
          { text: 'Nettoyage textile' },
          { text: 'Étalonnage couleur' },
          { text: 'Revolumisation et harmonisation du vêtement' },
        ],
      },
      en: {
        title: 'Flat',
        description: 'Styled flat lay, clean cutout, controlled shadow. For e-shop and editorial.',
        price: 'From €5.40',
        includes: [
          { text: 'Cutout' },
          { text: 'Background change' },
          { text: 'Fabric cleanup' },
          { text: 'Color grading' },
          { text: 'Garment revolumizing & harmonization' },
        ],
      },
    },
    {
      slug: 'accessoires',
      fr: {
        title: 'Accessoires',
        description: 'Traitement matières, cuirs, métaux, pierres. Détail et texture préservés.',
        price: 'À partir de 5,40€',
        includes: [
          { text: 'Détourage' },
          { text: 'Changement de fond' },
          { text: 'Nettoyage' },
          { text: 'Étalonnage couleur' },
          { text: 'Travail des matières et reflets' },
          { text: 'Revolumisation et harmonie des lignes' },
          { text: 'Mise en valeur des détails et textures' },
        ],
      },
      en: {
        title: 'Accessories',
        description: 'Materials, leather, metal, stones. Detail and texture preserved.',
        price: 'From €5.40',
        includes: [
          { text: 'Cutout' },
          { text: 'Background change' },
          { text: 'Cleanup' },
          { text: 'Color grading' },
          { text: 'Materials & reflections work' },
          { text: 'Revolumizing & line harmonization' },
          { text: 'Detail & texture enhancement' },
        ],
      },
    },
    {
      slug: 'pique',
      fr: {
        title: 'Piqué',
        description:
          'Pièce présentée sur mousse ou épingles, nettoyage complet des fixations et remise en forme.',
        price: 'À partir de 7,90€',
        includes: [
          { text: 'Détourage' },
          { text: 'Changement de fond' },
          { text: 'Nettoyage épingles & mousse' },
          { text: 'Étalonnage couleur' },
          { text: 'Nettoyage textile' },
          { text: 'Revolumisation et harmonisation du vêtement' },
        ],
      },
      en: {
        title: 'Pinned',
        description: 'Garment on foam or pins, full removal of fixings and reshaping.',
        price: 'From €7.90',
        includes: [
          { text: 'Cutout' },
          { text: 'Background change' },
          { text: 'Pin & foam cleanup' },
          { text: 'Color grading' },
          { text: 'Fabric cleanup' },
          { text: 'Garment revolumizing & harmonization' },
        ],
      },
    },
    {
      slug: 'high-end',
      fr: {
        title: 'High end',
        description:
          'Retouche haute couture : dodge & burn HD, compositing, matte-painting, pièce unique.',
        price: 'Sur devis',
        includes: [{ text: 'Retouche sur mesure' }],
      },
      en: {
        title: 'High end',
        description:
          'High-couture retouch: HD dodge & burn, compositing, matte-painting, one-of-a-kind.',
        price: 'On quote',
        includes: [{ text: 'Bespoke retouching' }],
      },
    },
    {
      slug: 'video',
      fr: {
        title: 'Vidéo',
        description:
          'Post-production vidéo de A à Z : détourage, montage, étalonnage, motion design. Formats e-com, social, campagne et film de marque.',
        price: 'Sur devis',
        includes: [
          { text: 'Détourage & montage' },
          { text: 'Étalonnage couleur' },
          { text: 'Motion design & titrages' },
          { text: 'Export multi-formats' },
        ],
      },
      en: {
        title: 'Video',
        description:
          'Full video post-production: cutout, editing, color grading, motion design. E-com, social, campaign and brand film formats.',
        price: 'On quote',
        includes: [
          { text: 'Cutout & editing' },
          { text: 'Color grading' },
          { text: 'Motion design & titles' },
          { text: 'Multi-format export' },
        ],
      },
    },
  ];

  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    await upsertCollection(
      'post-production-types',
      t.slug,
      { title: t.fr.title, slug: t.slug, description: t.fr.description, price: t.fr.price, includes: t.fr.includes },
      { title: t.en.title, description: t.en.description, price: t.en.price, includes: t.en.includes },
    );
  }
}

// ─── 4. Gallery categories ─────────────────────────────────────────────────

async function seedGalleryCategories() {
  console.log('\n🏷️  Seeding Gallery categories…');

  const cats = [
    { slug: 'pap', fr: 'Prêt-à-porter', en: 'Ready-to-wear' },
    { slug: 'accessoires', fr: 'Accessoires', en: 'Accessories' },
    { slug: 'eyewear', fr: 'Eyewear', en: 'Eyewear' },
    { slug: 'bijoux', fr: 'Bijoux', en: 'Jewelry' },
    { slug: 'cosmetique', fr: 'Cosmétique', en: 'Cosmetics' },
    { slug: 'food', fr: 'Food & Spiritueux', en: 'Food & Spirits' },
  ];

  const categoryDocIds = {};
  for (const cat of cats) {
    const docId = await upsertCollection(
      'gallery-categories',
      cat.slug,
      { name: cat.fr, slug: cat.slug },
      { name: cat.en },
    );
    categoryDocIds[cat.slug] = docId;
  }
  return categoryDocIds;
}

// Gallery brands and gallery projects are populated by the studio from the
// Strapi admin once real shoots are ready to publish. We intentionally do not
// seed fixture brands/projects — placeholder content would leak to production
// and the public site already handles an empty gallery gracefully.

// ─── 7. Blog categories ──────────────────────────────────────────────────

async function seedBlogCategories() {
  console.log('\n📂 Seeding Blog categories…');

  const cats = [
    { slug: 'tips', fr: 'Tips', en: 'Tips' },
    { slug: 'backstage', fr: 'Backstage', en: 'Backstage' },
    { slug: 'tendances', fr: 'Tendances', en: 'Trends' },
    { slug: 'clients', fr: 'Clients', en: 'Clients' },
  ];

  for (const cat of cats) {
    await upsertCollection(
      'blog-categories',
      cat.slug,
      { title: cat.fr, slug: cat.slug },
      { title: cat.en },
    );
  }
}

// ─── 8. Site settings ─────────────────────────────────────────────────────

async function seedSiteSettings() {
  console.log('\n⚙️  Seeding Site settings…');

  await upsertSingle(
    'site-setting',
    {
      siteTitle: 'E-Do Studio',
      siteDescription: 'Studio photo & vidéo e-commerce à Saint-Ouen. Production packshot, on-model, ghost, still life et direction artistique.',
      phone: '+33 1 44 04 11 49',
      phoneHref: 'tel:+33144041149',
      email: 'contact@e-do.studio',
      street: '69 boulevard Victor Hugo',
      city: 'Saint-Ouen',
      postalCode: '93400',
      country: 'France',
      fullAddress: "Parc d'activités Victor Hugo, Bât 6.7, 69 boulevard Victor Hugo, 93400 Saint-Ouen",
      googleMapsUrl: 'https://maps.google.com/?q=69+boulevard+Victor+Hugo+93400+Saint-Ouen',
      mapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2622.0!2d2.3345!3d48.9122!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z69+boulevard+Victor+Hugo+93400+Saint-Ouen!5e0!3m2!1sfr!2sfr!4v1',
      hours: 'Lun–Ven 10:00–18:00',
      weekendHours: 'Sam–Dim sur demande',
      defaultSeoTitle: 'E-Do Studio — Photo & Vidéo E-commerce',
      defaultSeoDescription: 'Studio photo et vidéo e-commerce à Saint-Ouen : packshot, on-model, ghost, still life, 360° et post-production.',
      socialLinks: [
        { platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/edostudio/' },
        { platform: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/company/e-do/' },
        { platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/EdoStudioAgency/' },
        { platform: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@edostudio' },
      ],
      transport: [
        { label: 'Métro 13 — Garibaldi' },
        { label: 'Métro 14 — Mairie de Saint-Ouen' },
      ],
      bentoKeywords: [
        { label: 'Food' },
        { label: 'Accessoires' },
        { label: 'Spiritueux' },
        { label: 'Cosmétique' },
        { label: 'Luxe' },
        { label: 'Mode' },
      ],
    },
    {
      siteTitle: 'E-Do Studio',
      siteDescription: 'E-commerce photo & video studio in Saint-Ouen. Packshot, on-model, ghost, still life production and art direction.',
      hours: 'Mon–Fri 10:00–18:00',
      weekendHours: 'Sat–Sun on request',
      defaultSeoTitle: 'E-Do Studio — E-commerce Photo & Video',
      defaultSeoDescription: 'E-commerce photo and video studio in Saint-Ouen: packshot, on-model, ghost, still life, 360° and post-production.',
    },
  );
}

// ─── 9. Legal sections ────────────────────────────────────────────────────

function paragraphsToBlocks(text) {
  return text.split(/\n\n+/).map((p) => ({
    type: 'paragraph',
    children: [{ type: 'text', text: p.trim() }],
  }));
}

async function findLegalBySlug(slug) {
  const res = await api(`legal-sections?filters[slug][$eq]=${slug}&locale=fr`);
  return res.data?.[0] ?? null;
}

async function upsertLegalSection(slug, frData, enData) {
  const existing = await findLegalBySlug(slug);
  let docId;
  if (existing) {
    docId = existing.documentId;
    await api(`legal-sections/${docId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: frData }),
    });
    await api(`legal-sections/${docId}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    });
    console.log(`  ✓ updated legal-sections/${slug}`);
  } else {
    const created = await api('legal-sections', {
      method: 'POST',
      body: JSON.stringify({ data: { ...frData, slug, locale: 'fr' } }),
    });
    docId = created.data.documentId;
    await api(`legal-sections/${docId}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    });
    console.log(`  + created legal-sections/${slug}`);
  }
  await publishCollectionDoc('legal-sections', docId);
  return docId;
}

async function seedLegalSections() {
  console.log('\n⚖️  Seeding Legal sections…');

  const sections = [
    // ── Mentions légales ──
    {
      slug: 'mentions-intro',
      documentKey: 'mentions',
      lastUpdatedAt: '2024-12-01',
      fr: {
        title: 'Introduction',
        body: "Informations légales relatives à l'édition et à l'exploitation du site www.e-do.studio.",
      },
      en: {
        title: 'Introduction',
        body: 'Legal information about the publication and operation of the www.e-do.studio website.',
      },
    },
    {
      slug: 'mentions-editeur',
      documentKey: 'mentions',
      lastUpdatedAt: '2024-12-01',
      fr: {
        title: 'Éditeur du site',
        body:
          "Raison sociale : GRW.\nForme juridique : Société par actions simplifiée.\nCapital social : 10 000 €.\nRCS : Bobigny · 891 710 857.\nN° TVA intracommunautaire : FR 41 891 710 857.\nPrésident : Monsieur Thomas Guedj.\nSiège social : 69, boulevard Victor Hugo · 93400 Saint-Ouen-sur-Seine.\nE-mail : contact@e-do.studio.",
      },
      en: {
        title: 'Publisher',
        body:
          'Company: GRW.\nLegal form: Simplified joint-stock company.\nShare capital: €10,000.\nTrade register: Bobigny · 891 710 857.\nVAT number: FR 41 891 710 857.\nPresident: Mr Thomas Guedj.\nRegistered office: 69, boulevard Victor Hugo · 93400 Saint-Ouen-sur-Seine.\nE-mail: contact@e-do.studio.',
      },
    },
    {
      slug: 'mentions-hebergement',
      documentKey: 'mentions',
      lastUpdatedAt: '2024-12-01',
      fr: {
        title: 'Hébergement',
        body:
          "Prestataire : SCALEWAY — société par actions simplifiée.\nCapital social : 66 043 360,50 €.\nAdresse : 8 rue de la Ville L'Évêque · 75008 Paris.\nRCS : Paris · 433 115 904.",
      },
      en: {
        title: 'Hosting',
        body:
          "Provider: SCALEWAY — simplified joint-stock company.\nShare capital: €66,043,360.50.\nAddress: 8 rue de la Ville L'Évêque · 75008 Paris.\nTrade register: Paris · 433 115 904.",
      },
    },
    {
      slug: 'mentions-propriete-intellectuelle',
      documentKey: 'mentions',
      lastUpdatedAt: '2024-12-01',
      fr: {
        title: 'Propriété intellectuelle',
        body:
          "L'ensemble des contenus présents sur www.e-do.studio (textes, images, vidéos, logos, code, marque) demeure la propriété exclusive de la société GRW ou de ses partenaires contractuels. Toute reproduction, représentation, diffusion ou exploitation, totale ou partielle, sans accord écrit préalable est interdite et susceptible de poursuites.",
      },
      en: {
        title: 'Intellectual property',
        body:
          'All content on www.e-do.studio (text, images, video, logos, code, trademarks) remains the exclusive property of GRW or its contractual partners. Any reproduction, representation, distribution or use, in whole or in part, without prior written consent is prohibited and may be subject to legal action.',
      },
    },

    // ── CGV ──
    {
      slug: 'cgv-intro',
      documentKey: 'cgv',
      lastUpdatedAt: '2024-12-05',
      fr: {
        title: 'Introduction',
        body:
          "Conditions générales de vente régissant les relations entre GRW (« E-DO ») et ses Clients pour l'ensemble des Services proposés. Version applicable à partir du 05/12/2024.",
      },
      en: {
        title: 'Introduction',
        body:
          'General terms of sale governing the relationship between GRW ("E-DO") and its Clients for all Services offered. Version applicable from 05/12/2024.',
      },
    },
    ...[
      [
        '01',
        "Objet — Champ d'application — Acceptation",
        'Purpose — Scope — Acceptance',
        "Les présentes CGV définissent les conditions et modalités selon lesquelles E-DO propose à ses Clients et réalise les Services. Elles s'appliquent à l'ensemble des Services proposés par E-DO et doivent être acceptées par le Client préalablement à toute souscription. Toute modification prend effet immédiatement à compter de sa mise en ligne.",
        'These T&Cs define the terms under which E-DO offers and delivers Services to its Clients. They apply to all Services offered by E-DO and must be accepted by the Client prior to any subscription. Any modification takes effect immediately upon being published online.',
      ],
      [
        '02',
        'Services proposés',
        'Services offered',
        "E-DO propose les Services « E-Commerce » (Live, Horizontal, Vertical, Eclipse), le Service « Cyclorama » (studio photo de 4,70 m de hauteur et 10 m de profondeur sur fond blanc infini) et le Service « Post-Production ». La réalisation peut être effectuée directement par le Client ou par E-DO sans déplacement nécessaire sur Site.",
        'E-DO offers "E-Commerce" Services (Live, Horizontal, Vertical, Eclipse), the "Cyclorama" Service (photo studio 4.70 m high and 10 m deep on infinite white background) and the "Post-Production" Service. Services may be performed directly by the Client or by E-DO with no need to travel on Site.',
      ],
      [
        '03',
        'Souscription & Devis',
        'Subscription & Quote',
        "La souscription aux Services « E-Commerce » s'effectue via le Module de Réservation ou par acceptation d'un Devis. Les Services « Cyclo » et « Post-Production » nécessitent l'acceptation d'un Devis daté et signé. L'acceptation est ferme et définitive, et vaut acceptation des CGV.",
        '"E-Commerce" Services are booked via the Booking Module or by accepting a Quote. "Cyclo" and "Post-Production" Services require acceptance of a dated and signed Quote. Acceptance is firm and final, and constitutes acceptance of these T&Cs.',
      ],
      [
        '04',
        'Prix des Services',
        'Pricing',
        "Tous les Prix sont exprimés en euros HT. Live : 170 €/h, 590 € la demi-journée (4 h), 1 020 € la journée (8 h). Horizontal & Vertical : 110 €/h, 390 € la demi-journée, 650 € la journée. Eclipse : 150 €/h, 530 € la demi-journée, 890 € la journée. Toute heure entamée est due. Majoration de 25 % pour les week-ends et jours fériés. Le Service Live inclut 3 m de papier colorama (15 € HT le mètre supplémentaire).",
        'All prices are in euros excluding VAT. Live: €170/h, €590 half-day (4 h), €1,020 day (8 h). Horizontal & Vertical: €110/h, €390 half-day, €650 day. Eclipse: €150/h, €530 half-day, €890 day. Any started hour is owed in full. 25% surcharge for weekends and public holidays. The Live Service includes 3 m of colorama paper (€15 excl. VAT per additional metre).',
      ],
      [
        '05',
        'Modalités de paiement',
        'Payment terms',
        "Le règlement s'effectue par prélèvement, virement bancaire ou via la plateforme du Prestataire de Paiement (STRIPE). Le délai de paiement est de quinze (15) jours à compter de l'émission de la facture. Tout retard entraîne des pénalités au taux directeur semestriel de la BCE majoré de 10 points, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement.",
        "Payment is made by direct debit, bank transfer or via the Payment Provider's platform (STRIPE). Payment is due within fifteen (15) days of invoice issuance. Late payment incurs penalties at the semi-annual ECB key rate plus 10 points, plus a flat €40 recovery fee.",
      ],
      [
        '06',
        'Rendez-vous & Annulation',
        'Appointments & Cancellation',
        "L'Utilisateur qui a confirmé son rendez-vous s'engage à l'honorer. En cas de rendez-vous confirmé et non honoré, E-DO se réserve le droit de facturer le Service au Client selon les modalités choisies lors de la Réservation. Le non-règlement de la facture entraîne l'impossibilité de télécharger les Images et la suspension du Compte Personnel.",
        'A Client who confirms an appointment commits to honouring it. If a confirmed appointment is not honoured, E-DO reserves the right to invoice the Service per the booking terms. Non-payment prevents Image downloads and triggers suspension of the Personal Account.',
      ],
      [
        '07',
        'Responsabilités & Garanties',
        'Liability & Warranties',
        "E-DO s'engage à réaliser les Services avec diligence et professionnalisme, étant tenue d'une obligation de moyens. Les délais de livraison des Images sont indicatifs. Toute dégradation du matériel mis à disposition par E-DO entraînera la facturation du coût de réparation ou de remplacement. Dans le cadre du Service « Post-Production », le Client bénéficie de deux allers-retours de commentaires dans un délai de quinze jours.",
        'E-DO undertakes to perform the Services diligently and professionally, with a best-efforts obligation. Image delivery times are indicative. Any damage to equipment made available by E-DO will be invoiced at repair or replacement cost. Under the "Post-Production" Service, the Client is entitled to two rounds of feedback within fifteen days.',
      ],
      [
        '08',
        'Résiliation',
        'Termination',
        "En cas de manquement par l'une des Parties, auquel il n'aura pas été remédié dans un délai de huit (8) jours à compter de la notification, la Partie affectée pourra résilier la souscription aux Services ou solliciter le remboursement du Prix payé, sous réserve que le manquement soit prouvé.",
        'In the event of a breach by either Party, not remedied within eight (8) days of notification, the affected Party may terminate the subscription to Services or request reimbursement of the Price paid, subject to proof of the breach.',
      ],
      [
        '09',
        'Propriété intellectuelle',
        'Intellectual property',
        "E-DO cède à titre exclusif, définitif et irrévocable l'intégralité des Droits de Propriété Intellectuelle afférents aux Images dont le Prix a été réglé, pour toute la durée des droits et pour le monde entier. Par exception, en cas d'Images réalisées suivant une direction artistique conduite par E-DO, seul un contrat de licence sera conclu.",
        'E-DO assigns exclusively, definitively and irrevocably all Intellectual Property Rights to Images for which Payment has been received, for the entire duration of the rights and worldwide. As an exception, where Images follow an artistic direction led by E-DO, only a licence agreement will be concluded.',
      ],
      [
        '10',
        'Confidentialité',
        'Confidentiality',
        "E-DO s'engage à conserver le caractère confidentiel des Informations Confidentielles transmises par le Client et à ne pas les communiquer à des tiers, sauf accord préalable du Client ou obligation légale.",
        'E-DO undertakes to maintain the confidentiality of Confidential Information shared by the Client and not to disclose it to third parties without prior consent or legal obligation.',
      ],
      [
        '11',
        'Force majeure',
        'Force majeure',
        "Les Parties ne sont pas tenues responsables d'un manquement résultant d'un cas de force majeure défini par l'article 1218 du Code civil. La Partie affectée doit en informer l'autre par écrit dans les 48 heures. Au-delà de 30 jours de suspension, chaque Partie peut résilier de plein droit les CGV.",
        'The Parties are not liable for breaches arising from force majeure as defined in article 1218 of the French Civil Code. The affected Party must notify the other in writing within 48 hours. Beyond 30 days of suspension, either Party may terminate by right.',
      ],
      [
        '12',
        'Droit applicable & litiges',
        'Governing law & disputes',
        "Les présentes CGV sont soumises au droit français. Toute réclamation est à adresser par courriel à app@e-do.studio. À défaut d'accord amiable dans les 30 jours, tout litige relèvera de la compétence exclusive du Tribunal de commerce de Paris.",
        'These T&Cs are governed by French law. Any complaint should be sent to app@e-do.studio. Failing amicable settlement within 30 days, any dispute falls under the exclusive jurisdiction of the Commercial Court of Paris.',
      ],
    ].map(([n, frT, enT, frP, enP], i) => ({
      slug: `cgv-art-${n}`,
      documentKey: 'cgv',
      lastUpdatedAt: '2024-12-05',
      fr: { title: `Art. ${n} — ${frT}`, body: frP },
      en: { title: `Art. ${n} — ${enT}`, body: enP },
    })),

    // ── CGU ──
    {
      slug: 'cgu-intro',
      documentKey: 'cgu',
      lastUpdatedAt: '2024-12-05',
      fr: {
        title: 'Introduction',
        body:
          "Conditions générales d'utilisation du site www.e-do.studio régissant les relations entre GRW et les Utilisateurs. Version applicable à partir du 05/12/2024.",
      },
      en: {
        title: 'Introduction',
        body:
          'General terms of use for www.e-do.studio governing the relationship between GRW and Users. Version applicable from 05/12/2024.',
      },
    },
    ...[
      [
        '01',
        'Objet du Site Web',
        'Purpose of the Website',
        "Le Site Web présente aux Utilisateurs les Services proposés par E-DO, met à disposition le Module de Réservation et l'Application E-DO, et permet de contacter E-DO pour faire part d'un Projet, d'une demande de rendez-vous ou de devis.",
        'The Website presents the Services offered by E-DO, provides access to the Booking Module and the E-DO Application, and allows users to contact E-DO with a Project, an appointment request or a quote request.',
      ],
      [
        '02',
        'Module de Réservation',
        'Booking Module',
        "Le Module de Réservation, accessible via l'onglet « Réserve une séance », permet de réserver des créneaux pour les Services E-Commerce. L'Utilisateur choisit la catégorie de Service et la durée (minimum 1 heure), puis la date et l'heure, renseigne ses coordonnées et celles de la société, répond aux questions précises, accepte les CGV et confirme le rendez-vous.",
        'The Booking Module, accessible via the "Book a session" tab, lets users reserve slots for E-Commerce Services. The User selects the Service category and duration (minimum 1 hour), then date and time, enters personal and company details, answers the questions, accepts the T&Cs and confirms the appointment.',
      ],
      [
        '03',
        'Réservation du Service Cyclo',
        'Cyclo Service booking',
        "L'Utilisateur peut effectuer une demande de réservation du Service « CYCLO » en cliquant sur l'icône « Réserver » depuis l'onglet « Cyclo », ou en remplissant le formulaire depuis l'onglet « Contact », et en acceptant les CGV. La souscription définitive est effectuée selon les modalités prévues aux CGV.",
        'Users may request booking of the "CYCLO" Service by clicking "Book" from the "Cyclo" tab or by filling in the form from the "Contact" tab, and accepting the T&Cs. Final subscription follows the terms set out in the T&Cs.',
      ],
      [
        '04',
        'Application E-DO — Comptes',
        'E-DO Application — Accounts',
        "L'Application E-DO est l'interface privilégiée entre les Utilisateurs et E-DO. Le Compte Administrateur de Marque est accessible via identifiant et mot de passe communiqués par E-DO ; il doit être configuré avec les coordonnées de la société, l'adresse de facturation, le SIREN et les coordonnées bancaires. E-DO exclut toute responsabilité liée au choix ou à l'usage de l'identifiant et du mot de passe.",
        'The E-DO Application is the primary interface between Users and E-DO. The Brand Administrator Account is accessible with credentials provided by E-DO and must be configured with company details, billing address, SIREN number and bank details. E-DO disclaims any liability related to credential choice or use.',
      ],
      [
        '05',
        'Mise à disposition des Images',
        'Image delivery',
        "Les Images, retouchées le cas échéant, sont mises à disposition du Client via l'Application E-DO. Le Client peut effectuer deux allers-retours de commentaires dans un délai de quinze jours dans le cadre du Service Post-Production. Le téléchargement est conditionné au règlement complet du Prix.",
        'Images, retouched where applicable, are delivered through the E-DO Application. The Client may submit two rounds of feedback within fifteen days under the Post-Production Service. Downloading is subject to full payment of the Price.',
      ],
      [
        '06',
        'Obligations des Utilisateurs',
        'User obligations',
        "Toutes les informations renseignées par l'Utilisateur doivent être exactes. L'Utilisateur s'engage à utiliser le Site Web et l'Application conformément à leur destination, à respecter les droits des tiers, et à ne pas porter atteinte au fonctionnement du Site.",
        'All information provided by the User must be accurate. Users undertake to use the Website and Application in accordance with their purpose, to respect third-party rights, and not to interfere with the operation of the Site.',
      ],
      [
        '07',
        'Disponibilité du Site',
        'Site availability',
        "E-DO s'efforce d'assurer la disponibilité du Site Web 24h/24 et 7j/7. E-DO se réserve néanmoins le droit, sans préavis ni indemnité, de suspendre temporairement l'accès pour maintenance, mise à jour, ou en cas de cas de force majeure.",
        'E-DO strives to keep the Website available 24/7. E-DO reserves the right, without notice or compensation, to temporarily suspend access for maintenance, updates, or in cases of force majeure.',
      ],
      [
        '08',
        'Droit applicable',
        'Governing law',
        "Les présentes CGU sont soumises au droit français. Tout litige qui n'aurait pas trouvé de solution amiable relèvera de la compétence du Tribunal de commerce de Paris.",
        'These Terms of Use are governed by French law. Any dispute not resolved amicably falls under the jurisdiction of the Commercial Court of Paris.',
      ],
    ].map(([n, frT, enT, frP, enP], i) => ({
      slug: `cgu-art-${n}`,
      documentKey: 'cgu',
      lastUpdatedAt: '2024-12-05',
      fr: { title: `Art. ${n} — ${frT}`, body: frP },
      en: { title: `Art. ${n} — ${enT}`, body: enP },
    })),

    // ── Privacy ──
    {
      slug: 'privacy-intro',
      documentKey: 'privacy',
      lastUpdatedAt: '2024-12-01',
      fr: {
        title: 'Introduction',
        body:
          "En application du RGPD et de la loi Informatique et Libertés, GRW (ci-après « GRW ») a adopté la présente politique relative à la confidentialité et à la protection des données personnelles des Utilisateurs du site https://www.e-do.studio.",
      },
      en: {
        title: 'Introduction',
        body:
          'In accordance with the GDPR and the French Data Protection Act, GRW (hereinafter "GRW") has adopted this policy on the confidentiality and protection of personal data of Users of https://www.e-do.studio.',
      },
    },
    ...[
      [
        '01',
        'Responsable du traitement',
        'Data controller',
        "GRW, société par actions simplifiée au capital de 10 000 €, siège au 69 boulevard Victor Hugo, 93400 Saint-Ouen-sur-Seine, RCS Bobigny 891 710 857, est le responsable du traitement des données personnelles collectées et traitées afin de mettre en œuvre les Services. Contact : contact@e-do.studio.",
        'GRW, simplified joint-stock company with capital of €10,000, registered office at 69 boulevard Victor Hugo, 93400 Saint-Ouen-sur-Seine, RCS Bobigny 891 710 857, is the controller of personal data collected and processed to deliver the Services. Contact: contact@e-do.studio.',
      ],
      [
        '02',
        'Données collectées',
        'Data collected',
        "Onglet Contact : nom, prénom, numéro de téléphone, adresse électronique, message écrit. Compte personnel : noms, prénoms, adresse de facturation, fonction/rôle, coordonnées bancaires, message écrit. Sont également collectées les informations transmises lors d'une inscription à la newsletter, les informations issues des cookies acceptés par l'internaute, et les mesures d'audience avec adresses IP masquées (anonymisées).",
        'Contact tab: surname, first name, phone number, e-mail address, written message. Personal account: surnames, first names, billing address, role, bank details, written message. Also collected: information submitted via newsletter sign-up, information from cookies accepted by the user, and audience metrics with masked (anonymised) IP addresses.',
      ],
      [
        '03',
        'Localisation des données',
        'Data location',
        "Les données personnelles collectées sur notre site internet sont hébergées en France. GRW fait ses meilleurs efforts pour maintenir les données exactes et complètes ; vous pouvez nous communiquer toute mise à jour de vos coordonnées.",
        'Personal data collected on our website is hosted in France. GRW makes its best efforts to keep the data accurate and complete; you may notify us of any update to your details.',
      ],
      [
        '04',
        'Finalités & bases légales',
        'Purposes & legal bases',
        "Exécution du contrat : mise en œuvre des Services, communication avec vous, traitement des paiements, gestion des Devis et de l'acceptation de la présente Politique. Intérêt légitime : analyses statistiques et marketing, enquêtes de satisfaction, amélioration du site, prévention des abus et de la fraude, respect des obligations légales. Consentement : prospection commerciale pour services non analogues.",
        'Contract performance: Service delivery, communicating with you, processing payments, Quote management and acceptance of this Policy. Legitimate interest: statistical and marketing analysis, satisfaction surveys, site improvement, abuse and fraud prevention, legal compliance. Consent: marketing for non-similar services.',
      ],
      [
        '05',
        'Cookies',
        'Cookies',
        "GRW ne collecte pas de cookies sans consentement préalable, à l'exception de ceux exemptés par la CNIL (authentification, choix de cookies, personnalisation de l'interface, équilibrage de charge, mesure d'audience). À ce jour, vous pouvez accepter ou refuser les cookies via le bandeau affiché lors de votre navigation. Les cookies sont conservés pour une durée maximale de 13 mois.",
        'GRW does not place cookies without prior consent, except for those exempted by the CNIL (authentication, cookie choice, interface personalisation, load balancing, audience measurement). You may accept or refuse cookies via the banner displayed while browsing. Cookies are retained for a maximum of 13 months.',
      ],
      [
        '06',
        'Destinataires des données',
        'Data recipients',
        "Les données personnelles peuvent être transmises : aux personnes habilitées de GRW ; à Monsieur Guillaume Coutant (entrepreneur individuel SIRET 89262837100015) en charge du référencement SEO du site ; aux autorités administratives et judiciaires en cas d'obligation légale ; en tant que de besoin, à nos conseils juridiques et avocats.",
        'Personal data may be shared with: authorised GRW staff; Mr Guillaume Coutant (sole trader SIRET 89262837100015) in charge of SEO; administrative and judicial authorities where legally required; and, as needed, our legal counsel.',
      ],
      [
        '07',
        'Sécurité',
        'Security',
        "GRW met en œuvre des mesures organisationnelles, techniques, logicielles et physiques pour protéger les données personnelles contre toute perte, accès non autorisé, divulgation ou altération. Vous restez responsable du maintien de la confidentialité de vos identifiants et mots de passe.",
        'GRW implements organisational, technical, software and physical measures to protect personal data against loss, unauthorised access, disclosure or alteration. You remain responsible for keeping your credentials confidential.',
      ],
      [
        '08',
        'Conservation des données',
        'Data retention',
        "Les données nécessaires à la réalisation des Services sont conservées pendant la durée de la prestation et les cinq années suivantes, à des fins de preuve. Lorsque les données sont utilisées à des fins de marketing, la conservation peut aller jusqu'à trois ans suivant la date du dernier contact.",
        'Data needed to perform the Services is retained for the duration of the service plus the following five years, for evidentiary purposes. When data is used for marketing, it may be retained for up to three years after the last contact.',
      ],
      [
        '09',
        'Vos droits',
        'Your rights',
        "Vous disposez d'un droit d'accès, de rectification, de retrait, d'effacement, de portabilité, de limitation et d'opposition, ainsi que du droit d'organiser le sort de vos données après votre décès. Pour les exercer, contactez contact@e-do.studio. Vous pouvez également introduire une réclamation auprès de la CNIL — 3 Place de Fontenoy, 75007 Paris — www.cnil.fr.",
        'You have rights of access, rectification, withdrawal, erasure, portability, restriction and objection, plus the right to give post-mortem instructions on your data. To exercise: contact@e-do.studio. You may also file a complaint with the CNIL — 3 Place de Fontenoy, 75007 Paris — www.cnil.fr.',
      ],
    ].map(([n, frT, enT, frP, enP], i) => ({
      slug: `privacy-art-${n}`,
      documentKey: 'privacy',
      lastUpdatedAt: '2024-12-01',
      fr: { title: `Art. ${n} — ${frT}`, body: frP },
      en: { title: `Art. ${n} — ${enT}`, body: enP },
    })),

    // ── Cookies ──
    {
      slug: 'cookies-intro',
      documentKey: 'cookies',
      lastUpdatedAt: '2024-12-01',
      fr: {
        title: 'Introduction',
        body:
          "GRW collecte des cookies — fichiers texte stockés par votre navigateur — et n'en dépose pas sans consentement préalable, à l'exception de ceux exemptés par la CNIL. Conservation : 13 mois maximum par cookie.",
      },
      en: {
        title: 'Introduction',
        body:
          'GRW uses cookies — text files stored by your browser — and does not place any without prior consent, except those exempted by the CNIL. Retention: maximum 13 months per cookie.',
      },
    },
    {
      slug: 'cookies-list',
      documentKey: 'cookies',
      lastUpdatedAt: '2024-12-01',
      fr: {
        title: 'Cookies utilisés',
        body:
          "edo_session — Session utilisateur — Essentiel — Durée : Session — Émis par GRW.\n\nedo_consent — Mémorisation du choix de cookies — Essentiel — Durée : 13 mois — Émis par GRW.\n\nedo_lang — Préférence de langue — Essentiel — Durée : 13 mois — Émis par GRW.\n\nedo_auth — Authentification compte — Essentiel — Durée : Session — Émis par GRW.\n\n_audience — Mesure d'audience (IP anonymisée) — Mesure — Durée : 13 mois — Émis par GRW.",
      },
      en: {
        title: 'Cookies used',
        body:
          'edo_session — User session — Essential — Duration: Session — Issued by GRW.\n\nedo_consent — Cookie choice memo — Essential — Duration: 13 months — Issued by GRW.\n\nedo_lang — Language preference — Essential — Duration: 13 months — Issued by GRW.\n\nedo_auth — Account authentication — Essential — Duration: Session — Issued by GRW.\n\n_audience — Audience measurement (anonymised IP) — Measure — Duration: 13 months — Issued by GRW.',
      },
    },
    {
      slug: 'cookies-consent',
      documentKey: 'cookies',
      lastUpdatedAt: '2024-12-01',
      fr: {
        title: 'Consentement',
        body:
          "Vous pouvez « accepter » ou « refuser » les cookies via le bandeau qui s'affiche lors de votre navigation. À défaut d'action, la poursuite de la navigation vaut acceptation. Vous pouvez à tout moment modifier votre choix en effaçant les cookies depuis les préférences de votre navigateur, ou en nous écrivant à contact@e-do.studio.",
      },
      en: {
        title: 'Consent',
        body:
          'You may "accept" or "refuse" cookies via the banner displayed during your browsing. Continuing to browse without action is considered acceptance. You may modify your choice at any time by clearing cookies in your browser preferences or writing to contact@e-do.studio.',
      },
    },
  ];

  for (const s of sections) {
    await upsertLegalSection(
      s.slug,
      {
        title: s.fr.title,
        body: paragraphsToBlocks(s.fr.body),
        documentKey: s.documentKey,
        lastUpdatedAt: s.lastUpdatedAt,
      },
      {
        title: s.en.title,
        body: paragraphsToBlocks(s.en.body),
      },
    );
  }
}

// ─── 10. Contact subjects ─────────────────────────────────────────────────

async function findContactSubjectByKey(key) {
  const res = await api(`contact-subjects?filters[key][$eq]=${key}&locale=fr`);
  return res.data?.[0] ?? null;
}

async function upsertContactSubject(key, frData, enData) {
  const existing = await findContactSubjectByKey(key);
  let docId;
  if (existing) {
    docId = existing.documentId;
    await api(`contact-subjects/${docId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: frData }),
    });
    await api(`contact-subjects/${docId}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    });
    console.log(`  ✓ updated contact-subjects/${key}`);
  } else {
    const created = await api('contact-subjects', {
      method: 'POST',
      body: JSON.stringify({ data: { ...frData, key, locale: 'fr' } }),
    });
    docId = created.data.documentId;
    await api(`contact-subjects/${docId}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    });
    console.log(`  + created contact-subjects/${key}`);
  }
  await publishCollectionDoc('contact-subjects', docId);
  return docId;
}

async function seedContactSubjects() {
  console.log('\n📨 Seeding Contact subjects…');

  const subjects = [
    { key: 'general', fr: 'Question générale', en: 'General enquiry' },
    { key: 'reserver', fr: 'Réserver un plateau', en: 'Book a stage' },
    { key: 'ecom', fr: 'Production e-commerce', en: 'E-commerce production' },
    { key: 'visite', fr: 'Visite du studio', en: 'Studio visit' },
  ];

  for (const s of subjects) {
    await upsertContactSubject(
      s.key,
      { name: s.fr },
      { name: s.en },
    );
  }
}

// ─── 11. Team members ─────────────────────────────────────────────────────

async function seedTeamMembers() {
  console.log('\n👥 Seeding Team members…');

  const members = [
    { name: 'Thomas Guedj', fr: 'Direction & administration', en: 'Director & administration', email: null },
    { name: 'Benoît Cougny', fr: 'Planification & production', en: 'Planning & production', email: null },
    { name: 'Phan Vo', fr: 'Image & post-production', en: 'Image & post-production', email: null },
    { name: 'Théo Daguier', fr: 'Support technique', en: 'Technical support', email: null },
    { name: 'Service général', fr: 'Accueil & informations', en: 'Reception & information', email: 'contact@e-do.studio', enName: 'General enquiries' },
  ];

  for (const m of members) {
    const frData = { name: m.name, role: m.fr };
    if (m.email) frData.email = m.email;
    const enData = { name: m.enName ?? m.name, role: m.en };
    await upsertByName('team-members', m.name, frData, enData);
  }
}

// ─── 12. Blog posts (populate bodies where missing) ────────────────────────

async function seedBlogPosts() {
  console.log('\n📝 Checking Blog posts for missing content…');

  const res = await api('blog-posts?locale=fr&pagination[pageSize]=50');
  const posts = res.data ?? [];
  let updated = 0;

  for (const post of posts) {
    if (!post.body || post.body.trim() === '') {
      const excerpt = post.excerpt ?? '';
      const placeholder = `${excerpt}\n\n*Contenu complet à venir.*`;
      const placeholderEn = `${excerpt}\n\n*Full content coming soon.*`;

      await api(`blog-posts/${post.documentId}?locale=fr`, {
        method: 'PUT',
        body: JSON.stringify({ data: { body: placeholder } }),
      });
      await api(`blog-posts/${post.documentId}?locale=en`, {
        method: 'PUT',
        body: JSON.stringify({ data: { body: placeholderEn } }),
      });
      await publishCollectionDoc('blog-posts', post.documentId);
      updated++;
      console.log(`  ✓ added placeholder body to blog-posts/${post.slug}`);
    }
  }

  if (updated === 0) console.log('  All blog posts already have body content.');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding Strapi CMS at ${STRAPI_URL}`);
  console.log('='.repeat(50));

  await seedMachines();
  await seedPostProdTypes();
  await seedGalleryCategories();
  await seedBlogCategories();
  await seedSiteSettings();
  await seedLegalSections();
  await seedContactSubjects();
  await seedTeamMembers();
  await seedBlogPosts();

  console.log('\n' + '='.repeat(50));
  console.log('Seed complete.');
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
