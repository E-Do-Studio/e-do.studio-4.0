-- Vérification de la garde anti-double-réservation (migration 20261009120000).
--
-- À coller tel quel dans le SQL Editor du projet après chaque intervention sur
-- le schéma de réservation. Aucune trace laissée : chaque sonde s'exécute dans
-- un sous-bloc annulé, et toute anomalie lève une exception qui annule le reste.
--
-- Pourquoi ce fichier : le 06/10/2026, create-booking a accepté sept
-- réservations sur le même créneau. Le code était juste — la migration n'avait
-- jamais été appliquée en production, et rien ne permettait de le voir. Ni le
-- typecheck ni vitest ne touchent la base : seule une sonde sur la base réelle
-- le peut.

DO $$
DECLARE
  b1 uuid;
  b2 uuid;
  rejected boolean;
BEGIN
  -- ─── 1. Le schéma est en place ───────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'booking_sessions' AND column_name = 'blocks_slot'
  ) THEN
    RAISE EXCEPTION 'ÉCHEC : colonne booking_sessions.blocks_slot absente — migration 20261009120000 non appliquée';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_sessions_no_overlap'
  ) THEN
    RAISE EXCEPTION 'ÉCHEC : contrainte booking_sessions_no_overlap absente';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_booking_session_blocks_slot' AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_booking_status_propagate' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'ÉCHEC : trigger de recopie du statut absent';
  END IF;

  -- ─── 2. Deux réservations 'pending' sur le même créneau ──────────────────
  -- Plateau et date fictifs : la sonde ne peut entrer en conflit avec aucune
  -- vraie réservation.
  rejected := false;
  BEGIN
    INSERT INTO bookings (reference, status, client_name, client_email)
    VALUES ('PROBE-1', 'pending', 'probe', 'probe@invalid') RETURNING id INTO b1;
    INSERT INTO booking_sessions (booking_id, plateau_key, slot_type, hours, session_date, arrival_hour)
    VALUES (b1, '__probe__', 'hour', 2, '2099-01-01', 10);

    INSERT INTO bookings (reference, status, client_name, client_email)
    VALUES ('PROBE-2', 'pending', 'probe', 'probe@invalid') RETURNING id INTO b2;
    -- [11h, 12h) chevauche [10h, 12h).
    INSERT INTO booking_sessions (booking_id, plateau_key, slot_type, hours, session_date, arrival_hour)
    VALUES (b2, '__probe__', 'hour', 1, '2099-01-01', 11);
  EXCEPTION WHEN exclusion_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'ÉCHEC : deux réservations pending acceptées sur le même créneau';
  END IF;

  -- ─── 3. Ce qui ne doit PAS bloquer ───────────────────────────────────────
  -- Une demande de devis (draft) sur un créneau pris, puis un créneau libéré
  -- par annulation : les deux doivent passer.
  BEGIN
    INSERT INTO bookings (reference, status, client_name, client_email)
    VALUES ('PROBE-1', 'pending', 'probe', 'probe@invalid') RETURNING id INTO b1;
    INSERT INTO booking_sessions (booking_id, plateau_key, slot_type, hours, session_date, arrival_hour)
    VALUES (b1, '__probe__', 'hour', 2, '2099-01-01', 10);

    INSERT INTO bookings (reference, status, client_name, client_email)
    VALUES ('PROBE-2', 'draft', 'probe', 'probe@invalid') RETURNING id INTO b2;
    INSERT INTO booking_sessions (booking_id, plateau_key, slot_type, hours, session_date, arrival_hour)
    VALUES (b2, '__probe__', 'hour', 1, '2099-01-01', 11);

    -- Adjacent, pas chevauchant : [12h, 13h) après [10h, 12h).
    INSERT INTO bookings (reference, status, client_name, client_email)
    VALUES ('PROBE-3', 'confirmed', 'probe', 'probe@invalid') RETURNING id INTO b2;
    INSERT INTO booking_sessions (booking_id, plateau_key, slot_type, hours, session_date, arrival_hour)
    VALUES (b2, '__probe__', 'hour', 1, '2099-01-01', 12);

    -- Le draft confirmé après coup DOIT être refusé : la propagation du statut
    -- passe par le même garde-fou.
    BEGIN
      UPDATE bookings SET status = 'pending' WHERE reference = 'PROBE-2';
      RAISE EXCEPTION 'ÉCHEC : un draft passé en pending sur un créneau pris a été accepté';
    EXCEPTION WHEN exclusion_violation THEN
      NULL;
    END;

    -- 'cancelled' déclenche un appel HTTP (bookings_calendar_cancel) : la
    -- libération est vérifiée sur la colonne, sans passer par l'UPDATE du statut.
    UPDATE booking_sessions SET blocks_slot = false WHERE booking_id = b1;
    INSERT INTO bookings (reference, status, client_name, client_email)
    VALUES ('PROBE-4', 'pending', 'probe', 'probe@invalid') RETURNING id INTO b2;
    INSERT INTO booking_sessions (booking_id, plateau_key, slot_type, hours, session_date, arrival_hour)
    VALUES (b2, '__probe__', 'hour', 2, '2099-01-01', 10);

    -- Une session échue ne bloque pas : les chevauchements historiques restent.
    INSERT INTO bookings (reference, status, client_name, client_email)
    VALUES ('PROBE-5', 'pending', 'probe', 'probe@invalid') RETURNING id INTO b2;
    INSERT INTO booking_sessions (booking_id, plateau_key, slot_type, hours, session_date, arrival_hour)
    VALUES (b2, '__probe__', 'hour', 2, '2000-01-01', 10), (b2, '__probe__', 'hour', 2, '2000-01-01', 10);

    -- Annule toutes les sondes de ce bloc.
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'probe_rollback';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'probe_rollback' THEN
      RAISE;
    END IF;
  END;

  RAISE NOTICE 'OK : garde anti-double-réservation active';
END $$;
