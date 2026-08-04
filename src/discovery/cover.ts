import type { DiscoveryPost } from '../types';

// A post has a "real" cover only when coverUrl is set. DiscoveryCoverMedia
// already renders nothing without it; the bento cards use this to also collapse
// the surrounding layout (no empty cover box).
// Lives outside discovery-cover.tsx so that file only exports components and
// Fast Refresh can preserve their state.
export const hasCover = (post: DiscoveryPost): boolean =>
  Boolean(post.coverUrl);
