-- Fix: grant anon SELECT on booking tables
-- The frontend uses the anon key and Supabase JS .insert().select().single()
-- which requires both INSERT and SELECT permissions for the anon role.

-- bookings: add anon select
CREATE POLICY IF NOT EXISTS "anon_select_bookings" ON bookings
  FOR SELECT TO anon USING (true);

-- booking_sessions: add anon select + fix insert policy
DROP POLICY IF EXISTS "anon_insert_booking_sessions" ON booking_sessions;
CREATE POLICY "anon_insert_booking_sessions" ON booking_sessions
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_select_booking_sessions" ON booking_sessions
  FOR SELECT TO anon USING (true);

-- booking_quotes: add anon select + fix insert policy
DROP POLICY IF EXISTS "anon_insert_booking_quotes" ON booking_quotes;
CREATE POLICY "anon_insert_booking_quotes" ON booking_quotes
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_select_booking_quotes" ON booking_quotes
  FOR SELECT TO anon USING (true);
