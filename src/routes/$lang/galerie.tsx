import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { galleryLoader, galleryValidateSearch } from '../../lib/route-data';

export const Route = createFileRoute('/$lang/galerie')({
  validateSearch: galleryValidateSearch,
  loader: galleryLoader,
  component: lazyRouteComponent(() => import('../../gallery-page'), 'GalleryPageV3'),
});
