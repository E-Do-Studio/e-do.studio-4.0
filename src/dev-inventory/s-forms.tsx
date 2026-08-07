import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormCell, FormCellInput } from '@/ui/form-cell';
import { Section, Subsection } from './section';
import { Specimen, SpecimenGrid } from './specimen';
import { cn } from '@/lib/utils';

// Quatre cellules de formulaire pour un site qui n'a que trois formulaires.
// `form-cell.tsx:17-21` annonce la consolidation au passé — « Deux autres
// copies existaient » — alors que les deux copies sont toujours en place.

const FIELD_INPUT_CONTACT =
  'h-auto w-full rounded-none border-0 bg-transparent p-0 font-sans text-base tracking-tight text-foreground focus-visible:outline-none';

const LABEL_CLS =
  'font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground';

export const SectionForms = () => {
  const [v, setV] = useState('');
  const [on, setOn] = useState(true);

  return (
    <Section
      id="formulaires"
      title="Formulaires"
      count="4 cellules · 3 mécanismes d'erreur"
      intro="Une seule des quatre cellules câble un identifiant. Les trois autres posent le libellé à côté du champ sans jamais l'y rattacher — les champs concernés n'ont aucun nom accessible, et leur seul repère visible, le placeholder, disparaît à la saisie."
    >
      <Subsection
        title="La cellule de champ — 4 implémentations"
        note="Cliquez dans chaque champ : le focus est traité différemment dans les quatre."
      >
        <SpecimenGrid min="290px">
          <Specimen
            source="src/ui/form-cell.tsx:46"
            tone="canon"
            note="px-4 py-2.5 (sm:px-3 sm:py-1.5) · min-h-11 · text-sm · useId + htmlFor + aria-describedby · anneau d'erreur porté par data-invalid. 2 appelants."
            frameClassName="bg-border p-px"
          >
            <FormCell label="Email">
              <FormCellInput
                value={v}
                onChange={setV}
                placeholder="vous@studio.fr"
              />
            </FormCell>
          </Specimen>

          <Specimen
            source="contact-form.tsx:34-50"
            tone="copie"
            note="px-5 py-2 · aucune hauteur mini · gap-0.5 · text-BASE · focus-visible:outline-none sur le champ, compensé par focus-within sur la cellule · aucun id, aucun htmlFor, aucune erreur par champ."
            frameClassName="bg-border p-px"
          >
            <label className="flex min-w-0 cursor-text flex-col justify-center gap-0.5 bg-background px-5 py-2 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-foreground">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">
                Email*
              </span>
              <Input
                value={v}
                onChange={(e) => setV(e.target.value)}
                placeholder="vous@studio.fr"
                className={FIELD_INPUT_CONTACT}
              />
            </label>
          </Specimen>

          <Specimen
            source="step-contact.tsx:29-49"
            tone="copie"
            note="px-3 py-1.5 — un 3e padding · gap-1 · <div> et non <label> · l'anneau d'erreur est réécrit à la main, à l'identique de celui que FormCell pose déjà. N'existe que parce que FormCell refuse un enfant non-input : c'est un défaut d'API, pas une fatalité."
            frameClassName="bg-border p-px"
          >
            <div className="flex min-h-11 flex-col gap-1 bg-background px-3 py-1.5">
              <span className={LABEL_CLS}>Autres informations</span>
              <Textarea
                placeholder="Contexte, contraintes…"
                className="box-border min-h-7 w-full resize-y rounded-none bg-transparent p-0 font-sans text-xs focus-visible:ring-0"
              />
            </div>
          </Specimen>

          <Specimen
            source="assistant-chat.tsx:630-700"
            tone="casse"
            note="Ni cellule ni libellé : 9 champs Input nus, nommés par aria-label seul. Aucun repère visible une fois la saisie commencée."
            frameClassName="bg-border p-px"
          >
            <div className="flex flex-col gap-px">
              <Input
                aria-label="Email"
                placeholder="Email"
                className="bg-background"
              />
              <Input
                aria-label="SIREN"
                placeholder="SIREN"
                className="bg-background"
              />
            </div>
          </Specimen>
        </SpecimenGrid>
      </Subsection>

      <Subsection
        title="Cases à cocher — 3 dessinées à la main, 1 primitive"
        note="Checkbox existe et fonctionne. step-contact.tsx l'importe ligne 2, l'utilise ligne 255, et dessine sa propre case ligne 178 — dans le même écran."
      >
        <SpecimenGrid min="240px">
          <Specimen
            source="src/components/ui/checkbox.tsx"
            tone="canon"
            note="size-4 · cible tactile étendue par after:-inset-x-3 after:-inset-y-2 · état porté par la primitive."
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox defaultChecked />
              J’accepte les CGV
            </label>
          </Specimen>

          <Specimen
            source="step-contact.tsx:178-190"
            tone="copie"
            note="w-2 h-2 (8px !) avec une « coche » de 2px. border-white sous portée dark : devrait être border-primary-foreground."
          >
            <button
              type="button"
              aria-pressed
              className="inline-flex h-auto min-w-0 items-center justify-start gap-1 border border-foreground bg-background px-2 py-1 text-xs tracking-tight"
            >
              <span
                aria-hidden
                className="inline-flex h-2 w-2 shrink-0 items-center justify-center border border-white bg-primary"
              >
                <span className="h-0.5 w-0.5 bg-background" />
              </span>
              <span className="overflow-hidden text-ellipsis">
                Prêt-à-porter
              </span>
            </button>
          </Specimen>

          <Specimen
            source="step-team.tsx:45-53"
            tone="copie"
            note="w-5.5 h-5.5 border-2 (22px) — une 3e géométrie · coche au caractère ✓ et non CheckIcon · font-bold, graisse absente de la fonte."
          >
            <span className="inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-wider">
              <span className="text-primary">Photographe</span>
              <span
                aria-hidden
                className="inline-flex h-5.5 w-5.5 items-center justify-center border-2 border-primary bg-primary text-sm font-bold text-primary-foreground"
              >
                ✓
              </span>
            </span>
          </Specimen>

          <Specimen
            source="mobile-nav-strip.tsx:236-247"
            tone="copie"
            note="size-4 avec pastille size-1.5 — reprend exactement la géométrie de Checkbox, mais dessinée à la main autour d'un <input type=radio sr-only>."
          >
            <span className="inline-flex items-center gap-3">
              <span className="grid size-4 shrink-0 place-items-center border border-foreground bg-background">
                <span className="size-1.5 bg-foreground" />
              </span>
              <span className="font-mono text-sm uppercase tracking-widest">
                Cyclorama
              </span>
            </span>
          </Specimen>
        </SpecimenGrid>
      </Subsection>

      <Subsection
        title="Bascules"
        note="Switch est la seule primitive de bascule installée. Deux autres motifs coexistent : aria-pressed + portée dark, et aria-pressed + bg-primary."
      >
        <SpecimenGrid min="240px">
          <Specimen
            source="src/components/ui/switch.tsx"
            tone="canon"
            note="Deux tailles, en pixels arbitraires : h-[18.4px] w-[32px] et h-[14px] w-[24px] — les seules valeurs en px du dépôt hors drawer."
          >
            <div className="flex items-center gap-4">
              <Switch checked={on} onCheckedChange={setOn} />
              <Switch size="sm" checked={on} onCheckedChange={setOn} />
            </div>
          </Specimen>

          <Specimen
            source="step-postprod.tsx:13 vs step-configurator.tsx:485-530"
            tone="copie"
            note="La même ligne « Post-production par E-Do », deux fois. L'une porte border-l-4 border-l-primary quand elle est active — une 2e épaisseur de liseré, le rail canonique étant border-l-2. L'autre n'a aucun marqueur."
          >
            <div className="flex flex-col gap-px bg-border">
              <div className="flex items-center justify-between border-l-4 border-l-primary bg-background px-5 py-5">
                <span className="text-sm">Post-production par E-Do</span>
                <Switch checked readOnly />
              </div>
              <div className="flex items-center justify-between bg-background px-4 py-4 sm:px-3.5 sm:py-2.5">
                <span className="text-sm">Post-production par E-Do</span>
                <Switch checked readOnly />
              </div>
            </div>
          </Specimen>
        </SpecimenGrid>
      </Subsection>

      <Subsection
        title="Le même champ quantité, deux fois dans le même fichier"
        note="À 90 lignes d'écart. L'un a une bordure, l'autre non. L'un est nommé par aria-label, l'autre par un <label>."
      >
        <SpecimenGrid min="260px">
          <Specimen
            source="step-configurator.tsx:353"
            tone="copie"
            note="border-border posé sans border — la classe de couleur seule ne dessine aucun trait."
          >
            <Input
              aria-label="Nombre de produits"
              defaultValue="120"
              className="h-auto min-w-0 flex-1 rounded-none border-border bg-background px-3.5 py-2.5 text-center font-mono text-base tracking-tight"
            />
          </Specimen>
          <Specimen
            source="step-configurator.tsx:440,458"
            tone="copie"
            note="border border-border : le trait est là. Même champ, même écran."
          >
            <label className="flex flex-col gap-2 bg-background">
              <span className={LABEL_CLS}>Nombre de produits</span>
              <input
                defaultValue="120"
                className="w-full min-w-0 flex-1 border border-border bg-background px-3.5 py-2.5 text-center font-mono text-base tracking-tight text-foreground"
              />
            </label>
          </Specimen>
        </SpecimenGrid>
      </Subsection>

      <Subsection
        title="Erreurs — 4 traitements"
        note="Dont un qui affiche l'erreur en orange, la couleur de marque, au lieu de destructive."
      >
        <SpecimenGrid min="260px">
          <Specimen
            source="contact-form.tsx:154"
            tone="copie"
            note="Alert global en pied de formulaire, non refermable, aucune erreur par champ."
          >
            <Alert variant="destructive" className="rounded-none">
              <AlertDescription>L’envoi a échoué. Réessayez.</AlertDescription>
            </Alert>
          </Specimen>

          <Specimen
            source="src/ui/form-cell.tsx:87"
            tone="canon"
            note="FieldError + aria-describedby + anneau posé par data-invalid."
            frameClassName="bg-border p-px"
          >
            <FormCell label="Email" error="Adresse invalide">
              <FormCellInput
                value="pas-un-email"
                onChange={() => {}}
                placeholder="camille@votremarque.fr"
              />
            </FormCell>
          </Specimen>

          <Specimen
            source="step-contact.tsx:47,278"
            tone="copie"
            note="<span> posé à la main, et l'anneau réécrit classe par classe."
          >
            <div
              className={cn(
                'flex min-h-11 flex-col gap-1 bg-background px-3 py-1.5',
                'ring-1 ring-destructive ring-inset',
              )}
            >
              <span className={LABEL_CLS}>CGV *</span>
              <span className="text-xs leading-tight text-destructive">
                Vous devez accepter les CGV
              </span>
            </div>
          </Specimen>

          <Specimen
            source="assistant-chat.tsx:717,816"
            tone="casse"
            note="text-primary : l'erreur est peinte en orange de marque. Indistinguable d'une mise en valeur."
          >
            <div className="mt-1.5 text-xs text-primary">
              Adresse e-mail invalide
            </div>
          </Specimen>
        </SpecimenGrid>
      </Subsection>
    </Section>
  );
};
