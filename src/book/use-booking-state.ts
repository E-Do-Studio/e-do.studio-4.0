import { useEffect, useLayoutEffect, useState } from 'react';
import type {
  BookingSession,
  ConfigGlobal,
  DateSelection,
  SlotState,
  TeamState,
} from '../lib/booking-engine';
import { BOOK_PLATEAUX, makeBlankSession } from '../lib/booking-engine';
import type { BookingDraft } from '../lib/use-booking-draft';
import { loadDraft, useBookingDraftSaver } from '../lib/use-booking-draft';
import { STEP } from './booking-steps';
import type { ContactState } from './booking-types';

/**
 * Le consentement CGV n'est délibérément pas persisté par-delà un vrai
 * rechargement du navigateur (l'utilisateur doit recocher), mais il DOIT
 * survivre à la navigation entre étapes du configurateur : chaque étape est sa
 * propre route, donc BookPage se remonte et se réhydrate depuis le brouillon
 * d'une étape à l'autre. Ce drapeau au niveau du module distingue les deux — un
 * vrai rechargement réévalue le module (drapeau à false), une navigation en
 * session le conserve. Sans lui, la case cochée à l'étape contact est perdue
 * par l'étape date et la validation du « Réserver » final échoue.
 */
let cgvConsentGivenThisSession = false;

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

const blankContact = (): ContactState => ({
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
});

/**
 * Le mois affiché par le calendrier est de l'état d'affichage, pas une intention
 * de l'utilisateur — ne jamais le restaurer depuis le brouillon, un brouillon
 * périmé rouvrirait sur un mois passé. On le dérive de la date choisie tant
 * qu'elle est à venir, sinon d'aujourd'hui.
 */
const initialView = (draft: BookingDraft | null, today: Date) => {
  const sel = draft?.selected;
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (sel && new Date(sel.y, sel.m, 1) >= firstOfThisMonth) {
    return { y: sel.y, m: sel.m };
  }
  return { y: today.getFullYear(), m: today.getMonth() };
};

interface UseBookingStateArgs {
  forcedStep?: number;
  forceManual?: boolean;
}

/**
 * Tout l'état du tunnel, réhydraté du brouillon au montage. BookPage se remonte
 * à chaque étape (une route par étape) : le brouillon est la seule continuité.
 */
