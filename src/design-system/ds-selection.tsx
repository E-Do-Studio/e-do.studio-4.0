import { useState } from 'react';
import { ordinal } from '@/lib/format';
import { SelectTile } from '@/ui/select-tile';
import { ToggleRow } from '@/ui/toggle-row';
import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled } from './block';

export const DsSelection = () => {
  const [tile, setTile] = useState(0);
  const [postprod, setPostprod] = useState(true);
  const [retouche, setRetouche] = useState(false);

  return (
    <Section
      id="selection"
      title="Sélection"
      count="2 composants"
      intro="La tuile d'un choix exclusif, à trois échelles, et la ligne à bascule. L'état sélectionné passe partout par aria-pressed et la portée dark : les enfants s'inversent d'eux-mêmes, sans ternaire de couleur."
    >
      <Subsection title="SelectTile">
        <Block
          name="SelectTile"
          summary="Choisir un plateau, une durée, une formule. L'inversion dit l'état choisi — pas de pastille par-dessus : ce serait un second signal pour une seule information. Ne reste que la flèche de survol, une affordance."
          file="src/ui/select-tile.tsx"
          replaces="5 composants → 1"
          frameClassName="bg-border p-0"
          api={`<SelectTile size="lg" number={ordinal(i)} title="Live" sub="Shooting porté"
            footer={[{ label: '½ journée', value: '390 €' },
                     { label: 'Journée 8h', value: '590 €' }]}
            selected={i === current} onSelect={() => select(i)} />`}
        >
          <div className="flex flex-col gap-px">
            <div className="bg-neutral-50 p-3">
              <Labelled label='size="lg" — tuile de plateau, avec pied tarifaire'>
                <div className="grid grid-cols-2 gap-px bg-border">
                  {[
                    { t: 'Live', s: 'Shooting porté' },
                    { t: 'Eclipse', s: 'Photo & vidéo 360°' },
                  ].map((p, i) => (
                    <SelectTile
                      key={p.t}
                      size="lg"
                      number={ordinal(i)}
                      title={p.t}
                      sub={p.s}
                      footer={[
                        { label: '½ journée', value: '390 €' },
                        { label: 'Journée 8h', value: '590 €' },
                      ]}
                      selected={tile === i}
                      onSelect={() => setTile(i)}
                    />
                  ))}
                </div>
              </Labelled>
            </div>

            <div className="bg-neutral-50 p-3">
              <Labelled label='size="md" — tuile de configuration, avec description'>
                <div className="grid grid-cols-2 gap-px bg-border">
                  {[
                    { t: 'Demi-journée', d: '4 heures consécutives' },
                    { t: 'Journée', d: '8 heures, pause incluse' },
                  ].map((p, i) => (
                    <SelectTile
                      key={p.t}
                      number={ordinal(i)}
                      title={p.t}
                      desc={p.d}
                      selected={tile === i}
                      onSelect={() => setTile(i)}
                    />
                  ))}
                </div>
              </Labelled>
            </div>

            <div className="bg-neutral-50 p-3">
              <Labelled label='size="sm" — tuile compacte, titre seul'>
                <div className="grid grid-cols-3 gap-px bg-border">
                  {['Face', 'Face + dos', '360°'].map((p, i) => (
                    <SelectTile
                      key={p}
                      size="sm"
                      title={p}
                      selected={tile === i}
                      onSelect={() => setTile(i)}
                    />
                  ))}
                </div>
              </Labelled>
            </div>
          </div>
        </Block>
      </Subsection>

      <Subsection title="ToggleRow">
        <Block
          name="ToggleRow"
          summary="Une option qu'on active. Aucun liseré : l'interrupteur EST l'état, il porte déjà sa couleur. Les deux copies précédentes ajoutaient un trait d'accent sur le bord gauche, l'une à border-l-4, l'autre rien du tout."
          file="src/ui/toggle-row.tsx"
          replaces="2 copies → 1"
          frameClassName="bg-border p-0"
          api={`<ToggleRow title="Post-production par E-Do"
          hint="Retouche colorimétrique incluse"
          checked={on} onCheckedChange={setOn} />`}
        >
          <div className="flex flex-col gap-px">
            <ToggleRow
              title="Post-production par E-Do"
              hint="Retouche colorimétrique incluse"
              checked={postprod}
              onCheckedChange={setPostprod}
            />
            <ToggleRow
              title="Retouche avancée"
              hint="Détourage et harmonisation, sur devis"
              checked={retouche}
              onCheckedChange={setRetouche}
            />
          </div>
        </Block>
      </Subsection>
    </Section>
  );
};
