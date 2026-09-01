import { Button } from '@/components/ui/button';
import { SegmentGroup } from '@/ui/segment-group';
import { SelectTile } from '@/ui/select-tile';
import { RailHeader } from '@/ui/rail-cell';
import { cn } from '@/lib/utils';
import { useT } from '../../i18n/use-t';
import type { BookingSession } from '../../lib/booking-engine';
import { isSessionValid } from '../../lib/booking-engine';
import { PRODUCTS, catLabel, findEntry } from '../catalog';
import { ordinal } from '@/lib/format';

interface SessionTabsProps {
  sessions: BookingSession[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  onRemove: (idx: number) => void;
}

/**
 * Onglets des sessions produit d'un même projet. Ne s'affiche qu'à partir de
 * deux : à une seule, le configurateur est déjà la session.
 *
 * Une session n'a pas d'identifiant — c'est son rang qui la désigne, jusque
 * dans les `slotId` que l'ensemencement produit.
 *
 * Pas de bouton « ajouter » ici : il vit sous la dernière question, où sa
 * condition (la session courante est utilisable, et c'est la dernière) a un
 * sens. Cet en-tête ne la connaît pas et proposait donc d'ajouter une session
 * pendant qu'on remplissait la précédente.
 */
const SessionTabs = ({
  sessions,
  activeIdx,
  onSelect,
  onRemove,
}: SessionTabsProps) => {
  const t = useT();
  return (
    <>
      {/* Le compte a disparu du libellé : les onglets sont sous les yeux, et
          « Sessions produit — 2 » enchaînait deux valeurs sur une ligne, ce que
          le dépôt proscrit. */}
      <RailHeader label={t('booking.productSessions')} pad="cell" />
      {/* `SegmentGroup` et non une grille : le nombre de sessions varie, et un
          `gridTemplateColumns` en style inline ne se surcharge pas au point
          d'arrêt. `flex-1` sur chaque onglet leur donne des parts égales sans
          que le conteneur ait à les compter — le stepper mobile a fait la même
          correction. Le groupe apporte au passage le `role="group"` et le nom
          accessible qui manquaient. */}
      <SegmentGroup
        label={t('booking.productSessions')}
        className="border-b border-border"
      >
        {sessions.map((s, i) => {
          const isActive = i === activeIdx;
          const label =
            s.projectType === 'cyclorama'
              ? t('booking.cyclorama')
              : catLabel(t, findEntry(PRODUCTS, s.product)) ||
                t('booking.toDefine');
          return (
            // La portée `dark` est portée par le wrapper et non par la tuile :
            // le « retirer » est son FRÈRE — un bouton dans un bouton n'est ni
            // du HTML valide ni atteignable au clavier — et il doit hériter de
            // l'inversion, pas la subir. `bg-transparent` sur la tuile pour que
            // ce soit le fond du wrapper qui apparaisse.
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: session identifiée par son rang
              key={i}
              className={cn(
                'relative min-w-0 flex-1 bg-background',
                isActive && 'dark',
              )}
            >
              {/* Une session est un choix exclusif parmi N, présenté en tuiles
                  côte à côte : c'est `SelectTile`, et son `sub` porte l'état.
                  L'onglet réécrivait cette pile à la main — un rang mono, un nom
                  en `text-sm`, un état mono — et y perdait le `break-words` du
                  titre comme le `lines="multi"` du sous-titre. */}
              <SelectTile
                size="sm"
                number={ordinal(i)}
                title={label}
                sub={
                  isSessionValid(s)
                    ? s.projectType === 'cyclorama'
                      ? t('booking.onRequestLower')
                      : `${s.quantity} ${t('booking.products')}`
                    : t('booking.incomplete')
                }
                selected={isActive}
                onSelect={() => onSelect(i)}
                className="bg-transparent pr-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(i)}
                aria-label={`${t('booking.remove')} — ${t('booking.session')} ${ordinal(i)}`}
                title={t('booking.remove')}
                className="absolute right-2 top-2.5 text-sm leading-none text-muted-foreground"
              >
                ×
              </Button>
            </div>
          );
        })}
      </SegmentGroup>
    </>
  );
};

export { SessionTabs };
export type { SessionTabsProps };
