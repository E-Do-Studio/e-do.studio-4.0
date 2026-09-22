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
import { MONTHS, bcp47, fmtEUR } from '../lib/format';
import { SectionIntro } from '../ui/section-intro';
import { QuoteTable } from '../ui/quote-table';
import { KeyValueList, KeyValueRow } from '../ui/key-value-row';
import { MonoLabel } from '../ui/mono-label';
import { hourLabel } from '@/lib/format';

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
    const contact = snapshot.contact as { prenom?: string; nom?: string };
    return {
      tag: t('booking.requestSent'),
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
        className="flex min-h-0 min-w-0 flex-col gap-px overflow-x-hidden bg-border app:row-start-2 app:overflow-hidden"
      >
        {/* `minmax(0, …)` : `1fr` vaut `minmax(auto, 1fr)` et refuse de
            rétrécir sous le min-content du chapô, ce qui élargissait toute
            la colonne flex et faisait défiler la page. */}
        <div className="grid min-w-0 shrink-0 gap-px bg-border grid-cols-1 app:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* Après la soumission, `navigate()` amène sur un document neuf, focus
              sur `<body>` : rien ne disait que la réservation avait abouti.
              `role="status"` annonce l'issue, et `titleRef` donne le focus au
              titre pour que la lecture reprenne au bon endroit. */}
          {/* `flow` : la cellule porte déjà son retrait. Le sur-titre est le
              libellé mono du système, pas une pastille pleine — celle-ci
              cassait le bento en dessinant un rectangle qui ne touche aucun
              filet. */}
          <SectionIntro
            size="flow"
            kicker={copy.tag}
            title={copy.title}
            titleRef={titleRef}
            subtitle={copy.body}
            className="min-h-44 bg-background px-5 pt-6 pb-6 md:px-12 md:pt-7"
          />
          {/* Deux `<dl>` et non un seul avec un `<div>` de groupement au
              milieu : `<dl>` n'accepte comme enfants que `<dt>`, `<dd>` et des
              `<div>` qui les portent directement. Un div qui n'enveloppe que
              d'autres divs y est invalide. */}
          <div className="flex min-h-44 min-w-0 flex-col justify-between gap-3.5 bg-background px-5 py-5 md:px-6 md:py-6">
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
                    {new Date(snapshot.ts).toLocaleDateString(bcp47(lang), {
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
                className="ph-mask gap-0.5"
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

        <KeyValueList
          pad="none"
          className="grid min-w-0 shrink-0 grid-cols-2 gap-px bg-border app:grid-cols-[repeat(4,minmax(0,1fr))]"
        >
          <KeyValueRow
            orientation="stacked"
            label={t('booking.stage')}
            className="min-w-0 bg-background px-5 py-3 text-base"
            value={<span className="tracking-tight">{plateauLabel}</span>}
          />
          <KeyValueRow
            orientation="stacked"
            label={isMultiPlateau ? t('booking.dates') : t('booking.date')}
            className="min-w-0 bg-background px-5 py-3"
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
          <KeyValueRow
            orientation="stacked"
            label={t('booking.company')}
            className="min-w-0 bg-background px-5 py-3"
            value={
              <span className="tracking-tight">{contact.societe || '—'}</span>
            }
          />
          <KeyValueRow
            orientation="stacked"
            density="tight"
            label="SIREN"
            className="min-w-0 bg-background px-5 py-3"
            value={
              <span className="font-mono tracking-widest">
                {contact.siren || '—'}
              </span>
            }
          />
        </KeyValueList>

        {/* Pas de `px-*` sur la cellule : les filets du tableau doivent
            toucher les bords, comme KeyValueRow le documente. Le retrait vit
            dans `QuoteTable variant="page"`. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
          <MonoLabel tone="muted" className="block px-5 pt-4.5 pb-2.5 md:px-12">
            {t('booking.breakdown')}
          </MonoLabel>
          <QuoteTable
            variant="page"
            className="min-w-0"
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
            disclaimer={
              <p className="m-0 max-w-2xl min-w-0 text-pretty text-sm leading-relaxed text-muted-foreground">
                {t('booking.quoteDisclaimer')}
              </p>
            }
          />
        </div>

        {/* Les boutons SONT les cellules : un aplat orange dans une case
            blanche dessine un rectangle qui ne touche aucun filet. Même
            montage que la barre du tunnel (`BookingFooterNav`). */}
        <div className="grid min-h-cta min-w-0 shrink-0 grid-cols-2 gap-px bg-border">
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
            className="h-full w-full px-pad-cell max-md:whitespace-normal"
          >
            {t('booking.newRequest')}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>

      </main>
      {/* Les boutons SONT les cellules : un aplat orange dans une case
          blanche dessine un rectangle qui ne touche aucun filet. Même
          montage que la barre du tunnel (`BookingFooterNav`). Rangée propre
          de la coquille, pour rester dans le viewport quand le récapitulatif
          défile. */}
      <div className="grid min-h-cta min-w-0 w-full max-w-full grid-cols-2 gap-px bg-border app:row-start-3">
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
