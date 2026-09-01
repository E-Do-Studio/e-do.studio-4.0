import { cva, type VariantProps } from 'class-variance-authority';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { monoLabelVariants } from './mono-label';
import type { ChangeEvent, HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext, useId } from 'react';

// `Field` de shadcn est un simple `<div role="group">` : il ne fabrique aucun
// identifiant, et `FieldLabel` rend un `<label>` nu. Le libellé était donc le
// FRÈRE du champ, ni parent ni pointant vers lui — les dix champs de l'étape
// contact n'avaient aucun nom accessible, et leur seul repère visible, le
// placeholder, disparaît à la saisie.
//
// Le contexte porte l'appariement plutôt qu'un `cloneElement` : `children` est
// du JSX libre, et plusieurs appelants y glissent autre chose qu'un
// `FormCellInput`.
//
// Ce composant vivait dans `book/shared.tsx` sous les noms `BentoField` /
// `BentoInput`. Il en sort parce qu'il n'a rien de propre au tunnel : c'est LA
// cellule de formulaire du site.
//
// Il a remplacé trois copies, toutes supprimées : `ContactField`/`FIELD_INPUT`
// dans `contact-form.tsx` et `WideCell` dans `book/steps/step-contact.tsx`.
// Aucune ne câblait d'identifiant — leurs quatorze champs n'avaient pas de nom
// accessible. Reste `assistant-chat.tsx`, qui pose encore neuf
// `<Input aria-label>` nus ; il appartenait à un autre agent au moment de la
// migration.
//
// `as="group"` existe pour absorber le cas de `WideCell` : dès qu'on met dans
// la cellule une case à cocher, un groupe de boutons ou du texte libre, il n'y
// a plus d'`id` unique à pointer et `<label for>` devient un mensonge. C'était
// un défaut d'API, pas une fatalité — on rend alors un `role="group"` +
// `aria-labelledby`, la forme correcte pour un ensemble de contrôles.
interface FormCellContextValue {
  inputId: string;
  errorId?: string;
  invalid: boolean;
}

const FormCellContext = createContext<FormCellContextValue | null>(null);

// La cellule possède le focus et l'erreur ; aucun contrôle qu'elle enveloppe ne
// doit dessiner les siens. `Input` comme `Textarea` posent un OUTLINE au focus
// et un halo de 3px sur `aria-invalid` — empilés avec ceux de la cellule, ils
// donnent une boîte dans une boîte.
//
// Écrit ici et non sur chaque champ : `as="group"` accepte un contenu libre,
// donc n'importe quel contrôle peut s'y trouver. Une règle posée au site
// d'appel se réapplique à la main au champ suivant, et s'oublie — c'est
// exactement ce qui est arrivé au `<Textarea>` après que le `<Input>` eut été
// traité.
//
// Cela vaut aussi pour le CADRE, et pas seulement pour les décorations d'état :
// aucun contrôle posé ici ne dessine le sien. Le champ quantité du configurateur
// en portait un, et au focus les deux rectangles apparaissaient l'un dans
// l'autre — la boîte dans une boîte que cette cellule existe pour supprimer.
interface FormCellProps {
  label: string;
  children: ReactNode;
  /** Valeur de `grid-column`, pour les champs qui traversent la grille. */
  span?: string;
  error?: string;
  /** Masque le libellé sans le retirer du nom accessible. */
  hideLabel?: boolean;
  /**
   * `field` — un champ unique, nommé par `<label for>` (le défaut).
   * `group` — plusieurs contrôles ou du contenu libre, nommés collectivement
   * par `role="group"` + `aria-labelledby`. Un `<label for>` n'aurait alors
   * aucun `id` unique à désigner.
   */
  as?: 'field' | 'group';
  className?: string;
  labelClassName?: string;
}

