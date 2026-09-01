import type { DiscoveryPost, Lang } from '../types';
import { ResponsiveImage } from '../ui/responsive-image';
import { VideoLoop } from '../ui/video-loop';
import { hasCover } from './cover';

interface DiscoveryCoverMediaProps {
  post: DiscoveryPost;
  lang: Lang;
  className: string;
  sizes: string;
  priority?: boolean;
  // Render a video cover with native controls (pause + timeline) instead of the
  // silent autoplay loop. Used where the cover is a focal media, not decoration.
  controls?: boolean;
}

// Wraps the cover decision: video (autoplay loop muet) or image (responsive).
//
// Sans cover, RIEN — pas même un aplat. Un carré gris dans une liste ne se lit
// pas comme « cet article n'a pas d'image », il se lit comme une image cassée :
// il attire l'œil exactement là où il n'y a rien à voir, et il le fait à côté de
// vignettes qui, elles, montrent quelque chose.
//
// Ce qu'il faut tenir, c'est la PLACE, et elle appartient à l'appelant : la
// liste garde sa case de 48px, vide et invisible, pour que tous ses titres
// commencent au même endroit. Le renvoi d'article, lui, n'a aucun voisin à
// aligner et referme sa colonne.
export const DiscoveryCoverMedia = ({
  post,
  lang,
  className,
  sizes,
  priority,
  controls = false,
}: DiscoveryCoverMediaProps) => {
  // Même garde que `hasCover` : un HEIC ne doit produire aucun `<img>`.
  const src = post.coverUrl;
  if (!src || !hasCover(post)) {
    return null;
  }
  if (post.coverMime?.startsWith('video/')) {
    if (controls) {
      return (
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className={className}
          aria-label={post.title[lang]}
        />
      );
    }
    return <VideoLoop src={src} className={className} objectFit="cover" />;
  }
  return (
    <ResponsiveImage
      src={src}
      alt={post.title[lang]}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
};
