import { MonoLabel } from '@/ui/mono-label';
import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';

// Les chaînes de classes sont écrites en littéral dans les tableaux ci-dessous :
// c'est ce qui permet à Tailwind de les générer (il scanne le texte source) et
// ce qui garantit que l'échantillon est bien la classe relevée, pas une
// approximation.

// Les 19 signatures typographiques trouvées pour UN SEUL rôle : le libellé mono
// capitale. `MonoLabel` les résume toutes.
const MONO_SIGNATURES: {
  cls: string;
  n: number;
  where: string;
  gap?: string;
}[] = [
  {
    cls: 'font-mono text-xs uppercase tracking-widest',
    n: 85,
    where: 'majoritaire — 40 fichiers',
    gap: 'manque font-normal et leading-none',
  },
  {
    cls: 'font-mono text-xs tracking-widest',
    n: 30,
    where: 'book/shared.tsx:55,136',
    gap: 'pas de capitales — souvent un numéro d’index',
  },
  {
    cls: 'font-mono text-xs font-normal uppercase tracking-widest',
    n: 28,
    where: 'booking-side-panel.tsx:30',
    gap: 'le plus proche du canon — manque leading-none',
  },
  {
    cls: 'font-mono text-xs tracking-wide',
    n: 11,
    where: 'booking-side-panel.tsx:89,136',
    gap: 'interlettrage divergent',
  },
  {
    cls: 'font-mono text-xs uppercase tracking-wider',
    n: 9,
    where: 'book/shared.tsx:71,149',
    gap: 'interlettrage divergent',
  },
  {
    cls: 'font-mono text-xs',
    n: 6,
    where: 'divers',
    gap: 'ni casse ni interlettrage',
  },
  {
    cls: 'font-mono text-xs uppercase tracking-wide',
    n: 4,
    where: 'book/shared.tsx:162',
    gap: 'interlettrage divergent',
  },
  {
    cls: 'font-mono',
    n: 4,
    where: 'divers',
    gap: 'aucune classe typographique',
  },
  {
    cls: 'font-mono text-xs tracking-wider',
    n: 3,
    where: 'booking-side-panel.tsx:211',
  },
  {
    cls: 'font-mono text-base tracking-tight',
    n: 3,
    where: 'champs numériques',
  },
  { cls: 'font-mono text-sm', n: 2, where: 'divers' },
  { cls: 'font-mono uppercase tracking-widest', n: 1, where: 'sans taille' },
  { cls: 'font-mono tracking-widest', n: 1, where: 'sans taille ni casse' },
  { cls: 'font-mono text-xs tracking-tight', n: 1, where: 'divers' },
  { cls: 'font-mono text-sm uppercase tracking-widest', n: 1, where: 'divers' },
  { cls: 'font-mono text-sm tracking-widest', n: 1, where: 'divers' },
  { cls: 'font-mono text-base tracking-widest', n: 1, where: 'divers' },
  { cls: 'font-mono text-xs font-bold tracking-widest', n: 1, where: 'divers' },
  { cls: 'font-mono text-base font-bold', n: 1, where: 'divers' },
];

// Le fichier qui se contredit lui-même : il définit sa constante ligne 30, puis
// écrit six autres interlettrages en dessous.
const SIDE_PANEL_SIGNATURES = [
  {
    line: ':30 (const LABEL)',
    cls: 'font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground',
  },
  { line: ':89', cls: 'font-mono text-xs tracking-wide text-muted-foreground' },
  {
    line: ':136',
    cls: 'font-mono text-xs tracking-wide text-muted-foreground',
  },
  {
    line: ':155',
    cls: 'font-mono text-xs uppercase tracking-wide text-muted-foreground',
  },
  {
    line: ':204',
    cls: 'font-mono text-xs uppercase tracking-wider text-muted-foreground',
  },
  {
    line: ':211',
    cls: 'font-mono text-xs tracking-wider text-muted-foreground',
  },
  {
    line: ':215',
    cls: 'font-mono text-xs leading-normal tracking-wide text-muted-foreground',
  },
];

