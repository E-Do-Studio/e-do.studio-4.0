import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Rail, RailCell } from './ui/rail-cell';
import { SelectionDrawer } from './ui/selection-drawer';
import { ordinal } from './lib/format';
import { PageShell } from './ui/page-shell';
import { MAIN_ID } from './ui/skip-link';
import { ResponsiveImage } from './ui/responsive-image';
import { MediaFrame } from './ui/media-frame';
import { GalleryLightbox } from './gallery-lightbox';
import { useLoaderData } from '@tanstack/react-router';
import type {
  GalleryMedia,
  PPCat as StrapiPPCat,
  PPSample,
} from './lib/strapi';
import type { Bilingual } from './types';
import { usePageContext } from './lib/page-context';
import { useT } from './i18n/use-t';
import { StatusBadge } from './ui/status-badge';
import { CtaCell } from './ui/cta-cell';
import { Price } from './ui/price';

interface PPPrice {
  amount?: string;
  unit?: Bilingual;
  from?: boolean;
  kind?: string;
}

// `samples` is a tagged union: real CMS media (image | video) plus a
// `placeholder` variant that drives the SVG palette fallback when fewer
// than 6 demo medias are configured in Strapi.
type SampleSlot = PPSample | { kind: 'placeholder'; seed: string };

interface PPCat {
  k: string;
  medium: string;
  fr: string;
  en: string;
  tagline: Bilingual;
  price: PPPrice;
  note: Bilingual;
  features: Bilingual<string[]>;
  formats: string[];
  samples: SampleSlot[];
  featured?: boolean;
}

interface PaletteColors {
  bg: string;
  a: string;
  b: string;
}

const PALETTES: Record<string, PaletteColors> = {
  'mono-a': { bg: '#f0f0f0', a: '#141414', b: '#bfbfbf' },
  'mono-b': { bg: '#e8e8e8', a: '#2a2a2a', b: '#a8a8a8' },
  'mono-c': { bg: '#dcdcdc', a: '#1a1a1a', b: '#8e8e8e' },
  'mono-d': { bg: '#f5f5f5', a: '#141414', b: '#c8c8c8' },
  'mono-e': { bg: '#c8c8c8', a: '#1a1a1a', b: '#7a7a7a' },
  'warm-a': { bg: '#e8dfcf', a: '#2a241c', b: '#b8ad94' },
  'warm-b': { bg: '#d9ccb0', a: '#3a2f20', b: '#a89674' },
  'warm-c': { bg: '#f0e7d4', a: '#2a241c', b: '#c4b694' },
  'warm-d': { bg: '#ddcfad', a: '#1f1a12', b: '#9e8a63' },
  'warm-e': { bg: '#cab995', a: '#1a1610', b: '#8e7a52' },
  'dark-a': { bg: '#1a1a1a', a: '#f0f0f0', b: '#3a3a3a' },
  'dark-b': { bg: '#0f0f0f', a: '#e8e8e8', b: '#2a2a2a' },
  'dark-c': { bg: '#141414', a: '#d8d8d8', b: '#333333' },
  'dark-d': { bg: '#1f1f1f', a: '#f0f0f0', b: '#404040' },
  'dark-e': { bg: '#0a0a0a', a: '#d0d0d0', b: '#262626' },
  'mono-v-a': { bg: '#d8d8d8', a: '#141414', b: '#8a8a8a' },
  'mono-v-b': { bg: '#ededed', a: '#2a2a2a', b: '#9e9e9e' },
  'mono-v-c': { bg: '#c4c4c4', a: '#141414', b: '#7a7a7a' },
  'mono-v-d': { bg: '#e0e0e0', a: '#1a1a1a', b: '#9a9a9a' },
  'mono-v-e': { bg: '#b8b8b8', a: '#141414', b: '#707070' },
  'warm-v-a': { bg: '#e0d2b4', a: '#2a241c', b: '#a8976e' },
  'warm-v-b': { bg: '#cfbe9a', a: '#1f1a12', b: '#8e7a52' },
  'warm-v-c': { bg: '#f2e7d0', a: '#2a241c', b: '#b8a47e' },
  'warm-v-d': { bg: '#d4c5a2', a: '#1f1a12', b: '#9e8a63' },
  'warm-v-e': { bg: '#c4b089', a: '#1a1610', b: '#7e6a42' },
  'dark-v-a': { bg: '#111111', a: '#e8e8e8', b: '#2e2e2e' },
  'dark-v-b': { bg: '#1c1c1c', a: '#f0f0f0', b: '#3e3e3e' },
  'dark-v-c': { bg: '#0a0a0a', a: '#d0d0d0', b: '#262626' },
  'dark-v-d': { bg: '#181818', a: '#e0e0e0', b: '#363636' },
  'dark-v-e': { bg: '#050505', a: '#c8c8c8', b: '#1e1e1e' },
};

