import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { usePageContext } from './lib/page-context';
import { Empty, EmptyTitle } from '@/components/ui/empty';
import { ArrowRight } from 'lucide-react';
import { PageHeader, buildMainNav } from './ui/page-header';
import { CellLabel } from './ui/typography';
import { createBooking } from './lib/bookings';
import {
  submitHubspotForm,
  HUBSPOT_BOOKING_FORM_ID,
} from './lib/hubspot-forms';
import { validateContact, type ContactFormErrors } from './lib/booking-schema';
import {
  loadDraft,
  clearDraft,
  useBookingDraftSaver,
} from './lib/use-booking-draft';
import {
  useAvailability,
  isHourBlocked,
  clearAvailabilityCache,
} from './lib/availability';
import {
  BOOK_PLATEAUX,
  EQUIPE,
  fmtEUR,
  slotIdFor,
  recommendSession,
  recommendProjectLevel,
  computePostprodPrice,
  makeBlankSession,
  isSessionValid,
  computePriceBreakdown,
  rentalHoursFor,
  dailyOccupancyHoursFor,
  buildSessionsData as buildSessionsDataEngine,
} from './lib/booking-engine';
import type {
  BookingSessionData,
  BookPlateau,
  BookingSession,
  ConfigGlobal,
  DateSelection,
  TeamState,
  PostprodState,
  SlotState,
  PriceBreakdown,
  Recommendation,
  QuoteLabels,
} from './lib/booking-engine';
import { Trans } from 'react-i18next';
import { useT } from './i18n/use-t';
import { DAYS, MONTHS } from './lib/format';
import { cn } from '@/lib/utils';
import {
  pathForStep,
  confirmationPath,
  type BookMode,
} from './book/book-routes';
import {
  saveConfirmation,
  type ConfirmationMode,
  type ConfirmationSessionSlot,
} from './book/confirmation-snapshot';

type AnyProps = Record<string, any>;

interface ContactState {
  marque: string;
  societe: string;
  siren: string;
  adresseFacturation: string;
  nom: string;
  prenom: string;
  email: string;
  tel: string;
  typesArticles: string[];
  quantiteArticles: string;
  vuesParArticle: string;
  autresInfos: string;
  cgvAccepted: boolean;
  autreType?: string;
}

interface BookPageV2Props {
  forcedStep?: number;
  forceManual?: boolean;
}

// CGV consent is deliberately not persisted across a real browser refresh (the
// user must tick it again), but it MUST survive configurator step navigation:
// each step is its own route, so BookPageV2 remounts and rehydrates from the
// draft between steps. This module-scoped flag tells the two apart — a genuine
// refresh re-evaluates the module (flag back to false), while in-session step
// nav keeps it. Without this, the box ticked on the contact step is dropped by
// the date step and the final "Réserver" submit fails its contact validation.
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

