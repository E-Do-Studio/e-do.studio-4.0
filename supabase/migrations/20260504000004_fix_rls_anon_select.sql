-- Fix: grant anon SELECT on booking tables
-- The frontend uses the anon key and Supabase JS .insert().select().single()
-- which requires both INSERT and SELECT permissions for the anon role.
--
-- NOTE (2026-08-04) : ce fichier utilisait `CREATE POLICY IF NOT EXISTS`, que
-- PostgreSQL ne supporte pas — la migration échouait donc au rejeu depuis zéro
-- (`supabase start`). Réécrite en DROP IF EXISTS + CREATE, idempotent et de
-- même intention. Aucun changement de comportement sur une base où les
-- policies existent déjà.

DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_booking_sessions" ON booking_sessions;
CREATE POLICY "anon_select_booking_sessions" ON booking_sessions
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_insert_booking_sessions" ON booking_sessions;
CREATE POLICY "anon_insert_booking_sessions" ON booking_sessions
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_booking_quotes" ON booking_quotes;
CREATE POLICY "anon_select_booking_quotes" ON booking_quotes
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_insert_booking_quotes" ON booking_quotes;
CREATE POLICY "anon_insert_booking_quotes" ON booking_quotes
  FOR INSERT TO anon WITH CHECK (true);
