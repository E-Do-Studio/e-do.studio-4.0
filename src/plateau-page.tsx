import { useParams } from '@tanstack/react-router';
import { CellLabel, IconArrowRight, PageHeader } from './ui';
import { VideoLoop } from './ui/video-loop';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { buildPlateauServiceSchema, buildBreadcrumbSchema } from './lib/structured-data';
import { usePageContext } from './router';
import { usePlateaux } from './lib/use-strapi';
import { common, plateau as plateauMsg } from './i18n/messages';

const PlateauPage = ({ slug }: { slug: string }) => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const metaKey = slug === 'cyclorama' ? 'cyclorama' : `plateau-${slug}`;
  const { data: plateaux, loading } = usePlateaux();
  const seoOverride = plateaux?.[slug]?.seo?.[lang];
  useDocumentMeta(metaKey, lang, seoOverride);
  const pathname = slug === 'cyclorama' ? '/cyclorama' : `/plateau/${slug}`;
  const plateauForSchema = plateaux?.[slug];
  useStructuredData(`plateau-${slug}`, [
    plateauForSchema
      ? buildPlateauServiceSchema({ plateau: plateauForSchema, slug, lang, pathname })
      : null,
    buildBreadcrumbSchema(
      [
        { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
        { name: common.stages[lang], pathname },
        { name: plateauForSchema?.name || slug, pathname },
      ],
      lang,
    ),
  ]);
  if (loading || !plateaux) return null;
  const p = plateaux[slug] || plateaux.cyclorama;
  const order = ['live','eclipse','horizontal','vertical','cyclorama'];
  const hero = p.machineImage;
  // Carousel below the hero. The "main media" (machineImage) is included as
  // the first tile so the carousel surfaces it alongside the demo items; the
  // hero still anchors it visually above. Capped at 4 tiles total to keep the
  // strip readable.
  const demoMedia = (hero ? [hero, ...p.media] : p.media).slice(0, 4);

  return (
    /* Mobile: single-column stacked, scrollable. Desktop (md+): 4-column bento */
    <div className="edo-page-enter grid w-full gap-px bg-edo-pure-black md:h-full md:grid-cols-plateau md:grid-rows-plateau md:overflow-hidden">

      {/* Unified header — compact right-aligned actions on all breakpoints */}
      <PageHeader
        lang={lang}
        title={common.stages[lang]}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={[
          { id: 'postprod', label: 'Post-prod', onClick: () => goto('postprod'), className: 'hidden md:flex' },
          { id: 'gallery', label: common.gallery[lang], onClick: () => goto('gallery'), className: 'hidden md:flex' },
          { id: 'contact', label: common.contactUs[lang], onClick: () => goto('contact') },
        ]}
      />

      {/* Sidebar: horizontal scroll on mobile, vertical list on desktop */}
      <div className="bg-white flex flex-row overflow-x-auto md:col-start-1 md:row-start-2 md:row-span-4 md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {order.map((m, i) => {
          const cfg = plateaux[m];
          const active = m === slug;
          return (
            <button key={m} onClick={()=>goto(m==='cyclorama'?'cyclorama':'plateau-'+m)}
              className={`edo-focus-ring flex-none py-3.5 px-4 border-0 cursor-pointer text-left flex flex-col gap-1 transition-colors duration-150
                md:border-b md:border-border
                ${active ? 'bg-muted border-b-2 border-b-primary md:border-b-border md:border-l-2 md:border-l-primary' : 'bg-white border-b-2 border-b-transparent md:border-b-border md:border-l-2 md:border-l-transparent hover:bg-muted'}`}>
              <span className={`font-mono text-label tracking-label ${active?'text-primary':'text-muted-foreground'}`}>{String(i+1).padStart(2,'0')}</span>
              <span className={`text-cell tracking-copy-tight whitespace-nowrap ${active?'font-medium text-foreground':'font-normal text-muted-foreground'}`}>{cfg.name}</span>
              <span className="font-mono text-micro tracking-ui uppercase text-muted-foreground hidden md:block">{cfg.tagline[lang]}</span>
            </button>
          );
        })}
      </div>

      {/* Hero media — image OR video (autoplay/muted/loop). Skipped when no
          machineImage is set on the entry (no SVG placeholder). */}
      {hero && (
        <div className="relative overflow-hidden bg-white min-h-56 md:col-start-2 md:col-span-2 md:row-start-2 md:row-span-2 md:min-h-0">
          {hero.kind === 'video' ? (
            <VideoLoop
              src={hero.url}
              poster={hero.poster}
              objectFit="contain"
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <img
              src={hero.url}
              alt={hero.alt[lang] || p.name}
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
        </div>
      )}

      {/* Demo carousel — images OR videos (autoplay/muted/loop). Only renders
          as many tiles as the entry has media (capped at 4). */}
      {demoMedia.length > 0 && (
        <div
          className="grid gap-px bg-edo-pure-black md:col-start-2 md:col-span-2 md:row-start-4 md:min-h-0"
          style={{ gridTemplateColumns: `repeat(${demoMedia.length}, minmax(0, 1fr))` }}
        >
          {demoMedia.map((item, i) => (
            <div key={`${item.url}-${i}`} className="relative overflow-hidden bg-white">
              {item.kind === 'video' ? (
                <VideoLoop
                  src={item.url}
                  poster={item.poster}
                  objectFit="cover"
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.alt[lang] || ''}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Name + tagline */}
      <div className="bg-white py-3.5 px-4 flex flex-col justify-between gap-1 md:col-start-4 md:row-start-2">
        <CellLabel>{p.tagline[lang]}</CellLabel>
        <h1 className="text-tile-large font-light m-0 tracking-display leading-none">{p.name}</h1>
      </div>

      {/* Specifications */}
      <div className="bg-white p-3 px-4 flex flex-col gap-1.5 md:col-start-4 md:row-start-3">
        <CellLabel>{plateauMsg.specs[lang]}</CellLabel>
        <div className="flex flex-col flex-1 min-h-0">
          {p.specs.map((s, i) => (
            <div key={s.k.fr} className={`flex justify-between items-baseline gap-3 text-caption py-1 ${i < p.specs.length - 1 ? 'border-b border-border' : ''}`}>
              <span className="text-muted-foreground shrink-0">{s.k[lang]}</span>
              <span className="text-foreground font-mono tracking-caption text-label text-right whitespace-pre-line overflow-hidden line-clamp-2 leading-snug">{(s.v[lang]||'').split(' · ').join(' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rates */}
      <div className="bg-white px-4 pt-2.5 pb-3 flex flex-col gap-1 md:col-start-4 md:row-start-4">
        <CellLabel>{plateauMsg.rates[lang]}</CellLabel>
        <div className="flex flex-col flex-1 min-h-0">
          {p.rates.map((r, i) => (
            <div key={r.k.fr} className={`flex justify-between items-baseline text-caption py-1 ${i < p.rates.length - 1 ? 'border-b border-border' : ''}`}>
              <span className="text-muted-foreground">{r.k[lang]}</span>
              <span className="text-foreground font-mono tracking-caption text-caption">{typeof r.v === 'string' ? r.v : r.v[lang]}</span>
            </div>
          ))}
        </div>
        {p.ratesNote && (
          <div className="font-mono text-micro tracking-caption text-muted-foreground leading-normal mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {p.ratesNote[lang]}
          </div>
        )}
      </div>

      {/* Description + Uses */}
      <div className="bg-white p-4 flex justify-between items-start gap-6 md:col-start-2 md:col-span-2 md:row-start-5">
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <CellLabel>{common.description[lang]}</CellLabel>
          <p className="m-0 text-caption text-foreground leading-normal max-w-2xl">{p.desc[lang]}</p>
        </div>
        <div className="flex-none w-40 flex flex-col gap-1.5">
          <CellLabel>{plateauMsg.uses[lang]}</CellLabel>
          <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
            {p.uses.map(a => <li key={a.fr} className="text-caption text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">· {a[lang]}</li>)}
          </ul>
        </div>
      </div>

      {/* Book CTA */}
      <button onClick={()=>{ try{localStorage.setItem('edo-book-plateau', slug);}catch(e){} goto('book'); }}
        className="edo-focus-ring bg-primary p-4 border-0 cursor-pointer flex flex-col justify-between text-left text-white font-inherit min-h-20 transition-colors hover:bg-foreground hover:text-white md:col-start-4 md:row-start-5">
        <CellLabel className="text-white/80">06 · {common.bookNow[lang]}</CellLabel>
        <div className="flex justify-between items-end text-white w-full">
          <span className="text-tile-large font-medium tracking-headline">{common.bookThisStage[lang]}</span>
          <IconArrowRight width="20" height="20"/>
        </div>
      </button>
    </div>
  );
};

const CycloramaPage = () => <PlateauPage slug="cyclorama" />;

const PlateauSlugPage = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  return <PlateauPage key={slug} slug={slug} />;
};

export { PlateauPage, CycloramaPage, PlateauSlugPage };
