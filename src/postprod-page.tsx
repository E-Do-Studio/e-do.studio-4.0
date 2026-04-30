import { useState } from 'react';
import { Button, IconArrowRight, PageHeader } from './ui';
import type { Bilingual } from './types';
import { usePageContext } from './router';

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

const PP_CATS: PPCat[] = [
  {
    k:'on-model', medium:'photo',
    fr:'On model', en:'On model',
    tagline:{fr:'Shoot porté sur mannequin',en:'On-model shoot'},
    price:{amount:'7,90€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Retouche peau, maquillage, cheveux et nettoyage textile.",
      en:'Skin, make-up, hair retouch and fabric cleanup.',
    },
    features:{
      fr:['Détourage','Changement de fond','Nettoyage peau','Étalonnage couleur','Nettoyage textile','Harmonisation silhouette'],
      en:['Cutout','Background change','Skin cleanup','Color grading','Fabric cleanup','Silhouette harmonization'],
    },
    formats:['JPG','TIFF','PSD'],
    samples:['warm-a','warm-b','warm-c','warm-d','warm-e','warm-b'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'ghost', medium:'photo',
    fr:'Ghost', en:'Ghost',
    tagline:{fr:'Mannequin invisible, effet porté',en:'Invisible mannequin, worn look'},
    price:{amount:'5,40€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Assemblage avant / arrière, disparition du mannequin, volume naturel. Doublures, cols ouverts et superpositions gérés.",
      en:'Front / back assembly, mannequin removal, natural volume. Linings, open collars and layering handled.',
    },
    features:{
      fr:['Détourage','Changement de fond','Disparition mannequin','Étalonnage couleur','Nettoyage textile','Revolumisation et harmonisation du vêtement'],
      en:['Cutout','Background change','Mannequin removal','Color grading','Fabric cleanup','Garment revolumizing & harmonization'],
    },
    formats:['JPG','PNG','TIFF','PSD'],
    samples:['mono-a','mono-b','mono-c','mono-d','mono-e','mono-a'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'a-plat', medium:'photo',
    fr:'Flat', en:'Flat',
    tagline:{fr:'Posé à plat, vue zénithale',en:'Laid flat, top view'},
    price:{amount:'5,40€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Mise à plat stylée, découpe clean, ombre maîtrisée. Pour e-shop et éditorial.",
      en:'Styled flat lay, clean cutout, controlled shadow. For e-shop and editorial.',
    },
    features:{
      fr:['Détourage','Changement de fond','Nettoyage textile','Étalonnage couleur','Revolumisation et harmonisation du vêtement'],
      en:['Cutout','Background change','Fabric cleanup','Color grading','Garment revolumizing & harmonization'],
    },
    formats:['JPG','PNG','TIFF'],
    samples:['mono-b','mono-c','mono-d','mono-a','mono-e','mono-c'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'accessoires', medium:'photo',
    fr:'Accessoires', en:'Accessories',
    tagline:{fr:'Maroquinerie · bijoux · souliers · cosmétique · eyewear · food & spiritueux',en:'Leather · jewelry · shoes · cosmetics · eyewear · food & spirits'},
    price:{amount:'5,40€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Traitement matières, cuirs, métaux, pierres. Détail et texture préservés.",
      en:'Materials, leather, metal, stones. Detail and texture preserved.',
    },
    features:{
      fr:['Détourage','Changement de fond','Nettoyage','Étalonnage couleur','Travail des matières et reflets','Revolumisation et harmonie des lignes','Mise en valeur des détails et textures'],
      en:['Cutout','Background change','Cleanup','Color grading','Materials & reflections work','Revolumizing & line harmonization','Detail & texture enhancement'],
    },
    formats:['JPG','TIFF','PSD'],
    samples:['warm-c','warm-d','warm-a','warm-e','warm-b','warm-d'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'pique', medium:'photo',
    fr:'Piqué', en:'Pinned',
    tagline:{fr:'Épinglé sur panneau vertical',en:'Pinned on vertical board'},
    price:{amount:'7,90€', unit:{fr:'',en:''}, from:true},
    note:{
      fr:"Pièce présentée sur mousse ou épingles, nettoyage complet des fixations et remise en forme.",
      en:'Garment on foam or pins, full removal of fixings and reshaping.',
    },
    features:{
      fr:['Détourage','Changement de fond','Nettoyage épingles & mousse','Étalonnage couleur','Nettoyage textile','Revolumisation et harmonisation du vêtement'],
      en:['Cutout','Background change','Pin & foam cleanup','Color grading','Fabric cleanup','Garment revolumizing & harmonization'],
    },
    formats:['JPG','TIFF','PSD'],
    samples:['mono-c','mono-a','mono-e','mono-d','mono-b','mono-a'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'high-end', medium:'photo',
    fr:'High end', en:'High end',
    tagline:{fr:'Campagne · éditorial · still life',en:'Campaign · editorial · still life'},
    price:{kind:'quote'},
    note:{
      fr:"Retouche haute couture : dodge & burn HD, compositing, matte-painting, pièce unique.",
      en:'High-couture retouch: HD dodge & burn, compositing, matte-painting, one-of-a-kind.',
    },
    features:{
      fr:['Retouche sur mesure'],
      en:['Bespoke retouching'],
    },
    formats:['TIFF','PSD','EXR'],
    samples:['dark-a','dark-b','dark-c','dark-d','dark-e','dark-b'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
  {
    k:'video', medium:'video',
    fr:'Vidéo', en:'Video',
    tagline:{fr:'Campagne · lookbook vidéo · contenu réseaux sociaux',en:'Campaign · video lookbook · social media content'},
    price:{kind:'quote'},
    note:{
      fr:"Post-production vidéo de A à Z : détourage, montage, étalonnage, motion design. Formats e-com, social, campagne et film de marque.",
      en:'Full video post-production: cutout, editing, color grading, motion design. E-com, social, campaign and brand film formats.',
    },
    features:{
      fr:['Détourage & montage','Étalonnage couleur','Motion design & titrages','Export multi-formats'],
      en:['Cutout & editing','Color grading','Motion design & titles','Multi-format export'],
    },
    formats:['MP4','MOV','ProRes','DNxHR'],
    samples:['mono-v-a','warm-v-c','dark-v-b','warm-v-d','mono-v-c','dark-v-d'],
    brands:['BRAND A','BRAND B','BRAND C','BRAND D','BRAND E','BRAND F'],
  },
];

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

const PostprodPage = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const [k, setK] = useState(PP_CATS[0].k);
  const cat = PP_CATS.find(c=>c.k===k) || PP_CATS[0];
  const dark = !!cat.featured;
  const bgCls = dark ? 'bg-foreground' : 'bg-white';
  const fgCls = dark ? 'text-white' : 'text-foreground';
  const mutedCls = dark ? 'text-white/62' : 'text-muted-foreground';
  const lineCls = dark ? 'border-white/18' : 'border-border';

  return (
    /* Mobile: single-column scrollable. Desktop (md+): sidebar + workspace */
    <div className="grid w-full gap-px bg-black overflow-y-auto md:h-full md:grid-cols-app md:grid-rows-app md:overflow-hidden">

      <PageHeader
        lang={lang}
        title="Post-production"
        className="col-span-full h-14 md:col-start-1 md:col-span-2 md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={()=>goto('home')}
        onLangToggle={()=>setLang(lang==='fr'?'en':'fr')}
        actions={[
          { id: 'gallery', label: lang==='fr'?'Galerie':'Gallery', onClick: () => goto('gallery'), className: 'hidden md:flex' },
          { id: 'book', label: lang==='fr'?'Réserver':'Book', onClick: () => goto('book'), variant: 'primary' },
        ]}
      />

      {/* Sidebar: horizontal tab scroll on mobile, vertical list on desktop */}
      <aside className="bg-white flex flex-row overflow-x-auto scrollbar-thin md:col-start-1 md:row-start-2 md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {PP_CATS.map((c,idx)=>{
          const active = k===c.k;
          const isLast = idx===PP_CATS.length-1;
          return (
            <button key={c.k} onClick={()=>setK(c.k)}
              className={`edo-focus-ring flex-none border-0 ${active?'bg-muted border-b-2 border-b-primary md:border-b-0 md:border-l-2 md:border-l-primary':'bg-white border-b-2 border-b-transparent md:border-b-0 md:border-l-2 md:border-l-transparent'} ${idx>0?'md:border-t md:border-t-border':''} ${isLast?'md:border-b md:border-b-border':''} py-3 px-4 cursor-pointer text-left flex flex-col gap-1 transition-all duration-150 min-h-16 md:min-h-18`}>
              <span className={`font-mono text-micro tracking-label ${active?'text-primary':'text-muted-foreground'}`}>{String(idx+1).padStart(2,'0')}</span>
              <span className={`text-detail ${active?'font-medium':'font-normal'} tracking-copy-tight text-foreground leading-snug whitespace-nowrap overflow-hidden text-ellipsis`}>{c[lang]}</span>
              <span className="hidden md:block font-mono text-micro text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis mt-auto">
                {c.price?.kind==='quote' ? (lang==='fr'?'Sur demande':'On request') : `${c.price.from?(lang==='fr'?'À partir de ':'From '):''}${c.price.amount}${c.price.unit?.[lang] ?? ''}`}
              </span>
            </button>
          );
        })}
        <div className="hidden md:block mt-auto py-3.5 px-4 border-t border-t-border flex-col gap-1.5 shrink-0 bg-muted">
          <span className="font-mono text-micro tracking-label uppercase text-primary">
            {lang==='fr'?'À noter':'Note'}
          </span>
          <span className="text-caption text-muted-foreground leading-normal text-pretty">
            {lang==='fr'?'Nous retouchons aussi vos images non shootées chez nous.':'We also retouch images not shot at our studio.'}
          </span>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="bg-black md:col-start-2 md:row-start-2">
        {/* Mobile: stacked layout; Desktop: 4-col × 2-row workspace */}
        <div className="grid gap-px bg-black grid-cols-1 md:grid-cols-postprod-workspace md:grid-rows-double md:h-full">

          {/* Description + pricing panel */}
          <div className={`${bgCls} ${fgCls} py-8 px-6 md:px-9 flex flex-col justify-between gap-6 md:col-start-1 md:row-start-1 md:row-span-2`}>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-label tracking-label text-primary">
                  {String(PP_CATS.findIndex(x=>x.k===k)+1).padStart(2,'0')} · {lang==='fr'?'CATÉGORIE':'CATEGORY'}
                </span>
                {cat.featured && (
                  <span className="font-mono text-nano tracking-label uppercase bg-primary text-white px-2 py-0.5">
                    {lang==='fr'?'Standard':'Standard'}
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
                      {lang==='fr'?'Sur demande':'On request'}
                    </span>
                  ) : (
                    <>
                      {cat.price.from && <span className={`font-mono text-label tracking-label uppercase ${mutedCls}`}>{lang==='fr'?'À partir de':'From'}</span>}
                      <span className={`text-hero font-light tracking-headline leading-none ${fgCls}`}>{cat.price.amount}</span>
                      <span className={`text-detail opacity-65 ${fgCls}`}>{cat.price.unit?.[lang] ?? ''}</span>
                    </>
                  )}
                </div>
              )}
              <Button onClick={()=>goto('contact')} className="w-full justify-between py-3.5 px-5 mt-2">
                {lang==='fr'?'Demander un devis':'Request a quote'}
                <IconArrowRight width="16" height="16"/>
              </Button>
            </div>
          </div>

          {/* Sample images — 3-col on mobile, individual cells on desktop */}
          <div className="grid grid-cols-3 gap-px bg-black md:contents">
            <div className={`${bgCls} relative overflow-hidden aspect-portrait md:col-start-2 md:row-start-1`}>
              <SampleImage seed={cat.samples[0]} label={cat.brands?.[0] || `${cat.k.toUpperCase()} · 01`} medium={cat.medium}/>
            </div>
            <div className={`${bgCls} relative overflow-hidden aspect-portrait md:col-start-3 md:row-start-1`}>
              <SampleImage seed={cat.samples[1]} label={cat.brands?.[1] || `${cat.k.toUpperCase()} · 02`} medium={cat.medium}/>
            </div>
            <div className={`${bgCls} relative overflow-hidden aspect-portrait md:col-start-4 md:row-start-1`}>
              <SampleImage seed={cat.samples[2]} label={cat.brands?.[2] || `${cat.k.toUpperCase()} · 03`} medium={cat.medium}/>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-black md:contents">
            <div className={`${bgCls} relative overflow-hidden aspect-portrait md:col-start-2 md:row-start-2`}>
              <SampleImage seed={cat.samples[3] || cat.samples[0]} label={cat.brands?.[3] || `${cat.k.toUpperCase()} · 04`} medium={cat.medium}/>
            </div>
            <div className={`${bgCls} relative overflow-hidden aspect-portrait md:col-start-3 md:row-start-2`}>
              <SampleImage seed={cat.samples[4] || cat.samples[1]} label={cat.brands?.[4] || `${cat.k.toUpperCase()} · 05`} medium={cat.medium}/>
            </div>
            <div className={`${bgCls} relative overflow-hidden aspect-portrait md:col-start-4 md:row-start-2`}>
              <SampleImage seed={cat.samples[5] || cat.samples[2]} label={cat.brands?.[5] || `${cat.k.toUpperCase()} · 06`} medium={cat.medium}/>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export { PostprodPage };
