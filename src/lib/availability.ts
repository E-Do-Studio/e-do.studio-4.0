import { useState, useEffect, useRef } from 'react';
import { closingHourForKey, openingHourForKey } from './booking-engine';
import { supabase } from './supabase';

export type AvailabilityState = 'free' | 'unavailable';

const dayCache = new Map<string, Record<number, AvailabilityState>>();

export function clearAvailabilityCache(): void {
  dayCache.clear();
}

function getOccupiedHours(
  arrivalHour: number,
  totalHours: number,
  closeHour: number,
): number[] {
  const hours: number[] = [];
  for (
    let h = arrivalHour;
    h < arrivalHour + totalHours && h < closeHour;
    h++
  ) {
    hours.push(h);
  }
  return hours;
}

function isDayFullyBooked(
  occupiedHours: Set<number>,
  rentalHours: number,
  openHour: number,
  closeHour: number,
): boolean {
  for (
    let start = openHour;
    start <= closeHour - rentalHours;
    start++
  ) {
    let fits = true;
    for (let h = start; h < start + rentalHours; h++) {
      if (occupiedHours.has(h)) {
        fits = false;
        break;
      }
    }
    if (fits) return false;
  }
  return true;
}

interface Occupancy {
  sessions: {
    session_date: string | null;
    arrival_hour: number | null;
    hours: number | null;
  }[];
  blocked: string[];
}

/**
 * L'occupation d'un plateau sur une période, sans donnée client. Depuis le
 * service de réservation quand `VITE_BOOKING_API_URL` est posé, sinon depuis
 * Supabase (fonction `booking_availability` : la clé anon n'a plus le droit de
 * lire bookings, qui porte les coordonnées des clients). `null` : échec.
 */
async function fetchOccupancy(
  plateauKey: string,
  from: string,
  to: string,
  signal: AbortSignal,
): Promise<Occupancy | null> {
  const service = import.meta.env.VITE_BOOKING_API_URL;
  if (service) {
    const params = new URLSearchParams({ plateau: plateauKey, from, to });
    const res = await fetch(
      `${service.replace(/\/$/, '')}/v1/public/availability?${params}`,
      { signal },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      sessions: Occupancy['sessions'];
      blockedDates: string[];
    };
    return { sessions: body.sessions, blocked: body.blockedDates };
  }

  const [
    { data: sessData, error: sessErr },
    { data: blockedData, error: blockedErr },
  ] = await Promise.all([
    supabase.rpc('booking_availability', {
      p_plateau_key: plateauKey,
      p_from: from,
      p_to: to,
    }),
    (supabase as any)
      .from('blocked_dates')
      .select('date')
      .gte('date', from)
      .lte('date', to),
  ]);
  if (sessErr || blockedErr) return null;
  return {
    sessions: sessData ?? [],
    blocked: ((blockedData ?? []) as { date: string }[])
      .map((r) => r.date)
      .filter(Boolean),
  };
}

export function useAvailability(
  plateauKey: string | undefined,
  year: number,
  month: number,
  rentalHours: number = 1,
  refreshKey: number = 0,
): {
  availMap: Record<number, AvailabilityState>;
  bookedHoursMap: Record<number, Set<number>>;
  loading: boolean;
} {
  const [availMap, setAvailMap] = useState<Record<number, AvailabilityState>>(
    {},
  );
  const [bookedHoursMap, setBookedHoursMap] = useState<
    Record<number, Set<number>>
  >({});
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!plateauKey) return;

    const cacheKey = `${plateauKey}-${year}-${month}-${rentalHours}`;
    const cachedDay = dayCache.get(cacheKey);
    if (cachedDay && refreshKey === 0) {
      setAvailMap(cachedDay);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    fetchOccupancy(plateauKey, startDate, endDate, controller.signal)
      .then((occupancy) => {
        if (controller.signal.aborted) return;

        if (!occupancy) {
          setLoading(false);
          return;
        }
        const { sessions: sessData, blocked: blockedData } = occupancy;

        const blockedSet = new Set(blockedData);

        const openHour = openingHourForKey(plateauKey);
        const closeHour = closingHourForKey(plateauKey);
        const occupiedPerDay: Record<number, Set<number>> = {};
        if (sessData) {
          for (const session of sessData) {
            if (
              !session.session_date ||
              session.arrival_hour == null ||
              session.hours == null
            )
              continue;
            const day = new Date(session.session_date + 'T00:00:00').getDate();
            if (!occupiedPerDay[day]) occupiedPerDay[day] = new Set();
            for (const h of getOccupiedHours(
              session.arrival_hour,
              session.hours,
              closeHour,
            )) {
              occupiedPerDay[day].add(h);
            }
          }
        }

        const result: Record<number, AvailabilityState> = {};
        for (let d = 1; d <= lastDay; d++) {
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (blockedSet.has(ds)) {
            result[d] = 'unavailable';
          } else {
            const occupied = occupiedPerDay[d] || new Set();
            result[d] = isDayFullyBooked(
              occupied,
              rentalHours,
              openHour,
              closeHour,
            )
              ? 'unavailable'
              : 'free';
          }
        }

        dayCache.set(cacheKey, result);
        setAvailMap(result);
        setBookedHoursMap(occupiedPerDay);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [plateauKey, year, month, rentalHours, refreshKey]);

  return { availMap, bookedHoursMap, loading };
}

export function isHourBlocked(
  bookedHours: Set<number> | undefined,
  arrivalHour: number,
  rentalHours: number,
): boolean {
  if (!bookedHours || bookedHours.size === 0) return false;
  for (let h = arrivalHour; h < arrivalHour + rentalHours; h++) {
    if (bookedHours.has(h)) return true;
  }
  return false;
}
