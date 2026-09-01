import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CtaCell } from '@/ui/cta-cell';
import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled } from './block';

// `rail` n'est pas dans cette liste : hors de sa colonne, la variante n'est
// qu'une pastille au liseré orphelin, qui laisse croire à un bouton à part
// entière. Elle se lit dans la section Listes, là où elle a un sens — c'est
// `RailCell` qui la porte, et personne d'autre ne devrait l'appeler.
const VARIANTS = [
  ['default', "L'action principale : le pavé orange."],
  ['cell', 'La cellule bento cliquable — la forme dominante du site.'],
  ['header', 'L’action pleine hauteur de la bande d’en-tête.'],
  ['outline', 'L’action secondaire, contour seul.'],
  ['ghost', 'L’action tertiaire : fermer, revenir.'],
  ['destructive', 'Supprimer. Nulle part ailleurs.'],
  ['link', 'Un lien au fil du texte.'],
] as const;

export const DsActions = () => (
  <Section
    id="actions"
    title="Actions"
    count="2 composants"
    intro="Button porte toutes les actions du site — il est déjà adopté partout, et il est bon. CtaCell est la seule chose qui lui manquait : le pavé d'action, dont sept versions coexistaient."
  >
    <Subsection title="Button">
      <Block
        name="Button"
        summary="Huit variantes pour huit rôles, et deux axes indépendants : size porte la géométrie, casing porte la typographie. La base parle mono capitale — c'est juste pour une action, faux pour une phrase."
        file="src/components/ui/button.tsx"
        api={`<Button variant="cell" size="cell">…</Button>
<Button size="touch">Valider</Button>            {/* 44px, cible tactile */}
<Button casing="plain">en savoir plus</Button>   {/* phrase, pas libellé */}
<Button render={<a href={href} />}>Galerie</Button>`}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            {VARIANTS.map(([v, role]) => (
              <div key={v} className="flex flex-col items-start gap-1">
                <Button variant={v}>{v}</Button>
                <span className="max-w-40 text-[11px] leading-snug text-neutral-500">
                  {role}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4 border-t border-neutral-200 pt-4">
            <Labelled label="sm — 28px">
              <Button variant="outline" size="sm">
                Filtrer
              </Button>
            </Labelled>
            <Labelled label="default — 32px">
              <Button variant="outline">Filtrer</Button>
            </Labelled>
            <Labelled label="lg — 36px">
              <Button variant="outline" size="lg">
                Filtrer
              </Button>
            </Labelled>
            <Labelled label="touch — 44px">
              <Button variant="outline" size="touch">
                Filtrer
              </Button>
            </Labelled>
            <Labelled label="icon — 32px">
              <Button variant="ghost" size="icon" aria-label="Suivant">
                <ArrowRight />
              </Button>
            </Labelled>
          </div>

          <div className="flex flex-wrap items-end gap-4 border-t border-neutral-200 pt-4">
            <Labelled label='casing="mono" — défaut'>
              <Button variant="outline">en savoir plus</Button>
            </Labelled>
            <Labelled label='casing="plain"'>
              <Button variant="outline" casing="plain">
                en savoir plus
              </Button>
            </Labelled>
          </div>
        </div>
      </Block>
    </Subsection>

    <Subsection title="CtaCell">
      <Block
        name="CtaCell"
        summary="Le pavé d'action : réserver, envoyer, demander un devis. Deux hauteurs, calées sur les tokens de grille qui existaient déjà — la bande à 44px, le pavé de bas de page à 84px."
        file="src/ui/cta-cell.tsx"
        replaces="7 traitements → 1"
        frameClassName="bg-border p-0"
        api={`<CtaCell title="Envoyer" onClick={submit} />
<CtaCell size="cta" kicker="Demander un devis ou" title="Réserver" />
<CtaCell tone="dark" size="cta" kicker="06 · Réserver" title="Ce plateau" />`}
      >
        <div className="flex flex-col gap-px">
          <Labelled
            label='size="band" — 44px, action de formulaire'
            className="bg-neutral-50 p-3"
          >
            <CtaCell title="Envoyer" />
          </Labelled>
          <Labelled
            label='size="cta" — 84px, pavé de bas de page'
            className="bg-neutral-50 p-3"
          >
            <CtaCell
              size="cta"
              kicker="Demander un devis ou"
              title="Réserver"
            />
          </Labelled>
          <Labelled
            label='tone="dark" — la cellule inversée'
            className="bg-neutral-50 p-3"
          >
            <CtaCell
              tone="dark"
              size="cta"
              kicker="06 · Réserver"
              title="Réserver ce plateau"
            />
          </Labelled>
        </div>
      </Block>
    </Subsection>
  </Section>
);
