import { useEffect, useState } from 'react';
import { Button, CellLabel, EmptyState, IconArrowRight, Loader, PageHeader, Wordmark } from './ui';
import { useDocumentMeta } from './lib/use-document-meta';
import { useStructuredData } from './lib/use-structured-data';
import { buildPostProdServiceSchema, buildBreadcrumbSchema } from './lib/structured-data';
import { usePostProdTypes } from './lib/use-strapi';
import type { PPCat as StrapiPPCat } from './lib/strapi';
import type { Bilingual } from './types';
import { usePageContext } from './router';
import { common, postprod as postprodMsg } from './i18n/messages';

interface PPPrice {
  amount?: string;
  unit?: Bilingual;
  from?: boolean;
  kind?: string;
}

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
  samples: string[];
  brands: string[];
  featured?: boolean;
}


interface PaletteColors {
  bg: string;
  a: string;
  b: string;
}

const PALETTES: Record<string, PaletteColors> = {
  'mono-a':{bg:'#f0f0f0',a:'#141414',b:'#bfbfbf'},'mono-b':{bg:'#e8e8e8',a:'#2a2a2a',b:'#a8a8a8'},
  'mono-c':{bg:'#dcdcdc',a:'#1a1a1a',b:'#8e8e8e'},'mono-d':{bg:'#f5f5f5',a:'#141414',b:'#c8c8c8'},
  'mono-e':{bg:'#c8c8c8',a:'#1a1a1a',b:'#7a7a7a'},
  'warm-a':{bg:'#e8dfcf',a:'#2a241c',b:'#b8ad94'},'warm-b':{bg:'#d9ccb0',a:'#3a2f20',b:'#a89674'},
  'warm-c':{bg:'#f0e7d4',a:'#2a241c',b:'#c4b694'},'warm-d':{bg:'#ddcfad',a:'#1f1a12',b:'#9e8a63'},
  'warm-e':{bg:'#cab995',a:'#1a1610',b:'#8e7a52'},
  'dark-a':{bg:'#1a1a1a',a:'#f0f0f0',b:'#3a3a3a'},'dark-b':{bg:'#0f0f0f',a:'#e8e8e8',b:'#2a2a2a'},
  'dark-c':{bg:'#141414',a:'#d8d8d8',b:'#333333'},'dark-d':{bg:'#1f1f1f',a:'#f0f0f0',b:'#404040'},
  'dark-e':{bg:'#0a0a0a',a:'#d0d0d0',b:'#262626'},
  'mono-v-a':{bg:'#d8d8d8',a:'#141414',b:'#8a8a8a'},'mono-v-b':{bg:'#ededed',a:'#2a2a2a',b:'#9e9e9e'},
  'mono-v-c':{bg:'#c4c4c4',a:'#141414',b:'#7a7a7a'},'mono-v-d':{bg:'#e0e0e0',a:'#1a1a1a',b:'#9a9a9a'},
  'mono-v-e':{bg:'#b8b8b8',a:'#141414',b:'#707070'},
  'warm-v-a':{bg:'#e0d2b4',a:'#2a241c',b:'#a8976e'},'warm-v-b':{bg:'#cfbe9a',a:'#1f1a12',b:'#8e7a52'},
  'warm-v-c':{bg:'#f2e7d0',a:'#2a241c',b:'#b8a47e'},'warm-v-d':{bg:'#d4c5a2',a:'#1f1a12',b:'#9e8a63'},
  'warm-v-e':{bg:'#c4b089',a:'#1a1610',b:'#7e6a42'},
  'dark-v-a':{bg:'#111111',a:'#e8e8e8',b:'#2e2e2e'},'dark-v-b':{bg:'#1c1c1c',a:'#f0f0f0',b:'#3e3e3e'},
  'dark-v-c':{bg:'#0a0a0a',a:'#d0d0d0',b:'#262626'},'dark-v-d':{bg:'#181818',a:'#e0e0e0',b:'#363636'},
  'dark-v-e':{bg:'#050505',a:'#c8c8c8',b:'#1e1e1e'},
};

interface SampleImageProps {
  seed: string;
  label?: string;
  medium: string;
}

