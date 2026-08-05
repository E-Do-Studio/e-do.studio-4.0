import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../i18n/use-t';
import type { BookingSession } from '../../lib/booking-engine';
import { isSessionValid } from '../../lib/booking-engine';
import { PRODUCTS, catLabel, findEntry } from '../catalog';

interface SessionTabsProps {
  sessions: BookingSession[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}

/**
 * Onglets des sessions produit d'un même projet. Ne s'affiche qu'à partir de
 * deux : à une seule, le configurateur est déjà la session.
 *
 * Une session n'a pas d'identifiant — c'est son rang qui la désigne, jusque
 * dans les `slotId` que l'ensemencement produit.
 */
const SessionTabs = ({
  sessions,
  activeIdx,
  onSelect,
  onAdd,
  onRemove,
}: SessionTabsProps) => {
  const t = useT();
  return (
    <>
      <div className="px-6 pt-3.5 pb-1 flex items-baseline justify-between gap-4 flex-wrap">
        <span className="font-mono text-xs font-normal uppercase tracking-widest text-primary">
          {t('booking.productSessions')} — {sessions.length}
        </span>
        <Button
          type="button"
          onClick={onAdd}
          variant="outline"
          className="h-8 gap-2 px-3.5 py-2 tracking-widest"
        >
          + {t('booking.addASession')}
        </Button>
      </div>
      <div
        className="grid gap-px bg-border border-t border-b border-border"
        style={{
          gridTemplateColumns: `repeat(${sessions.length}, minmax(0,1fr))`,
        }}
      >
        {sessions.map((s, i) => {
          const isActive = i === activeIdx;
          const label =
            s.projectType === 'cyclorama'
              ? t('booking.cyclorama')
              : catLabel(t, findEntry(PRODUCTS, s.product)) ||
                t('booking.toDefine');
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: session identifiée par son rang
              key={i}
              className={cn(
                'relative min-w-0',
                isActive ? 'dark bg-background' : 'bg-background',
              )}
            >
              <Button
                type="button"
                variant="cell"
                size="cell"
                aria-pressed={isActive}
                onClick={() => onSelect(i)}
                className="w-full gap-1 bg-transparent px-3.5 py-3 pr-9 hover:bg-transparent"
              >
                <span
                  className={cn(
                    'font-mono text-xs tracking-widest',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {t('booking.session')} {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-normal tracking-tight">
                  {label}
                </span>
                <span className="font-mono text-xs tracking-wide text-muted-foreground">
                  {isSessionValid(s)
                    ? s.projectType === 'cyclorama'
                      ? t('booking.onRequestLower')
                      : `${s.quantity} ${t('booking.products')}`
                    : t('booking.incomplete')}
                </span>
              </Button>
              {/* Hors de l'onglet, pas dedans : un bouton dans un bouton n'est
                  ni du HTML valide ni atteignable au clavier. */}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(i)}
                aria-label={`${t('booking.remove')} — ${t('booking.session')} ${String(i + 1).padStart(2, '0')}`}
                title={t('booking.remove')}
                className="absolute right-2 top-2.5 text-sm leading-none text-muted-foreground"
              >
                ×
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
};

export { SessionTabs };
export type { SessionTabsProps };
