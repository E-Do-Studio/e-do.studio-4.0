import { useEffect, useState } from 'react';
import { useLoaderData, useParams } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { CarouselNav } from './ui/carousel-nav';
import { Rail, RailCell } from './ui/rail-cell';
import { SelectionDrawer } from './ui/selection-drawer';
import { ordinal } from './lib/format';
import { Pause, Play } from 'lucide-react';
import { MonoLabel } from './ui/mono-label';
import { SectionIntro } from './ui/section-intro';
import { PageShell } from './ui/page-shell';
import { MAIN_ID } from './ui/skip-link';
import { ResponsiveImage } from './ui/responsive-image';
import { MediaFrame } from './ui/media-frame';
import { cn } from '@/lib/utils';
import { VideoLoop } from './ui/video-loop';
import { usePageContext } from './lib/page-context';
import type { PlateauSpec } from './lib/strapi';
import { useT } from './i18n/use-t';
import type { Lang } from './types';
import type { MediaItem } from './lib/strapi';
import { CtaCell } from './ui/cta-cell';
import { KeyValueList, KeyValueRow } from './ui/key-value-row';

interface CoverCarouselProps {
  items: MediaItem[];
  lang: Lang;
  plateauName: string;
  index: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

// Cover — renders the currently selected media item full-cell with prev/next
// arrows overlaid inside the image. Arrows are hidden when only one media item.
// object-fit switches per media based on aspect ratio: only clearly landscape
// sources (aspect > ~1.3, matching the cell's landscape ratio) use
// `object-cover` to fill cleanly. Square and portrait sources use
// `object-contain` to preserve the subject — a packshot or square scarf must
// never be charcuted to fill the wider cell. Falls back to `cover` when
// natural dims are unknown. Controls are frosted-glass squares fading in on
// hover (always visible on touch).
const COVER_ASPECT_THRESHOLD = 1.3;
const Cover = ({
  items,
  lang,
  plateauName,
  index,
  onPrev,
  onNext,
  className,
}: CoverCarouselProps) => {
  const t = useT();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    setPaused(false);
  }, [index]);

  if (items.length === 0) return null;
  const item = items[index];
  const hasMultiple = items.length > 1;
  const total = items.length;
  const imageAspect =
    item.width && item.height ? item.width / item.height : null;
  const fit: 'cover' | 'contain' =
    imageAspect != null && imageAspect < COVER_ASPECT_THRESHOLD
      ? 'contain'
      : 'cover';
  // Contrôle posé sur la photo : sa toile de fond n'est pas une surface du
  // thème mais l'image elle-même. Le scope `dark` fait résoudre les tokens
  // vers la palette sombre — même voile foncé qu'avant, sans couleur écrite
  // en dur. Le reste (curseur, centrage, anneau de focus, transition) vient
  // déjà de la base de `Button`.
  const ctrlBtn =
    'dark absolute z-10 border border-foreground/20 bg-background/35 text-foreground backdrop-blur-md hover:bg-background/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100';

  return (
    // La couverture remplit sa cellule, comme toutes les cellules du bento :
    // 4/3 sous le palier, la rangée de grille au dessus. Son ratio suit donc la
    // fenêtre — c'est la contrepartie du remplissage bord à bord, et elle est
    // acceptable ici : une seule photo, jamais réduite à une tranche, et
    // `fit` bascule en `contain` pour les sources qui ne supportent pas d'être
    // recadrées (voir le seuil plus haut).
    //
    // `tone="background"` : le seul cadre du site dont le vide reste visible
    // une fois l'image chargée — ce fond est celui de la page, pas le gris de
    // chargement.
    <MediaFrame
      ratio="photo"
      tone="background"
      className={cn('group app:aspect-auto app:min-h-0', className)}
      role={hasMultiple ? 'group' : undefined}
      aria-roledescription={hasMultiple ? 'carousel' : undefined}
      aria-label={hasMultiple ? t('common.imageCarousel') : undefined}
    >
      {item.kind === 'video' ? (
        <VideoLoop
          key={item.url}
          src={item.url}
          poster={item.poster}
          objectFit={fit}
          paused={paused}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <ResponsiveImage
          key={item.url}
          src={item.url}
          alt={item.alt[lang] || `${plateauName} — ${index + 1}`}
          sizes="(min-width: 768px) 60vw, 100vw"
          priority
          fit={fit}
        />
      )}

      {item.kind === 'video' && (
        <Button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t('common.playVideo') : t('common.pauseVideo')}
          aria-pressed={paused}
          size="icon-lg"
          className={cn(ctrlBtn, 'bottom-3 right-3')}
        >
          {paused ? (
            <Play size={16} strokeWidth={1.5} />
          ) : (
            <Pause size={16} strokeWidth={1.5} />
          )}
        </Button>
      )}

      {hasMultiple && (
        <>
          <CarouselNav onPrev={onPrev} onNext={onNext} />
          <span aria-live="polite" className="sr-only">
            {`${index + 1} / ${total}`}
          </span>
        </>
      )}
    </MediaFrame>
  );
};

