import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../i18n/use-t';
import { isHourBlocked, useAvailability } from '../../lib/availability';
import type { BookPlateau, DateSelection } from '../../lib/booking-engine';
import {
  STUDIO_CLOSE,
  STUDIO_OPEN,
  useArrivalHourGuard,
  useFirstFreeDay,
} from './use-calendar-defaults';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { hourLabel } from '@/lib/format';
import { SegmentGroup, SegmentItem } from '@/ui/segment-group';
import { MonoLabel, monoLabelVariants } from '../../ui/mono-label';
import { StepHeading } from '@/ui/step-heading';
import { StepBand } from '@/ui/step-band';

interface StepDateProps {
  /**
   * Bande de contexte du tunnel multi-plateau — « Plateau · Eclipse » et les
   * pastilles de navigation.
   *
   * Elle est passée plutôt que rendue par `book-page` autour de cette étape :
   * l'ordre de lecture va de l'étape au plateau, pas l'inverse. C'est le même
   * mécanisme que `topBanner` de `MultiPlateauStep`.
   */
  contextBanner?: ReactNode;
  plateau: BookPlateau | undefined;
  viewY: number;
  viewM: number;
  months: string[];
  days: string[];
  /** Cases du mois affiché, `null` pour le remplissage avant le 1er. */
  calCells: (number | null)[];
  selected: DateSelection | null;
  setSelected: (date: DateSelection) => void;
  arrivalHour: number;
  setArrivalHour: (hour: number) => void;
  /** Heures à trouver libres sur une même journée (≠ heures facturées). */
  rentalHours: number;
  isPast: (day: number | null) => boolean;
  nextMonth: () => void;
  prevMonth: () => void;
  /** Incrémenté après un 409 pour court-circuiter le cache d'availability. */
  refreshKey?: number;
}

// Les pastilles de la légende. Aucune teinte inventée : la palette du site est
// noir, blanc, orange. Le beige « sable » y était une pièce rapportée, et il
// n'avait rien à dire — un jour partiel n'est ni un avertissement ni une marque
// de chaleur.
//
//   partiel      gris uni très clair — une nuance, pas un blocage
//   indisponible hachuré — la seule marque qui se voit de loin
//
// Deux tons, parce que la légende n'a que deux entrées. `free` et `selected` y
// figuraient sans qu'aucun appelant ne les demande : une pastille pour l'état
// par défaut et une pour la case qu'on vient soi-même de cliquer.
const legendSwatchVariants = cva('inline-block size-2.5 border', {
  variants: {
    tone: {
      partial: 'border-border bg-muted',
      unavailable: 'stripes border-border bg-background',
    },
  },
});