const BookPageV2 = ({ forcedStep, forceManual }: BookPageV2Props = {}) => {
  const t = useT();
  const { lang, setLang, openMenu, goto } = usePageContext();
  const navigate = useNavigate();
  const today = new Date();
  const [draft] = useState(() => loadDraft());
  // Manual mode keeps a single URL (/reserver/manuel) and tracks the current
  // step in the `?step=N` search param instead of routing per step, so
  // reloading the page keeps the user on the step they were on. Configurator
  // mode uses TanStack routes per step and ignores this query parameter.
  // Non-strict: BookPageV2 also renders on the configurator routes, which
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
    try {
      if (localStorage.getItem('edo-book-plateau')) return 1;
    } catch (e) {}
    return 1;
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
    if (forcedStep != null && forcedStep !== 0 && forcedStep !== 1) return true;
    return draft ? draft.configApplied : false;
  });
  const [plateau, setPlateau] = useState<string | null>(() => {
    if (draft) return draft.plateau;
    try {
      const pre = localStorage.getItem('edo-book-plateau');
      if (pre) {
        localStorage.removeItem('edo-book-plateau');
        return pre;
      }
    } catch (e) {}
    return null;
  });
  const [slotIds, setSlotIds] = useState<string[]>(() =>
    draft ? draft.slotIds : plateau ? [plateau] : [],
  );
  const [slots, setSlots] = useState<Record<string, SlotState>>(() => {
    if (draft) return draft.slots as Record<string, SlotState>;
    if (!plateau) return {};
    const px = BOOK_PLATEAUX.find((x) => x.k === plateau);
    return {
      [plateau]: {
        plateauKey: plateau,
        slotType: px && px.isCyclo ? null : 'hour',
        hours: 1,
        cycloMode: 'halfH',
        paint: false,
        kwh: 0,
        team: {},
        postprod: {},
      },
    };
  });
  const togglePlateau = (k: string) => {
    setSlotIds((prev) => {
      const isAdding = !prev.includes(k);
      const next = isAdding ? [...prev, k] : prev.filter((x) => x !== k);
      setPlateau(next[0] || null);
      if (isAdding) {
        const px = BOOK_PLATEAUX.find((x) => x.k === k);
        setSlots((p) => ({
          ...p,
          [k]: {
            plateauKey: k,
            slotType: px && px.isCyclo ? null : 'hour',
            hours: 1,
            cycloMode: 'halfH',
            paint: false,
            kwh: 0,
            team: {},
            postprod: {},
          },
        }));
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
  const contactValid = () => {
    const requireProductFields = !p.isCyclo && !p.isVisite && !configApplied;
    const result = validateContact(contact, lang as 'fr' | 'en', {
      requireProductFields,
    });
    return result.success;
  };
  // Memoised because `handleSubmit` captures it: as a plain function it was only
  // kept fresh by `configApplied` transitively re-creating `buildSessionsData`,
  // which is in handleSubmit's deps. Depend on `p.isCyclo`/`p.isVisite` rather
  // than `p` — `p` is a new object literal on every render when no plateau
  // matches, which would defeat the memo.
  const runContactValidation = useCallback(() => {
    const requireProductFields = !p.isCyclo && !p.isVisite && !configApplied;
    const result = validateContact(contact, lang as 'fr' | 'en', {
      requireProductFields,
    });
    if (!result.success) {
      setContactErrors(result.errors);
      return false;
    }
    setContactErrors({});
    return true;
  }, [p.isCyclo, p.isVisite, configApplied, contact, lang]);
  const handleContactNext = (nextN: number | null) => {
    if (!runContactValidation()) return;
    if (nextN !== null) goToStep(nextN);
  };
  const canNext = () => {
    if (step === 0)
      return (
        (configSessions || []).length > 0 &&
        configSessions.every(isSessionValid)
      );
    if (step === 1) return (slotIds && slotIds.length > 0) || !!plateau;
    if (step === 2) return true;
    if (step === 5) return contactValid();
    if (step === 6) {
      const list =
        slotIds && slotIds.length > 0 ? slotIds : plateau ? [plateau] : [];
      if (list.length <= 1) return !!selected;
      return list.every(
        (id) => slots[id] && slots[id].date && slots[id].arrivalHour != null,
      );
    }
    return true;
  };
  const canQuote = () => contactValid();
  const mode = configApplied || step === 0 ? 'config' : 'manual';
  const STEPS =
    mode === 'config'
      ? [
          { n: 0, fr: 'Configurateur', en: 'Configurator' },
          { n: 2, fr: 'Créneau', en: 'Slot' },
          { n: 3, fr: 'Équipe', en: 'Team' },
          { n: 5, fr: 'Coordonnées', en: 'Contact' },
          { n: 6, fr: 'Date', en: 'Date' },
        ]
      : [
          { n: 1, fr: 'Plateau', en: 'Stage' },
          { n: 2, fr: 'Créneau', en: 'Slot' },
          { n: 3, fr: 'Équipe', en: 'Team' },
          { n: 4, fr: 'Post-prod', en: 'Post-prod' },
          { n: 5, fr: 'Coordonnées', en: 'Contact' },
          { n: 6, fr: 'Date', en: 'Date' },
        ];
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
      .map((s) => {
        const p = PRODUCTS.find((x) => x.k === s.product);
        return p ? p[lang] : '';
      })
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
        PRODUCTS.find((x) => x.k === s.product)?.[lang] || s.product;
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
    goToStep(2, 'config');
  };
  const skipConfig = () => {
    setConfigApplied(false);
    setSlotIds([]);
    setSlots({});
    setPlateau(null);
    goToStep(1, 'manual');
  };
  useEffect(() => {
    // Auto-seed slots from configurator state when:
    // - the user is actively editing on step 0 (live preview), OR
    // - the user has applied the configurator (configApplied).
    // In any other situation (manual flow, forced manual), do NOT auto-seed —
    // would clobber the user's manual selections.
    if (forceManual) return;
    if (!configApplied && step !== 0) return;
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
    if (step === 6) setDateIdx(0);
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
            const ids = slotIds && slotIds.length > 0 ? slotIds : [];
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
    <div className="edo-page-enter grid w-full edo-hairline md:h-full md:overflow-hidden md:grid-cols-book md:grid-rows-app">
      {/* Unified header spans cols 1-3 — col 4 hosts the dark "Your Quote"
          label aligned with the quote panel below. Within the header subgrid
          (cols 1-3), the title sits in col 2 and the right block in col 3. */}
      <PageHeader
        lang={lang}
        title={t('booking.title')}
        className="col-span-full h-14 md:col-start-1 md:col-end-4 md:row-start-1 md:h-full"
        titleClassName="lg:col-start-2 lg:col-span-1"
        rightBlockClassName="lg:col-start-3"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={buildMainNav({ lang, goto })}
      />

      {/* Desktop col 4 – dark label matching quote panel below */}
      <div className="hidden md:flex h-full items-center bg-foreground px-6 md:col-start-4 md:row-start-1">
        <CellLabel className="text-white/55">
          {t('booking.yourQuote')}
        </CellLabel>
      </div>

      <nav
        aria-label={t('booking.bookingSteps')}
        className="md:hidden bg-white border-b border-hairline"
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
                  <button
                    type="button"
                    onClick={() => {
                      if (clickable) goToStep(s.n);
                    }}
                    aria-current={active ? 'step' : undefined}
                    aria-disabled={!clickable}
                    aria-label={`${i + 1}. ${s[lang]}`}
                    className={cn(
                      'edo-focus-ring p-2 -m-2 inline-flex items-center justify-center h-7 w-7 font-mono text-label tracking-meta transition-colors duration-150',
                      active && 'bg-primary text-white',
                      !active &&
                        done &&
                        'bg-foreground text-white cursor-pointer',
                      !active &&
                        !done &&
                        clickable &&
                        'bg-white text-foreground border border-foreground cursor-pointer',
                      !active &&
                        !done &&
                        !clickable &&
                        'bg-white text-muted-foreground border border-hairline opacity-50 cursor-not-allowed',
                    )}
                  >
                    {done ? '✓' : String(i + 1).padStart(2, '0')}
                  </button>
                </li>
                {i < STEPS.length - 1 && (
                  <li
                    aria-hidden
                    className={cn(
                      'flex-1 h-px mx-2',
                      i < curIdx ? 'bg-foreground' : 'bg-hairline',
                    )}
                  />
                )}
              </Fragment>
            );
          })}
        </ol>
        <div className="px-5 pb-4 pt-3 font-mono text-micro tracking-code uppercase">
          <span className="text-muted-foreground">
            {String(STEPS.findIndex((x) => x.n === step) + 1).padStart(2, '0')}{' '}
            ·{' '}
          </span>
          <span className="text-foreground">
            {STEPS.find((x) => x.n === step)?.[lang]}
          </span>
        </div>
      </nav>

      <div className="hidden md:flex md:col-start-1 md:row-start-2 md:flex-col md:overflow-y-auto md:min-h-0 bg-white">
        {STEPS.map((s, i) => {
          const active = step === s.n;
          const curIdx = STEPS.findIndex((x) => x.n === step);
          const done = curIdx > -1 && i < curIdx;
          const clickable =
            done || active || (i === curIdx + 1 && canNext()) || s.n === 0;
          return (
            <button
              type="button"
              key={s.n}
              onClick={() => {
                if (clickable) goToStep(s.n);
              }}
              className={`edo-focus-ring flex-none ${active ? 'bg-muted border-b-2 border-b-primary md:border-b-0 md:border-l-3 md:border-l-primary' : 'bg-transparent border-b-2 border-b-transparent md:border-b-0 md:border-l-3 md:border-l-transparent'} ${i < STEPS.length - 1 ? 'md:border-b md:border-b-border' : 'md:border-b-0'} px-4 h-12 md:px-6 md:h-control ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'} text-left flex items-center gap-3.5 transition-all duration-150 ${clickable ? 'opacity-100' : 'opacity-35'}`}
            >
              <span
                className={`font-mono text-label tracking-meta ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'} min-w-5.5`}
              >
                {done ? '✓' : String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={`text-detail ${active ? 'font-medium' : 'font-normal'} tracking-copy-tight text-foreground`}
              >
                {s[lang]}
              </span>
            </button>
          );
        })}
      </div>

      <form
        ref={contentScrollRef}
        name="booking"
        aria-label="Booking"
        onSubmit={(e) => e.preventDefault()}
        className="bg-white overflow-auto flex flex-col md:col-start-2 md:col-span-2 md:row-start-2 md:min-h-0"
      >
        {mode === 'manual' && (
          <div className="flex flex-col md:flex-row md:items-stretch md:min-h-control bg-muted box-border shrink-0 border-b border-hairline">
            <span className="font-mono text-micro tracking-code uppercase text-muted-foreground px-5 py-3 md:py-0 md:self-center md:pl-5 md:pr-3 flex-1 min-w-0 leading-relaxed">
              {t('booking.manualOr')}
              <span className="text-foreground">{t('booking.letUsGuide')}</span>
            </span>
            <div className="flex items-stretch border-t border-hairline md:border-t-0 md:flex-none md:w-1/2">
              <button
                type="button"
                onClick={() => {
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
                  goToStep(1, 'manual');
                }}
                className="edo-focus-ring flex-1 bg-transparent border-l border-hairline px-5 py-3 md:py-0 cursor-pointer font-mono text-micro tracking-code uppercase text-foreground whitespace-nowrap leading-normal inline-flex items-center justify-center transition-colors duration-150 hover:bg-white"
              >
                ↻ {t('common.reset')}
              </button>
              <button
                type="button"
                onClick={() => goToStep(0, 'config')}
                className="edo-focus-ring flex-1 bg-primary border-l border-hairline px-5 py-3 md:py-0 cursor-pointer font-mono text-label tracking-code uppercase text-white whitespace-nowrap leading-normal font-semibold inline-flex items-center justify-center transition-opacity duration-150 hover:opacity-90"
              >
                ← {t('booking.configurator')}
              </button>
            </div>
          </div>
        )}
        <div ref={innerScrollRef} className="flex-1 overflow-y-auto">
          {step === 0 && (
            <Step0Configurator
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
                setConfigApplied(false);
              }}
            />
          )}
          {step === 1 && (
            <Step1Plateau
              lang={lang}
              plateau={plateau}
              setPlateau={setPlateau}
              plateaus={slotIds}
              togglePlateau={togglePlateau}
              setCycloMode={setCycloMode}
              setSlotType={setSlotType}
              setHours={setHours}
              onConfigurator={() => goToStep(0, 'config')}
            />
          )}
          {step === 2 && (
            <MultiPlateauStep
              lang={lang}
              slotIds={slotIds.length ? slotIds : plateau ? [plateau] : []}
              slots={slots}
              setSlots={setSlots}
              fallback={{
                slotType,
                hours,
                cycloMode,
                setSlotType,
                setHours,
                setCycloMode,
              }}
              topBanner={(() => {
                const list = slotIds.length
                  ? slotIds
                  : plateau
                    ? [plateau]
                    : [];
                const allVisite =
                  list.length > 0 &&
                  list.every((id) => {
                    const pk = slots[id]?.plateauKey || id;
                    return BOOK_PLATEAUX.find((x) => x.k === pk)?.isVisite;
                  });
                if (allVisite) return null;
                return (
                  <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local">
                    <span className="edo-cell-label text-primary whitespace-nowrap">
                      02 · {t('booking.rentalDuration')}
                    </span>
                    <span className="font-mono text-label tracking-caption text-muted-foreground">
                      {list.length > 1
                        ? t('booking.chooseDurationEach')
                        : t('booking.chooseDurationSingle')}
                    </span>
                  </div>
                );
              })()}
              renderOne={(
                px: AnyProps,
                st: AnyProps,
                setSt: (patch: AnyProps) => void,
              ) => (
                <Step3Slot
                  lang={lang}
                  p={px}
                  slotType={st.slotType || 'hour'}
                  setSlotType={(v: string) => setSt({ slotType: v })}
                  hours={st.hours || 1}
                  setHours={(v: number) => setSt({ hours: v })}
                  cycloMode={st.cycloMode || 'halfH'}
                  setCycloMode={(v: string) => setSt({ cycloMode: v })}
                />
              )}
            />
          )}
          {step === 3 && (
            <MultiPlateauStep
              lang={lang}
              slotIds={slotIds.length ? slotIds : plateau ? [plateau] : []}
              slots={slots}
              setSlots={setSlots}
              fallback={{ team, setTeam }}
              topBanner={
                <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local">
                  <span className="edo-cell-label text-primary whitespace-nowrap">
                    03 · {t('booking.teamOptional')}
                  </span>
                </div>
              }
              renderOne={(
                px: AnyProps,
                st: AnyProps,
                setSt: (patch: AnyProps) => void,
              ) => (
                <Step5Team
                  lang={lang}
                  p={px}
                  team={st.team || {}}
                  configSessions={configSessions}
                  setTeam={(updater: any) => {
                    const next =
                      typeof updater === 'function'
                        ? updater(st.team || {})
                        : updater;
                    setSt({ team: next });
                  }}
                />
              )}
            />
          )}
          {step === 4 && (
            <MultiPlateauStep
              lang={lang}
              slotIds={slotIds.length ? slotIds : plateau ? [plateau] : []}
              slots={slots}
              setSlots={setSlots}
              fallback={{ postprod: {}, setPostprod: () => {} }}
              topBanner={
                <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local">
                  <span className="edo-cell-label text-primary whitespace-nowrap">
                    04 · {t('booking.postProdOptional')}
                  </span>
                </div>
              }
              renderOne={(
                px: AnyProps,
                st: AnyProps,
                setSt: (patch: AnyProps) => void,
              ) => (
                <Step6Postprod
                  lang={lang}
                  plateauKey={px && px.k}
                  postprod={st.postprod || {}}
                  setPostprod={(v: AnyProps) => setSt({ postprod: v })}
                />
              )}
            />
          )}
          {step === 5 && (
            <Step7Contact
              lang={lang}
              contact={contact}
              setContact={setContact}
              p={p}
              configMode={configApplied}
              errors={contactErrors}
            />
          )}
          {step === 6 &&
            (() => {
              const list =
                slotIds && slotIds.length > 0
                  ? slotIds
                  : plateau
                    ? [plateau]
                    : [];
              if (list.length <= 1) {
                return (
                  <Step2Date
                    lang={lang}
                    p={p}
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
              const sameKeyCount: Record<string, number> = {};
              list.forEach((xid) => {
                const xk = slots[xid]?.plateauKey || xid;
                sameKeyCount[xk] = (sameKeyCount[xk] || 0) + 1;
              });
              const seenIdxByKey: Record<string, number> = {};
              const slotLabel = (xid: string) => {
                const xk = slots[xid]?.plateauKey || xid;
                const xpx = BOOK_PLATEAUX.find((x) => x.k === xk);
                seenIdxByKey[xk] = (seenIdxByKey[xk] || 0) + 1;
                const n = seenIdxByKey[xk];
                return sameKeyCount[xk] > 1
                  ? `${xpx ? xpx[lang] : xk} ${String(n).padStart(2, '0')}`
                  : xpx
                    ? xpx[lang]
                    : xk;
              };
              const currentLabel = (() => {
                const tmpCount: Record<string, number> = {};
                for (let i = 0; i <= safeIdx; i++) {
                  const k = slots[list[i]]?.plateauKey || list[i];
                  tmpCount[k] = (tmpCount[k] || 0) + 1;
                }
                const pkCount = tmpCount[pk] || 1;
                return sameKeyCount[pk] > 1
                  ? `${px ? px[lang] : pk} ${String(pkCount).padStart(2, '0')}`
                  : px
                    ? px[lang]
                    : pk;
              })();
              return (
                <div>
                  <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 md:gap-4 bg-white flex-wrap sticky top-0 z-10">
                    <span className="edo-cell-label text-primary whitespace-nowrap">
                      {t('booking.stageFallback')}{' '}
                      {String(safeIdx + 1).padStart(2, '0')} /{' '}
                      {String(list.length).padStart(2, '0')}
                    </span>
                    <span className="text-detail font-normal tracking-copy-tight text-foreground">
                      {currentLabel}
                    </span>
                    <div className="flex gap-1.5 flex-wrap w-full md:w-auto md:ml-auto">
                      {list.map((xid, i) => {
                        const has = slots[xid] && slots[xid].date;
                        const active = i === safeIdx;
                        return (
                          <button
                            type="button"
                            key={xid}
                            onClick={() => setDateIdx(i)}
                            title={slotLabel(xid)}
                            className={`${active ? 'bg-foreground text-white border-foreground' : has ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border'} border px-2.5 py-1 cursor-pointer font-mono text-label tracking-ui min-w-7 text-center`}
                          >
                            {String(i + 1).padStart(2, '0')}
                            {has ? ' ✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Step2Date
                    lang={lang}
                    p={px}
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
          <div className="bg-red-50 border-t border-red-200 px-12 py-3 flex items-center justify-between shrink-0">
            <span className="text-red-700 text-caption">{saveError}</span>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="text-red-500 text-caption font-mono cursor-pointer border-0 bg-transparent hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}
        <BookingHubspotFields
          mode={mode}
          step={step}
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
        {step === 0 &&
          canNext() &&
          (() => {
            const recs = configSessions.map((s) => ({
              session: s,
              ...recommendSession(s, configGlobal),
            }));
            return (
              <div className="bg-foreground text-white shrink-0">
                <div className="flex flex-col md:flex-row md:items-stretch border-b border-white/10">
                  <span className="font-mono text-label tracking-meta uppercase tracking-label text-primary px-5 md:pl-6 md:pr-3 py-2 flex-1 min-w-0 md:self-center">
                    {t('booking.recapRecommendation')}
                  </span>
                  <span className="font-mono text-micro tracking-ui text-white/45 px-5 py-2 border-t border-white/10 md:border-t-0 md:self-center md:w-1/2 md:border-l md:border-white/10">
                    {t('booking.estimateTweakable')}
                  </span>
                </div>
                {recs.map((r, i) => {
                  const px =
                    BOOK_PLATEAUX.find((x) => x.k === r.plateau) ||
                    BOOK_PLATEAUX[0];
                  const pr = PRODUCTS.find((x) => x.k === r.session.product);
                  const productLabel =
                    r.session.projectType === 'cyclorama'
                      ? t('booking.cyclorama')
                      : pr?.[lang] || '';
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
                      className="px-5 md:px-6 py-2 border-b border-white/10 grid grid-cols-auto-fluid gap-3 md:gap-5 items-baseline"
                    >
                      <span className="font-mono text-label tracking-meta uppercase tracking-label text-white/50">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <div className="text-detail font-normal tracking-headline mb-px">
                          {px[lang]}{' '}
                          <span className="text-white/50 text-caption">
                            · {dur}
                          </span>
                        </div>
                        <div className="font-mono text-micro tracking-caption text-white/55">
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
        {step === 0 && (
          <div className="flex items-stretch min-h-control shrink-0">
            <button
              type="button"
              onClick={applyConfig}
              disabled={!canNext()}
              className={`edo-focus-ring bg-primary border-0 cursor-pointer text-white font-mono text-caption tracking-meta uppercase px-5 py-3 md:py-0 inline-flex items-center justify-center gap-2 flex-1 min-w-0 transition-opacity duration-150 hover:opacity-90${canNext() ? '' : ' opacity-30 cursor-not-allowed'}`}
            >
              {t('booking.continueToBooking')}{' '}
              <ArrowRight width="14" height="14" />
            </button>
          </div>
        )}
        {step > 0 && (
          <div className="border-t border-hairline flex flex-col md:flex-row md:items-stretch shrink-0 bg-white md:min-h-control">
            {(() => {
              const idx = STEPS.findIndex((s) => s.n === step);
              const isFirst = idx <= 0;
              const prevN = idx > 0 ? STEPS[idx - 1].n : null;
              const nextN =
                idx > -1 && idx < STEPS.length - 1 ? STEPS[idx + 1].n : null;
              const dateList =
                slotIds && slotIds.length > 0
                  ? slotIds
                  : plateau
                    ? [plateau]
                    : [];
              const isMultiDate = step === 6 && dateList.length > 1;
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
              const backBtnCls =
                'edo-focus-ring bg-white border-0 cursor-pointer font-mono text-caption tracking-meta uppercase text-foreground px-5 py-3 md:py-0 inline-flex items-center justify-start gap-2 transition-colors duration-150 min-h-control md:flex-1 md:min-h-0 min-w-0 hover:bg-muted';
              const navBtnSecondaryCls =
                'edo-focus-ring bg-white border-t md:border-t-0 md:border-l border-hairline cursor-pointer font-mono text-caption tracking-meta uppercase text-foreground px-5 py-3 md:py-0 inline-flex items-center justify-center gap-2 transition-colors duration-150 min-h-control md:min-h-0 flex-1 min-w-0 hover:bg-muted';
              const navBtnPrimaryCls =
                'edo-focus-ring bg-primary border-t md:border-t-0 md:border-l border-hairline cursor-pointer text-white font-mono text-caption tracking-meta uppercase px-5 py-3 md:py-0 inline-flex items-center justify-center gap-2 transition-opacity duration-150 min-h-control md:min-h-0 flex-1 min-w-0 hover:opacity-90';
              const navBtnOrangeCls =
                'edo-focus-ring bg-primary border-t md:border-t-0 md:border-l border-hairline cursor-pointer text-white font-mono text-caption tracking-meta uppercase px-5 py-3 md:py-0 inline-flex items-center justify-center gap-2 transition-opacity duration-150 min-h-control md:min-h-0 flex-1 min-w-0 hover:opacity-90';
              return (
                <>
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isFirst && onFirstDateSub}
                    className={
                      backBtnCls +
                      (isFirst && onFirstDateSub
                        ? ' opacity-30 cursor-not-allowed'
                        : '')
                    }
                  >
                    ← {t('booking.back')}
                  </button>
                  <div className="flex items-stretch md:flex-none md:w-1/2">
                    {step < 5 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!canNext()) return;
                          if (step === 0) {
                            applyConfig();
                          } else if (nextN !== null) {
                            goToStep(nextN);
                          }
                        }}
                        disabled={!canNext()}
                        className={
                          navBtnPrimaryCls +
                          (canNext() ? '' : ' opacity-30 cursor-not-allowed')
                        }
                      >
                        {step === 0
                          ? t('booking.continueToBooking')
                          : t('booking.continue')}{' '}
                        <ArrowRight width="14" height="14" />
                      </button>
                    ) : p.isCyclo ? (
                      step === 5 ? (
                        <button
                          type="button"
                          onClick={() => handleContactNext(nextN)}
                          className={navBtnPrimaryCls}
                        >
                          {t('booking.continue')}{' '}
                          <ArrowRight width="14" height="14" />
                        </button>
                      ) : isMultiDate && !onLastDateSub ? (
                        <button
                          type="button"
                          onClick={() => currentDateValid && handleSubNext()}
                          disabled={!currentDateValid}
                          className={
                            navBtnPrimaryCls +
                            (currentDateValid
                              ? ''
                              : ' opacity-30 cursor-not-allowed')
                          }
                        >
                          {t('booking.validateNextStage')}{' '}
                          <ArrowRight width="14" height="14" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            canNext() && !saving && handleSubmit('request')
                          }
                          disabled={!canNext() || saving}
                          className={
                            navBtnOrangeCls +
                            (canNext() && !saving
                              ? ''
                              : ' opacity-30 cursor-not-allowed')
                          }
                        >
                          {saving
                            ? t('booking.sending')
                            : t('booking.submitRequest')}{' '}
                          <ArrowRight width="14" height="14" />
                        </button>
                      )
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => !saving && handleSubmit('quote')}
                          disabled={saving}
                          title={t('booking.noDateHeld')}
                          className={
                            navBtnSecondaryCls +
                            (canQuote() && !saving
                              ? ''
                              : ' opacity-30 cursor-not-allowed')
                          }
                        >
                          {saving
                            ? t('booking.sending')
                            : t('booking.receiveMyQuote')}{' '}
                          <ArrowRight width="14" height="14" />
                        </button>
                        {step === 5 ? (
                          <button
                            type="button"
                            onClick={() => handleContactNext(nextN)}
                            className={navBtnPrimaryCls}
                          >
                            {t('booking.pickADate')}{' '}
                            <ArrowRight width="14" height="14" />
                          </button>
                        ) : isMultiDate && !onLastDateSub ? (
                          <button
                            type="button"
                            onClick={() => currentDateValid && handleSubNext()}
                            disabled={!currentDateValid}
                            className={
                              navBtnPrimaryCls +
                              (currentDateValid
                                ? ''
                                : ' opacity-30 cursor-not-allowed')
                            }
                          >
                            {t('booking.validateNextStage')}{' '}
                            <ArrowRight width="14" height="14" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              canNext() && !saving && handleSubmit('booking')
                            }
                            disabled={!canNext() || saving}
                            className={
                              navBtnOrangeCls +
                              (canNext() && !saving
                                ? ''
                                : ' opacity-30 cursor-not-allowed')
                            }
                          >
                            {saving
                              ? t('booking.booking')
                              : t('common.bookNow')}{' '}
                            <ArrowRight width="14" height="14" />
                          </button>
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

      <SidePanel
        lang={lang}
        p={p}
        selected={selected}
        months={months}
        slotType={slotType}
        hours={hours}
        cycloMode={cycloMode}
        rows={priceBreakdown.rows}
        total={priceBreakdown.total}
        isPreview={!!priceBreakdown.isPreview}
        step={step}
        slotIds={slotIds}
        slots={slots}
      />
    </div>
  );
};

const formatBookingDate = (d?: AnyProps | null) =>
  d
    ? `${d.y}-${String(d.m + 1).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    : '';

// Flattens the whole booking into the HubSpot form field set. Field names must
// match the internal property names of the HubSpot booking form. Same values the
// hidden BookingHubspotFields feed to Collected Forms, but sent authoritatively
// through the Forms API (see src/lib/hubspot-forms.ts).
const buildBookingHubspotFields = (p: AnyProps): Record<string, string> => {
  const list: string[] = p.slotIds || [];
  const slots = p.slots || {};
  const plateauKeys = Array.from(
    new Set(list.map((id: string) => slots[id]?.plateauKey || id)),
  );
  const slotsHoursTotal = list.reduce((sum: number, id: string) => {
    const st = slots[id] || {};
    const px = BOOK_PLATEAUX.find((x) => x.k === (st.plateauKey || id));
    const h =
      px && px.isCyclo
        ? st.cycloMode === 'halfH'
          ? 5
          : 10
        : px && px.isVisite
          ? 1
          : st.hours || 0;
    return sum + h;
  }, 0);
  const datesBySlot: Record<string, string> = {};
  for (const id of list as string[]) {
    const d = formatBookingDate(slots[id]?.date);
    if (d) datesBySlot[id] = d;
  }
  const c = p.contact || {};
  return {
    firstname: c.prenom || '',
    lastname: c.nom || '',
    email: c.email || '',
    phone: c.tel || '',
    company: c.societe || '',
    brand: c.marque || '',
    siren: c.siren || '',
    address: c.adresseFacturation || '',
    message: c.autresInfos || '',
    item_types: (c.typesArticles || []).join(', '),
    other_item_type: c.autreType || '',
    quantity_items: c.quantiteArticles || '',
    views_per_item: c.vuesParArticle || '',
    cgv_accepted: c.cgvAccepted ? 'true' : 'false',
    booking_mode: p.mode || '',
    booking_reference: p.reference || '',
    project_type: p.projectType || '',
    urgency: p.urgency || '',
    plateau: p.plateau || '',
    plateaus: plateauKeys.join(', '),
    preferred_date: formatBookingDate(p.selected),
    per_plateau_dates: JSON.stringify(datesBySlot),
    arrival_hour: p.arrivalHour != null ? String(p.arrivalHour) : '',
    rental_hours: String(
      slotsHoursTotal > 0 ? slotsHoursTotal : (p.rentalHours ?? ''),
    ),
    total_ht: String(p.total ?? 0),
  };
};

const BookingHubspotFields = ({
  mode,
  step,
  plateau,
  slotIds,
  slots,
  selected,
  arrivalHour,
  rentalHours,
  projectType,
  urgency,
  total,
  contact,
}: AnyProps) => {
  const list: string[] = slotIds || [];
  const plateauKeysList = Array.from(
    new Set(list.map((id) => (slots || {})[id]?.plateauKey || id)),
  );
  const slotsHoursTotal = list.reduce((sum: number, id: string) => {
    const st = (slots || {})[id] || {};
    const pk = st.plateauKey || id;
    const px = BOOK_PLATEAUX.find((x) => x.k === pk);
    const h =
      px && px.isCyclo
        ? st.cycloMode === 'halfH'
          ? 5
          : 10
        : px && px.isVisite
          ? 1
          : st.hours || 0;
    return sum + h;
  }, 0);
  const datesBySlot = Object.fromEntries(
    list
      .map((id: string) => [
        id,
        formatBookingDate(((slots || {})[id] || {}).date),
      ])
      .filter(([, d]) => d),
  );
  return (
    <div hidden aria-hidden>
      <input type="hidden" name="mode" value={mode} readOnly />
      <input type="hidden" name="plateau" value={plateau || ''} readOnly />
      <input
        type="hidden"
        name="plateaus"
        value={plateauKeysList.join(',')}
        readOnly
      />
      <input
        type="hidden"
        name="preferred_date"
        value={formatBookingDate(selected)}
        readOnly
      />
      <input
        type="hidden"
        name="per_plateau_dates"
        value={JSON.stringify(datesBySlot)}
        readOnly
      />
      <input
        type="hidden"
        name="arrival_hour"
        value={arrivalHour ?? ''}
        readOnly
      />
      <input
        type="hidden"
        name="rental_hours"
        value={String(
          slotsHoursTotal > 0 ? slotsHoursTotal : (rentalHours ?? ''),
        )}
        readOnly
      />
      <input
        type="hidden"
        name="project_type"
        value={projectType || ''}
        readOnly
      />
      <input type="hidden" name="urgency" value={urgency || ''} readOnly />
      <input
        type="hidden"
        name="total_ht"
        value={String(total ?? 0)}
        readOnly
      />
      <input
        type="hidden"
        name="item_types"
        value={(contact?.typesArticles || []).join(',')}
        readOnly
      />
      {step !== 5 && (
        <>
          <input
            type="hidden"
            name="firstname"
            value={contact?.prenom || ''}
            readOnly
          />
          <input
            type="hidden"
            name="lastname"
            value={contact?.nom || ''}
            readOnly
          />
          <input
            type="hidden"
            name="email"
            value={contact?.email || ''}
            readOnly
          />
          <input
            type="hidden"
            name="phone"
            value={contact?.tel || ''}
            readOnly
          />
          <input
            type="hidden"
            name="company"
            value={contact?.societe || ''}
            readOnly
          />
          <input
            type="hidden"
            name="brand"
            value={contact?.marque || ''}
            readOnly
          />
          <input
            type="hidden"
            name="siren"
            value={contact?.siren || ''}
            readOnly
          />
          <input
            type="hidden"
            name="address"
            value={contact?.adresseFacturation || ''}
            readOnly
          />
          <input
            type="hidden"
            name="message"
            value={contact?.autresInfos || ''}
            readOnly
          />
          <input
            type="hidden"
            name="other_item_type"
            value={contact?.autreType || ''}
            readOnly
          />
          <input
            type="hidden"
            name="quantity_items"
            value={contact?.quantiteArticles || ''}
            readOnly
          />
          <input
            type="hidden"
            name="views_per_item"
            value={contact?.vuesParArticle || ''}
            readOnly
          />
          <input
            type="hidden"
            name="cgv_accepted"
            value={contact?.cgvAccepted ? 'true' : 'false'}
            readOnly
          />
        </>
      )}
    </div>
  );
};

const StepIntro = ({ n, lang, t, s, compact }: AnyProps) => (
  <div
    className={`${compact ? 'py-2.5 pb-2' : 'py-3 pb-2.5'} flex items-baseline gap-4 flex-wrap`}
  >
    <span className="edo-cell-label text-primary shrink-0">
      {n} · {t}
    </span>
    {s && (
      <span className="text-caption text-muted-foreground leading-snug flex-auto min-w-0">
        {s}
      </span>
    )}
  </div>
);

const PROJECT_TYPES: AnyProps[] = [
  {
    k: 'ecom',
    fr: 'E-commerce',
    en: 'E-commerce',
    desc: {
      fr: 'Packshots, on-model, fiches produit.',
      en: 'Packshots, on-model, product pages.',
    },
  },
  {
    k: 'cyclorama',
    fr: 'Cyclorama / Prod. libre',
    en: 'Cyclorama / Free production',
    desc: {
      fr: 'Studio cyclo, besoin sur-mesure.',
      en: 'Cyclo studio, custom needs.',
    },
  },
];

const PRODUCTS: AnyProps[] = [
  {
    k: 'pap',
    fr: 'Prêt-à-porter',
    en: 'Ready-to-wear',
    desc: { fr: 'Vêtements, textile porté.', en: 'Clothing, worn textile.' },
  },
  {
    k: 'accessoires',
    fr: 'Accessoires',
    en: 'Accessories',
    desc: {
      fr: 'Chaussures, maroquinerie, textile.',
      en: 'Shoes, leather goods, textile.',
    },
  },
  {
    k: 'eyewear',
    fr: 'Lunetterie',
    en: 'Eyewear',
    desc: { fr: 'Lunettes, solaires.', en: 'Glasses, sunglasses.' },
  },
  {
    k: 'food',
    fr: 'Food & Spiritueux',
    en: 'Food & Spirits',
    desc: { fr: 'Boissons, gastronomie.', en: 'Drinks, gourmet.' },
  },
  {
    k: 'cosmetique',
    fr: 'Cosmétique',
    en: 'Cosmetics',
    desc: {
      fr: 'Soin, parfumerie, make-up.',
      en: 'Skincare, fragrance, makeup.',
    },
  },
  {
    k: 'bijoux',
    fr: 'Bijoux',
    en: 'Jewelry',
    desc: { fr: 'Bijoux, montres.', en: 'Jewelry, watches.' },
  },
];

const PAP_METHODS: AnyProps[] = [
  {
    k: 'packshot',
    fr: 'Packshot',
    en: 'Packshot',
    desc: { fr: 'Shoot produit non porté.', en: 'Unworn product shoot.' },
  },
  {
    k: 'onmodel',
    fr: 'Mannequin (on-model)',
    en: 'On-model',
    desc: { fr: 'Shoot porté sur mannequin.', en: 'On-model shoot.' },
  },
];

const PAP_PACKSHOT_SUBS: AnyProps[] = [
  {
    k: 'pique',
    fr: 'Piqué',
    en: 'Pinned',
    desc: {
      fr: 'Épinglé sur panneau vertical.',
      en: 'Pinned on vertical board.',
    },
  },
  {
    k: 'ghost',
    fr: 'Ghost',
    en: 'Ghost',
    desc: {
      fr: 'Mannequin invisible, effet porté.',
      en: 'Invisible mannequin, worn look.',
    },
  },
  {
    k: 'flat',
    fr: 'Flat',
    en: 'Flat',
    desc: { fr: 'Posé à plat, vue zénithale.', en: 'Laid flat, top view.' },
  },
];

const ACCESS_SUBS: AnyProps[] = [
  { k: 'chaussure', fr: 'Chaussures', en: 'Shoes', desc: { fr: '', en: '' } },
  {
    k: 'maroquinerie',
    fr: 'Maroquinerie',
    en: 'Leather goods',
    desc: {
      fr: 'Sacs, ceintures, petite maroquinerie.',
      en: 'Bags, belts, small leather goods.',
    },
  },
  {
    k: 'textile',
    fr: 'Accessoires textile',
    en: 'Textile accessories',
    desc: { fr: 'Foulards, chapeaux, gants.', en: 'Scarves, hats, gloves.' },
  },
];

const MEDIA_OPTIONS: AnyProps[] = [
  { k: 'photo', fr: 'Photo', en: 'Photo', desc: { fr: '', en: '' } },
  { k: 'video', fr: 'Vidéo', en: 'Video', desc: { fr: '', en: '' } },
];

const PACKSHOT_VIEWS: AnyProps[] = [
  { k: 'face', fr: 'Face', en: 'Front' },
  { k: 'dos', fr: 'Dos', en: 'Back' },
  { k: '3/4', fr: '3/4', en: '3/4' },
  { k: 'detail', fr: 'Détail', en: 'Detail' },
];

const CfgChoice = ({ idx, on, onClick, label, desc, sub }: AnyProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`group edo-focus-ring ${on ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-muted'} border-0 outline-none shadow-none p-5 sm:p-3.5 text-left cursor-pointer font-inherit flex flex-col gap-1 transition-all duration-150 min-w-0 min-h-32 sm:min-h-28`}
  >
    <div className="flex justify-between items-start">
      {idx != null && (
        <span
          className={`font-mono text-label tracking-meta ${on ? 'text-white/60' : 'text-muted-foreground'}`}
        >
          {String(idx).padStart(2, '0')}
        </span>
      )}
      {on ? (
        <span className="text-primary text-cell leading-none">●</span>
      ) : (
        <span
          data-cfg-arrow
          className={`text-primary text-detail leading-none transition-all duration-200 origin-right ${on ? '' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-110'}`}
        >
          →
        </span>
      )}
    </div>
    <div
      data-cfg-label
      className={`text-cell font-normal tracking-headline mt-0.5 leading-cell text-balance transition-transform duration-200 origin-left ${on ? '' : 'group-hover:scale-102'}`}
    >
      {label}
    </div>
    {sub && (
      <div
        className={`font-mono text-micro tracking-ui uppercase ${on ? 'text-white/55' : 'text-muted-foreground'}`}
      >
        {sub}
      </div>
    )}
    {desc && (
      <div
        className={`text-caption leading-normal mt-auto text-pretty ${on ? 'text-white/65' : 'text-muted-foreground'}`}
      >
        {desc}
      </div>
    )}
  </button>
);

const Step0Configurator = ({
  lang,
  global,
  setGlobal,
  sessions,
  setSessions,
  activeIdx,
  setActiveIdx,
  onApply,
  onSkip,
  onReset,
}: AnyProps) => {
  const t = useT();
  const active = sessions[activeIdx] || sessions[0];
  const [openQ, setOpenQ] = useState(null);
  const [touchedQs, setTouchedQs] = useState(new Set());
  const touchQ = (k) =>
    setTouchedQs((prev) => {
      if (prev.has(k)) return prev;
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  const setSession = (patch) => {
    setSessions((prev) =>
      prev.map((s, i) => (i === activeIdx ? { ...s, ...patch } : s)),
    );
  };
  const resetFrom = (field, value) => {
    const cascades = {
      projectType: {
        product: null,
        method: null,
        submethod: null,
        media: [],
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
      product: {
        method: null,
        submethod: null,
        media: [],
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
      method: {
        submethod: null,
        media: [],
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
      submethod: {
        media: [],
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
      media: {
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
    };
    setSession({ [field]: value, ...(cascades[field] || {}) });
    setOpenQ(null);
    setTouchedQs(new Set());
  };
  const addSession = () => {
    setSessions((prev) => [...prev, makeBlankSession()]);
    setActiveIdx(sessions.length);
    setOpenQ(null);
    setTouchedQs(new Set());
  };
  const removeSession = (idx) => {
    if (sessions.length <= 1) return;
    setSessions((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx(Math.max(0, Math.min(activeIdx, sessions.length - 2)));
  };
  const sessionValid = isSessionValid;
  const S = active;
  const qList: AnyProps[] = [];
  qList.push({
    key: 'projectType',
    num: '00',
    label: t('booking.projectType'),
    visible: true,
    answered: !!S.projectType,
    summary: S.projectType
      ? PROJECT_TYPES.find((x) => x.k === S.projectType)?.[lang] || ''
      : '',
  });
  if (S.projectType === 'ecom') {
    qList.push({
      key: 'product',
      num: '01',
      label: t('booking.productType'),
      visible: true,
      answered: !!S.product,
      summary: S.product
        ? PRODUCTS.find((x) => x.k === S.product)?.[lang] || ''
        : '',
    });
  }
  if (S.product === 'pap') {
    qList.push({
      key: 'method',
      num: '02',
      label: t('booking.method'),
      visible: true,
      answered: !!S.method,
      summary: S.method
        ? PAP_METHODS.find((x) => x.k === S.method)?.[lang] || ''
        : '',
    });
  }
  if (S.product === 'pap' && S.method === 'packshot') {
    qList.push({
      key: 'submethod',
      num: '03',
      label: t('booking.packshotType'),
      visible: true,
      answered: !!S.submethod,
      summary: S.submethod
        ? PAP_PACKSHOT_SUBS.find((x) => x.k === S.submethod)?.[lang] || ''
        : '',
    });
  }
  if (S.product === 'accessoires') {
    qList.push({
      key: 'submethod',
      num: '02',
      label: t('booking.accessoryType'),
      visible: true,
      answered: !!S.submethod,
      summary: S.submethod
        ? ACCESS_SUBS.find((x) => x.k === S.submethod)?.[lang] || ''
        : '',
    });
  }
  const mediaVisible =
    (S.product === 'pap' && S.method === 'onmodel') ||
    (S.product === 'accessoires' && S.submethod) ||
    ['eyewear', 'food', 'cosmetique', 'bijoux'].includes(S.product);
  if (mediaVisible) {
    const mediaNum =
      S.product === 'pap' ? '03' : S.product === 'accessoires' ? '03' : '02';
    qList.push({
      key: 'media',
      num: mediaNum,
      label: t('booking.media'),
      visible: true,
      multi: true,
      answered: (S.media || []).length > 0,
      summary: (S.media || [])
        .map((m) => MEDIA_OPTIONS.find((x) => x.k === m)?.[lang])
        .filter(Boolean)
        .join(' + '),
    });
  }
  if (S.product === 'pap' && S.method === 'packshot' && S.submethod) {
    qList.push({
      key: 'quantity',
      num: '04',
      label: t('booking.numberOfProducts'),
      visible: true,
      answered: !!Number(S.quantity),
      summary: S.quantity ? `${S.quantity} ${t('booking.products')}` : '',
    });
  }
  if (S.product === 'pap' && S.method === 'packshot' && S.submethod) {
    qList.push({
      key: 'views',
      num: '05',
      label: t('booking.viewsPerProduct'),
      visible: true,
      multi: true,
      answered: (S.views || []).some((v) => v !== 'detail'),
      summary: (S.views || [])
        .map((v) => PACKSHOT_VIEWS.find((x) => x.k === v)?.[lang])
        .filter(Boolean)
        .join(' + '),
    });
  }
  const qvVisible =
    (S.product === 'pap' && S.method === 'onmodel' && (S.media || []).length) ||
    (S.product === 'accessoires' && S.submethod && (S.media || []).length) ||
    (['eyewear', 'food', 'cosmetique', 'bijoux'].includes(S.product) &&
      (S.media || []).length);
  if (qvVisible) {
    qList.push({
      key: 'qtyViews',
      num:
        S.product === 'pap' ? '04' : S.product === 'accessoires' ? '04' : '03',
      label: t('booking.productsViews'),
      visible: true,
      answered: !!Number(S.quantity) && !!Number(S.viewsCount),
      summary:
        S.quantity && S.viewsCount
          ? `${S.quantity} ${t('booking.prod')} × ${S.viewsCount} ${t('booking.views2')}`
          : '',
    });
  }
  const ppVisible = S.projectType === 'ecom' && S.product && sessionValid(S);
  if (ppVisible) {
    qList.push({
      key: 'postprod',
      num: 'pp',
      label: t('nav.postprod'),
      visible: true,
      answered: true,
      summary: S.postprod
        ? S.postprodVideo
          ? t('booking.yesVideo')
          : t('booking.yes')
        : t('booking.no'),
    });
  }
  const firstUnansweredIdx = qList.findIndex((q) => !q.answered);
  const autoOpenKey =
    firstUnansweredIdx >= 0
      ? qList[firstUnansweredIdx].key
      : qList.length
        ? qList[qList.length - 1].key
        : null;
  const currentOpen = openQ !== null ? openQ : autoOpenKey;
  const currentIdx = qList.findIndex((q) => q.key === currentOpen);
  const isOpen = (key) => {
    const idx = qList.findIndex((q) => q.key === key);
    if (idx === currentIdx) return true;
    if (qList[idx]?.answered && idx === currentIdx - 1) {
      const nextKey = qList[currentIdx]?.key;
      if (nextKey && !touchedQs.has(nextKey)) return true;
    }
    if (idx === currentIdx + 1) {
      const curr = qList[currentIdx];
      if (curr?.answered && touchedQs.has(curr.key)) return true;
    }
    return false;
  };
  const accQ = (qKey, children) => {
    const q = qList.find((x) => x.key === qKey);
    if (!q || !q.visible) return null;
    const open = isOpen(qKey);
    if (!open && q.answered) {
      return (
        <button
          type="button"
          key={qKey + ':collapsed'}
          onClick={() => setOpenQ(qKey)}
          className="edo-focus-ring w-full bg-white border-0 border-b border-b-foreground px-5 md:px-6 min-h-control py-3 md:py-0 box-border cursor-pointer font-inherit text-left flex items-center gap-3 md:gap-3.5 transition-colors duration-150 hover:bg-muted"
        >
          <span className="edo-cell-label text-primary shrink-0 w-7">
            {q.num}
          </span>
          <span className="edo-cell-label text-muted-foreground shrink-0">
            {q.label}
          </span>
          <span className="flex-1 min-w-0 font-mono text-caption tracking-copy-tight text-foreground text-right text-balance">
            {q.summary || '—'}
          </span>
          <span className="edo-cell-label text-muted-foreground shrink-0">
            {t('booking.edit')}
          </span>
        </button>
      );
    }
    if (!open) return null;
    const onInteract = () => {
      touchQ(qKey);
      setOpenQ(qKey);
    };
    return (
      <div key={qKey + ':open'} onClickCapture={onInteract}>
        {children}
      </div>
    );
  };
  return (
    <div className="min-w-0 overflow-y-auto h-full">
      <div className="flex flex-col md:flex-row md:items-stretch md:min-h-control bg-muted box-border sticky top-0 z-local border-b border-hairline">
        <span className="font-mono text-micro tracking-code uppercase text-muted-foreground px-5 py-3 md:py-0 md:self-center md:pl-5 md:pr-3 flex-1 min-w-0 leading-relaxed">
          {t('booking.ourConfiguratorGuidesYouOr')}
          <span className="text-primary font-semibold">
            {t('booking.pickManually')}
          </span>
        </span>
        <div className="flex items-stretch border-t border-hairline md:border-t-0 md:flex-none md:w-1/2">
          <button
            type="button"
            onClick={() => {
              setSessions([makeBlankSession()]);
              setActiveIdx(0);
              setOpenQ(null);
              setTouchedQs(new Set());
              if (onReset) onReset();
            }}
            className="edo-focus-ring flex-1 bg-transparent border-l border-hairline px-5 py-3 md:py-0 cursor-pointer font-mono text-micro tracking-code uppercase text-foreground whitespace-nowrap leading-normal inline-flex items-center justify-center transition-colors duration-150 hover:bg-white"
          >
            ↻ {t('mobileNav.reset')}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="edo-focus-ring flex-1 bg-primary border-l border-hairline px-5 py-3 md:py-0 cursor-pointer font-mono text-label tracking-code uppercase text-white whitespace-nowrap leading-normal font-semibold inline-flex items-center justify-center transition-opacity duration-150 hover:opacity-90"
          >
            {t('booking.chooseManually')} →
          </button>
        </div>
      </div>
      {sessions.length > 1 && (
        <>
          <div className="px-6 pt-3.5 pb-1 flex items-baseline justify-between gap-4 flex-wrap">
            <span className="edo-cell-label text-primary">
              {t('booking.productSessions')} — {sessions.length}
            </span>
            <button
              type="button"
              onClick={addSession}
              className="edo-focus-ring bg-white border border-border px-3.5 py-2 cursor-pointer font-mono text-label tracking-meta uppercase text-foreground flex items-center gap-2 h-8"
            >
              + {t('booking.addASession')}
            </button>
          </div>
          <div
            className="grid bg-white border-t border-b border-hairline"
            style={{
              gridTemplateColumns: `repeat(${sessions.length}, minmax(0,1fr))`,
              gap: 1,
            }}
          >
            {sessions.map((s, i) => {
              const isActive = i === activeIdx;
              const valid = sessionValid(s);
              const p = PRODUCTS.find((x) => x.k === s.product);
              const label =
                s.projectType === 'cyclorama'
                  ? t('booking.cyclorama')
                  : p
                    ? p[lang]
                    : t('booking.toDefine');
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    setActiveIdx(i);
                    setOpenQ(null);
                    setTouchedQs(new Set());
                  }}
                  className={`${isActive ? 'bg-foreground text-white' : 'bg-white text-foreground'} border-0 px-3.5 py-3 text-left cursor-pointer font-inherit flex flex-col gap-1 min-w-0`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-label tracking-meta ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {t('booking.session')} {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSession(i);
                      }}
                      className={`text-detail cursor-pointer px-1 leading-none ${isActive ? 'text-white/50' : 'text-muted-foreground'}`}
                      title={t('booking.remove')}
                    >
                      ×
                    </span>
                  </div>
                  <div className="text-detail font-normal tracking-headline">
                    {label}
                  </div>
                  <div
                    className={`font-mono text-micro tracking-caption ${isActive ? 'text-white/55' : 'text-muted-foreground'}`}
                  >
                    {valid
                      ? s.projectType === 'cyclorama'
                        ? t('booking.onRequestLower')
                        : `${s.quantity} ${t('booking.products')}`
                      : t('booking.incomplete')}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      {accQ(
        'projectType',
        <>
          <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border">
            <span className="edo-cell-label text-primary">
              00 · {t('booking.projectType')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-hairline bg-edo-pure-black border-b border-hairline">
            {PROJECT_TYPES.map((pt, i) => (
              <CfgChoice
                key={pt.k}
                idx={i + 1}
                on={S.projectType === pt.k}
                onClick={() => resetFrom('projectType', pt.k)}
                label={pt[lang]}
                desc={pt.desc[lang]}
              />
            ))}
          </div>
        </>,
      )}
      {S.projectType === 'ecom' &&
        accQ(
          'product',
          <>
            <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border">
              <span className="edo-cell-label text-primary">
                01 · {t('booking.productType')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-hairline bg-edo-pure-black border-b border-hairline">
              {PRODUCTS.map((p, i) => (
                <CfgChoice
                  key={p.k}
                  idx={i + 1}
                  on={S.product === p.k}
                  onClick={() => resetFrom('product', p.k)}
                  label={p[lang]}
                  desc={p.desc[lang]}
                />
              ))}
            </div>
          </>,
        )}
      {S.product === 'pap' &&
        accQ(
          'method',
          <>
            <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border">
              <span className="edo-cell-label text-primary">
                02 · {t('booking.method')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-hairline bg-edo-pure-black border-b border-hairline">
              {PAP_METHODS.map((m, i) => (
                <CfgChoice
                  key={m.k}
                  idx={i + 1}
                  on={S.method === m.k}
                  onClick={() => resetFrom('method', m.k)}
                  label={m[lang]}
                  desc={m.desc[lang]}
                />
              ))}
            </div>
          </>,
        )}
      {S.product === 'pap' &&
        S.method === 'packshot' &&
        accQ(
          'submethod',
          <>
            <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border">
              <span className="edo-cell-label text-primary">
                03 · {t('booking.packshotType')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-hairline bg-edo-pure-black border-b border-hairline">
              {PAP_PACKSHOT_SUBS.map((sub, i) => (
                <CfgChoice
                  key={sub.k}
                  idx={i + 1}
                  on={S.submethod === sub.k}
                  onClick={() => resetFrom('submethod', sub.k)}
                  label={sub[lang]}
                  desc={sub.desc[lang]}
                />
              ))}
            </div>
          </>,
        )}
      {S.product === 'accessoires' &&
        accQ(
          'submethod',
          <>
            <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border">
              <span className="edo-cell-label text-primary">
                02 · {t('booking.accessoryType')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-hairline bg-edo-pure-black border-b border-hairline">
              {ACCESS_SUBS.map((sub, i) => (
                <CfgChoice
                  key={sub.k}
                  idx={i + 1}
                  on={S.submethod === sub.k}
                  onClick={() => resetFrom('submethod', sub.k)}
                  label={sub[lang]}
                  desc={sub.desc[lang]}
                />
              ))}
            </div>
          </>,
        )}
      {((S.product === 'pap' && S.method === 'onmodel') ||
        (S.product === 'accessoires' && S.submethod) ||
        ['eyewear', 'food', 'cosmetique', 'bijoux'].includes(S.product)) &&
        accQ(
          'media',
          <>
            <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border flex-wrap">
              <span className="edo-cell-label text-primary">
                {S.product === 'pap'
                  ? '03'
                  : S.product === 'accessoires'
                    ? '03'
                    : '02'}{' '}
                · {t('booking.media')}
              </span>
              <span className="font-mono text-label tracking-caption text-muted-foreground ml-3">
                {t('booking.oneOrBoth')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-hairline bg-edo-pure-black border-b border-hairline">
              {MEDIA_OPTIONS.map((m, i) => {
                const cur = Array.isArray(S.media)
                  ? S.media
                  : S.media
                    ? [S.media]
                    : [];
                const on = cur.includes(m.k);
                return (
                  <CfgChoice
                    key={m.k}
                    idx={i + 1}
                    on={on}
                    onClick={() => {
                      const next = on
                        ? cur.filter((x) => x !== m.k)
                        : [...cur, m.k];
                      setSession({ media: next });
                    }}
                    label={m[lang]}
                    desc={m.desc[lang]}
                  />
                );
              })}
            </div>
          </>,
        )}
      {S.product === 'pap' &&
        S.method === 'packshot' &&
        S.submethod &&
        accQ(
          'quantity',
          <>
            <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border">
              <span className="edo-cell-label text-primary">
                04 · {t('booking.numberOfProducts')}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-hairline bg-edo-pure-black border-b border-hairline">
              <div className="bg-white px-4 sm:px-3 py-4 sm:py-2.5 flex flex-col gap-2 min-w-0">
                <div className="flex items-center gap-1.5 max-w-xs min-w-0">
                  <input
                    value={S.quantity}
                    onChange={(e) =>
                      setSession({
                        quantity: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="—"
                    inputMode="numeric"
                    className="flex-1 min-w-0 bg-white border border-border outline-none px-3.5 py-2.5 font-mono text-cell tracking-copy-tight text-foreground text-center"
                  />
                </div>
              </div>
            </div>
          </>,
        )}
      {S.product === 'pap' &&
        S.method === 'packshot' &&
        S.submethod &&
        accQ(
          'views',
          <>
            <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border flex-wrap">
              <span className="edo-cell-label text-primary">
                05 · {t('booking.viewsPerProduct')}
              </span>
              <span className="font-mono text-label tracking-caption text-muted-foreground ml-3">
                {t('booking.multiSelect')}
              </span>
            </div>
            <div className="grid gap-hairline bg-edo-pure-black border-b border-hairline grid-cols-auto-tiles">
              {PACKSHOT_VIEWS.filter(
                (v) => v.k !== '3/4' || S.submethod === 'ghost',
              ).map((v, i) => {
                const on = (S.views || []).includes(v.k);
                return (
                  <button
                    type="button"
                    key={v.k}
                    onClick={() => {
                      const cur = S.views || [];
                      setSession({
                        views: cur.includes(v.k)
                          ? cur.filter((x) => x !== v.k)
                          : [...cur, v.k],
                      });
                    }}
                    className={`${on ? 'bg-foreground text-white' : 'bg-white text-foreground'} border-0 px-4 sm:px-3 py-4 sm:py-2.5 text-left cursor-pointer font-inherit flex flex-col gap-1.5 min-h-22 sm:min-h-18 min-w-0`}
                  >
                    <span
                      className={`font-mono text-label tracking-meta uppercase ${on ? 'text-white/60' : 'text-muted-foreground'}`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-detail font-normal tracking-headline">
                      {v[lang]}
                    </span>
                    {on && (
                      <span className="text-primary text-caption mt-auto">
                        ●
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>,
        )}
      {((S.product === 'pap' &&
        S.method === 'onmodel' &&
        (S.media || []).length > 0) ||
        (S.product === 'accessoires' &&
          S.submethod &&
          (S.media || []).length > 0) ||
        (['eyewear', 'food', 'cosmetique', 'bijoux'].includes(S.product) &&
          (S.media || []).length > 0)) &&
        accQ(
          'qtyViews',
          <>
            <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border">
              <span className="edo-cell-label text-primary">
                {S.product === 'pap'
                  ? '04'
                  : S.product === 'accessoires'
                    ? '04'
                    : '03'}{' '}
                · {t('booking.productsViews')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-hairline bg-edo-pure-black border-b border-hairline">
              <div className="bg-white px-4 sm:px-3 py-4 sm:py-2.5 flex flex-col gap-2 min-w-0">
                <span className="edo-cell-label text-muted-foreground">
                  {t('booking.numberOfProducts')}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <input
                    value={S.quantity}
                    onChange={(e) =>
                      setSession({
                        quantity: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="—"
                    inputMode="numeric"
                    className="flex-1 min-w-0 w-full bg-white border border-border outline-none px-3.5 py-2.5 font-mono text-cell tracking-copy-tight text-foreground text-center"
                  />
                </div>
              </div>
              <div className="bg-white px-4 sm:px-3 py-4 sm:py-2.5 flex flex-col gap-2 min-w-0">
                <span className="edo-cell-label text-muted-foreground">
                  {t('booking.viewsPerProduct')}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <input
                    value={S.viewsCount}
                    onChange={(e) =>
                      setSession({
                        viewsCount: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="—"
                    inputMode="numeric"
                    className="flex-1 min-w-0 w-full bg-white border border-border outline-none px-3.5 py-2.5 font-mono text-cell tracking-copy-tight text-foreground text-center"
                  />
                </div>
              </div>
            </div>
          </>,
        )}
      {S.projectType === 'ecom' &&
        S.product &&
        sessionValid(S) &&
        accQ(
          'postprod',
          <>
            <div className="px-5 sm:px-6 border-b border-hairline flex items-center min-h-control py-4 sm:py-0 gap-3 box-border">
              <span className="edo-cell-label text-primary">
                {t('nav.postprod')}
              </span>
            </div>
            <div
              className="grid gap-hairline bg-edo-pure-black border-b border-hairline"
              style={{
                gridTemplateColumns:
                  (S.media || []).includes('video') && S.postprod
                    ? '1fr 1fr'
                    : '1fr',
              }}
            >
              <div className="bg-white px-4 sm:px-3.5 py-4 sm:py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-detail font-medium tracking-copy-tight">
                    {t('booking.postProductionByEDo')}
                  </div>
                  <div
                    className={`font-mono text-label text-muted-foreground mt-0.5`}
                  >
                    {t('booking.estimatedPriceShownAdjustedAfter')}
                  </div>
                </div>
                <Toggle
                  on={S.postprod}
                  onClick={() =>
                    setSession({
                      postprod: !S.postprod,
                      postprodVideo: S.postprod ? false : S.postprodVideo,
                    })
                  }
                />
              </div>
              {(S.media || []).includes('video') && S.postprod && (
                <div className="bg-white px-4 sm:px-3.5 py-4 sm:py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-detail font-medium tracking-copy-tight">
                      {t('booking.videoEditing2')}
                    </div>
                    <div
                      className={`font-mono text-label text-muted-foreground mt-0.5`}
                    >
                      {t('booking.onlyForVideoProjects')}
                    </div>
                  </div>
                  <Toggle
                    on={S.postprodVideo}
                    onClick={() =>
                      setSession({ postprodVideo: !S.postprodVideo })
                    }
                  />
                </div>
              )}
            </div>
          </>,
        )}
      {S.projectType === 'cyclorama' && (
        <div className="bg-muted p-5 border-t border-b border-hairline text-center">
          <div className="text-cell font-normal tracking-headline mb-2">
            {t('booking.cycloramaFreeProduction')}
          </div>
          <div className="text-detail text-muted-foreground max-w-xl mx-auto leading-normal">
            {t('booking.customNeedsWeLlPrepare')}
          </div>
        </div>
      )}
      {sessionValid(active) && activeIdx === sessions.length - 1 && (
        <div className="px-6 py-1.5 flex justify-center items-center bg-white">
          <button
            type="button"
            onClick={addSession}
            className="edo-focus-ring bg-white border border-border px-4 py-1.5 cursor-pointer font-mono text-label tracking-meta uppercase text-foreground flex items-center gap-2 h-7"
          >
            + {t('booking.addAnotherProductSession')}
          </button>
        </div>
      )}
      <div className="h-4 bg-white" />
    </div>
  );
};

const MultiPlateauStep = ({
  lang,
  slotIds,
  slots,
  setSlots,
  fallback,
  renderOne,
  topBanner,
}: AnyProps) => {
  const t = useT();
  const list: string[] = slotIds && slotIds.length > 0 ? slotIds : [];
  if (list.length === 0) {
    return (
      <Empty size="compact">
        <EmptyTitle>{t('booking.noStageSelected')}</EmptyTitle>
      </Empty>
    );
  }
  const setOne = (id: string, patch: AnyProps) => {
    setSlots((prev: AnyProps) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        plateauKey: prev[id]?.plateauKey || id,
        ...patch,
      },
    }));
  };
  const sameKeyCount: Record<string, number> = {};
  list.forEach((id) => {
    const k = slots[id]?.plateauKey || id;
    sameKeyCount[k] = (sameKeyCount[k] || 0) + 1;
  });
  const seenIdxByKey: Record<string, number> = {};
  return (
    <div>
      {topBanner}
      {list.map((id, idx) => {
        const st = slots[id] || {};
        const pk = st.plateauKey || id;
        const px = BOOK_PLATEAUX.find((x) => x.k === pk);
        if (!px) return null;
        seenIdxByKey[pk] = (seenIdxByKey[pk] || 0) + 1;
        const dupIdx = seenIdxByKey[pk];
        const label =
          sameKeyCount[pk] > 1
            ? `${px[lang]} · ${t('booking.session')} ${String(dupIdx).padStart(2, '0')}`
            : px[lang];
        return (
          <div key={id}>
            {list.length > 1 && (
              <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap">
                <span className="edo-cell-label text-primary whitespace-nowrap">
                  {t('booking.stageFallback')}{' '}
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-detail font-normal tracking-copy-tight text-foreground">
                  {label}
                </span>
                <span className="font-mono text-label tracking-caption text-muted-foreground">
                  {px.desc[lang]}
                </span>
              </div>
            )}
            {renderOne(px, st, (patch: AnyProps) => setOne(id, patch))}
          </div>
        );
      })}
    </div>
  );
};

const Step1Plateau = ({
  lang,
  plateau,
  setPlateau,
  plateaus,
  togglePlateau,
  setCycloMode,
  setSlotType,
  setHours,
  onConfigurator,
}: AnyProps) => {
  const t = useT();
  return (
    <div>
      <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local">
        <span className="edo-cell-label text-primary whitespace-nowrap">
          01 · {t('booking.stageFallback')}
        </span>
        <span className="font-mono text-label tracking-caption text-muted-foreground">
          {t('booking.multiSelectPossible')}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 edo-hairline w-full auto-rows-bento">
        {BOOK_PLATEAUX.map((px, i) => {
          const on = (plateaus || []).includes(px.k);
          const priceRows = px.isVisite
            ? [
                {
                  lbl: t('booking.visit'),
                  val: t('booking.free'),
                },
              ]
            : px.isCyclo
              ? [
                  {
                    lbl: t('booking.cyclo5h'),
                    val: `${px.rates.halfH} €`,
                  },
                  {
                    lbl: t('booking.cyclo10h'),
                    val: `${px.rates.fullH} €`,
                  },
                  {
                    lbl: t('booking.editorial10h'),
                    val: t('common.onRequest'),
                  },
                ]
              : [
                  {
                    lbl: t('booking.hourly'),
                    val: `${px.rates.hour} €`,
                  },
                  {
                    lbl: t('booking.halfDay4h'),
                    val: `${px.rates.half} €`,
                  },
                  {
                    lbl: t('booking.fullDay8h'),
                    val: `${px.rates.full} €`,
                  },
                ];
          return (
            <button
              type="button"
              key={px.k}
              onClick={() => {
                togglePlateau(px.k);
              }}
              className={`group edo-focus-ring ${on ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-muted'} border-0 px-cell py-4 text-left cursor-pointer font-inherit flex flex-col gap-1.5 transition-all duration-150 min-w-0`}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`font-mono text-label tracking-meta ${on ? 'text-white/60' : 'text-muted-foreground'}`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {on ? (
                  <span className="text-primary text-cell leading-none">●</span>
                ) : (
                  <span
                    data-plateau-arrow
                    className={`text-primary text-cell leading-none transition-all duration-200 origin-right ${on ? '' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-110'}`}
                  >
                    →
                  </span>
                )}
              </div>
              <div
                data-plateau-label
                className={`text-page-title font-light tracking-headline mt-1 transition-transform duration-200 origin-left ${on ? '' : 'group-hover:scale-102'}`}
              >
                {px[lang]}
              </div>
              <div
                className={`text-detail ${on ? 'text-white/65' : 'text-muted-foreground'} leading-snug`}
              >
                {px.desc[lang]}
              </div>
              {priceRows.length > 0 && (
                <div
                  className={`mt-auto pt-3 flex flex-col gap-1 border-t ${on ? 'border-t-white/15' : 'border-t-border'}`}
                >
                  {priceRows.map((pr) => (
                    <div
                      key={pr.lbl}
                      className="flex justify-between items-baseline gap-2 whitespace-nowrap"
                    >
                      <span
                        className={`font-mono text-label tracking-caption ${on ? 'text-white/55' : 'text-muted-foreground'} uppercase overflow-hidden text-ellipsis`}
                      >
                        {pr.lbl}
                      </span>
                      <span className="text-detail font-medium tabular-nums">
                        {pr.val}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Step2Date = ({
  lang,
  p,
  viewY,
  viewM,
  months,
  days,
  calCells,
  selected,
  setSelected,
  arrivalHour,
  setArrivalHour,
  rentalHours,
  isPast,
  nextMonth,
  prevMonth,
  refreshKey = 0,
}: AnyProps) => {
  const t = useT();
  const {
    availMap,
    bookedHoursMap,
    loading: availLoading,
  } = useAvailability(p?.k, viewY, viewM, rentalHours, refreshKey);
  const isSelected = (d: number) =>
    selected &&
    selected.y === viewY &&
    selected.m === viewM &&
    selected.d === d;
  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();
  const currentHour = now.getHours();
  const isToday = (d: number) =>
    viewY === todayY && viewM === todayM && d === todayD;
  const isSelectedToday =
    selected &&
    selected.y === todayY &&
    selected.m === todayM &&
    selected.d === todayD;
  const maxStart = 19 - rentalHours;
  const selectedDayBooked = selected ? bookedHoursMap[selected.d] : undefined;
  // Ne boucle pas : après correction, arrivalHour <= maxStart et la condition
  // est fausse.
  useEffect(() => {
    if (arrivalHour > maxStart)
      setArrivalHour(Math.max(9, Math.min(10, maxStart)));
  }, [maxStart, arrivalHour, setArrivalHour]);
  useEffect(() => {
    if (!selected) return;
    const isPastH = (h: number) => isSelectedToday && h <= currentHour;
    const isBlocked = (h: number) =>
      isPastH(h) || isHourBlocked(selectedDayBooked, h, rentalHours);
    if (isBlocked(arrivalHour)) {
      for (let h = 9; h <= maxStart; h++) {
        if (!isBlocked(h) && h + rentalHours <= 19) {
          setArrivalHour(h);
          return;
        }
      }
    }
    // Quatre dépendances manquaient (currentHour, rentalHours, arrivalHour,
    // maxStart) : l'heure d'arrivée pouvait rester sur un créneau déjà réservé
    // ou déjà passé. Ne boucle pas : l'heure retenue n'est plus bloquée.
  }, [
    selected,
    selectedDayBooked,
    isSelectedToday,
    arrivalHour,
    maxStart,
    currentHour,
    rentalHours,
    setArrivalHour,
  ]);
  useEffect(() => {
    if (selected) return;
    if (availLoading) return;
    if (viewY !== todayY || viewM !== todayM) return;
    const isFullDay = rentalHours >= 8;
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const hasValidArrival = (d: number) => {
      const booked = bookedHoursMap[d];
      const sameAsToday = d === todayD;
      for (let h = 9; h <= 19 - rentalHours; h++) {
        if (sameAsToday && h <= currentHour) continue;
        if (isHourBlocked(booked, h, rentalHours)) continue;
        return true;
      }
      return false;
    };
    for (let d = todayD; d <= daysInMonth; d++) {
      const dow = new Date(viewY, viewM, d).getDay();
      const weekend = dow === 0 || dow === 6;
      if (weekend && !isFullDay) continue;
      const av = availMap[d] || 'free';
      if (av === 'unavailable') continue;
      if (!hasValidArrival(d)) continue;
      setSelected({ y: viewY, m: viewM, d });
      return;
    }
    // Ne boucle pas : le garde `if (selected) return` coupe dès la sélection.
  }, [
    availLoading,
    availMap,
    bookedHoursMap,
    selected,
    viewY,
    viewM,
    rentalHours,
    todayY,
    todayM,
    todayD,
    currentHour,
    setSelected,
  ]);
  return (
    <div>
      <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local">
        <span className="edo-cell-label text-primary whitespace-nowrap">{`06 · ${t('booking.pickADate')}`}</span>
      </div>

      <div className="flex min-w-0 edo-hairline">
        <div className="flex min-w-0 flex-1 items-baseline gap-x-4 md:gap-x-6 gap-y-2 bg-white px-5 md:px-6 py-3 flex-wrap">
          <h2 className="m-0 text-page-title font-light tracking-headline shrink-0">
            {months[viewM]}{' '}
            <span className="text-muted-foreground">{viewY}</span>
          </h2>
          <div className="flex items-center gap-x-3 gap-y-1.5 font-mono text-label tracking-ui uppercase text-muted-foreground flex-wrap">
            {availLoading && (
              <span className="text-primary animate-pulse">
                {t('booking.calLoading')}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block w-2.5 h-2.5 bg-white border border-foreground"
              />
              {t('booking.calFreeLegend')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block w-2.5 h-2.5 bg-edo-sand border border-edo-sand"
              />
              {t('booking.calPartialLegend')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block w-2.5 h-2.5 bg-edo-gray-50 border border-input"
              />
              {t('booking.calUnavailableLegend')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block w-2.5 h-2.5 bg-primary border border-primary"
              />
              {t('booking.calSelectedLegend')}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={prevMonth}
          aria-label={t('booking.calPrevMonth')}
          className="edo-focus-ring flex basis-header flex-none cursor-pointer items-center justify-center border-0 bg-white font-mono text-detail text-foreground transition-colors hover:bg-muted"
        >
          {'←'}
        </button>
        <button
          type="button"
          onClick={nextMonth}
          aria-label={t('booking.calNextMonth')}
          className="edo-focus-ring flex basis-header flex-none cursor-pointer items-center justify-center border-0 bg-white font-mono text-detail text-foreground transition-colors hover:bg-muted"
        >
          {'→'}
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-hairline w-full">
        {days.map((d, i) => (
          <div
            key={i}
            className="bg-edo-gray-50 py-2.5 text-center font-mono text-caption tracking-meta uppercase text-muted-foreground border-r border-input last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className={`grid grid-cols-7 border-b border-hairline w-full transition-opacity duration-200 ${availLoading ? 'opacity-60' : ''}`}
      >
        {calCells.map((d, i) => {
          if (d === null)
            return (
              <div
                key={i}
                className="bg-edo-gray-50 aspect-cal-cell border-r border-b border-input"
              />
            );
          const dow = new Date(viewY, viewM, d).getDay();
          const weekend = dow === 0 || dow === 6;
          const isFullDay = rentalHours >= 8;
          const weekendBlocked = weekend && !isFullDay;
          const av = weekendBlocked ? 'unavailable' : availMap[d] || 'free';
          const past = isPast(d);
          const sel = isSelected(d);
          const clickable = !past && av !== 'unavailable';
          const tdy = isToday(d);
          const partial =
            !sel &&
            !past &&
            av === 'free' &&
            !weekendBlocked &&
            !!bookedHoursMap[d] &&
            bookedHoursMap[d].size > 0;
          return (
            <button
              type="button"
              key={i}
              disabled={!clickable}
              onClick={() => setSelected({ y: viewY, m: viewM, d })}
              title={
                weekendBlocked
                  ? t('booking.weekendFullDayOnly')
                  : tdy
                    ? t('booking.today')
                    : ''
              }
              className={[
                'aspect-cal-cell border-r border-b border-input flex flex-col items-start justify-start text-left font-inherit min-w-0 p-1.5 sm:p-2 relative transition-colors duration-100',
                sel
                  ? 'bg-primary text-white cursor-pointer hover:bg-primary/85'
                  : past
                    ? 'bg-edo-gray-50 text-muted-foreground/30 cursor-not-allowed'
                    : av === 'unavailable'
                      ? 'bg-edo-gray-50 text-muted-foreground/40 cursor-not-allowed'
                      : partial
                        ? 'bg-edo-sand text-foreground cursor-pointer hover:bg-edo-warm'
                        : tdy
                          ? 'bg-primary/8 text-foreground cursor-pointer hover:bg-primary/15'
                          : 'bg-white text-foreground cursor-pointer hover:bg-edo-gray-100',
              ].join(' ')}
            >
              <span
                className={[
                  'text-detail sm:text-cell tabular-nums leading-none',
                  sel
                    ? 'font-semibold text-white'
                    : partial
                      ? 'font-medium text-foreground'
                      : tdy
                        ? 'font-bold text-primary'
                        : past
                          ? 'font-normal'
                          : 'font-medium',
                ].join(' ')}
              >
                {d}
              </span>
              {tdy && !sel && !partial && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
              {!past && av !== 'unavailable' && !weekendBlocked && (
                <span
                  className={`font-mono text-nano sm:text-micro tracking-caption uppercase mt-auto ${sel ? 'text-white/70' : partial ? 'text-muted-foreground' : tdy ? 'text-primary/70' : 'text-muted-foreground'}`}
                >
                  {partial ? t('booking.calPartial') : t('booking.freeLower')}
                </span>
              )}
              {weekendBlocked && !past && (
                <span className="font-mono text-nano sm:text-micro tracking-caption uppercase mt-auto text-muted-foreground/50">
                  {t('booking.fullDayLower')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-b border-hairline bg-white px-5 md:px-6 py-2.5 flex items-center gap-3 md:gap-5 flex-wrap">
        <span className="edo-cell-label">{t('booking.arrivalTime')}</span>
        <span className="font-mono text-label tracking-ui text-muted-foreground">
          {String(arrivalHour).padStart(2, '0')}:00 {'→'}{' '}
          {String(arrivalHour + rentalHours).padStart(2, '0')}:00 {'·'}{' '}
          {rentalHours}h
        </span>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-hairline bg-white border-b border-hairline w-full">
        {Array.from({ length: 10 }, (_, i) => i + 9).map((h) => {
          const on = arrivalHour === h;
          const endsTooLate = h + rentalHours > 19;
          const pastHour = isSelectedToday && h <= currentHour;
          const booked = isHourBlocked(selectedDayBooked, h, rentalHours);
          const disabled = endsTooLate || pastHour || booked;
          return (
            <button
              type="button"
              key={h}
              disabled={disabled}
              onClick={() => !disabled && setArrivalHour(h)}
              title={
                booked
                  ? t('booking.slotAlreadyBooked')
                  : pastHour
                    ? t('booking.pastTimeSlot')
                    : endsTooLate
                      ? t('booking.endsPastClosing', { hour: h + rentalHours })
                      : ''
              }
              className={`${on ? 'bg-foreground text-white' : disabled ? 'bg-muted text-muted-foreground' : 'bg-white text-foreground hover:bg-edo-gray-100'} border-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} flex items-center justify-center font-mono text-caption tracking-caption min-w-0 py-3 sm:py-0 sm:aspect-arrival transition-colors duration-100${booked ? ' line-through' : ''}`}
            >
              {String(h).padStart(2, '0')}:00
            </button>
          );
        })}
      </div>
    </div>
  );
};

const StepperBtn = ({ onClick, children }: AnyProps) => (
  <button
    type="button"
    onClick={onClick}
    className="edo-focus-ring w-7.5 h-8 flex-none basis-8 border border-border bg-white cursor-pointer text-cell text-foreground font-inherit inline-flex items-center justify-center transition-all duration-150 hover:scale-102 hover:border-foreground"
  >
    {children}
  </button>
);

const BentoSlotTile = ({
  idx,
  on,
  onClick,
  label,
  sub,
  desc,
  price,
  hint,
  lang,
}: AnyProps) => {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group edo-focus-ring ${on ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-muted'} border-0 px-cell py-4 text-left cursor-pointer font-inherit flex flex-col gap-1.5 transition-all duration-150 min-w-0 min-h-44`}
    >
      <div className="flex justify-between items-start">
        <span
          className={`font-mono text-label tracking-meta ${on ? 'text-white/60' : 'text-muted-foreground'}`}
        >
          {String(idx).padStart(2, '0')}
        </span>
        {on ? (
          <span className="text-primary text-cell leading-none">●</span>
        ) : (
          <span
            data-slot-arrow
            className={`text-primary text-cell leading-none transition-all duration-200 origin-right ${on ? '' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-110'}`}
          >
            →
          </span>
        )}
      </div>
      <div
        data-slot-label
        className={`text-page-title font-light tracking-headline mt-1 transition-transform duration-200 origin-left ${on ? '' : 'group-hover:scale-102'}`}
      >
        {label}
      </div>
      {sub && (
        <div
          className={`font-mono text-label tracking-code uppercase ${on ? 'text-white/55' : 'text-muted-foreground'}`}
        >
          {sub}
        </div>
      )}
      {desc && (
        <div
          className={`text-detail ${on ? 'text-white/65' : 'text-muted-foreground'} leading-snug`}
        >
          {desc}
        </div>
      )}
      <div
        className={`mt-auto pt-3 flex justify-between items-baseline border-t ${on ? 'border-t-white/15' : 'border-t-border'}`}
      >
        <span
          className={`font-mono text-label tracking-caption ${on ? 'text-white/55' : 'text-muted-foreground'} uppercase`}
        >
          {hint || t('booking.rateExVat')}
        </span>
        <span className="text-cell font-medium tabular-nums">{price}</span>
      </div>
    </button>
  );
};

const Step3Slot = ({
  lang,
  p,
  slotType,
  setSlotType,
  hours,
  setHours,
  cycloMode,
  setCycloMode,
}: AnyProps) => {
  const t = useT();
  if (p.isCyclo) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-3 edo-hairline w-full auto-rows-bento">
          <BentoSlotTile
            idx={1}
            on={cycloMode === 'halfH'}
            onClick={() => setCycloMode('halfH')}
            label={t('booking.halfDay')}
            sub="5 heures"
            desc={t('booking.HourBlockPerfectFor')}
            price="650 €"
            lang={lang}
          />
          <BentoSlotTile
            idx={2}
            on={cycloMode === 'fullH'}
            onClick={() => setCycloMode('fullH')}
            label={t('booking.fullDay')}
            sub="10 heures"
            desc={t('booking.HourBlockECommerce')}
            price="880 €"
            lang={lang}
          />
          <BentoSlotTile
            idx={3}
            on={cycloMode === 'editorial'}
            onClick={() => setCycloMode('editorial')}
            label={t('booking.editorial')}
            sub="10 heures"
            desc={t('booking.reducedRateForPressPersonal')}
            price={t('common.onRequest')}
            hint={t('booking.pressPersonal')}
            lang={lang}
          />
        </div>
      </div>
    );
  }
  if (p.isVisite) {
    return (
      <div>
        <div className="px-5 md:px-12">
          <StepIntro
            n="02"
            lang={lang}
            t={t('booking.studioVisit')}
            s={t('booking.studioVisitIsFreeAnd')}
          />
        </div>
        <div className="grid grid-cols-1 gap-hairline bg-white border-t border-b border-hairline w-full">
          <div className="bg-white px-5 md:px-12 py-6 md:py-8 flex flex-wrap items-baseline gap-3 md:gap-5">
            <span className="text-hero font-light tracking-display leading-none">
              0 €
            </span>
            <span className="font-mono text-caption tracking-meta uppercase text-muted-foreground">
              {t('booking.freeByAppointment')}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 edo-hairline w-full auto-rows-bento">
        <BentoSlotTile
          idx={1}
          on={slotType === 'hour'}
          onClick={() => {
            setSlotType('hour');
            setHours(1);
          }}
          label={t('booking.hourly2')}
          sub={t('booking.To3Hours')}
          desc={t('booking.idealForATestOr')}
          price={`${p.rates.hour} €/h`}
          lang={lang}
        />
        <BentoSlotTile
          idx={2}
          on={slotType === 'half'}
          onClick={() => {
            setSlotType('half');
            setHours(4);
          }}
          label={t('booking.halfDay')}
          sub={t('booking.To7Hours')}
          desc={t('booking.HourBlockProRata')}
          price={`${p.rates.half} €`}
          lang={lang}
        />
        <BentoSlotTile
          idx={3}
          on={slotType === 'full'}
          onClick={() => {
            setSlotType('full');
            setHours(8);
          }}
          label={t('booking.fullDay')}
          sub={t('booking.Hours')}
          desc={t('booking.fullDayBestRate')}
          price={`${p.rates.full} €`}
          lang={lang}
        />
      </div>
      {(slotType === 'hour' || slotType === 'half') && (
        <div className="grid grid-cols-1 gap-hairline bg-white border-b border-hairline w-full">
          <div className="bg-white px-5 md:px-12 py-5 flex items-center justify-between gap-5 flex-wrap">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="edo-cell-label">
                {slotType === 'hour'
                  ? t('booking.numberOfHours')
                  : t('booking.hoursHalfDay')}
              </span>
              <span className="font-mono text-label tracking-caption text-muted-foreground leading-normal">
                {slotType === 'hour'
                  ? t('booking.from4hSwitchesToHalf')
                  : t('booking.proRataHint', { price: p.rates.half })}
              </span>
            </div>
            <div className="flex items-center gap-3.5">
              <StepperBtn
                onClick={() => {
                  if (slotType === 'hour') setHours(Math.max(1, hours - 1));
                  else {
                    const n = hours - 1;
                    if (n < 4) {
                      setSlotType('hour');
                      setHours(3);
                    } else setHours(n);
                  }
                }}
              >
                −
              </StepperBtn>
              <span className="text-page-title font-light tracking-headline min-w-10 text-center">
                {hours}
              </span>
              <StepperBtn
                onClick={() => {
                  const n = hours + 1;
                  if (n >= 8) {
                    setSlotType('full');
                    setHours(8);
                  } else if (slotType === 'hour' && n >= 4) {
                    setSlotType('half');
                    setHours(n);
                  } else {
                    setHours(n);
                  }
                }}
              >
                +
              </StepperBtn>
            </div>
          </div>
        </div>
      )}
      {slotType === 'full' && (
        <div className="grid grid-cols-1 gap-hairline bg-white border-b border-hairline w-full">
          <div className="bg-white px-5 md:px-12 py-5 flex items-center justify-between gap-5 flex-wrap">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="edo-cell-label">
                {t('booking.totalDuration')}
              </span>
              <span className="font-mono text-label tracking-caption text-muted-foreground leading-normal">
                {(() => {
                  const fullDays = Math.floor(hours / 8);
                  const extraH = hours - fullDays * 8;
                  if (extraH === 0) {
                    return t('booking.fullDaysTotal', {
                      days: fullDays,
                      unit: t('booking.fullDayUnit', { count: fullDays }),
                      hours,
                      amount: (p.rates.full * fullDays).toFixed(0),
                    });
                  }
                  const extraAmt = +((p.rates.full / 8) * extraH).toFixed(2);
                  return t('booking.fullDaysPlusExtra', {
                    days: fullDays,
                    unit: t('booking.fullDayUnit', { count: fullDays }),
                    baseHours: fullDays * 8,
                    extraHours: extraH,
                    amount: (p.rates.full * fullDays + extraAmt).toFixed(0),
                  });
                })()}
              </span>
            </div>
            <div className="flex items-center gap-3.5">
              <StepperBtn
                onClick={() => {
                  const n = hours - 1;
                  if (n < 8) {
                    setSlotType('half');
                    setHours(7);
                  } else {
                    setHours(n);
                  }
                }}
              >
                −
              </StepperBtn>
              <span className="text-page-title font-light tracking-headline min-w-16 text-center">
                {hours}h
              </span>
              <StepperBtn onClick={() => setHours(hours + 1)}>+</StepperBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Step5Team = ({ lang, p, team, setTeam, configSessions }: AnyProps) => {
  const t = useT();
  const setDays = (k, val) =>
    setTeam((prev) => {
      const n = { ...prev };
      if (val <= 0) delete n[k];
      else n[k] = val;
      return n;
    });
  const toggleReq = (k) =>
    setTeam((prev) => {
      const n = { ...prev };
      if (n[k] === true) delete n[k];
      else n[k] = true;
      return n;
    });
  const allSessions = configSessions || [];
  const plateauSessions = allSessions.filter((s) => {
    const rec = recommendSession(s, {});
    return rec && rec.plateau === p.k;
  });
  const hasPackshot = plateauSessions.some((s) => s.method === 'packshot');
  const hasNonPackshot =
    plateauSessions.length === 0 ||
    plateauSessions.some((s) => s.method !== 'packshot');
  const items = EQUIPE.filter((e) => {
    if (e.k === 'styliste_op') return hasPackshot;
    if (e.k === 'operateur') return hasNonPackshot;
    return true;
  });
  const hasPique = plateauSessions.some(
    (s) =>
      s.product === 'pap' && s.method === 'packshot' && s.submethod === 'pique',
  );
  const hasOnModel = plateauSessions.some((s) => s.method === 'onmodel');
  const recommended = { styliste_op: hasPique, plateau: hasOnModel };
  return (
    <div className="px-5 md:px-12 pb-6">
      <div className="flex flex-col gap-hairline bg-border">
        {items.map((e) => {
          const isHourly = e.unit === 'hour';
          const n = isHourly ? team[e.k] || 0 : 0;
          const onReq = !isHourly && team[e.k] === true;
          return (
            <div
              key={e.k}
              className="bg-white px-5 py-4 flex items-center justify-between gap-5"
            >
              <div>
                <div className="text-detail font-medium tracking-copy-tight flex items-center gap-2">
                  <span>{e[lang]}</span>
                  {recommended[e.k] && (
                    <span className="font-mono text-micro tracking-ui uppercase text-primary border border-primary px-1.5 py-0.5 leading-none">
                      {t('booking.recommended')}
                    </span>
                  )}
                </div>
                <div className="font-mono text-label text-muted-foreground mt-0.5">
                  {isHourly
                    ? `${fmtEUR(e.price)} € / ${e.unit === 'hour' ? 'h' : t('booking.day')}`
                    : t('booking.rateOnRequestBasedOn')}
                </div>
              </div>
              {isHourly ? (
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <span
                    className={`font-mono text-label tracking-ui uppercase ${n > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {n > 0 ? t('booking.included') : t('booking.add')}
                  </span>
                  <span
                    onClick={() => setDays(e.k, n > 0 ? 0 : 1)}
                    className={`w-5.5 h-5.5 border-1-5 ${n > 0 ? 'border-primary bg-primary' : 'border-input bg-white'} inline-flex items-center justify-center text-white text-detail font-bold`}
                  >
                    {n > 0 ? '✓' : ''}
                  </span>
                </label>
              ) : (
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <span
                    className={`font-mono text-label tracking-ui uppercase ${onReq ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {t('common.onRequest')}
                  </span>
                  <span
                    onClick={() => toggleReq(e.k)}
                    className={`w-5.5 h-5.5 border-1-5 ${onReq ? 'border-primary bg-primary' : 'border-input bg-white'} inline-flex items-center justify-center text-white text-detail font-bold`}
                  >
                    {onReq ? '✓' : ''}
                  </span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Step6Postprod = ({
  lang,
  postprod,
  setPostprod,
  plateauKey,
}: AnyProps) => {
  const t = useT();
  const enabled = !!postprod.enabled;
  const video = !!postprod.video;
  const videoAllowed = plateauKey !== 'vertical' && plateauKey !== 'horizontal';
  // `postprod` manquait alors que le corps l'étale : l'effet pouvait réécrire
  // un état périmé et perdre une modification faite entre-temps. Ne boucle pas,
  // `video` passant à false dès le premier passage.
  useEffect(() => {
    if (!videoAllowed && video) setPostprod({ ...postprod, video: false });
  }, [videoAllowed, video, postprod, setPostprod]);
  return (
    <div className="px-5 md:px-12 pb-6">
      <div className="flex flex-col gap-hairline bg-border">
        <div
          className={`bg-white px-5 md:px-6 py-5 flex items-center justify-between gap-5 ${enabled ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent'}`}
        >
          <div>
            <div className="text-cell font-medium tracking-copy-tight">
              {t('booking.postProductionByEDo2')}
            </div>
            <div className="font-mono text-label text-muted-foreground mt-1 leading-normal">
              {t('booking.selectionRetouchingDeliveryQuotedOn')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-label tracking-code uppercase ${enabled ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {enabled ? t('booking.yes') : t('booking.no')}
            </span>
            <Toggle
              on={enabled}
              onClick={() =>
                setPostprod({
                  ...postprod,
                  enabled: !enabled,
                  video: !enabled ? video : false,
                })
              }
            />
          </div>
        </div>
        {enabled && videoAllowed && (
          <div
            className={`bg-white px-5 md:px-6 py-5 flex items-center justify-between gap-5 ${video ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent'}`}
          >
            <div>
              <div className="text-cell font-medium tracking-copy-tight">
                {t('booking.videoEditing3')}
              </div>
              <div className="font-mono text-label text-muted-foreground mt-1 leading-normal">
                {t('booking.onlyIfYourProjectIncludes')}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-label tracking-code uppercase ${video ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {video ? t('booking.yes') : t('booking.no')}
              </span>
              <Toggle
                on={video}
                onClick={() => setPostprod({ ...postprod, video: !video })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ARTICLE_TYPES: AnyProps[] = [
  { k: 'pap', fr: 'Prêt-à-porter', en: 'Ready-to-wear' },
  { k: 'maroquinerie', fr: 'Maroquinerie', en: 'Leather goods' },
  { k: 'chaussures', fr: 'Chaussures', en: 'Shoes' },
  { k: 'accessoires', fr: 'Accessoires', en: 'Accessories' },
  { k: 'eyewear', fr: 'Eyewear', en: 'Eyewear' },
  { k: 'bijoux', fr: 'Bijoux', en: 'Jewelry' },
  { k: 'cosmetique', fr: 'Cosmétique', en: 'Cosmetics' },
  { k: 'food', fr: 'Food & spiritueux', en: 'Food & spirits' },
  { k: 'autre', fr: 'Autre', en: 'Other' },
];

const BentoField = ({ label, children, span, error }: AnyProps) => (
  <div
    className={`bg-white px-4 py-2.5 sm:px-3 sm:py-1.5 flex flex-col gap-hairline min-h-control ${error ? 'ring-1 ring-inset ring-red-400' : ''}`}
    {...(span ? { style: { gridColumn: span } } : {})}
  >
    <span className="edo-cell-label text-muted-foreground text-micro tracking-meta">
      {label}
    </span>
    {children}
    {error && (
      <span className="text-red-500 text-micro leading-tight">{error}</span>
    )}
  </div>
);

const BentoInput = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  name,
  autoComplete,
  inputMode,
}: AnyProps) => (
  <input
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    type={type}
    name={name}
    autoComplete={autoComplete}
    inputMode={inputMode}
    className="bg-transparent border-0 outline-none p-0 font-inherit text-detail tracking-copy-tight w-full text-foreground"
  />
);

const Step7Contact = ({
  lang,
  contact,
  setContact,
  p,
  configMode,
  errors = {},
}: AnyProps) => {
  const t = useT();
  const isCyclo = p && p.isCyclo;
  const hideProductFields = !!configMode;
  const toggleType = (k) => {
    const cur = contact.typesArticles || [];
    const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
    setContact({ ...contact, typesArticles: next });
  };
  return (
    <div>
      <div className="px-5 md:px-6 border-b border-hairline flex items-center min-h-control py-3 md:py-0 md:h-control box-border gap-3 bg-white flex-wrap sticky top-0 z-local">
        <span className="edo-cell-label text-primary whitespace-nowrap">
          05 · {t('assistant.contactFormTitle')}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 edo-hairline">
        <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 edo-hairline">
          <BentoField label={t('booking.brand')}>
            <BentoInput
              name="brand"
              value={contact.marque}
              onChange={(v) => setContact({ ...contact, marque: v })}
              placeholder="—"
            />
          </BentoField>
          <BentoField label={t('booking.company2')} error={errors.societe}>
            <BentoInput
              name="company"
              autoComplete="organization"
              value={contact.societe}
              onChange={(v) => setContact({ ...contact, societe: v })}
              placeholder="—"
            />
          </BentoField>
          <BentoField label="SIREN *" error={errors.siren}>
            <BentoInput
              name="siren"
              inputMode="numeric"
              value={contact.siren}
              onChange={(v) => setContact({ ...contact, siren: v })}
              placeholder="—"
            />
          </BentoField>
        </div>
        <BentoField
          label={t('booking.billingAddress')}
          span="1 / -1"
          error={errors.adresseFacturation}
        >
          <BentoInput
            name="address"
            autoComplete="street-address"
            value={contact.adresseFacturation}
            onChange={(v) => setContact({ ...contact, adresseFacturation: v })}
            placeholder="—"
          />
        </BentoField>
        <BentoField label={t('booking.lastName')} error={errors.nom}>
          <BentoInput
            name="lastname"
            autoComplete="family-name"
            value={contact.nom}
            onChange={(v) => setContact({ ...contact, nom: v })}
            placeholder="—"
          />
        </BentoField>
        <BentoField label={t('booking.firstName')} error={errors.prenom}>
          <BentoInput
            name="firstname"
            autoComplete="given-name"
            value={contact.prenom}
            onChange={(v) => setContact({ ...contact, prenom: v })}
            placeholder="—"
          />
        </BentoField>
        <BentoField label="Email *" error={errors.email}>
          <BentoInput
            name="email"
            autoComplete="email"
            value={contact.email}
            type="email"
            onChange={(v) => setContact({ ...contact, email: v })}
            placeholder="—"
          />
        </BentoField>
        <BentoField label={t('booking.phone')} error={errors.tel}>
          <BentoInput
            name="phone"
            autoComplete="tel"
            value={contact.tel}
            type="tel"
            onChange={(v) => setContact({ ...contact, tel: v })}
            placeholder="—"
          />
        </BentoField>
        {!isCyclo && !hideProductFields && (
          <>
            <div
              className={`bg-white px-3 py-1.5 col-span-1 sm:col-span-2 flex flex-col gap-1 min-h-control ${errors.typesArticles ? 'ring-1 ring-inset ring-red-400' : ''}`}
            >
              <span className="edo-cell-label text-muted-foreground text-micro tracking-meta">
                {t('booking.itemTypes')}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
                {ARTICLE_TYPES.map((t) => {
                  const on = (contact.typesArticles || []).includes(t.k);
                  return (
                    <button
                      type="button"
                      key={t.k}
                      onClick={() => toggleType(t.k)}
                      className={`${on ? 'bg-foreground text-white border-foreground' : 'bg-transparent text-foreground border-border'} border px-2 py-1 font-inherit text-caption cursor-pointer tracking-copy-tight inline-flex items-center justify-start gap-1 whitespace-nowrap min-w-0`}
                    >
                      <span
                        className={`w-2 h-2 border ${on ? 'border-white bg-primary' : 'border-muted-foreground bg-transparent'} inline-flex items-center justify-center shrink-0`}
                      >
                        {on && <span className="w-0.5 h-0.5 bg-white" />}
                      </span>
                      <span className="overflow-hidden text-ellipsis">
                        {t[lang]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {(contact.typesArticles || []).includes('autre') && (
                <input
                  name="other_item_type"
                  value={contact.autreType || ''}
                  onChange={(e) =>
                    setContact({ ...contact, autreType: e.target.value })
                  }
                  placeholder={t('booking.specifyOtherItemType')}
                  className="mt-0.5 bg-transparent border-0 border-b border-b-border outline-none py-1 px-0 font-inherit text-caption tracking-copy-tight w-full text-foreground"
                />
              )}
              {errors.typesArticles && (
                <span className="text-red-500 text-micro leading-tight">
                  {errors.typesArticles}
                </span>
              )}
            </div>
            <BentoField
              label={t('booking.qtyItemsSkus')}
              error={errors.quantiteArticles}
            >
              <BentoInput
                name="quantity_items"
                value={contact.quantiteArticles}
                type="number"
                onChange={(v) =>
                  setContact({ ...contact, quantiteArticles: v })
                }
                placeholder="—"
              />
            </BentoField>
            <BentoField
              label={t('booking.viewsItem')}
              error={errors.vuesParArticle}
            >
              <BentoInput
                name="views_per_item"
                value={contact.vuesParArticle}
                type="number"
                onChange={(v) => setContact({ ...contact, vuesParArticle: v })}
                placeholder="—"
              />
            </BentoField>
          </>
        )}
        <div className="bg-white px-3 py-1.5 col-span-1 sm:col-span-2 flex flex-col gap-0.5 min-h-control">
          <span className="edo-cell-label text-muted-foreground text-micro tracking-meta">
            {t('booking.otherInformation')}
          </span>
          <textarea
            name="message"
            value={contact.autresInfos || ''}
            onChange={(e) =>
              setContact({ ...contact, autresInfos: e.target.value })
            }
            placeholder={t('booking.constraintsInspirationsReferencesOptional')}
            className="w-full box-border bg-transparent border-0 outline-none p-0 font-inherit text-caption min-h-7 resize-y text-foreground"
          />
        </div>
        <label
          className={`col-span-1 sm:col-span-2 bg-white px-3 py-1.5 flex flex-col gap-0.5 cursor-pointer min-h-control ${errors.cgvAccepted ? 'ring-1 ring-inset ring-red-400' : ''}`}
        >
          <span className="edo-cell-label text-muted-foreground text-micro tracking-meta">
            CGV *
          </span>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="cgv_accepted"
              checked={!!contact.cgvAccepted}
              onChange={(e) =>
                setContact({ ...contact, cgvAccepted: e.target.checked })
              }
              className="w-3.5 h-3.5 accent-primary cursor-pointer shrink-0"
            />
            <span className="text-caption leading-snug text-foreground">
              {/* Le lien vit dans la traduction : sa position dans la phrase
                  n'est pas la même d'une langue à l'autre. */}
              <Trans
                i18nKey="booking.cgvConsent"
                components={{
                  cgv: (
                    // biome-ignore lint/a11y/useAnchorContent: le contenu vient de la traduction
                    <a
                      href={`/${lang}/legal?doc=cgv`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    />
                  ),
                }}
              />
            </span>
          </div>
          {errors.cgvAccepted && (
            <span className="text-red-500 text-micro leading-tight">
              {errors.cgvAccepted}
            </span>
          )}
        </label>
      </div>
    </div>
  );
};

const SidePanel = ({
  lang,
  p,
  selected,
  months,
  slotType,
  hours,
  cycloMode,
  rows,
  total,
  isPreview,
  step,
  slotIds,
  slots,
}: AnyProps) => {
  const t = useT();
  const slotLbl = isPreview
    ? t('booking.liveEstimate')
    : p.isCyclo
      ? cycloMode === 'halfH'
        ? '5h'
        : cycloMode === 'fullH'
          ? '10h'
          : t('booking.cyclo10hEditorial')
      : p.isVisite
        ? t('booking.visit2')
        : slotType === 'hour'
          ? `${hours}h`
          : slotType === 'half'
            ? (() => {
                const hh = Math.max(4, Math.min(7, hours || 4));
                return hh === 4 ? t('booking.halfDayAbbrev') : `${hh}h`;
              })()
            : (() => {
                const totalH = hours || 8;
                const fullDays = Math.floor(totalH / 8);
                const extraH = totalH - fullDays * 8;
                const dUnit = t('booking.dayAbbrev');
                let s = `${fullDays} ${dUnit}`;
                if (extraH === 4) s += t('booking.plusHalfDayAbbrev');
                else if (extraH > 0) s += ` + ${extraH}h`;
                return s;
              })();
  const title = isPreview ? t('booking.estimate') : p[lang];
  const list: string[] = (slotIds || []).filter(Boolean);
  const isMulti = list.length > 1;
  const sameKeyCount: Record<string, number> = {};
  list.forEach((id: string) => {
    const k = (slots || {})[id]?.plateauKey || id;
    sameKeyCount[k] = (sameKeyCount[k] || 0) + 1;
  });
  const seenIdxByKey: Record<string, number> = {};
  return (
    <div className="bg-foreground md:col-start-4 md:row-start-2 text-white px-5 py-6 md:p-6 overflow-auto flex flex-col gap-4 md:gap-3.5 min-h-0">
      <div>
        <span className="edo-cell-label text-white/55 md:hidden">
          {t('booking.yourQuote')}
        </span>
        <h2 className="m-0 mt-2 md:mt-0 text-tile-large font-light tracking-headline text-white/85">
          {title}
        </h2>
        <div className="font-mono text-label text-white/55 mt-1 tracking-caption">
          {slotLbl}
        </div>
      </div>
      {(() => {
        if (isMulti) {
          const datedList = list
            .map((id: string) => {
              const st = (slots || {})[id] || {};
              const pk = st.plateauKey || id;
              const px = BOOK_PLATEAUX.find((x) => x.k === pk);
              seenIdxByKey[pk] = (seenIdxByKey[pk] || 0) + 1;
              const n = seenIdxByKey[pk];
              const label =
                sameKeyCount[pk] > 1
                  ? `${px ? px[lang] : pk} ${String(n).padStart(2, '0')}`
                  : px
                    ? px[lang]
                    : pk;
              return { id, label, d: st.date };
            })
            .filter((x: AnyProps) => x.d);
          if (datedList.length === 0) return null;
          return (
            <div className="pt-3.5 border-t border-white/10">
              <span className="edo-cell-label text-white/55 mb-1.5 block">
                {t('booking.dates')}
              </span>
              <div className="flex flex-col gap-1.5">
                {datedList.map(({ id, label, d }: AnyProps) => (
                  <div
                    key={id}
                    className="flex justify-between items-baseline gap-2 text-detail"
                  >
                    <span className="text-white/55 font-mono text-label tracking-caption uppercase">
                      {label}
                    </span>
                    <span className="tracking-copy-tight">
                      {d.d} {months[d.m]} {d.y}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (!selected) return null;
        return (
          <div className="pt-3.5 border-t border-white/10">
            <span className="edo-cell-label text-white/55 mb-1.5 block">
              {t('booking.date')}
            </span>
            <div className="text-cell tracking-copy-tight">
              {selected.d} {months[selected.m]} {selected.y}
            </div>
          </div>
        );
      })()}
      <div className="pt-3.5 border-t border-white/10 flex-1 min-h-0 flex flex-col">
        <span className="edo-cell-label text-white/55 mb-2.5 block">
          {t('booking.breakdown')}
        </span>
        <div className="flex flex-col gap-1.5 overflow-auto pr-1">
          {rows.length === 0 && (
            <span className="text-caption text-white/40">—</span>
          )}
          {rows.map((r: AnyProps, i: number) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex justify-between items-baseline gap-2 text-caption">
                <span className="tracking-copy-tight">
                  {(() => {
                    const idx = r.lbl.indexOf(' · ');
                    if (idx === -1)
                      return <span className="text-white/75">{r.lbl}</span>;
                    return (
                      <>
                        <span className="text-white/40">
                          {r.lbl.slice(0, idx)}
                        </span>
                        <span className="text-white/75">
                          {r.lbl.slice(idx)}
                        </span>
                      </>
                    );
                  })()}
                </span>
                <span className="font-mono tabular-nums text-white whitespace-nowrap">
                  {r.onReq ? t('booking.onRequestLower') : `${fmtEUR(r.amt)} €`}
                </span>
              </div>
              {r.breakdown && r.breakdown.length > 0 && (
                <div className="pl-0.5 flex flex-col gap-hairline">
                  {r.breakdown.map((b: AnyProps, bi: number) => {
                    const viewLbl = b.labels ? b.labels[lang] : null;
                    const formula =
                      b.imagesPerSku && b.imagesPerSku > 1
                        ? `${b.qty} × ${b.imagesPerSku} × ${fmtEUR(b.unit)} €`
                        : `${b.qty} × ${fmtEUR(b.unit)} €`;
                    const line = viewLbl ? `${viewLbl} · ${formula}` : formula;
                    return (
                      <div
                        key={bi}
                        className="flex justify-between gap-2 font-mono text-micro text-white/40 tracking-caption"
                      >
                        <span>→ {line}</span>
                        <span className="tabular-nums">
                          {fmtEUR(b.subtotal)} €
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="pt-3.5 border-t border-white/25">
        <div className="flex justify-between items-baseline">
          <span className="font-mono text-caption tracking-ui uppercase text-white/65">
            Total HT
          </span>
          <span className="text-page-title font-light tracking-headline tabular-nums">
            {fmtEUR(total)} €
          </span>
        </div>
        <div className="font-mono text-micro text-white/45 mt-1 tracking-ui">
          TVA 20% · {fmtEUR(total * 1.2)} € TTC
        </div>
        {rows.some((r: AnyProps) => r.estimate) && (
          <div className="font-mono text-micro text-white/45 mt-1.5 tracking-caption leading-normal">
            {t('booking.postProductionPriceIsAn')}
          </div>
        )}
      </div>
    </div>
  );
};

const Toggle = ({ on, onClick }: AnyProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-11.5 h-6.5 ${on ? 'bg-primary' : 'bg-border'} border-0 rounded-full relative cursor-pointer transition-colors duration-150`}
  >
    <span
      className={`absolute top-[3px] left-toggle-thumb ${on ? 'translate-x-5' : 'translate-x-0'} w-5 h-5 bg-white rounded-full transition-transform duration-150 shadow-toggle`}
    />
  </button>
);

export { BookPageV2 };
