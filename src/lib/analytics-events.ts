/**
 * Le catalogue des événements produit, et la forme de leurs propriétés.
 *
 * Un nom d'événement est une clé de requête côté PostHog : une faute de frappe
 * ne lève rien, elle crée un second événement que les funnels ignorent. Typer
 * `capture()` sur cette table fait de cette dérive une erreur de typecheck.
 *
 * Jamais de donnée personnelle en propriété : noms de champs, pas leurs
 * valeurs. L'e-mail ne passe que par `identify`, après consentement.
 */

import type { CreateBookingInput } from './booking-engine';

export type BookingFunnel = 'config' | 'manual';
export type BookingSource = 'funnel' | 'chat';
type SubmitMode = CreateBookingInput['mode'];
export type BookingStepName =
  | 'config'
  | 'plateau'
  | 'duration'
  | 'team'
  | 'postprod'
  | 'contact'
  | 'date';

/** `tel`, `email`, ou le domaine visé sans `www.` (`instagram.com`…). */
export type OutboundTarget = 'tel' | 'email' | (string & {});
export type CtaId =
  | 'book'
  | 'book_stage'
  | 'cyclorama'
  | 'postprod'
  | 'discovery'
  | 'plateau';
export type ScrollDepth = 25 | 50 | 75 | 100;

interface BookingContext {
  /** Nul pour le chatbot, qui n'a pas d'étapes. */
  funnel: BookingFunnel | null;
  source: BookingSource;
  submit_mode: SubmitMode;
}

export interface AnalyticsEvents {
  booking_path_chosen: { path: 'configurator' | 'manual' | 'contact' };
  booking_step_viewed: {
    funnel: BookingFunnel;
    step: BookingStepName;
    step_index: number;
  };
  booking_step_blocked: {
    funnel: BookingFunnel;
    step: BookingStepName;
    invalid_fields: string[];
  };
  booking_config_applied: {
    project_type: string | null;
    urgency: string | null;
    session_count: number;
  };
  booking_config_skipped: Record<string, never>;
  booking_submit_attempted: BookingContext & {
    plateaux: string[];
    session_count: number;
    total: number;
  };
  booking_submitted: BookingContext & {
    reference: string | null;
    plateaux: string[];
    session_count: number;
    total: number;
  };
  booking_failed: BookingContext & {
    reason: 'slot_taken' | 'network' | 'server';
    status?: number;
  };
  // `snapshot_present: false` : page affichée sans récapitulatif (onglet
  // neuf, lien direct, stockage de session indisponible). Mode et total sont
  // alors inconnus, pas nuls.
  booking_confirmation_viewed: {
    submit_mode: SubmitMode | null;
    total: number;
    snapshot_present: boolean;
  };
  contact_form_submitted: Record<string, never>;
  contact_form_failed: { reason: string };
  contact_form_blocked: { invalid_fields: string[] };
  chat_opened: { surface: 'mobile_fab' };
  // Seule propriété en texte libre du catalogue : 80 caractères au plus,
  // e-mails et numéros masqués avant l'envoi (`questionForAnalytics`).
  chat_question_asked: {
    turn: number;
    page: string | null;
    question_truncated: string;
  };
  // Remplace `chat_message_sent`, qui ne partait qu'à la réception d'une
  // réponse et comptait donc des réponses sous le nom d'un envoi.
  chat_answer_received: { turn: number; page: string | null };
  chat_message_failed: { error: string };
  // La confirmation passe par `createBooking` : elle ressort en
  // `booking_submitted` / `booking_failed` avec `source: 'chat'`.
  chat_booking_proposed: { session_count: number };
  outbound_click: { target: OutboundTarget };
  cta_clicked: { cta: CtaId; pathname: string; plateau?: string };
  scroll_depth: { depth: ScrollDepth; pathname: string };
}

export type AnalyticsEvent = keyof AnalyticsEvents;