interface SampleImageProps {
  sample: SampleSlot;
  medium: string;
  /** Vrai pour la première rangée : en desktop la mosaïque occupe le tiers
   *  droit du premier écran, et ses six vignettes étaient toutes `lazy`. */
  priority?: boolean;
}

const SampleVideo = ({
  src,
  mime,
  alt,
}: {
  src: string;
  mime: string;
  alt?: string;
}) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // `autoplay` + `muted` is enough on most browsers, but Safari/iOS
    // sometimes ignores the attribute when the element mounts off-screen.
    // Calling .play() defensively keeps the loop running once visible.
    el.play().catch(() => {});
  }, [src]);
  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      disablePictureInPicture
      aria-label={alt ?? ''}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
    >
      <source src={src} type={mime} />
    </video>
  );
};

// Le contenu d'une vignette, sans sa boîte : c'est `MediaFrame` qui la pose,
// avec son ratio et son fond de réserve. Les trois branches se posaient
// auparavant chacune leur `relative w-full h-full overflow-hidden`, et deux
// d'entre elles seulement leur `bg-muted`.
const SampleImage = ({ sample, medium, priority }: SampleImageProps) => {
  if (sample.kind === 'video') {
    return <SampleVideo src={sample.url} mime={sample.mime} alt={sample.alt} />;
  }
  if (sample.kind === 'image') {
    return (
      <ResponsiveImage
        src={sample.url}
        alt={sample.alt ?? ''}
        // La mosaïque occupe deux des trois colonnes souples du shell et se
        // divise en trois : une vignette vaut environ le quart de l'écran en
        // desktop, le tiers en mobile.
        sizes="(min-width: 1024px) 22vw, 33vw"
        priority={priority}
      />
    );
  }
  const seed = sample.seed;
  const p = PALETTES[seed] || PALETTES['mono-a'];
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 5;
  return (
    <div className="absolute inset-0" style={{ background: p.bg }}>
      <svg
        viewBox="0 0 300 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {hash === 0 && (
          <>
            <rect x="60" y="80" width="180" height="260" fill={p.b} />
            <ellipse cx="150" cy="200" rx="70" ry="110" fill={p.a} />
          </>
        )}
        {hash === 1 && (
          <>
            <rect x="0" y="240" width="300" height="160" fill={p.b} />
            <rect x="95" y="100" width="110" height="220" fill={p.a} />
          </>
        )}
        {hash === 2 && (
          <>
            <circle cx="150" cy="240" r="140" fill={p.b} />
            <rect x="130" y="60" width="40" height="220" fill={p.a} />
          </>
        )}
        {hash === 3 && (
          <>
            <path d="M 0 400 Q 150 160 300 400 Z" fill={p.b} />
            <circle cx="150" cy="150" r="55" fill={p.a} />
          </>
        )}
        {hash === 4 && (
          <>
            <ellipse cx="150" cy="220" rx="100" ry="150" fill={p.b} />
            <ellipse cx="150" cy="220" rx="55" ry="90" fill={p.a} />
          </>
        )}
      </svg>
      <div className="absolute inset-0 pointer-events-none bg-postprod-pattern" />
      {medium === 'video' && (
        <StatusBadge
          tone="overlay"
          className="dark absolute top-2 right-2 gap-1"
        >
          <span className="inline-block h-0 w-0 border-b-3 border-l-4 border-t-3 border-b-transparent border-l-foreground border-t-transparent" />
          VIDEO
        </StatusBadge>
      )}
    </div>
  );
};

