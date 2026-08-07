import { useT } from '../i18n/use-t';
import type {
  BookPlateau,
  DateSelection,
  Lang,
  QuoteBreakdown,
  QuoteRow,
  SlotState,
} from '../lib/booking-engine';
import { fmtEUR } from '../lib/booking-engine';
import { buildSlotLabels } from './slot-labels';
import { MonoLabel } from '../ui/mono-label';
import { KeyValueList, KeyValueRow } from '../ui/key-value-row';
import { QuoteTable, type QuoteRow as QuoteTableRow } from '../ui/quote-table';

interface BookingSidePanelProps {
  lang: Lang;
  plateau: BookPlateau;
  selected: DateSelection | null;
  months: string[];
  slotType: string;
  hours: number;
  cycloMode: string;
  rows: QuoteRow[];
  total: number;
  /** Le configurateur pilote encore l'estimation : montants indicatifs. */
  isPreview: boolean;
  slotIds: string[];
  slots: Record<string, SlotState>;
}

/** Durée du créneau, en abrégé, pour le sous-titre du panneau. */
function durationLabel(
  t: ReturnType<typeof useT>,
  p: BookPlateau,
  slotType: string,
  hours: number,
  cycloMode: string,
): string {
  if (p.isCyclo) {
    if (cycloMode === 'halfH') return '5h';
    if (cycloMode === 'fullH') return '10h';
    return t('booking.cyclo10hEditorial');
  }
  if (p.isVisite) return t('booking.visit2');
  if (slotType === 'hour') return `${hours}h`;
  if (slotType === 'half') {
    const hh = Math.max(4, Math.min(7, hours || 4));
    return hh === 4 ? t('booking.halfDayAbbrev') : `${hh}h`;
  }
  const totalH = hours || 8;
  const fullDays = Math.floor(totalH / 8);
  const extraH = totalH - fullDays * 8;
  let label = `${fullDays} ${t('booking.dayAbbrev')}`;
  if (extraH === 4) label += t('booking.plusHalfDayAbbrev');
  else if (extraH > 0) label += ` + ${extraH}h`;
  return label;
}

/**
 * Les lignes du devis, dans la forme que `QuoteTable` attend.
 *
 * Le panneau redessinait ses lignes, son détail de calcul et son total à la
 * main alors qu'il est la cible DÉCLARÉE de `variant="panel"` — le composant
 * était écrit pour lui et branché partout ailleurs. Ne reste ici que la
 * conversion : le moteur de devis parle en nombres, la table en chaînes déjà
 * formatées.
 */
function toQuoteRows(
  rows: QuoteRow[],
  lang: Lang,
  onRequestLabel: string,
): QuoteTableRow[] {
  return rows.map((row) => ({
    label: row.lbl,
    value: row.onReq ? onRequestLabel : `${fmtEUR(row.amt)} €`,
    breakdown: row.breakdown?.map((b: QuoteBreakdown) => {
      const formula =
        b.imagesPerSku && b.imagesPerSku > 1
          ? `${b.qty} × ${b.imagesPerSku} × ${fmtEUR(b.unit)} €`
          : `${b.qty} × ${fmtEUR(b.unit)} €`;
      const viewLbl = b.labels ? b.labels[lang] : null;
      return {
        text: viewLbl ? `${viewLbl} ${formula}` : formula,
        value: `${fmtEUR(b.subtotal)} €`,
      };
    }),
  }));
}

