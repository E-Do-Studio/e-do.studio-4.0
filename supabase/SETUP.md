# Supabase Setup — E-Do Studio Booking API

## 1. Run all migrations in the SQL Editor

Go to https://supabase.com/dashboard/project/xpqeechcvbyiqvqyrgvt/sql/new

Run each file in order:
1. `migrations/20260504000000_booking_tables.sql`
2. `migrations/20260504000001_booking_rls.sql`
3. `migrations/20260504000002_booking_indexes.sql`
4. `migrations/20260504000003_admin_views.sql`
5. `migrations/20260504000004_fix_rls_anon_select.sql`

## 2. Deploy the iCal Edge Function

```bash
npx supabase login
npx supabase link --project-ref xpqeechcvbyiqvqyrgvt
npx supabase functions deploy ical --no-verify-jwt
```

## 3. Subscribe in Apple Calendar

- File → New Calendar Subscription
- URL: `https://xpqeechcvbyiqvqyrgvt.supabase.co/functions/v1/ical/EDO-R-XXXXXX`
  (replace with a real booking reference)
