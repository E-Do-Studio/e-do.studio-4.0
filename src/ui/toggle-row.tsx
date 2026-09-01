import { useId } from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { MonoLabel } from './mono-label';

// La ligne à bascule : « Post-production par E-Do », une option qu'on active ou
// non. Deux copies existaient — l'étape post-prod du tunnel et sa réécriture
// dans le configurateur, qui posent aujourd'hui toutes deux ce composant.
//
// Elles ne différaient que par le marqueur : la première portait `border-l-4
// border-l-primary` à l'état actif, la seconde rien du tout. Or `border-l-4`
// est une SECONDE épaisseur de liseré de sélection, le rail canonique étant à
// `border-l-2` — deux traits pour la même intention, sur deux écrans voisins du
// même tunnel.
//
// Un `<label>` enveloppant : cliquer l'intitulé bascule le contrôle, sans
// identifiant à câbler. Le `useId` reste utile pour `aria-describedby`, que le
// libellé seul ne peut pas porter.

interface ToggleRowProps {
  title: string;
  /** Précision sous l'intitulé, rattachée au contrôle par aria-describedby. */
  hint?: string;
  /**
   * « Oui / Non » posé avant l'interrupteur. Redondant avec lui par nature —
   * il n'existe que là où la décision est un engagement contractuel et mérite
   * d'être lue en toutes lettres. `aria-hidden` : l'état est déjà annoncé par
   * `aria-checked`, le répéter ferait doublon au lecteur d'écran.
   */
  stateLabel?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export const ToggleRow = ({
  title,
  hint,
  stateLabel,
  checked,
  onCheckedChange,
  className,
}: ToggleRowProps) => {
  const hintId = useId();
  // Aucun liseré. L'interrupteur EST l'état — c'est un contrôle, il porte déjà
  // sa propre couleur d'activation. Un trait supplémentaire sur le bord gauche
  // dupliquait cette information dans une couleur d'accent, sur un bord que le
  // filet de la grille occupe déjà.
  return (
    <label
      className={cn(
        'flex min-h-tap cursor-pointer items-center justify-between gap-4 px-pad-cell py-3 transition-colors duration-150',
        checked ? 'bg-muted' : 'bg-background',
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm tracking-tight">{title}</span>
        {/* Une PHRASE, pas un libellé : « Sélection, retouche, livraison —
            chiffrage sur demande selon le volume » fait soixante caractères.
            En mono capitales à fort interlettrage, elle ne se lit pas et
            déborde de sa colonne. Les capitales sont pour les libellés
            courts. */}
        {hint && (
          <span
            id={hintId}
            className="text-pretty text-xs leading-normal text-muted-foreground"
          >
            {hint}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {stateLabel && (
          <MonoLabel aria-hidden tone={checked ? 'primary' : 'muted'}>
            {stateLabel}
          </MonoLabel>
        )}
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-describedby={hint ? hintId : undefined}
        />
      </span>
    </label>
  );
};
