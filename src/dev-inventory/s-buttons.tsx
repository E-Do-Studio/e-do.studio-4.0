import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';

// Les CTA sont reproduits avec leurs classes exactes, y compris les doubles
// espaces (`justify-between  md:flex`) : ce sont eux, tels qu'ils rendent.

const VARIANTS = [
  'default',
  'cell',
  'header',
  'outline',
  'secondary',
  'ghost',
  'destructive',
  'link',
] as const;

const SIZES = [
  { size: 'default', h: '32px' },
  { size: 'sm', h: '28px' },
  { size: 'lg', h: '36px' },
  { size: 'touch', h: '44px — cible tactile' },
  { size: 'icon', h: '32×32' },
  { size: 'icon-xs', h: '24×24 — 1 usage' },
  { size: 'icon-sm', h: '28×28' },
  { size: 'icon-lg', h: '36×36' },
] as const;

const CANCELLED = [
  {
    source: 'book/shared.tsx:94',
    variant: 'outline' as const,
    size: 'icon-sm' as const,
    cls: 'h-8 w-7.5 flex-none basis-8 border-border text-base normal-case tracking-normal hover:border-foreground',
    note: '6 classes sur 7 de size="icon-sm" (size-7) neutralisées, plus la police de la base.',
    label: '+',
  },
  {
    source: 'step-contact.tsx:176',
    variant: 'outline' as const,
    size: 'default' as const,
    cls: 'h-auto min-w-0 justify-start gap-1 px-2 py-1 text-xs normal-case tracking-tight',
    note: 'size="default" annulé intégralement.',
    label: 'Prêt-à-porter',
  },
  {
    source: 'assistant-chat.tsx:720 et :822',
    variant: 'default' as const,
    size: 'default' as const,
    cls: 'h-auto w-full px-3 py-2 text-sm normal-case tracking-normal',
    note: 'Deux copies de la même annulation, dans le même fichier.',
    label: 'Envoyer',
  },
  {
    source: 'cookie-banner.tsx:66',
    variant: 'link' as const,
    size: 'default' as const,
    cls: 'inline h-auto p-0 text-sm normal-case tracking-normal text-foreground underline underline-offset-2',
    note: 'variant="link" pose text-primary, le className le repeint en foreground.',
    label: 'en savoir plus',
  },
  {
    source: 'mobile-nav-strip.tsx:283',
    variant: 'default' as const,
    size: 'default' as const,
    cls: 'min-h-11 flex-1 bg-foreground text-background hover:opacity-90',
    note: 'Le CTA orange est repeint en noir. C’est un variant="cell" qui s’ignore.',
    label: 'Appliquer',
  },
];

