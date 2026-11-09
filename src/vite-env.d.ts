/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GTM_ID?: string;
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string;
  readonly VITE_POSTHOG_HOST?: string;
  /** Service de réservation (services/booking). Absent : Supabase. */
  readonly VITE_BOOKING_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
