import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowRight, X } from 'lucide-react';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  confirmationPath,
  pathForStep,
  type BookMode,
} from './book/book-routes';
import {
  STEP,
  canGoNext,
  resolveSlotList,
  stepsFor,
} from './book/booking-steps';
import type { BookPageProps, ContactState } from './book/booking-types';
import { PRODUCTS, catLabel, findEntry } from './book/catalog';
import {
  saveConfirmation,
  type ConfirmationMode,
  type ConfirmationSessionSlot,
} from './book/confirmation-snapshot';
import {
  buildBookingHubspotFields,
  buildCollectedFormFields,
} from './book/hubspot-fields';
import { BookingSidePanel } from './book/booking-side-panel';
import { MultiPlateauStep } from './book/multi-plateau-step';
import { buildSlotLabels } from './book/slot-labels';
import { StepConfigurator } from './book/steps/step-configurator';
import { StepContact } from './book/steps/step-contact';
import { StepDate } from './book/steps/step-date';
import { StepDuration } from './book/steps/step-duration';
import { StepPlateau } from './book/steps/step-plateau';
import { StepPostprod } from './book/steps/step-postprod';
import { StepTeam } from './book/steps/step-team';
import { useT } from './i18n/use-t';
import { clearAvailabilityCache } from './lib/availability';
import type {
  BookPlateau,
  BookingSession,
  BookingSessionData,
  ConfigGlobal,
  DateSelection,
  PostprodState,
  PriceBreakdown,
  QuoteLabels,
  Recommendation,
  SlotState,
  TeamState,
} from './lib/booking-engine';
import {
  BOOK_PLATEAUX,
  buildSessionsData as buildSessionsDataEngine,
  computePostprodPrice,
  makeBlankSession,
  computePriceBreakdown,
  dailyOccupancyHoursFor,
  recommendProjectLevel,
  recommendSession,
  rentalHoursFor,
  slotIdFor,
} from './lib/booking-engine';
import { validateContact, type ContactFormErrors } from './lib/booking-schema';
import { createBooking } from './lib/bookings';
import { DAYS, MONTHS } from './lib/format';
import {
  HUBSPOT_BOOKING_FORM_ID,
  submitHubspotForm,
} from './lib/hubspot-forms';
import { usePageContext } from './lib/page-context';
import {
  clearDraft,
  loadDraft,
  useBookingDraftSaver,
} from './lib/use-booking-draft';
import { PageHeader } from './ui/page-header';

// CGV consent is deliberately not persisted across a real browser refresh (the
// user must tick it again), but it MUST survive configurator step navigation:
// each step is its own route, so BookPage remounts and rehydrates from the
// draft between steps. This module-scoped flag tells the two apart — a genuine
// refresh re-evaluates the module (flag back to false), while in-session step
// nav keeps it. Without this, the box ticked on the contact step is dropped by
// the date step and the final"Réserver" submit fails its contact validation.
let cgvConsentGivenThisSession = false;

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

