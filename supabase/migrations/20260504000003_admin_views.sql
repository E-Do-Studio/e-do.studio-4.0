-- Optimized views for admin booking queries

-- Summary view: one row per booking with aggregated session/quote counts
CREATE OR REPLACE VIEW bookings_admin_summary AS
SELECT
  b.id,
  b.reference,
  b.status,
  b.client_name,
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
  COALESCE(s.session_count, 0)::int AS session_count,
  s.plateau_keys,
  s.total_hours,
  q.quote_reference,
  q.quote_total,
  CASE WHEN ic.feed_url IS NOT NULL THEN true ELSE false END AS has_ical
FROM bookings b
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS session_count,
    ARRAY_AGG(DISTINCT bs.plateau_key) AS plateau_keys,
    SUM(COALESCE(bs.hours, 0))::int AS total_hours
  FROM booking_sessions bs
  WHERE bs.booking_id = b.id
) s ON true
LEFT JOIN LATERAL (
  SELECT bq.reference AS quote_reference, bq.total AS quote_total
  FROM booking_quotes bq
  WHERE bq.booking_id = b.id
  ORDER BY bq.generated_at DESC
  LIMIT 1
) q ON true
LEFT JOIN LATERAL (
  SELECT f.feed_url
  FROM ical_feeds f
  WHERE f.booking_id = b.id
  LIMIT 1
) ic ON true;

-- Full-text search index on bookings for reference + client name + email
CREATE INDEX IF NOT EXISTS idx_bookings_fts
  ON bookings
  USING gin (to_tsvector('french',
    COALESCE(reference, '') || ' ' ||
    COALESCE(client_name, '') || ' ' ||
    COALESCE(client_email, '') || ' ' ||
    COALESCE(client_company, '')
  ));

-- RLS: admin summary inherits bookings RLS (views use invoker's permissions)
ALTER VIEW bookings_admin_summary SET (security_invoker = on);
