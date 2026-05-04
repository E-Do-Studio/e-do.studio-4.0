import { supabase } from './supabase';
import type { Database, BookingStatus } from './database.types';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type SessionRow = Database['public']['Tables']['booking_sessions']['Row'];
type QuoteRow = Database['public']['Tables']['booking_quotes']['Row'];
type IcalFeedRow = Database['public']['Tables']['ical_feeds']['Row'];

export interface BookingListFilters {
  status?: BookingStatus | BookingStatus[];
  dateFrom?: string;
  dateTo?: string;
  plateauKey?: string;
  clientEmail?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'preferred_date' | 'updated_at' | 'total_estimate';
  sortOrder?: 'asc' | 'desc';
}

export interface BookingListItem {
  id: string;
  reference: string;
  status: BookingStatus;
  client_name: string;
  client_email: string;
  client_company: string | null;
  client_phone: string | null;
  project_type: string | null;
  urgency: string | null;
  total_estimate: number | null;
  preferred_date: string | null;
  arrival_hour: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  session_count: number;
  plateau_keys: string[] | null;
  total_hours: number;
  quote_reference: string | null;
  quote_total: number | null;
  has_ical: boolean;
}

export interface BookingListResult {
  data: BookingListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BookingDetail extends BookingRow {
  sessions: SessionRow[];
  quotes: QuoteRow[];
  ical_feeds: IcalFeedRow[];
}

export async function listBookings(
  filters: BookingListFilters = {},
): Promise<BookingListResult> {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const sortBy = filters.sortBy ?? 'created_at';
  const sortOrder = filters.sortOrder ?? 'desc';
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('bookings_admin_summary')
    .select('*', { count: 'exact' });

  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    query = query.in('status', statuses);
  }

  if (filters.dateFrom) {
    query = query.gte('preferred_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('preferred_date', filters.dateTo);
  }

  if (filters.plateauKey) {
    query = query.contains('plateau_keys', [filters.plateauKey]);
  }

  if (filters.clientEmail) {
    query = query.ilike('client_email', `%${filters.clientEmail}%`);
  }

  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `reference.ilike.%${term}%,client_name.ilike.%${term}%,client_email.ilike.%${term}%,client_company.ilike.%${term}%`,
    );
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as BookingListItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getBookingDetail(
  bookingId: string,
): Promise<BookingDetail | null> {
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select()
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) return null;

  const [sessionsResult, quotesResult, icalResult] = await Promise.all([
    supabase
      .from('booking_sessions')
      .select()
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true }),
    supabase
      .from('booking_quotes')
      .select()
      .eq('booking_id', bookingId)
      .order('generated_at', { ascending: false }),
    supabase
      .from('ical_feeds')
      .select()
      .eq('booking_id', bookingId),
  ]);

  return {
    ...booking,
    sessions: sessionsResult.data ?? [],
    quotes: quotesResult.data ?? [],
    ical_feeds: icalResult.data ?? [],
  };
}

export async function getBookingDetailByRef(
  reference: string,
): Promise<BookingDetail | null> {
  const { data: booking, error } = await supabase
    .from('bookings')
    .select()
    .eq('reference', reference)
    .single();

  if (error || !booking) return null;
  return getBookingDetail(booking.id);
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<BookingRow> {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update booking status');
  }
  return data;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportBookingsCSV(
  filters: Omit<BookingListFilters, 'page' | 'pageSize'> = {},
): Promise<string> {
  const result = await listBookings({ ...filters, page: 1, pageSize: 100 });
  let allItems = result.data;

  if (result.totalPages > 1) {
    const remaining = await Promise.all(
      Array.from({ length: result.totalPages - 1 }, (_, i) =>
        listBookings({ ...filters, page: i + 2, pageSize: 100 }),
      ),
    );
    for (const r of remaining) {
      allItems = allItems.concat(r.data);
    }
  }

  const headers = [
    'Référence',
    'Statut',
    'Client',
    'Email',
    'Société',
    'Téléphone',
    'Type de projet',
    'Urgence',
    'Estimation (€)',
    'Date souhaitée',
    'Heure arrivée',
    'Nb sessions',
    'Plateaux',
    'Heures totales',
    'Réf. devis',
    'Total devis (€)',
    'iCal',
    'Créé le',
    'Modifié le',
    'Notes',
  ];

  const rows = allItems.map((b) => [
    b.reference,
    b.status,
    b.client_name,
    b.client_email,
    b.client_company ?? '',
    b.client_phone ?? '',
    b.project_type ?? '',
    b.urgency ?? '',
    b.total_estimate?.toString() ?? '',
    b.preferred_date ?? '',
    b.arrival_hour?.toString() ?? '',
    b.session_count.toString(),
    (b.plateau_keys ?? []).join(', '),
    b.total_hours.toString(),
    b.quote_reference ?? '',
    b.quote_total?.toString() ?? '',
    b.has_ical ? 'Oui' : 'Non',
    b.created_at,
    b.updated_at,
    b.notes ?? '',
  ]);

  const csvLines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ];

  return csvLines.join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const bom = '﻿';
  const blob = new Blob([bom + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
