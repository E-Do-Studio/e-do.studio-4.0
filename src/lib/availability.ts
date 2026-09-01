import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

export type AvailabilityState = 'free' | 'unavailable';

interface SessionAvailabilityRow {
  session_date: string | null;
  arrival_hour: number | null;
  hours: number | null;
  bookings: { status: string } | null;
}

const STUDIO_OPEN = 9;
const STUDIO_CLOSE = 19;

const dayCache = new Map<string, Record<number, AvailabilityState>>();

export function clearAvailabilityCache(): void {
  dayCache.clear();
}

function getOccupiedHours(arrivalHour: number, totalHours: number): number[] {
  const hours: number[] = [];
  for (
    let h = arrivalHour;
    h < arrivalHour + totalHours && h < STUDIO_CLOSE;
    h++
  ) {
    hours.push(h);
  }
  return hours;
}

function isDayFullyBooked(
  occupiedHours: Set<number>,
  rentalHours: number,
): boolean {
  for (let start = STUDIO_OPEN; start <= STUDIO_CLOSE - rentalHours; start++) {
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

    const sessionsPromise = supabase
      .from('booking_sessions')
      .select('session_date, arrival_hour, hours, bookings!inner(status)')
      .eq('plateau_key', plateauKey)
      .not('session_date', 'is', null)
      .gte('session_date', startDate)
      .lte('session_date', endDate)
      .in('bookings.status', ['pending', 'confirmed']);

    const blockedPromise = (supabase as any)
      .from('blocked_dates')
      .select('date')
      .gte('date', startDate)
      .lte('date', endDate);

    Promise.all([sessionsPromise, blockedPromise])
      .then(([{ data: sessData, error: sessErr }, { data: blockedData, error: blockedErr }]) => {
        if (controller.signal.aborted) return;

        if (sessErr || blockedErr) {
          setLoading(false);
          return;
        }

        const blockedSet = new Set<string>();
        if (blockedData) {
          for (const row of blockedData as unknown as { date: string }[]) {
            if (row.date) blockedSet.add(row.date);
          }
        }

        const occupiedPerDay: Record<number, Set<number>> = {};
        if (sessData) {
          for (const session of sessData as unknown as SessionAvailabilityRow[]) {
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
            result[d] = isDayFullyBooked(occupied, rentalHours)
              ? 'unavailable'
              : 'free';
          }
        }

        dayCache.set(cacheKey, result);
        setAvailMap(result);
        setBookedHoursMap(occupiedPerDay);
        setLoading(false);
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
