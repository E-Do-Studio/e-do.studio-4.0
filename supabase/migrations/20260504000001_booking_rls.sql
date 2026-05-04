-- Migration: Row Level Security for booking tables

-- Enable RLS on all tables
alter table bookings enable row level security;
alter table booking_sessions enable row level security;
alter table booking_quotes enable row level security;
alter table ical_feeds enable row level security;

-- Bookings: anonymous users can insert and read (frontend uses anon key)
create policy "anon_insert_bookings"
  on bookings for insert
  to anon
  with check (true);

create policy "anon_select_bookings"
  on bookings for select
  to anon
  using (true);

create policy "authenticated_select_bookings"
  on bookings for select
  to authenticated
  using (true);

create policy "service_all_bookings"
  on bookings for all
  to service_role
  using (true)
  with check (true);

-- Booking sessions: anon can insert and read
create policy "anon_insert_booking_sessions"
  on booking_sessions for insert
  to anon
  with check (true);

create policy "anon_select_booking_sessions"
  on booking_sessions for select
  to anon
  using (true);

create policy "authenticated_select_booking_sessions"
  on booking_sessions for select
  to authenticated
  using (true);

create policy "service_all_booking_sessions"
  on booking_sessions for all
  to service_role
  using (true)
  with check (true);

-- Booking quotes: anon can insert and read
create policy "anon_insert_booking_quotes"
  on booking_quotes for insert
  to anon
  with check (true);

create policy "anon_select_booking_quotes"
  on booking_quotes for select
  to anon
  using (true);

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