const BookingSidePanel = ({
  lang,
  plateau: p,
  selected,
  months,
  slotType,
  hours,
  cycloMode,
  rows,
  total,
  isPreview,
  slotIds,
  slots,
}: BookingSidePanelProps) => {
  const t = useT();
  const list = (slotIds || []).filter(Boolean);
  const isMulti = list.length > 1;
  const datedSlots = buildSlotLabels(list, slots, lang)
    .map(({ id, label }) => ({ id, label, date: slots[id]?.date }))
    .filter((x) => x.date);

  return (
    // `<aside>` : c'est bien un complément du formulaire, et le repère
    // manquait. Le total se recalcule à chaque choix sans que rien ne
    // l'annonce — voir la région live posée dessus plus bas.
    <aside
      aria-label={t('booking.yourQuote')}
      // Le panneau ne prend sa colonne que là où la place existe pour deux ;
      // sous le palier il passe sous le contenu, comme en mobile. Ce seuil
      // valait `lg` quand la coquille du tunnel montait à `md` — il fallait le
      // décaler d'un cran pour ne pas écraser la colonne de contenu. Les deux
      // sont maintenant le même palier.
      className="dark flex min-h-0 flex-col gap-4 overflow-auto bg-background px-5 py-6 text-foreground app:col-start-4 app:row-start-2 app:gap-3.5 app:p-6"
    >
      <div>
        {/* Plus de `md:hidden` : la cellule d'en-tête qui portait ce libellé
            au-dessus de `md` a disparu avec la colonne qu'elle occupait. */}
        <MonoLabel tone="muted">{t('booking.yourQuote')}</MonoLabel>
        {/* En multi-plateau, cet en-tête décrivait UN plateau qui n'existe pas.
            `p` valait l'objet sentinelle — donc un titre vide — et
            `durationLabel` lisait `slotType`/`hours`, l'état global résiduel du
            dernier plateau manipulé. D'où le « 3h » affiché au-dessus d'un
            détail qui comptait 9h et 4h. Le nombre de plateaux, lui, est vrai. */}
        <h2 className="m-0 mt-2 text-2xl font-light tracking-tight text-muted-foreground app:mt-0">
          {isPreview
            ? t('booking.estimate')
            : isMulti
              ? t('booking.stagesCount', { count: list.length })
              : p[lang]}
        </h2>
        {(isPreview || !isMulti) && (
          <div className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
            {isPreview
              ? t('booking.liveEstimate')
              : durationLabel(t, p, slotType, hours, cycloMode)}
          </div>
        )}
      </div>

      {isMulti
        ? datedSlots.length > 0 && (
            // `rule={false}` : le bloc porte déjà son filet en tête, et une
            // liste de deux ou trois dates n'a pas à se rayer.
            <KeyValueList
              pad="none"
              heading={t('booking.dates')}
              className="pt-3.5 border-t border-border"
            >
              {datedSlots.map(({ id, label, date }) => (
                <KeyValueRow
                  key={id}
                  rule={false}
                  label={label}
                  value={
                    <span className="tracking-tight">
                      {date?.d} {months[date?.m ?? 0]} {date?.y}
                    </span>
                  }
                />
              ))}
            </KeyValueList>
          )
        : selected && (
            <div className="pt-3.5 border-t border-border">
              <MonoLabel tone="muted" className="mb-1.5 block">
                {t('booking.date')}
              </MonoLabel>
              <div className="text-base tracking-tight">
                {selected.d} {months[selected.m]} {selected.y}
              </div>
            </div>
          )}

      {/* Plus de défilement imbriqué ici : le `<aside>` en porte déjà un, et
          deux molettes emboîtées faisaient qu'un détail long se lisait dans une
          fenêtre de quelques lignes au milieu d'un panneau, lui aussi
          défilant. Le total suit maintenant le contenu, comme sur la page de
          confirmation. */}
      <div className="pt-3.5 border-t border-border flex-1 min-h-0 flex flex-col">
        <MonoLabel tone="muted" className="mb-2.5 block">
          {t('booking.breakdown')}
        </MonoLabel>
        {rows.length === 0 && (
          <span className="mb-1.5 text-xs leading-normal text-muted-foreground">
            {t('booking.quoteEmpty')}
          </span>
        )}
        <QuoteTable
          variant="panel"
          totalLive
          rows={toQuoteRows(rows, lang, t('booking.onRequestLower'))}
          totalLabel={t('booking.totalExVat')}
          total={`${fmtEUR(total)} €`}
          disclaimer={
            <>
              <span className="font-mono text-xs tracking-wider text-muted-foreground">
                {t('booking.vatLine', { amount: fmtEUR(total * 1.2) })}
              </span>
              {rows.some((r) => r.estimate) && (
                <span className="font-mono text-xs leading-normal tracking-wide text-muted-foreground">
                  {t('booking.postProductionPriceIsAn')}
                </span>
              )}
            </>
          }
        />
      </div>
    </aside>
  );
};

export { BookingSidePanel };
export type { BookingSidePanelProps };
