-- Capture the full contact form on bookings.
-- Until now the form collected prénom, nom, marque, adresse de facturation
-- but the table only stored a concatenated client_name. Persist them so the
-- ICS feed, calendar events and emails can display every field.

alter table bookings
  add column if not exists client_first_name      text,
  add column if not exists client_last_name       text,
  add column if not exists client_brand           text,
  add column if not exists client_billing_address text;

-- Refresh the admin summary view to expose the new fields and keep search
-- coverage on brand + last name. Postgres won't let CREATE OR REPLACE VIEW
-- reorder columns, so drop and recreate.
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
  q.quote_reference,
  q.quote_total,
  case when ic.feed_url is not null then true else false end as has_ical
from bookings b
left join lateral (
  select
    count(*)::int as session_count,
    array_agg(distinct bs.plateau_key) as plateau_keys,
    sum(coalesce(bs.hours, 0))::int as total_hours
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

drop index if exists idx_bookings_fts;
create index idx_bookings_fts
  on bookings
  using gin (to_tsvector('french',
    coalesce(reference, '')              || ' ' ||
    coalesce(client_name, '')            || ' ' ||
    coalesce(client_first_name, '')      || ' ' ||
    coalesce(client_last_name, '')       || ' ' ||
    coalesce(client_email, '')           || ' ' ||
    coalesce(client_company, '')         || ' ' ||
    coalesce(client_brand, '')
  ));
