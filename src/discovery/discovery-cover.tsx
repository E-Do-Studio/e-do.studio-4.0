import React from 'react';
import type { DiscoveryPost, Lang } from '../types';
import { ResponsiveImage } from '../ui/responsive-image';
import { VideoLoop } from '../ui/video-loop';

interface DiscoveryCoverMediaProps {
  post: DiscoveryPost;
  lang: Lang;
  className: string;
  sizes: string;
  priority?: boolean;
  seedOffset?: number;
  // Render a video cover with native controls (pause + timeline) instead of the
  // silent autoplay loop. Used where the cover is a focal media, not decoration.
  controls?: boolean;
}

// Wraps the cover decision: video (autoplay loop muet) or image (responsive).
// No procedural fallback — nothing renders when the post has no coverMedia.
export const DiscoveryCoverMedia: React.FC<DiscoveryCoverMediaProps> = ({
  post,
  lang,
  className,
  sizes,
  priority,
  controls = false,
}) => {
  if (!post.coverUrl) {
    return null;
  }
  if (post.coverMime?.startsWith('video/')) {
    if (controls) {
      return (
        <video
          src={post.coverUrl}
          controls
          playsInline
          preload="metadata"
          className={className}
          aria-label={post.title[lang]}
        />
      );
    }
    return <VideoLoop src={post.coverUrl} className={className} objectFit="cover" />;
  }
  return (
    <ResponsiveImage
      src={post.coverUrl}
      alt={post.title[lang]}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
};
