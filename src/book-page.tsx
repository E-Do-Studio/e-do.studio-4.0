import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef } from 'react';
import { STEP, canGoNext, resolveSlotList } from './book/booking-steps';
import type { BookPageProps } from './book/booking-types';
import { PRODUCTS, catLabel, findEntry } from './book/catalog';
import { BookingSidePanel } from './book/booking-side-panel';
import { MultiPlateauStep } from './book/multi-plateau-step';
import { buildCollectedFormFields } from './book/hubspot-fields';
import { buildSlotLabels } from './book/slot-labels';
import {
  usePersistBookingDraft,
  useBookingState,
} from './book/use-booking-state';
import { useBookingSteps } from './book/use-booking-steps';
import { useBookingSubmit } from './book/use-booking-submit';
import { useConfigSeeding } from './book/use-config-seeding';
import { StepConfigurator } from './book/steps/step-configurator';
import { StepContact } from './book/steps/step-contact';
import { StepDate } from './book/steps/step-date';
import { StepDuration } from './book/steps/step-duration';
import { StepPlateau } from './book/steps/step-plateau';
import { StepPostprod } from './book/steps/step-postprod';
import { StepTeam } from './book/steps/step-team';
import { useT } from './i18n/use-t';
import type {
  BookPlateau,
  DateSelection,
  PriceBreakdown,
  QuoteLabels,
  SlotState,
} from './lib/booking-engine';
import {
  BOOK_PLATEAUX,
  computePriceBreakdown,
  dailyOccupancyHoursFor,
  recommendSession,
  rentalHoursFor,
} from './lib/booking-engine';
import { DAYS, MONTHS } from './lib/format';
import { usePageContext } from './lib/page-context';
import { PageHeader } from './ui/page-header';

// Placeholder used until a plateau is picked. Module-scoped so `p` keeps a
// stable identity across renders — inline, it was a fresh object every render
// and every hook depending on `p` (notably `handleSubmit`) re-created itself.
const NO_PLATEAU: BookPlateau = {
  k: '',
  fr: '—',
  en: '—',
  desc: { fr: '', en: '' },
  rates: { hour: 0, half: 0, full: 0 },
  hdUnit: 'half',
  fdUnit: 'full',
};

// Géométrie des actions de bas de tunnel — pleine hauteur de bande, empilées
// sous `md`. Tout le reste (mono capitales, anneau de focus, curseur, état
// désactivé) vient des variantes de `Button` : `variant="cell"` pour les
// actions sur fond de page, la variante par défaut pour l'action principale.
const FOOTER_ACTION =
  'h-auto min-h-11 flex-1 whitespace-normal border-t border-border px-5 py-3 md:min-h-0 md:border-t-0 md:border-l md:py-0';
const FOOTER_BACK =
  'h-auto min-h-11 justify-start whitespace-normal px-5 py-3 md:min-h-0 md:flex-1 md:py-0';

