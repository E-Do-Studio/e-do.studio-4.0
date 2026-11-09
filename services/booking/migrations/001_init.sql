-- Service de réservation e-do — schéma initial.
--
-- Les tables métier reprennent celles de Supabase colonne pour colonne (relevé
-- de la prod du 09/11/2026, pas du dépôt : `hours` y est un double precision,
-- `arrival_minute`, `source` et `booking_events` n'existent que là-bas), pour
-- que l'import garde les mêmes ids, les mêmes références et donc les mêmes UID
-- d'événements.
--
-- Trois tables neuves portent ce que Supabase n'avait pas :
--   - calendar_events : le registre des événements d'agenda. Une ligne par UID,
--     jamais supprimée avec la ligne de réservation. C'est elle qui dit quoi
--     retirer de Google et quoi annuler chez le client, même quand la ligne de
--     réservation a disparu (la cause des 6 événements orphelins de novembre).
--   - jobs : la file de travail (agenda, e-mails), écrite dans la même
--     transaction que le changement métier. Rien ne part « au mieux ».
--   - alerts : ce que le studio doit savoir, dédupliqué par clé.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'confirmed', 'cancelled')),
  source text NOT NULL DEFAULT 'website',
  client_name text NOT NULL,
  client_first_name text,
  client_last_name text,
  client_email text NOT NULL,
  client_phone text,
  client_company text,
  client_brand text,
  client_billing_address text,
  client_siren text,
  project_type text,
  urgency text,
  total_estimate numeric(12, 2),
  notes text,
  preferred_date date,
  arrival_hour integer,
  arrival_minute smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  -- État de la synchro agenda, tenu par le worker (lecture seule ailleurs).
  calendar_synced_at timestamptz,
  calendar_sync_error text
);

CREATE INDEX bookings_updated_at_idx ON bookings (updated_at);
CREATE INDEX bookings_status_idx ON bookings (status);

CREATE TABLE booking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  plateau_key text NOT NULL,
  slot_type text NOT NULL DEFAULT 'hour',
  hours double precision,
  session_date date,
  arrival_hour integer,
  arrival_minute smallint,
  cyclo_mode text,
  product_type text,
  method text,
  submethod text,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  views jsonb NOT NULL DEFAULT '[]'::jsonb,
  views_count integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  postprod_enabled boolean NOT NULL DEFAULT false,
  postprod_video boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Figé à l'écriture : une contrainte d'exclusion ne lit ni une autre table
  -- ni current_date. Tenu à jour par le code (domain/bookings.ts), pas par
  -- trigger, pour que la règle se lise à un seul endroit.
  blocks_slot boolean NOT NULL DEFAULT false
);

CREATE INDEX booking_sessions_booking_idx ON booking_sessions (booking_id);
CREATE INDEX booking_sessions_plateau_date_idx
  ON booking_sessions (plateau_key, session_date);

-- Garde de la prod Supabase (20261009120000), en minutes : etouch réserve à
-- la demi-heure, et une plage en heures entières laissait passer 10:30–12:30
-- contre 12:00–14:00. Deux sessions actives et futures ne se chevauchent pas
-- sur un plateau ; une violation remonte en 23P01, traduite en 409.
ALTER TABLE booking_sessions
  ADD CONSTRAINT booking_sessions_no_overlap
  EXCLUDE USING gist (
    plateau_key WITH =,
    session_date WITH =,
    numrange(
      (arrival_hour * 60 + coalesce(arrival_minute, 0))::numeric,
      (arrival_hour * 60 + coalesce(arrival_minute, 0) + hours * 60)::numeric
    ) WITH &&
  )
  WHERE (
    blocks_slot
    AND session_date IS NOT NULL
    AND arrival_hour IS NOT NULL
    AND hours IS NOT NULL
    AND hours > 0
  );

CREATE TABLE booking_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  reference text NOT NULL,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_quotes_booking_idx ON booking_quotes (booking_id);

-- Historique : qui a fait quoi. `data.lines` garde les lignes libérées avec
-- l'UID de leur événement (format etouch #1526, repris à l'identique).
CREATE TABLE booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  session_id uuid,
  plateau_key text,
  action text NOT NULL,
  actor text,
  actor_source text,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_events_booking_idx ON booking_events (booking_id, created_at);

CREATE TABLE blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Registre des événements d'agenda : une ligne par UID iCalendar
-- (`<référence>-<id de ligne>@e-do.studio`, inchangé depuis le début, donc les
-- invitations déjà envoyées aux clients restent pilotables).
--   - google_event_id : sha256(uid) en hexadécimal, le même id que la v31 de
--     calendar-sync — les événements existants sont repris, pas dupliqués.
--   - google_state : present | absent | unknown (importé, jamais vérifié).
--   - sequence : SEQUENCE iCalendar, envoyé au client et à Google ; ne fait
--     que croître.
--   - session_id sans clé étrangère, exprès : la ligne de réservation peut
--     partir, l'entrée du registre reste jusqu'à ce que l'événement soit retiré.
CREATE TABLE calendar_events (
  uid text PRIMARY KEY,
  -- RESTRICT : supprimer une réservation qui a encore des événements les
  -- rendrait introuvables. On annule, on ne supprime pas.
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  google_event_id text NOT NULL UNIQUE,
  google_state text NOT NULL DEFAULT 'unknown'
    CHECK (google_state IN ('present', 'absent', 'unknown')),
  content_hash text,
  sequence integer NOT NULL DEFAULT 0,
  -- Dernier SEQUENCE envoyé au client, et sous quelle forme.
  client_sequence integer,
  client_method text CHECK (client_method IN ('REQUEST', 'CANCEL')),
  -- Dernier état connu de la ligne : de quoi écrire l'annulation (date,
  -- heure) une fois la ligne supprimée.
  snapshot jsonb,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX calendar_events_booking_idx ON calendar_events (booking_id);

-- File de travail. `dedupe_key` fusionne les demandes en attente pour un même
-- objet (dix modifications d'une réservation → une synchro).
CREATE TABLE jobs (
  id bigserial PRIMARY KEY,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'done', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  run_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jobs_ready_idx ON jobs (run_at) WHERE status = 'queued';
CREATE UNIQUE INDEX jobs_dedupe_queued_idx
  ON jobs (dedupe_key) WHERE status = 'queued' AND dedupe_key IS NOT NULL;

-- Alertes : une seule ouverte par clé ; `notified_at` dit si l'e-mail est
-- parti (sinon le worker le retente).
CREATE TABLE alerts (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  subject text NOT NULL,
  body text NOT NULL,
  occurrences integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  resolved_at timestamptz
);

CREATE UNIQUE INDEX alerts_open_key_idx ON alerts (key) WHERE resolved_at IS NULL;

-- Petites valeurs d'état du worker (dernier passage, dernier digest…).
CREATE TABLE service_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Limite de débit des endpoints publics, par IP hachée et fenêtre.
CREATE TABLE rate_limits (
  bucket text NOT NULL,
  ip_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, ip_hash, window_start)
);
