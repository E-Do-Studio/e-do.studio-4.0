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
  return res.json();
}

async function findBySlug(collection, slug) {
  const res = await api(`${collection}?filters[slug][$eq]=${slug}&locale=fr`);
  return res.data?.[0] ?? null;
}

async function upsertCollection(collection, slug, frData, enData) {
  const existing = await findBySlug(collection, slug);
  if (existing) {
    const docId = existing.documentId;
    await api(`${collection}/${docId}?locale=fr`, {
      method: 'PUT',
      body: JSON.stringify({ data: frData }),
    });
    await api(`${collection}/${docId}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    });
    console.log(`  ✓ updated ${collection}/${slug}`);
    return docId;
  } else {
    const created = await api(collection, {
      method: 'POST',
      body: JSON.stringify({ data: { ...frData, locale: 'fr' } }),
    });
    const docId = created.data.documentId;
    await api(`${collection}/${docId}?locale=en`, {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    });
    console.log(`  + created ${collection}/${slug}`);
    return docId;
  }
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
}

// ─── 1. Cyclorama (single type) ────────────────────────────────────────────

async function seedCyclorama() {
  console.log('\n🎬 Seeding Cyclorama…');

  const specs = {
    fr: [
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
    en: [
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
  };

  const amenities = {
    fr: [
      { text: 'Campagne & éditorial' },
      { text: 'Film publicitaire' },
      { text: 'Packshot & still life' },
    ],
    en: [
      { text: 'Campaign & editorial' },
      { text: 'Advertising film' },
      { text: 'Packshot & still life' },
    ],
  };

  await upsertSingle(
    'cyclorama',
    {
      title: 'Cyclorama',
      subtitle: 'Production libre',
      description:
        "Cyclo 2 faces de 30 m² pour photo et vidéo sur fond blanc infini. À la journée ou à la semaine, en production libre ou avec notre équipe.",
      pricing: '650€ / 5h · 880€ / 10h · Sur demande / 10h éditorial',
      pricingDescription: 'Remise en blanc 110 € · Électricité 1,40 €/kWh',
      specs: specs.fr,
      amenities: amenities.fr,
    },
    {
      title: 'Cyclorama',
      subtitle: 'Free production',
      description:
        '30 m² 2-sided cyclorama for photo and video on an infinite white background. Daily or weekly, as a free-production rental or crewed.',
      pricing: '€650 / 5 hours · €880 / 10 hours · On request / 10 hours editorial',
      pricingDescription: 'Repaint €110 · Electricity €1.40/kWh',
      specs: specs.en,
      amenities: amenities.en,
    },
  );
}

// ─── 2. Machines (collection type) ─────────────────────────────────────────

async function seedMachines() {
  console.log('\n📷 Seeding Machines…');

  const machines = [
    {
      slug: 'horizontal',
      rank: 2,
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
      rank: 3,
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
      rank: 4,
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
      rank: 5,
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
      { title: m.fr.title, slug: m.slug, subtitle: m.fr.subtitle, description: m.fr.description, pricing: m.fr.pricing, specs: m.fr.specs, rank: m.rank },
      { title: m.en.title, subtitle: m.en.subtitle, description: m.en.description, pricing: m.en.pricing, specs: m.en.specs },
    );
  }

  // Also ensure the Cyclorama entry in the machines collection has full data
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
      operatorPricing: 'Remise en blanc 110 € · Électricité 1,40 €/kWh',
      rank: 1,
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
      operatorPricing: 'Repaint €110 · Electricity €1.40/kWh',
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

// ─── 3. Post-production types (includes / features) ────────────────────────

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
      { title: t.fr.title, slug: t.slug, description: t.fr.description, price: t.fr.price, includes: t.fr.includes, rank: i + 1 },
      { title: t.en.title, description: t.en.description, price: t.en.price, includes: t.en.includes },
    );
  }
}

// ─── 4. Gallery categories ─────────────────────────────────────────────────

async function seedGalleryCategories() {
  console.log('\n🏷️  Seeding Gallery categories…');

  const cats = [
    { slug: 'pap', fr: 'Prêt-à-porter', en: 'Ready-to-wear', rank: 1 },
    { slug: 'accessoires', fr: 'Accessoires', en: 'Accessories', rank: 2 },
    { slug: 'eyewear', fr: 'Eyewear', en: 'Eyewear', rank: 3 },
    { slug: 'bijoux', fr: 'Bijoux', en: 'Jewelry', rank: 4 },
    { slug: 'cosmetique', fr: 'Cosmétique', en: 'Cosmetics', rank: 5 },
    { slug: 'food', fr: 'Food & Spiritueux', en: 'Food & Spirits', rank: 6 },
  ];

  for (const cat of cats) {
    await upsertCollection(
      'gallery-categories',
      cat.slug,
      { name: cat.fr, slug: cat.slug, rank: cat.rank },
      { name: cat.en },
    );
  }
}

// ─── 5. Gallery brands ─────────────────────────────────────────────────────

async function seedGalleryBrands() {
  console.log('\n💎 Seeding Gallery brands…');

  const brands = [
    { name: 'JEAN PAUL GAULTIER', rank: 1 },
    { name: 'BALENCIAGA', rank: 2 },
    { name: 'COPERNI', rank: 3 },
    { name: 'CARVEN', rank: 4 },
    { name: 'THE KOOPLES', rank: 5 },
    { name: 'VUARNET', rank: 6 },
    { name: 'GIAMBATTISTA VALLI', rank: 7 },
    { name: 'NUMÉRO', rank: 8 },
    { name: 'JOHN LOBB', rank: 9 },
    { name: 'HARTFORD', rank: 10 },
    { name: 'INOUI', rank: 11 },
    { name: 'DIPTYQUE', rank: 12 },
    { name: 'RIMOWA', rank: 13 },
    { name: 'NODALETO', rank: 14 },
    { name: 'LCD', rank: 15 },
  ];

  for (const b of brands) {
    const res = await api(`gallery-brands?filters[name][$eq]=${encodeURIComponent(b.name)}`);
    const existing = res.data?.[0];
    if (existing) {
      await api(`gallery-brands/${existing.documentId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: { name: b.name, rank: b.rank } }),
      });
      console.log(`  ✓ updated gallery-brands/${b.name}`);
    } else {
      await api('gallery-brands', {
        method: 'POST',
        body: JSON.stringify({ data: { name: b.name, rank: b.rank } }),
      });
      console.log(`  + created gallery-brands/${b.name}`);
    }
  }
}