// Cellule de formulaire : le libellé coiffe le champ à l'intérieur de la
// cellule bento. `data-invalid` porte l'état d'erreur, que `Field` et
// `FieldError` savent lire — l'anneau rouge et le message sont posés par le
// composant, plus par des classes en ligne au site d'appel.
const FormCell = ({
  label,
  children,
  span,
  error,
  hideLabel = false,
  as = 'field',
  className,
  labelClassName,
}: FormCellProps) => {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const labelId = `${inputId}-label`;
  const isGroup = as === 'group';

  // `monoLabelVariants` et non la chaîne recopiée : le libellé d'un champ est
  // le même libellé mono capitale que partout ailleurs.
  const labelClasses = cn(
    hideLabel ? 'sr-only' : monoLabelVariants({ tone: 'muted' }),
    labelClassName,
  );

  return (
    <FormCellContext.Provider
      value={{
        inputId,
        errorId: error ? errorId : undefined,
        invalid: Boolean(error),
      }}
    >
      <Field
        data-invalid={error ? true : undefined}
        // `min-h-tap` plutôt que `min-h-11` : même mesure, mais nommée. C'est
        // la cible tactile, pas un onzième pas d'échelle choisi au jugé.
        //
        // C'est la CELLULE qui porte le focus, pas le champ. Sans ça, `Input`
        // dessine son propre tracé à l'intérieur, et on obtient une boîte dans
        // une boîte : un rectangle noir flottant autour du texte, à quelques
        // pixels des bords de la cellule. La cellule EST le champ — son
        // libellé, son fond et son anneau ne font qu'un.
        //
        // `cursor-text` pour la même raison : cliquer n'importe où dans la
        // cellule doit donner le sentiment de cliquer dans le champ.
        //
        // L'erreur emprunte le MÊME mécanisme que le focus — un outline de 2px
        // tracé à l'intérieur — et n'en change que la couleur. Elle valait
        // auparavant un `ring`, c'est-à-dire une ombre portée : deux géométries
        // pour deux états du même bord.
        //
        // Le ternaire plutôt que deux variantes Tailwind : `focus-within:` et
        // `data-[invalid]:` visent le même élément et la même propriété, et
        // c'est l'ordre d'émission du CSS qui trancherait, pas l'ordre des
        // classes. Ici le champ invalide reste souligné en rouge même une fois
        // focalisé — il l'est toujours.
        className={cn(
          'min-h-tap cursor-text gap-1.5 bg-background px-4 py-2.5 sm:px-3 sm:py-1.5',
          '[&_input]:focus-visible:outline-none [&_textarea]:focus-visible:outline-none',
          '[&_input]:aria-invalid:ring-0 [&_textarea]:aria-invalid:ring-0',
          '[&_input]:aria-invalid:text-foreground [&_textarea]:aria-invalid:text-foreground',
          error
            ? 'outline-2 -outline-offset-2 outline-destructive'
            : 'focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-foreground',
          className,
        )}
        {...(span ? { style: { gridColumn: span } } : {})}
        {...(isGroup
          ? {
              role: 'group',
              'aria-labelledby': labelId,
              'aria-describedby': error ? errorId : undefined,
            }
          : {})}
      >
        {/* `fieldVariants` vertical porte `[&>.sr-only]:w-auto` : le libellé
            masqué est prévu par la primitive, il ne casse pas la colonne. */}
        {isGroup ? (
          // Pas de `<label>` ici : sans `for`, il ne nommerait rien, et pointer
          // vers l'un des contrôles du groupe reviendrait à désigner le premier
          // au détriment des autres. C'est `aria-labelledby` qui fait le lien.
          <span id={labelId} className={labelClasses}>
            {label}
          </span>
        ) : (
          <FieldLabel htmlFor={inputId} className={labelClasses}>
            {label}
          </FieldLabel>
        )}
        {children}
        {/* `text-xs` : `FieldError` sort en `text-sm`, soit la taille de la
            valeur saisie juste au-dessus. Deux lignes du même poids dans une
            cellule de 44px, on ne sait plus laquelle est la donnée. Le message
            est une annotation, il se lit à l'échelle des mentions. */}
        {error && (
          <FieldError id={errorId} className="text-xs leading-snug">
            {error}
          </FieldError>
        )}
      </Field>
    </FormCellContext.Provider>
  );
};

// Le registre de la valeur saisie, pas un ajustement de style.
//
// `text` — une phrase qu'on lit de gauche à droite (le défaut).
//
// `count` — un nombre tapé au clavier : mono à corps plein, chiffres à chasse
// fixe. `tabular-nums` fait partie de la définition d'un nombre dans ce système,
// comme dans `Price`.
//
// Ce que `count` ne fait PAS, et c'est le point : dessiner un cadre. Les trois
// champs du configurateur en portaient un — deux recopiaient la chaîne mot pour
// mot, le troisième posait `border-border` SANS `border` et n'avait donc aucun
// cadre du tout. Mais la cellule EST le champ : elle porte le retrait, le fond
// et l'anneau de focus. Un cadre à l'intérieur donne exactement la boîte dans
// une boîte que `FormCell` existe pour supprimer, et ça se voit au focus, où les
// deux rectangles apparaissent l'un dans l'autre.
//
// Ni centrage non plus : la valeur se lit sous son libellé, à la même origine
// que lui. Centrée dans une cellule large, elle flottait au milieu de rien.
const formCellInputVariants = cva(
  'h-auto w-full rounded-none border-0 bg-transparent p-0 font-sans text-sm tracking-tight',
  {
    variants: {
      kind: {
        text: '',
        count: 'font-mono text-base tabular-nums',
      },
    },
    defaultVariants: { kind: 'text' },
  },
);

