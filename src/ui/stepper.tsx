import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';

// Le compteur à deux boutons : nombre d'heures, quantité, nombre de vues.
//
// Il vivait écrit deux fois dans `step-duration.tsx`, et n'était pas un
// composant — donc pas dans le design system, donc invisible à toute revue.
//
// Trois défauts qu'il portait :
//
//   — `−` et `+` étaient des CARACTÈRES posés dans le texte du bouton. La base
//     de `Button` parle `font-mono text-xs` : les deux signes rendaient à 12px
//     au centre d'un carré de 32, perdus dans le vide. Ce sont des icônes, elles
//     viennent de lucide comme partout ailleurs dans le dépôt.
//
//   — `size="icon"` vaut 32px, sous la cible tactile. `icon-touch` porte les
//     44px et monte l'icône à 20px.
//
//   — aucun nom accessible. Deux boutons dont le contenu est un signe
//     typographique s'annoncent « moins » et « plus » — hors contexte, sans dire
//     ce qu'ils font varier. Le groupe porte l'intitulé, les boutons portent
//     leur action.
//
// Pas de `<input type="number">` : la valeur n'est pas librement saisissable —
// franchir 4h bascule le créneau en demi-journée, 8h en journée complète. C'est
// un contrôle à pas, pas un champ.

interface StepperProps {
  /**
   * Nom accessible du groupe. Le compteur n'a pas d'intitulé visible à lui :
   * c'est la ligne qui le contient qui l'annonce (« Nombre d'heures »).
   */
  label: string;
  /** Valeur déjà formatée — `3`, `12h`. */
  value: string | number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  className?: string;
  /** Largeur minimale de la valeur, pour que les boutons ne bougent pas. */
  valueClassName?: string;
}

export const Stepper = ({
  label,
  value,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  className,
  valueClassName,
}: StepperProps) => {
  const t = useT();

  // Le sens du dernier pas, pour que la valeur entre du côté d'où elle vient :
  // par le bas quand on ajoute, par le haut quand on retire. Deux carrés
  // identiques ne disent pas lequel a agi — le déplacement, si.
  //
  // Le sens vient du bouton pressé, et non d'une comparaison entre l'ancienne et
  // la nouvelle valeur : `value` est parfois une chaîne (`12h`), et surtout,
  // retenir la valeur précédente dans une ref écrite pendant le rendu se casse
  // en `StrictMode` — le second rendu compare la valeur à elle-même et conclut
  // toujours « vers le haut ». Le bouton, lui, sait ce qu'il a fait.
  const [goingDown, setGoingDown] = useState(false);

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex items-center gap-3.5', className)}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-touch"
        // L'enfoncement, seul retour que le bouton donnait jusqu'ici : la valeur
        // change à 44px de là, et le doigt la couvre sur mobile. La base de
        // `Button` transitionne déjà à 150ms `ease-out`, il n'y a que l'échelle
        // à poser. `active:` et non `hover:` — c'est le geste qu'on confirme, il
        // n'y a donc rien à protéger d'un faux survol tactile.
        className="flex-none motion-safe:active:scale-[0.97]"
        aria-label={t('common.decrease')}
        disabled={decrementDisabled}
        onClick={() => {
          setGoingDown(true);
          onDecrement();
        }}
      >
        <Minus />
      </Button>
      {/* `aria-live` : la valeur change sans que le focus ne bouge — le bouton
          reste sous le curseur. Sans annonce, rien ne dit qu'elle a changé.
          `tabular-nums` pour que passer de 9 à 10 ne décale pas les boutons. */}
      <span
        aria-live="polite"
        className={cn(
          'text-center text-2xl font-light tabular-nums tracking-tight',
          valueClassName,
        )}
      >
        {/* Le pendant visuel d'`aria-live` : la même information, pour qui
            regarde plutôt qu'écoute. Un `key` sur la valeur, donc un nouveau
            nœud à chaque pas, donc l'animation d'entrée repart.

            Déplacement SEUL, sans fondu : ces deux boutons se martèlent, et un
            `key` fait redémarrer l'animation à zéro à chaque clic. Un fondu
            repartirait de l'invisible et clignoterait sous une rafale ; 3px qui
            se rejouent ne se voient pas. C'est aussi pourquoi la durée est à
            120ms — sous le seuil où un redémarrage se remarque. */}
        <span
          key={String(value)}
          className={cn(
            'block motion-safe:animate-in motion-safe:duration-120 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
            goingDown
              ? 'motion-safe:slide-in-from-top-[3px]'
              : 'motion-safe:slide-in-from-bottom-[3px]',
          )}
        >
          {value}
        </span>
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-touch"
        className="flex-none motion-safe:active:scale-[0.97]"
        aria-label={t('common.increase')}
        disabled={incrementDisabled}
        onClick={() => {
          setGoingDown(false);
          onIncrement();
        }}
      >
        <Plus />
      </Button>
    </div>
  );
};
