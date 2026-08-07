import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';
import { MonoLabel } from '../ui/mono-label';

// La bande qui coiffe les deux tunnels : elle dit dans quel mode on se trouve,
// permet de repartir de zéro, et bascule vers l'autre mode.
//
// Elle existait en DEUX exemplaires — celui-ci et une réécriture dans
// `step-configurator.tsx` — qui divergeaient sur tout ce qui compte : le
// conteneur (`ButtonGroup` contre `div`), le point d'arrêt (`lg` contre `md`),
// le retour à la ligne, et le survol du bouton de remise à zéro, posé à
// `hover:bg-muted` d'un côté alors que la bande EST `bg-muted` — un survol
// invisible.
//
// Trois défauts corrigés au passage :
//
//   — `whitespace-normal` sur les actions. La base de `Button` pose
//     `whitespace-nowrap` ; l'annuler coupait « ↻ Réinitialiser » en deux
//     lignes, le symbole seul au-dessus du mot. Un libellé d'action ne se
//     replie pas : si la place manque, c'est la bande qui passe en colonne.
//
//   — le faux affordance. Le texte se terminait par « ← passer au
//     configurateur » en `text-foreground`, un `<span>` inerte posé juste à
//     côté du bouton qui, lui, fait l'action — et les deux disaient la même
//     chose. `step-configurator` avait déjà supprimé le sien ; celui-ci était
//     resté.
//
//   — `ButtonGroup`. Ses variantes horizontales posent des `rounded-*` inertes
//     (`--radius: 0`) et retirent la bordure gauche du second bouton pendant
//     que `ButtonGroupSeparator` en rajoute une : deux propriétaires pour une
//     seule couture.
//
// `size="touch"` porte la cible tactile de 44px et le retrait des icônes
// (`has-data-[icon=…]`), au lieu de les réécrire à la main.

interface BookingModeBannerProps {
  /** Ce que fait le mode courant, en une phrase. */
  hint: string;
  /** Libellé du bouton qui bascule vers l'autre mode. */
  switchLabel: string;
  /**
   * `back` — on remonte vers le configurateur (flèche à gauche).
   * `forward` — on va vers le choix manuel (flèche à droite).
   */
  direction: 'back' | 'forward';
  onReset: () => void;
  onSwitch: () => void;
  className?: string;
}

const BookingModeBanner = ({
  hint,
  switchLabel,
  direction,
  onReset,
  onSwitch,
  className,
}: BookingModeBannerProps) => {
  const t = useT();
  const isBack = direction === 'back';
  return (
    // Le passage sur une ligne attend `lg`, pas `md` : à 820 la bande ne fait
    // que 278px, moins que les 318px des deux libellés.
    <div
      className={cn(
        'box-border flex shrink-0 flex-col border-b border-border bg-muted lg:min-h-tap lg:flex-row lg:items-stretch',
        className,
      )}
    >
      <MonoLabel
        tone="muted"
        lines="multi"
        className="min-w-0 flex-1 px-5 py-3 lg:self-center lg:py-0 lg:pl-5 lg:pr-3"
      >
        {hint}
      </MonoLabel>
      {/* Le filet entre les actions vient de `*+*` : posé sur chaque bouton, le
          premier en porterait un contre le bord gauche de l'écran en mobile.
          `lg:border-l` sépare le groupe de la phrase, et seulement une fois
          qu'ils partagent une ligne. */}
      {/* `@container` : les deux actions se partageaient la ligne quelle que
          soit la largeur. À 390px, « Réinitialiser » et « Configurateur »
          faisaient 190px chacune pour 195 disponibles — elles se chevauchaient.
          Elles s'empilent sous `@sm`, et le filet suit l'axe. */}
      {/* Pas de `w-1/2` : à 1024px la colonne fait 644, la bande aussi, et la
          moitié n'en laissait que 322 pour deux actions dont les libellés en
          demandent 360. Elles prennent leur largeur, la phrase absorbe le
          reste — comme dans la barre de pied.
          
          Pas de container query non plus : la largeur d'un libellé ne dépend
          pas de celle du conteneur, elle est fixe. Les deux boutons tiennent
          côte à côte dès 390px. */}
      <div className="flex shrink-0 items-stretch border-t border-border lg:border-l lg:border-t-0">
        <Button
          type="button"
          variant="cell"
          size="touch"
          onClick={onReset}
          // La bande est déjà `bg-muted` : c'est le fond de la CELLULE qui doit
          // apparaître au survol, sinon rien ne bouge.
          className="min-w-0 bg-transparent hover:bg-background max-lg:flex-1"
        >
          <RotateCcw data-icon="inline-start" />
          {t('common.reset')}
        </Button>
        <Button
          type="button"
          variant="cell"
          size="touch"
          onClick={onSwitch}
          // La couture entre les deux actions, portée par la seconde. Toujours
          // à gauche : elles ne s'empilent plus, donc l'axe ne change pas.
          className="min-w-0 border-l border-border bg-transparent hover:bg-background max-lg:flex-1"
        >
          {isBack && <ArrowLeft data-icon="inline-start" />}
          {switchLabel}
          {!isBack && <ArrowRight data-icon="inline-end" />}
        </Button>
      </div>
    </div>
  );
};

export { BookingModeBanner };
export type { BookingModeBannerProps };
