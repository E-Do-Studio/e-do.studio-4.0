export type BookingStatus = 'draft' | 'pending' | 'confirmed' | 'cancelled';

export const ACTIVE_STATUSES: readonly BookingStatus[] = ['pending', 'confirmed'];

export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
  source: string;
  client_name: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string;
  client_phone: string | null;
  client_company: string | null;
  client_brand: string | null;
  client_billing_address: string | null;
  client_siren: string | null;
  project_type: string | null;
  urgency: string | null;
  total_estimate: number | null;
  notes: string | null;
  preferred_date: string | null;
  arrival_hour: number | null;
  arrival_minute: number | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  calendar_synced_at: string | null;
  calendar_sync_error: string | null;
}

export interface Session {
  id: string;
  booking_id: string;
  plateau_key: string;
  slot_type: string;
  hours: number | null;
  session_date: string | null;
  arrival_hour: number | null;
  arrival_minute: number | null;
  cyclo_mode: string | null;
  product_type: string | null;
  method: string | null;
  submethod: string | null;
  media: string[];
  views: string[];
  views_count: number;
  quantity: number;
  postprod_enabled: boolean;
  postprod_video: boolean;
  created_at: string;
  blocks_slot: boolean;
}

export interface QuoteLine {
  lbl: string;
  amt: number;
  onReq?: boolean;
  estimate?: boolean;
}

export interface Quote {
  id: string;
  booking_id: string;
  reference: string;
  rows: QuoteLine[];
  total: number;
  generated_at: string;
}

export interface CalendarEntry {
  uid: string;
  booking_id: string;
  session_id: string;
  google_event_id: string;
  google_state: 'present' | 'absent' | 'unknown';
  content_hash: string | null;
  sequence: number;
  client_sequence: number | null;
  client_method: 'REQUEST' | 'CANCEL' | null;
  snapshot: Session | null;
  last_synced_at: string | null;
  last_error: string | null;
}

export interface BookingBundle {
  booking: Booking;
  sessions: Session[];
  quote: Quote | null;
}
