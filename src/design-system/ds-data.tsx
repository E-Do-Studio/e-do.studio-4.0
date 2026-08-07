import { KeyValueList, KeyValueRow } from '@/ui/key-value-row';
import { HeadlineCell } from '@/ui/headline-cell';
import { LabelledCell } from '@/ui/labelled-cell';
import { MonoLabel } from '@/ui/mono-label';
import { Price } from '@/ui/price';
import { QuoteTable } from '@/ui/quote-table';
import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled, Variants } from './block';

const QUOTE_ROWS = [
  { label: 'Plateau Live — journée', value: '590 €' },
  {
    label: 'Packshot on model',
    value: '948 €',
    breakdown: [
      { text: 'Face avant — 60 × 7,90 €', value: '474 €' },
      { text: 'Face arrière — 60 × 7,90 €', value: '474 €' },
    ],
  },
  { label: 'Post-production', value: '240 €' },
];

export const DsData = () => (
  <Section
    id="donnees"
    title="Données"
    count="5 composants"
    intro="Tout ce qui affiche un chiffre porte tabular-nums. Ce n'est pas une option : c'est ce qui empêche un total de sauter d'un cran pendant qu'on incrémente une quantité au-dessus."
  >
    <Subsection title="Price">
      <Block
        name="Price"
        summary="Le montant. Cinq échelles nommées par leur classe Tailwind, et tabular-nums dans la définition — il manquait précisément aux deux plus gros chiffres du site. L'échelle sautait de text-base à text-3xl : rien pour le prix d'une option dans une tuile."
        file="src/ui/price.tsx"
        replaces="6 signatures → 1"
        api={`<Price value={fmtEUR(total, lang)} unit="€" size="lg" />
<Price value="7,90" unit="€" from="À partir de" />`}
      >
        <div className="flex flex-wrap items-end gap-8">
          <Labelled label='size="sm"'>
            <Price value="590" unit="€" size="sm" />
          </Labelled>
          <Labelled label='size="md" — défaut'>
            <Price value="590" unit="€" />
          </Labelled>
          <Labelled label='size="lg"'>
            <Price value="1 778" unit="€" size="lg" />
          </Labelled>
          <Labelled label='size="xl"'>
            <Price value="1 778" unit="€" size="xl" />
          </Labelled>
          <Labelled label='size="2xl"'>
            <Price value="7,90" unit="€" size="2xl" />
          </Labelled>
          <Labelled label="from">
            <Price value="7,90" unit="€" from="À partir de" size="lg" />
          </Labelled>
        </div>
      </Block>
    </Subsection>

    <Subsection
      title="LabelledCell"
      note="Le barème de retrait est déclaré ici et lu par KeyValueRow : quatre paliers nommés, de tight à 16px jusqu'à section à 24, plus none pour les conteneurs qui portent déjà le leur. Un retrait est une propriété de la COLONNE, pas de la cellule — forcer le canon de 20 partout désaligne chaque cellule de sa voisine à la jonction, là où la colonne entière est à 16 ou à 24 délibérément."
    >
      <Block
        name="LabelledCell"
        summary="Un libellé mono muet, et le contenu qu'il coiffe. Le rail de contact écrivait cette paire quatre fois — adresse, fermetures, téléphone, repli des horaires — dans une cellule en p-6 avec un mb-5. L'écart vaut gap-3, celui que KeyValueList porte déjà pour la même paire : la cellule des horaires en affichait donc deux selon que la donnée était là ou non. lines=multi appartient à la définition, un libellé de cellule passe à la ligne."
        file="src/ui/labelled-cell.tsx"
        replaces="4 écritures → 1"
        frameClassName="p-0"
        api={`<LabelledCell pad="section" label="Téléphone">
  <a href={c.phoneHref}>{c.phone}</a>
</LabelledCell>`}
      >
        <Labelled label='pad="section"'>
          <LabelledCell pad="section" label="Fermetures">
            <MonoLabel lines="multi">12 mars 2026 → 20 mars 2026</MonoLabel>
            <span className="text-xs text-muted-foreground">
              Congés d’hiver
            </span>
          </LabelledCell>
        </Labelled>
      </Block>
    </Subsection>

    <Subsection
      title="HeadlineCell"
      note="Elle remplace un TABLEAU là où il n'a pas la place de fonctionner. Les horaires passaient par KeyValueRow : libellé au bord gauche, valeur au bord droit, un vide au milieu. Dans les 192px utiles d'un rail de 240, l'œil fait du ping-pong entre deux bords pour rapprocher deux mots qui forment une seule phrase, et le filet entre les rangées découpe en deux enregistrements ce qui est un seul fait. Une paire nom/valeur a besoin de largeur ; une réponse et ses nuances n'en ont pas besoin."
    >
      <Variants min="300px">
        <Block
          name="HeadlineCell"
          summary="Une cellule dit UNE chose, et la précise. Le registre du titre vient du variant partagé, jamais recopié : un nœud passé en headline hérite du corps, de la graisse et de l'interlettrage, et n'impose que sa couleur — c'est ainsi que le téléphone reste un lien orange sans dupliquer l'échelle."
          file="src/ui/headline-cell.tsx"
          replaces="3 écritures → 1"
          frameClassName="p-0"
          api={`<HeadlineCell pad="section" label="Horaires"
  headline="10:00 — 18:00"
  details={<span>Lun — Ven</span>} />`}
        >
          <Labelled label='size="sm" — un fait'>
            <HeadlineCell
              pad="section"
              label="Horaires"
              headline="10:00 — 18:00"
              details={
                <>
                  <span className="block">Lun — Ven</span>
                  <span className="block">Sam — Dim sur demande</span>
                </>
              }
            />
          </Labelled>
        </Block>

        <Block
          name="HeadlineCell — action"
          summary="Le registre descend d'un cran quand la réponse est une action plutôt qu'un fait : le formulaire de la page garde l'aplat primaire, cette cellule n'est qu'une sortie."
          file="src/ui/headline-cell.tsx"
          frameClassName="p-0"
          api={`<HeadlineCell size="xs" label="Nous joindre"
  headline={<a href={href}>{phone}</a>} />`}
        >
          <Labelled label='size="xs" — une action'>
            <HeadlineCell
              pad="section"
              label="Nous joindre"
              size="xs"
              headline={
                <a
                  href="tel:+33144041149"
                  className="relative block text-primary no-underline after:absolute after:-inset-x-3 after:-inset-y-1"
                >
                  +33 1 44 04 11 49
                </a>
              }
              details={
                <a
                  href="mailto:contact@e-do.studio"
                  className="relative block tracking-tight text-primary no-underline after:absolute after:-inset-x-3 after:-inset-y-1"
                >
                  contact@e-do.studio
                </a>
              }
            />
          </Labelled>
        </Block>
      </Variants>
    </Subsection>

    <Subsection
      title="KeyValueRow"
      note="Le retrait horizontal appartient à la LIGNE, pas à la cellule. C'est ce qui fait courir le filet d'un bord à l'autre : quand la cellule portait le px-*, le <dl> vivait dans ce retrait et son trait s'arrêtait à 16px des deux bords. La cellule appelante ne garde donc qu'un retrait vertical, et la liste nomme le palier."
    >
      <Variants min="320px">
        <Block
          name="KeyValueList · KeyValueRow"
          summary="La ligne « libellé à gauche, valeur à droite » : caractéristiques, tarifs, équipe, mentions légales, récap du chatbot. Un <dl> et non une pile de <div> — ce sont des paires nom/valeur, aucune des huit copies ne le disait. Elle demande de la LARGEUR : dans une colonne étroite, le libellé et la valeur se retrouvent à deux bords opposés avec un vide au milieu, et les horaires du rail de contact sont passés à HeadlineCell pour cette raison."
          file="src/ui/key-value-row.tsx"
          replaces="8 écritures → 1"
          frameClassName="p-0"
          api={`<KeyValueList pad="section" heading="Équipe">
  <KeyValueRow label="Direction" value="Thomas Guedj" />
  <KeyValueRow label="½ journée" value="390 €" numeric />
</KeyValueList>`}
        >
          <Labelled label='pad="section" · heading · density="default"'>
            <KeyValueList pad="section" heading="Équipe">
              <KeyValueRow label="Direction" value="Thomas Guedj" />
              <KeyValueRow label="Production" value="Benoît Cougny" />
              <KeyValueRow label="Post-production" value="Phan Vo" />
            </KeyValueList>
          </Labelled>
        </Block>

        <Block
          name="KeyValueRow — dense"
          summary="La variante serrée, pour les caractéristiques et les tarifs dans une colonne étroite. Les deux planchers viennent des paliers de rail : 32px ici, 44px en densité normale — et ils ne s'appliquent qu'aux lignes qui portent un filet, une ligne sans trait ne rythme rien."
          file="src/ui/key-value-row.tsx"
          frameClassName="p-0"
          api={`<KeyValueList pad="tight" heading="Tarifs HT">
  <KeyValueRow density="tight" label="Surface" value="120 m²" numeric />
</KeyValueList>`}
        >
          <Labelled label='pad="tight" · density="tight" · numeric'>
            <KeyValueList pad="tight" heading="Tarifs HT">
              <KeyValueRow
                density="tight"
                label="1 heure"
                value="185 €"
                numeric
              />
              <KeyValueRow
                density="tight"
                label="Demi-journée"
                value="620 €"
                numeric
              />
              <KeyValueRow
                density="tight"
                label="Journée"
                value="1 120 €"
                numeric
              />
            </KeyValueList>
          </Labelled>
        </Block>

        <Block
          name="KeyValueRow — libellé composite"
          summary="Un libellé nœud plutôt que chaîne, pour les deux cas où il porte deux lignes : nom et rôle d'un membre de l'équipe, plateau et date d'une session. La chaîne prend le MonoLabel du système, le nœud est rendu tel quel — enfermer un nom de personne dans des capitales n'aurait rien dit. rule={false} coupe le filet là où une bordure voisine le dessine déjà."
          file="src/ui/key-value-row.tsx"
          frameClassName="p-0"
          api={`<KeyValueRow
  rule={false}
  label={<span className="flex flex-col">…</span>}
  value="camille@e-do.studio"
/>`}
        >
          <Labelled label="label composite · rule={false}">
            <KeyValueList pad="cell">
              <KeyValueRow
                label={
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm tracking-tight text-foreground">
                      Camille Roy
                    </span>
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      Direction artistique
                    </span>
                  </span>
                }
                value={
                  <span className="font-mono text-xs tracking-widest text-primary">
                    camille@e-do.studio
                  </span>
                }
              />
              <KeyValueRow
                rule={false}
                label="Sans filet"
                value="rule={false}"
              />
            </KeyValueList>
          </Labelled>
        </Block>
      </Variants>

      {/* Hors de la grille de variantes : cette orientation ne prend sa forme à
          deux colonnes qu'au-delà de `md`, et une colonne de 330px la montrerait
          toujours empilée — c'est-à-dire jamais. */}
      <Block
        name="KeyValueRow — colonnes"
        summary="La liste de définitions légale : la valeur reste alignée à GAUCHE dans sa colonne, c'est ce qui rend une suite de mentions scannable. Elle s'empile sous md — 224px de colonne de libellé sur un écran de 390 ne laissent pas de place à la valeur."
        file="src/ui/key-value-row.tsx"
        frameClassName="p-0"
        api={`<KeyValueRow orientation="columns" label="Éditeur" value="e-do studio SAS" />`}
      >
        <Labelled label='orientation="columns"'>
          <KeyValueList pad="cell">
            <KeyValueRow
              orientation="columns"
              label="Éditeur"
              value="e-do studio SAS, 69 boulevard Victor Hugo, 93400 Saint-Ouen"
            />
            <KeyValueRow
              orientation="columns"
              label="Hébergeur"
              value="Scaleway, 8 rue de la Ville l'Évêque, 75008 Paris"
            />
            <KeyValueRow
              orientation="columns"
              label="Responsable de la publication"
              value="Thomas Guedj"
            />
          </KeyValueList>
        </Labelled>
      </Block>
    </Subsection>

    <Subsection title="QuoteTable">
      <Variants min="290px">
        <Block
          name="QuoteTable"
          summary="Le récapitulatif de devis : des lignes, un total, une mention. Le poids du total se dit par la taille du chiffre — la version précédente le soulignait d'un border-t-2, le seul filet double du site. totalLive pose la région live sur le TOTAL seul : c'est le chiffre que l'on suit, et annoncer tout le détail à chaque clic reviendrait à ne rien annoncer."
          file="src/ui/quote-table.tsx"
          replaces="4 versions → 1"
          api={`<QuoteTable rows={rows} totalLabel="Total HT"
            total={fmtEUR(total, lang)} totalLive
            disclaimer="TVA non applicable" />`}
        >
          <Labelled label='variant="panel" — colonne du tunnel'>
            <QuoteTable
              rows={QUOTE_ROWS}
              totalLabel="Total HT"
              total="1 778 €"
              totalLive
              disclaimer="TVA non applicable, art. 293 B du CGI"
            />
          </Labelled>
        </Block>

        <Block
          name="QuoteTable — chat"
          summary="La même table dans une bulle de conversation : le total descend d'une échelle, tout le reste est identique."
          file="src/ui/quote-table.tsx"
          api={`<QuoteTable variant="chat" … />`}
        >
          <Labelled label='variant="chat"'>
            <div className="border border-border p-3">
              <QuoteTable
                variant="chat"
                rows={QUOTE_ROWS.slice(0, 2)}
                totalLabel="Total HT"
                total="1 538 €"
              />
            </div>
          </Labelled>
        </Block>
      </Variants>
    </Subsection>
  </Section>
);
