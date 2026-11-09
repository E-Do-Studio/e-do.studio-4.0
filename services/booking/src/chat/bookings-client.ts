// Ce que chat/availability.ts attend d'un client Supabase (la chaîne
// from("bookings").select().in().not().gte().lte().eq()), servi par Postgres :
// le module d'origine et ses tests de confidentialité restent inchangés. La
// projection est la même — date, heure, plateau, durée — et rien d'autre.
import type { Queryable } from '../db.ts';

interface Filters {
  statuses: string[];
  from?: string;
  to?: string;
  plateau?: string;
}

class BookingsQuery implements PromiseLike<{ data: unknown[] | null; error: unknown }> {
  private filters: Filters = { statuses: ['pending', 'confirmed'] };

  constructor(private q: Queryable) {}

  select(_columns: string) {
    return this;
  }
  in(column: string, values: string[]) {
    if (column === 'status') this.filters.statuses = values;
    return this;
  }
  not(_column: string, _op: string, _value: unknown) {
    return this;
  }
  gte(column: string, value: string) {
    if (column === 'preferred_date') this.filters.from = value;
    return this;
  }
  lte(column: string, value: string) {
    if (column === 'preferred_date') this.filters.to = value;
    return this;
  }
  eq(column: string, value: string) {
    if (column === 'booking_sessions.plateau_key') this.filters.plateau = value;
    return this;
  }

  then<R1, R2>(
    onfulfilled?: (value: { data: unknown[] | null; error: unknown }) => R1 | PromiseLike<R1>,
    onrejected?: (reason: unknown) => R2 | PromiseLike<R2>,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<{ data: unknown[] | null; error: unknown }> {
    try {
      const rows = await this.q.query<{
        id: string;
        preferred_date: string;
        arrival_hour: number | null;
        plateau_key: string;
        hours: number | null;
      }>(
        `SELECT b.id, b.preferred_date, b.arrival_hour, s.plateau_key, s.hours
         FROM bookings b JOIN booking_sessions s ON s.booking_id = b.id
         WHERE b.status = ANY($1::text[]) AND b.preferred_date IS NOT NULL
           AND ($2::date IS NULL OR b.preferred_date >= $2::date)
           AND ($3::date IS NULL OR b.preferred_date <= $3::date)
           AND ($4::text IS NULL OR s.plateau_key = $4)`,
        [this.filters.statuses, this.filters.from ?? null, this.filters.to ?? null, this.filters.plateau ?? null],
      );
      const byBooking = new Map<string, { preferred_date: string; arrival_hour: number | null; booking_sessions: { plateau_key: string; hours: number | null }[] }>();
      for (const r of rows) {
        const b = byBooking.get(r.id) ?? {
          preferred_date: r.preferred_date,
          arrival_hour: r.arrival_hour,
          booking_sessions: [],
        };
        b.booking_sessions.push({ plateau_key: r.plateau_key, hours: r.hours });
        byBooking.set(r.id, b);
      }
      return { data: [...byBooking.values()], error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export function pgBookingsClient(q: Queryable) {
  return { from: (_table: string) => new BookingsQuery(q) };
}
