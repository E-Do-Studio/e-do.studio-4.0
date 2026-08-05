import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Dispatch, SetStateAction } from 'react';
import { useT } from '../../i18n/use-t';
import type {
  BookPlateau,
  BookingSession,
  Lang,
  TeamState,
} from '../../lib/booking-engine';
import { EQUIPE, fmtEUR, recommendSession } from '../../lib/booking-engine';

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
  <Button
    type="button"
    variant="ghost"
    aria-pressed={active}
    onClick={onClick}
    className="h-auto shrink-0 gap-2.5 px-0 tracking-wider hover:bg-transparent"
  >
    <span className={active ? 'text-primary' : 'text-muted-foreground'}>
      {label}
    </span>
    <span
      aria-hidden
      className={cn(
        'w-5.5 h-5.5 border-2 inline-flex items-center justify-center text-primary-foreground text-sm font-bold',
        active ? 'border-primary bg-primary' : 'border-input bg-background',
      )}
    >
      {active ? '✓' : ''}
    </span>
  </Button>
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
    <div className="px-5 md:px-12 pb-6">
      <div className="flex flex-col gap-px bg-border">
        {items.map((e) => {
          const isHourly = e.unit === 'hour';
          const active = isHourly
            ? Number(team[e.k] || 0) > 0
            : team[e.k] === true;
          return (
            <div
              key={e.k}
              className="bg-background px-5 py-4 flex items-center justify-between gap-5"
            >
              <div>
                <div className="text-sm font-medium tracking-tight flex items-center gap-2">
                  <span>{e[lang]}</span>
                  {recommended[e.k] && (
                    <span className="font-mono text-xs tracking-wider uppercase text-primary border border-primary px-1.5 py-0.5 leading-none">
                      {t('booking.recommended')}
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-muted-foreground mt-0.5">
                  {isHourly
                    ? `${fmtEUR(e.price)} € / h`
                    : t('booking.rateOnRequestBasedOn')}
                </div>
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
    </div>
  );
};

export { StepTeam };
export type { StepTeamProps };
