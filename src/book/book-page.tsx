import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
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
import { PageShell } from '../ui/page-shell';
import { MAIN_ID } from '../ui/skip-link';
import { StepHeading } from '@/ui/step-heading';
import { ordinal } from '@/lib/format';
import { MonoLabel } from '@/ui/mono-label';
import { StepBand } from '@/ui/step-band';
import { CtaCell } from '@/ui/cta-cell';

// Placeholder used until a plateau is picked. Module-scoped so `p` keeps a
// stable identity across renders — inline, it was a fresh object every render
// and every hook depending on `p` (notably `handleSubmit`) re-created itself.
const NO_PLATEAU: BookPlateau = {
  k: '',
  // Pas de nom, et surtout pas un tiret : cet objet existe pour donner une
  // identité stable aux hooks, pas pour s'afficher. S'il apparaît à l'écran,
  // c'est un trou à corriger — un tiret le maquillerait en valeur connue.
  fr: '',
  en: '',
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
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);

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
  //
  // Le défilement seul ne suffisait pas : au clic sur « Continuer », tout le
  // contenu est remplacé mais le focus reste sur le bouton du pied, dont le
  // libellé ne change pas toujours. Rien n'indiquait le changement d'étape.
  // Le focus part sur le titre de l'étape, et la région live l'annonce.
  useEffect(() => {
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
    if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0;
    stepHeadingRef.current?.focus();
  }, [step, dateIdx]);
  useEffect(() => {
    if (step === STEP.DATE) setDateIdx(0);
  }, [step]);

  return (
    // Le tunnel montait en deux temps : coquille à deux colonnes à `md`, puis
    // panneau de devis en quatrième colonne à `lg`. Le second palier existait
    // pour se protéger du premier — posés ensemble à 768, les 300px du panneau
    // prenaient 39 % de la fenêtre et la colonne de contenu tombait à 388px,
    // soit MOINS large qu'à 640 où elle occupait tout.
    //
    // Les deux se rejoignent sur `app` : c'est la place pour deux colonnes ET
    // un panneau qui était la vraie condition, et elle n'existait jamais à 768.
    // Sous le palier, le tunnel est une colonne qui défile — ce que la coquille
    // à deux colonnes n'a jamais réussi à être dans cette largeur.
    // La bande d'en-tête est pleine largeur, comme partout ailleurs — c'est la
    // coquille qui la pose. Elle s'arrêtait ici aux trois premières colonnes
    // pour laisser la quatrième à un libellé « Votre devis » aligné sur le
    // panneau du dessous : elle n'avait alors que 723px à 1024, sous les 976
    // que ses cellules demandent. Le libellé descend dans le panneau.
    <PageShell className="app:grid-rows-[var(--spacing-header)_minmax(0,1fr)] app:grid-cols-[var(--spacing-logo)_minmax(0,1fr)_minmax(0,1fr)_300px]">
      {/* Le tunnel n'avait ni `<main>` ni `<h1>` : le seul titre du document
          était le `<h2>` du panneau devis, vide tant que rien n'est choisi.
          Le parcours de conversion était donc le seul du site sans repère de
          structure. `contents` pour ne pas casser la grille. */}
      <main id={MAIN_ID} className="contents">
        <h1 className="sr-only">
          {t('booking.bookingForm')} — E-Do Studio Paris
        </h1>
        {/* Titre d'étape porteur du focus. Volontairement sans `aria-live` :
          déplacer le focus le fait déjà lire, une région live en plus le
          ferait annoncer deux fois. */}
        <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only outline-none">
          {t('booking.stepOf', {
            current: (progress.find((s) => s.active)?.index ?? 0) + 1,
            total: progress.length,
            label: progress.find((s) => s.active)?.label ?? '',
          })}
        </h2>

        <BookingStepperMobile progress={progress} goToStep={goToStep} />
        <BookingStepperRail progress={progress} goToStep={goToStep} />

        <form
          ref={contentScrollRef}
          name="booking"
          aria-label={t('booking.bookingForm')}
          onSubmit={(e) => e.preventDefault()}
          // `overflow-y-auto` et non `overflow-auto` : ce dernier autorise le
          // défilement HORIZONTAL, qui n'a aucun sens dans un tunnel en colonne
          // — il masque une partie de la grille au lieu de la faire tenir. Si
          // quelque chose déborde encore, c'est ce quelque chose qu'il faut
          // corriger, pas la fenêtre qu'il faut élargir.
          // `@container/tunnel` : c'est CETTE colonne que les grilles internes
          // doivent mesurer, pas la fenêtre. Les deux divergent dès que le
          // panneau de devis entre en scène.
          className="@container/tunnel flex flex-col overflow-y-auto bg-background app:col-start-2 app:col-span-2 app:row-start-2 app:min-h-0"
        >
          {mode === 'manual' && (
            <BookingModeBanner
              hint={t('booking.manualHint')}
              switchLabel={t('booking.configurator')}
              direction="back"
              onReset={() => {
                resetSelection();
                goToStep(STEP.PLATEAU, 'manual');
              }}
              onSwitch={() => goToStep(STEP.CONFIG, 'config')}
            />
          )}
          <div ref={innerScrollRef} className="flex-1 overflow-y-auto">
            {step === STEP.CONFIG && (
              <StepConfigurator
                sessions={configSessions}
                setSessions={setConfigSessions}
                activeIdx={activeSessionIdx}
                setActiveIdx={setActiveSessionIdx}
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
                    <StepBand sticky>
                      <StepHeading
                        number="02"
                        title={t('booking.rentalDuration')}
                        subtitle={
                          list.length > 1
                            ? t('booking.chooseDurationEach')
                            : t('booking.chooseDurationSingle')
                        }
                      />
                    </StepBand>
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
                  <StepBand sticky>
                    <StepHeading
                      number="03"
                      title={t('booking.teamOptional')}
                    />
                  </StepBand>
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
                  <StepBand sticky>
                    <StepHeading
                      number="04"
                      title={t('booking.postProdOptional')}
                    />
                  </StepBand>
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
                  <>
                    {/* La bande est PASSÉE à l'étape, pas posée autour :
                        l'ordre de lecture va du titre d'étape au plateau
                        concerné, pas l'inverse. */}
                    <StepDate
                      contextBanner={
                        <StepBand sticky className="md:gap-4">
                          {/* « Plateau 01 / 02 » se lisait comme une date, et
                              disait le rang que les pastilles à droite montrent
                              déjà — avec le total, et en permettant d'y aller.
                              Ne reste que le libellé, en gris : l'orange est
                              l'accent d'ACTION du site, pas celui d'un contexte. */}
                          <MonoLabel tone="muted" className="whitespace-nowrap">
                            {t('booking.stageFallback')}
                          </MonoLabel>
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
                                  // Une pastille dit deux choses : où l'on est
                                  // (l'inversion, comme partout dans le site) et si
                                  // la date est posée (le ✓). L'aplat orange les
                                  // confondait — une pastille orange pouvait
                                  // signifier « en cours » ou « fait » selon
                                  // l'ordre du ternaire.
                                  className={cn(
                                    'h-auto min-w-7 px-2.5 py-1 text-xs tracking-wider',
                                    active &&
                                      'dark border-foreground bg-background',
                                  )}
                                >
                                  {ordinal(i)}
                                  {has ? ' ✓' : ''}
                                </Button>
                              );
                            })}
                          </div>
                        </StepBand>
                      }
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
                  </>
                );
              })()}
          </div>

          {saveError && (
            <Alert
              variant="destructive"
              // `flex` surcharge le `grid` de la primitive : posé dessus,
              // `justify-between` n'alignait rien et le bouton de fermeture
              // passait à la ligne sous le message.
              className="flex shrink-0 items-center justify-between gap-4 rounded-none border-x-0 border-b-0 px-pad-cell py-3"
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
            // Une seule action, donc le PAVÉ du site et non une barre : `CtaCell`
            // porte les trois paliers de `--spacing-cta`, la flèche et son
            // retrait, le survol. Le configurateur avait sa propre géométrie —
            // `min-h-11`, `px-5 py-3`, une flèche de 14px écrite en attributs.
            // Le mode manuel garde sa barre : il y loge jusqu'à trois actions.
            // `border-t`, comme la barre du mode manuel : la couture du bas de
            // colonne appartient à ce qui vient APRÈS, pas au dernier bloc. On
            // l'avait laissée au bloc au motif qu'il ferme son propre contenu —
            // ce qui n'est vrai que des grilles de TUILES, seules à prendre la
            // hauteur restante. Sous un bloc à champ, le contenu s'arrête à la
            // cellule et l'aplat orange flottait au bas de plusieurs centaines de
            // pixels de blanc, sans rien pour le poser.
            //
            // `-mt-px` fond les deux filets quand ils se touchent, et c'est le
            // seul endroit d'où on peut le faire : le bloc ne sait pas s'il y a
            // un après. Ils se touchent dans deux cas, pas un — une grille de
            // tuiles, qui descend toujours jusqu'ici, et n'importe quel bloc dès
            // que l'écran est trop court pour lui, ce qui est la règle en mobile.
            // Sans ça le trait sort à 2px ; ailleurs le pavé remonte d'un pixel
            // sur du blanc, ce qui ne se voit pas.
            <CtaCell
              size="cta"
              title={t('booking.continueToBooking')}
              onClick={applyConfig}
              disabled={!canNext()}
              className="-mt-px shrink-0 border-t border-border"
            />
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
      </main>
    </PageShell>
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
