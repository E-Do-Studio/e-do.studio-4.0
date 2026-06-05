-- Calendar sync — full booking lifecycle + failure alerting.
--
-- 20260604080000 made booking CREATION reliable (state columns + 2-min reconcile
-- cron). This closes the lifecycle gaps that cron alone can't: a booking that is
-- confirmed, rescheduled or cancelled after creation, and persistent failures
-- that nobody is told about. All server-side (triggers) so it holds no matter
-- which app performs the edit (today: src/lib/admin-bookings.ts updateBookingStatus).

alter table bookings
  add column if not exists calendar_sync_alerted_at timestamptz;

-- Invalidate the sync marker when the booking changes in a way the calendar must
-- reflect (status flip, reschedule) so the reconcile cron re-pushes it. Modifies
-- NEW in place — no recursive UPDATE, no loop. calendar-sync's metadata-only
-- update touches none of these columns, so the guard is false there (no-op).
create or replace function bookings_calendar_invalidate()
returns trigger
language plpgsql
as $$
begin
  if (new.status is distinct from old.status
       or new.preferred_date is distinct from old.preferred_date
       or new.arrival_hour is distinct from old.arrival_hour)
     and new.status <> 'cancelled' then
    new.calendar_synced_at := null;
    new.calendar_sync_error := null;
    new.calendar_sync_alerted_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_calendar_invalidate on bookings;
create trigger bookings_calendar_invalidate
  before update on bookings
  for each row execute function bookings_calendar_invalidate();

-- A cancelled booking must leave the calendar. Nothing else does this — fire an
-- idempotent CalDAV delete (legacy + per-session UIDs) via the calendar-sync fn.
create or replace function bookings_calendar_cancel()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    perform net.http_post(
      url     := 'https://xpqeechcvbyiqvqyrgvt.supabase.co/functions/v1/calendar-sync',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object('bookingId', new.id, 'action', 'delete')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_calendar_cancel on bookings;
create trigger bookings_calendar_cancel
  after update on bookings
  for each row execute function bookings_calendar_cancel();

-- Widen the reconcile window to current_date - 2 so a booking that slipped into
-- the past during an outage still gets one last retry.
create or replace function reconcile_calendar_sync()
returns integer
language plpgsql
security definer
as $$
declare
  rec record;
  fired int := 0;
begin
  for rec in
    select b.id
    from bookings b
    where b.status in ('pending', 'confirmed')
      and b.calendar_synced_at is null
      and exists (
        select 1
        from booking_sessions s
        where s.booking_id = b.id
          and coalesce(s.session_date, b.preferred_date) >= current_date - 2
      )
  loop
    perform net.http_post(
      url     := 'https://xpqeechcvbyiqvqyrgvt.supabase.co/functions/v1/calendar-sync',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object('bookingId', rec.id, 'action', 'create')
    );
    fired := fired + 1;
  end loop;
  return fired;
end;
$$;

-- Alerting: a booking still unsynced after >= 3 attempts is a real problem the
-- studio must hear about. Email once per failure episode (calendar_sync_alerted_at
-- gates re-spam; calendar-sync clears it on the next success).
create or replace function alert_calendar_sync_failures()
returns integer
language plpgsql
security definer
as $$
declare
  rec record;
  alerted int := 0;
begin
  for rec in
    select b.id
    from bookings b
    where b.status in ('pending', 'confirmed')
      and b.calendar_synced_at is null
      and b.calendar_sync_attempts >= 3
      and b.calendar_sync_alerted_at is null
      and exists (
        select 1
        from booking_sessions s
        where s.booking_id = b.id
          and coalesce(s.session_date, b.preferred_date) >= current_date - 2
      )
  loop
    perform net.http_post(
      url     := 'https://xpqeechcvbyiqvqyrgvt.supabase.co/functions/v1/send-email',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object('type', 'calendar_sync_alert', 'bookingId', rec.id)
    );
    update bookings set calendar_sync_alerted_at = now() where id = rec.id;
    alerted := alerted + 1;
  end loop;
  return alerted;
end;
$$;

revoke all on function alert_calendar_sync_failures() from public;
grant execute on function alert_calendar_sync_failures() to service_role;

select cron.unschedule('alert-calendar-sync-failures')
  where exists (select 1 from cron.job where jobname = 'alert-calendar-sync-failures');

select cron.schedule(
  'alert-calendar-sync-failures',
  '*/10 * * * *',
  $cron$ select alert_calendar_sync_failures(); $cron$
);
