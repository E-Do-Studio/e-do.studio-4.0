import { Checkbox } from '@/components/ui/checkbox';
import type { Dispatch, SetStateAction } from 'react';
import { useT } from '../../i18n/use-t';
import type {
  BookPlateau,
  BookingSession,
  Lang,
  TeamState,
} from '../../lib/booking-engine';
import { EQUIPE, fmtEUR, recommendSession } from '../../lib/booking-engine';
import { StatusBadge } from '@/ui/status-badge';
import { Price } from '@/ui/price';

interface StepTeamProps {
  lang: Lang;
  plateau: BookPlateau;
  team: TeamState;
  setTeam: Dispatch<SetStateAction<TeamState>>;
  configSessions: BookingSession[];
}

/**
 * Bascule d'un poste. Un `<span onClick>` dans un `<label>` sans contrôle :
 * ni focusable, ni annoncé. C'est un bouton à état, la case n'est plus qu'un
 * décor.
 */
const TeamToggle = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => (
  // Un libellé et une case : c'est une case à cocher, pas un bouton qui en
  // dessine une. La version précédente peignait un carré de 22px en `border-2`
  // avec un « ✓ » typographique — une troisième géométrie de case, et une
  // graisse `font-bold` que la fonte ne livre pas.
  <label className="flex shrink-0 cursor-pointer items-center gap-2.5">
    <span className={active ? 'text-primary' : 'text-muted-foreground'}>
      {label}
    </span>
    <Checkbox checked={active} onCheckedChange={onClick} />
  </label>
);

const StepTeam = ({
  lang,
  plateau: p,
  team,
  setTeam,
  configSessions,
}: StepTeamProps) => {
  const t = useT();

  const toggle = (k: string, next: number | boolean | null) =>
    setTeam((prev) => {
      const n = { ...prev };
      if (next === null) delete n[k];
      else n[k] = next;
      return n;
    });

  const plateauSessions = (configSessions || []).filter(
    (s) => recommendSession(s, {}).plateau === p.k,
  );
  const hasPackshot = plateauSessions.some((s) => s.method === 'packshot');
  const hasNonPackshot =
    plateauSessions.length === 0 ||
    plateauSessions.some((s) => s.method !== 'packshot');
  const items = EQUIPE.filter((e) => {
    if (e.k === 'styliste_op') return hasPackshot;
    if (e.k === 'operateur') return hasNonPackshot;
    return true;
  });

  const recommended: Record<string, boolean> = {
    styliste_op: plateauSessions.some(
      (s) =>
        s.product === 'pap' &&
        s.method === 'packshot' &&
        s.submethod === 'pique',
    ),
    plateau: plateauSessions.some((s) => s.method === 'onmodel'),
  };

  return (
    // Aucun filet de fermeture : la séparation d'avec le plateau suivant est
    // posée par `MultiPlateauStep`, et celle d'avec la barre d'actions par la
    // barre elle-même.
    <div className="flex flex-col gap-px bg-border">
      {items.map((e) => {
        const isHourly = e.unit === 'hour';
        const active = isHourly
          ? Number(team[e.k] || 0) > 0
          : team[e.k] === true;
        return (
          <div
            key={e.k}
            className="bg-background px-pad-cell py-4 flex items-center justify-between gap-5"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-2 text-sm tracking-tight">
                <span>{e[lang]}</span>
                {/* `muted` et non `outline` : la recommandation ANNOTE le métier,
                    elle ne le concurrence pas. En contour, la pastille cernait
                    de noir un libellé mono capitale à côté d'un titre de 14px en
                    bas-de-casse — c'est elle que l'œil lisait en premier, et le
                    métier passait pour sa légende. */}
                {recommended[e.k] && (
                  <StatusBadge tone="muted">
                    {t('booking.recommended')}
                  </StatusBadge>
                )}
              </div>
              {/* Le tarif est un PRIX, donc `Price` : il s'écrivait
                  `font-mono text-xs text-muted-foreground`, c'est-à-dire au
                  registre d'une mention — alors que c'est sur lui que se prend
                  la décision d'ajouter le poste. Il y perdait aussi
                  `tabular-nums`, que `Price` tient pour non négociable.
                  L'unité passe par la prop prévue et s'écrit en toutes lettres :
                  « / h » était un symbole et une abréviation pour deux mots. */}
              {isHourly ? (
                <Price
                  size="sm"
                  value={`${fmtEUR(e.price)} €`}
                  unit={t('booking.perHour')}
                />
              ) : (
                <span className="text-xs leading-normal text-muted-foreground">
                  {t('booking.rateOnRequestBasedOn')}
                </span>
              )}
            </div>
            <TeamToggle
              active={active}
              label={
                isHourly
                  ? active
                    ? t('booking.included')
                    : t('booking.add')
                  : t('common.onRequest')
              }
              onClick={() =>
                isHourly
                  ? toggle(e.k, active ? null : 1)
                  : toggle(e.k, active ? null : true)
              }
            />
          </div>
        );
      })}
    </div>
  );
};

export { StepTeam };
export type { StepTeamProps };
