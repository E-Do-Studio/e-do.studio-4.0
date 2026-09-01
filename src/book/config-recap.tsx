import type { TFunction } from 'i18next';
import { useT } from '../i18n/use-t';
import type {
  BookingSession,
  ConfigGlobal,
  Lang,
  Recommendation,
} from '../lib/booking-engine';
import { BOOK_PLATEAUX, recommendSession } from '../lib/booking-engine';
import { PRODUCTS, catLabel, findEntry } from './catalog';
import { ordinal } from '@/lib/format';
import { MonoLabel } from '../ui/mono-label';

interface ConfigRecapProps {
  lang: Lang;
  sessions: BookingSession[];
  global: ConfigGlobal;
}

/** Durée recommandée, en heures sous deux jours et en journées au-delà. */
function durationLabel(t: TFunction, rec: Recommendation): string {
  if (rec.onRequest) return t('booking.onRequestLower');
  const totalHours = rec.estimatedHours || rec.hours || 0;
  if (totalHours <= 16) return `${totalHours}h`;
  const days = Math.floor(totalHours / 8);
  const extra = totalHours - days * 8;
  const unit = t('booking.dayUnit', { count: days });
  return extra > 0
    ? `${days} ${unit} ${t('booking.andConjunction')} ${extra}h (${totalHours}h)`
    : `${days} ${unit} (${totalHours}h)`;
}

/** « 12 produits », « 36 images », « cadence estimée » — selon ce qui est renseigné. */
function sessionSummary(t: TFunction, s: BookingSession, cadence?: number) {
  const parts: string[] = [];
  if (s.projectType !== 'cyclorama') {
    parts.push(`${s.quantity} ${t('booking.products')}`);
    const views = Number(s.viewsCount) || (s.views || []).length || 0;
    const images = (Number(s.quantity) || 0) * views;
    if (images > 0) parts.push(`${images} ${t('booking.images')}`);
  }
  if (cadence) parts.push(t('booking.cadenceEstimate', { count: cadence }));
  return parts;
}

/**
 * Récapitulatif de la recommandation, sous le configurateur. Rendu seulement
 * quand toutes les sessions sont exploitables.
 */
const ConfigRecap = ({ lang, sessions, global }: ConfigRecapProps) => {
  const t = useT();
  return (
    <div className="dark shrink-0 bg-background text-foreground">
      <div className="flex flex-col md:flex-row md:items-stretch border-b border-border">
        <MonoLabel
          tone="primary"
          className="px-pad-cell py-2 flex-1 min-w-0 md:self-center md:pr-3"
        >
          {t('booking.recapRecommendation')}
        </MonoLabel>
        <MonoLabel
          tone="muted"
          className="px-pad-cell py-2 border-t border-border md:border-t-0 md:self-center md:w-1/2 md:border-l md:border-border"
        >
          {t('booking.estimateTweakable')}
        </MonoLabel>
      </div>
      {sessions.map((session, i) => {
        const rec = recommendSession(session, global);
        const px =
          BOOK_PLATEAUX.find((x) => x.k === rec.plateau) || BOOK_PLATEAUX[0];
        const productLabel =
          session.projectType === 'cyclorama'
            ? t('booking.cyclorama')
            : catLabel(t, findEntry(PRODUCTS, session.product));
        return (
          <div
            // Une session n'a pas d'identité propre : c'est son rang dans le
            // configurateur qui la désigne, y compris dans les slotId.
            // biome-ignore lint/suspicious/noArrayIndexKey: session identifiée par son rang
            key={i}
            className="px-pad-cell py-2 border-b border-border grid grid-cols-[auto_minmax(0,1fr)] gap-3 md:gap-5 items-baseline"
          >
            <MonoLabel tone="muted">{ordinal(i)}</MonoLabel>
            <div>
              <div className="mb-px flex items-baseline gap-2 text-sm font-normal tracking-tight">
                <span>{px[lang]}</span>
                <span className="text-muted-foreground text-xs">
                  {durationLabel(t, rec)}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-xs tracking-wide text-muted-foreground">
                {[productLabel, ...sessionSummary(t, session, rec.cadence)]
                  .filter(Boolean)
                  .map((part) => (
                    <span key={part}>{part}</span>
                  ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { ConfigRecap };
export type { ConfigRecapProps };
