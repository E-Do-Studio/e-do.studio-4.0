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
    // La galerie répond sous les deux slugs dans les deux langues : /fr/galerie,
    // /fr/gallery, /en/galerie et /en/gallery rendent tous la même page. Le
    // canonical pointe donc toujours le slug de la langue courante : sans ça,
    // les quatre URLs se référencent chacune elle-même et Google indexe quatre
    // pages au contenu identique.
    const canonical = lang === 'fr' ? '/galerie' : '/gallery';
    return buildSeoHead({
      metaKey: 'gallery',
      lang,
      pathname: canonical,
      jsonLd: [
        buildGalleryCollectionSchema(
          loaderData?.projects ?? [],
          loaderData?.categories ?? [],
          lang,
          canonical,
        ),
        buildPageBreadcrumb(lang, [
          { name: getT(lang)('common.gallery'), pathname: canonical },
        ]),
      ],
    });
  },
  validateSearch: galleryValidateSearch,
  loader: galleryLoader,
  component: GalleryPageV3,
});
