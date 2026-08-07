import { useCallback } from 'react';
import { buildStrapiSrcset, getStrapiLargeUrl } from '../lib/strapi';
import { cn } from '@/lib/utils';
import { fetchPriority } from './fetch-priority';

type Props = {
  src: string | undefined | null;
  alt: string;
  // Required so the browser can pick the right derivative. Examples:
  //   "(min-width: 1024px) 50vw, 100vw"
  //   "(min-width: 768px) 33vw, 100vw"
  sizes: string;
  // True for above-the-fold/LCP images — eager + fetchpriority high.
  priority?: boolean;
  // `cover` recadre, `contain` montre l'image entière et laisse le fond du
  // cadre autour. Un seul appelant demande `contain` : le carrousel plateau,
  // dont certaines pièces sont des plans larges à ne pas rogner.
  fit?: 'cover' | 'contain';
  className?: string;
  onClick?: () => void;
  draggable?: boolean;
};

// Drop-in replacement for raw `<img src={strapiUrl} />`. Synthesizes srcset
// from the Strapi variant URL pattern (thumbnail/small/medium/large) so the
// browser fetches the smallest derivative that fits the layout. Behaviour
// degrades to a single `src` when the URL doesn't match (SVG, external).
//
// L'image remplit son cadre — elle ne se dimensionne jamais elle-même. Les six
// appelants écrivaient tous la même ligne (`absolute inset-0 h-full w-full
// object-cover`) ; c'est désormais le composant qui la porte, et `MediaFrame`
// qui fournit la boîte positionnée, son ratio et son fond de réserve.
export function ResponsiveImage({
  src,
  alt,
  sizes,
  priority,
  fit = 'cover',
  className,
  onClick,
  draggable,
}: Props) {
  // Le fondu à l'apparition ne peut pas être rendu par le serveur.
  //
  // Le site est en SSR non-streamé : une `opacity-0` posée dans le HTML
  // resterait à 0 pour tout client sans JS, et le site serait blanc. Le
  // callback ref, lui, ne s'exécute que côté client — et il s'exécute avant la
  // peinture, donc sans clignotement. Il peut en plus interroger
  // `node.complete` : une image déjà en cache (retour arrière, seconde visite)
  // n'a rien à fondre et apparaît directement.
  //
  // Ni `useState` ni `useEffect` : un état déclencherait un rendu par image
  // chargée, et un effet passerait après la peinture — c'est-à-dire trop tard.
  const fadeIn = useCallback((node: HTMLImageElement | null) => {
    if (node && !node.complete) node.dataset.loading = '';
  }, []);

  if (!src) return null;
  const resolvedSrc = getStrapiLargeUrl(src) ?? src;
  const srcSet = buildStrapiSrcset(src);
  return (
    <img
      ref={fadeIn}
      src={resolvedSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...fetchPriority(priority)}
      onLoad={(e) => {
        delete e.currentTarget.dataset.loading;
      }}
      onError={(e) => {
        // `color: transparent` (styles.css) masque le texte alt pendant le
        // chargement ; une image qui ne viendra jamais doit au contraire le
        // dire, c'est le seul moment où il apprend quelque chose.
        delete e.currentTarget.dataset.loading;
        e.currentTarget.dataset.error = '';
      }}
      className={cn(
        'absolute inset-0 h-full w-full',
        fit === 'contain' ? 'object-contain' : 'object-cover',
        className,
      )}
      onClick={onClick}
      draggable={draggable}
    />
  );
}