const StepDate = ({
  contextBanner,
  plateau,
  viewY,
  viewM,
  months,
  days,
  calCells,
  selected,
  setSelected,
  arrivalHour,
  setArrivalHour,
  rentalHours,
  isPast,
  nextMonth,
  prevMonth,
  refreshKey = 0,
}: StepDateProps) => {
  const t = useT();
  const {
    availMap,
    bookedHoursMap,
    loading: availLoading,
  } = useAvailability(plateau?.k, viewY, viewM, rentalHours, refreshKey);

  const now = new Date();
  const today = {
    y: now.getFullYear(),
    m: now.getMonth(),
    d: now.getDate(),
  };
  const currentHour = now.getHours();

  const isSelected = (d: number) =>
    !!selected &&
    selected.y === viewY &&
    selected.m === viewM &&
    selected.d === d;
  const isToday = (d: number) =>
    viewY === today.y && viewM === today.m && d === today.d;
  const isSelectedToday =
    !!selected &&
    selected.y === today.y &&
    selected.m === today.m &&
    selected.d === today.d;
  const selectedDayBooked = selected ? bookedHoursMap[selected.d] : undefined;

  useArrivalHourGuard({
    selected,
    bookedHours: selectedDayBooked,
    isSelectedToday,
    currentHour,
    arrivalHour,
    rentalHours,
    setArrivalHour,
  });
  useFirstFreeDay({
    selected,
    availLoading,
    availMap,
    bookedHoursMap,
    viewY,
    viewM,
    today,
    currentHour,
    rentalHours,
    setSelected,
  });

  return (
    // `min-h-full` + `flex-col` : la colonne du tunnel est plus haute que ce
    // calendrier, et l'espace restant tombait en blanc sous la grille des
    // heures. C'est la grille des JOURS qui le récupère — voir `flex-1` plus
    // bas. `min-h` et non `h` : sur mobile le contenu dépasse et doit défiler.
    <div className="flex min-h-full flex-col">
      {/* Pas de `sticky` ici. À cette étape, `book-page` colle déjà sa bande
          « Plateau 01 / 03 — Eclipse 01 » au même `top-0` et au même `z-10` :
          les deux se superposaient, et c'est celui-ci — plus loin dans le DOM —
          qui gagnait. On ne voyait donc plus POUR QUEL plateau on choisissait
          une date, l'information la plus utile des deux. */}
      <StepBand>
        <StepHeading number="06" title={t('booking.pickADate')} />
      </StepBand>
      {contextBanner}

      {/* `border-b` : le bloc du titre ne se fermait pas, et la ligne des jours
          n'ouvrait pas — aucun filet ne séparait « Août 2026 » de « L M M J V
          S D », dans une page qui coud tout le reste. */}
      {/* Le bandeau du mois ne porte plus QUE le mois et ses deux flèches.
          La légende y vivait à côté d'un titre de 30px, et s'en allait dès
          qu'elle se repliait : les deux flèches sont en `aspect-square`, donc
          leur largeur dépend de la hauteur de la bande, donc la bande fixe sa
          hauteur AVANT que la légende n'ait passé la ligne. Elle en sortait par
          le bas, par-dessus « L M M J V S D ». La retirer supprime la
          circularité au lieu de la contourner. */}
      <div className="flex min-w-0 shrink-0 gap-px border-b border-border bg-border">
        {/* `min-h-11` et `text-2xl` : 32px d'interligne plus `py-1.5` font
            exactement 44, c'est-à-dire un cran du rail voisin
            (`--spacing-rail-default`, la même mesure que `--spacing-tap`).
            En `text-3xl` avec `py-3` la bande faisait 60 — les filets du rail
            et ceux du tunnel se suivaient jusque-là et divergeaient ici. */}
        <div className="flex min-h-11 min-w-0 flex-1 items-center bg-background px-pad-cell py-1.5">
          <h2 className="m-0 shrink-0 text-2xl font-light tracking-tight">
            {months[viewM]}{' '}
            <span className="text-muted-foreground">{viewY}</span>
          </h2>
          {/* Les dispos arrivent en asynchrone : la grille passe silencieusement
              de « tout libre » à « partiellement bloqué », et l'annonce reste
              due. Elle ne se voit plus — ce que l'œil a, c'est l'atténuation de
              la grille elle-même (`opacity-60` plus bas) : le même signal, à
              l'endroit qui change. `sr-only` étant en position absolue, il ne
              compte pour rien dans la mise en page. */}
          <span role="status" aria-live="polite" className="sr-only">
            {availLoading ? t('booking.calLoading') : ''}
          </span>
        </div>
        <Button
          type="button"
          onClick={prevMonth}
          aria-label={t('booking.calPrevMonth')}
          variant="cell"
          // `h-auto` : `size="default"` impose `h-8`, et le conteneur fait la
          // hauteur du titre plus la légende. Le `bg-border` du parent — du noir
          // pur — transparaissait sous les deux boutons.
          // `aspect-square` sur un bouton que le flex étire déjà à la hauteur
          // de la bande : la largeur suit la hauteur, le carré est exact quelle
          // que soit la hauteur du titre et de la légende. Une largeur fixe
          // (`basis-14`) donnait un rectangle dès que la légende se repliait.
          className="aspect-square h-auto shrink-0 flex-row items-center justify-center [&_svg:not([class*='size-'])]:size-5"
        >
          <ArrowLeft />
        </Button>
        <Button
          type="button"
          onClick={nextMonth}
          aria-label={t('booking.calNextMonth')}
          variant="cell"
          // `aspect-square` sur un bouton que le flex étire déjà à la hauteur
          // de la bande : la largeur suit la hauteur, le carré est exact quelle
          // que soit la hauteur du titre et de la légende. Une largeur fixe
          // (`basis-14`) donnait un rectangle dès que la légende se repliait.
          className="aspect-square h-auto shrink-0 flex-row items-center justify-center [&_svg:not([class*='size-'])]:size-5"
        >
          <ArrowRight />
        </Button>
      </div>

      <div className="grid w-full shrink-0 grid-cols-7 border-b border-border">
        {days.map((d) => (
          <div
            key={d}
            className={cn(
              monoLabelVariants({ tone: 'muted' }),
              // Un cran du rail, comme les bandes au-dessus. `py-2.5` la
              // laissait à 32px : le seul filet du tunnel à ne tomber en face
              // de rien dans la colonne voisine.
              'flex min-h-11 items-center justify-center border-r border-border bg-muted last:border-r-0',
            )}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className={cn(
          // `flex-1` prend la hauteur restante, `auto-rows-fr` la répartit
          // également entre les six rangées. `min-h-14` sur chaque case reste
          // le plancher : sur un écran court, la grille défile au lieu de se
          // tasser.
          // Pas de `border-b` sur la grille : chaque case en porte déjà un,
          // y compris celles de la dernière rangée. Les deux se cumulaient en
          // un trait de 2px, deux fois plus épais que les filets internes.
          'grid w-full flex-1 auto-rows-fr grid-cols-7 transition-opacity duration-200',
          availLoading && 'opacity-60',
        )}
      >
        {calCells.map((d, i) => {
          if (d === null)
            return (
              <div
                // Les cases de remplissage n'ont que leur position pour identité.
                // biome-ignore lint/suspicious/noArrayIndexKey: cellule vide sans donnée
                key={`pad-${i}`}
                // `bg-background` et non `bg-muted` : le gris est le fond des
                // jours INDISPONIBLES. Un jour hors du mois n'est pas
                // indisponible, il n'existe pas — et l'absence de numéro suffit
                // à le distinguer d'un jour libre.
                className="min-h-14 border-r border-b border-border bg-background sm:min-h-18"
              />
            );
          const dow = new Date(viewY, viewM, d).getDay();
          const weekendBlocked = (dow === 0 || dow === 6) && rentalHours < 8;
          const av = weekendBlocked ? 'unavailable' : availMap[d] || 'free';
          const past = isPast(d);
          const sel = isSelected(d);
          const tdy = isToday(d);
          const partial =
            !sel &&
            !past &&
            av === 'free' &&
            !weekendBlocked &&
            (bookedHoursMap[d]?.size ?? 0) > 0;
          // Le nom accessible était le seul numéro du jour : « 14 », sans
          // mois, sans année, sans état. Et la raison d'un jour bloqué vivait
          // dans un `title` que personne ne pouvait atteindre — `disabled`
          // rend l'élément non focusable, et `disabled:pointer-events-none`
          // empêche même l'infobulle de s'afficher au survol. `aria-disabled`
          // garde la case dans l'ordre de tabulation, le clic est neutralisé
          // en JS, et la raison entre dans le nom.
          const blocked = past || av === 'unavailable';
          const dayReason = past
            ? t('booking.pastDay')
            : av === 'unavailable'
              ? t('booking.dayUnavailable')
              : weekendBlocked
                ? t('booking.weekendFullDayOnly')
                : partial
                  ? t('booking.calPartial')
                  : t('booking.freeLower');
          const dayLabel = [
            `${d} ${months[viewM]} ${viewY}`,
            dayReason,
            tdy ? t('booking.today') : '',
            sel ? t('booking.selectedDay') : '',
          ]
            .filter(Boolean)
            .join(' — ');
          return (
            <Button
              type="button"
              key={d}
              aria-disabled={blocked}
              aria-pressed={sel}
              aria-label={dayLabel}
              onClick={() => {
                if (blocked) return;
                setSelected({ y: viewY, m: viewM, d });
              }}
              className={cn(
                blocked && 'cursor-not-allowed',
                // `min-h` et non `aspect-[1.6]` : un ratio rend la hauteur
                // proportionnelle à la largeur. Dans la colonne du tunnel, une
                // case faisait 270px de large, donc 169px de haut, donc six
                // rangées de 1014px — un calendrier qu'on parcourt au lieu de
                // le lire d'un coup d'œil. Une case de calendrier a une hauteur
                // à elle, que sa largeur ne commande pas.
                'relative flex h-auto min-h-14 min-w-0 flex-col items-start justify-start border-r border-b border-border p-1.5 text-left normal-case tracking-normal sm:min-h-18 sm:p-2',
                sel
                  ? 'bg-primary text-primary-foreground hover:bg-primary/85'
                  : past || av === 'unavailable'
                    ? // `bg-background` explicite : `stripes` ne pose qu'un
                      // `background-image`, et ces cases n'ont pas de `variant`
                      // — elles héritent donc de `default`, dont le fond est
                      // `bg-primary`. L'orange transparaissait entre les traits.
                      'stripes bg-background text-muted-foreground/40'
                    : partial
                      ? 'bg-muted text-foreground hover:bg-input'
                      : 'bg-background text-foreground hover:bg-muted',
              )}
            >
              {/* L'échelle annonçait quatre graisses et n'en rendait que deux :
                  « aujourd'hui » et un jour ordinaire étaient tous les deux en
                  500, donc identiques. Il n'en reste que ce qui existe — gras
                  pour le jour choisi et pour aujourd'hui, normal pour le reste.
                  Le reste de la distinction est déjà porté par le fond. */}
              <span
                className={cn(
                  'text-sm sm:text-base tabular-nums leading-none',
                  // « aujourd'hui » se disait par un fond rosé, un chiffre
                  // orange ET une barre orange en bas : trois marques pour un
                  // repère qui n'est même pas une action. Il n'en reste que la
                  // graisse. L'orange est réservé au jour CHOISI — c'est la
                  // seule chose qu'on décide sur cet écran.
                  sel
                    ? 'font-bold text-primary-foreground'
                    : tdy
                      ? 'font-bold'
                      : 'font-normal',
                )}
              >
                {d}
              </span>

              {/* La case ne porte QUE son numéro.
                  
                  « partiel » et « journée » y étaient écrits en mono capitales
                  à fort interlettrage : environ 79px pour une case qui en fait
                  83 dans la colonne du tunnel à 960px. C'était la cause du
                  défilement horizontal — et, avec le fond, un second signal
                  pour une information que la légende porte déjà.
                  
                  Le nom accessible, lui, énonce tout (`dayLabel`). */}
            </Button>
          );
        })}
      </div>

      {/* La légende est une note de bas de grille, pas un en-tête : on ne la
          lit qu'après avoir vu une case hachurée, et jamais avant. Elle vaut
          donc la mesure d'une mention — une ligne fine sous le calendrier —
          et non celle d'un titre.
          Deux entrées, pas quatre : une case nue est ouverte, cela se devine
          par contraste avec les rayures ; la case orange est celle qu'on vient
          de cliquer soi-même. On ne nomme que ce qui ne se dit pas tout seul. */}
      <MonoLabel
        render={<div />}
        tone="muted"
        className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-background px-pad-cell py-1.5 opacity-60"
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={legendSwatchVariants({ tone: 'partial' })}
          />
          {t('booking.calPartialLegend')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={legendSwatchVariants({ tone: 'unavailable' })}
          />
          {t('booking.calUnavailableLegend')}
        </span>
      </MonoLabel>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-background px-pad-cell py-2.5 md:gap-5">
        {/* Le jour choisi, rappelé ici. La grille des heures vit sous le
            calendrier : dès qu'on y descend, le jour sélectionné sort du champ
            et on choisit une heure sans plus savoir pour quelle date.
            
            En premier parce que c'est le contexte, et non l'action : on lit
            « le 6 août, de 14:00 à 17:00 ». */}
        {selected && (
          <MonoLabel className="tabular-nums">
            {selected.d} {months[selected.m]}
          </MonoLabel>
        )}
        <MonoLabel tone="muted">{t('booking.arrivalTime')}</MonoLabel>
        {/* La plage et la durée sont des DONNÉES, pas des libellés : en mono
            capitales, « 8h » sortait en « 8H ». Seul l'intitulé reste un
            libellé. */}
        <span className="flex items-baseline gap-2.5 text-sm tabular-nums">
          <span>
            {hourLabel(arrivalHour)} → {hourLabel(arrivalHour + rentalHours)}
          </span>
          <span className="text-muted-foreground">{rentalHours}h</span>
        </span>
      </div>
      <SegmentGroup
        label={t('booking.arrivalTime')}
        layout="grid"
        // `bg-border` : la gouttière était peinte en blanc sur blanc, donc
        // invisible — rien ne séparait deux créneaux voisins. C'est le seul
        // endroit du site où elle ne peignait pas le filet.
        className="w-full shrink-0 grid-cols-5 bg-border @xl:grid-cols-10"
      >
        {Array.from(
          { length: STUDIO_CLOSE - STUDIO_OPEN },
          (_, i) => i + STUDIO_OPEN,
        ).map((h) => {
          const on = arrivalHour === h;
          const endsTooLate = h + rentalHours > STUDIO_CLOSE;
          const pastHour = isSelectedToday && h <= currentHour;
          const booked = isHourBlocked(selectedDayBooked, h, rentalHours);
          const disabled = endsTooLate || pastHour || booked;
          // Trois raisons distinctes, toutes bien écrites, toutes inatteignables
          // tant qu'elles vivaient dans un `title` sur un élément `disabled`.
          // Elles passent dans le nom accessible ; `line-through` cesse d'être
          // le seul indice qu'un créneau est déjà pris.
          const hourReason = booked
            ? t('booking.slotAlreadyBooked')
            : pastHour
              ? t('booking.pastTimeSlot')
              : endsTooLate
                ? t('booking.endsPastClosing', { hour: h + rentalHours })
                : '';
          const hourTitle = [hourLabel(h), hourReason]
            .filter(Boolean)
            .join(' — ');
          return (
            <SegmentItem
              key={h}
              selected={on}
              unavailable={disabled}
              label={hourTitle}
              onSelect={() => setArrivalHour(h)}
              className={cn(
                // Même correction que les cases du calendrier : `aspect-[1.5]`
                // rendait la hauteur proportionnelle à la largeur, soit 127px
                // par créneau sur dix colonnes. `SegmentItem` porte déjà
                // `min-h-tap` — c'est la bonne mesure, et elle ne dépend pas de
                // la largeur de la colonne.
                'min-w-0 px-0 tracking-wide',
                booked && 'line-through',
              )}
            >
              {hourLabel(h)}
            </SegmentItem>
          );
        })}
      </SegmentGroup>
    </div>
  );
};

export { StepDate };
export type { StepDateProps };