const SAMPLE_CYCLE = [
  'warm-a',
  'warm-b',
  'warm-c',
  'warm-d',
  'warm-e',
  'warm-b',
];

// Real media items from Strapi (when present) come first; the remaining
// slots fall back to the palette cycle so the grid stays visually full
// even when fewer than 6 demo medias are configured.
function fillSamples(samples: PPSample[]): SampleSlot[] {
  const out: SampleSlot[] = [];
  for (let i = 0; i < 6; i++) {
    const s = samples[i];
    if (s) out.push(s);
    else
      out.push({
        kind: 'placeholder',
        seed: SAMPLE_CYCLE[i % SAMPLE_CYCLE.length],
      });
  }
  return out;
}

function adaptStrapiCats(strapi: StrapiPPCat[]): PPCat[] {
  return strapi.map((c) => ({
    k: c.k,
    medium: c.medium,
    fr: c.fr,
    en: c.en,
    tagline: c.tagline,
    price: c.price,
    note: c.note,
    features: c.features,
    formats: c.formats ?? [],
    samples: fillSamples(c.samples ?? []),
  }));
}

const PostprodPage = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  const { postProdTypes } = useLoaderData({ from: '/$lang/post-production' });
  // `adaptStrapiCats` reconstruit tout le tableau (et six échantillons par
  // catégorie) à chaque rendu. Sans mémo, son identité change à chaque passe et
  // sert de dépendance à l'effet ci-dessous.
  const cats: PPCat[] = useMemo(
    () => (postProdTypes ? adaptStrapiCats(postProdTypes) : []),
    [postProdTypes],
  );

  const { type = '' } = useSearch({ from: '/$lang/post-production' });
  const navigate = useNavigate();
  const setFilters = (next: string | null) =>
    navigate({ to: '.', search: next ? { type: next } : {} });

  // Auto-select the first available cat when the URL param is missing OR points
  // to a slug that no longer exists in Strapi. The auto-selection must NOT
  // pollute the URL — fall back silently to"no param" (the default state).
  const hasValidType = !!type && cats.some((c) => c.k === type);
  // Dépend de `hasValidType`, pas de `cats` : un booléen stable plutôt qu'un
  // tableau réalloué. L'ancienne version relançait la navigation à chaque rendu,
  // et son `eslint-disable` visait une règle qui n'est pas installée.
  useEffect(() => {
    if (type && cats.length > 0 && !hasValidType) setFilters(null);
  }, [type, hasValidType, cats.length]);

  const k = hasValidType ? type : (cats[0]?.k ?? '');
  const cat = cats.find((c) => c.k === k) || cats[0];

  const defaultK = cats[0]?.k;
  const setType = (next: string) => {
    setFilters(!next || next === defaultK ? null : next);
  };

  const navigateToType = (nextK: string) => {
    if (nextK !== k) setType(nextK);
  };

  // Index dans `media` ci-dessous, pas dans la grille : les deux coïncident
  // tant que `fillSamples` place les médias réels en tête, ce qu'il fait.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const postprodLabel = t('common.postProdLong');
  const dark = !!cat?.featured;
  const bgCls = cn('bg-background', dark && 'dark');

  if (!cat) {
    // Le h1 reste dans l'arbre même sans catégorie, pour qu'il y en ait
    // toujours exactement un (le titre de catégorie ci-dessous est un h2).
    return (
      <>
        <h1 className="sr-only">{postprodLabel}</h1>
        <Empty size="page">
          <EmptyHeader>
            <EmptyTitle>{postprodLabel}</EmptyTitle>
            <EmptyDescription>
              {t('postprod.emptyDescription')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={() => goto('home')}>
              {t('postprod.backHome')}
            </Button>
          </EmptyContent>
        </Empty>
      </>
    );
  }

  // Le visionneur de la galerie prend un projet ; on lui en fabrique un depuis
  // la catégorie courante, comme le fait déjà la page d'article. Seuls les
  // médias réels y entrent : les placeholders sont des SVG générés, il n'y a
  // rien à voir en grand.
  const media: GalleryMedia[] = cat.samples
    .slice(0, 6)
    .filter((s): s is PPSample => s.kind !== 'placeholder')
    .map((s) =>
      s.kind === 'video'
        ? { kind: 'video', url: s.url, alt: s.alt, mime: s.mime }
        : { kind: 'image', url: s.url, alt: s.alt },
    );

  return (
    <>
      {/* Mobile: single-column scrollable. Desktop (md+): sidebar + workspace */}
      {/* `<main class="contents">` : voir home-page. */}
      {/* Trois rangées et non deux : l'en-tête, le corps, et une rangée de pied
 en `auto` que se partagent la note du rail et le pavé d'action. Ils étaient
 auparavant chacun collé au bas de SA colonne — la note par `mt-auto` dans
 le rail, le CTA par la sous-grille du panneau — et leurs deux filets
 tombaient donc à 7px l'un de l'autre, mesuré à l'écran. Deux cellules qui
 doivent s'aligner appartiennent à la même rangée de grille ; toute autre
 méthode est une coïncidence qu'il faut entretenir à la main, et que la
 traduction anglaise casserait au premier retour à la ligne de plus. */}
      <PageShell className="app:grid-cols-[var(--spacing-logo)_minmax(0,1fr)_auto] app:grid-rows-[var(--spacing-header)_minmax(0,1fr)_auto]">
        <main id={MAIN_ID} className="contents">
          {/* Single, stable page h1 — data-independent so it's present at every
 breakpoint and before Strapi resolves. The selected category is an h2. */}
          <h1 className="sr-only">{postprodLabel}</h1>

          {/* Une des trois copies littérales du même bloc barre + tiroir. */}
          <SelectionDrawer
            title={postprodLabel}
            items={cats.map((c) => ({
              key: c.k,
              label: c[lang],
              sub: c.tagline[lang],
            }))}
            activeKey={k}
            onSelect={navigateToType}
            closeLabel={t('common.close')}
          />

          {/* La colonne de gauche, masquée sous le palier où la barre de
              sélection ci-dessus la remplace. `Rail` et non un `<aside>` écrit
              à la main : il porte la même chaîne `flex min-h-0 flex-col
              overflow-y-auto bg-background`, à ceci près que la copie locale
              avait perdu le `min-h-0`. */}
          <Rail className="hidden app:col-start-1 app:row-start-2 app:flex app:overflow-x-hidden">
            {cats.map((c, idx) => (
              <RailCell
                key={c.k}
                number={ordinal(idx)}
                label={c[lang]}
                sub={
                  c.price?.kind === 'quote'
                    ? t('common.onRequest')
                    : `${c.price.from ? `${t('postprod.from')} ` : ''}${c.price.amount}${c.price.unit?.[lang] ?? ''}`
                }
                density="tall"
                active={k === c.k}
                onSelect={() => setType(c.k)}
              />
            ))}
          </Rail>

          {/* La note du rail, désormais cellule de la rangée de pied.

 Elle portait `bg-muted`, qui est EXACTEMENT la couleur de survol des
 cellules du rail (`oklch(0.97 0 0)`, vérifié à l'écran) : posée en
 permanence, elle donnait un bloc gris coincé sur un état de survol — le
 défaut que `rail-cell.tsx` raconte avoir corrigé pour l'état choisi.

 Et le sur-titre « À noter » est parti avec. Il n'apportait rien : il
 annonçait une phrase qui s'annonce toute seule, et il le faisait dans
 l'orange de marque — la couleur la plus forte du site, dépensée pour un
 mot vide, à l'endroit le plus périphérique de l'écran. C'est le même
 défaut que le point médian et le tiret cadratin que le dépôt bannit : un
 signe émis parce qu'il fallait remplir, pas parce qu'il y avait à dire.

 Plus de `border-t` non plus : c'est la gouttière de la rangée qui trace
 le filet, et elle le trace sur toute la largeur de l'écran.

 `items-center` parce que la rangée est dimensionnée par la plus haute des
 deux cellules — le CTA — et que la note, plus courte, y flotterait sinon
 en haut. */}
          <p className="hidden bg-background px-4 py-3 text-xs leading-normal text-pretty text-muted-foreground app:col-start-1 app:row-start-3 app:flex app:items-center">
            {t('postprod.noteBody')}
          </p>

          {/* Mobile-only category subheading (h2). The page h1 is the stable"Post-production" title above; the sticky trigger surfaces the name +
 tagline visually on mobile, so this stays in the a11y tree only. */}
          <h2 className="sr-only app:hidden">{cat[lang]}</h2>

          {/* Description + pricing panel.

 `p-pad-cell` : le canon du dépôt, celui que `size="cell"` pose déjà sur le
 CTA en dessous. Le panneau disait `py-8 px-6 md:px-9` — 32 et 36px, deux
 valeurs hors échelle — et son contenu démarrait donc 16px à droite de
 celui du CTA, dans la même colonne. Un décalage ne se voit qu'en
 franchissant la frontière entre deux cellules. */}
          <div
            className={cn(
              bgCls,
              'text-foreground p-pad-cell flex flex-col justify-between gap-6 app:col-start-2 app:row-start-2 app:overflow-y-auto app:min-h-0',
            )}
          >
            <div className="flex flex-col gap-5">
              {cat.featured && (
                <StatusBadge>{t('postprod.standard')}</StatusBadge>
              )}
              {/* `text-3xl` — « titre de section » de l'échelle. Le panneau
 portait `text-5xl`, réservé au titre de PAGE : c'était le seul h2 du site
 à ce corps, et il rendait au même corps que le prix juste en dessous. */}
              <h2 className="hidden app:block m-0 text-3xl font-light leading-none tracking-tighter">
                {cat[lang]}
              </h2>
              {/* La tagline vient du CMS (`description` de la prestation) et ne
 vivait que dans le rail et le tiroir mobile — le panneau, qui est pourtant
 l'endroit où on lit la prestation, ne la montrait pas. Elle dit ce que la
 liste de puces en dessous ne dit pas : à qui ça s'adresse. */}
              {cat.tagline[lang] && (
                <p className="hidden app:block m-0 max-w-prose text-base leading-relaxed text-pretty text-muted-foreground">
                  {cat.tagline[lang]}
                </p>
              )}
              <ul className="mt-2 p-0 list-none flex flex-col gap-1.5">
                {cat.features[lang].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm leading-snug"
                  >
                    <span className="text-primary font-mono shrink-0">+</span>
                    <span className="min-w-0">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Le prix ferme le panneau. Il ne porte plus de filet à lui : le
 vrai filet est la gouttière juste en dessous, celle qui le sépare du
 CTA. Un `border-t` en retrait du padding doublait ce trait, décalé. */}
            {cat.price && (
              <div className="flex items-baseline">
                {cat.price.kind === 'quote' ? (
                  // « Sur devis » n'est pas un montant : pas de `tabular-nums`
                  // à lui appliquer, donc pas de `Price`. Il en emprunte
                  // seulement l'échelle.
                  <span className="text-3xl font-light leading-none tracking-tighter">
                    {t('common.onRequest')}
                  </span>
                ) : (
                  <Price
                    size="2xl"
                    from={cat.price.from ? t('postprod.from') : undefined}
                    value={cat.price.amount ?? ''}
                    unit={cat.price.unit?.[lang]}
                  />
                )}
              </div>
            )}
          </div>

          <CtaCell
            title={t('postprod.requestQuote')}
            onClick={() => goto('contact')}
            className="app:col-start-2 app:row-start-3"
          />

          {/* Sample media grid — images + videos (EDO-222).
 `row-end-4` : la mosaïque enjambe le corps ET la rangée de pied, elle
 descend donc jusqu'au bas de l'écran comme avant. La gouttière entre les
 deux rangées passe derrière elle sans la couper.

 TROIS colonnes sur DEUX rangées à toutes les tailles — le layout de la
 maquette, qui ne se recompose jamais — et la vignette en 4/5, comme la
 galerie.

 Le 4/5 n'est pas un choix esthétique ici : le CMS livre ces photos en 4/5
 (mesuré, 253×316 et 337×422). Une vignette d'un autre ratio oblige
 `object-cover` à zoomer dans la photo et à en rogner les côtés — le sujet
 grossit et se rapproche à chaque redimensionnement, ce qui se lit comme une
 déformation. En 4/5 la photo entre exactement, sans un pixel de recadrage.

 DEUX colonnes sur TROIS rangées, et c'est la LARGEUR de la mosaïque qui se
 déduit de la hauteur de l'écran — pas l'inverse.

 Les photos sont livrées en 4/5 par le CMS (mesuré : 253×316, 337×422). La
 vignette doit donc être en 4/5, sinon `object-cover` zoome dedans et rogne
 les côtés. Une colonne dont la largeur vient de l'écran ne peut pas contenir
 six vignettes en 4/5 sans laisser un reste — il valait 178px à 1440×900.

 En dimensionnant la mosaïque sur la hauteur, il n'y a plus de reste : trois
 rangées se partagent la hauteur utile, une vignette 4/5 vaut les quatre
 cinquièmes d'une rangée, la mosaïque en vaut deux de large — soit
 `(100vh - en-tête - gouttière) × 8 / 15`. La colonne de grille est en `auto`
 et s'y ajuste ; le panneau, en `1fr`, prend tout le reste de la largeur.

 La soustraction est écrite avec le token et non avec les 57px qu'elle vaut :
 c'est la bande d'en-tête plus sa gouttière, donc elle doit suivre
 `--spacing-header` le jour où il bouge. Mesuré à huit tailles de 390 à 2560 :
 vignette à 0,80 partout, aucun défilement, aucun vide, aucune photo
 recadrée. */}
          <div className="app:col-start-3 app:row-start-2 app:row-end-4 app:h-full app:min-h-0 app:w-[calc((100vh_-_var(--spacing-header)_-_1px)_*_8_/_15)] app:overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-border app:h-full app:grid-cols-2">
              {cat.samples.slice(0, 6).map((sample, i) => {
                const cellCls = cn(dark && 'dark');
                const inner = (
                  <SampleImage
                    sample={sample}
                    medium={cat.medium}
                    priority={i < 2}
                  />
                );
                if (sample.kind === 'placeholder') {
                  return (
                    <MediaFrame key={i} className={cellCls}>
                      {inner}
                    </MediaFrame>
                  );
                }
                return (
                  <MediaFrame
                    key={i}
                    className={cn(cellCls, 'p-0')}
                    render={
                      <Button
                        type="button"
                        onClick={() => setLightboxIndex(i)}
                        // Six vignettes sans nom propre : le verbe dit ce que fait
                        // le bouton, l'index dit laquelle. Même clé que la galerie.
                        aria-label={t('galleryPage.enlargeImage', {
                          name: cat[lang],
                          index: i + 1,
                        })}
                        variant="cell"
                        size="cell"
                      />
                    }
                  >
                    {inner}
                  </MediaFrame>
                );
              })}
            </div>
          </div>
        </main>
      </PageShell>

      {lightboxIndex !== null && media.length > 0 && (
        <GalleryLightbox
          project={{
            id: 0,
            brand: cat[lang],
            cat: cat.k,
            plateau: '',
            year: '',
            tone: 'mono',
            media,
          }}
          initialIndex={lightboxIndex}
          lang={lang}
          onClose={() => setLightboxIndex(null)}
          onBook={() => {
            setLightboxIndex(null);
            goto('book');
          }}
          onContact={() => {
            setLightboxIndex(null);
            goto('contact');
          }}
        />
      )}
    </>
  );
};

export { PostprodPage };