const TITLE_SIGNATURES = [
  {
    cls: 'text-5xl font-light leading-none tracking-tighter',
    where: 'discovery-post-page.tsx:144',
    n: '6 pages',
  },
  {
    cls: 'text-3xl font-light leading-none tracking-tighter',
    where: 'legal-page.tsx:331 · home-page.tsx:271',
    n: '4 sites',
  },
  {
    cls: 'text-3xl font-light leading-tight tracking-tighter',
    where: 'not-found-page.tsx:104 · contact-form.tsx:193',
    gap: 'leading-tight au lieu de leading-none',
  },
  {
    cls: 'text-2xl font-light leading-none tracking-tighter',
    where: 'contact-form.tsx:82 · book-cta-cell.tsx:42',
  },
  {
    cls: 'text-2xl tracking-tight',
    where: 'plateau-page.tsx:517',
    gap: 'ni font-light ni leading-none',
  },
  {
    cls: 'text-2xl font-light leading-snug tracking-tight',
    where: 'article-card.tsx:79',
    gap: 'leading-snug + tracking-tight',
  },
];

const PRICE_SIGNATURES = [
  {
    cls: 'text-5xl font-light leading-none tracking-tight',
    where: 'postprod-page.tsx:547',
    gap: 'pas de tabular-nums',
  },
  {
    cls: 'text-5xl font-light leading-none tracking-tighter',
    where: 'step-duration.tsx:97',
    gap: 'pas de tabular-nums',
  },
  {
    cls: 'text-3xl font-light tracking-tighter tabular-nums',
    where: 'book-confirmation.tsx:264',
  },
  {
    cls: 'text-3xl font-light tracking-tight tabular-nums',
    where: 'booking-side-panel.tsx:207',
    gap: 'tracking-tight ici, tracking-tighter là',
  },
  { cls: 'text-base tabular-nums', where: 'book/shared.tsx:165' },
  { cls: 'text-sm tabular-nums', where: 'step-plateau.tsx:87' },
];

const INDEX_SIGNATURES = [
  {
    cls: 'font-mono text-xs tracking-widest text-muted-foreground',
    where: 'shared.tsx:55 · plateau:370 · postprod:467',
  },
  {
    cls: 'min-w-5.5 font-mono text-xs tracking-widest',
    where: 'booking-stepper.tsx:112',
    gap: 'largeur fixe pour aligner ce que tabular-nums réglerait',
  },
  {
    cls: 'w-7 shrink-0 font-mono text-xs font-normal uppercase tracking-widest text-primary',
    where: 'step-configurator.tsx:98',
    gap: 'seul numéro orange au repos, 2e largeur fixe',
  },
  {
    cls: 'font-mono text-xs uppercase tracking-widest text-muted-foreground',
    where: 'step-configurator.tsx:392',
  },
  {
    cls: 'font-mono text-xs uppercase leading-none tracking-widest text-muted-foreground',
    where: 'nav-menu.tsx:63,91',
  },
];

const WEIGHTS = [
  { cls: 'font-light', label: '300 — livrée' },
  { cls: 'font-normal', label: '400 — livrée' },
  { cls: 'font-medium', label: '500 — ABSENTE' },
  { cls: 'font-semibold', label: '600 — ABSENTE' },
  { cls: 'font-bold', label: '700 — livrée' },
];

