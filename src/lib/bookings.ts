import { supabase } from './supabase';
import type { Database } from './database.types';
import type {
  BookingSessionData,
  BookingQuoteData,
  CreateBookingInput,
} from './booking-engine';

export type { BookingSessionData, BookingQuoteData, CreateBookingInput };

type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type BookingSessionInsert =
  Database['public']['Tables']['booking_sessions']['Insert'];
type BookingQuoteInsert =
  Database['public']['Tables']['booking_quotes']['Insert'];
type BookingRow = Database['public']['Tables']['bookings']['Row'];

function generateReference(mode: 'quote' | 'booking' | 'request'): string {
  const prefix =
    mode === 'quote' ? 'EDO-Q-' : mode === 'booking' ? 'EDO-R-' : 'EDO-';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix + code;
}

export interface CreateBookingResult {
  booking: BookingRow;
  reference: string;
}

interface SessionSlot {
  plateauKey: string;
  date: string;
  arrivalHour: number;
  hours: number;
}

function dateToIso(d: { y: number; m: number; d: number }): string {
  return `${d.y}-${String(d.m + 1).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
}

async function findConflictingSession(slot: SessionSlot): Promise<boolean> {
  const { data, error } = await supabase
    .from('booking_sessions')
    .select('arrival_hour, hours, bookings!inner(status)')
    .eq('plateau_key', slot.plateauKey)
    .eq('session_date', slot.date)
    .in('bookings.status', ['pending', 'confirmed']);

  if (error || !data) return false;

  const reqStart = slot.arrivalHour;
  const reqEnd = slot.arrivalHour + slot.hours;

  for (const row of data as any[]) {
    if (row.arrival_hour == null || row.hours == null) continue;
    const exStart = row.arrival_hour;
    const exEnd = row.arrival_hour + row.hours;
    if (reqStart < exEnd && reqEnd > exStart) return true;
  }
  return false;
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const reference = generateReference(input.mode);
  const quoteRef =
    input.mode === 'booking' ? generateReference('quote') : reference;

  const fallbackDate = input.preferredDate
    ? dateToIso(input.preferredDate)
    : null;
  const fallbackHour = input.arrivalHour;

  const resolvedSessions = input.sessions.map((s) => {
    const date = s.date ? dateToIso(s.date) : fallbackDate;
    const arrivalHour = s.arrivalHour ?? fallbackHour;
    return { session: s, date, arrivalHour };
  });

  for (const r of resolvedSessions) {
    if (!r.date || r.arrivalHour == null) continue;
    const conflict = await findConflictingSession({
      plateauKey: r.session.plateauKey,
      date: r.date,
      arrivalHour: r.arrivalHour,
      hours: r.session.hours,
    });
    if (conflict) {
      throw new Error(
        'Ce créneau est déjà réservé. Veuillez choisir un autre horaire.',
      );
    }
  }

  const primary = resolvedSessions[0];
  const headerDate = primary?.date ?? fallbackDate;
  const headerHour = primary?.arrivalHour ?? fallbackHour;

  const bookingData: BookingInsert = {
    reference,
    status: input.mode === 'booking' ? 'pending' : 'draft',
    client_name: [input.contact.prenom, input.contact.nom]
      .filter(Boolean)
      .join(' '),
    client_first_name: input.contact.prenom || null,
    client_last_name: input.contact.nom || null,
    client_email: input.contact.email,
    client_company: input.contact.societe || null,
    client_brand: input.contact.marque || null,
    client_billing_address: input.contact.adresseFacturation || null,
    client_siren: input.contact.siren || null,
    client_phone: input.contact.tel || null,
    project_type: input.projectType,
    urgency: input.urgency,
    total_estimate: input.quote.total,
    notes: input.contact.autresInfos || null,
    preferred_date: headerDate,
    arrival_hour: headerHour,
  };

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (bookingError || !booking) {
    throw new Error(bookingError?.message ?? 'Failed to create booking');
  }

  if (input.sessions.length > 0) {
    const sessionRows: BookingSessionInsert[] = resolvedSessions.map(
      ({ session: s, date, arrivalHour }) => ({
        booking_id: booking.id,
        plateau_key: s.plateauKey,
        slot_type: s.slotType ?? 'hour',
        hours: s.hours,
        session_date: date,
        arrival_hour: arrivalHour,
        cyclo_mode: s.cycloMode,
        product_type: s.productType,
        method: s.method,
        submethod: s.submethod,
        media: s.media,
        views: s.views,
        views_count: s.viewsCount,
        quantity: s.quantity,
        postprod_enabled: s.postprodEnabled,
        postprod_video: s.postprodVideo,
      }),
    );

    const { error: sessionsError } = await supabase
      .from('booking_sessions')
      .insert(sessionRows);

    if (sessionsError) {
      throw new Error(sessionsError.message);
    }
  }

  const quoteData: BookingQuoteInsert = {
    booking_id: booking.id,
    reference: quoteRef,
    rows: input.quote.rows as unknown[],
    total: input.quote.total,
  };

  const { error: quoteError } = await supabase
    .from('booking_quotes')
    .insert(quoteData);

  if (quoteError) {
    throw new Error(quoteError.message);
  }

  // Best-effort instant sync. It is no longer the guarantee: the server-side
  // reconcile cron (reconcile_calendar_sync) re-pushes any booking left
  // unsynced, so a failure here is logged, not swallowed, and self-heals.
  syncToCalendar(booking.id).catch((e) =>
    console.error('calendar sync failed', e),
  );
  sendBookingEmails(booking.id).catch((e) =>
    console.error('booking email failed', e),
  );

  return { booking, reference };
}

async function syncToCalendar(bookingId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;

  const res = await fetch(`${supabaseUrl}/functions/v1/calendar-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, action: 'create' }),
  });
  if (!res.ok) throw new Error(`calendar-sync ${res.status}`);
}

async function sendBookingEmails(bookingId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;

  await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'booking', bookingId }),
  });
}

export async function getBookingByRef(ref: string): Promise<BookingRow | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select()
    .eq('reference', ref)
    .single();

  if (error || !data) return null;
  return data;
}
