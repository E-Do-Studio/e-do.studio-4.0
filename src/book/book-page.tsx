import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import {
  STEP,
  canGoNext,
  resolveSlotList,
  stepProgress,
} from './booking-steps';
import { BookingFooterNav } from './booking-footer-nav';
import { BookingModeBanner } from './booking-mode-banner';
import { BookingStepperMobile, BookingStepperRail } from './booking-stepper';
import { ConfigRecap } from './config-recap';
import type { BookPageProps } from './booking-types';
import { BookingSidePanel } from './booking-side-panel';
import { MultiPlateauStep } from './multi-plateau-step';
import { buildCollectedFormFields } from './hubspot-fields';
import { buildSlotLabels } from './slot-labels';
import { usePersistBookingDraft, useBookingState } from './use-booking-state';
import { useBookingSteps } from './use-booking-steps';
import { useBookingSubmit } from './use-booking-submit';
import { useConfigSeeding } from './use-config-seeding';
import { StepConfigurator } from './steps/step-configurator';
import { StepContact } from './steps/step-contact';
import { StepDate } from './steps/step-date';
import { StepDuration } from './steps/step-duration';
import { StepPlateau } from './steps/step-plateau';
import { StepPostprod } from './steps/step-postprod';
import { StepTeam } from './steps/step-team';
import { useT } from '../i18n/use-t';
import type {
  BookPlateau,
  DateSelection,
  PriceBreakdown,
  QuoteLabels,
  SlotState,
} from '../lib/booking-engine';
import {
  BOOK_PLATEAUX,
  computePriceBreakdown,
  dailyOccupancyHoursFor,
  rentalHoursFor,
} from '../lib/booking-engine';
import { DAYS, MONTHS } from '../lib/format';
import { usePageContext } from '../lib/page-context';
import { PageHeader } from '../ui/page-header';

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

  const progress = stepProgress(STEPS, step, canNext());

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

      <BookingStepperMobile progress={progress} goToStep={goToStep} />
      <BookingStepperRail progress={progress} goToStep={goToStep} />

      <form
        ref={contentScrollRef}
        name="booking"
        aria-label={t('booking.bookingForm')}
        onSubmit={(e) => e.preventDefault()}
        className="bg-background overflow-auto flex flex-col md:col-start-2 md:col-span-2 md:row-start-2 md:min-h-0"
      >
        {mode === 'manual' && (
          <BookingModeBanner
            onReset={() => {
              resetSelection();
              goToStep(STEP.PLATEAU, 'manual');
            }}
            onConfigurator={() => goToStep(STEP.CONFIG, 'config')}
          />
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
        {step === STEP.CONFIG && canNext() && (
          <ConfigRecap
            lang={lang}
            sessions={configSessions}
            global={configGlobal}
          />
        )}
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
          <BookingFooterNav
            step={step}
            steps={STEPS}
            dateSlots={resolveSlotList(slotIds, plateau).map((id) => ({
              id,
              hasDate: !!slots[id]?.date,
            }))}
            dateIdx={dateIdx}
            setDateIdx={setDateIdx}
            canNext={canNext()}
            contactValid={contactValid}
            saving={saving}
            isCyclo={!!p.isCyclo}
            goToStep={goToStep}
            onContactNext={handleContactNext}
            onSubmit={handleSubmit}
          />
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
