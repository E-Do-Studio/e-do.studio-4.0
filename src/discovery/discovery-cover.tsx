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
// No procedural fallback — nothing renders when the post has no coverMedia.
export const DiscoveryCoverMedia = ({
  post,
  lang,
  className,
  sizes,
  priority,
  controls = false,
}: DiscoveryCoverMediaProps) => {
  // Même garde que `hasCover`, pour les appelants qui rendent la cover sans
  // avoir replié leur mise en page — un HEIC ne doit produire aucun `<img>`.
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
