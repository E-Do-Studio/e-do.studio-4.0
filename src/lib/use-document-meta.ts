import { useEffect } from 'react';
import type { Lang } from '../types';
import { usePageContext } from './page-context';
import { META } from './seo-meta';

export interface SeoOverride {
  title?: string;
  description?: string;
  imageUrl?: string;
  noIndex?: boolean;
}

/**
 * Priority for each meta field (first non-empty wins):
 *   1. Strapi `override` (per-page seo component, e.g. machine.seo)
 *   2. Hardcoded META[page] (per-route defaults)
 *   3. site-setting.defaultSeoTitle / defaultSeoDescription / defaultSeoImage
 *   4. META.home (final fallback)
 */
export function useDocumentMeta(page: string, lang: Lang, override?: SeoOverride) {
  const { siteData: { siteDefaults: defaults } } = usePageContext();
  const defaultTitle = defaults?.seoTitle?.[lang] || '';
  const defaultDescription = defaults?.seoDescription?.[lang] || '';
  const defaultImageUrl = defaults?.seoImageUrl;
  const overrideTitle = override?.title;
  const overrideDescription = override?.description;
  const overrideImage = override?.imageUrl;
  const overrideNoIndex = override?.noIndex;

  useEffect(() => {
    const pageMeta = META[page]?.[lang];
    const title =
      overrideTitle ||
      pageMeta?.title ||
      defaultTitle ||
      META.home[lang].title;
    const description =
      overrideDescription ||
      pageMeta?.description ||
      defaultDescription ||
      META.home[lang].description;
    const imageUrl = overrideImage || defaultImageUrl;

    document.title = title;

    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) descTag.setAttribute('content', description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    if (imageUrl) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute('content', imageUrl);
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) twitterImage.setAttribute('content', imageUrl);
    }

    // Toggle <meta name="robots"> when the Strapi seo override asks for noIndex.
    let robots = document.querySelector('meta[name="robots"]');
    if (overrideNoIndex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow');
    } else if (robots && robots.getAttribute('content')?.includes('noindex')) {
      robots.setAttribute('content', 'index, follow');
    }

    document.documentElement.lang = lang === 'en' ? 'en' : 'fr';

    const pageUrl = typeof window === 'undefined'
      ? `https://e-do.studio/${lang}`
      : new URL(window.location.pathname + window.location.search, 'https://e-do.studio').toString();

    // noindex pages must not self-canonicalize: a canonical pointing at a URL
    // the page itself excludes from the index is a contradictory signal
    // (and on 404s, points at a URL that should not exist).
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    if (overrideNoIndex) {
      if (existingCanonical) existingCanonical.remove();
    } else {
      const canonical = existingCanonical ?? (() => {
        const el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
        return el;
      })();
      canonical.setAttribute('href', pageUrl);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', pageUrl);

    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', lang === 'en' ? 'en_US' : 'fr_FR');
  }, [page, lang, overrideTitle, overrideDescription, overrideImage, overrideNoIndex, defaultTitle, defaultDescription, defaultImageUrl]);
}
