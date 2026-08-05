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

const SECTION_LABEL =
  'font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground';

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

const QuoteLine = ({
  row,
  lang,
  onRequestLabel,
}: {
  row: QuoteRow;
  lang: Lang;
  onRequestLabel: string;
}) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex justify-between items-baseline gap-2 text-xs">
      <span className="tracking-tight text-muted-foreground">{row.lbl}</span>
      <span className="font-mono tabular-nums text-foreground whitespace-nowrap">
        {row.onReq ? onRequestLabel : `${fmtEUR(row.amt)} €`}
      </span>
    </div>
    {row.breakdown && row.breakdown.length > 0 && (
      <div className="pl-0.5 flex flex-col gap-px">
        {row.breakdown.map((b: QuoteBreakdown, bi: number) => {
          const formula =
            b.imagesPerSku && b.imagesPerSku > 1
              ? `${b.qty} × ${b.imagesPerSku} × ${fmtEUR(b.unit)} €`
              : `${b.qty} × ${fmtEUR(b.unit)} €`;
          const viewLbl = b.labels ? b.labels[lang] : null;
          return (
            <div
              // Les lignes de détail n'ont pas d'identité propre.
              // biome-ignore lint/suspicious/noArrayIndexKey: ligne de calcul sans clé
              key={bi}
              className="flex justify-between gap-2 font-mono text-xs text-muted-foreground tracking-wide"
            >
              <span>→ {viewLbl ? `${viewLbl} · ${formula}` : formula}</span>
              <span className="tabular-nums">{fmtEUR(b.subtotal)} €</span>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

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
  const datedSlots = buildSlotLabels(list, slots, lang)
    .map(({ id, label }) => ({ id, label, date: slots[id]?.date }))
    .filter((x) => x.date);

  return (
    <div className="dark flex min-h-0 flex-col gap-4 overflow-auto bg-background px-5 py-6 text-foreground md:col-start-4 md:row-start-2 md:gap-3.5 md:p-6">
      <div>
        {/* Plus de `md:hidden` : la cellule d'en-tête qui portait ce libellé
            au-dessus de `md` a disparu avec la colonne qu'elle occupait. */}
        <span className={SECTION_LABEL}>{t('booking.yourQuote')}</span>
        <h2 className="m-0 mt-2 md:mt-0 text-2xl font-light tracking-tight text-muted-foreground">
          {isPreview ? t('booking.estimate') : p[lang]}
        </h2>
        <div className="font-mono text-xs text-muted-foreground mt-1 tracking-wide">
          {isPreview
            ? t('booking.liveEstimate')
            : durationLabel(t, p, slotType, hours, cycloMode)}
        </div>
      </div>

      {list.length > 1
        ? datedSlots.length > 0 && (
            <div className="pt-3.5 border-t border-border">
              <span className={`${SECTION_LABEL} mb-1.5 block`}>
                {t('booking.dates')}
              </span>
              <div className="flex flex-col gap-1.5">
                {datedSlots.map(({ id, label, date }) => (
                  <div
                    key={id}
                    className="flex justify-between items-baseline gap-2 text-sm"
                  >
                    <span className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
                      {label}
                    </span>
                    <span className="tracking-tight">
                      {date?.d} {months[date?.m ?? 0]} {date?.y}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        : selected && (
            <div className="pt-3.5 border-t border-border">
              <span className={`${SECTION_LABEL} mb-1.5 block`}>
                {t('booking.date')}
              </span>
              <div className="text-base tracking-tight">
                {selected.d} {months[selected.m]} {selected.y}
              </div>
            </div>
          )}

      <div className="pt-3.5 border-t border-border flex-1 min-h-0 flex flex-col">
        <span className={`${SECTION_LABEL} mb-2.5 block`}>
          {t('booking.breakdown')}
        </span>
        <div className="flex flex-col gap-1.5 overflow-auto pr-1">
          {rows.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {rows.map((r, i) => (
            <QuoteLine
              // Une ligne de devis n'a pas d'identifiant : son libellé peut se
              // répéter d'un plateau à l'autre, seul le rang la distingue.
              // biome-ignore lint/suspicious/noArrayIndexKey: ligne de devis sans clé
              key={i}
              row={r}
              lang={lang}
              onRequestLabel={t('booking.onRequestLower')}
            />
          ))}
        </div>
      </div>

      <div className="pt-3.5 border-t border-border">
        <div className="flex justify-between items-baseline">
          <span className="font-mono text-xs tracking-wider uppercase text-muted-foreground">
            {t('booking.totalExVat')}
          </span>
          <span className="text-3xl font-light tracking-tight tabular-nums">
            {fmtEUR(total)} €
          </span>
        </div>
        <div className="font-mono text-xs text-muted-foreground mt-1 tracking-wider">
          {t('booking.vatLine', { amount: fmtEUR(total * 1.2) })}
        </div>
        {rows.some((r) => r.estimate) && (
          <div className="font-mono text-xs text-muted-foreground mt-1.5 tracking-wide leading-normal">
            {t('booking.postProductionPriceIsAn')}
          </div>
        )}
      </div>
    </div>
  );
};

export { BookingSidePanel };
export type { BookingSidePanelProps };
