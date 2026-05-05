import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

export type AvailabilityState = 'free' | 'unavailable';

interface BookingWithSessions {
  preferred_date: string | null;
  arrival_hour: number | null;
  booking_sessions: { hours: number | null }[];
}

const STUDIO_OPEN = 9;
const STUDIO_CLOSE = 19;

const dayCache = new Map<string, Record<number, AvailabilityState>>();
const hourCache = new Map<string, Set<number>>();

function getOccupiedHours(arrivalHour: number, totalHours: number): number[] {
  const hours: number[] = [];
  for (let h = arrivalHour; h < arrivalHour + totalHours && h < STUDIO_CLOSE; h++) {
    hours.push(h);
  }
  return hours;
}

function isDayFullyBooked(occupiedHours: Set<number>, rentalHours: number): boolean {
  for (let start = STUDIO_OPEN; start <= STUDIO_CLOSE - rentalHours; start++) {
    let fits = true;
    for (let h = start; h < start + rentalHours; h++) {
      if (occupiedHours.has(h)) { fits = false; break; }
    }
    if (fits) return false;
  }
  return true;
}

export function useAvailability(
  plateauKey: string | undefined,
  year: number,
  month: number,
  rentalHours: number = 1
): { availMap: Record<number, AvailabilityState>; bookedHoursMap: Record<number, Set<number>>; loading: boolean } {
  const [availMap, setAvailMap] = useState<Record<number, AvailabilityState>>({});
  const [bookedHoursMap, setBookedHoursMap] = useState<Record<number, Set<number>>>({});
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!plateauKey) return;

    const cacheKey = `${plateauKey}-${year}-${month}-${rentalHours}`;
    const hourCacheKey = `${plateauKey}-${year}-${month}`;
    const cachedDay = dayCache.get(cacheKey);
    const cachedHours = hourCache.get(hourCacheKey);
    if (cachedDay && cachedHours) {
      setAvailMap(cachedDay);
      const hourMap: Record<number, Set<number>> = {};
      cachedHours.forEach(() => {});
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

    supabase
      .from('bookings')
      .select('preferred_date, arrival_hour, booking_sessions!inner(hours)')
      .in('status', ['pending', 'confirmed'])
      .not('preferred_date', 'is', null)
      .gte('preferred_date', startDate)
      .lte('preferred_date', endDate)
      .eq('booking_sessions.plateau_key', plateauKey)
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;

        if (error || !data) {
          setLoading(false);
          return;
        }

        const occupiedPerDay: Record<number, Set<number>> = {};
        for (const booking of data as unknown as BookingWithSessions[]) {
          if (!booking.preferred_date || booking.arrival_hour == null) continue;
          const day = new Date(booking.preferred_date + 'T00:00:00').getDate();
          if (!occupiedPerDay[day]) occupiedPerDay[day] = new Set();
          const totalHours = booking.booking_sessions.reduce((sum, s) => sum + (s.hours || 0), 0);
          for (const h of getOccupiedHours(booking.arrival_hour, totalHours)) {
            occupiedPerDay[day].add(h);
          }
        }

        const result: Record<number, AvailabilityState> = {};
        for (let d = 1; d <= lastDay; d++) {
          const occupied = occupiedPerDay[d] || new Set();
          result[d] = isDayFullyBooked(occupied, rentalHours) ? 'unavailable' : 'free';
        }

        dayCache.set(cacheKey, result);
        setAvailMap(result);
        setBookedHoursMap(occupiedPerDay);
        setLoading(false);
      });

    return () => { controller.abort(); };
  }, [plateauKey, year, month, rentalHours]);

  return { availMap, bookedHoursMap, loading };
}

export function isHourBlocked(bookedHours: Set<number> | undefined, arrivalHour: number, rentalHours: number): boolean {
  if (!bookedHours || bookedHours.size === 0) return false;
  for (let h = arrivalHour; h < arrivalHour + rentalHours; h++) {
    if (bookedHours.has(h)) return true;
  }
  return false;
}