interface ThumbStripProps {
  items: MediaItem[];
  lang: Lang;
  plateauName: string;
  activeIndex: number;
  onSelect: (i: number) => void;
  className?: string;
}

// Thumbnail strip — every media item is rendered as a tile and fills 1/n of the
// strip width, so the full set is visible at once with no scroll and no arrows.
// Clicking a tile sets it as the cover. Inactive tiles are dimmed; the active
// tile is shown at full opacity.
const ThumbStrip = ({
  items,
  lang,
  plateauName,
  activeIndex,
  onSelect,
  className,
}: ThumbStripProps) => {
  if (items.length === 0) return null;
  // Les bases doivent totaliser exactement 100 % pour que la dernière tuile
  // s'aligne sur la frontière de colonne au-dessus.
  const tileBasis = `${100 / items.length}%`;
  // Strip occupies ~60vw on desktop (same column span as the cover) and 100vw
  // on mobile, divided by n tiles. Without this hint the browser would pick
  // the 245w `thumbnail_` derivative and stretch it — visible blur.
  const tileSizes = `(min-width: 768px) ${Math.ceil(60 / items.length)}vw, ${Math.ceil(100 / items.length)}vw`;

  return (
    <div className={cn('relative h-16 app:h-full', className)}>
      <div className="flex h-full gap-px bg-border overflow-hidden">
        {items.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            // La tuile prend la hauteur de la bande, pas un ratio : c'est la
            // bande qui est mesurée, et les n tuiles s'y partagent la largeur.
            <MediaFrame
              key={`${item.url}-${i}`}
              ratio="fill"
              tone="background"
              className={cn(
                'group p-0 opacity-60 transition-opacity',
                'hover:opacity-100 aria-[current=true]:opacity-100',
              )}
              style={{ flexBasis: tileBasis }}
              render={
                <Button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={`${item.alt[lang] || plateauName} — ${i + 1} / ${items.length}`}
                  aria-current={isActive ? 'true' : undefined}
                />
              }
            >
              {item.kind === 'video' ? (
                <VideoLoop
                  src={item.url}
                  poster={item.poster}
                  objectFit="cover"
                  paused={isActive}
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <ResponsiveImage
                  src={item.previewUrl ?? item.url}
                  alt={item.alt[lang] || `${plateauName} — ${i + 1}`}
                  sizes={tileSizes}
                />
              )}
            </MediaFrame>
          );
        })}
      </div>
    </div>
  );
};

interface PlateauPageProps {
  slug: string;
  plateaux: Record<string, PlateauSpec> | null;
}