function useBookingState({ forcedStep, forceManual }: UseBookingStateArgs) {
  // Le brouillon n'est PAS lu au premier rendu : il vit dans localStorage, que
  // le serveur ne voit pas. Le lire ici faisait diverger le premier rendu
  // client du HTML serveur, et React jetait tout l'arbre (erreur #418, vue en
  // production sur /fr/reserver/manuel). Il est restauré juste après le
  // montage, une fois l'hydratation faite.
  // Faux tant que la restauration n'a pas eu lieu, qu'il y ait un brouillon ou
  // non : ce qui dépend de l'étape retrouvée (l'événement d'étape vue) attend
  // ce signal pour ne pas compter deux étapes par visite reprise.
  const [draftRestored, setDraftRestored] = useState(false);
  const [today] = useState(() => new Date());

  const [configGlobal, setConfigGlobal] = useState<ConfigGlobal>({
    projectType: 'ecom',
    urgency: 'flex',
    postprod: false,
  });
  const [configSessions, setConfigSessions] = useState<BookingSession[]>(() => [
    makeBlankSession(),
  ]);
  const [activeSessionIdx, setActiveSessionIdx] = useState(0);
  const [configApplied, setConfigApplied] = useState(() => {
    if (forceManual) return false;
    // Les routes-étapes au-delà du choix de plateau n'existent qu'en mode
    // configurateur : y arriver prouve qu'il a été appliqué.
    if (
      forcedStep != null &&
      forcedStep !== STEP.CONFIG &&
      forcedStep !== STEP.PLATEAU
    ) {
      return true;
    }
    return false;
  });

  const [plateau, setPlateau] = useState<string | null>(null);
  const [slotIds, setSlotIds] = useState<string[]>([]);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});

  const view = initialView(null, today);
  const [viewY, setViewY] = useState(view.y);
  const [viewM, setViewM] = useState(view.m);
  const [selected, setSelected] = useState<DateSelection | null>(null);
  const [arrivalHour, setArrivalHour] = useState(10);
  const [dateIdx, setDateIdx] = useState(0);

  const [slotType, setSlotType] = useState('hour');
  const [hours, setHours] = useState(1);
  const [cycloMode, setCycloMode] = useState('halfH');
  const [paint, setPaint] = useState(false);
  const [kwh, setKwh] = useState(0);
  const [team, setTeam] = useState<TeamState>({});
  const [pp, setPp] = useState<Record<string, unknown>>({});

  const [contact, setContact] = useState<ContactState>(() => blankContact());

  // Restauration du brouillon, après hydratation. `useLayoutEffect` et non
  // `useEffect` : l'écran ne doit pas peindre une étape vide avant de peindre
  // la sélection retrouvée.
  useLayoutEffect(() => {
    const saved = loadDraft();
    setDraftRestored(true);
    if (!saved) return;
    setConfigGlobal(saved.configGlobal as ConfigGlobal);
    setConfigSessions(saved.configSessions as BookingSession[]);
    setActiveSessionIdx(saved.activeSessionIdx);
    // Le mode manuel et les routes-étapes tranchent déjà `configApplied` ; le
    // brouillon ne parle que des cas qu'elles laissent ouverts.
    setConfigApplied((current) => current || saved.configApplied);
    setPlateau(saved.plateau);
    setSlotIds(saved.slotIds);
    setSlots(saved.slots as Record<string, SlotState>);
    const savedView = initialView(saved, today);
    setViewY(savedView.y);
    setViewM(savedView.m);
    setSelected(saved.selected);
    setArrivalHour(saved.arrivalHour);
    setDateIdx(saved.dateIdx);
    setSlotType(saved.slotType);
    setHours(saved.hours);
    setCycloMode(saved.cycloMode);
    setPaint(saved.paint);
    setKwh(saved.kwh);
    setTeam(saved.team as TeamState);
    setPp(saved.pp);
    setContact({
      ...(saved.contact as unknown as ContactState),
      cgvAccepted: cgvConsentGivenThisSession,
    });
  }, []);
  useEffect(() => {
    cgvConsentGivenThisSession = contact.cgvAccepted;
  }, [contact.cgvAccepted]);

  const togglePlateau = (k: string) => {
    setSlotIds((prev) => {
      const isAdding = !prev.includes(k);
      const next = isAdding ? [...prev, k] : prev.filter((x) => x !== k);
      setPlateau(next[0] || null);
      setSlots((prevSlots) => {
        if (isAdding) return { ...prevSlots, [k]: makeSlotState(k) };
        const rest = { ...prevSlots };
        delete rest[k];
        return rest;
      });
      return next;
    });
  };

  /**
   * Remet à zéro ce que l'utilisateur a choisi côté créneaux. Les coordonnées et
   * les sessions du configurateur ne bougent pas.
   */
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

  return {
    draftRestored,
    today,
    configGlobal,
    setConfigGlobal,
    configSessions,
    setConfigSessions,
    activeSessionIdx,
    setActiveSessionIdx,
    configApplied,
    setConfigApplied,
    plateau,
    setPlateau,
    slotIds,
    setSlotIds,
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
    setSlotType,
    hours,
    setHours,
    cycloMode,
    setCycloMode,
    paint,
    setPaint,
    kwh,
    setKwh,
    team,
    setTeam,
    pp,
    setPp,
    contact,
    setContact,
    togglePlateau,
    resetSelection,
  };
}

type BookingState = ReturnType<typeof useBookingState>;

/**
 * Écrit le brouillon à chaque changement d'état. `useBookingDraftSaver` vide sa
 * file au démontage : c'est ce qui fait survivre `configApplied` d'une
 * route-étape à la suivante.
 */
function usePersistBookingDraft(s: BookingState, step: number) {
  const saveDraft = useBookingDraftSaver(() => ({
    step,
    configGlobal: s.configGlobal,
    configSessions: s.configSessions,
    activeSessionIdx: s.activeSessionIdx,
    configApplied: s.configApplied,
    plateau: s.plateau,
    slotIds: s.slotIds,
    slots: s.slots,
    slotType: s.slotType,
    hours: s.hours,
    cycloMode: s.cycloMode,
    paint: s.paint,
    kwh: s.kwh,
    team: s.team,
    pp: s.pp,
    contact: s.contact as unknown as Record<string, unknown>,
    selected: s.selected,
    arrivalHour: s.arrivalHour,
    dateIdx: s.dateIdx,
    viewY: s.viewY,
    viewM: s.viewM,
  }));
  useEffect(saveDraft, [
    step,
    s.configGlobal,
    s.configSessions,
    s.activeSessionIdx,
    s.configApplied,
    s.plateau,
    s.slotIds,
    s.slots,
    s.slotType,
    s.hours,
    s.cycloMode,
    s.paint,
    s.kwh,
    s.team,
    s.pp,
    s.contact,
    s.selected,
    s.arrivalHour,
    s.dateIdx,
    s.viewY,
    s.viewM,
    saveDraft,
  ]);
}

export { makeSlotState, usePersistBookingDraft, useBookingState };
export type { BookingState };
