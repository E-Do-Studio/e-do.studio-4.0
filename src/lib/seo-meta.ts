import type { Lang } from '../types';

export interface PageMeta {
  title: string;
  description: string;
}

// Per-route static title / description fallbacks. Used at build time by the
// prerender plugin in vite.config.ts (so non-JS crawlers see per-route meta)
// and at runtime by useDocumentMeta (so SPA navigation keeps the tab in sync).
// Keep this file dependency-free — it is imported from vite.config.ts at
// build time and must not pull React or browser APIs.
export const META: Record<string, Record<Lang, PageMeta>> = {
  home: {
    fr: {
      title: 'E-Do Studio — Studio photo & vidéo professionnel à Paris',
      description:
        'Studio photo et vidéo à Paris. Cyclorama, plateaux et post-production. Location pour marques de mode, cosmétique, joaillerie et food.',
    },
    en: {
      title: 'E-Do Studio — Professional photo & video studio in Paris',
      description:
        'Professional photo and video studio in Paris. Cyclorama, stages and post-production for fashion, cosmetics, jewelry and food brands.',
    },
  },
  cyclorama: {
    fr: {
      title: 'Cyclorama — E-Do Studio Paris',
      description:
        'Location de cyclorama professionnel à Paris. Espace de prise de vue pour shooting photo et vidéo avec fond infini.',
    },
    en: {
      title: 'Cyclorama — E-Do Studio Paris',
      description:
        'Professional cyclorama rental in Paris. Shooting space for photo and video with infinity backdrop.',
    },
  },
  'plateau-horizontal': {
    fr: {
      title: 'Plateau Horizontal — E-Do Studio Paris',
      description:
        'Location du plateau horizontal à E-Do Studio. Espace de prise de vue professionnel pour packshot et photo produit.',
    },
    en: {
      title: 'Horizontal Stage — E-Do Studio Paris',
      description:
        'Horizontal stage rental at E-Do Studio. Professional shooting space for packshots and product photography.',
    },
  },
  'plateau-vertical': {
    fr: {
      title: 'Plateau Vertical — E-Do Studio Paris',
      description:
        'Location du plateau vertical à E-Do Studio. Espace de prise de vue professionnelle pour photo verticale et portrait.',
    },
    en: {
      title: 'Vertical Stage — E-Do Studio Paris',
      description:
        'Vertical stage rental at E-Do Studio. Professional shooting space for vertical photography and portraits.',
    },
  },
  'plateau-eclipse': {
    fr: {
      title: 'Plateau Eclipse — E-Do Studio Paris',
      description:
        'Location du plateau Eclipse à E-Do Studio. Espace de shooting avec éclairage contrôlé pour photo et vidéo.',
    },
    en: {
      title: 'Eclipse Stage — E-Do Studio Paris',
      description:
        'Eclipse stage rental at E-Do Studio. Shooting space with controlled lighting for photo and video.',
    },
  },
  'plateau-live': {
    fr: {
      title: 'Plateau Live — E-Do Studio Paris',
      description:
        'Location du plateau Live à E-Do Studio. Espace de captation vidéo en direct et streaming professionnel.',
    },
    en: {
      title: 'Live Stage — E-Do Studio Paris',
      description:
        'Live stage rental at E-Do Studio. Professional live video capture and streaming space.',
    },
  },
  discovery: {
    fr: {
      title: 'Discovery — Blog & actualités — E-Do Studio',
      description:
        'Articles, actualités et inspirations du studio photo et vidéo E-Do Studio à Paris. Tendances mode, cosmétique et photographie.',
    },
    en: {
      title: 'Discovery — Blog & news — E-Do Studio',
      description:
        'Articles, news and inspirations from E-Do Studio photo and video studio in Paris. Fashion, cosmetics and photography trends.',
    },
  },
  postprod: {
    fr: {
      title: 'Post-production — E-Do Studio Paris',
      description:
        'Services de post-production photo et vidéo à Paris. Retouche, colorimétrie, montage vidéo et livraison express.',
    },
    en: {
      title: 'Post-production — E-Do Studio Paris',
      description:
        'Photo and video post-production services in Paris. Retouching, color grading, video editing and express delivery.',
    },
  },
  gallery: {
    fr: {
      title: 'Galerie — E-Do Studio Paris',
      description:
        'Galerie de réalisations du studio E-Do. Shooting photo et vidéo pour marques de mode, cosmétique, joaillerie et food.',
    },
    en: {
      title: 'Gallery — E-Do Studio Paris',
      description:
        'E-Do Studio portfolio gallery. Photo and video shoots for fashion, cosmetics, jewelry and food brands.',
    },
  },
  contact: {
    fr: {
      title: 'Contact — E-Do Studio Paris',
      description:
        'Contactez E-Do Studio pour réserver un plateau photo ou vidéo à Paris. Devis gratuit et réponse rapide.',
    },
    en: {
      title: 'Contact — E-Do Studio Paris',
      description:
        'Contact E-Do Studio to book a photo or video stage in Paris. Free quote and fast response.',
    },
  },
  book: {
    fr: {
      title: 'Réserver — E-Do Studio Paris',
      description:
        'Réservez votre créneau au studio E-Do. Sélectionnez un plateau, une date et configurez votre session photo ou vidéo.',
    },
    en: {
      title: 'Book — E-Do Studio Paris',
      description:
        'Book your slot at E-Do Studio. Select a stage, date and configure your photo or video session.',
    },
  },
  'book-picker': {
    fr: {
      title: 'Réserver — E-Do Studio Paris',
      description:
        'Choisissez votre mode de réservation : configurateur guidé, formulaire manuel ou prise de contact directe avec notre équipe.',
    },
    en: {
      title: 'Book — E-Do Studio Paris',
      description:
        'Pick how to book: guided configurator, manual form or direct contact with our team.',
    },
  },
  'book-confirmation': {
    fr: {
      title: 'Confirmation — E-Do Studio Paris',
      description: 'Votre demande de réservation a bien été enregistrée.',
    },
    en: {
      title: 'Confirmation — E-Do Studio Paris',
      description: 'Your booking request has been recorded.',
    },
  },
  legal: {
    fr: {
      title: 'Mentions légales — E-Do Studio',
      description:
        "Mentions légales, politique de confidentialité et conditions générales d'utilisation du site E-Do Studio.",
    },
    en: {
      title: 'Legal — E-Do Studio',
      description:
        'Legal notice, privacy policy and terms of use for the E-Do Studio website.',
    },
  },
  'not-found': {
    fr: {
      title: 'Page introuvable — E-Do Studio',
      description: "Cette page n'existe pas ou a été déplacée.",
    },
    en: {
      title: 'Page not found — E-Do Studio',
      description: 'This page does not exist or has moved.',
    },
  },
};

