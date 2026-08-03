import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { galleryLoader, galleryValidateSearch } from '../../lib/route-data';
import type { Lang } from '../../types';
import { buildSeoHead } from '../../lib/seo-head';

export const Route = createFileRoute('/$lang/galerie')({
  head: ({ params }) =>
    buildSeoHead({ metaKey: 'gallery', lang: params.lang as Lang, pathname: '/galerie' }),
  validateSearch: galleryValidateSearch,
  loader: galleryLoader,
  component: lazyRouteComponent(() => import('../../gallery-page'), 'GalleryPageV3'),
});