// Créneau vierge. Le cyclorama n'a pas de `slotType` : sa durée passe par
// `cycloMode` (cf. rentalHoursFor dans booking-engine).
const makeSlotState = (plateauKey: string): SlotState => ({
  plateauKey,
  slotType: BOOK_PLATEAUX.find((x) => x.k === plateauKey)?.isCyclo
    ? null
    : 'hour',
  hours: 1,
  cycloMode: 'halfH',
  paint: false,
  kwh: 0,
  team: {},
  postprod: {},
});

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
  const navigate = useNavigate();
  const today = new Date();
  const [draft] = useState(() => loadDraft());
  // Manual mode keeps a single URL (/reserver/manuel) and tracks the current
  // step in the `?step=N` search param instead of routing per step, so
  // reloading the page keeps the user on the step they were on. Configurator
  // mode uses TanStack routes per step and ignores this query parameter.
  // Non-strict: BookPage also renders on the configurator routes, which
  // don't declare `step`.
  const { step: manualStepQuery = null } = useSearch({ strict: false }) as {
    step?: number;
  };
  const setManualStepQuery = (n: number) =>
    navigate({ to: '.', search: { step: n }, replace: true });
  const [step, setStep] = useState<number>(() => {
    if (forceManual && manualStepQuery != null) return manualStepQuery;
    if (forcedStep != null) return forcedStep;
    if (draft) return draft.step;
    return STEP.PLATEAU;
  });
  const [configGlobal, setConfigGlobal] = useState<ConfigGlobal>(() =>
    draft
      ? (draft.configGlobal as ConfigGlobal)
      : { projectType: 'ecom', urgency: 'flex', postprod: false },
  );
  const [configSessions, setConfigSessions] = useState<BookingSession[]>(() =>
    draft ? (draft.configSessions as BookingSession[]) : [makeBlankSession()],
  );
  const [activeSessionIdx, setActiveSessionIdx] = useState<number>(() =>
    draft ? draft.activeSessionIdx : 0,
  );
  const [configApplied, setConfigApplied] = useState<boolean>(() => {
    if (forceManual) return false;
    if (
      forcedStep != null &&
      forcedStep !== STEP.CONFIG &&
      forcedStep !== STEP.PLATEAU
    ) {
      return true;
    }
    return draft ? draft.configApplied : false;
  });
  const [plateau, setPlateau] = useState<string | null>(
    () => draft?.plateau ?? null,
  );
  const [slotIds, setSlotIds] = useState<string[]>(() =>
    draft ? draft.slotIds : plateau ? [plateau] : [],
  );
  const [slots, setSlots] = useState<Record<string, SlotState>>(() => {
    if (draft) return draft.slots as Record<string, SlotState>;
    if (!plateau) return {};
    return { [plateau]: makeSlotState(plateau) };
  });
  const togglePlateau = (k: string) => {
    setSlotIds((prev) => {
      const isAdding = !prev.includes(k);
      const next = isAdding ? [...prev, k] : prev.filter((x) => x !== k);
      setPlateau(next[0] || null);
      if (isAdding) {
        setSlots((p) => ({ ...p, [k]: makeSlotState(k) }));
      } else {
        setSlots((p) => {
          const n = { ...p };
          delete n[k];
          return n;
        });
      }
      return next;
    });
  };
  // The calendar's displayed month is ephemeral UI state, not user intent — never
  // restore it from the draft (a stale draft would reopen on a past month). Derive
  // it from the selected date when it's still in the future, otherwise from today.
  const initialView = (() => {
    const sel = draft?.selected;
    if (
      sel &&
      new Date(sel.y, sel.m, 1) >=
        new Date(today.getFullYear(), today.getMonth(), 1)
    ) {
      return { y: sel.y, m: sel.m };
    }
    return { y: today.getFullYear(), m: today.getMonth() };
  })();
  const [viewY, setViewY] = useState<number>(() => initialView.y);
  const [viewM, setViewM] = useState<number>(() => initialView.m);
  const [selected, setSelected] = useState<DateSelection | null>(() =>
    draft ? draft.selected : null,
  );
  const [arrivalHour, setArrivalHour] = useState<number>(() =>
    draft ? draft.arrivalHour : 10,
  );
  const [dateIdx, setDateIdx] = useState<number>(() =>
    draft ? draft.dateIdx : 0,
  );
  const [slotType, setSlotType] = useState<string>(() =>
    draft ? draft.slotType : 'hour',
  );
  const [hours, setHours] = useState<number>(() => (draft ? draft.hours : 1));
  const [cycloMode, setCycloMode] = useState<string>(() =>
    draft ? draft.cycloMode : 'halfH',
  );
  const [paint, setPaint] = useState<boolean>(() =>
    draft ? draft.paint : false,
  );
  const [kwh, setKwh] = useState<number>(() => (draft ? draft.kwh : 0));
  const [team, setTeam] = useState<TeamState>(() =>
    draft ? (draft.team as TeamState) : {},
  );
  const [pp, setPp] = useState<Record<string, unknown>>(() =>
    draft ? draft.pp : {},
  );
  const [contact, setContact] = useState<ContactState>(() =>
    draft
      ? {
          ...(draft.contact as unknown as ContactState),
          cgvAccepted: cgvConsentGivenThisSession,
        }
      : {
          marque: '',
          societe: '',
          siren: '',
          adresseFacturation: '',
          nom: '',
          prenom: '',
          email: '',
          tel: '',
          typesArticles: [],
          quantiteArticles: '',
          vuesParArticle: '',
          autresInfos: '',
          cgvAccepted: false,
        },
  );
  const [contactErrors, setContactErrors] = useState<ContactFormErrors>({});
  // Keep the session-scoped consent flag in sync with the live checkbox so it
  // carries across step remounts (see cgvConsentGivenThisSession above).
  useEffect(() => {
    cgvConsentGivenThisSession = contact.cgvAccepted;
  }, [contact.cgvAccepted]);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [availRefreshKey, setAvailRefreshKey] = useState(0);
  const saveDraft = useBookingDraftSaver(() => ({
    step,
    configGlobal,
    configSessions,
    activeSessionIdx,
    configApplied,
    plateau,
    slotIds,
    slots,
    slotType,
    hours,
    cycloMode,
    paint,
    kwh,
    team,
    pp,
    contact: contact as unknown as Record<string, unknown>,
    selected,
    arrivalHour,
    dateIdx,
    viewY,
    viewM,
  }));
  useEffect(saveDraft, [
    step,
    configGlobal,
    configSessions,
    activeSessionIdx,
    configApplied,
    plateau,
    slotIds,
    slots,
    slotType,
    hours,
    cycloMode,
    paint,
    kwh,
    team,
    pp,
    contact,
    selected,
    arrivalHour,
    dateIdx,
    viewY,
    viewM,
    saveDraft,
  ]);
  useEffect(() => {
    if (forcedStep == null) return;
    if (step !== forcedStep) setStep(forcedStep);
  }, [forcedStep]);
  useEffect(() => {
    if (forceManual && configApplied) setConfigApplied(false);
  }, [forceManual]);
  // Manual mode: sync the URL ?step= ↔ internal step state. The pair of
  // effects below stops looping once the two sides agree (the equality
  // guards short-circuit on the second pass).
  useEffect(() => {
    if (!forceManual) return;
    if (manualStepQuery != null && manualStepQuery !== step) {
      setStep(manualStepQuery);
    }
  }, [manualStepQuery, forceManual]);
  useEffect(() => {
    if (!forceManual) return;
    if (step !== manualStepQuery) {
      setManualStepQuery(step);
    }
  }, [step, forceManual]);
  const goToStep = useCallback(
    (n: number, modeOverride?: BookMode) => {
      setStep(n);
      const nextMode: BookMode =
        modeOverride ??
        (forceManual
          ? 'manual'
          : configApplied || n === 0
            ? 'config'
            : 'manual');
      const target = pathForStep(lang, nextMode, n);
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== target
      ) {
        navigate({ to: target });
      }
    },
    [lang, configApplied, forceManual, navigate],
  );
  const months = MONTHS[lang];
  const days = DAYS[lang];
  const p = BOOK_PLATEAUX.find((x) => x.k === plateau) || NO_PLATEAU;
  // Deux questions distinctes : ce qu'on facture et persiste (rentalHours), et ce
  // que le calendrier doit trouver de libre sur une seule journée (availabilityHours).
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
  const calCells = useMemo<(number | null)[]>(() => {
    const first = new Date(viewY, viewM, 1);
    const dow = (first.getDay() + 6) % 7;
    const ndays = new Date(viewY, viewM + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < dow; i++) arr.push(null);
    for (let d = 1; d <= ndays; d++) arr.push(d);
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [viewY, viewM]);
  const nextMonth = () => {
    let m = viewM + 1,
      y = viewY;
    if (m > 11) {
      m = 0;
      y++;
    }
    setViewM(m);
    setViewY(y);
  };
  const prevMonth = () => {
    let m = viewM - 1,
      y = viewY;
    if (m < 0) {
      m = 11;
      y--;
    }
    setViewM(m);
    setViewY(y);
  };
  const isPast = (d: number | null) => {
    if (!d) return true;
    const dt = new Date(viewY, viewM, d);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dt < t;
  };
  // Une seule validation par changement d'état, partagée par la garde de
  // navigation et par la soumission. `canNext()` est appelé une dizaine de fois
  // par rendu (rail d'étapes, nav mobile, barre d'actions) : sans mémo, chaque
  // appel relançait le schéma Zod. Dépend de `p.isCyclo`/`p.isVisite` et non de
  // `p` — `p` est un objet neuf à chaque rendu quand aucun plateau ne
  // correspond, ce qui annulerait le mémo.
  const contactValidation = useMemo(() => {
    const requireProductFields = !p.isCyclo && !p.isVisite && !configApplied;
    return validateContact(contact, lang as 'fr' | 'en', {
      requireProductFields,
    });
  }, [p.isCyclo, p.isVisite, configApplied, contact, lang]);
  const contactValid = () => contactValidation.success;
  const runContactValidation = useCallback(() => {
    if (!contactValidation.success) {
      setContactErrors(contactValidation.errors);
      return false;
    }
    setContactErrors({});
    return true;
  }, [contactValidation]);
  const handleContactNext = (nextN: number | null) => {
    if (!runContactValidation()) return;
    if (nextN !== null) goToStep(nextN);
  };
  const canNext = () =>
    canGoNext({
      step,
      configSessions,
      slotIds,
      plateau,
      slots,
      selected,
      contactValid: contactValid(),
    });
  const canQuote = () => contactValid();
  const mode: BookMode =
    configApplied || step === STEP.CONFIG ? 'config' : 'manual';
  const STEPS = stepsFor(mode, t);
  const seedFromConfig = () => {
    const validRecs: {
      session: BookingSession;
      sessionIdx: number;
      rec: Recommendation;
    }[] = [];
    configSessions.forEach((s, idx) => {
      const valid =
        s.projectType === 'cyclorama' ||
        (s.projectType === 'ecom' && s.product && Number(s.quantity) > 0);
      if (!valid) return;
      validRecs.push({
        session: s,
        sessionIdx: idx,
        rec: recommendSession(s, configGlobal),
      });
    });
    if (validRecs.length === 0) return null;
    const sessions = validRecs.map((v) => v.session);
    const proj = recommendProjectLevel(sessions, configGlobal);
    setSlots((prev) => {
      const next: Record<string, SlotState> = {};
      const prevBySessionIdx = new Map<number, SlotState>();
      Object.values(prev).forEach((s) => {
        if (s && s.configSessionIdx != null)
          prevBySessionIdx.set(s.configSessionIdx, s);
      });
      validRecs.forEach(({ session, sessionIdx, rec }) => {
        const id = slotIdFor(rec.plateau, sessionIdx);
        const pxInfo = BOOK_PLATEAUX.find((x) => x.k === rec.plateau);
        const isCyclo = !!(pxInfo && pxInfo.isCyclo);
        const teamCopy = { ...(proj.team || {}) };
        if (isCyclo) {
          delete teamCopy.styliste_op;
          delete teamCopy.operateur;
        }
        const ppPrice = session.postprod ? computePostprodPrice(session) : null;
        const sessPP: PostprodState = session.postprod
          ? {
              enabled: true,
              video: !!session.postprodVideo,
              amount: ppPrice ? ppPrice.amount : 0,
              images: ppPrice ? ppPrice.images : 0,
              breakdown: ppPrice ? ppPrice.breakdown : [],
              perView: ppPrice ? !!ppPrice.perView : false,
            }
          : {};
        // Preserve user customizations by session index — survives slotId change
        // when a session is retargeted to a different plateau.
        const preserved = prev[id] ?? prevBySessionIdx.get(sessionIdx);
        // For cyclo plateaus, drop styliste_op/operateur from preserved team
        // (they don't apply on cyclorama).
        const preservedTeam = preserved?.team ? { ...preserved.team } : null;
        if (preservedTeam && isCyclo) {
          delete preservedTeam.styliste_op;
          delete preservedTeam.operateur;
        }
        next[id] = {
          plateauKey: rec.plateau,
          slotType: rec.slotType || 'hour',
          hours: rec.hours || 1,
          cycloMode: rec.cycloMode || 'halfH',
          paint: preserved?.paint ?? false,
          kwh: preserved?.kwh ?? 0,
          team: preservedTeam ?? teamCopy,
          postprod: sessPP,
          date: preserved?.date ?? null,
          arrivalHour: preserved?.arrivalHour,
          configSessionIdx: sessionIdx,
        };
      });
      return next;
    });
    const newIds = validRecs.map((v) => slotIdFor(v.rec.plateau, v.sessionIdx));
    setSlotIds(newIds);
    const firstRec = validRecs[0].rec;
    setPlateau(firstRec.plateau);
    if (firstRec.cycloMode) setCycloMode(firstRec.cycloMode);
    if (firstRec.slotType) {
      setSlotType(firstRec.slotType);
      setHours(firstRec.hours);
    }
    setTeam(proj.team);
    setPp({});
    return {
      sessions,
      recs: validRecs.map((v) => ({ session: v.session, ...v.rec })),
      proj,
    };
  };
  const applyConfig = () => {
    const seeded = seedFromConfig();
    if (!seeded) return;
    const { sessions, recs } = seeded;
    const productLabels = sessions
      .map((s) => catLabel(t, findEntry(PRODUCTS, s.product)))
      .filter(Boolean);
    const totalSKUs = sessions.reduce(
      (sum, s) => sum + (Number(s.quantity) || 0),
      0,
    );
    const briefLines: string[] = [];
    if (recs.length > 1) {
      briefLines.push(t('booking.multiStageProject', { count: recs.length }));
    }
    recs.forEach((r, i) => {
      const px = BOOK_PLATEAUX.find((x) => x.k === r.plateau);
      const s = r.session;
      const productLbl =
        catLabel(t, findEntry(PRODUCTS, s.product)) || s.product;
      const subLbl = s.submethod ? ` · ${s.submethod}` : '';
      const mediaLbl = (s.media || []).length
        ? ` (${(s.media || []).join('+')})`
        : '';
      const dur = r.onRequest
        ? t('common.onRequest')
        : r.slotType === 'full'
          ? (() => {
              const totalH = r.hours || (r.totalDays ? r.totalDays * 8 : 8);
              const fd = Math.floor(totalH / 8);
              const ex = totalH - fd * 8;
              if (ex === 0) return fd > 1 ? `${fd}×8h` : '8h';
              return `${fd}×8h+${ex}h`;
            })()
          : r.slotType === 'half'
            ? `${r.hours}h (½j)`
            : `${r.hours}h`;
      briefLines.push(
        `\n${t('booking.session')} ${i + 1} — ${productLbl}${subLbl}${mediaLbl} → ${px ? px[lang] : r.plateau} · ${dur}`,
      );
      briefLines.push(
        ` ${t('booking.quantity')} : ${s.quantity} ${t('booking.products')}`,
      );
      if (s.views && s.views.length) {
        briefLines.push(` ${t('booking.views')} : ${s.views.join(', ')}`);
      } else if (s.viewsCount) {
        briefLines.push(` ${t('booking.viewsPerProduct')} : ${s.viewsCount}`);
      }
      if (s.postprod) {
        briefLines.push(
          ` ${t('booking.postProduction')} : ${t('booking.yes')}${s.postprodVideo ? ` + ${t('booking.videoEdit')}` : ''}`,
        );
      }
    });
    setContact((c) => ({
      ...c,
      typesArticles: productLabels,
      quantiteArticles: String(totalSKUs || ''),
      vuesParArticle: '',
      autresInfos: c.autresInfos || '',
    }));
    setConfigApplied(true);
    goToStep(STEP.DURATION, 'config');
  };
  // Remet à zéro tout ce que l'utilisateur a choisi côté créneaux — les
  // coordonnées et les sessions du configurateur ne bougent pas.
  const resetSelection = () => {
    setPlateau(null);
    setSlotIds([]);
    setSlots({});
    setSlotType('hour');
    setHours(1);
    setCycloMode('halfH');
    setPaint(false);
    setKwh(0);
    setTeam({});
    setPp({});
    setSelected(null);
  };
  const skipConfig = () => {
    setConfigApplied(false);
    setSlotIds([]);
    setSlots({});
    setPlateau(null);
    goToStep(STEP.PLATEAU, 'manual');
  };
  useEffect(() => {
    // Auto-seed slots from configurator state when:
    // - the user is actively editing on step 0 (live preview), OR
    // - the user has applied the configurator (configApplied).
    // In any other situation (manual flow, forced manual), do NOT auto-seed —
    // would clobber the user's manual selections.
    if (forceManual) return;
    if (!configApplied && step !== STEP.CONFIG) return;
    const hasValid = configSessions.some(
      (s) =>
        s.projectType === 'cyclorama' ||
        (s.projectType === 'ecom' && s.product && Number(s.quantity) > 0),
    );
    if (!hasValid) return;
    seedFromConfig();
  }, [configSessions, configGlobal, configApplied, step, forceManual]);
  const contentScrollRef = useRef<HTMLFormElement | null>(null);
  const innerScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
    if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0;
  }, [step, dateIdx]);
  useEffect(() => {
    if (step === STEP.DATE) setDateIdx(0);
  }, [step]);

  const buildSessionsData = useCallback(
    (): BookingSessionData[] =>
      buildSessionsDataEngine({
        slotIds,
        plateau,
        slots,
        configApplied,
        configSessions,
        fallbackQuantity: Number(contact.quantiteArticles) || 0,
        selected,
        arrivalHour: arrivalHour ?? null,
      }),
    [
      slotIds,
      plateau,
      slots,
      configApplied,
      configSessions,
      contact.quantiteArticles,
      selected,
      arrivalHour,
    ],
  );

  const handleSubmit = useCallback(
    async (submitMode: 'quote' | 'booking' | 'request') => {
      if (!runContactValidation()) {
        // Submit happens from the date step, but contact errors (incl. CGV)
        // render on the contact step. Route there so the user sees what's
        // missing instead of the button appearing to do nothing.
        goToStep(5);
        return;
      }
      contentScrollRef.current?.requestSubmit();
      setSaving(true);
      setSaveError(null);
      try {
        const sessionsData = buildSessionsData();
        const firstDate =
          selected ||
          (() => {
            const ids = slotIds ?? [];
            for (const id of ids) {
              const st = slots[id];
              if (st?.date) return st.date;
            }
            return null;
          })();
        const result = await createBooking({
          mode: submitMode,
          contact,
          projectType: configGlobal.projectType || null,
          urgency: configGlobal.urgency || null,
          sessions: sessionsData,
          quote: { rows: priceBreakdown.rows, total: priceBreakdown.total },
          preferredDate: firstDate,
          arrivalHour: arrivalHour ?? null,
        });
        // Best-effort HubSpot form submission, from the browser so the visitor's
        // hubspotutk cookie preserves the contact's Original Source. Never awaited:
        // a CRM issue must not block the confirmation.
        void submitHubspotForm(
          HUBSPOT_BOOKING_FORM_ID,
          buildBookingHubspotFields({
            mode: submitMode,
            reference: result.reference ?? null,
            contact,
            projectType: configGlobal.projectType || null,
            urgency: configGlobal.urgency || null,
            plateau,
            slotIds,
            slots,
            selected: firstDate,
            arrivalHour: arrivalHour ?? null,
            rentalHours,
            total: priceBreakdown.total,
          }),
          { pageName: 'Booking' },
        );
        const snapSessions: ConfirmationSessionSlot[] = sessionsData.map(
          (s) => {
            const px = BOOK_PLATEAUX.find((x) => x.k === s.plateauKey);
            const h = s.cycloMode
              ? s.cycloMode === 'halfH'
                ? 5
                : 10
              : s.hours || 1;
            return {
              plateauKey: s.plateauKey,
              plateauName: {
                fr: px?.fr ?? s.plateauKey,
                en: px?.en ?? s.plateauKey,
              },
              date: s.date,
              arrivalHour: s.arrivalHour,
              hours: h,
            };
          },
        );
        saveConfirmation({
          mode: submitMode as ConfirmationMode,
          savedRef: result.reference ?? null,
          plateauKey: p.k || null,
          plateauName: { fr: p.fr, en: p.en },
          selected: firstDate,
          arrivalHour: arrivalHour ?? null,
          rentalHours,
          slotIds,
          slots: slots as Record<string, unknown>,
          sessions: snapSessions,
          contact: contact as unknown as Record<string, unknown>,
          total: priceBreakdown.total,
          rows: priceBreakdown.rows as unknown[],
          isCyclo: !!p.isCyclo,
        });
        clearDraft();
        navigate({ to: confirmationPath(lang) });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('réservé') || msg.includes('already booked')) {
          clearAvailabilityCache();
          setAvailRefreshKey((k) => k + 1);
        }
        setSaveError(msg || t('booking.saveError'));
      } finally {
        setSaving(false);
      }
    },
    [
      runContactValidation,
      buildSessionsData,
      selected,
      slotIds,
      slots,
      contact,
      configGlobal,
      priceBreakdown,
      arrivalHour,
      lang,
      p,
      plateau,
      rentalHours,
      navigate,
      goToStep,
    ],
  );

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
        aria-label="Booking"
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
                    nextMonth={nextMonth}
                    prevMonth={prevMonth}
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
                    nextMonth={nextMonth}
                    prevMonth={prevMonth}
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
                            !canQuote() && 'opacity-30',
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
