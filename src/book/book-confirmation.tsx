import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { usePageContext } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
import { ArrowRight } from 'lucide-react';
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
import { MONTHS, bcp47, fmtEUR } from '../lib/format';
import { SectionIntro } from '../ui/section-intro';
import { QuoteTable } from '../ui/quote-table';
import { KeyValueList, KeyValueRow } from '../ui/key-value-row';
import { MonoLabel } from '../ui/mono-label';
import { hourLabel } from '@/lib/format';
import { StatusBadge } from '@/ui/status-badge';

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
  const navBtnOrangeCls = 'h-11 gap-2 px-6 text-xs tracking-widest';

  // La page arrive après un `navigate()`, focus sur `<body>`. Le porter sur le
  // titre place le lecteur d'écran à l'endroit qui annonce l'issue.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    /* Aucune colonne déclarée, comme la branche de repli plus bas : les deux
       états de cette page portaient deux gabarits différents pour le même
       rendu. Celui-ci annonçait une colonne de sigle et une colonne souple que
       le récapitulatif enjambait toutes les deux — 240px plus la gouttière plus
       le reste font la largeur entière, exactement ce que donne la piste unique
       de la coquille. */
    <PageShell className="app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
      {/* Un vrai `<main>` et non un `<div>` : la page n'en avait aucun, donc le
          lien d'évitement de skip-link.tsx ne trouvait pas sa cible et laissait
          le focus sur `<body>`. C'est le dernier écran du parcours de
          conversion, celui qu'on atteint au clavier après un formulaire. */}
      <main
        id={MAIN_ID}
        className="overflow-auto flex flex-col gap-px bg-border app:row-start-2 app:min-h-0"
      >
        <div className="grid gap-px bg-border grid-cols-1 app:grid-cols-[1.6fr_1fr]">
          {/* Après la soumission, `navigate()` amène sur un document neuf, focus
              sur `<body>` : rien ne disait que la réservation avait abouti.
              `role="status"` annonce l'issue, et `titleRef` donne le focus au
              titre pour que la lecture reprenne au bon endroit. */}
          {/* `flow` : la cellule porte déjà son retrait. `gap-2.5` par-dessus le
              `gap-3` de la variante — c'est l'écart d'origine, et le sur-titre
              est ici une pastille, plus haute qu'une ligne de mono. */}
          <SectionIntro
            size="flow"
            kicker={
              <StatusBadge
                render={<output />}
                size="md"
                className="gap-2.5 self-start"
              >
                {copy.status}
              </StatusBadge>
            }
            title={copy.title}
            titleRef={titleRef}
            subtitle={copy.body}
            className="min-h-44 gap-2.5 bg-background px-5 pt-6 pb-6 md:px-12 md:pt-7"
          />
          {/* Deux `<dl>` et non un seul avec un `<div>` de groupement au
              milieu : `<dl>` n'accepte comme enfants que `<dt>`, `<dd>` et des
              `<div>` qui les portent directement. Un div qui n'enveloppe que
              d'autres divs y est invalide. */}
          <div className="flex min-h-44 flex-col justify-between gap-3.5 bg-background px-5 py-5 md:px-6 md:py-6">
            <KeyValueList className="gap-3.5">
              <KeyValueRow
                orientation="stacked"
                label={t('booking.reference')}
                value={
                  <span className="font-mono text-base tracking-widest">
                    {ref}
                  </span>
                }
              />
              <KeyValueRow
                orientation="stacked"
                density="tight"
                label={t('booking.issued')}
                value={
                  <span className="font-mono">
                    {/* `hour12: false` : en-US passerait en 02:30 PM alors que
                        les créneaux de la même page sont en 24 h (hourLabel). */}
                    {new Date().toLocaleDateString(bcp47(lang), {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </span>
                }
              />
            </KeyValueList>
            <KeyValueList>
              <KeyValueRow
                orientation="stacked"
                label={t('booking.contactLabel')}
                className="gap-0.5"
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
            </KeyValueList>
          </div>
        </div>

        <KeyValueList className="grid grid-cols-2 gap-px bg-border app:grid-cols-4">
          <KeyValueRow
            orientation="stacked"
            label={t('booking.stage')}
            className="bg-background px-5 py-3 text-base"
            value={<span className="tracking-tight">{plateauLabel}</span>}
          />
          <KeyValueRow
            orientation="stacked"
            label={isMultiPlateau ? t('booking.dates') : t('booking.date')}
            className="bg-background px-5 py-3"
            value={
              snapshot.sessions && snapshot.sessions.length > 1 ? (
                <ul className="flex flex-col gap-1 list-none p-0 m-0">
                  {snapshot.sessions.map((s, i) => (
                    <li
                      key={`${s.plateauKey}-${i}`}
                      className="flex flex-wrap items-baseline gap-x-2.5 text-sm tracking-tight"
                    >
                      <span className="text-muted-foreground">
                        {s.plateauName[lang]}
                      </span>
                      <span>
                        {s.date
                          ? `${s.date.d} ${months[s.date.m]} ${s.date.y}`
                          : t('booking.notSet')}
                      </span>
                      {s.arrivalHour != null && (
                        <span>
                          {hourLabel(s.arrivalHour)}–
                          {hourLabel(s.arrivalHour + s.hours)}
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
                      (snapshot.arrivalHour ?? 10) +
                        (snapshot.rentalHours || 0),
                    )}
                  </span>
                </div>
              ) : (
                <span className="block text-base tracking-tight text-muted-foreground">
                  {t('booking.notSet')}
                </span>
              )
            }
          />
          {contact.societe && (
            <KeyValueRow
              orientation="stacked"
              label={t('booking.company')}
              className="bg-background px-5 py-3"
              value={<span className="tracking-tight">{contact.societe}</span>}
            />
          )}
          {contact.siren && (
            <KeyValueRow
              orientation="stacked"
              density="tight"
              label="SIREN"
              className="bg-background px-5 py-3"
              value={
                <span className="font-mono tracking-widest">
                  {contact.siren}
                </span>
              }
            />
          )}
        </KeyValueList>

        <div className="bg-background px-5 md:px-12 py-4.5 pb-5 flex-1">
          <MonoLabel tone="muted" className="mb-2.5 block">
            {t('booking.quoteBreakdown')}
          </MonoLabel>
          <QuoteTable
            variant="page"
            rows={(
              snapshot.rows as { lbl: string; amt: number; onReq?: boolean }[]
            ).map((r) => ({
              label: r.lbl,
              value: r.onReq
                ? t('booking.onRequestLower')
                : `${fmtEUR(r.amt, lang)} €`,
            }))}
            totalLabel={t('booking.totalExVat')}
            total={`${fmtEUR(snapshot.total, lang)} €`}
            disclaimer={t('booking.quoteDisclaimer')}
          />
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
          className="app:row-start-2 app:overflow-y-auto app:min-h-0 bg-background"
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
