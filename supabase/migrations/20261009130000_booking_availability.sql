-- Disponibilités publiques, sans donnée personnelle.
--
-- Le calendrier du tunnel (src/lib/availability.ts) lisait booking_sessions
-- joint à bookings avec la clé anon. Cela exigeait les policies
-- `anon_select_*`, qui exposent aussi nom, e-mail, téléphone et SIREN de chaque
-- client à quiconque lit la clé publique dans le bundle. Cette fonction rend
-- au front les trois colonnes dont il a besoin, et rien d'autre : les policies
-- peuvent tomber (20261009140000) sans que le calendrier ne voie tout libre.
--
-- Le prédicat reprend celui que le front appliquait (statut pending ou
-- confirmed), pas blocks_slot : il doit rester juste même là où la garde
-- 20261009120000 n'est pas encore posée.

CREATE OR REPLACE FUNCTION booking_availability(
  p_plateau_key text,
  p_from date,
  p_to date
)
RETURNS TABLE (session_date date, arrival_hour int, hours int)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bs.session_date, bs.arrival_hour, bs.hours
    FROM booking_sessions bs
    JOIN bookings b ON b.id = bs.booking_id
   WHERE bs.plateau_key = p_plateau_key
     AND bs.session_date BETWEEN p_from AND p_to
     AND b.status IN ('pending', 'confirmed');
$$;

REVOKE ALL ON FUNCTION booking_availability(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION booking_availability(text, date, date)
  TO anon, authenticated, service_role;
