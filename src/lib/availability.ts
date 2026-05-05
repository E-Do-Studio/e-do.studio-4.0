import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

export type AvailabilityState = 'free' | 'limited' | 'unavailable';

interface BookingWithSessions {
  preferred_date: string | null;
  booking_sessions: { hours: number | null }[];
}

const LIMITED_THRESHOLD = 8;

const cache = new Map<string, Record<number, AvailabilityState>>();

export function useAvailability(
  plateauKey: string | undefined,
  year: number,
  month: number
): { availMap: Record<number, AvailabilityState>; loading: boolean } {
  const [availMap, setAvailMap] = useState<Record<number, AvailabilityState>>({});
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!plateauKey) return;

    const cacheKey = `${plateauKey}-${year}-${month}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setAvailMap(cached);
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
      .select('preferred_date, booking_sessions!inner(hours)')
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

        const hoursPerDay: Record<number, number> = {};
        for (const booking of data as unknown as BookingWithSessions[]) {
          if (!booking.preferred_date) continue;
          const day = new Date(booking.preferred_date + 'T00:00:00').getDate();
          for (const session of booking.booking_sessions) {
            hoursPerDay[day] = (hoursPerDay[day] || 0) + (session.hours || 0);
          }
        }

        const result: Record<number, AvailabilityState> = {};
        for (let d = 1; d <= lastDay; d++) {
          const booked = hoursPerDay[d] || 0;
          if (booked >= LIMITED_THRESHOLD) result[d] = 'unavailable';
          else if (booked > 0) result[d] = 'limited';
          else result[d] = 'free';
        }

        cache.set(cacheKey, result);
        setAvailMap(result);
        setLoading(false);
      });

    return () => { controller.abort(); };
  }, [plateauKey, year, month]);

  return { availMap, loading };
}
