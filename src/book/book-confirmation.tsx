import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePageContext } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
import { IconArrowRight } from '../ui/icons';
import { PageHeader, buildMainNav } from '../ui/page-header';
import { clearDraft } from '../lib/use-booking-draft';
import { useT } from '../i18n/use-t';
import {
  loadConfirmation,
  clearConfirmation,
  type ConfirmationSnapshot,
} from './confirmation-snapshot';
import type { Lang } from '../types';
import { MONTHS, fmtEUR } from '../lib/format';

const fmtTime = (h: number) => `${String(h).padStart(2, '0')}:00`;

interface ConfirmedViewProps {
  lang: Lang;
  snapshot: ConfirmationSnapshot;
  onMenuClick: () => void;
  onLogoClick: () => void;
  onLangToggle: () => void;
  goto: (screen: string) => void;
  onNewRequest: () => void;
}

const ConfirmedView = ({
  lang,
  snapshot,
  onMenuClick,
  onLogoClick,
  onLangToggle,
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
    'edo-focus-ring bg-transparent border-0 cursor-pointer font-mono text-caption tracking-meta uppercase text-foreground inline-flex items-center gap-2 transition-all duration-150 hover:text-primary';
  const navBtnOrangeCls =
    'edo-focus-ring bg-primary border-0 cursor-pointer text-white font-mono text-caption tracking-meta uppercase px-cell-lg h-control inline-flex items-center gap-2 transition-all duration-150 hover:scale-102 hover:opacity-90';

  return (
    <div className="grid w-full edo-hairline md:h-full md:grid-cols-app md:grid-rows-app md:overflow-hidden">
      <PageHeader
        lang={lang}
        title={t('booking.title')}
        subtitle={copy.tag}
        className="col-span-full h-14 md:col-start-1 md:col-span-2 md:row-start-1 md:h-full"
        subgrid={false}
        onMenuClick={onMenuClick}
        onLogoClick={onLogoClick}
        onLangToggle={onLangToggle}
        actions={buildMainNav({ lang, goto })}
      />
      <div className="overflow-auto flex flex-col edo-hairline md:col-span-2 md:row-start-2 md:min-h-0">
        <div className="grid edo-hairline grid-cols-1 md:grid-cols-confirmation-hero">
          <div className="bg-white pt-6 md:pt-7 px-5 md:px-12 pb-6 flex flex-col gap-2.5 min-h-44">
            <div className="inline-flex items-center gap-2.5 py-1.5 px-3 bg-primary text-white font-mono text-micro tracking-label uppercase self-start">
              ● {copy.status}
            </div>
            <h1 className="m-0 text-hero font-light tracking-display leading-solid text-balance">
              {copy.title}
            </h1>
            <p className="m-0 text-detail text-muted-foreground leading-normal max-w-xl text-pretty">
              {copy.body}
            </p>
          </div>
          <div className="bg-white px-5 md:px-6 py-5 md:py-6 flex flex-col justify-between gap-3.5 min-h-44">
            <div className="flex flex-col gap-3.5">
              <div>
                <div className="edo-cell-label text-muted-foreground mb-1">
                  {t('booking.reference')}
                </div>
                <div className="font-mono text-cell tracking-ui text-foreground">
                  {ref}
                </div>
              </div>
              <div>
                <div className="edo-cell-label text-muted-foreground mb-1">
                  {t('booking.issued')}
                </div>
                <div className="font-mono text-caption text-foreground">
                  {new Date().toLocaleDateString(
                    lang === 'fr' ? 'fr-FR' : 'en-GB',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="edo-cell-label text-muted-foreground mb-1">
                {t('booking.contactLabel')}
              </div>
              <div className="text-detail font-medium tracking-copy-tight">
                {[contact.prenom, contact.nom].filter(Boolean).join(' ') || '—'}
              </div>
              <div className="text-caption text-muted-foreground">
                {contact.email || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 edo-hairline">
          <div className="bg-white px-5 py-3">
            <div className="edo-cell-label text-muted-foreground mb-1">
              {t('booking.stage')}
            </div>
            <div className="text-cell font-medium tracking-headline">
              {plateauLabel}
            </div>
          </div>
          <div className="bg-white px-5 py-3">
            <div className="edo-cell-label text-muted-foreground mb-1">
              {isMultiPlateau ? t('booking.dates') : t('booking.date')}
            </div>
            {snapshot.sessions && snapshot.sessions.length > 1 ? (
              <ul className="flex flex-col gap-1 list-none p-0 m-0">
                {snapshot.sessions.map((s, i) => (
                  <li
                    key={`${s.plateauKey}-${i}`}
                    className="text-detail font-medium tracking-copy-tight"
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
              <div className="text-cell font-medium tracking-headline">
                {snapshot.selected.d} {months[snapshot.selected.m]}{' '}
                {snapshot.selected.y} · {fmtTime(snapshot.arrivalHour ?? 10)}–
                {fmtTime(
                  (snapshot.arrivalHour ?? 10) + (snapshot.rentalHours || 0),
                )}
              </div>
            ) : (
              <div className="text-cell font-medium tracking-headline text-muted-foreground">
                {snapshot.mode === 'quote' ? t('booking.notSet') : '—'}
              </div>
            )}
          </div>
          <div className="bg-white px-5 py-3">
            <div className="edo-cell-label text-muted-foreground mb-1">
              {t('booking.company')}
            </div>
            <div className="text-detail font-medium tracking-copy-tight">
              {contact.societe || '—'}
            </div>
          </div>
          <div className="bg-white px-5 py-3">
            <div className="edo-cell-label text-muted-foreground mb-1">
              SIREN
            </div>
            <div className="font-mono text-caption tracking-caption">
              {contact.siren || '—'}
            </div>
          </div>
        </div>

        <div className="bg-white px-5 md:px-12 py-cell pb-5 flex-1">
          <div className="edo-cell-label text-muted-foreground mb-2.5">
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
                <div className="flex justify-between items-baseline text-caption">
                  <span className="tracking-copy-tight text-foreground">
                    {r.lbl}
                  </span>
                  <span className="font-mono tabular-nums text-foreground">
                    {r.onReq
                      ? t('booking.onRequestLower')
                      : `${fmtEUR(r.amt)} €`}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-baseline mt-3 pt-2.5 border-t-2 border-t-foreground">
              <span className="font-mono text-caption tracking-meta uppercase">
                Total HT*
              </span>
              <span className="text-page-title font-light tracking-display tabular-nums">
                {fmtEUR(snapshot.total)} €
              </span>
            </div>
            <div className="font-mono text-label text-muted-foreground mt-2.5 tracking-caption leading-copy pt-2 border-t border-t-border">
              {t('booking.quoteDisclaimer')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 edo-hairline">
          <div className="bg-white px-5 py-3 flex items-center">
            <button onClick={() => goto('home')} className={navBtnCls}>
              ← {t('booking.backHome')}
            </button>
          </div>
          <div className="bg-white px-5 py-3 flex items-center justify-end">
            <button onClick={onNewRequest} className={navBtnOrangeCls}>
              {t('booking.newRequest')}{' '}
              <IconArrowRight width="14" height="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BookConfirmation = () => {
  const t = useT();
  const { lang, setLang, openMenu, goto } = usePageContext();
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
      <div className="edo-page-enter grid w-full edo-hairline md:h-full md:grid-rows-app">
        <PageHeader
          lang={lang}
          title={t('booking.title')}
          className="col-span-full h-14 md:row-start-1 md:h-full"
          subgrid={false}
          onMenuClick={openMenu}
          onLogoClick={() => goto('home')}
          onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          actions={buildMainNav({ lang, goto })}
        />
        <div className="md:row-start-2 md:overflow-y-auto md:min-h-0 bg-white">
          <div className="px-5 py-10 md:px-12 md:py-14">
            <span className="font-mono text-label tracking-meta uppercase text-muted-foreground">
              {t('bookPicker.confirmationMissingTitle')}
            </span>
            <h1 className="m-0 mt-4 text-hero font-light tracking-display leading-solid text-balance text-foreground">
              {t('common.bookNow')}
            </h1>
            <p className="m-0 mt-4 max-w-2xl text-detail text-muted-foreground leading-normal text-pretty">
              {t('bookPicker.confirmationMissingBody')}
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: SCREEN_TO_PATH.book(lang) })}
              className="edo-focus-ring mt-8 inline-flex h-control cursor-pointer items-center gap-2 border-0 bg-primary px-cell-lg font-mono text-caption tracking-meta uppercase text-white transition-all duration-150 ease-edo-out hover:opacity-90"
            >
              {t('bookPicker.resumeBooking')}{' '}
              <IconArrowRight width="14" height="14" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConfirmedView
      lang={lang}
      snapshot={snapshot}
      onMenuClick={openMenu}
      onLogoClick={() => goto('home')}
      onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      goto={goto}
      onNewRequest={onNewRequest}
    />
  );
};

export { BookConfirmation };
