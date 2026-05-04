export type BookingStatus = 'draft' | 'pending' | 'confirmed' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string;
          reference: string;
          status: BookingStatus;
          client_name: string;
          client_email: string;
          client_company: string | null;
          client_siren: string | null;
          client_phone: string | null;
          project_type: string | null;
          urgency: string | null;
          total_estimate: number | null;
          notes: string | null;
          preferred_date: string | null;
          arrival_hour: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference: string;
          status?: BookingStatus;
          client_name: string;
          client_email: string;
          client_company?: string | null;
          client_siren?: string | null;
          client_phone?: string | null;
          project_type?: string | null;
          urgency?: string | null;
          total_estimate?: number | null;
          notes?: string | null;
          preferred_date?: string | null;
          arrival_hour?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
        Relationships: [];
      };
      booking_sessions: {
        Row: {
          id: string;
          booking_id: string;
          plateau_key: string;
          slot_type: string;
          hours: number | null;
          cyclo_mode: string | null;
          product_type: string | null;
          method: string | null;
          submethod: string | null;
          media: unknown[];
          views: unknown[];
          views_count: number;
          quantity: number;
          postprod_enabled: boolean;
          postprod_video: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          plateau_key: string;
          slot_type: string;
          hours?: number | null;
          cyclo_mode?: string | null;
          product_type?: string | null;
          method?: string | null;
          submethod?: string | null;
          media?: unknown[];
          views?: unknown[];
          views_count?: number;
          quantity?: number;
          postprod_enabled?: boolean;
          postprod_video?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['booking_sessions']['Insert']>;
        Relationships: [];
      };
      booking_quotes: {
        Row: {
          id: string;
          booking_id: string;
          reference: string;
          rows: unknown[];
          total: number;
          generated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          reference: string;
          rows?: unknown[];
          total?: number;
          generated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['booking_quotes']['Insert']>;
        Relationships: [];
      };
      ical_feeds: {
        Row: {
          id: string;
          booking_id: string;
          feed_url: string | null;
          ical_uid: string | null;
          synced_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          feed_url?: string | null;
          ical_uid?: string | null;
          synced_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['ical_feeds']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      bookings_admin_summary: {
        Row: {
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
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      booking_status: BookingStatus;
    };
  };
}
