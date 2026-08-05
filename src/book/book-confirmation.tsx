import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { usePageContext } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '../ui/page-header';
import { clearDraft } from '../lib/use-booking-draft';
import { useT } from '../i18n/use-t';
import {
  loadConfirmation,
  clearConfirmation,
  type ConfirmationSnapshot,
} from './confirmation-snapshot';
import type { Lang } from '../types';
import { MONTHS, bcp47, fmtEUR } from '../lib/format';

const fmtTime = (h: number) => `${String(h).padStart(2, '0')}:00`;

interface ConfirmedViewProps {
  lang: Lang;
  snapshot: ConfirmationSnapshot;
  goto: (screen: string) => void;
  onNewRequest: () => void;
}

const ConfirmedView = ({
  lang,
  snapshot,
  goto,
  onNewRequest,
}: ConfirmedViewProps) => {
  const t = useT();
  const months = MONTHS[lang];
  const isMultiPlateau = (snapshot.slotIds || []).filter(Boolean).length > 1;
  const ref = useMemo(() => {
    if (snapshot.savedRef) return snapshot.savedRef;
    const prefix =
      snapshot.mode === 'quote'
        ? 'EDO-Q-'
        : snapshot.mode === 'booking'
          ? 'EDO-R-'
          : 'EDO-';
    return prefix + Math.random().toString(36).substring(2, 8).toUpperCase();
  }, [snapshot.savedRef, snapshot.mode]);

  const plateauLabel = snapshot.plateauName[lang] || t('booking.stageFallback');
  const copy = (() => {
    if (snapshot.mode === 'quote') {
      return {
        tag: t('booking.quoteSent'),
        status: t('booking.quoteLabel'),
        title: t('booking.quoteOnItsWay'),
        body: t('booking.quoteBody', { stage: plateauLabel }),
      };
    }
    if (snapshot.mode === 'booking') {
      return {
        tag: t('booking.bookingConfirmed'),
        status: t('booking.booked'),
        title: t('booking.youreBooked'),
        body: t('booking.bookingBody', { stage: plateauLabel }),
      };
    }
    const contact = snapshot.contact as { prenom?: string; nom?: string };
    return {
      tag: t('booking.requestSent'),
      status: t('booking.confirmed'),
      title: t('booking.thankYou') + (contact.prenom || contact.nom || ''),
      body: t('booking.cycloRequestBody'),
    };
  })();

  const contact = snapshot.contact as {
    prenom?: string;
    nom?: string;
    email?: string;
    societe?: string;
    siren?: string;
  };

  const navBtnCls =
    'h-auto gap-2 bg-transparent p-0 text-xs tracking-widest hover:bg-transparent hover:text-primary';
  const navBtnOrangeCls =
    'h-11 gap-2 px-6 text-xs tracking-widest hover:scale-105';

  return (
    <div className="grid w-full gap-px bg-border md:h-full md:grid-cols-[var(--spacing-logo)_minmax(0,1fr)] md:grid-rows-[var(--spacing-header)_minmax(0,1fr)] md:overflow-hidden">
      <PageHeader
        title={copy.tag}
        className="col-span-full md:col-start-1 md:col-span-2 md:row-start-1"
      />
      <div className="overflow-auto flex flex-col gap-px bg-border md:col-span-2 md:row-start-2 md:min-h-0">
        <div className="grid gap-px bg-border grid-cols-1 md:grid-cols-[1.6fr_1fr]">
          <div className="bg-background pt-6 md:pt-7 px-5 md:px-12 pb-6 flex flex-col gap-2.5 min-h-44">
            <div className="font-mono text-xs uppercase tracking-widest text-primary-foreground inline-flex items-center gap-2.5 py-1.5 px-3 bg-primary self-start">
              ● {copy.status}
            </div>
            <h1 className="m-0 text-5xl font-light tracking-tighter leading-none text-balance">
              {copy.title}
            </h1>
            <p className="m-0 text-sm text-muted-foreground leading-normal max-w-xl text-pretty">
              {copy.body}
            </p>
          </div>
          <div className="bg-background px-5 md:px-6 py-5 md:py-6 flex flex-col justify-between gap-3.5 min-h-44">
            <div className="flex flex-col gap-3.5">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  {t('booking.reference')}
                </div>
                <div className="font-mono text-base tracking-widest text-foreground">
                  {ref}
                </div>
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  {t('booking.issued')}
                </div>
                <div className="font-mono text-xs text-foreground">
                  {/* `hour12: false` : en-US passerait en 02:30 PM alors que
 les créneaux de la même page sont en 24 h (fmtTime). */}
                  {new Date().toLocaleDateString(bcp47(lang), {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </div>
              </div>
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
                {t('booking.contactLabel')}
              </div>
              <div className="text-sm font-medium tracking-tight">
                {[contact.prenom, contact.nom].filter(Boolean).join(' ') || '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                {contact.email || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
          <div className="bg-background px-5 py-3">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
              {t('booking.stage')}
            </div>
            <div className="text-base font-medium tracking-tight">
              {plateauLabel}
            </div>
          </div>
          <div className="bg-background px-5 py-3">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
              {isMultiPlateau ? t('booking.dates') : t('booking.date')}
            </div>
            {snapshot.sessions && snapshot.sessions.length > 1 ? (
              <ul className="flex flex-col gap-1 list-none p-0 m-0">
                {snapshot.sessions.map((s, i) => (
                  <li
                    key={`${s.plateauKey}-${i}`}
                    className="text-sm font-medium tracking-tight"
                  >
                    <span className="text-muted-foreground">
                      {s.plateauName[lang]}
                    </span>
                    {' · '}
                    {s.date
                      ? `${s.date.d} ${months[s.date.m]} ${s.date.y}`
                      : snapshot.mode === 'quote'
                        ? t('booking.notSet')
                        : '—'}
                    {s.arrivalHour != null && (
                      <>
                        {' '}
                        · {fmtTime(s.arrivalHour)}–
                        {fmtTime(s.arrivalHour + s.hours)}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : snapshot.selected ? (
              <div className="text-base font-medium tracking-tight">
                {snapshot.selected.d} {months[snapshot.selected.m]}{' '}
                {snapshot.selected.y} · {fmtTime(snapshot.arrivalHour ?? 10)}–
                {fmtTime(
                  (snapshot.arrivalHour ?? 10) + (snapshot.rentalHours || 0),
                )}
              </div>
            ) : (
              <div className="text-base font-medium tracking-tight text-muted-foreground">
                {snapshot.mode === 'quote' ? t('booking.notSet') : '—'}
              </div>
            )}
          </div>
          <div className="bg-background px-5 py-3">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
              {t('booking.company')}
            </div>
            <div className="text-sm font-medium tracking-tight">
              {contact.societe || '—'}
            </div>
          </div>
          <div className="bg-background px-5 py-3">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
              SIREN
            </div>
            <div className="font-mono text-xs tracking-widest">
              {contact.siren || '—'}
            </div>
          </div>
        </div>

        <div className="bg-background px-5 md:px-12 py-4.5 pb-5 flex-1">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2.5">
            {t('booking.quoteBreakdown')}
          </div>
          <div className="flex flex-col">
            {(
              snapshot.rows as { lbl: string; amt: number; onReq?: boolean }[]
            ).map((r, i, arr) => (
              <div
                key={i}
                className={`flex flex-col py-1.5 gap-0.5 ${i === arr.length - 1 ? '' : 'border-b border-b-border'}`}
              >
                <div className="flex justify-between items-baseline text-xs">
                  <span className="tracking-tight text-foreground">
                    {r.lbl}
                  </span>
                  <span className="font-mono tabular-nums text-foreground">
                    {r.onReq
                      ? t('booking.onRequestLower')
                      : `${fmtEUR(r.amt, lang)} €`}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-baseline mt-3 pt-2.5 border-t-2 border-t-foreground">
              <span className="font-mono text-xs uppercase tracking-widest">
                Total HT*
              </span>
              <span className="text-3xl font-light tracking-tighter tabular-nums">
                {fmtEUR(snapshot.total, lang)} €
              </span>
            </div>
            <div className="font-mono text-xs text-muted-foreground mt-2.5 tracking-widest leading-relaxed pt-2 border-t border-t-border">
              {t('booking.quoteDisclaimer')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-background px-5 py-3 flex items-center">
            <Button onClick={() => goto('home')} className={navBtnCls}>
              ← {t('booking.backHome')}
            </Button>
          </div>
          <div className="bg-background px-5 py-3 flex items-center justify-end">
            <Button onClick={onNewRequest} className={navBtnOrangeCls}>
              {t('booking.newRequest')} <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BookConfirmation = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<ConfirmationSnapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const snap = loadConfirmation();
    setSnapshot(snap);
    setHydrated(true);
    if (snap) clearDraft();
  }, []);

  const onNewRequest = () => {
    clearConfirmation();
    navigate({ to: SCREEN_TO_PATH.book(lang) });
  };

  if (!hydrated) return null;

  if (!snapshot) {
    return (
      <div className="animate-in fade-in duration-300 grid w-full gap-px bg-border md:h-full md:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
        <PageHeader className="col-span-full md:row-start-1" />
        <div className="md:row-start-2 md:overflow-y-auto md:min-h-0 bg-background">
          <div className="px-5 py-10 md:px-12 md:py-14">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {t('bookPicker.confirmationMissingTitle')}
            </span>
            <h1 className="m-0 mt-4 text-5xl font-light tracking-tighter leading-none text-balance text-foreground">
              {t('common.bookNow')}
            </h1>
            <p className="m-0 mt-4 max-w-2xl text-sm text-muted-foreground leading-normal text-pretty">
              {t('bookPicker.confirmationMissingBody')}
            </p>
            <Button
              type="button"
              onClick={() => navigate({ to: SCREEN_TO_PATH.book(lang) })}
              className="mt-8 h-11 gap-2 px-6"
            >
              {t('bookPicker.resumeBooking')}{' '}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConfirmedView
      lang={lang}
      snapshot={snapshot}
      goto={goto}
      onNewRequest={onNewRequest}
    />
  );
};

export { BookConfirmation };