export const SectionButtons = () => (
  <Section
    id="boutons"
    title="Boutons & CTA"
    count="9 variants × 11 sizes · 7 CTA orange"
    intro="Button est bien adopté — 36 fichiers, 2 <button> bruts seulement. Le problème est ailleurs : sept traitements différents pour la même action « réserver / envoyer », et neuf sites dont le className annule le variant qu'ils viennent de demander."
  >
    <Subsection title="Variants — button.tsx:50-92">
      <Specimen source="src/components/ui/button.tsx" tone="canon">
        <div className="flex flex-wrap items-center gap-3">
          {VARIANTS.map((v) => (
            <div key={v} className="flex flex-col items-start gap-1">
              <Button variant={v}>{v}</Button>
              <code className="font-mono text-[9px] text-neutral-500">{v}</code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Sizes"
      note="Le site posait 38 min-h-11 à la main parce qu'aucune size n'atteignait la cible tactile de 44px. C'est désormais size=&quot;touch&quot;."
    >
      <Specimen
        source="src/components/ui/button.tsx:93-118"
        tone="canon"
        note="size=&quot;touch&quot; ajoutée. size=&quot;xs&quot; (0 usage) et les quatre rounded-[min(var(--radius-md),Npx)], qui calculaient toujours 0 puisque --radius vaut 0, ont été retirés."
      >
        <div className="flex flex-wrap items-end gap-3">
          {SIZES.map((s) => (
            <div key={s.size} className="flex flex-col items-start gap-1">
              <Button variant="outline" size={s.size}>
                {s.size.startsWith('icon') ? <ArrowRight /> : s.size}
              </Button>
              <code className="font-mono text-[9px] text-neutral-500">
                {s.h}
              </code>
            </div>
          ))}
        </div>
      </Specimen>

      <SpecimenGrid min="300px">
        <Specimen
          source='size="cell" — button.tsx:109'
          tone="canon"
          note="La forme dominante du site : hauteur libre, contenu empilé, aligné à gauche, casse normale."
        >
          <Button variant="cell" size="cell" className="w-full">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              01
            </span>
            <span className="text-3xl font-light leading-none tracking-tighter">
              Cyclorama
            </span>
          </Button>
        </Specimen>
        <Specimen
          source='size="header" — button.tsx:111'
          tone="canon"
          note="Action pleine hauteur de la bande d'en-tête."
        >
          <div className="flex h-header items-stretch border border-border">
            <Button variant="header" size="header" aria-current="page">
              Galerie
            </Button>
            <Button variant="header" size="header">
              Contact
            </Button>
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Les 7 CTA orange — même action, 7 hauteurs"
      note="Chaque échantillon est posé dans le contexte de hauteur de sa page d'origine (piste de grille, min-h). Les écarts ne sont pas des effets de rendu : ce sont les classes."
    >
      <SpecimenGrid min="330px">
        <Specimen
          source="home-page.tsx:296-310"
          tone="canon"
          note="84px (piste --spacing-cta) · p-5 · sur-titre à /75 · le plus abouti des sept."
        >
          <div
            className="grid"
            style={{ gridTemplateRows: 'var(--spacing-cta)' }}
          >
            <Button size="cell" className="group justify-between  md:flex">
              <span className="font-mono text-xs uppercase tracking-widest text-primary-foreground/75">
                Demander un devis ou
              </span>
              <div className="flex items-end justify-between gap-2.5">
                <div className="min-w-0 text-3xl font-light leading-none tracking-tighter">
                  Réserver
                </div>
                <ArrowRight data-icon="inline-end" />
              </div>
            </Button>
          </div>
        </Specimen>

        <Specimen
          source="plateau-page.tsx:503-521"
          tone="copie"
          note="80px (min-h-20) · sur-titre à /80 — 5 % d'écart avec le précédent · titre text-2xl tracking-tight, sans font-light ni leading-none."
        >
          <Button size="cell" className="min-h-20 w-full justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-primary-foreground/80">
              06 · Réserver
            </span>
            <div className="flex w-full items-end justify-between text-primary-foreground">
              <span className="text-2xl tracking-tight">
                Réserver ce plateau
              </span>
              <ArrowRight data-icon="inline-end" />
            </div>
          </Button>
        </Specimen>

        <Specimen
          source="discovery/book-cta-cell.tsx:27-52"
          tone="copie"
          note="≈56px (px-6 py-4 annule le p-5 de size=&quot;cell&quot;) · flex-row · sur-titre à /75 · flèche recolorée explicitement."
        >
          <Button
            size="cell"
            className="w-full flex-row items-center justify-between px-6 py-4"
          >
            <span className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-widest text-primary-foreground/75">
                Réserver
              </span>
              <span className="text-2xl font-light leading-none tracking-tighter">
                Prendre un créneau
              </span>
            </span>
            <ArrowRight className="text-primary-foreground" />
          </Button>
        </Specimen>

        <Specimen
          source="postprod-page.tsx:559-565"
          tone="casse"
          note="32px. size=&quot;default&quot; impose h-8 : le py-3.5 demandé est purement ignoré. Le CTA fait 38 % de la hauteur de celui de l'accueil."
        >
          <Button className="mt-2 w-full justify-between px-5 py-3.5">
            Demander un devis
            <ArrowRight data-icon="inline-end" />
          </Button>
        </Specimen>

        <Specimen
          source="contact-form.tsx:159-171"
          tone="copie"
          note="44px, imposés par la piste de grille — écrite en littéral 44px alors que --spacing-band vaut exactement ça, dans le même fichier."
        >
          <div className="grid" style={{ gridTemplateRows: '44px' }}>
            <Button className="h-full gap-3.5 ">
              Envoyer <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </Specimen>

        <Specimen
          source="book-confirmation.tsx:326-334"
          tone="copie"
          note="44px en dur (h-11) · px-6 · gap-2 — une 3e géométrie pour le même bouton d'envoi."
        >
          <Button className="mt-0 h-11 gap-2 px-6">
            Retour à l’accueil
            <ArrowRight data-icon="inline-end" />
          </Button>
        </Specimen>

        <Specimen
          source="mobile-nav-strip.tsx:281-291"
          tone="copie"
          note="44px, mais repeint en noir : bg-foreground text-background sur variant=&quot;default&quot;. Ce n'est plus un CTA orange, c'est un variant=&quot;cell&quot; inversé qui s'ignore."
        >
          <Button className="min-h-11 w-full flex-1 bg-foreground text-background hover:opacity-90">
            Appliquer
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
        </Specimen>
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Hovers concurrents"
      note="Trois conventions pour survoler la même surface orange."
    >
      <Specimen
        source="button.tsx:51 · book-picker.tsx:36 · step-date.tsx:259"
        tone="copie"
        note="opacity-90 (base, 6 sites) · bg-primary/90 · bg-primary/85. Survolez les trois."
      >
        <div className="flex flex-wrap gap-3">
          <span className="cursor-pointer bg-primary px-4 py-2 font-mono text-xs uppercase tracking-widest text-primary-foreground transition-all duration-150 hover:opacity-90">
            opacity-90
          </span>
          <span className="cursor-pointer bg-primary px-4 py-2 font-mono text-xs uppercase tracking-widest text-primary-foreground transition-all duration-150 hover:bg-primary/90">
            bg-primary/90
          </span>
          <span className="cursor-pointer bg-primary px-4 py-2 font-mono text-xs uppercase tracking-widest text-primary-foreground transition-all duration-150 hover:bg-primary/85">
            bg-primary/85
          </span>
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Le className qui annule le variant — 9 sites"
      note="Signal constant : normal-case tracking-normal, écrit 7 fois. La base impose uppercase tracking-widest à des boutons qui ne sont pas des libellés mono. Il manque un variant « texte courant »."
    >
      <SpecimenGrid min="300px">
        {CANCELLED.map((c) => (
          <Specimen key={c.source} source={c.source} tone="copie" note={c.note}>
            <div className="flex flex-col gap-2">
              <Button variant={c.variant} size={c.size} className={c.cls}>
                {c.label}
              </Button>
              <code className="block font-mono text-[10px] leading-snug text-neutral-500">
                {c.cls}
              </code>
            </div>
          </Specimen>
        ))}
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Les <a> qui réécrivent Button à la main"
      note="Button accepte render={<a href/>} — le motif est utilisé six fois ailleurs dans le dépôt. Ces cinq sites redisent la base, le variant et le focus canonique en quinze classes."
    >
      <SpecimenGrid min="300px">
        <Specimen
          source="not-found-page.tsx:71-79"
          tone="copie"
          note="Réécrit variant=&quot;outline&quot; + la base + le focus, classe par classe."
        >
          <a
            href="#boutons"
            className="inline-flex items-center justify-center border border-border bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-widest text-foreground no-underline outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
          >
            Galerie
          </a>
        </Specimen>

        <Specimen
          source="not-found-page.tsx:110-118"
          tone="copie"
          note="CTA principal du 404 : h-10 (une 8e hauteur), pas de justify-center, dark bg-background au lieu de variant=&quot;default&quot;. Contient un double espace."
        >
          <a
            href="#boutons"
            className="dark inline-flex h-10 cursor-pointer items-center gap-2  bg-background px-5 font-mono text-xs uppercase tracking-widest text-foreground no-underline outline-none transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
          >
            Retour à l’accueil
          </a>
        </Specimen>

        <Specimen
          source="nav-menu.tsx:78-95 et :108-128"
          tone="copie"
          note="Deux copies de la même chaîne de 15 classes, à 30 lignes d'écart dans le même fichier. min-h-13 est une 4e hauteur de cellule (52px)."
        >
          <div className="flex flex-col">
            <a
              href="#boutons"
              aria-current="page"
              className="relative flex min-h-13 cursor-pointer flex-col justify-between gap-1 border-b border-border px-4 py-2.5 text-foreground no-underline outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground aria-[current=page]:text-primary"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                01
              </span>
              <span className="mt-auto text-base text-current">Galerie</span>
            </a>
            <a
              href="#boutons"
              className="relative flex min-h-13 cursor-pointer flex-col justify-between gap-1 border-b border-border px-4 py-2.5 text-foreground no-underline outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                02
              </span>
              <span className="mt-auto text-base text-current">
                Instagram ↗
              </span>
            </a>
          </div>
        </Specimen>

        <Specimen
          source="contact-page.tsx:496-500"
          tone="casse"
          note="Aucun focus-visible, aucun outline : lien clavier sans indicateur. Devrait être variant=&quot;link&quot; + MonoLabel tone=&quot;primary&quot;."
        >
          <a
            href="#boutons"
            className="self-center font-mono text-xs tracking-widest text-primary no-underline"
          >
            contact@e-do.studio
          </a>
        </Specimen>
      </SpecimenGrid>
    </Subsection>
  </Section>
);
