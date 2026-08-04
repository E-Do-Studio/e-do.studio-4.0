import { createFileRoute } from '@tanstack/react-router';
import { GalleryPageV3 } from '../../gallery-page';
import { galleryLoader, galleryValidateSearch } from '../../lib/route-data';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';
import {
  buildGalleryCollectionSchema,
  buildPageBreadcrumb,
} from '../../lib/structured-data';
import { getT } from '../../i18n';

export const Route = createFileRoute('/$lang/gallery')({
  head: ({ params, loaderData }) => {
    const lang = params.lang as Lang;
    return buildSeoHead({
      metaKey: 'gallery',
      lang,
      pathname: '/gallery',
      jsonLd: [
        buildGalleryCollectionSchema(
          loaderData?.projects ?? [],
          loaderData?.categories ?? [],
          lang,
          '/gallery',
        ),
        buildPageBreadcrumb(lang, [
          { name: getT(lang)('common.gallery'), pathname: '/gallery' },
        ]),
      ],
    });
  },
  validateSearch: galleryValidateSearch,
  loader: galleryLoader,
  component: GalleryPageV3,
});
