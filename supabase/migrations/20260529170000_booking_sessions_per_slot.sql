-- Independent date/arrival per booking_session.
-- Until now, a booking carried a single preferred_date + arrival_hour
-- shared by all its sessions; conflict detection summed their hours into
-- one contiguous block. We now allow each session to live at its own
-- moment so multi-plateau quotes stop colliding.

alter table booking_sessions
  add column if not exists session_date date,
  add column if not exists arrival_hour int;

-- Backfill: legacy bookings inherit the parent's slot on each of their sessions.
update booking_sessions bs
set session_date = b.preferred_date,
    arrival_hour = b.arrival_hour
from bookings b
where bs.booking_id = b.id
  and bs.session_date is null;

-- Hot path for availability and per-plateau conflict checks.
create index if not exists idx_booking_sessions_plateau_date
  on booking_sessions (plateau_key, session_date);

-- Refresh the admin summary so per-session schedules are visible and
-- aggregate fields (plateau_keys, total_hours) are still served.
drop view if exists bookings_admin_summary;
create view bookings_admin_summary as
select
  b.id,
  b.reference,
  b.status,
  b.client_name,
  b.client_first_name,
  b.client_last_name,
  b.client_brand,
  b.client_billing_address,
  b.client_email,
  b.client_company,
  b.client_phone,
  b.project_type,
  b.urgency,
  b.total_estimate,
  b.preferred_date,
  b.arrival_hour,
  b.notes,
  b.created_at,
  b.updated_at,
  coalesce(s.session_count, 0)::int as session_count,
  s.plateau_keys,
  s.total_hours,
  s.session_dates,
  s.first_session_date,
  s.last_session_date,
  q.quote_reference,
  q.quote_total,
  case when ic.feed_url is not null then true else false end as has_ical
from bookings b
left join lateral (
  select
    count(*)::int as session_count,
    array_agg(distinct bs.plateau_key) as plateau_keys,
    sum(coalesce(bs.hours, 0))::int as total_hours,
    array_agg(distinct bs.session_date) filter (where bs.session_date is not null) as session_dates,
    min(bs.session_date) as first_session_date,
    max(bs.session_date) as last_session_date
  from booking_sessions bs
  where bs.booking_id = b.id
) s on true
left join lateral (
  select bq.reference as quote_reference, bq.total as quote_total
  from booking_quotes bq
  where bq.booking_id = b.id
  order by bq.generated_at desc
  limit 1
) q on true
left join lateral (
  select f.feed_url
  from ical_feeds f
  where f.booking_id = b.id
  limit 1
) ic on true;

alter view bookings_admin_summary set (security_invoker = on);
