import { buildStrapiSrcset, getStrapiLargeUrl } from '../lib/strapi';
import { cn } from './cn';

type Props = {
  src: string | undefined | null;
  alt: string;
  // Required so the browser can pick the right derivative. Examples:
  //   "(min-width: 1024px) 50vw, 100vw"
  //   "(min-width: 768px) 33vw, 100vw"
  sizes: string;
  // True for above-the-fold/LCP images — eager + fetchpriority high.
  priority?: boolean;
  className?: string;
  width?: number;
  height?: number;
  onClick?: () => void;
  draggable?: boolean;
};

// Drop-in replacement for raw `<img src={strapiUrl} />`. Synthesizes srcset
// from the Strapi variant URL pattern (thumbnail/small/medium/large) so the
// browser fetches the smallest derivative that fits the layout. Behaviour
// degrades to a single `src` when the URL doesn't match (SVG, external).
export function ResponsiveImage({
  src,
  alt,
  sizes,
  priority,
  className,
  width,
  height,
  onClick,
  draggable,
}: Props) {
  if (!src) return null;
  const resolvedSrc = getStrapiLargeUrl(src) ?? src;
  const srcSet = buildStrapiSrcset(src);
  return (
    <img
      src={resolvedSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn(className)}
      onClick={onClick}
      draggable={draggable}
    />
  );
}