export const SectionTypography = () => (
  <Section
    id="typo"
    title="Typographie"
    count="212 littéraux mono · 12 MonoLabel"
    intro="Le libellé mono capitale est l'atome le plus fréquent du site. Un composant existe pour lui — MonoLabel — et il est adopté à 5 %. Les dix-neuf signatures ci-dessous décrivent toutes le même rôle."
  >
    <Subsection
      title="Graisses réellement disponibles"
      note="ABC Favorit ne livre que 300, 400 et 700. font-medium et font-semibold rendent donc identiques à font-normal — ils sont pourtant écrits 5 fois dans src/components/ui/."
    >
      <Specimen source="styles.css:11-73" tone="casse">
        <div className="flex flex-col gap-1">
          {WEIGHTS.map((w) => (
            <div key={w.cls} className="flex items-baseline gap-4">
              <span className={`w-40 shrink-0 text-2xl ${w.cls}`}>
                Réserver
              </span>
              <code className="font-mono text-[10px] text-neutral-500">
                {w.cls} — {w.label}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Le libellé mono capitale — 19 signatures pour un rôle"
      note="Toutes rendent la même chaîne. La première est le composant ; les dix-neuf suivantes sont écrites à la main, quelque part dans src/**."
    >
      <Specimen
        source="src/ui/mono-label.tsx:19-20"
        tone="canon"
        note="12 usages. Sa seule différence avec le littéral majoritaire est leading-none — c'est pourquoi la migration demande un coup d'œil et non un sed."
      >
        <div className="flex items-baseline gap-4">
          <MonoLabel className="w-56 shrink-0">Post-production</MonoLabel>
          <code className="font-mono text-[10px] text-neutral-500">
            font-mono text-xs font-normal uppercase tracking-widest leading-none
          </code>
        </div>
      </Specimen>

      <Specimen
        source="src/** — 212 occurrences sur 44 fichiers"
        tone="copie"
        note="171 tracking-widest, 21 tracking-wider, 17 tracking-wide : 38 libellés portent un interlettrage qui n'est pas celui du site, souvent dans la même colonne qu'un libellé conforme."
      >
        <div className="flex flex-col divide-y divide-neutral-200">
          {MONO_SIGNATURES.map((s) => (
            <div
              key={s.cls}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2"
            >
              <span className={`w-56 shrink-0 ${s.cls}`}>Post-production</span>
              <code className="w-10 shrink-0 font-mono text-[10px] text-primary">
                {s.n}×
              </code>
              <code className="min-w-0 flex-1 font-mono text-[10px] text-neutral-500">
                {s.cls}
              </code>
              {s.gap && (
                <code className="font-mono text-[10px] text-neutral-400">
                  {s.gap}
                </code>
              )}
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        source="booking-side-panel.tsx:30,89,136,155,204,211,215"
        tone="casse"
        note="Un seul fichier de 225 lignes. Il définit sa propre constante de libellé ligne 30 — copie textuelle de MonoLabel — puis la contredit six fois en dessous, sur quatre interlettrages."
      >
        <div className="flex flex-col divide-y divide-neutral-200">
          {SIDE_PANEL_SIGNATURES.map((s) => (
            <div
              key={s.line}
              className="flex flex-wrap items-baseline gap-x-4 py-1.5"
            >
              <code className="w-32 shrink-0 font-mono text-[10px] text-neutral-500">
                {s.line}
              </code>
              <span className={`w-44 shrink-0 ${s.cls}`}>Durée</span>
              <code className="min-w-0 flex-1 font-mono text-[10px] text-neutral-400">
                {s.cls.replace('text-muted-foreground', '')}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Titres — 10 signatures, 3 rôles"
      note="Le motif canonique est text-{2,3,5}xl font-light tracking-tighter leading-none. Il est écrit quatorze fois à la main, et deux sites s'en écartent sans le dire."
    >
      <SpecimenGrid min="340px">
        {TITLE_SIGNATURES.map((t) => (
          <Specimen
            key={t.cls}
            source={t.where}
            tone={t.gap ? 'copie' : 'canon'}
            note={t.gap ?? t.n}
          >
            <p className={`m-0 ${t.cls}`}>Post-production</p>
            <code className="mt-2 block font-mono text-[10px] text-neutral-500">
              {t.cls}
            </code>
          </Specimen>
        ))}
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Prix — 6 signatures"
      note="Le prix change de graisse, d'interlettrage et de présence de tabular-nums selon l'écran. Il manque aux deux plus gros chiffres du site, ceux qui en ont le plus besoin."
    >
      <SpecimenGrid min="300px">
        {PRICE_SIGNATURES.map((p) => (
          <Specimen
            key={p.where}
            source={p.where}
            tone={p.gap ? 'copie' : 'canon'}
            note={p.gap}
          >
            <p className={`m-0 ${p.cls}`}>1 490 €</p>
            <code className="mt-2 block font-mono text-[10px] text-neutral-500">
              {p.cls}
            </code>
          </Specimen>
        ))}
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Numéro d'index — 7 signatures"
      note="Rôle strictement identique : String(i+1).padStart(2,'0'). Deux d'entre elles posent une largeur fixe arbitraire (w-7, min-w-5.5) pour aligner ce que tabular-nums réglerait — qu'aucune n'utilise."
    >
      <Specimen
        source="7 fichiers · 41 padStart dans le dépôt"
        tone="copie"
        note="Aucun helper. legal-page.tsx:294 écrit même `0${i+1}` en dur : au 10e document il affiche « 010 »."
      >
        <div className="flex flex-col divide-y divide-neutral-200">
          {INDEX_SIGNATURES.map((s) => (
            <div
              key={s.where}
              className="flex flex-wrap items-baseline gap-x-4 py-2"
            >
              <span className={`shrink-0 ${s.cls}`}>07</span>
              <code className="w-64 shrink-0 font-mono text-[10px] text-neutral-500">
                {s.where}
              </code>
              {s.gap && (
                <code className="min-w-0 flex-1 font-mono text-[10px] text-neutral-400">
                  {s.gap}
                </code>
              )}
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>
  </Section>
);