// Paired FR/EN routes the build-time prerender emits per-route HTML for.
// Booking, legal and discovery posts are excluded — booking is noindexed,
// legal is single-language by intent, and posts get dynamic prerender after
// the Strapi data is fetched (see future blog-prerender pass).
export interface RoutePair {
  metaKey: string;
  fr: string;
  en: string;
}

export const PRERENDER_ROUTE_PAIRS: readonly RoutePair[] = [
  { metaKey: 'home', fr: '/fr', en: '/en' },
  { metaKey: 'cyclorama', fr: '/fr/cyclorama', en: '/en/cyclorama' },
  {
    metaKey: 'plateau-horizontal',
    fr: '/fr/plateau/horizontal',
    en: '/en/plateau/horizontal',
  },
  {
    metaKey: 'plateau-vertical',
    fr: '/fr/plateau/vertical',
    en: '/en/plateau/vertical',
  },
  {
    metaKey: 'plateau-eclipse',
    fr: '/fr/plateau/eclipse',
    en: '/en/plateau/eclipse',
  },
  { metaKey: 'plateau-live', fr: '/fr/plateau/live', en: '/en/plateau/live' },
  { metaKey: 'discovery', fr: '/fr/discovery', en: '/en/discovery' },
  { metaKey: 'postprod', fr: '/fr/post-production', en: '/en/post-production' },
  { metaKey: 'gallery', fr: '/fr/galerie', en: '/en/gallery' },
  { metaKey: 'contact', fr: '/fr/contact', en: '/en/contact' },
] as const;

export const SITE_ORIGIN = 'https://e-do.studio';

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