const SampleImage = ({ seed, label, medium }: SampleImageProps) => {
  const p = PALETTES[seed] || PALETTES['mono-a'];
  const hash = [...seed].reduce((a,c)=>a+c.charCodeAt(0),0) % 5;
  return (
    <div className="relative w-full h-full overflow-hidden" style={{background: p.bg}}>
      <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        {hash===0 && (<><rect x="60" y="80" width="180" height="260" fill={p.b}/><ellipse cx="150" cy="200" rx="70" ry="110" fill={p.a}/></>)}
        {hash===1 && (<><rect x="0" y="240" width="300" height="160" fill={p.b}/><rect x="95" y="100" width="110" height="220" fill={p.a}/></>)}
        {hash===2 && (<><circle cx="150" cy="240" r="140" fill={p.b}/><rect x="130" y="60" width="40" height="220" fill={p.a}/></>)}
        {hash===3 && (<><path d="M 0 400 Q 150 160 300 400 Z" fill={p.b}/><circle cx="150" cy="150" r="55" fill={p.a}/></>)}
        {hash===4 && (<><ellipse cx="150" cy="220" rx="100" ry="150" fill={p.b}/><ellipse cx="150" cy="220" rx="55" ry="90" fill={p.a}/></>)}
      </svg>
      <div className="absolute inset-0 pointer-events-none bg-postprod-pattern"/>
      {medium==='video' && (
        <div className="absolute top-2 right-2 bg-black/55 text-white font-mono text-nano tracking-meta px-1.5 py-0.5 flex items-center gap-1">
          <span className="inline-block w-0 h-0 border-l-4 border-l-white border-t-3 border-t-transparent border-b-3 border-b-transparent"/>
          VIDEO
        </div>
      )}
      {label && <span className="absolute bottom-1.5 left-2 font-mono text-nano tracking-ui uppercase opacity-55" style={{color: p.a}}>{label}</span>}
    </div>
  );
};

const SAMPLE_CYCLE = ['warm-a','warm-b','warm-c','warm-d','warm-e','warm-b'];

function fillSamples(samples: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < 6; i++) out.push(samples[i] || SAMPLE_CYCLE[i % SAMPLE_CYCLE.length]);
  return out;
}

function adaptStrapiCats(strapi: StrapiPPCat[]): PPCat[] {
  return strapi.map(c => ({
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
    brands: c.brands ?? [],
  }));
}

