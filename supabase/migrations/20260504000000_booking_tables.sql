-- Migration: Create booking tables for e-do.studio reservation system

-- Enum for booking status
create type booking_status as enum ('draft', 'pending', 'confirmed', 'cancelled');

-- Main bookings table
create table bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  status booking_status not null default 'draft',
  client_name text not null,
  client_email text not null,
  client_company text,
  client_siren text,
  client_phone text,
  project_type text,
  urgency text,
  total_estimate numeric(12, 2),
  notes text,
  preferred_date date,
  arrival_hour int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Booking sessions (one per plateau/slot per booking)
create table booking_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  plateau_key text not null,
  slot_type text not null,
  hours int,
  cyclo_mode text,
  product_type text,
  method text,
  submethod text,
  media jsonb default '[]'::jsonb,
  views jsonb default '[]'::jsonb,
  views_count int default 0,
  quantity int default 1,
  postprod_enabled boolean default false,
  postprod_video boolean default false,
  created_at timestamptz not null default now()
);

-- Booking quotes (generated estimates)
create table booking_quotes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  reference text not null,
  rows jsonb not null default '[]'::jsonb,
  total numeric(12, 2) not null default 0,
  generated_at timestamptz not null default now()
);

-- iCal feeds for calendar sync
create table ical_feeds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  feed_url text,
  ical_uid text,
  synced_at timestamptz
);

-- Trigger to auto-update updated_at on bookings
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at();
