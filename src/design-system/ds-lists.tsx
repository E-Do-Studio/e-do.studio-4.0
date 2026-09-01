import { useState } from 'react';
import { ordinal } from '@/lib/format';
import { Rail, RailCell } from '@/ui/rail-cell';
import { SegmentGroup, SegmentItem } from '@/ui/segment-group';
import { SelectionDrawer } from '@/ui/selection-drawer';
import { MonoLabel } from '@/ui/mono-label';
import { StatusBadge } from '@/ui/status-badge';
import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled } from './block';

const PLATEAUX = [
  { key: 'live', label: 'Live', sub: 'Shooting porté' },
  { key: 'eclipse', label: 'Eclipse', sub: 'Photo & vidéo 360°' },
  { key: 'horizontal', label: 'Horizontal', sub: 'Packshots à plat' },
  { key: 'vertical', label: 'Vertical', sub: 'Mannequin ghost' },
];

export const DsLists = () => {
  const [plateau, setPlateau] = useState('live');
  const [etape, setEtape] = useState(0);
  const [heure, setHeure] = useState('09:00');

  return (
    <Section
      id="listes"
      title="Listes & navigation"
      count="3 composants"
      intro="Le rail est le motif signature du site : la colonne qui commande le panneau voisin. Une seule cellule le rend, à trois densités choisies par ce qu'elle contient — et la même cellule sert dans le tiroir mobile."
    >
      <Subsection title="RailCell">
        <Block
          name="Rail · RailCell"
          summary="La colonne de sélection. La cellule choisie s'inverse — le même signal que SelectTile et SegmentItem, déclenché par aria-pressed. Pas de liseré : hover et sélection posaient tous deux bg-muted, la barre orange était le seul distinguo."
          file="src/ui/rail-cell.tsx"
          replaces="13 implémentations → 1"
          frameClassName="p-0"
          api={`<Rail label="Plateaux">
  {items.map((item, i) => (
    <RailCell key={item.key} number={ordinal(i)} label={item.label}
              sub={item.sub} density="tall"
              active={item.key === current} onSelect={() => select(item.key)} />
  ))}
</Rail>`}
        >
          {/* Trois colonnes fixes, jamais quatre : une grille auto-ajustée
              rejetait le quatrième bloc sur une seconde ligne dès que la
              largeur ne suffisait plus, et le rang devenait bancal. Les états
              ont leur propre rangée en dessous — `dimmed` et « choisi » sont
              des états, pas des densités, les mêler à la comparaison brouillait
              justement ce qu'elle cherchait à isoler. */}
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
            <Labelled label='density="compact" — 32px, libellé seul'>
              <Rail label="Plateaux" className="border border-border">
                {PLATEAUX.map((p) => (
                  <RailCell
                    key={p.key}
                    label={p.label}
                    density="compact"
                    active={p.key === plateau}
                    onSelect={() => setPlateau(p.key)}
                    trailing={
                      <MonoLabel tone="muted" className="tabular-nums">
                        12
                      </MonoLabel>
                    }
                  />
                ))}
              </Rail>
            </Labelled>

            <Labelled label='density="default" — 44px, numéro + libellé'>
              <Rail label="Plateaux" className="border border-border">
                {PLATEAUX.map((p, i) => (
                  <RailCell
                    key={p.key}
                    number={ordinal(i)}
                    label={p.label}
                    density="default"
                    active={p.key === plateau}
                    onSelect={() => setPlateau(p.key)}
                  />
                ))}
              </Rail>
            </Labelled>

            <Labelled label='density="tall" — 72px, avec 3e ligne'>
              <Rail label="Plateaux" className="border border-border">
                {PLATEAUX.map((p, i) => (
                  <RailCell
                    key={p.key}
                    number={ordinal(i)}
                    label={p.label}
                    sub={p.sub}
                    density="tall"
                    active={p.key === plateau}
                    onSelect={() => setPlateau(p.key)}
                  />
                ))}
              </Rail>
            </Labelled>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-neutral-200 p-4 md:grid-cols-3">
            <Labelled label="choisi — la cellule s’inverse">
              <Rail className="border border-border">
                {PLATEAUX.slice(0, 3).map((p, i) => (
                  <RailCell
                    key={p.key}
                    number={ordinal(i)}
                    label={p.label}
                    density="default"
                    active={i === 0}
                    onSelect={() => {}}
                  />
                ))}
              </Rail>
            </Labelled>

            <Labelled label="dimmed — sans résultat sous le filtre voisin">
              <Rail className="border border-border">
                {PLATEAUX.slice(0, 3).map((p, i) => (
                  <RailCell
                    key={p.key}
                    number={ordinal(i)}
                    label={p.label}
                    density="default"
                    active={false}
                    dimmed={i > 0}
                    onSelect={() => {}}
                  />
                ))}
              </Rail>
            </Labelled>

            <Labelled label="href — destination, aria-current au lieu d’aria-pressed">
              <Rail className="border border-border">
                {PLATEAUX.slice(0, 3).map((p, i) => (
                  <RailCell
                    key={p.key}
                    number={ordinal(i)}
                    label={p.label}
                    density="default"
                    active={i === 0}
                    href="#listes"
                  />
                ))}
              </Rail>
            </Labelled>
          </div>

          <div className="border-t border-neutral-200 p-4">
            <Labelled label="render">
              <span className="text-sm leading-snug text-neutral-600">
                Le rail est un{' '}
                <code className="font-mono text-[11px] text-primary">
                  &lt;aside&gt;
                </code>{' '}
                par défaut. Celui du tunnel EST la navigation du tunnel :{' '}
                <code className="font-mono text-[11px] text-primary">
                  render={'{'}&lt;nav aria-label="Étapes" /&gt;{'}'}
                </code>{' '}
                lui rend son repère et son nom accessible. C’était la treizième
                implémentation restée dehors, et la seule raison qu’elle avait
                de le rester.
              </span>
            </Labelled>
          </div>
        </Block>
      </Subsection>

      <Subsection title="SelectionDrawer">
        <Block
          name="SelectionDrawer"
          summary="Le rail sous le palier où il n'y a plus de place pour une colonne : une barre collante qui montre l'élément courant, un tiroir qui liste les autres. Il rend les mêmes RailCell que la version desktop."
          file="src/ui/selection-drawer.tsx"
          replaces="3 copies littérales → 1"
          frameClassName="p-0"
          api={`<SelectionDrawer title="Plateaux" items={plateaux}
                 activeKey={slug} onSelect={goToPlateau}
                 closeLabel={t('common.close')} />`}
        >
          {/* `app:hidden` sur le composant : rendu ici dans un cadre étroit pour
              qu'il apparaisse malgré la largeur de la page. Le palier doit être
              le même des deux côtés — écrit `md:flex`, ce rappel disparaissait
              de la page de référence dès 1024. */}
          <div className="max-w-sm border border-border">
            <SelectionDrawer
              title="Plateaux"
              items={PLATEAUX}
              activeKey={plateau}
              onSelect={setPlateau}
              closeLabel="Fermer"
              className="app:flex"
            />
            <p className="m-0 px-4 py-6 text-sm text-muted-foreground">
              Le panneau que le rail commande.
            </p>
          </div>
        </Block>
      </Subsection>

      <Subsection title="SegmentGroup">
        <Block
          name="SegmentGroup · SegmentItem"
          summary="Choisir un élément parmi N, tous visibles à la fois : onglets de session, heures d'arrivée, types d'article. L'état sélectionné inverse la cellule — et donc ses enfants avec elle."
          file="src/ui/segment-group.tsx"
          replaces="5 écritures → 1"
          api={`<SegmentGroup label="Heure d'arrivée" layout="grid" className="grid-cols-4">
  {hours.map((h) => (
    <SegmentItem key={h} selected={h === value} onSelect={() => set(h)}>
      {hourLabel(h)}
    </SegmentItem>
  ))}
</SegmentGroup>`}
        >
          <div className="flex flex-col gap-5">
            <Labelled label="layout=grid — grille d'heures">
              <SegmentGroup
                label="Heure d’arrivée"
                layout="grid"
                className="grid-cols-4 border border-border"
              >
                {['08:00', '09:00', '10:00', '11:00'].map((h) => (
                  <SegmentItem
                    key={h}
                    selected={h === heure}
                    onSelect={() => setHeure(h)}
                  >
                    <MonoLabel className="tabular-nums">{h}</MonoLabel>
                  </SegmentItem>
                ))}
              </SegmentGroup>
            </Labelled>

            <Labelled label="en ligne — onglets de session">
              <SegmentGroup
                label="Sessions"
                layout="grid"
                className="grid-cols-2 border border-border"
              >
                {['Prêt-à-porter', 'Accessoires'].map((s, i) => (
                  <SegmentItem
                    key={s}
                    selected={i === etape % 2}
                    onSelect={() => setEtape(i)}
                    className="items-start justify-start text-left"
                  >
                    <span className="flex flex-col gap-1">
                      <MonoLabel tone="muted" className="tabular-nums">
                        Session {ordinal(i)}
                      </MonoLabel>
                      <span className="text-sm tracking-tight">{s}</span>
                    </span>
                  </SegmentItem>
                ))}
              </SegmentGroup>
            </Labelled>

            <Labelled label="avec compteur">
              <SegmentGroup label="Filtres" className="border border-border">
                {['Tout', 'Vidéo'].map((s) => (
                  <SegmentItem
                    key={s}
                    selected={s === 'Tout'}
                    onSelect={() => {}}
                    className="flex-row gap-2"
                  >
                    <MonoLabel>{s}</MonoLabel>
                    <StatusBadge size="count">12</StatusBadge>
                  </SegmentItem>
                ))}
              </SegmentGroup>
            </Labelled>
          </div>
        </Block>
      </Subsection>
    </Section>
  );
};
