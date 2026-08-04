-- Durcissement du chemin de réservation.
--
-- Deux défauts corrigés ici, tous deux constatés sur la base de production :
--
--   1. `FOR SELECT TO anon USING (true)` sur bookings / booking_sessions /
--      booking_quotes (migration 20260504000004). La clé anon étant publiée
--      dans le bundle JS, n'importe qui pouvait lire l'intégralité des
--      réservations — nom, e-mail, téléphone, SIREN, adresse de facturation.
--      Cette policy avait été ajoutée parce que `.insert().select()` de
--      PostgREST exige un droit SELECT sur la ligne retournée ; l'écriture
--      passant désormais par la fonction create-booking (rôle de service), le
--      besoin disparaît.
--
--   2. Aucune contrainte n'empêchait deux réservations de se chevaucher.
--      bookings.ts lisait les conflits puis insérait : entre les deux, rien.
--      Deux clients simultanés pouvaient réserver le même créneau.
--
-- ATTENTION — à appliquer APRÈS le déploiement de la fonction create-booking
-- et la mise en production du front qui l'appelle. Dans l'ordre inverse, le
-- tunnel de réservation tombe : le front n'aurait plus le droit d'insérer.

-- ─── 1. Contrainte anti-chevauchement ───────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Une contrainte d'exclusion ne peut pas lire une autre table : elle ne peut
-- donc pas consulter bookings.status. Or seules les réservations 'pending' et
-- 'confirmed' doivent bloquer un créneau — une simple demande de devis crée un
-- 'draft' daté, et le bloquer serait une régression : personne ne pourrait plus
-- réserver un créneau sur lequel un devis a été demandé.
--
-- Le statut est donc recopié sur la session, maintenu par trigger, et sert de
-- prédicat à la contrainte.
ALTER TABLE booking_sessions
  ADD COLUMN IF NOT EXISTS blocks_slot boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION booking_session_blocks_slot()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT b.status IN ('pending', 'confirmed')
    INTO NEW.blocks_slot
    FROM bookings b
   WHERE b.id = NEW.booking_id;
  NEW.blocks_slot := COALESCE(NEW.blocks_slot, false);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_booking_session_blocks_slot ON booking_sessions;
CREATE TRIGGER trg_booking_session_blocks_slot
  BEFORE INSERT OR UPDATE OF booking_id ON booking_sessions
  FOR EACH ROW EXECUTE FUNCTION booking_session_blocks_slot();

-- Le statut de la réservation change après coup (confirmation, annulation) :
-- ses sessions doivent suivre.
CREATE OR REPLACE FUNCTION booking_status_propagate()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE booking_sessions
       SET blocks_slot = NEW.status IN ('pending', 'confirmed')
     WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_booking_status_propagate ON bookings;
CREATE TRIGGER trg_booking_status_propagate
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION booking_status_propagate();

-- Reprise de l'existant avant de poser la contrainte.
UPDATE booking_sessions bs
   SET blocks_slot = b.status IN ('pending', 'confirmed')
  FROM bookings b
 WHERE b.id = bs.booking_id;

-- La plage est [arrivée, arrivée + durée) sur une même journée et un même
-- plateau. Si des chevauchements existent déjà en base, cet ALTER échoue — les
-- lister et les arbitrer avant de rejouer la migration.
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

-- ─── 2. Retrait des droits anon ─────────────────────────────────────────────

DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
DROP POLICY IF EXISTS "anon_select_booking_sessions" ON booking_sessions;
DROP POLICY IF EXISTS "anon_select_booking_quotes" ON booking_quotes;

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "anon_insert_booking_sessions" ON booking_sessions;
DROP POLICY IF EXISTS "anon_insert_booking_quotes" ON booking_quotes;

-- RLS reste activé sans aucune policy pour anon : tout accès direct avec la clé
-- publique est refusé. Le rôle de service, utilisé par les Edge Functions,
-- contourne RLS par conception.
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_quotes ENABLE ROW LEVEL SECURITY;
