-- Calendar sync reliability — kill the silent-failure path.
--
-- Until now the only thing that pushed a booking into the studio CalDAV
-- calendar was a browser-side, fire-and-forget call in src/lib/bookings.ts:
--   syncToCalendar(booking.id).catch(() => {});
-- If the tab closed, the network blipped, or CalDAV had a transient 5xx, the
-- event was never created AND nothing was recorded — a client booking that the
-- studio simply never sees (e.g. EDO-R-S3QXNJ, created 2026-06-02).
--
-- This migration makes the sync observable and self-healing:
--   1. bookings.calendar_synced_at / calendar_sync_error / calendar_sync_attempts
--      record the outcome of every sync attempt (written by the calendar-sync
--      edge function).
--   2. reconcile_calendar_sync() re-pushes every active, upcoming booking that
--      is not yet marked synced, by calling the calendar-sync edge function.
--   3. pg_cron runs it every 2 minutes — so a booking lands within 2 min even
--      if the browser never fired, and transient CalDAV failures auto-retry.
-- The browser call stays as the happy-path "instant" sync; the cron is the
-- guarantee underneath it.

alter table bookings
  add column if not exists calendar_synced_at  timestamptz,
  add column if not exists calendar_sync_error text,
  add column if not exists calendar_sync_attempts int not null default 0;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-push active upcoming bookings that aren't confirmed-synced yet.
-- Idempotent: calendar-sync does an idempotent CalDAV PUT per session, so
-- re-running is safe. We only touch bookings whose latest session is today or
-- later, so past failures stop being retried on their own.
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
          and coalesce(s.session_date, b.preferred_date) >= current_date
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

revoke all on function reconcile_calendar_sync() from public;
grant execute on function reconcile_calendar_sync() to service_role;

-- Every 2 minutes. unschedule first so re-running the migration is safe.
select cron.unschedule('reconcile-calendar-sync')
  where exists (select 1 from cron.job where jobname = 'reconcile-calendar-sync');

select cron.schedule(
  'reconcile-calendar-sync',
  '*/2 * * * *',
  $cron$ select reconcile_calendar_sync(); $cron$
);
