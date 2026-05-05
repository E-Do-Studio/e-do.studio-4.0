import { supabase } from './supabase';
import type { Database } from './database.types';

type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type BookingSessionInsert = Database['public']['Tables']['booking_sessions']['Insert'];
type BookingQuoteInsert = Database['public']['Tables']['booking_quotes']['Insert'];
type BookingRow = Database['public']['Tables']['bookings']['Row'];

function generateReference(mode: 'quote' | 'booking' | 'request'): string {
  const prefix = mode === 'quote' ? 'EDO-Q-' : mode === 'booking' ? 'EDO-R-' : 'EDO-';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix + code;
}

export interface BookingSessionData {
  plateauKey: string;
  slotType: string | null;
  hours: number;
  cycloMode: string | null;
  productType: string | null;
  method: string | null;
  submethod: string | null;
  media: string[];
  views: string[];
  viewsCount: number;
  quantity: number;
  postprodEnabled: boolean;
  postprodVideo: boolean;
}

export interface BookingQuoteData {
  rows: { lbl: string; amt: number; onReq?: boolean; estimate?: boolean }[];
  total: number;
}

export interface CreateBookingInput {
  mode: 'quote' | 'booking' | 'request';
  contact: {
    nom: string;
    prenom: string;
    email: string;
    tel: string;
    societe: string;
    siren: string;
    adresseFacturation: string;
    marque: string;
    autresInfos: string;
  };
  projectType: string | null;
  urgency: string | null;
  sessions: BookingSessionData[];
  quote: BookingQuoteData;
  preferredDate: { y: number; m: number; d: number } | null;
  arrivalHour: number | null;
}

export interface CreateBookingResult {
  booking: BookingRow;
  reference: string;
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const reference = generateReference(input.mode);
  const quoteRef = input.mode === 'booking' ? generateReference('quote') : reference;

  const preferredDate = input.preferredDate
    ? `${input.preferredDate.y}-${String(input.preferredDate.m + 1).padStart(2, '0')}-${String(input.preferredDate.d).padStart(2, '0')}`
    : null;

  const bookingData: BookingInsert = {
    reference,
    status: input.mode === 'booking' ? 'pending' : 'draft',
    client_name: [input.contact.prenom, input.contact.nom].filter(Boolean).join(' '),
    client_email: input.contact.email,
    client_company: input.contact.societe || null,
    client_siren: input.contact.siren || null,
    client_phone: input.contact.tel || null,
    project_type: input.projectType,
    urgency: input.urgency,
    total_estimate: input.quote.total,
    notes: input.contact.autresInfos || null,
    preferred_date: preferredDate,
    arrival_hour: input.arrivalHour,
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
    const sessionRows: BookingSessionInsert[] = input.sessions.map(s => ({
      booking_id: booking.id,
      plateau_key: s.plateauKey,
      slot_type: s.slotType ?? 'hour',
      hours: s.hours,
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
    }));

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

  syncToCalendar(booking.id).catch(() => {});
  sendBookingEmails(booking.id).catch(() => {});

  return { booking, reference };
}

async function syncToCalendar(bookingId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;

  await fetch(`${supabaseUrl}/functions/v1/calendar-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, action: 'create' }),
  });
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