const BookPage = ({ forcedStep, forceManual }: BookPageProps = {}) => {
  const t = useT();
  const { lang } = usePageContext();

  const state = useBookingState({ forcedStep, forceManual });
  const {
    configGlobal,
    configSessions,
    configApplied,
    plateau,
    slotIds,
    slots,
    setSlots,
    viewY,
    setViewY,
    viewM,
    setViewM,
    selected,
    setSelected,
    arrivalHour,
    setArrivalHour,
    dateIdx,
    setDateIdx,
    slotType,
    hours,
    cycloMode,
    contact,
    setContact,
    today,
    setConfigGlobal,
    setConfigSessions,
    activeSessionIdx,
    setActiveSessionIdx,
    setConfigApplied,
    togglePlateau,
    resetSelection,
  } = state;

  const {
    step,
    goToStep,
    mode,
    steps: STEPS,
  } = useBookingSteps({
    draft: state.draft,
    forcedStep,
    forceManual,
    lang,
    configApplied,
  });
  usePersistBookingDraft(state, step);

  const p = BOOK_PLATEAUX.find((x) => x.k === plateau) || NO_PLATEAU;
  // Deux questions distinctes : ce qu'on facture et persiste (rentalHours), et
  // ce que le calendrier doit trouver de libre sur une seule journée
  // (availabilityHours).
  const rentalHours = rentalHoursFor({ slotType, hours, cycloMode }, p);
  const availabilityHours = dailyOccupancyHoursFor(
    { slotType, hours, cycloMode },
    p,
  );

  const quoteLabels = useMemo<QuoteLabels>(
    () => ({
      fullDayWithHours: (count: number) =>
        t('booking.fullDayWithHours', { count }),
      cyclo5h: t('booking.cyclo5h'),
      cyclo10h: t('booking.cyclo10h'),
      cyclo10hEditorial: t('booking.cyclo10hEditorial'),
      cycloPaint: t('booking.cycloPaint'),
      electricity: t('booking.electricity'),
      studioVisit: t('booking.studioVisit'),
      halfDay: t('booking.halfDay'),
      proRataDay: t('booking.proRataDay'),
      postProduction: t('booking.postProduction'),
      images: t('booking.images'),
      videoEditing: t('booking.videoEditing'),
      onRequest: t('common.onRequest'),
    }),
    [lang],
  );
  const priceBreakdown = useMemo<PriceBreakdown>(
    () =>
      computePriceBreakdown({
        plateau,
        slotIds,
        slots,
        lang,
        labels: quoteLabels,
      }),
    [plateau, slotIds, slots, lang, quoteLabels],
  );

  const contentScrollRef = useRef<HTMLFormElement | null>(null);
  const innerScrollRef = useRef<HTMLDivElement | null>(null);

  const { applyConfig, skipConfig } = useConfigSeeding({
    state,
    step,
    forceManual,
    goToStep,
    t,
  });
  const {
    saving,
    saveError,
    setSaveError,
    availRefreshKey,
    contactErrors,
    contactValid,
    runContactValidation,
    handleSubmit,
  } = useBookingSubmit({
    state,
    plateau: p,
    rentalHours,
    priceBreakdown,
    goToStep,
    formRef: contentScrollRef,
    lang,
    t,
  });

  const months = MONTHS[lang];
  const days = DAYS[lang];
  const calCells = useMemo<(number | null)[]>(() => {
    const dow = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
    const ndays = new Date(viewY, viewM + 1, 0).getDate();
    const cells: (number | null)[] = Array(dow).fill(null);
    for (let d = 1; d <= ndays; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [viewY, viewM]);
  const shiftMonth = (delta: number) => {
    const d = new Date(viewY, viewM + delta, 1);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  };
  const isPast = (d: number | null) => {
    if (!d) return true;
    const midnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return new Date(viewY, viewM, d) < midnight;
  };

  const canNext = () =>
    canGoNext({
      step,
      configSessions,
      slotIds,
      plateau,
      slots,
      selected,
      contactValid,
    });
  const handleContactNext = (nextN: number | null) => {
    if (!runContactValidation()) return;
    if (nextN !== null) goToStep(nextN);
  };

  // Chaque étape (et chaque sous-étape de date) rouvre en haut de page.
  useEffect(() => {
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
    if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0;
  }, [step, dateIdx]);
  useEffect(() => {
    if (step === STEP.DATE) setDateIdx(0);
  }, [step]);

  return (
    <div className="grid w-full gap-px bg-border md:h-full md:overflow-hidden md:grid-cols-[var(--spacing-logo)_minmax(0,1fr)_minmax(0,1fr)_300px] md:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
      {/* Pleine largeur, comme partout ailleurs. La bande s'arrêtait aux trois
          premières colonnes pour laisser la quatrième à un libellé « Votre
          devis » aligné sur le panneau du dessous : elle n'avait alors que
          723px à 1024, sous les 976 que ses cellules demandent. Le libellé
          descend dans le panneau, qui le porte déjà. */}
      <PageHeader className="col-span-full md:row-start-1" />

      <nav
        aria-label={t('booking.bookingSteps')}
        className="md:hidden bg-background border-b border-border"
      >
        <ol className="flex items-center px-5 pt-4">
          {STEPS.map((s, i) => {
            const active = step === s.n;
            const curIdx = STEPS.findIndex((x) => x.n === step);
            const done = curIdx > -1 && i < curIdx;
            const clickable =
              done || active || (i === curIdx + 1 && canNext()) || s.n === 0;
            return (
              <Fragment key={s.n}>
                <li className="flex-none">
                  <Button
                    type="button"
                    onClick={() => {
                      if (clickable) goToStep(s.n);
                    }}
                    aria-current={active ? 'step' : undefined}
                    aria-disabled={!clickable}
                    aria-label={`${i + 1}. ${s.label}`}
                    className={cn(
                      'p-2 -m-2 inline-flex items-center justify-center h-7 w-7 font-mono text-xs tracking-widest transition-colors duration-150',
                      active && 'bg-primary text-primary-foreground',
                      !active &&
                        done &&
                        'dark bg-background text-foreground cursor-pointer',
                      !active &&
                        !done &&
                        clickable &&
                        'bg-background text-foreground border border-foreground cursor-pointer',
                      !active &&
                        !done &&
                        !clickable &&
                        'bg-background text-muted-foreground border border-border opacity-50 cursor-not-allowed',
                    )}
                  >
                    {done ? '✓' : String(i + 1).padStart(2, '0')}
                  </Button>
                </li>
                {i < STEPS.length - 1 && (
                  <li
                    aria-hidden
                    className={cn(
                      'flex-1 h-px mx-2',
                      i < curIdx ? 'bg-foreground' : 'bg-border',
                    )}
                  />
                )}
              </Fragment>
            );
          })}
        </ol>
        <div className="px-5 pb-4 pt-3 font-mono text-xs tracking-wider uppercase">
          <span className="text-muted-foreground">
            {String(STEPS.findIndex((x) => x.n === step) + 1).padStart(2, '0')}{' '}
            ·{' '}
          </span>
          <span className="text-foreground">
            {STEPS.find((x) => x.n === step)?.label}
          </span>
        </div>
      </nav>

      <div className="hidden md:flex md:col-start-1 md:row-start-2 md:flex-col md:overflow-y-auto md:min-h-0 bg-background">
        {STEPS.map((s, i) => {
          const active = step === s.n;
          const curIdx = STEPS.findIndex((x) => x.n === step);
          const done = curIdx > -1 && i < curIdx;
          const clickable =
            done || active || (i === curIdx + 1 && canNext()) || s.n === 0;
          return (
            <Button
              type="button"
              key={s.n}
              onClick={() => {
                if (clickable) goToStep(s.n);
              }}
              variant="rail"
              aria-pressed={active}
              aria-disabled={!clickable}
              // Le conteneur est `hidden md:flex` : toute classe sans préfixe
              // `md:` ne s'appliquerait qu'en dessous du palier, où l'élément
              // n'existe pas. Le filet entre étapes est porté par tous et
              // retiré au dernier, plutôt que calculé depuis l'index.
              // `aria-disabled` est déjà posé : les classes de l'état
              // inaccessible le lisent plutôt que de le recalculer en JS.
              className="group h-11 flex-none justify-start gap-3.5 border-b border-b-border px-6 text-left last:border-b-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-35"
            >
              <span
                className={cn(
                  'min-w-5.5 font-mono text-xs tracking-widest group-aria-pressed:text-primary',
                  // « Franchie » reste un ternaire : c'est de l'arithmétique
                  // d'index, sans sémantique ARIA à porter. Le liseré et
                  // l'étape courante, eux, viennent de `aria-pressed`.
                  done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {done ? '✓' : String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm tracking-tight text-foreground group-aria-pressed:font-medium">
                {s.label}
              </span>
            </Button>
          );
        })}
      </div>

      <form
        ref={contentScrollRef}
        name="booking"
        aria-label={t('booking.bookingForm')}
        onSubmit={(e) => e.preventDefault()}
        className="bg-background overflow-auto flex flex-col md:col-start-2 md:col-span-2 md:row-start-2 md:min-h-0"
      >
        {mode === 'manual' && (
          <div className="flex flex-col md:flex-row md:items-stretch md:min-h-11 bg-muted box-border shrink-0 border-b border-border">
            <span className="font-mono text-xs tracking-wider uppercase text-muted-foreground px-5 py-3 md:py-0 md:self-center md:pl-5 md:pr-3 flex-1 min-w-0 leading-relaxed">
              {t('booking.manualOr')}
              <span className="text-foreground">{t('booking.letUsGuide')}</span>
            </span>
            <div className="flex items-stretch border-t border-border md:border-t-0 md:flex-none md:w-1/2">
              <Button
                type="button"
                onClick={() => {
                  resetSelection();
                  goToStep(STEP.PLATEAU, 'manual');
                }}
                className="h-auto flex-1 border-l border-border bg-transparent px-5 py-3 tracking-wider leading-normal hover:bg-background md:py-0"
              >
                ↻ {t('common.reset')}
              </Button>
              <Button
                type="button"
                onClick={() => goToStep(0, 'config')}
                className="h-auto flex-1 border-l border-border px-5 py-3 text-xs font-semibold tracking-wider md:py-0"
              >
                ← {t('booking.configurator')}
              </Button>
            </div>
          </div>
        )}
        <div ref={innerScrollRef} className="flex-1 overflow-y-auto">
          {step === STEP.CONFIG && (
            <StepConfigurator
              lang={lang}
              global={configGlobal}
              setGlobal={setConfigGlobal}
              sessions={configSessions}
              setSessions={setConfigSessions}
              activeIdx={activeSessionIdx}
              setActiveIdx={setActiveSessionIdx}
              onApply={applyConfig}
              onSkip={skipConfig}
              onReset={() => {
                resetSelection();
                setConfigApplied(false);
              }}
            />
          )}
          {step === STEP.PLATEAU && (
            <StepPlateau
              lang={lang}
              selected={slotIds}
              togglePlateau={togglePlateau}
            />
          )}
          {step === STEP.DURATION && (
            <MultiPlateauStep
              lang={lang}
              slotIds={resolveSlotList(slotIds, plateau)}
              slots={slots}
              setSlots={setSlots}
              topBanner={(() => {
                const list = resolveSlotList(slotIds, plateau);
                const allVisite =
                  list.length > 0 &&
                  list.every((id) => {
                    const pk = slots[id]?.plateauKey || id;
                    return BOOK_PLATEAUX.find((x) => x.k === pk)?.isVisite;
                  });
                if (allVisite) return null;
                return (
                  <div className="px-5 md:px-6 border-b border-border flex items-center min-h-11 py-3 md:py-0 md:h-11 box-border gap-3 bg-background flex-wrap sticky top-0 z-10">
                    <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary whitespace-nowrap">
                      02 · {t('booking.rentalDuration')}
                    </span>
                    <span className="font-mono text-xs tracking-wide text-muted-foreground">
                      {list.length > 1
                        ? t('booking.chooseDurationEach')
                        : t('booking.chooseDurationSingle')}
                    </span>
                  </div>
                );
              })()}
              renderOne={(px, st, setSt) => (
                <StepDuration
                  plateau={px}
                  slotType={st.slotType || 'hour'}
                  setSlotType={(v) => setSt({ slotType: v })}
                  hours={st.hours || 1}
                  setHours={(v) => setSt({ hours: v })}
                  cycloMode={st.cycloMode || 'halfH'}
                  setCycloMode={(v) => setSt({ cycloMode: v })}
                />
              )}
            />
          )}
          {step === STEP.TEAM && (
            <MultiPlateauStep
              lang={lang}
              slotIds={resolveSlotList(slotIds, plateau)}
              slots={slots}
              setSlots={setSlots}
              topBanner={
                <div className="px-5 md:px-6 border-b border-border flex items-center min-h-11 py-3 md:py-0 md:h-11 box-border gap-3 bg-background flex-wrap sticky top-0 z-10">
                  <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary whitespace-nowrap">
                    03 · {t('booking.teamOptional')}
                  </span>
                </div>
              }
              renderOne={(px, st, setSt) => (
                <StepTeam
                  lang={lang}
                  plateau={px}
                  team={st.team || {}}
                  configSessions={configSessions}
                  setTeam={(updater) =>
                    setSt({
                      team:
                        typeof updater === 'function'
                          ? updater(st.team || {})
                          : updater,
                    })
                  }
                />
              )}
            />
          )}
          {step === STEP.POSTPROD && (
            <MultiPlateauStep
              lang={lang}
              slotIds={resolveSlotList(slotIds, plateau)}
              slots={slots}
              setSlots={setSlots}
              topBanner={
                <div className="px-5 md:px-6 border-b border-border flex items-center min-h-11 py-3 md:py-0 md:h-11 box-border gap-3 bg-background flex-wrap sticky top-0 z-10">
                  <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary whitespace-nowrap">
                    04 · {t('booking.postProdOptional')}
                  </span>
                </div>
              }
              renderOne={(px, st, setSt) => (
                <StepPostprod
                  plateauKey={px.k}
                  postprod={st.postprod || {}}
                  setPostprod={(v) => setSt({ postprod: v })}
                />
              )}
            />
          )}
          {step === STEP.CONTACT && (
            <StepContact
              lang={lang}
              contact={contact}
              setContact={setContact}
              plateau={p}
              configMode={configApplied}
              errors={contactErrors}
            />
          )}
          {step === STEP.DATE &&
            (() => {
              const list = resolveSlotList(slotIds, plateau);
              if (list.length <= 1) {
                return (
                  <StepDate
                    plateau={p}
                    viewY={viewY}
                    viewM={viewM}
                    months={months}
                    days={days}
                    calCells={calCells}
                    selected={selected}
                    setSelected={setSelected}
                    arrivalHour={arrivalHour}
                    setArrivalHour={setArrivalHour}
                    rentalHours={availabilityHours}
                    isPast={isPast}
                    nextMonth={() => shiftMonth(1)}
                    prevMonth={() => shiftMonth(-1)}
                    refreshKey={availRefreshKey}
                  />
                );
              }
              const safeIdx = Math.max(0, Math.min(dateIdx, list.length - 1));
              const id = list[safeIdx];
              const st = slots[id] || {};
              const pk = st.plateauKey || id;
              const px = BOOK_PLATEAUX.find((x) => x.k === pk);
              const setSt = (patch: SlotState) =>
                setSlots((prev) => ({
                  ...prev,
                  [id]: { ...(prev[id] || {}), plateauKey: pk, ...patch },
                }));
              const stRentalHours = dailyOccupancyHoursFor(st, px);
              const stSelected = st.date || null;
              const stArrival = st.arrivalHour != null ? st.arrivalHour : 10;
              const slotLabels = buildSlotLabels(list, slots, lang);
              const currentLabel = slotLabels[safeIdx].label;
              return (
                <div>
                  <div className="px-5 md:px-6 border-b border-border flex items-center min-h-11 py-3 md:py-0 md:h-11 box-border gap-3 md:gap-4 bg-background flex-wrap sticky top-0 z-10">
                    <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary whitespace-nowrap">
                      {t('booking.stageFallback')}{' '}
                      {String(safeIdx + 1).padStart(2, '0')} /{' '}
                      {String(list.length).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-normal tracking-tight text-foreground">
                      {currentLabel}
                    </span>
                    <div className="flex gap-1.5 flex-wrap w-full md:w-auto md:ml-auto">
                      {list.map((xid, i) => {
                        const has = slots[xid] && slots[xid].date;
                        const active = i === safeIdx;
                        return (
                          <Button
                            type="button"
                            key={xid}
                            onClick={() => setDateIdx(i)}
                            title={slotLabels[i].label}
                            variant="outline"
                            aria-pressed={active}
                            className={cn(
                              'h-auto min-w-7 px-2.5 py-1 text-xs tracking-wider',
                              active
                                ? 'dark border-foreground bg-background'
                                : has &&
                                    'border-primary bg-primary text-primary-foreground',
                            )}
                          >
                            {String(i + 1).padStart(2, '0')}
                            {has ? ' ✓' : ''}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <StepDate
                    plateau={px}
                    viewY={viewY}
                    viewM={viewM}
                    months={months}
                    days={days}
                    calCells={calCells}
                    selected={stSelected}
                    setSelected={(d: DateSelection) =>
                      setSt({ date: d, arrivalHour: st.arrivalHour ?? 10 })
                    }
                    arrivalHour={stArrival}
                    setArrivalHour={(h: number) => setSt({ arrivalHour: h })}
                    rentalHours={stRentalHours}
                    isPast={isPast}
                    nextMonth={() => shiftMonth(1)}
                    prevMonth={() => shiftMonth(-1)}
                    refreshKey={availRefreshKey}
                  />
                </div>
              );
            })()}
        </div>

        {saveError && (
          <Alert
            variant="destructive"
            className="shrink-0 items-center justify-between rounded-none border-x-0 border-b-0 px-12 py-3"
          >
            <AlertDescription>{saveError}</AlertDescription>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSaveError(null)}
              aria-label={t('common.close')}
              className="text-destructive"
            >
              <X />
            </Button>
          </Alert>
        )}
        <BookingHubspotFields
          mode={mode}
          omitContact={step === STEP.CONTACT}
          plateau={plateau}
          slotIds={slotIds}
          slots={slots}
          selected={selected}
          arrivalHour={arrivalHour}
          rentalHours={rentalHours}
          projectType={configGlobal.projectType}
          urgency={configGlobal.urgency}
          total={priceBreakdown.total}
          contact={contact}
        />
        {step === STEP.CONFIG &&
          canNext() &&
          (() => {
            const recs = configSessions.map((s) => ({
              session: s,
              ...recommendSession(s, configGlobal),
            }));
            return (
              <div className="dark shrink-0 bg-background text-foreground">
                <div className="flex flex-col md:flex-row md:items-stretch border-b border-border">
                  <span className="font-mono text-xs tracking-widest uppercase tracking-widest text-primary px-5 md:pl-6 md:pr-3 py-2 flex-1 min-w-0 md:self-center">
                    {t('booking.recapRecommendation')}
                  </span>
                  <span className="font-mono text-xs tracking-wider text-muted-foreground px-5 py-2 border-t border-border md:border-t-0 md:self-center md:w-1/2 md:border-l md:border-border">
                    {t('booking.estimateTweakable')}
                  </span>
                </div>
                {recs.map((r, i) => {
                  const px =
                    BOOK_PLATEAUX.find((x) => x.k === r.plateau) ||
                    BOOK_PLATEAUX[0];
                  const productLabel =
                    r.session.projectType === 'cyclorama'
                      ? t('booking.cyclorama')
                      : catLabel(t, findEntry(PRODUCTS, r.session.product));
                  const totalHours = r.estimatedHours || r.hours || 0;
                  let dur: string;
                  if (r.onRequest) {
                    dur = t('booking.onRequestLower');
                  } else if (totalHours <= 16) {
                    dur = `${totalHours}h`;
                  } else {
                    const d = Math.floor(totalHours / 8);
                    const h = totalHours - d * 8;
                    const dLbl = t('booking.dayUnit', { count: d });
                    dur =
                      h > 0
                        ? `${d} ${dLbl} ${t('booking.andConjunction')} ${h}h (${totalHours}h)`
                        : `${d} ${dLbl} (${totalHours}h)`;
                  }
                  return (
                    <div
                      key={i}
                      className="px-5 md:px-6 py-2 border-b border-border grid grid-cols-[auto_minmax(0,1fr)] gap-3 md:gap-5 items-baseline"
                    >
                      <span className="font-mono text-xs tracking-widest uppercase tracking-widest text-muted-foreground">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <div className="text-sm font-normal tracking-tight mb-px">
                          {px[lang]}{' '}
                          <span className="text-muted-foreground text-xs">
                            · {dur}
                          </span>
                        </div>
                        <div className="font-mono text-xs tracking-wide text-muted-foreground">
                          {productLabel}
                          {r.session.projectType === 'cyclorama'
                            ? ''
                            : ` · ${r.session.quantity} ${t('booking.products')}`}
                          {r.session.projectType === 'cyclorama'
                            ? ''
                            : (() => {
                                const q = Number(r.session.quantity) || 0;
                                const vc = Number(r.session.viewsCount) || 0;
                                const vLen = (r.session.views || []).length;
                                const v = vc || vLen || 0;
                                const n = q * v;
                                return n > 0
                                  ? ` · ${n} ${t('booking.images')}`
                                  : '';
                              })()}
                          {r.cadence
                            ? ` · ${t('booking.cadenceEstimate', { count: r.cadence })}`
                            : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        {step === STEP.CONFIG && (
          <div className="flex items-stretch min-h-11 shrink-0">
            <Button
              type="button"
              onClick={applyConfig}
              disabled={!canNext()}
              className="h-auto min-w-0 flex-1 gap-2 px-5 py-3 text-xs tracking-widest md:py-0"
            >
              {t('booking.continueToBooking')}{' '}
              <ArrowRight width="14" height="14" />
            </Button>
          </div>
        )}
        {step > STEP.CONFIG && (
          <div className="border-t border-border flex flex-col md:flex-row md:items-stretch shrink-0 bg-background md:min-h-11">
            {(() => {
              const idx = STEPS.findIndex((s) => s.n === step);
              const isFirst = idx <= 0;
              const prevN = idx > 0 ? STEPS[idx - 1].n : null;
              const nextN =
                idx > -1 && idx < STEPS.length - 1 ? STEPS[idx + 1].n : null;
              const dateList = resolveSlotList(slotIds, plateau);
              const isMultiDate = step === STEP.DATE && dateList.length > 1;
              const safeDateIdx = Math.max(
                0,
                Math.min(dateIdx, dateList.length - 1),
              );
              const onLastDateSub =
                !isMultiDate || safeDateIdx >= dateList.length - 1;
              const onFirstDateSub = !isMultiDate || safeDateIdx <= 0;
              const currentDateId = isMultiDate ? dateList[safeDateIdx] : null;
              const currentDateValid =
                !isMultiDate ||
                (currentDateId != null &&
                  slots[currentDateId] &&
                  slots[currentDateId].date);
              const handleBack = () => {
                if (isMultiDate && !onFirstDateSub) {
                  setDateIdx(safeDateIdx - 1);
                  return;
                }
                if (prevN !== null) goToStep(prevN);
              };
              const handleSubNext = () => {
                if (isMultiDate && !onLastDateSub && currentDateValid) {
                  setDateIdx(safeDateIdx + 1);
                  return true;
                }
                return false;
              };
              return (
                <>
                  <Button
                    type="button"
                    variant="cell"
                    onClick={handleBack}
                    disabled={isFirst && onFirstDateSub}
                    className={FOOTER_BACK}
                  >
                    ← {t('booking.back')}
                  </Button>
                  <div className="flex items-stretch md:flex-none md:w-1/2">
                    {step < STEP.CONTACT ? (
                      <Button
                        type="button"
                        onClick={() => {
                          if (step === STEP.CONFIG) {
                            applyConfig();
                          } else if (nextN !== null) {
                            goToStep(nextN);
                          }
                        }}
                        disabled={!canNext()}
                        className={FOOTER_ACTION}
                      >
                        {step === STEP.CONFIG
                          ? t('booking.continueToBooking')
                          : t('booking.continue')}{' '}
                        <ArrowRight />
                      </Button>
                    ) : p.isCyclo ? (
                      step === STEP.CONTACT ? (
                        <Button
                          type="button"
                          onClick={() => handleContactNext(nextN)}
                          className={FOOTER_ACTION}
                        >
                          {t('booking.continue')} <ArrowRight />
                        </Button>
                      ) : isMultiDate && !onLastDateSub ? (
                        <Button
                          type="button"
                          onClick={handleSubNext}
                          disabled={!currentDateValid}
                          className={FOOTER_ACTION}
                        >
                          {t('booking.validateNextStage')} <ArrowRight />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => handleSubmit('request')}
                          disabled={!canNext() || saving}
                          className={FOOTER_ACTION}
                        >
                          {saving
                            ? t('booking.sending')
                            : t('booking.submitRequest')}{' '}
                          <ArrowRight />
                        </Button>
                      )
                    ) : (
                      <>
                        {/* Volontairement cliquable même quand le contact est
                            incomplet : `handleSubmit` renvoie alors sur l'étape
                            contact pour montrer ce qui manque. Sans ça, le
                            bouton semblerait ne rien faire. L'atténuation dit
                            qu'il reste quelque chose à remplir. */}
                        <Button
                          type="button"
                          variant="cell"
                          onClick={() => handleSubmit('quote')}
                          disabled={saving}
                          title={t('booking.noDateHeld')}
                          className={cn(
                            FOOTER_ACTION,
                            !contactValid && 'opacity-30',
                          )}
                        >
                          {saving
                            ? t('booking.sending')
                            : t('booking.receiveMyQuote')}{' '}
                          <ArrowRight />
                        </Button>
                        {step === STEP.CONTACT ? (
                          <Button
                            type="button"
                            onClick={() => handleContactNext(nextN)}
                            className={FOOTER_ACTION}
                          >
                            {t('booking.pickADate')} <ArrowRight />
                          </Button>
                        ) : isMultiDate && !onLastDateSub ? (
                          <Button
                            type="button"
                            onClick={handleSubNext}
                            disabled={!currentDateValid}
                            className={FOOTER_ACTION}
                          >
                            {t('booking.validateNextStage')} <ArrowRight />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => handleSubmit('booking')}
                            disabled={!canNext() || saving}
                            className={FOOTER_ACTION}
                          >
                            {saving
                              ? t('booking.booking')
                              : t('common.bookNow')}{' '}
                            <ArrowRight />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </form>

      <BookingSidePanel
        lang={lang}
        plateau={p}
        selected={selected}
        months={months}
        slotType={slotType}
        hours={hours}
        cycloMode={cycloMode}
        rows={priceBreakdown.rows}
        total={priceBreakdown.total}
        isPreview={!!priceBreakdown.isPreview}
        slotIds={slotIds}
        slots={slots}
      />
    </div>
  );
};

/**
 * Champs cachés que HubSpot Collected Forms ramasse au fil de la saisie.
 * Le jeu de champs vit dans book/hubspot-fields.ts, aux côtés de celui envoyé
 * à l'API Forms à la soumission : les deux y sont côte à côte, avec la raison
 * de leurs divergences.
 */
const BookingHubspotFields = (
  props: Parameters<typeof buildCollectedFormFields>[0],
) => (
  <div hidden aria-hidden>
    {Object.entries(buildCollectedFormFields(props)).map(([name, value]) => (
      <input key={name} type="hidden" name={name} value={value} readOnly />
    ))}
  </div>
);

export { BookPage };
