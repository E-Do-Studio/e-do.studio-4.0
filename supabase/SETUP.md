# Supabase Setup — E-Do Studio Booking API

## 1. Run all migrations in the SQL Editor

Go to https://supabase.com/dashboard/project/xpqeechcvbyiqvqyrgvt/sql/new

Run each file in order:
1. `migrations/20260504000000_booking_tables.sql`
2. `migrations/20260504000001_booking_rls.sql`
3. `migrations/20260504000002_booking_indexes.sql`
4. `migrations/20260504000003_admin_views.sql`
5. `migrations/20260504000004_fix_rls_anon_select.sql`

## 2. Deploy the Edge Functions

JWT verification is set per-function in `supabase/config.toml` (`[functions.<slug>] verify_jwt = false`), so the deploy commands no longer need the `--no-verify-jwt` flag.

```bash
npx supabase login
npx supabase link --project-ref xpqeechcvbyiqvqyrgvt
npx supabase functions deploy ical
npx supabase functions deploy send-email
npx supabase functions deploy calendar-sync
```

> **Important:** all three functions are called by anonymous browser clients (booking form, public iCal feed). They must keep `verify_jwt = false` — otherwise the gateway 401s the frontend fetches before they reach the function code, and no emails / calendar syncs go out.

## 3. Subscribe in Apple Calendar

- File → New Calendar Subscription
- URL: `https://xpqeechcvbyiqvqyrgvt.supabase.co/functions/v1/ical/EDO-R-XXXXXX`
  (replace with a real booking reference)