// ─── 6. Gallery projects ───────────────────────────────────────────────────

async function seedGalleryProjects() {
  console.log('\n🖼️  Seeding Gallery projects…');

  const projects = [
    { slug: 'maison-ortho', title: 'Maison Ortho', stage: 'cyclorama', year: 2026, cat: 'pap', rank: 1 },
    { slug: 'le-monde-beryl', title: 'Le Monde Béryl', stage: 'horizontal', year: 2026, cat: 'accessoires', rank: 2 },
    { slug: 'atelier-soie', title: 'Atelier Soie', stage: 'vertical', year: 2026, cat: 'pap', rank: 3 },
    { slug: 'koji-chapter-3', title: 'Kôji', stage: 'eclipse', year: 2025, cat: 'eyewear', rank: 4 },
    { slug: 'rue-saint-honore', title: 'Rue Saint-Honoré', stage: 'horizontal', year: 2025, cat: 'cosmetique', rank: 5 },
    { slug: 'ganymede', title: 'Ganymède', stage: 'eclipse', year: 2025, cat: 'bijoux', rank: 6 },
    { slug: 'moa-studio-fw26', title: 'Moa Studio', stage: 'live', year: 2026, cat: 'pap', rank: 7 },
    { slug: 'maison-margin', title: 'Maison Margin', stage: 'vertical', year: 2025, cat: 'pap', rank: 8 },
    { slug: 'toby-ombre', title: 'Toby Ombré', stage: 'horizontal', year: 2026, cat: 'food', rank: 9 },
    { slug: 'noir-etoile', title: 'Noir Étoilé', stage: 'cyclorama', year: 2025, cat: 'cosmetique', rank: 10 },
    { slug: 'orbite', title: 'Orbite', stage: 'eclipse', year: 2025, cat: 'eyewear', rank: 11 },
    { slug: 'studio-11', title: 'Studio 11', stage: 'horizontal', year: 2026, cat: 'accessoires', rank: 12 },
    { slug: 'parure', title: 'Parure', stage: 'eclipse', year: 2026, cat: 'bijoux', rank: 13 },
    { slug: 'rue-cadet', title: 'Rue Cadet', stage: 'cyclorama', year: 2025, cat: 'pap', rank: 14 },
    { slug: 'atelier-bois', title: 'Atelier Bois', stage: 'horizontal', year: 2025, cat: 'food', rank: 15 },
    { slug: 'maison-ardent', title: 'Maison Ardent', stage: 'vertical', year: 2026, cat: 'pap', rank: 16 },
    { slug: 'saar-paris', title: 'Saar Paris', stage: 'eclipse', year: 2026, cat: 'accessoires', rank: 17 },
    { slug: 'solene', title: 'Solène', stage: 'cyclorama', year: 2025, cat: 'bijoux', rank: 18 },
  ];

  // Resolve category slugs → documentIds for relational linking
  const catMap = new Map();
  const catRes = await api('gallery-categories?locale=fr&pagination[pageSize]=50');
  for (const c of catRes.data ?? []) {
    catMap.set(c.slug, c.documentId);
  }

  for (const p of projects) {
    const existing = await findBySlug('gallery-projects', p.slug);
    const data = { title: p.title, stage: p.stage, year: p.year, rank: p.rank };
    const catDocId = catMap.get(p.cat);
    if (catDocId) data.category = catDocId;

    if (existing) {
      await api(`gallery-projects/${existing.documentId}`, {
        method: 'PUT',
        body: JSON.stringify({ data }),
      });
      console.log(`  ✓ updated gallery-projects/${p.slug}`);
    } else {
      await api('gallery-projects', {
        method: 'POST',
        body: JSON.stringify({ data: { ...data, slug: p.slug } }),
      });
      console.log(`  + created gallery-projects/${p.slug}`);
    }
  }
}

// ─── 7. Site settings ──────────────────────────────────────────────────────

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
      fullAddress: 'Parc d\'activités Victor Hugo, Bât 6.7, 69 boulevard Victor Hugo, 93400 Saint-Ouen',
      hours: 'Lun–Ven 10:00–18:00',
      weekendHours: 'Sam–Dim sur demande',
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
      siteDescription: 'E-commerce photo & video studio in Saint-Ouen. Packshot, on-model, ghost, still life production and art direction.',
      hours: 'Mon–Fri 10:00–18:00',
      weekendHours: 'Sat–Sun on request',
    },
  );
}

// ─── 8. Blog posts (populate bodies where missing) ─────────────────────────

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

  await seedCyclorama();
  await seedMachines();
  await seedPostProdTypes();
  await seedGalleryCategories();
  await seedGalleryBrands();
  await seedGalleryProjects();
  await seedSiteSettings();
  await seedBlogPosts();

  console.log('\n' + '='.repeat(50));
  console.log('Seed complete.');
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