interface FormCellInputProps
  extends VariantProps<typeof formCellInputVariants> {
  value: string | undefined;
  onChange: (value: string) => void;
  /**
   * Obligatoire, et c'est le typecheck qui le tient — pas une consigne.
   *
   * Il donne un EXEMPLE ou un format (« 06 12 34 56 78 »,
   * « camille@votremarque.fr »), jamais une répétition du libellé : celui-ci est
   * déjà posé au-dessus du champ par la cellule. Un placeholder qui redit le
   * libellé n'apporte rien et disparaît à la première frappe.
   */
  placeholder: string;
  type?: 'text' | 'email' | 'tel' | 'number';
  name?: string;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  invalid?: boolean;
  className?: string;
}

// `invalid` reste accepté pour un usage hors `FormCell`, mais n'a plus besoin
// d'être passé : l'erreur vit déjà dans le contexte de la cellule. C'est ce qui
// explique qu'aucun appelant ne le renseignait — la prop existait sans que
// personne n'ait la valeur sous la main au bon endroit.
const FormCellInput = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  name,
  autoComplete,
  inputMode,
  invalid,
  kind,
  className,
}: FormCellInputProps) => {
  const field = useContext(FormCellContext);
  return (
    <Input
      id={field?.inputId}
      value={value || ''}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      name={name}
      autoComplete={autoComplete}
      inputMode={inputMode}
      aria-invalid={invalid || field?.invalid || undefined}
      aria-describedby={field?.errorId}
      // `aria-invalid` reste posé — c'est lui qui annonce le champ comme
      // invalide aux technologies d'assistance, et il n'est pas négociable.
      // L'attribut porte le sens, la cellule porte la peinture : ses
      // décorations d'état sont neutralisées par `CONTROLES_SANS_DECOR`, plus
      // haut, pour tous les contrôles à la fois.
      className={cn(formCellInputVariants({ kind }), className)}
    />
  );
};

// `kind` est retiré au passage : un texte long n'a pas de registre « nombre ».
interface FormCellTextareaProps
  extends Omit<
    FormCellInputProps,
    'type' | 'inputMode' | 'autoComplete' | 'kind'
  > {
  rows?: number;
  /**
   * Le textarea prend toute la hauteur que sa cellule lui donne.
   *
   * À poser dès que la cellule vit dans une piste `1fr` : sans lui, le champ
   * s'arrête à son plancher et laisse le reste de la cellule vide — le
   * formulaire de contact affichait 112px de zone de saisie dans une cellule de
   * 506, soit quatre cents pixels de blanc cliquables qui n'écrivaient rien.
   *
   * Il emporte `resize-none`, et ce n'est pas une restriction : un champ qui
   * occupe déjà toute sa cellule n'a plus où grandir, et la page est verrouillée
   * en hauteur (`overflow:hidden` sur la coquille) — la poignée ne pouvait que
   * faire déborder la grille.
   */
  fill?: boolean;
}

// Le pendant de `FormCellInput` pour un contenu long. Il existe pour une raison
// précise : sans lui, un `<Textarea>` posé dans la cellule n'a aucun moyen de
// récupérer l'identifiant généré, et le libellé cesse de le désigner. C'est ce
// qui poussait les sites d'appel à écrire un `<span>` frère à la place d'un
// vrai `<label>` — le défaut que cette cellule existe pour supprimer.
//
// LE PLANCHER APPARTIENT AU COMPOSANT. Les deux sites d'appel l'écrivaient
// eux-mêmes, et à deux valeurs différentes — `min-h-28` pour le message du
// formulaire de contact, `min-h-7` pour la note optionnelle du tunnel. Deux
// mesures pour un même rôle, chacune invisible à l'autre.
//
// `flex-1` ne suffit pas seul : il vaut `flex-basis: 0%`, donc dans une cellule
// dimensionnée par son contenu le champ se réduirait à rien. C'est le plancher
// qui le retient, et c'est pour ça que les deux vont ensemble.
const FormCellTextarea = ({
  value,
  onChange,
  placeholder,
  name,
  rows,
  invalid,
  fill = false,
  className,
}: FormCellTextareaProps) => {
  const field = useContext(FormCellContext);
  return (
    <Textarea
      id={field?.inputId}
      value={value || ''}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
        onChange(e.target.value)
      }
      placeholder={placeholder}
      name={name}
      rows={rows}
      aria-invalid={invalid || field?.invalid || undefined}
      aria-describedby={field?.errorId}
      className={cn(
        'h-auto w-full rounded-none border-0 bg-transparent p-0 font-sans text-sm leading-normal tracking-tight',
        fill
          ? 'min-h-28 flex-1 resize-none'
          : // `resize-y` reste là où la cellule suit son contenu : le champ peut
            // grandir, et la cellule grandit avec lui.
            'min-h-7 resize-y',
        className,
      )}
    />
  );
};

export { FormCell, FormCellInput, FormCellTextarea };
