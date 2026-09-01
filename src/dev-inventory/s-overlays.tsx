import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';

// Les overlays eux-mêmes sont montés en portail : les ouvrir dans une page
// d'inventaire n'apprendrait rien de plus qu'un aller-retour sur le site. Ce
// qui se compare ici, c'est ce qui diverge réellement — la géométrie du bouton
// de fermeture (quatre tailles), l'opacité du voile (deux valeurs), et les
// quatre bandeaux faits main qui n'utilisent aucune primitive.

const CLOSERS = [
  {
    source: 'gallery-lightbox.tsx:182-345',
    size: 'icon-sm' as const,
    px: '28px',
    note: 'showCloseButton={false} + X maison en mix-blend-exclusion, masqué au repos sur desktop (md:opacity-0 md:group-hover:opacity-100).',
  },
  {
    source: 'postprod / plateau / legal / mobile-nav-strip (Drawer)',
    size: 'icon' as const,
    px: '32px',
    note: 'DrawerClose → variant="ghost" size="icon". La seule des quatre géométries qui soit posée par la primitive.',
  },
  {
    source: 'ui/mobile-assistant-fab.tsx:46-73 (Sheet)',
    size: 'icon' as const,
    px: '44px',
    cls: 'size-11',
    note: 'showCloseButton={false} + en-tête maison px-4 py-3, bouton forcé à size-11.',
  },
  {
    source: 'nav-menu.tsx:180-228 (Sheet)',
    size: 'icon' as const,
    px: '48px',
    cls: 'size-12 border-l',
    note: 'showCloseButton={false} + NavHeader maison : variant="header" size="icon" forcé à size-12, avec une bordure gauche.',
  },
];

export const SectionOverlays = () => (
  <Section
    id="overlays"
    title="Overlays"
    count="4 boutons de fermeture · 4 bandeaux faits main"
    intro="Les tiroirs, feuilles et modales passent bien par les primitives — c'est leur chrome qui diverge. Trois des quatre overlays désactivent le bouton de fermeture de la primitive pour en redessiner un, à une taille différente à chaque fois."
  >
    <Subsection
      title="Fermer — 4 géométries"
      note="Le même geste, au même endroit de l'écran, dans quatre tailles de cible. 28px et 32px sont sous la cible tactile de 44px."
    >
      <SpecimenGrid min="260px">
        {CLOSERS.map((c) => (
          <Specimen key={c.px} source={c.source} tone="copie" note={c.note}>
            <div className="flex items-center gap-4">
              <span className="flex items-center justify-center border border-dashed border-neutral-300">
                <Button
                  variant="ghost"
                  size={c.size}
                  className={c.cls}
                  aria-label="Fermer"
                >
                  <X />
                </Button>
              </span>
              <code className="font-mono text-xs text-neutral-600">{c.px}</code>
            </div>
          </Specimen>
        ))}
      </SpecimenGrid>
    </Subsection>

    <Subsection
      title="Voiles — 2 opacités"
      note="Trois overlays, deux valeurs. Rien ne distingue le rôle d'un tiroir de celui d'une feuille qui justifierait l'écart."
    >
      <Specimen
        source="dialog.tsx:36 · drawer.tsx:75 · sheet.tsx:30"
        tone="copie"
      >
        <div className="flex gap-4">
          {[
            ['bg-black/55', 'Dialog + Drawer'],
            ['bg-black/40', 'Sheet'],
          ].map(([cls, who]) => (
            <div key={cls} className="flex flex-col gap-1">
              <div className="relative h-16 w-32 overflow-hidden border border-neutral-300 bg-primary">
                <span
                  className={`absolute inset-0 ${cls === 'bg-black/55' ? 'bg-black/55' : 'bg-black/40'}`}
                />
              </div>
              <code className="font-mono text-[10px] text-neutral-500">
                {cls} — {who}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </Subsection>

    <Subsection
      title="Bandeaux — aucun ne passe par une primitive"
      note="Quatre bandeaux persistants, quatre écritures. Le bandeau de preview est le seul composant du dépôt entièrement hors design system."
    >
      <SpecimenGrid min="300px">
        <Specimen
          source="cookie-banner.tsx:24-95"
          tone="copie"
          note="fixed inset-x-0 bottom-0 z-50 · bg-background + border-t · pas de bouton de fermeture, deux actions."
          frameClassName="p-0"
        >
          <div className="flex flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center">
            <p className="m-0 flex-1 text-sm">
              Nous utilisons des cookies pour mesurer l’audience.
            </p>
            <div className="flex gap-2">
              <Button variant="outline">Refuser</Button>
              <Button>Accepter</Button>
            </div>
          </div>
        </Specimen>

        <Specimen
          source="preview-banner.tsx:31-83"
          tone="casse"
          note="Styles inline de bout en bout : borderRadius 9999px alors que --radius vaut 0, font system-ui alors que le site charge ABC Favorit, #f59e0b et #10b981 absents de la palette, la seule ombre inline du dépôt, et un <button> HTML nu."
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '9999px',
              background: 'rgba(0, 0, 0, 0.85)',
              color: '#fff',
              font: '500 12px/1.2 system-ui',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            }}
          >
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '9999px',
                background: '#f59e0b',
                color: '#111',
              }}
            >
              Brouillon
            </span>
            Mode preview
            <button
              type="button"
              style={{
                padding: '2px 8px',
                borderRadius: '9999px',
                background: '#fff',
                color: '#111',
                border: 0,
              }}
            >
              Quitter
            </button>
          </div>
        </Specimen>

        <Specimen
          source="booking-mode-banner.tsx:33-58"
          tone="copie"
          note="bg-muted · ButtonGroup + ButtonGroupSeparator · bascule à lg:."
          frameClassName="p-0"
        >
          <div className="flex items-stretch gap-3 border-b border-border bg-muted px-4 py-2.5">
            <span className="flex-1 text-sm">Mode manuel</span>
            <Button
              variant="ghost"
              className="h-auto py-1 normal-case tracking-normal"
            >
              ← Revenir au configurateur
            </Button>
          </div>
        </Specimen>
      </SpecimenGrid>
    </Subsection>
  </Section>
);
