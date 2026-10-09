-- Retrait des droits anon sur les tables de réservation.
--
-- C'est la seconde moitié de 20260804120000, qui n'a jamais pris en
-- production. Tant que ces policies existent, la clé anon — publiée dans le
-- bundle JS — lit l'intégralité des réservations : nom, e-mail, téléphone,
-- SIREN, adresse de facturation.
--
-- ATTENTION — ordre de mise en production, chaque étape avant la suivante :
--   1. 20261009130000 (fonction booking_availability) appliquée ;
--   2. le front qui lit les disponibilités via booking_availability déployé ;
--   3. etouch déployé avec la lecture par supabase_service_key — sa liste de
--      réservations et son worker de synchro lisaient avec la clé anon ;
--   4. cette migration.
-- Dans un autre ordre, le calendrier du site et etouch voient zéro
-- réservation, sans aucune erreur : RLS filtre, il ne refuse pas.

DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
DROP POLICY IF EXISTS "anon_select_booking_sessions" ON booking_sessions;
DROP POLICY IF EXISTS "anon_select_booking_quotes" ON booking_quotes;

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "anon_insert_booking_sessions" ON booking_sessions;
DROP POLICY IF EXISTS "anon_insert_booking_quotes" ON booking_quotes;

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_quotes ENABLE ROW LEVEL SECURITY;