const PlateauPage = ({ slug, plateaux }: PlateauPageProps) => {
  const t = useT();
  const { lang, goto } = usePageContext();
  const [activeIndex, setActiveIndex] = useState(0);
  if (!plateaux) return null;
  const p = plateaux[slug] || plateaux.cyclorama;
  if (!p) return null;
  const order = ['live', 'eclipse', 'horizontal', 'vertical', 'cyclorama'];
  const coverItems: MediaItem[] = p.media ?? [];
  const safeIndex =
    coverItems.length === 0
      ? 0
      : ((activeIndex % coverItems.length) + coverItems.length) %
        coverItems.length;
  const goPrev = () => setActiveIndex((i) => i - 1);
  const goNext = () => setActiveIndex((i) => i + 1);

  // Mobile navigation between plateaux: a sticky row at the top of the page
  // shows the currently selected plateau (number, name, tagline, arrow);
  // tapping it opens a Drawer listing all plateaux. Tapping a row in the
  // sheet navigates immediately and closes the sheet.
  const navigateToPlateau = (key: string) => {
    if (key === slug) {
      return;
    }
    goto(key === 'cyclorama' ? 'cyclorama' : `plateau-${key}`);
  };

  return (
    /* Mobile: single-column stacked, scrollable. Desktop (app+): 4-column bento */
    /* `<main class="contents">` : voir home-page — la grille impose l'en-tête
       et le contenu comme frères, le landmark ne doit pas englober le premier. */
    <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_78px_minmax(0,1.58fr)_minmax(0,0.5fr)_minmax(0,0.52fr)]">
      <main id={MAIN_ID} className="contents">
        {/* `SelectionDrawer` rend les mêmes `RailCell` que la colonne desktop.
            Le commentaire d'origine reconnaissait ici copier le gabarit de
            `MobileNavStrip` — la copie est remplacée par le composant. */}
        <SelectionDrawer
          title={t('common.stages')}
          items={order
            .filter((m) => plateaux[m])
            .map((m) => ({
              key: m,
              label: plateaux[m].name,
              sub: plateaux[m].tagline[lang],
            }))}
          activeKey={slug}
          onSelect={navigateToPlateau}
          closeLabel={t('common.close')}
        />

        {/* Desktop sidebar: vertical list, hidden on mobile (replaced by inline pill nav). */}
        <Rail className="hidden app:col-start-1 app:row-start-2 app:row-span-4 app:flex app:overflow-x-hidden">
          {order.map((m, i) => {
            const cfg = plateaux[m];
            if (!cfg) return null;
            return (
              <RailCell
                key={m}
                number={ordinal(i)}
                label={cfg.name}
                sub={cfg.tagline[lang]}
                density="tall"
                active={m === slug}
                onSelect={() =>
                  goto(m === 'cyclorama' ? 'cyclorama' : 'plateau-' + m)
                }
              />
            );
          })}
        </Rail>

        {/* Cover — current media item with prev/next arrows overlaid inside the
 image. The cover and the thumbnail strip below share `activeIndex`,
 so navigating either control keeps both in sync. */}
        {coverItems.length > 0 && (
          <Cover
            items={coverItems}
            lang={lang}
            plateauName={p.name}
            index={safeIndex}
            onPrev={goPrev}
            onNext={goNext}
            className="app:col-start-2 app:col-span-2 app:row-start-2 app:row-span-2 app:min-h-0"
          />
        )}

        {/* Thumbnail strip — every media item visible at once (1/n width each),
 no scroll, no arrows. Clicking a tile sets it as the cover. */}
        {coverItems.length > 0 && (
          <ThumbStrip
            items={coverItems}
            lang={lang}
            plateauName={p.name}
            activeIndex={safeIndex}
            onSelect={setActiveIndex}
            className="app:col-start-2 app:col-span-2 app:row-start-4 app:min-h-0"
          />
        )}

        {/* Name + tagline. Hidden on mobile because the sticky picker trigger
 above already shows the plateau name + tagline — repeating them as a
 large hero right under the trigger felt duplicated. The trigger acts
 as the mobile heading; the desktop layout still surfaces this block
 in the right-hand column. The h1 below stays in the DOM on mobile
 via sr-only so screen readers always have a page heading. */}
        <h1 className="sr-only app:hidden">{p.name}</h1>

        {/* `px-4 py-3.5` par-dessus le `px-pad-cell py-4` de la variante : les
            trois cellules qui suivent dans cette colonne sont en `px-4`, et un
            titre en retrait de 20 quand son voisin l'est de 16 se voit à la
            jonction. C'est la colonne entière qui s'écarte du canon, pas cette
            cellule-ci — la remettre seule d'aplomb la désalignerait. */}
        <SectionIntro
          size="xs"
          kicker={p.tagline[lang]}
          kickerTone="muted"
          title={p.name}
          className="hidden bg-background px-4 py-3.5 app:col-start-4 app:row-start-2 app:flex app:justify-between"
        />

        {/* Specifications */}
        {/* Plus de retrait horizontal ici : c'est la ligne qui le porte, sinon
            son filet s'arrête à 16px des deux bords de la cellule. La colonne
            entière étant à 16, la liste demande `pad="tight"`. */}
        <div className="bg-background py-3 flex flex-col gap-1.5 app:col-start-4 app:row-start-3">
          <KeyValueList
            pad="tight"
            heading={t('plateau.specs')}
            className="min-h-0 flex-1"
          >
            {p.specs.map((s) => (
              <KeyValueRow
                key={s.k.fr}
                density="tight"
                label={s.k[lang]}
                value={
                  <span className="line-clamp-2 whitespace-pre-line">
                    {(s.v[lang] || '').split(' · ').join(' ')}
                  </span>
                }
              />
            ))}
          </KeyValueList>
        </div>

        {/* Rates */}
        <div className="bg-background pt-2.5 pb-3 flex flex-col gap-1 app:col-start-4 app:row-start-4">
          <KeyValueList
            pad="tight"
            heading={t('plateau.rates')}
            className="min-h-0 flex-1"
          >
            {p.rates.map((r) => (
              <KeyValueRow
                key={r.k.fr}
                density="tight"
                numeric
                label={r.k[lang]}
                value={typeof r.v === 'string' ? r.v : r.v[lang]}
              />
            ))}
          </KeyValueList>
          {p.ratesNote && (
            // Le champ vient du CMS, où la rédaction sépare ses mentions par un
            // « · ». On ne peut pas le lui interdire côté Strapi : on découpe à
            // l'affichage, et c'est la gouttière qui sépare — même règle que
            // pour le code (voir CLAUDE.md, « Never chain words with · »).
            //
            // `px-pad-tight` reprend le palier que la liste au-dessus demande
            // par son nom : cette mention est hors de la liste, elle ne peut pas
            // hériter de `--kv-pad`. Le token, lui, est le même.
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 break-words px-pad-tight font-mono text-xs leading-normal tracking-widest text-muted-foreground">
              {p.ratesNote[lang]
                .split('·')
                .map((part) => part.trim())
                .filter(Boolean)
                .map((part) => (
                  <span key={part}>{part}</span>
                ))}
            </div>
          )}
        </div>

        {/* Description + Uses */}
        <div className="bg-background p-4 flex justify-between items-start gap-6 app:col-start-2 app:col-span-2 app:row-start-5">
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <MonoLabel tone="muted">{t('common.description')}</MonoLabel>
            <p className="m-0 text-xs text-foreground leading-normal max-w-2xl">
              {p.desc[lang]}
            </p>
          </div>
          <div className="flex-none w-40 flex flex-col gap-1.5">
            <MonoLabel tone="muted">{t('plateau.uses')}</MonoLabel>
            <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
              {p.uses.map((a) => (
                <li
                  key={a.fr}
                  className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {a[lang]}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Book CTA */}
        <CtaCell
          size="cta"
          kicker={
            <>
              <span>06</span>
              <span>{t('common.bookNow')}</span>
            </>
          }
          title={t('common.bookThisStage')}
          onClick={() => {
            try {
              localStorage.setItem('', slug);
            } catch {}
            goto('book');
          }}
          className="app:col-start-4 app:row-start-5"
        />
      </main>
    </PageShell>
  );
};

const CycloramaPage = () => {
  const { plateaux } = useLoaderData({ from: '/$lang/cyclorama' });
  return <PlateauPage slug="cyclorama" plateaux={plateaux} />;
};

const PlateauSlugPage = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const { plateaux } = useLoaderData({ from: '/$lang/plateau/$slug' });
  return <PlateauPage key={slug} slug={slug} plateaux={plateaux} />;
};

export { PlateauPage, CycloramaPage, PlateauSlugPage };