const PostprodPage = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('postprod', lang);
  const ppQuery = usePostProdTypes();
  const cats: PPCat[] = ppQuery.data ? adaptStrapiCats(ppQuery.data) : [];
  useStructuredData('postprod', [
    ppQuery.data && ppQuery.data.length > 0
      ? buildPostProdServiceSchema({ cats: ppQuery.data, lang, pathname: '/post-production' })
      : null,
    buildBreadcrumbSchema(
      [
        { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
        { name: lang === 'fr' ? 'Post-production' : 'Post-production', pathname: '/post-production' },
      ],
      lang,
    ),
  ]);
  const [k, setK] = useState<string>('');
  useEffect(() => {
    if (!cats.find(c => c.k === k) && cats[0]) setK(cats[0].k);
  }, [cats, k]);
  const cat = cats.find(c=>c.k===k) || cats[0];
  const dark = !!cat?.featured;
  const bgCls = dark ? 'bg-foreground' : 'bg-white';
  const fgCls = dark ? 'text-white' : 'text-foreground';
  const mutedCls = dark ? 'text-white/62' : 'text-muted-foreground';
  const lineCls = dark ? 'border-white/18' : 'border-border';

  if (!cat) {
    if (ppQuery.loading) {
      return <Loader lang={lang} size="page" />;
    }
    return (
      <EmptyState
        size="page"
        label="Post-production"
        description={lang === 'fr' ? 'Aucune catégorie configurée. Renseignez vos types de post-production dans Strapi.' : 'No categories configured. Add post-production types in Strapi.'}
        action={{ label: lang === 'fr' ? 'Retour accueil' : 'Back home', onClick: () => goto('home') }}
      />
    );
  }

  return (
    /* Mobile: single-column scrollable. Desktop (md+): sidebar + workspace */
    <div className="edo-page-enter grid w-full gap-px bg-edo-pure-black md:h-full md:grid-cols-plateau md:grid-rows-app md:overflow-hidden">

      {/* Mobile header */}
      <PageHeader
        lang={lang}
        title="Post-production"
        className="col-span-full h-14 md:hidden"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={[
          { id: 'book', label: common.book[lang], onClick: () => goto('book'), variant: 'primary' },
        ]}
      />

      {/* Desktop col 1 – logo */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-1 md:row-start-1">
        <button onClick={()=>goto('home')} aria-label="E-Do Studio home" className="edo-focus-ring flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-background p-2 transition-colors hover:bg-muted">
          <Wordmark size={32} />
        </button>
      </div>

      {/* Desktop col 2 – title */}
      <div className="hidden md:flex h-full min-w-0 items-center bg-background px-6 md:col-start-2 md:row-start-1">
        <CellLabel className="shrink-0 text-primary">Post-production</CellLabel>
      </div>

      {/* Desktop col 3 – gallery */}
      <button onClick={()=>goto('gallery')} className="edo-focus-ring hidden md:flex h-full cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted md:col-start-3 md:row-start-1">
        <span className="whitespace-nowrap">{common.gallery[lang]}</span>
        <IconArrowRight width={12} height={12} />
      </button>

      {/* Desktop col 4 – book + lang toggle */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-4 md:row-start-1">
        <button onClick={()=>goto('book')} className="edo-focus-ring flex h-full flex-1 cursor-pointer items-center justify-center gap-2 border-0 bg-primary px-5 font-mono text-label tracking-ui uppercase text-white no-underline transition-colors hover:bg-foreground">
          <span className="whitespace-nowrap">{common.book[lang]}</span>
          <IconArrowRight width={12} height={12} />
        </button>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background p-0 transition-colors hover:bg-muted">
          <span className="font-mono text-label tracking-meta text-foreground">{common.langToggleLabel[lang]}</span>
        </button>
      </div>

      {/* Sidebar: horizontal tab scroll on mobile, vertical list on desktop */}
      <aside className="bg-white flex flex-row overflow-x-auto scrollbar-thin md:col-start-1 md:row-start-2 md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {cats.map((c,idx)=>{
          const active = k===c.k;
          const isLast = idx===cats.length-1;
          return (
            <button key={c.k} onClick={()=>setK(c.k)}
              className={`edo-focus-ring flex-none border-0 ${active?'bg-muted border-b-2 border-b-primary md:border-b-0 md:border-l-2 md:border-l-primary':'bg-white border-b-2 border-b-transparent md:border-b-0 md:border-l-2 md:border-l-transparent'} ${idx>0?'md:border-t md:border-t-border':''} ${isLast?'md:border-b md:border-b-border':''} py-3 px-4 cursor-pointer text-left flex flex-col gap-1 transition-all duration-150 min-h-16 md:min-h-18`}>
              <span className={`font-mono text-micro tracking-label ${active?'text-primary':'text-muted-foreground'}`}>{String(idx+1).padStart(2,'0')}</span>
              <span className={`text-detail ${active?'font-medium':'font-normal'} tracking-copy-tight text-foreground leading-snug whitespace-nowrap overflow-hidden text-ellipsis`}>{c[lang]}</span>
              <span className="hidden md:block font-mono text-micro text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis mt-auto">
                {c.price?.kind==='quote' ? common.onRequest[lang] : `${c.price.from?(postprodMsg.from[lang] + ' '):''}${c.price.amount}${c.price.unit?.[lang] ?? ''}`}
              </span>
            </button>
          );
        })}
        <div className="hidden md:flex mt-auto py-3.5 px-4 border-t border-t-border flex-col gap-1.5 shrink-0 bg-muted">
          <span className="font-mono text-micro tracking-label uppercase text-primary">
            {postprodMsg.note[lang]}
          </span>
          <span className="text-caption text-muted-foreground leading-normal text-pretty">
            {postprodMsg.noteBody[lang]}
          </span>
        </div>
      </aside>

      {/* Description + pricing panel */}
      <div className={`${bgCls} ${fgCls} py-8 px-6 md:px-9 flex flex-col justify-between gap-6 md:col-start-2 md:row-start-2 md:overflow-y-auto md:min-h-0`}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-label tracking-label text-primary">
              {String(cats.findIndex(x=>x.k===k)+1).padStart(2,'0')} · {postprodMsg.category[lang]}
            </span>
            {cat.featured && (
              <span className="font-mono text-nano tracking-label uppercase bg-primary text-white px-2 py-0.5">
                {postprodMsg.standard[lang]}
              </span>
            )}
          </div>
          <h1 className={`m-0 text-hero font-light tracking-display leading-none ${fgCls}`}>
            {cat[lang]}
          </h1>
          <span className={`font-mono text-caption tracking-code uppercase ${mutedCls}`}>
            {cat.tagline[lang]}
          </span>
          <ul className="mt-2 p-0 list-none flex flex-col gap-1.5">
            {cat.features[lang].map(f=>(
              <li key={f} className={`text-detail flex gap-2 items-start leading-snug ${fgCls}`}>
                <span className="text-primary font-mono shrink-0">+</span>
                <span className="min-w-0">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`flex flex-col gap-3 pt-4 border-t ${lineCls}`}>
          {cat.price && (
            <div className="flex items-baseline gap-2.5 flex-wrap">
              {cat.price.kind==='quote' ? (
                <span className={`text-page-title font-light tracking-headline leading-none ${fgCls}`}>
                  {common.onRequest[lang]}
                </span>
              ) : (
                <>
                  {cat.price.from && <span className={`font-mono text-label tracking-label uppercase ${mutedCls}`}>{postprodMsg.from[lang]}</span>}
                  <span className={`text-hero font-light tracking-headline leading-none ${fgCls}`}>{cat.price.amount}</span>
                  <span className={`text-detail opacity-65 ${fgCls}`}>{cat.price.unit?.[lang] ?? ''}</span>
                </>
              )}
            </div>
          )}
          <Button onClick={()=>goto('contact')} className="w-full justify-between py-3.5 px-5 mt-2">
            {postprodMsg.requestQuote[lang]}
            <IconArrowRight width="16" height="16"/>
          </Button>
        </div>
      </div>

      {/* Sample images grid */}
      <div className="grid grid-cols-3 gap-px bg-white md:col-start-3 md:col-span-2 md:row-start-2 md:grid-rows-double md:min-h-0">
        <div className={`${bgCls} relative overflow-hidden aspect-portrait`}>
          <SampleImage seed={cat.samples[0]} label={cat.brands?.[0] || `${cat.k.toUpperCase()} · 01`} medium={cat.medium}/>
        </div>
        <div className={`${bgCls} relative overflow-hidden aspect-portrait`}>
          <SampleImage seed={cat.samples[1]} label={cat.brands?.[1] || `${cat.k.toUpperCase()} · 02`} medium={cat.medium}/>
        </div>
        <div className={`${bgCls} relative overflow-hidden aspect-portrait`}>
          <SampleImage seed={cat.samples[2]} label={cat.brands?.[2] || `${cat.k.toUpperCase()} · 03`} medium={cat.medium}/>
        </div>
        <div className={`${bgCls} relative overflow-hidden aspect-portrait`}>
          <SampleImage seed={cat.samples[3] || cat.samples[0]} label={cat.brands?.[3] || `${cat.k.toUpperCase()} · 04`} medium={cat.medium}/>
        </div>
        <div className={`${bgCls} relative overflow-hidden aspect-portrait`}>
          <SampleImage seed={cat.samples[4] || cat.samples[1]} label={cat.brands?.[4] || `${cat.k.toUpperCase()} · 05`} medium={cat.medium}/>
        </div>
        <div className={`${bgCls} relative overflow-hidden aspect-portrait`}>
          <SampleImage seed={cat.samples[5] || cat.samples[2]} label={cat.brands?.[5] || `${cat.k.toUpperCase()} · 06`} medium={cat.medium}/>
        </div>
      </div>
    </div>
  );
};

export { PostprodPage };
