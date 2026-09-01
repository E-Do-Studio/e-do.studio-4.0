import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { FormCell, FormCellInput, FormCellTextarea } from '@/ui/form-cell';
import { Stepper } from '@/ui/stepper';
import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled, Variants } from './block';

export const DsForms = () => {
  const [email, setEmail] = useState('');
  const [siren, setSiren] = useState('');
  const [cgv, setCgv] = useState(false);
  const [notif, setNotif] = useState(true);
  const [heures, setHeures] = useState(3);
  const [message, setMessage] = useState('');
  const [quantite, setQuantite] = useState('12');
  const [vues, setVues] = useState('3');

  return (
    <Section
      id="formulaires"
      title="Formulaires"
      count="1 cellule, 3 contrôles"
      intro="Une seule cellule de champ, et elle câble l'identifiant. C'est le point où le site perdait le plus : quatre écritures coexistaient, trois d'entre elles posaient le libellé à côté du champ sans jamais l'y rattacher — quatorze champs sans nom accessible."
    >
      <Subsection title="FormCell">
        <Block
          name="FormCell · FormCellInput"
          summary="Le libellé coiffe le champ à l'intérieur de la cellule bento. useId + htmlFor + aria-describedby : le nom accessible et le message d'erreur sont câblés par le composant, jamais au site d'appel."
          file="src/ui/form-cell.tsx"
          replaces="4 écritures → 1"
          frameClassName="bg-border p-0"
          api={`<FormCell label="Email" error={errors.email}>
  <FormCellInput value={email} onChange={setEmail}
                 type="email" autoComplete="email" />
</FormCell>`}
        >
          <div className="grid gap-px sm:grid-cols-2">
            <FormCell label="Email">
              <FormCellInput
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="vous@studio.fr"
              />
            </FormCell>
            <FormCell label="SIREN">
              <FormCellInput
                value={siren}
                onChange={setSiren}
                inputMode="numeric"
                placeholder="552 100 554"
              />
            </FormCell>
          </div>
        </Block>
      </Subsection>

      <Subsection title="États et variantes">
        <Variants min="300px">
          <Block
            name="FormCell — erreur"
            summary="L'anneau rouge et le message sont posés par data-invalid, pas par des classes en ligne. Le message est rattaché au champ par aria-describedby."
            file="src/ui/form-cell.tsx"
            frameClassName="bg-border p-0"
            api={`<FormCell label="Email" error="Adresse invalide">…`}
          >
            <FormCell label="Email" error="Adresse invalide">
              <FormCellInput
                value="pas-un-email"
                onChange={() => {}}
                placeholder="camille@votremarque.fr"
              />
            </FormCell>
          </Block>

          <Block
            name='FormCell as="group"'
            summary="Pour un contenu qui n'est pas un champ unique — une case, un groupe de boutons, du texte libre. role=group + aria-labelledby, parce qu'un <label for> n'aurait aucun id unique à désigner."
            file="src/ui/form-cell.tsx"
            replaces="WideCell"
            frameClassName="bg-border p-0"
            api={`<FormCell as="group" label="Conditions" error={errors.cgv}>
  <label className="flex items-center gap-2">
    <Checkbox checked={cgv} onCheckedChange={setCgv} /> J'accepte les CGV
  </label>
</FormCell>`}
          >
            <FormCell as="group" label="Conditions">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={cgv}
                  onCheckedChange={(v) => setCgv(v === true)}
                />
                J’accepte les conditions générales
              </label>
            </FormCell>
          </Block>

          <Block
            name="FormCell — libellé masqué"
            summary="hideLabel retire le libellé de l'écran sans le retirer du nom accessible. Pour les champs dont l'intitulé est déjà porté par le contexte : la newsletter, la barre de recherche — un bloc qui, lui, se lit comme un formulaire. Un bandeau de section n'est pas un contexte suffisant : dans le configurateur, la cellule masquée ne montrait plus qu'un placeholder gris au bord d'une bande blanche, et se lisait comme une question repliée. C'est le libellé qui fait qu'une cellule se lit comme un champ."
            file="src/ui/form-cell.tsx"
            frameClassName="bg-border p-0"
            api={`<FormCell label="Email" hideLabel>…`}
          >
            <FormCell label="Email" hideLabel>
              <FormCellInput
                value={email}
                onChange={setEmail}
                placeholder="Votre e-mail"
              />
            </FormCell>
          </Block>

          <Block
            name='FormCellInput kind="count"'
            summary="Un nombre tapé au clavier, pas une phrase : mono à corps plein, chiffres à chasse fixe — tabular-nums fait partie de la définition d'un nombre, comme dans Price. Aucun cadre et aucun centrage : la cellule EST le champ, elle porte le retrait, le fond et l'anneau de focus. Les trois champs du configurateur dessinaient le leur, et au focus les deux rectangles apparaissaient l'un dans l'autre."
            file="src/ui/form-cell.tsx"
            replaces="3 écritures → 1"
            frameClassName="bg-border p-0"
            api={`<FormCellInput kind="count" value={q} onChange={setQ}
                inputMode="numeric" placeholder="12" />`}
          >
            <div className="grid gap-px sm:grid-cols-2">
              <FormCell label="Nombre de produits">
                <FormCellInput
                  kind="count"
                  value={quantite}
                  onChange={setQuantite}
                  inputMode="numeric"
                  placeholder="12"
                />
              </FormCell>
              <FormCell label="Vues par produit">
                <FormCellInput
                  kind="count"
                  value={vues}
                  onChange={setVues}
                  inputMode="numeric"
                  placeholder="3"
                />
              </FormCell>
            </div>
          </Block>

          <Block
            name="FormCellTextarea"
            summary="Le contenu long. Le plancher appartient au composant : les deux sites d'appel l'écrivaient eux-mêmes et à deux valeurs différentes, min-h-28 pour le message du contact et min-h-7 pour la note du tunnel — deux mesures pour un même rôle, chacune invisible à l'autre. Ici la cellule suit son contenu, donc resize-y : le champ peut grandir et la cellule grandit avec lui."
            file="src/ui/form-cell.tsx"
            replaces="2 planchers → 1"
            frameClassName="bg-border p-0"
            api={`<FormCellTextarea value={v} onChange={set}
  placeholder="Contexte, contraintes…" />`}
          >
            <FormCell label="Autres informations">
              <FormCellTextarea
                value={message}
                onChange={setMessage}
                placeholder="Contexte, contraintes…"
              />
            </FormCell>
          </Block>

          <Block
            name="FormCellTextarea — fill"
            summary="Dès que la cellule vit dans une piste 1fr, le champ doit prendre la hauteur qu'elle lui donne. Sans fill il s'arrête à son plancher : le formulaire de contact affichait 112px de zone de saisie dans une cellule de 506, soit quatre cents pixels de blanc cliquables qui n'écrivaient rien. fill emporte resize-none — un champ qui occupe déjà toute sa cellule n'a plus où grandir, et la page est verrouillée en hauteur."
            file="src/ui/form-cell.tsx"
            frameClassName="bg-border p-0"
            api={`<FormCellTextarea fill … />`}
          >
            {/* La hauteur est posée ici pour que le remplissage se VOIE : sur la
                page de contact elle vient de la piste `1fr` de la colonne. */}
            <div className="flex h-56 flex-col">
              <FormCell
                label="Votre message*"
                className="min-h-0 flex-1 justify-start"
              >
                <FormCellTextarea
                  value={message}
                  onChange={setMessage}
                  placeholder="Votre projet, vos références, vos délais…"
                  fill
                />
              </FormCell>
            </div>
          </Block>
        </Variants>
      </Subsection>

      <Subsection title="Contrôles">
        <Block
          name="Checkbox · Switch"
          summary="Les primitives shadcn, telles quelles. Le site en dessinait trois versions à la main — 8px, 16px et 22px — dont l'une à soixante-cinq lignes d'un vrai Checkbox importé dans le même fichier."
          file="src/components/ui/"
          replaces="3 cases dessinées → 1"
        >
          <div className="flex flex-wrap items-center gap-8">
            <Labelled label="Checkbox">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={cgv}
                  onCheckedChange={(v) => setCgv(v === true)}
                />
                J’accepte les CGV
              </label>
            </Labelled>
            <Labelled label="Switch">
              <Switch checked={notif} onCheckedChange={setNotif} />
            </Labelled>
            <Labelled label='Switch size="sm"'>
              <Switch size="sm" checked={notif} onCheckedChange={setNotif} />
            </Labelled>
          </div>
        </Block>

        <Block
          name="Stepper"
          summary="Le compteur à deux boutons. Les signes − et + étaient des CARACTÈRES posés dans le texte du bouton : la base parle font-mono text-xs, ils rendaient à 12px au centre d'un carré de 32. Ce sont des icônes, et size=icon-touch porte les 44px tactiles."
          file="src/ui/stepper.tsx"
          replaces="2 copies → 1"
          api={`<Stepper
  label="Nombre d'heures"
  value={hours}
  onDecrement={dec}
  onIncrement={inc}
/>`}
        >
          <div className="flex flex-wrap items-center gap-8">
            <Labelled label="valeur simple">
              <Stepper
                label="Nombre d’heures"
                value={heures}
                valueClassName="min-w-10"
                decrementDisabled={heures <= 1}
                onDecrement={() => setHeures(heures - 1)}
                onIncrement={() => setHeures(heures + 1)}
              />
            </Labelled>
            <Labelled label="valeur avec unité">
              <Stepper
                label="Durée totale"
                value={`${heures}h`}
                valueClassName="min-w-16"
                decrementDisabled={heures <= 1}
                onDecrement={() => setHeures(heures - 1)}
                onIncrement={() => setHeures(heures + 1)}
              />
            </Labelled>
          </div>
        </Block>
      </Subsection>
    </Section>
  );
};
