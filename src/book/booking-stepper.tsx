import { Rail, RailCell } from '@/ui/rail-cell';
import { SegmentGroup, SegmentItem } from '@/ui/segment-group';
import { ordinal } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';
import type { StepProgress } from './booking-steps';
import { MonoLabel } from '../ui/mono-label';

interface StepperProps {
  progress: StepProgress[];
  goToStep: (n: number) => void;
}

/** Fil d'étapes en tête d'écran, sous le palier `app`. */
const BookingStepperMobile = ({ progress, goToStep }: StepperProps) => {
  const t = useT();
  const current = progress.find((s) => s.active);
  return (
    <nav
      aria-label={t('booking.bookingSteps')}
      // Pas de `border-b` : ce `<nav>` est un enfant direct de la grille de
      // page, qui porte `gap-px bg-border` — la gouttière le sépare déjà du
      // formulaire. Les deux se cumulaient en un trait de 2px.
      className="app:hidden bg-background"
    >
      {/* Des cellules séparées par la gouttière, comme le rail desktop juste
          en dessous — et non des carrés reliés par des traits, un motif qu'on ne
          trouve nulle part ailleurs sur ce site.
          
          L'étape courante s'INVERSE au lieu de passer en orange : l'orange est
          l'accent d'action (« Réserver », le jour choisi), il ne marque pas une
          position dans un parcours. Et il ne reste que deux états au lieu de
          quatre — l'inversion, et les hachures pour ce qui n'est pas encore
          ouvert. Le `✓` s'ajoute aux étapes franchies.
          
          `SegmentItem` porte déjà `aria-disabled` plutôt que `disabled` : une
          étape à venir reste atteignable au clavier, donc son libellé reste
          lisible. */}
      {/* `layout="row"` et non `grid` : le nombre d'étapes varie (cinq en mode
          configurateur, six en manuel), et `SegmentGroup` ne prend plus de
          `gridTemplateColumns` en style inline — une valeur inline ne se
          surcharge pas au point d'arrêt. `flex-1` sur chaque cellule leur donne
          des parts égales sans que le conteneur ait à les compter. */}
      <SegmentGroup
        label={t('booking.bookingSteps')}
        // Pas de retrait horizontal : ce conteneur porte la gouttière
        // (`gap-px bg-border`, du noir pur), et un padding laisse ce fond
        // apparaître aux deux bouts — deux blocs noirs. La bande court d'un
        // bord à l'autre, comme tous les filets du site.
        // `border-b` : le `<nav>` ferme l'ensemble sous le libellé, rien ne
        // séparait la bande de cellules de celui-ci.
        className="flex-nowrap border-b border-border"
      >
        {progress.map(({ n, label, index, active, done, clickable }) => (
          <SegmentItem
            key={n}
            selected={active}
            current="step"
            unavailable={!clickable}
            label={`${index + 1}. ${label}`}
            onSelect={() => goToStep(n)}
            className="flex-1 tabular-nums"
          >
            {done ? '✓' : ordinal(index)}
          </SegmentItem>
        ))}
      </SegmentGroup>
      {/* Le seul vrai remplacement de contenu du stepper — et la seule chose
          qu'on puisse animer des deux côtés du tunnel. En mode configurateur
          chaque étape est une route distincte (`book-step-routes.tsx`) : tout
          `BookPage` est démonté puis remonté, donc aucune transition CSS ne peut
          jouer. Une animation d'APPARITION, elle, part au montage.

          Le `key` sert au mode manuel, où rien ne remonte : il force le
          remplacement du nœud à chaque étape pour que l'apparition rejoue.

          La montée est sous `motion-safe:`, le fondu ne l'est pas — en mouvement
          réduit le libellé apparaît sans se déplacer, plus doux plutôt que
          supprimé. */}
      <div
        key={current?.n ?? -1}
        className="flex items-baseline gap-2.5 px-pad-cell pb-4 pt-3 animate-in fade-in-0 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:slide-in-from-bottom-2"
      >
        <MonoLabel tone="muted" className="tabular-nums">
          {ordinal(current?.index ?? 0)}
        </MonoLabel>
        <MonoLabel>{current?.label}</MonoLabel>
      </div>
    </nav>
  );
};

/** Rail vertical dans la première colonne, à partir de `app`. */
const BookingStepperRail = ({ progress, goToStep }: StepperProps) => {
  const t = useT();
  return (
    // Même indicateur que la version mobile, donc même repère : `<nav>` — d'où
    // le `render`, puisque `Rail` est un `<aside>` par défaut et qu'un rail de
    // tunnel n'est pas un contenu complémentaire.
    // L'état de l'étape courante est porté par `RailCell`, qui pose
    // `aria-pressed` et l'inversion — le rail n'a plus à le décrire lui-même.
    <Rail
      render={<nav aria-label={t('booking.bookingSteps')} />}
      className="hidden app:flex app:col-start-1 app:row-start-2 app:overflow-y-auto"
    >
      {/* L'étape franchie garde son « ✓ » à la place du numéro : c'est le seul
          repère qui dise où l'on en est dans le tunnel, et il est décoratif —
          l'état est porté par le texte à côté et par `aria-current`.

          Plus d'`opacity` sur l'étape inatteignable. Elle valait 35 %, ce qui
          faisait tomber le libellé à 2.35:1 ; même remontée à 60 % le numéro
          restait sous le seuil, parce que sa couleur est DÉJÀ
          `muted-foreground`. `aria-disabled` le dit aux technologies
          d'assistance, le curseur le dit à la souris. */}
      {progress.map(({ n, label, index, active, done, clickable }) => (
        <RailCell
          key={n}
          number={done ? '✓' : ordinal(index)}
          label={label}
          active={active}
          onSelect={() => clickable && goToStep(n)}
          className={cn(
            'aria-disabled:cursor-not-allowed',
            done && 'text-foreground',
          )}
        />
      ))}
    </Rail>
  );
};

export { BookingStepperMobile, BookingStepperRail };
