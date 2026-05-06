import { useEffect } from 'react';
import type { Lang } from '../types';
import { useSiteDefaults } from './use-strapi';

interface PageMeta {
  title: string;
  description: string;
}

const META: Record<string, Record<Lang, PageMeta>> = {
  home: {
    fr: {
      title: 'E-Do Studio — Studio photo & vidéo professionnel à Paris',
      description: 'Studio photo et vidéo professionnel à Paris. Cyclorama, plateaux de prise de vue, post-production. Location et services pour marques de mode, cosmétique, joaillerie et food.',
    },
    en: {
      title: 'E-Do Studio — Professional photo & video studio in Paris',
      description: 'Professional photo and video studio in Paris. Cyclorama, shooting stages, post-production. Rental and services for fashion, cosmetics, jewelry and food brands.',
    },
  },
  cyclorama: {
    fr: {
      title: 'Cyclorama — E-Do Studio Paris',
      description: 'Location de cyclorama professionnel à Paris. Espace de prise de vue pour shooting photo et vidéo avec fond infini.',
    },
    en: {
      title: 'Cyclorama — E-Do Studio Paris',
      description: 'Professional cyclorama rental in Paris. Shooting space for photo and video with infinity backdrop.',
    },
  },
  'plateau-horizontal': {
    fr: {
      title: 'Plateau Horizontal — E-Do Studio Paris',
      description: 'Location du plateau horizontal à E-Do Studio. Espace de prise de vue professionnel pour packshot et photo produit.',
    },
    en: {
      title: 'Horizontal Stage — E-Do Studio Paris',
      description: 'Horizontal stage rental at E-Do Studio. Professional shooting space for packshots and product photography.',
    },
  },
  'plateau-vertical': {
    fr: {
      title: 'Plateau Vertical — E-Do Studio Paris',
      description: 'Location du plateau vertical à E-Do Studio. Espace de prise de vue professionnelle pour photo verticale et portrait.',
    },
    en: {
      title: 'Vertical Stage — E-Do Studio Paris',
      description: 'Vertical stage rental at E-Do Studio. Professional shooting space for vertical photography and portraits.',
    },
  },
  'plateau-eclipse': {
    fr: {
      title: 'Plateau Eclipse — E-Do Studio Paris',
      description: 'Location du plateau Eclipse à E-Do Studio. Espace de shooting avec éclairage contrôlé pour photo et vidéo.',
    },
    en: {
      title: 'Eclipse Stage — E-Do Studio Paris',
      description: 'Eclipse stage rental at E-Do Studio. Shooting space with controlled lighting for photo and video.',
    },
  },
  'plateau-live': {
    fr: {
      title: 'Plateau Live — E-Do Studio Paris',
      description: 'Location du plateau Live à E-Do Studio. Espace de captation vidéo en direct et streaming professionnel.',
    },
    en: {
      title: 'Live Stage — E-Do Studio Paris',
      description: 'Live stage rental at E-Do Studio. Professional live video capture and streaming space.',
    },
  },
  discovery: {
    fr: {
      title: 'Discovery — Blog & actualités — E-Do Studio',
      description: 'Articles, actualités et inspirations du studio photo et vidéo E-Do Studio à Paris. Tendances mode, cosmétique et photographie.',
    },
    en: {
      title: 'Discovery — Blog & news — E-Do Studio',
      description: 'Articles, news and inspirations from E-Do Studio photo and video studio in Paris. Fashion, cosmetics and photography trends.',
    },
  },
  postprod: {
    fr: {
      title: 'Post-production — E-Do Studio Paris',
      description: 'Services de post-production photo et vidéo à Paris. Retouche, colorimétrie, montage vidéo et livraison express.',
    },
    en: {
      title: 'Post-production — E-Do Studio Paris',
      description: 'Photo and video post-production services in Paris. Retouching, color grading, video editing and express delivery.',
    },
  },
  gallery: {
    fr: {
      title: 'Galerie — E-Do Studio Paris',
      description: 'Galerie de réalisations du studio E-Do. Shooting photo et vidéo pour marques de mode, cosmétique, joaillerie et food.',
    },
    en: {
      title: 'Gallery — E-Do Studio Paris',
      description: 'E-Do Studio portfolio gallery. Photo and video shoots for fashion, cosmetics, jewelry and food brands.',
    },
  },
  contact: {
    fr: {
      title: 'Contact — E-Do Studio Paris',
      description: 'Contactez E-Do Studio pour réserver un plateau photo ou vidéo à Paris. Devis gratuit et réponse rapide.',
    },
    en: {
      title: 'Contact — E-Do Studio Paris',
      description: 'Contact E-Do Studio to book a photo or video stage in Paris. Free quote and fast response.',
    },
  },
  book: {
    fr: {
      title: 'Réserver — E-Do Studio Paris',
      description: 'Réservez votre créneau au studio E-Do. Sélectionnez un plateau, une date et configurez votre session photo ou vidéo.',
    },
    en: {
      title: 'Book — E-Do Studio Paris',
      description: 'Book your slot at E-Do Studio. Select a stage, date and configure your photo or video session.',
    },
  },
  legal: {
    fr: {
      title: 'Mentions légales — E-Do Studio',
      description: 'Mentions légales, politique de confidentialité et conditions générales d\'utilisation du site E-Do Studio.',
    },
    en: {
      title: 'Legal — E-Do Studio',
      description: 'Legal notice, privacy policy and terms of use for the E-Do Studio website.',
    },
  },
};

export function useDocumentMeta(page: string, lang: Lang) {
  const { data: defaults } = useSiteDefaults();
  const seoTitle = defaults?.seoTitle?.[lang] || '';
  const seoDescription = defaults?.seoDescription?.[lang] || '';
  const seoImageUrl = defaults?.seoImageUrl;

  useEffect(() => {
    const pageMeta = META[page]?.[lang];
    const fallbackTitle = seoTitle || META.home[lang].title;
    const fallbackDescription = seoDescription || META.home[lang].description;
    const title = pageMeta?.title ?? fallbackTitle;
    const description = pageMeta?.description ?? fallbackDescription;

    document.title = title;

    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) descTag.setAttribute('content', description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    if (seoImageUrl) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute('content', seoImageUrl);
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) twitterImage.setAttribute('content', seoImageUrl);
    }

    document.documentElement.lang = lang === 'en' ? 'en' : 'fr';
  }, [page, lang, seoTitle, seoDescription, seoImageUrl]);
}
