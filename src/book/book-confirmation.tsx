import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { usePageContext } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageShell } from '../ui/page-shell';
import { MAIN_ID } from '../ui/skip-link';
import { clearDraft } from '../lib/use-booking-draft';
import { useT } from '../i18n/use-t';
import {
  loadConfirmation,
  clearConfirmation,
  type ConfirmationSnapshot,
} from './confirmation-snapshot';
import type { Lang } from '../types';
import { MONTHS, fmtEUR } from '../lib/format';
import { SectionIntro } from '../ui/section-intro';
import { QuoteTable } from '../ui/quote-table';
import { KeyValueList, KeyValueRow } from '../ui/key-value-row';
import { MonoLabel } from '../ui/mono-label';
import { hourLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

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
        title: t('booking.quoteOnItsWay'),
        body: t('booking.quoteBody', { stage: plateauLabel }),
      };
    }
    if (snapshot.mode === 'booking') {
      return {
        tag: t('booking.bookingConfirmed'),
        title: t('booking.youreBooked'),
        body: t('booking.bookingBody', { stage: plateauLabel }),
      };
    }
    const who = snapshot.contact as { prenom?: string; nom?: string };
    return {
      tag: t('booking.requestSent'),
      title: t('booking.thankYou') + (who.prenom || who.nom || ''),
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

  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const dateValue =
    snapshot.sessions && snapshot.sessions.length > 1 ? (
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {snapshot.sessions.map((s, i) => (
          <li
            key={`${s.plateauKey}-${i}`}
            className="flex flex-wrap items-baseline gap-x-2.5 text-sm tracking-tight"
          >
            <span className="text-muted-foreground">{s.plateauName[lang]}</span>
            <span>
              {s.date
                ? `${s.date.d} ${months[s.date.m]} ${s.date.y}`
                : t('booking.notSet')}
            </span>
            {s.arrivalHour != null && (
              <span>
                {hourLabel(s.arrivalHour)}–{hourLabel(s.arrivalHour + s.hours)}
              </span>
            )}
          </li>
        ))}
      </ul>
    ) : snapshot.selected ? (
      <div className="flex flex-wrap items-baseline gap-x-2.5 text-base tracking-tight">
        <span>
          {snapshot.selected.d} {months[snapshot.selected.m]}{' '}
          {snapshot.selected.y}
        </span>
        <span>
          {hourLabel(snapshot.arrivalHour ?? 10)}–
          {hourLabel(
            (snapshot.arrivalHour ?? 10) + (snapshot.rentalHours || 0),
          )}
        </span>
      </div>
    ) : (
      <span className="block text-base tracking-tight text-muted-foreground">
        {t('booking.notSet')}
      </span>
    );

  const quoteRows = (
    snapshot.rows as { lbl: string; amt: number; onReq?: boolean }[]
  ).map((r) => ({
    label: r.lbl,
    value: r.onReq ? t('booking.onRequestLower') : `${fmtEUR(r.amt, lang)} €`,
  }));

  return (
    // Même gabarit que le tunnel : le devis occupe la quatrième piste, il ne
    // s'étale pas en document sous le titre. C'est ce document-là — méta
    // « émis le », filet de total, vide blanc — qui faisait la page.
    <PageShell className="app:grid-cols-[minmax(0,1fr)_300px] app:grid-rows-[var(--spacing-header)_auto_minmax(0,1fr)_var(--spacing-cta)]">
      <main id={MAIN_ID} className="contents">
        <SectionIntro
          size="flow"
          kicker={copy.tag}
          title={copy.title}
          titleRef={titleRef}
          subtitle={copy.body}
          className="bg-background px-5 py-6 md:px-12 md:py-7 app:col-start-1 app:row-start-2"
        />

        <KeyValueList
          pad="none"
          className={cn(
            'grid min-h-0 min-w-0 grid-cols-2 gap-px bg-border app:col-start-1 app:row-start-3',
            !(contact.societe || contact.siren) &&
              '[&>*:last-child]:col-span-2',
          )}
        >
          <KeyValueRow
            orientation="stacked"
            label={t('booking.stage')}
            className="h-full min-w-0 bg-background px-5 py-3 text-base"
            value={<span className="tracking-tight">{plateauLabel}</span>}
          />
          <KeyValueRow
            orientation="stacked"
            label={isMultiPlateau ? t('booking.dates') : t('booking.date')}
            className="h-full min-w-0 bg-background px-5 py-3"
            value={dateValue}
          />
          <KeyValueRow
            orientation="stacked"
            label={t('booking.contactLabel')}
            className="ph-mask h-full min-w-0 bg-background px-5 py-3"
            value={
              <>
                <span className="block tracking-tight">
                  {[contact.prenom, contact.nom].filter(Boolean).join(' ')}
                </span>
                {contact.email && (
                  <span className="block text-xs text-muted-foreground">
                    {contact.email}
                  </span>
                )}
              </>
            }
          />
          {contact.societe ? (
            <KeyValueRow
              orientation="stacked"
              label={t('booking.company')}
              className="h-full min-w-0 bg-background px-5 py-3"
              value={<span className="tracking-tight">{contact.societe}</span>}
            />
          ) : contact.siren ? (
            <KeyValueRow
              orientation="stacked"
              density="tight"
              label="SIREN"
              className="h-full min-w-0 bg-background px-5 py-3"
              value={
                <span className="font-mono tracking-widest">
                  {contact.siren}
                </span>
              }
            />
          ) : null}
        </KeyValueList>

        <aside
          aria-label={t('booking.yourQuote')}
          className="dark flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto bg-background px-5 py-6 text-foreground app:col-start-2 app:row-span-3 app:row-start-2 app:gap-3.5 app:p-6"
        >
          <div>
            <MonoLabel tone="muted">{t('booking.yourQuote')}</MonoLabel>
            <p className="m-0 mt-2 font-mono text-xs tracking-widest text-muted-foreground">
              {ref}
            </p>
            <h2 className="m-0 mt-2 text-2xl font-light tracking-tight">
              {plateauLabel}
            </h2>
          </div>
          <div className="flex min-h-0 flex-1 flex-col border-t border-border pt-3.5">
            <MonoLabel tone="muted" className="mb-2.5 block">
              {t('booking.breakdown')}
            </MonoLabel>
            <QuoteTable
              variant="panel"
              className="min-w-0"
              rows={quoteRows}
              totalLabel={t('booking.totalExVat')}
              total={`${fmtEUR(snapshot.total, lang)} €`}
              disclaimer={
                <span className="font-mono text-xs tracking-wider text-muted-foreground">
                  {t('booking.vatLine', {
                    amount: fmtEUR(snapshot.total * 1.2, lang),
                  })}
                </span>
              }
            />
          </div>
        </aside>

        <div className="grid min-h-cta min-w-0 grid-cols-2 gap-px bg-border app:col-start-1 app:row-start-4">
          <Button
            type="button"
            variant="cell"
            size="touch"
            onClick={() => goto('home')}
            className="h-full min-w-0 w-full justify-start px-pad-cell max-md:whitespace-normal"
          >
            <ArrowLeft data-icon="inline-start" />
            {t('booking.backHome')}
          </Button>
          <Button
            type="button"
            size="touch"
            onClick={onNewRequest}
            className="h-full min-w-0 w-full px-pad-cell max-md:whitespace-normal"
          >
            {t('booking.newRequest')}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </main>
    </PageShell>
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
      <PageShell className="app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
        <main
          id={MAIN_ID}
          className="app:row-start-2 app:min-h-0 app:overflow-y-auto bg-background"
        >
          <SectionIntro
            kicker={t('bookPicker.confirmationMissingTitle')}
            kickerTone="muted"
            title={t('common.bookNow')}
            subtitle={t('bookPicker.confirmationMissingBody')}
          >
            <Button
              type="button"
              size="touch"
              onClick={() => navigate({ to: SCREEN_TO_PATH.book(lang) })}
              className="gap-2 px-6"
            >
              {t('bookPicker.resumeBooking')}{' '}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </SectionIntro>
        </main>
      </PageShell>
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
