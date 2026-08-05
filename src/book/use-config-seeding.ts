import type { TFunction } from 'i18next';
import { useEffect } from 'react';
import type {
  BookingSession,
  PostprodState,
  Recommendation,
  SlotState,
} from '../lib/booking-engine';
import {
  BOOK_PLATEAUX,
  computePostprodPrice,
  recommendProjectLevel,
  recommendSession,
  slotIdFor,
} from '../lib/booking-engine';
import type { BookMode } from './book-routes';
import { STEP } from './booking-steps';
import { PRODUCTS, catLabel, findEntry } from './catalog';
import type { BookingState } from './use-booking-state';

/** Une session ne vaut d'être projetée en créneau que si elle est exploitable. */
const isSeedable = (s: BookingSession) =>
  s.projectType === 'cyclorama' ||
  (s.projectType === 'ecom' && !!s.product && Number(s.quantity) > 0);

interface UseConfigSeedingArgs {
  state: BookingState;
  step: number;
  forceManual?: boolean;
  goToStep: (n: number, mode?: BookMode) => void;
  t: TFunction;
}

/**
 * Projette les sessions du configurateur en créneaux réservables, et expose les
 * deux sorties de l'étape 0 : appliquer la recommandation, ou passer en manuel.
 */
function useConfigSeeding({
  state,
  step,
  forceManual,
  goToStep,
  t,
}: UseConfigSeedingArgs) {
  const {
    configGlobal,
    configSessions,
    configApplied,
    setConfigApplied,
    setSlots,
    setSlotIds,
    setPlateau,
    setSlotType,
    setHours,
    setCycloMode,
    setTeam,
    setPp,
    setContact,
  } = state;

  const seedFromConfig = (): BookingSession[] | null => {
    const seedable = configSessions
      .map((session, sessionIdx) => ({ session, sessionIdx }))
      .filter(({ session }) => isSeedable(session))
      .map(({ session, sessionIdx }) => ({
        session,
        sessionIdx,
        rec: recommendSession(session, configGlobal) as Recommendation,
      }));
    if (seedable.length === 0) return null;

    const sessions = seedable.map((v) => v.session);
    const proj = recommendProjectLevel(sessions, configGlobal);

    setSlots((prev) => {
      // Les personnalisations sont retrouvées par index de session, pas par
      // identifiant de créneau : elles survivent ainsi au reciblage d'une
      // session vers un autre plateau, qui change le slotId.
      const prevBySessionIdx = new Map<number, SlotState>();
      for (const s of Object.values(prev)) {
        if (s?.configSessionIdx != null)
          prevBySessionIdx.set(s.configSessionIdx, s);
      }
      const next: Record<string, SlotState> = {};
      for (const { session, sessionIdx, rec } of seedable) {
        const id = slotIdFor(rec.plateau, sessionIdx);
        const isCyclo = !!BOOK_PLATEAUX.find((x) => x.k === rec.plateau)
          ?.isCyclo;
        // Ni styliste ni opérateur sur cyclorama.
        const dropIfCyclo = (team: SlotState['team']) => {
          const copy = { ...(team || {}) };
          if (isCyclo) {
            delete copy.styliste_op;
            delete copy.operateur;
          }
          return copy;
        };
        const ppPrice = session.postprod ? computePostprodPrice(session) : null;
        const postprod: PostprodState = session.postprod
          ? {
              enabled: true,
              video: !!session.postprodVideo,
              amount: ppPrice?.amount ?? 0,
              images: ppPrice?.images ?? 0,
              breakdown: ppPrice?.breakdown ?? [],
              perView: !!ppPrice?.perView,
            }
          : {};
        const preserved = prev[id] ?? prevBySessionIdx.get(sessionIdx);
        next[id] = {
          plateauKey: rec.plateau,
          slotType: rec.slotType || 'hour',
          hours: rec.hours || 1,
          cycloMode: rec.cycloMode || 'halfH',
          paint: preserved?.paint ?? false,
          kwh: preserved?.kwh ?? 0,
          team: preserved?.team
            ? dropIfCyclo(preserved.team)
            : dropIfCyclo(proj.team),
          postprod,
          date: preserved?.date ?? null,
          arrivalHour: preserved?.arrivalHour,
          configSessionIdx: sessionIdx,
        };
      }
      return next;
    });

    setSlotIds(seedable.map((v) => slotIdFor(v.rec.plateau, v.sessionIdx)));
    const first = seedable[0].rec;
    setPlateau(first.plateau);
    if (first.cycloMode) setCycloMode(first.cycloMode);
    if (first.slotType) {
      setSlotType(first.slotType);
      setHours(first.hours);
    }
    setTeam(proj.team);
    setPp({});
    return sessions;
  };

  const applyConfig = () => {
    const sessions = seedFromConfig();
    if (!sessions) return;
    setContact((c) => ({
      ...c,
      typesArticles: sessions
        .map((s) => catLabel(t, findEntry(PRODUCTS, s.product)))
        .filter(Boolean),
      quantiteArticles: String(
        sessions.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0) || '',
      ),
      vuesParArticle: '',
    }));
    setConfigApplied(true);
    goToStep(STEP.DURATION, 'config');
  };

  const skipConfig = () => {
    setConfigApplied(false);
    setSlotIds([]);
    setSlots({});
    setPlateau(null);
    goToStep(STEP.PLATEAU, 'manual');
  };

  // Re-projette les créneaux quand l'utilisateur édite l'étape 0 (aperçu en
  // direct) ou quand le configurateur a été appliqué. Jamais en flux manuel :
  // cela écraserait ses sélections.
  useEffect(() => {
    if (forceManual) return;
    if (!configApplied && step !== STEP.CONFIG) return;
    if (!configSessions.some(isSeedable)) return;
    seedFromConfig();
  }, [configSessions, configGlobal, configApplied, step, forceManual]);

  return { applyConfig, skipConfig };
}

export { useConfigSeeding };
