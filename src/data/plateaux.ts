import type { Bilingual } from '../types';

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

export const PLATEAUX: Record<string, PlateauSpec> = {
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
      { k: { fr: 'Électricité', en: 'Electricity' }, v: { fr: '1 prise Marechal 63A triphasée\n15 prises 16A', en: '1 Marechal 63A 3-phase\n15 × 16A outlets' } },
      { k: { fr: 'Connectivité & son', en: 'Connectivity & sound' }, v: { fr: 'Wi-Fi très haut débit\nSound system intégré', en: 'High-speed Wi-Fi\nIntegrated sound system' } },
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

export const MACHINES = [
  { slug: 'cyclorama', fr: { t: 'Cyclorama', sub: 'Production libre', label: '30 m² — Broncolor' }, en: { t: 'Cyclorama', sub: 'Free production', label: '30 m² — Broncolor' } },
  { slug: 'horizontal', fr: { t: 'Horizontal', sub: 'Packshots à plat', label: 'Packshot horizontal' }, en: { t: 'Horizontal', sub: 'Flat packshots', label: 'Horizontal packshot' } },
  { slug: 'vertical', fr: { t: 'Vertical', sub: 'Mannequin ghost', label: 'Pleine hauteur' }, en: { t: 'Vertical', sub: 'Ghost mannequin', label: 'Full height' } },
  { slug: 'eclipse', fr: { t: 'Eclipse', sub: 'Chaussures et accessoires', label: 'Éclipse 360°' }, en: { t: 'Eclipse', sub: 'Shoes & accessories', label: 'Eclipse 360°' } },
  { slug: 'live', fr: { t: 'Live', sub: 'Shooting porté', label: 'Diffusion live' }, en: { t: 'Live', sub: 'On-model shooting', label: 'Live broadcast' } },
];
