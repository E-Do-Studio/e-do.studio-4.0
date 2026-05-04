-- Migration: Indexes for frequent booking queries

-- Bookings: filter by status
create index idx_bookings_status on bookings (status);

-- Bookings: filter/sort by preferred_date
create index idx_bookings_preferred_date on bookings (preferred_date);

-- Bookings: lookup by reference
create index idx_bookings_reference on bookings (reference);

-- Bookings: sort by creation date
create index idx_bookings_created_at on bookings (created_at desc);

-- Bookings: filter by client email
create index idx_bookings_client_email on bookings (client_email);

-- Booking sessions: lookup by booking
create index idx_booking_sessions_booking_id on booking_sessions (booking_id);

-- Booking quotes: lookup by booking
create index idx_booking_quotes_booking_id on booking_quotes (booking_id);

-- iCal feeds: lookup by booking
create index idx_ical_feeds_booking_id on ical_feeds (booking_id);
