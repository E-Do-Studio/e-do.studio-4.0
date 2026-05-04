-- Migration: Row Level Security for booking tables

-- Enable RLS on all tables
alter table bookings enable row level security;
alter table booking_sessions enable row level security;
alter table booking_quotes enable row level security;
alter table ical_feeds enable row level security;

-- Bookings: anonymous users can insert (create a reservation)
create policy "anon_insert_bookings"
  on bookings for insert
  to anon
  with check (true);

-- Bookings: anyone can read their own booking by reference (via RPC or app logic)
-- For now, restrict read to authenticated/service role only
create policy "authenticated_select_bookings"
  on bookings for select
  to authenticated
  using (true);

-- Bookings: service role has full access (implicit, but explicit for clarity)
create policy "service_all_bookings"
  on bookings for all
  to service_role
  using (true)
  with check (true);

-- Booking sessions: anon can insert when linked to a booking
create policy "anon_insert_booking_sessions"
  on booking_sessions for insert
  to anon
  with check (
    exists (select 1 from bookings where bookings.id = booking_id)
  );

create policy "authenticated_select_booking_sessions"
  on booking_sessions for select
  to authenticated
  using (true);

create policy "service_all_booking_sessions"
  on booking_sessions for all
  to service_role
  using (true)
  with check (true);

-- Booking quotes: anon can insert when linked to a booking
create policy "anon_insert_booking_quotes"
  on booking_quotes for insert
  to anon
  with check (
    exists (select 1 from bookings where bookings.id = booking_id)
  );

create policy "authenticated_select_booking_quotes"
  on booking_quotes for select
  to authenticated
  using (true);

create policy "service_all_booking_quotes"
  on booking_quotes for all
  to service_role
  using (true)
  with check (true);

-- iCal feeds: service role only (created by Edge Functions)
create policy "service_all_ical_feeds"
  on ical_feeds for all
  to service_role
  using (true)
  with check (true);

create policy "authenticated_select_ical_feeds"
  on ical_feeds for select
  to authenticated
  using (true);
