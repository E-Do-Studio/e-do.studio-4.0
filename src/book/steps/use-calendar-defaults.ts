import { useEffect } from 'react';
import type { AvailabilityState } from '../../lib/availability';
import { isHourBlocked } from '../../lib/availability';
import type { DateSelection } from '../../lib/booking-engine';

interface ArrivalHourGuardArgs {
  selected: DateSelection | null;
  /** Heures déjà réservées sur le jour sélectionné. */
  bookedHours: Set<number> | undefined;
  isSelectedToday: boolean;
  currentHour: number;
  arrivalHour: number;
  rentalHours: number;
  /** Heures d'ouverture et de fermeture du plateau (le cyclorama ouvre plus
   *  tôt et ferme plus tard). */
  openHour: number;
  closeHour: number;
  setArrivalHour: (hour: number) => void;
}

/**
 * Ramène l'heure d'arrivée sur un créneau tenable : ni avant l'ouverture du
 * plateau, ni au-delà de la fermeture compte tenu de la durée, ni sur une heure
 * déjà réservée ou déjà passée.
 *
 * Aucun des deux effets ne boucle : après correction la condition d'entrée est
 * fausse.
 */
function useArrivalHourGuard({
  selected,
  bookedHours,
  isSelectedToday,
  currentHour,
  arrivalHour,
  rentalHours,
  openHour,
  closeHour,
  setArrivalHour,
}: ArrivalHourGuardArgs) {
  const maxStart = closeHour - rentalHours;

  useEffect(() => {
    // Un brouillon restauré peut porter 9h sur un plateau qui ouvre à 10h.
    if (arrivalHour > maxStart || arrivalHour < openHour) {
      setArrivalHour(Math.max(openHour, Math.min(10, maxStart)));
    }
  }, [openHour, maxStart, arrivalHour, setArrivalHour]);

  useEffect(() => {
    if (!selected) return;
    const isBlocked = (h: number) =>
      (isSelectedToday && h <= currentHour) ||
      isHourBlocked(bookedHours, h, rentalHours);
    if (!isBlocked(arrivalHour)) return;
    for (let h = openHour; h <= maxStart; h++) {
      if (!isBlocked(h) && h + rentalHours <= closeHour) {
        setArrivalHour(h);
        return;
      }
    }
    // Quatre dépendances manquaient (currentHour, rentalHours, arrivalHour,
    // maxStart) : l'heure d'arrivée pouvait rester sur un créneau déjà réservé
    // ou déjà passé.
  }, [
    selected,
    bookedHours,
    isSelectedToday,
    arrivalHour,
    openHour,
    maxStart,
    currentHour,
    rentalHours,
    setArrivalHour,
  ]);
}

interface FirstFreeDayArgs {
  selected: DateSelection | null;
  availLoading: boolean;
  availMap: Record<number, AvailabilityState>;
  bookedHoursMap: Record<number, Set<number>>;
  viewY: number;
  viewM: number;
  today: { y: number; m: number; d: number };
  currentHour: number;
  rentalHours: number;
  openHour: number;
  closeHour: number;
  setSelected: (date: DateSelection) => void;
}

/**
 * Pré-sélectionne le premier jour réservable du mois courant, pour que l'écran
 * n'ouvre pas sur un calendrier vide. Ne s'applique qu'au mois en cours : sur un
 * mois parcouru à la main, le choix reste à l'utilisateur.
 *
 * Le week-end n'ouvre qu'à la journée complète.
 */
function useFirstFreeDay({
  selected,
  availLoading,
  availMap,
  bookedHoursMap,
  viewY,
  viewM,
  today,
  currentHour,
  rentalHours,
  openHour,
  closeHour,
  setSelected,
}: FirstFreeDayArgs) {
  useEffect(() => {
    if (selected || availLoading) return;
    if (viewY !== today.y || viewM !== today.m) return;
    const isFullDay = rentalHours >= 8;
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const hasValidArrival = (d: number) => {
      const booked = bookedHoursMap[d];
      for (let h = openHour; h <= closeHour - rentalHours; h++) {
        if (d === today.d && h <= currentHour) continue;
        if (isHourBlocked(booked, h, rentalHours)) continue;
        return true;
      }
      return false;
    };
    for (let d = today.d; d <= daysInMonth; d++) {
      const dow = new Date(viewY, viewM, d).getDay();
      const weekend = dow === 0 || dow === 6;
      if (weekend && !isFullDay) continue;
      if ((availMap[d] || 'free') === 'unavailable') continue;
      if (!hasValidArrival(d)) continue;
      setSelected({ y: viewY, m: viewM, d });
      return;
    }
    // Ne boucle pas : le garde `if (selected)` coupe dès la sélection.
  }, [
    availLoading,
    availMap,
    bookedHoursMap,
    selected,
    viewY,
    viewM,
    rentalHours,
    openHour,
    closeHour,
    today.y,
    today.m,
    today.d,
    currentHour,
    setSelected,
  ]);
}

export { useArrivalHourGuard, useFirstFreeDay };
