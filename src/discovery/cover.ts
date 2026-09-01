import type { DiscoveryPost } from '../types';

// Formats qu'aucun navigateur ne décode. Strapi accepte le téléversement d'un
// HEIC — c'est le format par défaut de l'appareil photo iOS — et ne génère
// alors aucune dérivée : le `<img>` reste cassé, et Chrome peint son texte
// alternatif dans la vignette de 48px. Vu en production sur « Organisation de
// shooting photo & mode ».
//
// Validation à la frontière, pas repli défensif : une cover que le navigateur
// ne sait pas afficher n'est pas une cover, et la carte doit se replier sur sa
// forme sans image plutôt que réserver une case vide.
const UNDECODABLE = /^image\/(heic|heif|avif-sequence|tiff)$/i;

// A post has a "real" cover only when coverUrl is set. DiscoveryCoverMedia
// already renders nothing without it; the bento cards use this to also collapse
// the surrounding layout (no empty cover box).
// Lives outside discovery-cover.tsx so that file only exports components and
// Fast Refresh can preserve their state.
export const hasCover = (post: DiscoveryPost): boolean =>
  Boolean(post.coverUrl) && !UNDECODABLE.test(post.coverMime ?? '');
