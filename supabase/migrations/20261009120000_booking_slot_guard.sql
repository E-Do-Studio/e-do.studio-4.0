-- Garde anti-double-réservation, sans le retrait des droits anon.
--
-- La migration 20260804120000 n'a jamais pris en production : son ALTER
-- échouait sur des chevauchements déjà présents et toute la transaction était
-- annulée. Résultat constaté le 06/10/2026 : create-booking a accepté sept
-- réservations sur le même créneau, sans jamais lever de 23P01.
--
-- Elle ne pouvait pas non plus être rejouée telle quelle : sa seconde moitié
-- retire la lecture anon, dont dépendent encore le calendrier de disponibilité
-- du site (src/lib/availability.ts) et la synchro etouch. Les deux auraient vu
-- tous les créneaux libres, sans erreur. Ce retrait est donc différé à une
-- migration ultérieure, une fois ces lecteurs servis autrement.
--
-- Écart avec 20260804120000 : une session passée ne bloque pas. Deux paires de
-- réservations etouch se chevauchent en juillet et septembre 2026 ; protéger un
-- créneau échu n'a aucun sens, et les arbitrer aurait supprimé des événements
-- du calendrier pour rien. Rejouable : chaque instruction est idempotente.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE booking_sessions
  ADD COLUMN IF NOT EXISTS blocks_slot boolean NOT NULL DEFAULT false;

-- Une contrainte d'exclusion ne lit pas d'autre table, ni current_date : le
-- statut et l'échéance sont figés sur la session au moment de l'écriture.
CREATE OR REPLACE FUNCTION booking_session_blocks_slot()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT b.status IN ('pending', 'confirmed')
    INTO NEW.blocks_slot
    FROM bookings b
   WHERE b.id = NEW.booking_id;
  NEW.blocks_slot := COALESCE(NEW.blocks_slot, false)
    AND (NEW.session_date IS NULL OR NEW.session_date >= current_date);
  RETURN NEW;
END $$;

-- session_date en plus de booking_id : une session déplacée d'une date échue
-- vers une date future doit se remettre à bloquer.
DROP TRIGGER IF EXISTS trg_booking_session_blocks_slot ON booking_sessions;
CREATE TRIGGER trg_booking_session_blocks_slot
  BEFORE INSERT OR UPDATE OF booking_id, session_date ON booking_sessions
  FOR EACH ROW EXECUTE FUNCTION booking_session_blocks_slot();

CREATE OR REPLACE FUNCTION booking_status_propagate()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE booking_sessions
       SET blocks_slot = NEW.status IN ('pending', 'confirmed')
                         AND (session_date IS NULL OR session_date >= current_date)
     WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_booking_status_propagate ON bookings;
CREATE TRIGGER trg_booking_status_propagate
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION booking_status_propagate();

UPDATE booking_sessions bs
   SET blocks_slot = b.status IN ('pending', 'confirmed')
                     AND (bs.session_date IS NULL OR bs.session_date >= current_date)
  FROM bookings b
 WHERE b.id = bs.booking_id;

-- Si cet ALTER échoue, deux réservations futures se chevauchent déjà : les
-- arbitrer d'abord, la migration ne tranche pas entre deux clients.
ALTER TABLE booking_sessions
  DROP CONSTRAINT IF EXISTS booking_sessions_no_overlap;

ALTER TABLE booking_sessions
  ADD CONSTRAINT booking_sessions_no_overlap
  EXCLUDE USING gist (
    plateau_key WITH =,
    session_date WITH =,
    int4range(arrival_hour, arrival_hour + hours) WITH &&
  )
  WHERE (
    blocks_slot
    AND session_date IS NOT NULL
    AND arrival_hour IS NOT NULL
    AND hours IS NOT NULL
    AND hours > 0
  );
